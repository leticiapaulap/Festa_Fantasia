function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') : {});
      } catch (error) {
        reject(httpError(400, 'JSON inválido.'));
      }
    });
    req.on('error', reject);
  });
}

function json(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function sendError(res, error) {
  const databaseError = databaseErrorResponse(error);
  const status = databaseError?.status ?? error.status ?? 500;
  const message = databaseError?.message
    ?? (status >= 500 && !error.expose ? 'Erro interno do servidor.' : error.message || 'Erro interno do servidor.');
  json(res, { message, details: [] }, status);
}

function databaseErrorResponse(error) {
  switch (error.code) {
    case '23505':
      return { status: 409, message: 'Já existe um cadastro com esses dados.' };
    case '23503':
      return { status: 400, message: 'Não foi possível vincular os dados do participante.' };
    case '42P01':
      return { status: 500, message: 'Uma tabela necessária não está disponível no banco de dados.' };
    case '42703':
      return { status: 500, message: 'A estrutura do banco de dados está desatualizada.' };
    case '28P01':
    case '3D000':
    case '08000':
    case '08001':
    case '08003':
    case '08006':
      return { status: 503, message: 'Não foi possível conectar ao banco de dados. Verifique a configuração do servidor.' };
    default:
      return null;
  }
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

module.exports = {
  clean,
  dateOnly,
  httpError,
  iso,
  json,
  normalizeCode,
  normalizeEmail,
  nullable,
  parseBool,
  readJson,
  requireText,
  sendError,
  timeOnly,
};
