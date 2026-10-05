const { ensureSchema } = require('./database');
const { json, httpError, readJson, sendError } = require('./http');
const participants = require('./participants');
const settings = require('./settings');
const voting = require('./voting');
const { ensureVoterId } = require('./voter');
const results = require('./results');
const admin = require('./admin');

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const path = apiPath(url);
    const parts = path.split('/').filter(Boolean);

    if (req.method === 'GET' && path === 'settings') return json(res, await settings.getSettings());
    if (req.method === 'GET' && path === 'participants') return json(res, await participants.listParticipants(true));
    if (req.method === 'GET' && parts[0] === 'participants' && parts[1]) {
      return json(res, await participants.getParticipant(parts[1]));
    }
    if (req.method === 'POST' && path === 'participants') {
      return json(res, await participants.createPublicParticipant(req), 201);
    }
    if (req.method === 'GET' && path === 'results') return json(res, await results.results(true));
    if (req.method === 'GET' && path === 'voting/status') {
      const voterId = ensureVoterId(req, res);
      const status = await settings.votingStatus();
      status.hasVoted = await voting.hasVoted(voterId, status.status, req);
      res.setHeader('Cache-Control', 'no-store');
      return json(res, status);
    }
    if (req.method === 'GET' && path === 'voting/live-results') {
      res.setHeader('Cache-Control', 'no-store');
      return json(res, await results.liveResults());
    }
    if (req.method === 'GET' && path === 'voting/results') {
      res.setHeader('Cache-Control', 'no-store');
      return json(res, await results.finalResults());
    }
    if (req.method === 'POST' && path === 'votes') {
      const voterId = ensureVoterId(req, res);
      return json(res, await voting.vote(await readJson(req), voterId, req));
    }

    if (req.method === 'GET' && path === 'admin/bootstrap/status') return json(res, await admin.bootstrapStatus());
    if (req.method === 'POST' && path === 'admin/bootstrap') {
      return json(res, await admin.bootstrap(await readJson(req)));
    }
    if (req.method === 'POST' && path === 'admin/register') {
      return json(res, await admin.registerAdmin(await readJson(req)), 201);
    }
    if (req.method === 'POST' && path === 'admin/login') return json(res, await admin.login(await readJson(req)));
    if (req.method === 'POST' && path === 'admin/logout') return json(res, { message: 'Sessão encerrada.' });

    if (path.startsWith('admin/')) {
      return await admin.withAdmin(req, async () => {
        if (req.method === 'GET' && path === 'admin/dashboard') return json(res, await admin.dashboard());
        if (req.method === 'GET' && path === 'admin/settings') return json(res, await settings.getSettings());
        if ((req.method === 'PUT' || req.method === 'PATCH') && path === 'admin/settings') {
          return json(res, await settings.updateSettings(await readJson(req)));
        }
        if (req.method === 'GET' && path === 'admin/participants') {
          return json(res, await participants.listParticipants(false));
        }
        if (req.method === 'POST' && path === 'admin/participants') {
          return json(res, await participants.createAdminParticipant(req), 201);
        }
        if (req.method === 'PUT' && parts[1] === 'participants' && parts[2]) {
          return json(res, await participants.updateParticipant(parts[2], req));
        }
        if (req.method === 'DELETE' && parts[1] === 'participants' && parts[2]) {
          return json(res, await participants.deleteParticipant(parts[2]));
        }
        if (req.method === 'POST' && path === 'admin/voting/open') return json(res, await settings.setVoting(true));
        if (req.method === 'POST' && path === 'admin/voting/close') return json(res, await settings.setVoting(false));
        if (req.method === 'GET' && path === 'admin/results') return json(res, await results.results(false));
        if (req.method === 'POST' && path === 'admin/votes/reset') {
          return json(res, await admin.resetVotes(await readJson(req)));
        }
        if (req.method === 'POST' && path === 'admin/test-votes/clear') {
          return json(res, await admin.clearTestVotes(await readJson(req)));
        }
        throw httpError(404, 'Endpoint não encontrado.');
      });
    }

    throw httpError(404, 'Endpoint não encontrado.');
  } catch (error) {
    const endpoint = req.url?.split('?')[0] || 'unknown';
    const details = {
      endpoint,
      method: req.method || 'unknown',
      errorType: error.name || 'Error',
    };
    if (typeof error.code === 'string') details.errorCode = error.code;
    if (typeof error.status === 'number') details.status = error.status;
    if (typeof error.stack === 'string') details.stack = error.stack.split('\n').slice(1);
    console.error('[api:request] failed', JSON.stringify(details));
    sendError(res, error);
  }
};

function apiPath(url) {
  const rewrittenPath = url.searchParams.get('path');
  if (rewrittenPath) return rewrittenPath.replace(/^\/+/, '').replace(/\/+$/, '');
  return url.pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
}
