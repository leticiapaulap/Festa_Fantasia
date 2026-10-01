const Busboy = require('busboy');
const { put } = require('@vercel/blob');
const { getPool } = require('./database');
const { canAcceptVotes, getSettingsEntity } = require('./settings');
const { clean, cryptoRandom, httpError, iso, parseBool, requireText } = require('./http');

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
  let stage = 'registration check';
  try {
    const settings = await getSettingsEntity();
    if (!settings.registration_open) throw httpError(409, 'O período de cadastro foi encerrado.');
    logParticipantCreate(stage, 'ok');

    stage = 'multipart parsing';
    const { fields, files } = await parseMultipart(req);
    logParticipantCreate(stage, 'ok');

    stage = 'validation';
    const name = requireText(fields.name, 'Informe o nome do participante.');
    const costumeName = requireText(fields.costumeName, 'Informe o nome da fantasia.');
    const photo = files.photo;
    if (!photo) throw httpError(400, 'Selecione uma imagem para upload.');
    logParticipantCreate(stage, 'ok');

    stage = 'photo upload';
    const photoUrl = await uploadPhoto(photo);
    logParticipantCreate(stage, 'ok');

    stage = 'database insert';
    const participant = await insertParticipant({
      name,
      costumeName,
      description: clean(fields.description),
      photoUrl,
      active: true,
    });
    logParticipantCreate(stage, 'ok');
    return { success: true, participant };
  } catch (error) {
    logParticipantCreate(stage, 'failed', error);
    throw error;
  }
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
  try {
    const { rows } = await getPool().query(`
      INSERT INTO participants (name, costume_name, description, photo_url, active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [input.name, input.costumeName, input.description, input.photoUrl, input.active]);
    return participantResponse(rows[0]);
  } catch (error) {
    if (typeof error.code === 'string') {
      console.error('[participants:create]', JSON.stringify({
        endpoint: '/api/participants',
        method: 'POST',
        stage: 'database insert',
        result: 'failed',
        errorType: error.name || 'Error',
        errorCode: error.code,
      }));
    }
    throw participantDatabaseError(error);
  }
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
  const extension = file.mimeType === 'image/png' ? '.png' : file.mimeType === 'image/webp' ? '.webp' : '.jpg';
  const pathname = `participants/${cryptoRandom()}${extension}`;
  try {
    const blob = await put(pathname, file.buffer, {
      access: 'public',
      contentType: file.mimeType,
    });
    if (typeof blob.url !== 'string' || !blob.url) {
      throw httpError(422, 'Não foi possível enviar a foto. Verifique o arquivo e a configuração do armazenamento.');
    }
    return blob.url;
  } catch (error) {
    if (error.status) throw error;
    logParticipantCreate('photo upload request', 'failed', error);
    throw httpError(502, 'Não foi possível enviar a foto. Tente novamente.');
  }
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    if (typeof req.pipe !== 'function') {
      reject(httpError(400, 'Não foi possível ler os dados do cadastro. Envie novamente o formulário.'));
      return;
    }
    if (!/^multipart\/form-data\b/i.test(req.headers['content-type'] || '')) {
      reject(httpError(400, 'Envie os dados do cadastro como formulário com foto.'));
      return;
    }
    const fields = {};
    const files = {};
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    let busboy;
    try {
      busboy = Busboy({
        headers: req.headers,
        limits: { fileSize: 5 * 1024 * 1024 },
      });
    } catch {
      reject(httpError(400, 'Não foi possível ler os dados do cadastro. Envie novamente o formulário.'));
      return;
    }
    busboy.on('field', (name, value) => { fields[name] = value; });
    busboy.on('file', (name, file, info) => {
      const chunks = [];
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('limit', () => fail(httpError(400, 'A imagem deve ter no máximo 5 MB.')));
      file.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length) files[name] = { buffer, filename: info.filename, mimeType: info.mimeType };
      });
    });
    busboy.on('error', fail);
    busboy.on('finish', () => {
      if (settled) return;
      settled = true;
      resolve({ fields, files });
    });
    req.on('error', fail);
    req.pipe(busboy);
  });
}

function participantDatabaseError(error) {
  switch (error.code) {
    case '23505':
      return httpError(409, 'Já existe um cadastro com esses dados.');
    case '23503':
      return httpError(400, 'Não foi possível vincular os dados do participante.');
    case '42P01':
      return httpError(500, 'A tabela de participantes não está disponível no banco de dados.');
    case '42703':
      return httpError(500, 'A estrutura da tabela de participantes está desatualizada.');
    case '28P01':
    case '3D000':
    case '08000':
    case '08001':
    case '08003':
    case '08006':
      return httpError(503, 'Não foi possível conectar ao banco de dados. Verifique a configuração do servidor.');
    default:
      return error;
  }
}

function logParticipantCreate(stage, result, error) {
  const message = {
    endpoint: '/api/participants',
    method: 'POST',
    stage,
    result,
  };
  if (error) {
    message.errorType = error.name || 'Error';
    if (typeof error.code === 'string') message.errorCode = error.code;
    if (typeof error.status === 'number') message.status = error.status;
    if (typeof error.stack === 'string') message.stack = error.stack.split('\n').slice(1);
    console.error('[participants:create]', JSON.stringify(message));
    return;
  }
  console.info('[participants:create]', JSON.stringify(message));
}

module.exports = {
  createAdminParticipant,
  createPublicParticipant,
  deleteParticipant,
  getParticipant,
  listParticipants,
  updateParticipant,
};
