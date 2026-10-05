const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const jwt = require('jsonwebtoken');
const database = require('./database');

const originalScalar = database.scalar;
const originalJwtSecret = process.env.JWT_SECRET;
let adminCount = 1;
let databaseError;
let admin;

database.scalar = async () => {
  if (databaseError) throw databaseError;
  return adminCount;
};

before(() => {
  process.env.JWT_SECRET = 'admin-auth-test-secret-at-least-32-characters';
  admin = require('./admin');
});

after(() => {
  database.scalar = originalScalar;
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

test('rejects a missing admin bearer token with HTTP 401', async () => {
  await assert.rejects(
    admin.withAdmin({ headers: {} }, async () => {}),
    (error) => error.status === 401 && error.message === 'Autenticação administrativa necessária.',
  );
});

test('rejects an invalid admin JWT with HTTP 401', async () => {
  await assert.rejects(
    admin.withAdmin({ headers: { authorization: 'Bearer invalid-token' } }, async () => {}),
    (error) => error.status === 401 && error.message === 'Autenticação administrativa inválida.',
  );
});

test('runs protected admin actions for a valid JWT and existing account', async () => {
  const token = jwt.sign({ sub: 'admin@example.test' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  let actionCalled = false;

  await admin.withAdmin({ headers: { authorization: `Bearer ${token}` } }, async () => {
    actionCalled = true;
  });

  assert.equal(actionCalled, true);
});

test('returns HTTP 401 when the account in a valid JWT no longer exists', async () => {
  adminCount = 0;
  const token = jwt.sign({ sub: 'removed@example.test' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  try {
    await assert.rejects(
      admin.withAdmin({ headers: { authorization: `Bearer ${token}` } }, async () => {}),
      (error) => error.status === 401 && error.message === 'Autenticação administrativa inválida.',
    );
  } finally {
    adminCount = 1;
  }
});

test('does not misreport database failures as invalid admin authentication', async () => {
  databaseError = Object.assign(new Error('Neon unavailable'), { code: '08006' });
  const token = jwt.sign({ sub: 'admin@example.test' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  try {
    await assert.rejects(
      admin.withAdmin({ headers: { authorization: `Bearer ${token}` } }, async () => {}),
      (error) => error === databaseError && error.status === undefined,
    );
  } finally {
    databaseError = null;
  }
});
