const { getPool } = require('./database');
const { votingState } = require('./settings');
const { httpError } = require('./http');
const crypto = require('crypto');
const net = require('net');

const IP_DUPLICATE_MESSAGE = 'Já foi registrado um voto a partir desta conexão.';
const VOTER_DUPLICATE_MESSAGE = 'Você já votou nesta votação.';
const DEFAULT_HASH_SECRET = 'dev-secret-change-this-value-with-at-least-32-characters';

async function vote(input, voterId, req) {
  const participantId = Number(input?.participantId);
  if (!Number.isInteger(participantId) || participantId <= 0) {
    throw httpError(400, 'Participante inválido.');
  }
  if (!voterId) throw httpError(500, 'Não foi possível identificar este navegador.');
  const ipHash = requestIpHash(req);
  if (!ipHash) throw httpError(400, 'Não foi possível identificar esta conexão.');

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const settings = (await client.query('SELECT * FROM event_settings WHERE id=1')).rows[0];
    const state = votingState(settings);
    if (!['TEST', 'OPEN'].includes(state)) throw httpError(403, messageForVoting(state));

    const isTestVote = state === 'TEST';
    const participant = await client.query('SELECT * FROM participants WHERE id=$1 AND active=TRUE', [participantId]);
    if (!participant.rows[0]) throw httpError(404, 'Participante não encontrado.');
    const alreadyVoted = await client.query(
      `SELECT id, voter_id = $1 AS same_browser, ip_hash = $2 AS same_ip
       FROM votes
       WHERE (voter_id=$1 OR ip_hash=$2) AND is_test_vote=$3
       LIMIT 1`,
      [voterId, ipHash, isTestVote]
    );
    if (alreadyVoted.rows[0]) {
      throw httpError(409, alreadyVoted.rows[0].same_ip ? IP_DUPLICATE_MESSAGE : VOTER_DUPLICATE_MESSAGE);
    }

    await client.query(
      'INSERT INTO votes (participant_id, voter_id, ip_hash, is_test_vote) VALUES ($1, $2, $3, $4)',
      [participantId, voterId, ipHash, isTestVote]
    );
    await client.query('COMMIT');
    return {
      message: isTestVote ? 'Voto de teste registrado com sucesso!' : 'Voto registrado com sucesso!',
      testVote: isTestVote,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    if (error.code === '23505' && error.constraint === 'votes_ip_context_unique') {
      throw httpError(409, IP_DUPLICATE_MESSAGE);
    }
    if (error.code === '23505' && error.constraint === 'votes_voter_context_unique') {
      throw httpError(409, VOTER_DUPLICATE_MESSAGE);
    }
    throw error;
  } finally {
    client.release();
  }
}

function messageForVoting(state) {
  if (state === 'WAITING') return 'A votação será liberada no horário do evento.';
  if (state === 'RESULT_PENDING') return 'A votação está encerrada. Aguarde o resultado final.';
  if (state === 'RESULT_PUBLISHED' || state === 'CLOSED') return 'A votação está encerrada.';
  return 'A votação ainda não está aberta.';
}

async function hasVoted(voterId, status, req) {
  const isTestVote = status === 'TEST';
  const ipHash = requestIpHash(req);
  if (ipHash) {
    const { rows } = await getPool().query(
      `SELECT EXISTS (
        SELECT 1 FROM votes
        WHERE (voter_id=$1 OR ip_hash=$2) AND is_test_vote=$3
      ) AS voted`,
      [voterId, ipHash, isTestVote]
    );
    return rows[0].voted;
  }
  const { rows } = await getPool().query(
    'SELECT EXISTS (SELECT 1 FROM votes WHERE voter_id=$1 AND is_test_vote=$2) AS voted',
    [voterId, isTestVote]
  );
  return rows[0].voted;
}

function requestIpHash(req) {
  const ip = clientIp(req);
  if (!ip) return null;
  return crypto
    .createHmac('sha256', ipHashSecret())
    .update(`v1:${ip}`)
    .digest('hex');
}

function clientIp(req) {
  const fromHeader = isVercelRequest(req) ? firstForwardedIp(
    req?.headers?.['x-vercel-forwarded-for']
    || req?.headers?.['x-forwarded-for']
    || req?.headers?.['x-real-ip']
  ) : '';
  return normalizeClientIp(fromHeader || req?.socket?.remoteAddress || req?.connection?.remoteAddress || '');
}

function isVercelRequest(req) {
  return !!(process.env.VERCEL || req?.headers?.['x-vercel-id'] || req?.headers?.['x-vercel-deployment-url']);
}

function firstForwardedIp(value) {
  const text = Array.isArray(value) ? value[0] : value;
  if (typeof text !== 'string') return '';
  return text.split(',').map((part) => part.trim()).find(Boolean) || '';
}

function normalizeClientIp(value) {
  let ip = String(value || '').trim().toLowerCase();
  if (!ip) return '';
  if (ip.startsWith('for=')) ip = ip.slice(4);
  ip = ip.replace(/^"|"$/g, '');
  if (ip.startsWith('[')) {
    ip = ip.slice(1, ip.indexOf(']') > -1 ? ip.indexOf(']') : undefined);
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.replace(/:\d+$/, '');
  }
  ip = ip.split('%')[0];
  if (ip.startsWith('::ffff:')) {
    const mapped = ip.slice(7);
    if (net.isIP(mapped) === 4) return mapped;
  }
  if (net.isIP(ip) === 4) return ip;
  ip = normalizeEmbeddedIpv4(ip);
  if (net.isIP(ip) === 6) return normalizeIpv6(ip);
  return '';
}

function normalizeEmbeddedIpv4(ip) {
  const segments = ip.split(':');
  const last = segments[segments.length - 1];
  if (net.isIP(last) !== 4) return ip;
  const octets = last.split('.').map(Number);
  const high = ((octets[0] << 8) + octets[1]).toString(16);
  const low = ((octets[2] << 8) + octets[3]).toString(16);
  return [...segments.slice(0, -1), high, low].join(':');
}

function normalizeIpv6(ip) {
  const parts = ip.split('::');
  const left = parts[0] ? parts[0].split(':').filter(Boolean) : [];
  const right = parts[1] ? parts[1].split(':').filter(Boolean) : [];
  const missing = Math.max(0, 8 - left.length - right.length);
  return [...left, ...Array.from({ length: missing }, () => '0'), ...right]
    .map((part) => parseInt(part || '0', 16).toString(16).padStart(4, '0'))
    .join(':');
}

function ipHashSecret() {
  return process.env.IP_HASH_SECRET || process.env.VOTER_COOKIE_SECRET || process.env.JWT_SECRET || DEFAULT_HASH_SECRET;
}

module.exports = {
  IP_DUPLICATE_MESSAGE,
  clientIp,
  hasVoted,
  normalizeClientIp,
  requestIpHash,
  vote,
};
