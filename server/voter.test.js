const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ensureVoterId, readVoterId } = require('./voter');

test('creates a signed HttpOnly cookie that is secure in production', () => {
  const previous = {
    secret: process.env.VOTER_COOKIE_SECRET,
    nodeEnv: process.env.NODE_ENV,
  };
  process.env.VOTER_COOKIE_SECRET = 'test-secret-with-at-least-32-characters';
  process.env.NODE_ENV = 'production';

  try {
    let cookie;
    const voterId = ensureVoterId({ headers: {} }, {
      setHeader(name, value) {
        if (name === 'Set-Cookie') cookie = value;
      },
    });
    const value = cookie.split(';')[0];

    assert.match(voterId, /^[0-9a-f-]{36}$/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Path=\//);
    assert.equal(readVoterId(value), voterId);
    assert.equal(readVoterId(value.replace(/\.[0-9a-f]+$/, '.invalid')), null);
    assert.equal(ensureVoterId({ headers: { cookie: value } }, { setHeader() {} }), voterId);
  } finally {
    if (previous.secret === undefined) delete process.env.VOTER_COOKIE_SECRET;
    else process.env.VOTER_COOKIE_SECRET = previous.secret;
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
  }
});
