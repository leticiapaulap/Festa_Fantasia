const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, scalar } = require('./database');
const { results } = require('./results');
const { getSettings } = require('./settings');
const { clean, httpError, normalizeCode, normalizeEmail } = require('./http');

async function dashboard() {
  const settings = await getSettings();
  const eventResults = await results(false);
  const [participants, votes, testVotes] = await Promise.all([
    scalar('SELECT COUNT(*)::int AS total FROM participants'),
    scalar('SELECT COUNT(*)::int AS total FROM votes WHERE is_test_vote=FALSE'),
    scalar('SELECT COUNT(*)::int AS total FROM votes WHERE is_test_vote=TRUE'),
  ]);
  return {
    participants,
    votes,
    testVotes,
    totalVotes: votes + testVotes,
    status: settings.canAcceptVotes ? 'VOTAÇÃO ABERTA' : settings.votingAvailability,
    settings,
    results: eventResults,
  };
}

async function resetVotes(input) {
  if (input.confirmation !== 'RESETAR VOTOS') throw httpError(400, 'Confirmação inválida.');
  await getPool().query('DELETE FROM votes WHERE is_test_vote=FALSE;');
  return {};
}

async function clearTestVotes(input) {
  if (input.confirmation !== 'Deseja apagar apenas os votos de teste?') throw httpError(400, 'Confirmação inválida.');
  await getPool().query('DELETE FROM votes WHERE is_test_vote=TRUE;');
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
  safeLoginLog('request received');
  try {
    const { rows } = await getPool().query(
      'SELECT id, name, email, password_hash, created_at FROM admin_users WHERE LOWER(email) = $1',
      [email]
    );
    safeLoginLog('database connected');

    const admin = rows[0];
    safeLoginLog('user lookup', { userFound: !!admin });
    if (!admin) {
      throw httpError(401, 'E-mail ou senha inválidos.');
    }

    safeLoginLog('hash format', { hashPrefix: hashPrefix(admin.password_hash) });
    const passwordValid = await bcrypt.compare(input.password || '', admin.password_hash);
    safeLoginLog('password check', { passwordValid });
    if (!passwordValid) {
      throw httpError(401, 'E-mail ou senha inválidos.');
    }

    const response = loginResponse(admin);
    safeLoginLog('session created');
    return response;
  } catch (error) {
    safeLoginLog('failed', safeLoginErrorDetails(error));
    if (error.status === 401) throw error;
    throw httpError(500, 'Não foi possível acessar o servidor.');
  }
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

async function withAdmin(req, action) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw httpError(401, 'Autenticação administrativa necessária.');
  try {
    const payload = jwt.verify(token, jwtSecret());
    const count = await scalar('SELECT COUNT(*)::int AS total FROM admin_users WHERE LOWER(email)=LOWER($1)', [payload.sub]);
    if (count < 1) throw httpError(401, 'Autenticação administrativa inválida.');
    return await action();
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

function hashPrefix(hash) {
  return typeof hash === 'string' ? hash.slice(0, 4) : '';
}

function safeLoginErrorDetails(error) {
  const details = {
    errorType: error.name || 'Error',
  };
  if (typeof error.code === 'string') details.errorCode = error.code;
  if (typeof error.status === 'number') details.status = error.status;
  return details;
}

function safeLoginLog(stage, details = {}) {
  console.info('[admin-login]', JSON.stringify({
    stage,
    ...details,
  }));
}

module.exports = {
  bootstrap,
  bootstrapStatus,
  dashboard,
  login,
  registerAdmin,
  clearTestVotes,
  resetVotes,
  withAdmin,
};
