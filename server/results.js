const { getPool } = require('./database');
const { getSettingsEntity } = require('./settings');

async function results(publicView) {
  const settings = await getSettingsEntity();
  const canShowPublic = !publicView || (settings.show_public_results && settings.voting_status === 'CLOSED');
  if (!canShowPublic) {
    return { votingOpen: !!settings.voting_open, resultsPublic: !!settings.show_public_results, tie: false, totalVotes: 0, ranking: [], winners: [] };
  }
  const { rows } = await getPool().query(`
    SELECT p.id, p.name, p.costume_name, p.description, p.photo_url, COUNT(v.id)::int AS votes
    FROM participants p
    LEFT JOIN votes v ON v.participant_id = p.id
    WHERE p.active = TRUE
    GROUP BY p.id
    ORDER BY votes DESC, p.costume_name ASC
  `);
  const totalVotes = rows.reduce((sum, row) => sum + Number(row.votes), 0);
  const ranking = rows.map((row) => ({
    participantId: Number(row.id),
    participantName: row.name,
    costumeName: row.costume_name,
    description: row.description,
    photoUrl: row.photo_url,
    votes: Number(row.votes),
    percentage: totalVotes ? Number(((Number(row.votes) / totalVotes) * 100).toFixed(2)) : 0,
  }));
  const topVotes = ranking[0]?.votes || 0;
  const winners = topVotes > 0 ? ranking.filter((item) => item.votes === topVotes) : [];
  return {
    votingOpen: !!settings.voting_open,
    resultsPublic: !!settings.show_public_results,
    tie: winners.length > 1,
    totalVotes,
    ranking,
    winners,
  };
}

module.exports = { results };
