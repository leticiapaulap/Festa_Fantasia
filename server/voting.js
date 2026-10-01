const { getPool } = require('./database');
const { votingState } = require('./settings');
const { cryptoRandom, httpError, iso, normalizeCode } = require('./http');

async function vote(input) {
  const participantId = Number(input?.participantId);
  if (!Number.isInteger(participantId) || participantId <= 0) {
    throw httpError(400, 'Participante inválido.');
  }

  const code = normalizeCode(input?.code);
  if (!code) {
    throw httpError(400, 'Informe o código de votação.');
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const settings = (await client.query('SELECT * FROM event_settings WHERE id=1')).rows[0];
    const state = votingState(settings);
    if (!['TEST', 'OPEN'].includes(state)) throw httpError(403, messageForVoting(state));

    const isTestVote = state === 'TEST';
    const codeResult = await client.query('SELECT * FROM vote_codes WHERE code=$1 FOR UPDATE', [code]);
    const voteCode = codeResult.rows[0];
    if (!voteCode) throw httpError(404, 'Código de votação inválido.');
    if (!isTestVote && voteCode.used) throw httpError(409, 'Este código já foi utilizado.');

    const alreadyVoted = await client.query(
      'SELECT id FROM votes WHERE vote_code_id=$1 AND is_test_vote=$2',
      [voteCode.id, isTestVote]
    );
    if (alreadyVoted.rows[0]) {
      throw httpError(409, isTestVote ? 'Este código já foi utilizado no teste.' : 'Este código já foi utilizado.');
    }

    const participant = await client.query('SELECT * FROM participants WHERE id=$1 AND active=TRUE', [participantId]);
    if (!participant.rows[0]) throw httpError(404, 'Participante não encontrado.');
    await client.query(
      'INSERT INTO votes (participant_id, vote_code_id, is_test_vote) VALUES ($1, $2, $3)',
      [participantId, voteCode.id, isTestVote]
    );
    if (!isTestVote) {
      await client.query('UPDATE vote_codes SET used=TRUE, used_at=NOW() WHERE id=$1', [voteCode.id]);
    }
    await client.query('COMMIT');
    return {
      message: isTestVote ? 'Voto de teste registrado com sucesso!' : 'Voto registrado com sucesso!',
      testVote: isTestVote,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
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

async function validateCode(input) {
  const code = normalizeCode(input.code);
  const { rows } = await getPool().query('SELECT * FROM vote_codes WHERE code=$1', [code]);
  if (!rows[0]) return { valid: false, used: false, message: 'Código inválido.' };
  return { valid: !rows[0].used, used: !!rows[0].used, message: rows[0].used ? 'Código já utilizado.' : 'Código válido.' };
}

async function voteCodes() {
  const { rows } = await getPool().query('SELECT * FROM vote_codes ORDER BY created_at DESC');
  return rows.map(voteCodeResponse);
}

async function generateCodes(input) {
  const quantity = Math.max(1, Math.min(Number(input.quantity || 1), 500));
  const codes = [];
  while (codes.length < quantity) {
    const code = `FESTA-${cryptoRandom().slice(0, 5).toUpperCase()}`;
    try {
      const { rows } = await getPool().query('INSERT INTO vote_codes (code) VALUES ($1) RETURNING *', [code]);
      codes.push(voteCodeResponse(rows[0]));
    } catch (error) {
      if (error.code !== '23505') throw error;
    }
  }
  return { codes };
}

function voteCodeResponse(row) {
  return {
    id: Number(row.id),
    code: row.code,
    used: !!row.used,
    createdAt: iso(row.created_at),
    usedAt: iso(row.used_at),
  };
}

module.exports = { generateCodes, validateCode, vote, voteCodes };
