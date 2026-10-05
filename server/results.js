const { getPool } = require('./database');
const { getSettingsEntity, votingState } = require('./settings');
const { httpError } = require('./http');

async function results(publicView) {
  const settings = await getSettingsEntity();
  const state = votingState(settings);
  const canShowPublic = !publicView || state === 'RESULT_PUBLISHED';
  if (!canShowPublic) return emptyResults(settings, state);
  return resultsForMode({ isTestVote: state === 'TEST', status: state, resultsPublic: canShowPublic, final: state === 'RESULT_PUBLISHED' });
}

async function liveResults() {
  const settings = await getSettingsEntity();
  const state = votingState(settings);
  if (settings.show_live_results === false) throw httpError(403, 'Resultado parcial indisponível.');
  if (!['TEST', 'OPEN'].includes(state)) throw httpError(409, 'Resultado parcial disponível somente durante a votação.');
  return resultsForMode({
    isTestVote: state === 'TEST',
    status: state,
    resultsPublic: true,
    final: false,
  });
}

async function finalResults() {
  const settings = await getSettingsEntity();
  const state = votingState(settings);
  if (state !== 'RESULT_PUBLISHED') {
    return {
      status: state,
      resultsPublic: false,
      final: false,
      tie: false,
      totalVotes: 0,
      updatedAt: new Date().toISOString(),
      ranking: [],
      winners: [],
    };
  }
  return resultsForMode({ isTestVote: false, status: state, resultsPublic: true, final: true });
}

async function resultsForMode({ isTestVote, status, resultsPublic, final }) {
  const { rows } = await getPool().query(`
    SELECT p.id, p.name, p.costume_name, p.description, p.photo_url, COUNT(v.id)::int AS votes
    FROM participants p
    LEFT JOIN votes v ON v.participant_id = p.id AND v.is_test_vote = $1
    WHERE p.active = TRUE
    GROUP BY p.id
    ORDER BY votes DESC, p.costume_name ASC, p.id ASC
  `, [isTestVote]);
  const totalVotes = rows.reduce((sum, row) => sum + Number(row.votes), 0);
  let position = 0;
  let previousVotes = null;
  const ranking = rows.map((row, index) => {
    const votes = Number(row.votes);
    if (votes !== previousVotes) position = index + 1;
    previousVotes = votes;
    return {
      participantId: Number(row.id),
      participantName: row.name,
      costumeName: row.costume_name,
      description: row.description,
      photoUrl: row.photo_url,
      votes,
      percentage: totalVotes ? Number(((votes / totalVotes) * 100).toFixed(2)) : 0,
      position: totalVotes ? position : null,
    };
  });
  const topVotes = ranking[0]?.votes || 0;
  const winners = topVotes > 0 ? ranking.filter((item) => item.votes === topVotes) : [];
  return {
    status,
    votingOpen: status === 'OPEN' || status === 'TEST',
    resultsPublic,
    final,
    isTestResult: !!isTestVote,
    tie: winners.length > 1,
    totalVotes,
    updatedAt: new Date().toISOString(),
    ranking,
    winners,
  };
}

function emptyResults(settings, status) {
  return {
    status,
    votingOpen: status === 'OPEN' || status === 'TEST',
    resultsPublic: !!settings.show_public_results,
    final: false,
    isTestResult: false,
    tie: false,
    totalVotes: 0,
    updatedAt: new Date().toISOString(),
    ranking: [],
    winners: [],
  };
}

module.exports = { finalResults, liveResults, results, resultsForMode };
