import { db } from './db.js';

// Helper to send JSON responses
function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Id',
  });
  res.end(body);
}

// Helper to parse JSON request body
function parseBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        if (!raw.trim()) return resolve({});
        const parsed = JSON.parse(raw);
        resolve(parsed);
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', () => {
      resolve({});
    });
  });
}

export async function handleApiRequest(req, res, next) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method;

  if (!pathname.startsWith('/api')) {
    return next ? next() : false;
  }

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Id',
    });
    return res.end();
  }

  try {
    // 1. Health check
    if (pathname === '/api/health' && method === 'GET') {
      return sendJson(res, 200, {
        status: 'ok',
        service: 'AFL Match Recorder Backend',
        timestamp: Date.now(),
      });
    }

    // 2. Get all fixtures & series standings
    if (pathname === '/api/fixtures' && method === 'GET') {
      const { fixtures, seriesMap } = db.getFixtures();
      return sendJson(res, 200, { success: true, fixtures, seriesMap });
    }

    // 3. Auth verify passcode
    if (pathname === '/api/auth/verify-passcode' && method === 'POST') {
      const body = await parseBody(req);
      const { matchId, passcode, role = 'recorder' } = body;
      const valid = db.validatePasscode(matchId, passcode);

      if (!valid) {
        return sendJson(res, 401, {
          success: false,
          error: 'Incorrect passcode. Try again.',
        });
      }

      return sendJson(res, 200, {
        success: true,
        valid: true,
        role,
        message: 'Passcode verified successfully.',
      });
    }

    // 4. Data Team access to completed match results
    const resultsMatch = pathname.match(/^\/api\/results\/([^/]+)$/);
    if (resultsMatch && method === 'POST') {
      const matchId = resultsMatch[1];
      const body = await parseBody(req);
      const { passcode } = body;

      const clientInfo = {
        ip: req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      const result = db.getDataTeamResults(matchId, passcode, clientInfo);
      if (!result.success) {
        return sendJson(res, 401, result);
      }
      return sendJson(res, 200, result);
    }

    // 5. Match Lock routes
    const lockMatch = pathname.match(/^\/api\/fixtures\/([^/]+)\/lock$/);
    if (lockMatch && method === 'POST') {
      const matchId = lockMatch[1];
      const body = await parseBody(req);
      const { passcode, sessionId } = body;

      const result = db.acquireLock(matchId, passcode, sessionId);
      if (!result.success) {
        const status = result.error.includes('passcode') ? 401 : 409;
        return sendJson(res, status, result);
      }
      return sendJson(res, 200, result);
    }

    const heartbeatMatch = pathname.match(/^\/api\/fixtures\/([^/]+)\/heartbeat$/);
    if (heartbeatMatch && method === 'POST') {
      const matchId = heartbeatMatch[1];
      const body = await parseBody(req);
      const { sessionId } = body;

      const result = db.heartbeatLock(matchId, sessionId);
      return sendJson(res, result.success ? 200 : 400, result);
    }

    const unlockMatch = pathname.match(/^\/api\/fixtures\/([^/]+)\/unlock$/);
    if (unlockMatch && method === 'POST') {
      const matchId = unlockMatch[1];
      const body = await parseBody(req);
      const { sessionId } = body;

      const result = db.releaseLock(matchId, sessionId);
      return sendJson(res, 200, result);
    }

    // 6. Match Events routes
    const eventsListMatch = pathname.match(/^\/api\/fixtures\/([^/]+)\/events$/);
    if (eventsListMatch && method === 'GET') {
      const matchId = eventsListMatch[1];
      const events = db.getEvents(matchId);
      const score = db.calculateMatchScore(matchId);
      return sendJson(res, 200, { success: true, events, score });
    }

    if (eventsListMatch && method === 'POST') {
      const matchId = eventsListMatch[1];
      const body = await parseBody(req);
      const { event, sessionId } = body;

      if (!event || !event.type || !event.minute) {
        return sendJson(res, 400, { success: false, error: 'Invalid event data.' });
      }

      const result = db.addEvent(matchId, event, sessionId);
      if (!result.success) {
        return sendJson(res, 400, result);
      }

      const score = db.calculateMatchScore(matchId);
      return sendJson(res, 201, { success: true, event: result.event, score });
    }

    const eventItemMatch = pathname.match(/^\/api\/fixtures\/([^/]+)\/events\/([^/]+)$/);
    if (eventItemMatch && method === 'PUT') {
      const matchId = eventItemMatch[1];
      const eventId = eventItemMatch[2];
      const body = await parseBody(req);
      const { event, sessionId } = body;

      const result = db.updateEvent(matchId, eventId, event, sessionId);
      if (!result.success) {
        return sendJson(res, 400, result);
      }
      const score = db.calculateMatchScore(matchId);
      return sendJson(res, 200, { success: true, event: result.event, score });
    }

    if (eventItemMatch && method === 'DELETE') {
      const matchId = eventItemMatch[1];
      const eventId = eventItemMatch[2];
      const body = await parseBody(req);
      const { sessionId } = body;

      const result = db.deleteEvent(matchId, eventId, sessionId);
      const score = db.calculateMatchScore(matchId);
      return sendJson(res, 200, { success: true, score });
    }

    // 7. Match Submit route
    const submitMatch = pathname.match(/^\/api\/fixtures\/([^/]+)\/submit$/);
    if (submitMatch && method === 'POST') {
      const matchId = submitMatch[1];
      const body = await parseBody(req);
      const { passcode, sessionId } = body;

      const result = db.submitMatch(matchId, passcode, sessionId);
      if (!result.success) {
        const status = result.error.includes('passcode') ? 401 : 400;
        return sendJson(res, status, result);
      }
      return sendJson(res, 200, result);
    }

    // 8. Single fixture detail
    const fixtureMatch = pathname.match(/^\/api\/fixtures\/([^/]+)$/);
    if (fixtureMatch && method === 'GET') {
      const matchId = fixtureMatch[1];
      const fixture = db.getFixture(matchId);
      if (!fixture) {
        return sendJson(res, 404, { success: false, error: 'Fixture not found.' });
      }
      const events = db.getEvents(matchId);
      const score = fixture.result?.score || db.calculateMatchScore(matchId);
      return sendJson(res, 200, { success: true, fixture, events, score });
    }

    // 9. Reset store (demo / testing)
    if (pathname === '/api/reset' && method === 'POST') {
      db.resetStore();
      const { fixtures, seriesMap } = db.getFixtures();
      return sendJson(res, 200, { success: true, message: 'Store reset to seed data.', fixtures, seriesMap });
    }

    // Default 404 for unhandled /api
    return sendJson(res, 404, { success: false, error: 'API route not found' });
  } catch (err) {
    console.error('Unhandled API error:', err);
    return sendJson(res, 500, { success: false, error: 'Internal Server Error' });
  }
}
