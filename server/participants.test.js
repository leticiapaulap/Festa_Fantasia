const assert = require('node:assert/strict');
const { after, beforeEach, mock, test } = require('node:test');
const { Readable } = require('node:stream');
const database = require('./database');
const settings = require('./settings');
const blob = require('@vercel/blob');

const originalGetPool = database.getPool;
const originalEnsureSchema = database.ensureSchema;
const originalGetSettingsEntity = settings.getSettingsEntity;
const originalPut = blob.put;

let insertedParticipant;
let databaseError;
let uploadError;
let uploadCalls;
let participantModule;

database.getPool = () => ({
  query: async (query, params = []) => {
    if (query.includes('INSERT INTO participants')) {
      if (databaseError) throw databaseError;
      insertedParticipant = {
        id: 42,
        name: params[0],
        costume_name: params[1],
        description: params[2],
        photo_url: params[3],
        active: params[4],
        created_at: new Date('2026-10-05T12:00:00Z'),
        updated_at: new Date('2026-10-05T12:00:00Z'),
      };
      return { rows: [insertedParticipant] };
    }
    if (query.includes('FROM participants')) {
      return { rows: insertedParticipant ? [insertedParticipant] : [] };
    }
    throw new Error(`Unexpected database query: ${query}`);
  },
});
database.ensureSchema = async () => {};
settings.getSettingsEntity = async () => ({ registration_open: true });
blob.put = async (...args) => {
  uploadCalls.push(args);
  if (uploadError) throw uploadError;
  return { url: 'https://blob.example/participants/participant.jpg' };
};

participantModule = require('./participants');
const handler = require('./api-handler');

beforeEach(() => {
  insertedParticipant = null;
  databaseError = null;
  uploadError = null;
  uploadCalls = [];
});

after(() => {
  database.getPool = originalGetPool;
  database.ensureSchema = originalEnsureSchema;
  settings.getSettingsEntity = originalGetSettingsEntity;
  blob.put = originalPut;
});

test('public participant POST uploads the photo, saves its URL, and returns the participant on GET', async (t) => {
  const logEntries = [];
  t.mock.method(console, 'info', (...args) => logEntries.push(args));
  t.mock.method(console, 'error', (...args) => logEntries.push(args));

  const postResponse = await sendRequest(multipartRequest('POST', '/api/participants'));
  const result = JSON.parse(postResponse.body);
  const getResponse = await sendRequest({ method: 'GET', url: '/api/participants', headers: { host: 'localhost' } });
  const participants = JSON.parse(getResponse.body);
  const [pathname, photoBuffer, options] = uploadCalls[0];

  assert.equal(postResponse.statusCode, 201);
  assert.equal(getResponse.statusCode, 200);
  assert.equal(result.success, true);
  assert.equal(result.participant.photoUrl, 'https://blob.example/participants/participant.jpg');
  assert.equal(participants[0].photoUrl, result.participant.photoUrl);
  assert.match(pathname, /^participants\/[0-9a-f-]{36}\.jpg$/);
  assert.deepEqual(photoBuffer, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  assert.deepEqual(options, { access: 'public', contentType: 'image/jpeg' });
  assert.equal(Object.hasOwn(options, 'token'), false);
  assert.equal(insertedParticipant.photo_url, result.participant.photoUrl);

  const stages = logEntries.map(([, entry]) => JSON.parse(entry).stage);
  assert.deepEqual(stages, [
    'request received',
    'formData parsed',
    'photo validation ok',
    'blob upload starting',
    'blob upload success',
    'database insert starting',
    'database insert success',
  ]);
  const blobSuccess = logEntries
    .map(([, entry]) => JSON.parse(entry))
    .find((entry) => entry.stage === 'blob upload success');
  assert.equal(blobSuccess.hasUrl, true);
  assert.match(blobSuccess.pathname, /^participants\/[0-9a-f-]{36}\.jpg$/);
});

test('database failures after upload are logged and return a registration error', async (t) => {
  databaseError = Object.assign(new Error('Neon insert failed'), { code: 'XX000' });
  const errors = [];
  t.mock.method(console, 'info', () => {});
  t.mock.method(console, 'error', (...args) => errors.push(args));

  await assert.rejects(
    participantModule.createPublicParticipant(multipartRequest()),
    (error) => error.status === 500 && error.message === 'Não foi possível concluir o cadastro.',
  );
  assert.equal(uploadCalls.length, 1);
  assert.equal(errors.some(([, entry]) => {
    const log = JSON.parse(entry);
    return log.stage === 'database insert' && log.errorMessage === 'Neon insert failed';
  }), true);
});

test('Blob failures return a photo upload error and skip the database insert', async (t) => {
  uploadError = new Error('OIDC authorization failed');
  const errors = [];
  t.mock.method(console, 'info', () => {});
  t.mock.method(console, 'error', (...args) => errors.push(args));

  await assert.rejects(
    participantModule.createPublicParticipant(multipartRequest()),
    (error) => error.status === 502 && error.message === 'Não foi possível enviar a foto.',
  );
  assert.equal(uploadCalls.length, 1);
  assert.equal(insertedParticipant, null);
  assert.equal(errors.some(([label, entry]) => {
    const log = JSON.parse(entry);
    return label === '[participants] blob upload'
      && log.errorType === 'Error'
      && log.errorMessage === 'OIDC authorization failed';
  }), true);
});

function multipartRequest(method = 'POST', url = '/api/participants') {
  const boundary = 'participant-test-boundary';
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\nParticipante Teste\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="costumeName"\r\n\r\nFantasia Teste\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="photo.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const request = Readable.from([body]);
  request.method = method;
  request.url = url;
  request.headers = { 'content-type': `multipart/form-data; boundary=${boundary}` };
  return request;
}

async function sendRequest(request) {
  const response = {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(body) {
      this.body = body;
    },
  };
  await handler(request, response);
  return response;
}
