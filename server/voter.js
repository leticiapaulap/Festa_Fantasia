const crypto = require('node:crypto');
const { httpError } = require('./http');

const COOKIE_NAME = 'voter_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const DEVELOPMENT_SECRET = 'development-only-voter-cookie-secret';

function ensureVoterId(req, res) {
  const existing = readVoterId(req.headers.cookie);
  if (existing) return existing;

  const voterId = crypto.randomUUID();
  const value = `${voterId}.${sign(voterId)}`;
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=${value}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; '));
  return voterId;
}

function readVoterId(cookieHeader = '') {
  const entry = cookieHeader.split(';').map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`));
  if (!entry) return null;

  const value = entry.slice(COOKIE_NAME.length + 1);
  const separator = value.lastIndexOf('.');
  if (separator < 0) return null;
  const voterId = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(voterId)) return null;

  const expected = Buffer.from(sign(voterId), 'hex');
  const received = Buffer.from(signature, 'hex');
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
  return voterId;
}

function sign(value) {
  const secret = process.env.VOTER_COOKIE_SECRET || process.env.JWT_SECRET
    || (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' ? '' : DEVELOPMENT_SECRET);
  if (secret.length < 32) throw httpError(500, 'Configure VOTER_COOKIE_SECRET ou JWT_SECRET com pelo menos 32 caracteres.');
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

module.exports = { ensureVoterId, readVoterId };
