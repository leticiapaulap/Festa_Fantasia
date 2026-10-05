const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');
const database = require('./database');

let testMode;
let participantActive;
let votes;
let synchronizeDuplicateReads;
let duplicateReadCount;
let releaseDuplicateReads;
let duplicateReadBarrier;

database.getPool = () => ({
  connect: async () => ({
    query: async (sql, params = []) => {
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return { rows: [] };
      if (sql.includes('FROM event_settings')) {
        return {
          rows: [{
            voting_test_mode: testMode,
            voting_start: new Date(Date.now() - 60_000).toISOString(),
            voting_status: 'OPEN',
          }],
        };
      }
      if (sql.includes('FROM participants')) return { rows: participantActive ? [{ id: params[0] }] : [] };
      if (sql.includes('FROM votes') && sql.includes('voter_id=$1 OR ip_hash=$2')) {
        if (synchronizeDuplicateReads) {
          duplicateReadCount += 1;
          if (duplicateReadCount === 2) releaseDuplicateReads();
          await duplicateReadBarrier;
        }
        const [voterId, ipHash, isTestVote] = params;
        const duplicate = votes.find((vote) => (
          (vote.voterId === voterId || vote.ipHash === ipHash) && vote.isTestVote === isTestVote
        ));
        return {
          rows: duplicate ? [{
            id: 1,
            same_browser: duplicate.voterId === voterId,
            same_ip: duplicate.ipHash === ipHash,
          }] : [],
        };
      }
      if (sql.includes('INSERT INTO votes')) {
        const [participantId, voterId, ipHash, isTestVote] = params;
        if (votes.some((vote) => vote.ipHash === ipHash && vote.isTestVote === isTestVote)) {
          const error = new Error('unique violation');
          error.code = '23505';
          error.constraint = 'votes_ip_context_unique';
          throw error;
        }
        if (votes.some((vote) => vote.voterId === voterId && vote.isTestVote === isTestVote)) {
          const error = new Error('unique violation');
          error.code = '23505';
          error.constraint = 'votes_voter_context_unique';
          throw error;
        }
        votes.push({ participantId, voterId, ipHash, isTestVote });
        return { rows: [] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
    release() {},
  }),
});

const { IP_DUPLICATE_MESSAGE, normalizeClientIp, vote } = require('./voting');

beforeEach(() => {
  process.env.IP_HASH_SECRET = 'test-ip-hash-secret-with-at-least-32-characters';
  testMode = true;
  participantActive = true;
  votes = [];
  synchronizeDuplicateReads = false;
  duplicateReadCount = 0;
  duplicateReadBarrier = new Promise((resolve) => {
    releaseDuplicateReads = resolve;
  });
});

test('blocks concurrent duplicate votes from the same IP and reports a friendly conflict', async () => {
  synchronizeDuplicateReads = true;
  const attempts = await Promise.allSettled([
    vote({ participantId: 1 }, '123e4567-e89b-42d3-a456-426614174000', reqFromIp('203.0.113.10')),
    vote({ participantId: 1 }, '123e4567-e89b-42d3-a456-426614174001', reqFromIp('203.0.113.10')),
  ]);

  assert.equal(attempts.filter((attempt) => attempt.status === 'fulfilled').length, 1);
  const rejected = attempts.find((attempt) => attempt.status === 'rejected');
  assert.equal(rejected.reason.status, 409);
  assert.equal(rejected.reason.message, IP_DUPLICATE_MESSAGE);
  assert.equal(votes.length, 1);
});

test('allows a test vote and one official vote from the same IP', async () => {
  const voterId = '123e4567-e89b-42d3-a456-426614174000';
  const req = reqFromIp('203.0.113.20');
  const testVote = await vote({ participantId: 1 }, voterId, req);
  testMode = false;
  const officialVote = await vote({ participantId: 2 }, voterId, req);

  assert.equal(testVote.testVote, true);
  assert.equal(officialVote.testVote, false);
  assert.deepEqual(votes.map((item) => item.isTestVote), [true, false]);
  await assert.rejects(vote({ participantId: 3 }, '123e4567-e89b-42d3-a456-426614174099', req), (error) => (
    error.status === 409 && error.message === IP_DUPLICATE_MESSAGE
  ));
  assert.equal(votes.length, 2);
});

test('allows another IP to vote in the same official context', async () => {
  testMode = false;
  await vote({ participantId: 1 }, '123e4567-e89b-42d3-a456-426614174000', reqFromIp('203.0.113.30'));
  await vote({ participantId: 2 }, '123e4567-e89b-42d3-a456-426614174001', reqFromIp('203.0.113.31'));

  assert.equal(votes.length, 2);
  assert.deepEqual(votes.map((item) => item.isTestVote), [false, false]);
});

test('normalizes proxied IPv4 and IPv6 client addresses', () => {
  assert.equal(normalizeClientIp(' 203.0.113.40:1234 '), '203.0.113.40');
  assert.equal(normalizeClientIp('::ffff:203.0.113.41'), '203.0.113.41');
  assert.equal(normalizeClientIp('[2001:db8::1]:443'), '2001:0db8:0000:0000:0000:0000:0000:0001');
});

test('rejects inactive participants before inserting a vote', async () => {
  participantActive = false;
  await assert.rejects(
    vote({ participantId: 99 }, '123e4567-e89b-42d3-a456-426614174000', reqFromIp('203.0.113.50')),
    (error) => error.status === 404,
  );
  assert.equal(votes.length, 0);
});

function reqFromIp(ip) {
  return {
    headers: {
      'x-vercel-forwarded-for': ip,
      'x-vercel-id': 'gru1::test',
    },
    socket: {
      remoteAddress: '127.0.0.1',
    },
  };
}
