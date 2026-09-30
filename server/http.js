function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') : {});
      } catch (error) {
        reject(error);
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
  const status = error.status || 500;
  const message = status >= 500 ? 'Erro interno do servidor.' : error.message || 'Erro interno do servidor.';
  json(res, { message, details: [] }, status);
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

module.exports = {
  clean,
  cryptoRandom,
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
