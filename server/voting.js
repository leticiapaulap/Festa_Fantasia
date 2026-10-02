const { getPool } = require('./database');
const { votingState } = require('./settings');
const { httpError } = require('./http');

async function vote(input, voterId) {
  const participantId = Number(input?.participantId);
  if (!Number.isInteger(participantId) || participantId <= 0) {
    throw httpError(400, 'Participante inválido.');
  }
  if (!voterId) throw httpError(500, 'Não foi possível identificar este navegador.');

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const settings = (await client.query('SELECT * FROM event_settings WHERE id=1')).rows[0];
    const state = votingState(settings);
    if (!['TEST', 'OPEN'].includes(state)) throw httpError(403, messageForVoting(state));

    const isTestVote = state === 'TEST';
    const participant = await client.query('SELECT * FROM participants WHERE id=$1 AND active=TRUE', [participantId]);
    if (!participant.rows[0]) throw httpError(404, 'Participante não encontrado.');
    const alreadyVoted = await client.query(
      'SELECT id FROM votes WHERE voter_id=$1 AND is_test_vote=$2',
      [voterId, isTestVote]
    );
    if (alreadyVoted.rows[0]) throw httpError(409, 'Você já votou nesta votação.');

    await client.query(
      'INSERT INTO votes (participant_id, voter_id, is_test_vote) VALUES ($1, $2, $3)',
      [participantId, voterId, isTestVote]
    );
    await client.query('COMMIT');
    return {
      message: isTestVote ? 'Voto de teste registrado com sucesso!' : 'Voto registrado com sucesso!',
      testVote: isTestVote,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    if (error.code === '23505' && error.constraint === 'votes_voter_context_unique') {
      throw httpError(409, 'Você já votou nesta votação.');
    }
    throw error;
  } finally {
    client.release();
  }
}

function messageForVoting(state) {
  if (state === 'WAITING') return 'A votação será liberada no horário do evento.';
  if (state === 'RESULT_PENDING') return 'A votação está encerrada. Aguarde o resultado final.';
  if (state === 'RESULT_PUBLISHED' || state === 'CLOSED') return 'A votação está encerrada.';
  return 'A votação ainda não está aberta.';
}

async function hasVoted(voterId, status) {
  const isTestVote = status === 'TEST';
  const { rows } = await getPool().query(
    'SELECT EXISTS (SELECT 1 FROM votes WHERE voter_id=$1 AND is_test_vote=$2) AS voted',
    [voterId, isTestVote]
  );
  return rows[0].voted;
}

module.exports = { hasVoted, vote };
