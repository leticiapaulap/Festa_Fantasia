const Busboy = require('busboy');
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

module.exports = {
  createAdminParticipant,
  createPublicParticipant,
  deleteParticipant,
  getParticipant,
  listParticipants,
  updateParticipant,
};
