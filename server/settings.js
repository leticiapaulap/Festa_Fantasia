const { getPool } = require('./database');
const { dateOnly, httpError, nullable, timeOnly } = require('./http');

async function getSettings() {
  return settingsResponse(await getSettingsEntity());
}

async function updateSettings(input) {
  const current = await getSettingsEntity();
  const next = { ...current };
  for (const [key, column] of Object.entries({
    eventName: 'event_name',
    title: 'title',
    description: 'description',
    eventDate: 'event_date',
    eventTime: 'event_time',
    votingEndTime: 'voting_end_time',
    timezone: 'timezone',
    votingOpen: 'voting_open',
    registrationOpen: 'registration_open',
    resultsPublic: 'results_public',
    votingStatus: 'voting_status',
    showPublicResults: 'show_public_results',
    votingStart: 'voting_start',
    votingEnd: 'voting_end',
  })) {
    if (input[key] !== undefined) next[column] = input[key];
  }
  if (input.votingStatus !== undefined) next.voting_open = input.votingStatus === 'OPEN';
  const { rows } = await getPool().query(`
    UPDATE event_settings
    SET event_name=$1, title=$2, description=$3, event_date=$4, event_time=$5,
        voting_end_time=$6, timezone=$7, voting_open=$8, registration_open=$9,
        results_public=$10, voting_status=$11, show_public_results=$12,
        voting_start=$13, voting_end=$14, updated_at=NOW()
    WHERE id=1
    RETURNING *
  `, [
    next.event_name, next.title, next.description, nullable(next.event_date), nullable(next.event_time),
    nullable(next.voting_end_time), next.timezone || 'America/Sao_Paulo', !!next.voting_open,
    !!next.registration_open, !!next.results_public, next.voting_status || 'DRAFT',
    !!next.show_public_results, nullable(next.voting_start), nullable(next.voting_end),
  ]);
  return settingsResponse(rows[0]);
}

async function setVoting(open) {
  const { rows } = await getPool().query(`
    UPDATE event_settings
    SET voting_open=$1, voting_status=$2, registration_open=CASE WHEN $1 THEN FALSE ELSE registration_open END, updated_at=NOW()
    WHERE id=1
    RETURNING *
  `, [open, open ? 'OPEN' : 'CLOSED']);
  return settingsResponse(rows[0]);
}

async function getSettingsEntity() {
  const { rows } = await getPool().query('SELECT * FROM event_settings WHERE id=1');
  if (!rows[0]) throw httpError(500, 'Configurações do evento não encontradas.');
  return rows[0];
}

function settingsResponse(row) {
  const votingStart = votingStartsAt(row);
  const votingEnd = votingEndsAt(row);
  const availabilityValue = availability(row);
  return {
    id: Number(row.id),
    eventName: row.event_name,
    title: row.title,
    description: row.description,
    eventDate: dateOnly(row.event_date),
    eventTime: timeOnly(row.event_time),
    votingEndTime: timeOnly(row.voting_end_time),
    timezone: row.timezone || 'America/Sao_Paulo',
    votingOpen: !!row.voting_open,
    registrationOpen: !!row.registration_open,
    resultsPublic: !!row.results_public,
    votingStatus: row.voting_status || (row.voting_open ? 'OPEN' : 'DRAFT'),
    showPublicResults: !!row.show_public_results,
    votingStartsAt: votingStart ? votingStart.toISOString() : null,
    votingEndsAt: votingEnd ? votingEnd.toISOString() : null,
    votingStart: votingStart ? votingStart.toISOString() : null,
    votingEnd: votingEnd ? votingEnd.toISOString() : null,
    canAcceptVotes: canAcceptVotes(row),
    publicVotingUrl: '/votar',
    votingAvailability: availabilityValue,
  };
}

function canAcceptVotes(settings) {
  return settings.voting_status === 'OPEN' && availability(settings) === 'OPEN';
}

function availability(settings) {
  if (settings.voting_status === 'CLOSED') return 'CLOSED';
  if (settings.voting_status !== 'OPEN') return 'DRAFT';
  const start = votingStartsAt(settings);
  const end = votingEndsAt(settings);
  const now = new Date();
  if (!start) return 'NOT_CONFIGURED';
  if (now < start) return 'BEFORE_WINDOW';
  if (end && now > end) return 'AFTER_WINDOW';
  return 'OPEN';
}

function votingStartsAt(settings) {
  if (settings.event_date && settings.event_time) {
    return new Date(`${dateOnly(settings.event_date)}T${timeOnly(settings.event_time) || '00:00:00'}-03:00`);
  }
  return settings.voting_start ? new Date(settings.voting_start) : null;
}

function votingEndsAt(settings) {
  if (settings.event_date && settings.voting_end_time) {
    return new Date(`${dateOnly(settings.event_date)}T${timeOnly(settings.voting_end_time) || '23:59:00'}-03:00`);
  }
  return settings.voting_end ? new Date(settings.voting_end) : null;
}

module.exports = {
  availability,
  canAcceptVotes,
  getSettings,
  getSettingsEntity,
  setVoting,
  updateSettings,
};
