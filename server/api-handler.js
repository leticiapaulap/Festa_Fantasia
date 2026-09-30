const bcrypt = require('bcryptjs');
const Busboy = require('busboy');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

let pool;
let schemaReady;

function getPool() {
  if (!pool) {
    const connectionString = databaseUrl();
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('sslmode=require') || connectionString.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }
  return pool;
}

function databaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw httpError(500, 'DATABASE_URL não configurada.');
  if (!raw.startsWith('jdbc:postgresql://')) return raw;
  const url = new URL(raw.replace('jdbc:postgresql://', 'postgresql://'));
  if (process.env.DATABASE_USERNAME) url.username = process.env.DATABASE_USERNAME;
  if (process.env.DATABASE_PASSWORD) url.password = process.env.DATABASE_PASSWORD;
  return url.toString();
}

async function ensureSchema() {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const client = await getPool().connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS participants (
          id BIGSERIAL PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          costume_name VARCHAR(120) NOT NULL,
          description VARCHAR(1000),
          photo_url VARCHAR(1000),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS vote_codes (
          id BIGSERIAL PRIMARY KEY,
          code VARCHAR(40) NOT NULL UNIQUE,
          used BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          used_at TIMESTAMP WITH TIME ZONE
        );
        CREATE TABLE IF NOT EXISTS votes (
          id BIGSERIAL PRIMARY KEY,
          participant_id BIGINT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
          vote_code_id BIGINT NOT NULL UNIQUE REFERENCES vote_codes(id) ON DELETE RESTRICT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS event_settings (
          id BIGSERIAL PRIMARY KEY,
          event_name VARCHAR(160) NOT NULL,
          title VARCHAR(180) NOT NULL,
          description VARCHAR(500),
          event_date DATE,
          event_time TIME,
          voting_open BOOLEAN NOT NULL DEFAULT FALSE,
          registration_open BOOLEAN NOT NULL DEFAULT TRUE,
          results_public BOOLEAN NOT NULL DEFAULT FALSE,
          voting_start TIMESTAMP WITH TIME ZONE,
          voting_end TIMESTAMP WITH TIME ZONE,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS admin_users (
          id BIGSERIAL PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          email VARCHAR(160) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        ALTER TABLE participants ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS voting_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT';
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS show_public_results BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS timezone VARCHAR(80) NOT NULL DEFAULT 'America/Sao_Paulo';
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS voting_end_time TIME;
      `);
      await client.query(`
        INSERT INTO event_settings (
          id, event_name, title, description, voting_open, registration_open,
          results_public, voting_status, show_public_results, timezone
        )
        VALUES (
          1, 'Halloween', 'Qual será a melhor fantasia da noite?',
          'Sistema de cadastro e votação do Halloween.', FALSE, TRUE,
          FALSE, 'DRAFT', FALSE, 'America/Sao_Paulo'
        )
        ON CONFLICT (id) DO NOTHING
      `);
      await client.query(`
        UPDATE event_settings
        SET event_name = 'Halloween'
        WHERE event_name IN ('Festa à Fantasia', 'Festa Fantasia')
      `);
    } finally {
      client.release();
    }
  })();
  return schemaReady;
}

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const path = url.pathname.replace(/^\/api\/?/, '');
    const parts = path.split('/').filter(Boolean);

    if (req.method === 'GET' && path === 'settings') return json(res, await getSettings());
    if ((req.method === 'PUT' || req.method === 'PATCH') && path === 'admin/settings') return await withAdmin(req, res, async () => json(res, await updateSettings(await readJson(req))));
    if (req.method === 'GET' && path === 'participants') return json(res, await listParticipants(true));
    if (req.method === 'GET' && parts[0] === 'participants' && parts[1]) return json(res, await getParticipant(parts[1]));
    if (req.method === 'POST' && path === 'participants') return json(res, await createPublicParticipant(req), 201);
    if (req.method === 'GET' && path === 'results') return json(res, await results(true));
    if (req.method === 'POST' && path === 'votes') return json(res, await vote(await readJson(req)));
    if (req.method === 'POST' && path === 'vote-codes/validate') return json(res, await validateCode(await readJson(req)));

    if (req.method === 'GET' && path === 'admin/bootstrap/status') return json(res, await bootstrapStatus());
    if (req.method === 'POST' && path === 'admin/bootstrap') return json(res, await bootstrap(await readJson(req)));
    if (req.method === 'POST' && path === 'admin/register') return json(res, await registerAdmin(await readJson(req)), 201);
    if (req.method === 'POST' && path === 'admin/login') return json(res, await login(await readJson(req)));
    if (req.method === 'POST' && path === 'admin/logout') return json(res, { message: 'Sessão encerrada.' });

    if (path.startsWith('admin/')) {
      return await withAdmin(req, res, async () => {
        if (req.method === 'GET' && path === 'admin/dashboard') return json(res, await dashboard());
        if (req.method === 'GET' && path === 'admin/participants') return json(res, await listParticipants(false));
        if (req.method === 'POST' && path === 'admin/participants') return json(res, await createAdminParticipant(req), 201);
        if (req.method === 'PUT' && parts[0] === 'admin' && parts[1] === 'participants' && parts[2]) return json(res, await updateParticipant(parts[2], req));
        if (req.method === 'DELETE' && parts[0] === 'admin' && parts[1] === 'participants' && parts[2]) return json(res, await deleteParticipant(parts[2]));
        if (req.method === 'GET' && path === 'admin/vote-codes') return json(res, await voteCodes());
        if (req.method === 'POST' && path === 'admin/vote-codes/generate') return json(res, await generateCodes(await readJson(req)));
        if (req.method === 'POST' && path === 'admin/voting/open') return json(res, await setVoting(true));
        if (req.method === 'POST' && path === 'admin/voting/close') return json(res, await setVoting(false));
        if (req.method === 'GET' && path === 'admin/results') return json(res, await results(false));
        if (req.method === 'POST' && path === 'admin/votes/reset') return json(res, await resetVotes(await readJson(req)));
        throw httpError(404, 'Endpoint não encontrado.');
      });
    }

    throw httpError(404, 'Endpoint não encontrado.');
  } catch (error) {
    sendError(res, error);
  }
};

async function getSettings() {
  const { rows } = await getPool().query('SELECT * FROM event_settings WHERE id = 1');
  if (!rows[0]) throw httpError(500, 'Configurações do evento não encontradas.');
  return settingsResponse(rows[0]);
}

async function updateSettings(input) {
  const current = await getSettingsEntity();
  const next = { ...current };
  for (const [key, column] of Object.entries({
    eventName: 'event_name',
    title: 'title',
    description: 'description',
    eventDate: 'event_date',
    eventTime: 'event_time',
    votingEndTime: 'voting_end_time',
    timezone: 'timezone',
    votingOpen: 'voting_open',
    registrationOpen: 'registration_open',
    resultsPublic: 'results_public',
    votingStatus: 'voting_status',
    showPublicResults: 'show_public_results',
    votingStart: 'voting_start',
    votingEnd: 'voting_end',
  })) {
    if (input[key] !== undefined) next[column] = input[key];
  }
  if (input.votingStatus !== undefined) next.voting_open = input.votingStatus === 'OPEN';
  const { rows } = await getPool().query(`
    UPDATE event_settings
    SET event_name=$1, title=$2, description=$3, event_date=$4, event_time=$5,
        voting_end_time=$6, timezone=$7, voting_open=$8, registration_open=$9,
        results_public=$10, voting_status=$11, show_public_results=$12,
        voting_start=$13, voting_end=$14, updated_at=NOW()
    WHERE id=1
    RETURNING *
  `, [
    next.event_name, next.title, next.description, nullable(next.event_date), nullable(next.event_time),
    nullable(next.voting_end_time), next.timezone || 'America/Sao_Paulo', !!next.voting_open,
    !!next.registration_open, !!next.results_public, next.voting_status || 'DRAFT',
    !!next.show_public_results, nullable(next.voting_start), nullable(next.voting_end),
  ]);
  return settingsResponse(rows[0]);
}

async function setVoting(open) {
  const { rows } = await getPool().query(`
    UPDATE event_settings
    SET voting_open=$1, voting_status=$2, registration_open=CASE WHEN $1 THEN FALSE ELSE registration_open END, updated_at=NOW()
    WHERE id=1
    RETURNING *
  `, [open, open ? 'OPEN' : 'CLOSED']);
  return settingsResponse(rows[0]);
}

async function getSettingsEntity() {
  const { rows } = await getPool().query('SELECT * FROM event_settings WHERE id=1');
  if (!rows[0]) throw httpError(500, 'Configurações do evento não encontradas.');
  return rows[0];
}

function settingsResponse(row) {
  const votingStart = votingStartsAt(row);
  const votingEnd = votingEndsAt(row);
  const availabilityValue = availability(row);
  return {
    id: Number(row.id),
    eventName: row.event_name,
    title: row.title,
    description: row.description,
    eventDate: dateOnly(row.event_date),
    eventTime: timeOnly(row.event_time),
    votingEndTime: timeOnly(row.voting_end_time),
    timezone: row.timezone || 'America/Sao_Paulo',
    votingOpen: !!row.voting_open,
    registrationOpen: !!row.registration_open,
    resultsPublic: !!row.results_public,
    votingStatus: row.voting_status || (row.voting_open ? 'OPEN' : 'DRAFT'),
    showPublicResults: !!row.show_public_results,
    votingStartsAt: votingStart ? votingStart.toISOString() : null,
    votingEndsAt: votingEnd ? votingEnd.toISOString() : null,
    votingStart: votingStart ? votingStart.toISOString() : null,
    votingEnd: votingEnd ? votingEnd.toISOString() : null,
    canAcceptVotes: canAcceptVotes(row),
    publicVotingUrl: '/votar',
    votingAvailability: availabilityValue,
  };
}

function canAcceptVotes(settings) {
  return settings.voting_status === 'OPEN' && availability(settings) === 'OPEN';
}

function availability(settings) {
  if (settings.voting_status === 'CLOSED') return 'CLOSED';
  if (settings.voting_status !== 'OPEN') return 'DRAFT';
  const start = votingStartsAt(settings);
  const end = votingEndsAt(settings);
  const now = new Date();
  if (!start) return 'NOT_CONFIGURED';
  if (now < start) return 'BEFORE_WINDOW';
  if (end && now > end) return 'AFTER_WINDOW';
  return 'OPEN';
}

function votingStartsAt(settings) {
  if (settings.event_date && settings.event_time) return new Date(`${dateOnly(settings.event_date)}T${timeOnly(settings.event_time) || '00:00:00'}-03:00`);
  return settings.voting_start ? new Date(settings.voting_start) : null;
}

function votingEndsAt(settings) {
  if (settings.event_date && settings.voting_end_time) return new Date(`${dateOnly(settings.event_date)}T${timeOnly(settings.voting_end_time) || '23:59:00'}-03:00`);
  return settings.voting_end ? new Date(settings.voting_end) : null;
}

async function listParticipants(activeOnly) {
  const { rows } = await getPool().query(
    `SELECT * FROM participants ${activeOnly ? 'WHERE active = TRUE' : ''} ORDER BY created_at ASC`
  );
  return rows.map(participantResponse);
}

async function getParticipant(id) {
  const { rows } = await getPool().query('SELECT * FROM participants WHERE id=$1', [id]);
  if (!rows[0]) throw httpError(404, 'Participante não encontrado.');
  return participantResponse(rows[0]);
}

async function createPublicParticipant(req) {
  const settings = await getSettingsEntity();
  if (!settings.registration_open || canAcceptVotes(settings)) throw httpError(409, 'O período de cadastro foi encerrado.');
  const { fields, files } = await parseMultipart(req);
  const photo = files.photo;
  if (!photo) throw httpError(400, 'Selecione uma imagem para upload.');
  const photoUrl = await uploadPhoto(photo);
  return insertParticipant({
    name: requireText(fields.name, 'Informe o nome do participante.'),
    costumeName: requireText(fields.costumeName, 'Informe o nome da fantasia.'),
    description: clean(fields.description),
    photoUrl,
    active: true,
  });
}

async function createAdminParticipant(req) {
  const { fields, files } = await parseMultipart(req);
  const photoUrl = files.photo ? await uploadPhoto(files.photo) : null;
  return insertParticipant({
    name: requireText(fields.name, 'Informe o nome do participante.'),
    costumeName: requireText(fields.costumeName, 'Informe o nome da fantasia.'),
    description: clean(fields.description),
    photoUrl,
    active: parseBool(fields.active, true),
  });
}

async function insertParticipant(input) {
  const { rows } = await getPool().query(`
    INSERT INTO participants (name, costume_name, description, photo_url, active)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [input.name, input.costumeName, input.description, input.photoUrl, input.active]);
  return participantResponse(rows[0]);
}

async function updateParticipant(id, req) {
  const { fields, files } = await parseMultipart(req);
  const current = await getParticipant(id);
  const photoUrl = files.photo
    ? await uploadPhoto(files.photo)
    : parseBool(fields.removePhoto, false) ? null : current.photoUrl;
  const { rows } = await getPool().query(`
    UPDATE participants
    SET name=$1, costume_name=$2, description=$3, photo_url=$4, active=$5, updated_at=NOW()
    WHERE id=$6
    RETURNING *
  `, [
    requireText(fields.name, 'Informe o nome do participante.'),
    requireText(fields.costumeName, 'Informe o nome da fantasia.'),
    clean(fields.description),
    photoUrl,
    parseBool(fields.active, current.active),
    id,
  ]);
  if (!rows[0]) throw httpError(404, 'Participante não encontrado.');
  return participantResponse(rows[0]);
}

async function deleteParticipant(id) {
  const votes = await getPool().query('SELECT COUNT(*)::int AS total FROM votes WHERE participant_id=$1', [id]);
  if (votes.rows[0].total > 0) {
    await getPool().query('UPDATE participants SET active=FALSE, updated_at=NOW() WHERE id=$1', [id]);
    return {};
  }
  await getPool().query('DELETE FROM participants WHERE id=$1', [id]);
  return {};
}

function participantResponse(row) {
  return {
    id: Number(row.id),
    name: row.name,
    costumeName: row.costume_name,
    description: row.description,
    photoUrl: row.photo_url,
    active: !!row.active,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

async function uploadPhoto(file) {
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!allowed.has(file.mimeType)) throw httpError(400, 'Selecione uma imagem JPG, PNG ou WEBP.');
  if (file.buffer.length > 5 * 1024 * 1024) throw httpError(400, 'A imagem deve ter no máximo 5 MB.');
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) throw httpError(500, 'Storage de fotos não configurado.');
  const extension = file.mimeType === 'image/png' ? '.png' : file.mimeType === 'image/webp' ? '.webp' : '.jpg';
  const filename = `participants/${cryptoRandom()}${extension}`;
  const body = new FormData();
  body.append('file', new Blob([file.buffer], { type: file.mimeType }), filename);
  body.append('upload_preset', uploadPreset);
  body.append('folder', 'festa-fantasia/participants');
  body.append('public_id', filename);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.secure_url) throw httpError(502, 'Upload da foto falhou. Verifique a configuração do Cloudinary.');
  return data.secure_url;
}

async function vote(input) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const settings = (await client.query('SELECT * FROM event_settings WHERE id=1')).rows[0];
    if (!canAcceptVotes(settings)) throw httpError(409, messageForVoting(settings));
    const code = normalizeCode(input.code);
    const codeResult = await client.query('SELECT * FROM vote_codes WHERE code=$1 FOR UPDATE', [code]);
    const voteCode = codeResult.rows[0];
    if (!voteCode) throw httpError(404, 'Código de votação inválido.');
    if (voteCode.used) throw httpError(409, 'Este código já foi utilizado.');
    const participant = await client.query('SELECT * FROM participants WHERE id=$1 AND active=TRUE', [input.participantId]);
    if (!participant.rows[0]) throw httpError(404, 'Participante não encontrado.');
    await client.query('INSERT INTO votes (participant_id, vote_code_id) VALUES ($1, $2)', [input.participantId, voteCode.id]);
    await client.query('UPDATE vote_codes SET used=TRUE, used_at=NOW() WHERE id=$1', [voteCode.id]);
    await client.query('COMMIT');
    return { message: 'Voto registrado com sucesso!' };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

function messageForVoting(settings) {
  const state = availability(settings);
  if (state === 'BEFORE_WINDOW') return 'A votação será liberada no horário do evento.';
  if (state === 'AFTER_WINDOW' || state === 'CLOSED') return 'A votação está encerrada.';
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

async function results(publicView) {
  const settings = await getSettingsEntity();
  const canShowPublic = !publicView || (settings.show_public_results && settings.voting_status === 'CLOSED');
  if (!canShowPublic) return { votingOpen: !!settings.voting_open, resultsPublic: !!settings.show_public_results, tie: false, totalVotes: 0, ranking: [], winners: [] };
  const { rows } = await getPool().query(`
    SELECT p.id, p.name, p.costume_name, p.description, p.photo_url, COUNT(v.id)::int AS votes
    FROM participants p
    LEFT JOIN votes v ON v.participant_id = p.id
    WHERE p.active = TRUE
    GROUP BY p.id
    ORDER BY votes DESC, p.costume_name ASC
  `);
  const totalVotes = rows.reduce((sum, row) => sum + Number(row.votes), 0);
  const ranking = rows.map((row) => ({
    participantId: Number(row.id),
    participantName: row.name,
    costumeName: row.costume_name,
    description: row.description,
    photoUrl: row.photo_url,
    votes: Number(row.votes),
    percentage: totalVotes ? Number(((Number(row.votes) / totalVotes) * 100).toFixed(2)) : 0,
  }));
  const topVotes = ranking[0]?.votes || 0;
  const winners = topVotes > 0 ? ranking.filter((item) => item.votes === topVotes) : [];
  return { votingOpen: !!settings.voting_open, resultsPublic: !!settings.show_public_results, tie: winners.length > 1, totalVotes, ranking, winners };
}

async function dashboard() {
  const settings = await getSettings();
  const res = await results(false);
  const [participants, votes, availableCodes, usedCodes] = await Promise.all([
    scalar('SELECT COUNT(*)::int AS total FROM participants'),
    scalar('SELECT COUNT(*)::int AS total FROM votes'),
    scalar('SELECT COUNT(*)::int AS total FROM vote_codes WHERE used=FALSE'),
    scalar('SELECT COUNT(*)::int AS total FROM vote_codes WHERE used=TRUE'),
  ]);
  return {
    participants,
    votes,
    availableCodes,
    usedCodes,
    status: settings.canAcceptVotes ? 'VOTAÇÃO ABERTA' : settings.votingAvailability,
    settings,
    results: res,
  };
}

async function resetVotes(input) {
  if (input.confirmation !== 'RESETAR VOTOS') throw httpError(400, 'Confirmação inválida.');
  await getPool().query('DELETE FROM votes; UPDATE vote_codes SET used=FALSE, used_at=NULL;');
  return {};
}

async function bootstrapStatus() {
  return { available: (await scalar('SELECT COUNT(*)::int AS total FROM admin_users')) === 0 };
}

async function bootstrap(input) {
  const email = validateAdminRegistration(input);
  if ((await scalar('SELECT COUNT(*)::int AS total FROM admin_users WHERE LOWER(email)=LOWER($1)', [email])) > 0) {
    throw httpError(409, 'Já existe uma conta com este e-mail.');
  }
  if ((await scalar('SELECT COUNT(*)::int AS total FROM admin_users')) > 0) {
    throw httpError(409, 'Administrador inicial ja foi criado.');
  }
  return createAdmin(input, email);
}

async function registerAdmin(input) {
  const email = validateAdminRegistration(input);
  if ((await scalar('SELECT COUNT(*)::int AS total FROM admin_users WHERE LOWER(email)=LOWER($1)', [email])) > 0) {
    throw httpError(409, 'Já existe uma conta com este e-mail.');
  }
  return createAdmin(input, email);
}

function validateAdminRegistration(input) {
  const email = normalizeEmail(input.email);
  validateAdminCode(input.authorizationCode);
  if (!email) throw httpError(400, 'Informe um e-mail válido.');
  if (!input.password || input.password.length < 8) throw httpError(400, 'A senha deve ter pelo menos 8 caracteres.');
  return email;
}

async function createAdmin(input, email) {
  const hash = await bcrypt.hash(input.password, 12);
  const { rows } = await getPool().query(
    'INSERT INTO admin_users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
    [clean(input.name) || 'Administrador', email, hash]
  );
  return loginResponse(rows[0]);
}

async function login(input) {
  const email = normalizeEmail(input.email);
  const { rows } = await getPool().query('SELECT * FROM admin_users WHERE LOWER(email)=LOWER($1)', [email]);
  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(input.password || '', admin.password_hash))) throw httpError(401, 'E-mail ou senha inválidos.');
  return loginResponse(admin);
}

function validateAdminCode(code) {
  const expected = normalizeCode(process.env.ADMIN_REGISTRATION_CODE || '');
  if (!expected || normalizeCode(code) !== expected) throw httpError(403, 'Código de autorização inválido.');
}

function loginResponse(admin) {
  return {
    token: jwt.sign({ sub: admin.email, name: admin.name }, jwtSecret(), { expiresIn: '8h' }),
    name: admin.name,
    email: admin.email,
  };
}

async function withAdmin(req, res, action) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw httpError(401, 'Autenticação administrativa necessária.');
  try {
    const payload = jwt.verify(token, jwtSecret());
    const count = await scalar('SELECT COUNT(*)::int AS total FROM admin_users WHERE LOWER(email)=LOWER($1)', [payload.sub]);
    if (count < 1) throw httpError(401, 'Autenticação administrativa inválida.');
    return action();
  } catch (error) {
    if (error.status) throw error;
    throw httpError(401, 'Autenticação administrativa inválida.');
  }
}

function jwtSecret() {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-this-value-with-at-least-32-characters';
  if (secret.length < 32) throw httpError(500, 'JWT_SECRET precisa ter pelo menos 32 caracteres.');
  return secret;
}

async function scalar(query, params = []) {
  const { rows } = await getPool().query(query, params);
  return Number(rows[0]?.total || 0);
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files = {};
    const busboy = Busboy({ headers: req.headers, limits: { fileSize: 5 * 1024 * 1024 } });
    busboy.on('field', (name, value) => { fields[name] = value; });
    busboy.on('file', (name, file, info) => {
      const chunks = [];
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('limit', () => reject(httpError(400, 'A imagem deve ter no máximo 5 MB.')));
      file.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length) files[name] = { buffer, filename: info.filename, mimeType: info.mimeType };
      });
    });
    busboy.on('error', reject);
    busboy.on('finish', () => resolve({ fields, files }));
    req.pipe(busboy);
  });
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function json(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function sendError(res, error) {
  const status = error.status || 500;
  const message = status >= 500 ? 'Erro interno do servidor.' : error.message || 'Erro interno do servidor.';
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ message, details: [] }));
}

function httpError(status, message, expose = true) {
  const error = new Error(message);
  error.status = status;
  error.expose = expose;
  return error;
}

function requireText(value, message) {
  const text = clean(value);
  if (!text) throw httpError(400, message);
  return text;
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : null;
}

function nullable(value) {
  return value === '' || value === undefined ? null : value;
}

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true';
}

function normalizeEmail(email) {
  return clean(email)?.toLowerCase() || '';
}

function normalizeCode(code) {
  return clean(code)?.toUpperCase() || '';
}

function dateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function timeOnly(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 8);
  return String(value).slice(0, 8);
}

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
