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
      if (sql.includes('SELECT id FROM votes WHERE voter_id')) {
        if (synchronizeDuplicateReads) {
          duplicateReadCount += 1;
          if (duplicateReadCount === 2) releaseDuplicateReads();
          await duplicateReadBarrier;
        }
        return {
          rows: votes.some((vote) => vote.voterId === params[0] && vote.isTestVote === params[1]) ? [{ id: 1 }] : [],
        };
      }
      if (sql.includes('INSERT INTO votes')) {
        const [participantId, voterId, isTestVote] = params;
        if (votes.some((vote) => vote.voterId === voterId && vote.isTestVote === isTestVote)) {
          const error = new Error('unique violation');
          error.code = '23505';
          error.constraint = 'votes_voter_context_unique';
          throw error;
        }
        votes.push({ participantId, voterId, isTestVote });
        return { rows: [] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
    release() {},
  }),
});

const { vote } = require('./voting');

beforeEach(() => {
  testMode = true;
  participantActive = true;
  votes = [];
  synchronizeDuplicateReads = false;
  duplicateReadCount = 0;
  duplicateReadBarrier = new Promise((resolve) => {
    releaseDuplicateReads = resolve;
  });
});

test('blocks concurrent duplicate votes and reports a friendly conflict', async () => {
  synchronizeDuplicateReads = true;
  const voterId = '123e4567-e89b-42d3-a456-426614174000';
  const attempts = await Promise.allSettled([
    vote({ participantId: 1 }, voterId),
    vote({ participantId: 1 }, voterId),
  ]);

  assert.equal(attempts.filter((attempt) => attempt.status === 'fulfilled').length, 1);
  const rejected = attempts.find((attempt) => attempt.status === 'rejected');
  assert.equal(rejected.reason.status, 409);
  assert.equal(rejected.reason.message, 'Você já votou nesta votação.');
  assert.equal(votes.length, 1);
});

test('allows a test vote and one official vote from the same browser', async () => {
  const voterId = '123e4567-e89b-42d3-a456-426614174000';
  const testVote = await vote({ participantId: 1 }, voterId);
  testMode = false;
  const officialVote = await vote({ participantId: 2 }, voterId);

  assert.equal(testVote.testVote, true);
  assert.equal(officialVote.testVote, false);
  assert.deepEqual(votes.map((item) => item.isTestVote), [true, false]);
  await assert.rejects(vote({ participantId: 3 }, voterId), (error) => error.status === 409);
  assert.equal(votes.length, 2);
});

test('rejects inactive participants before inserting a vote', async () => {
  participantActive = false;
  await assert.rejects(vote({ participantId: 99 }, '123e4567-e89b-42d3-a456-426614174000'), (error) => error.status === 404);
  assert.equal(votes.length, 0);
});
