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
    votingStartsAt: 'voting_start',
    votingEndsAt: 'voting_end',
    resultsRevealAt: 'results_reveal_at',
    votingTestMode: 'voting_test_mode',
    showLiveResults: 'show_live_results',
  })) {
    if (input[key] !== undefined) next[column] = input[key];
  }
  if (input.votingStatus !== undefined) next.voting_open = input.votingStatus === 'OPEN';
  const { rows } = await getPool().query(`
    UPDATE event_settings
    SET event_name=$1, title=$2, description=$3, event_date=$4, event_time=$5,
        voting_end_time=$6, timezone=$7, voting_open=$8, registration_open=$9,
        results_public=$10, voting_status=$11, show_public_results=$12,
        voting_start=$13, voting_end=$14, results_reveal_at=$15,
        voting_test_mode=$16, show_live_results=$17, updated_at=NOW()
    WHERE id=1
    RETURNING *
  `, [
    next.event_name, next.title, next.description, nullable(next.event_date), nullable(next.event_time),
    nullable(next.voting_end_time), next.timezone || 'America/Sao_Paulo', !!next.voting_open,
    !!next.registration_open, !!next.results_public, next.voting_status || 'DRAFT',
    !!next.show_public_results, nullable(next.voting_start), nullable(next.voting_end),
    nullable(next.results_reveal_at), !!next.voting_test_mode, next.show_live_results !== false,
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
  const resultsReveal = resultsRevealAt(row);
  const status = votingState(row);
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
    showLiveResults: row.show_live_results !== false,
    votingTestMode: !!row.voting_test_mode,
    votingStartsAt: votingStart ? votingStart.toISOString() : null,
    votingEndsAt: votingEnd ? votingEnd.toISOString() : null,
    resultsRevealAt: resultsReveal ? resultsReveal.toISOString() : null,
    votingStart: votingStart ? votingStart.toISOString() : null,
    votingEnd: votingEnd ? votingEnd.toISOString() : null,
    canAcceptVotes: canAcceptVotes(row),
    publicVotingUrl: '/votar',
    votingAvailability: status,
    votingState: status,
    serverTime: new Date().toISOString(),
  };
}

function canAcceptVotes(settings) {
  const state = votingState(settings);
  return state === 'TEST' || state === 'OPEN';
}

function availability(settings) {
  return votingState(settings);
}

function votingState(settings, now = new Date()) {
  if (settings.voting_test_mode) return 'TEST';
  const start = votingStartsAt(settings);
  const end = votingEndsAt(settings);
  const reveal = resultsRevealAt(settings);
  if (settings.voting_status === 'CLOSED') {
    if (reveal && now >= reveal) return 'RESULT_PUBLISHED';
    if (reveal) return 'RESULT_PENDING';
    return 'CLOSED';
  }
  if (!start || now < start) return 'WAITING';
  if (end && now >= end) {
    if (reveal && now < reveal) return 'RESULT_PENDING';
    if (reveal && now >= reveal) return 'RESULT_PUBLISHED';
    return 'CLOSED';
  }
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

function resultsRevealAt(settings) {
  return settings.results_reveal_at ? new Date(settings.results_reveal_at) : null;
}

async function votingStatus() {
  const settings = await getSettingsEntity();
  const start = votingStartsAt(settings);
  const end = votingEndsAt(settings);
  const reveal = resultsRevealAt(settings);
  return {
    status: votingState(settings),
    serverTime: new Date().toISOString(),
    votingStartsAt: start ? start.toISOString() : null,
    votingEndsAt: end ? end.toISOString() : null,
    resultsRevealAt: reveal ? reveal.toISOString() : null,
    votingTestMode: !!settings.voting_test_mode,
    showLiveResults: settings.show_live_results !== false,
    timezone: settings.timezone || 'America/Sao_Paulo',
  };
}

module.exports = {
  availability,
  canAcceptVotes,
  getSettings,
  getSettingsEntity,
  resultsRevealAt,
  setVoting,
  updateSettings,
  votingEndsAt,
  votingStartsAt,
  votingState,
  votingStatus,
};
