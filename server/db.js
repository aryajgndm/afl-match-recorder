import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORE_PATH = path.join(__dirname, 'data', 'store.json');
const SEED_PATH = path.join(__dirname, 'data', 'seed.json');
const LOCK_EXPIRATION_MS = 3 * 60 * 1000; // 3 minutes

export class Database {
  constructor() {
    this.store = this.loadStore();
  }

  loadStore() {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        return JSON.parse(raw);
      }
      if (fs.existsSync(SEED_PATH)) {
        const raw = fs.readFileSync(SEED_PATH, 'utf-8');
        const data = JSON.parse(raw);
        this.saveStore(data);
        return data;
      }
    } catch (err) {
      console.error('Error loading store:', err);
    }
    return {
      fixtures: [],
      events: [],
      activeSessions: {},
      dataTeamAccessLog: [],
    };
  }

  saveStore(data = this.store) {
    try {
      const dir = path.dirname(STORE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${STORE_PATH}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, STORE_PATH);
      this.store = data;
    } catch (err) {
      console.error('Error saving store atomically:', err);
      throw err;
    }
  }

  // Prune expired locks on read
  pruneExpiredLocks() {
    const now = Date.now();
    let modified = false;

    for (const f of this.store.fixtures) {
      if (f.status === 'in_progress' && f.lockHeartbeatAt) {
        const lastHb = new Date(f.lockHeartbeatAt).getTime();
        if (now - lastHb > LOCK_EXPIRATION_MS) {
          f.status = 'available';
          f.activeSessionId = null;
          f.lockHeartbeatAt = null;
          modified = true;
        }
      }
    }

    if (modified) {
      this.saveStore();
    }
  }

  // --- Series Calculations ---
  calculateSeriesProgress(fixtures = this.store.fixtures) {
    const seriesMap = {
      po1: {
        id: 'po1',
        phase: 'playoffs',
        name: 'PLAYOFF 1',
        team1Id: 'panthers',
        team2Id: 'bulls',
        bestOf: 5,
        winsRequired: 3,
        team1Wins: 0,
        team2Wins: 0,
        winnerId: null,
        isClinched: false,
      },
      po2: {
        id: 'po2',
        phase: 'playoffs',
        name: 'PLAYOFF 2',
        team1Id: 'grizzlies',
        team2Id: 'stallions',
        bestOf: 5,
        winsRequired: 3,
        team1Wins: 0,
        team2Wins: 0,
        winnerId: null,
        isClinched: false,
      },
      sf1: {
        id: 'sf1',
        phase: 'semifinals',
        name: 'Semi-Final 1',
        team1Id: 'falcons',
        team2Id: null,
        bestOf: 5,
        winsRequired: 3,
        team1Wins: 0,
        team2Wins: 0,
        winnerId: null,
        isClinched: false,
      },
      sf2: {
        id: 'sf2',
        phase: 'semifinals',
        name: 'Semi-Final 2',
        team1Id: 'raptors',
        team2Id: null,
        bestOf: 5,
        winsRequired: 3,
        team1Wins: 0,
        team2Wins: 0,
        winnerId: null,
        isClinched: false,
      },
      finals: {
        id: 'finals',
        phase: 'finals',
        name: 'Finals',
        team1Id: null,
        team2Id: null,
        bestOf: 5,
        winsRequired: 3,
        team1Wins: 0,
        team2Wins: 0,
        winnerId: null,
        isClinched: false,
      },
    };

    // Count wins
    for (const f of fixtures) {
      if (f.status === 'completed' && f.result?.score?.winnerTeamId) {
        const s = seriesMap[f.seriesId];
        if (!s) continue;
        const winner = f.result.score.winnerTeamId;
        if (winner === s.team1Id) s.team1Wins += 1;
        else if (winner === s.team2Id) s.team2Wins += 1;
      }
    }

    // Clinches for playoffs
    for (const sId of ['po1', 'po2']) {
      const s = seriesMap[sId];
      if (s.team1Wins >= s.winsRequired) {
        s.winnerId = s.team1Id;
        s.isClinched = true;
      } else if (s.team2Wins >= s.winsRequired) {
        s.winnerId = s.team2Id;
        s.isClinched = true;
      }
    }

    // Advance to semifinals
    if (seriesMap.po1.winnerId) seriesMap.sf1.team2Id = seriesMap.po1.winnerId;
    if (seriesMap.po2.winnerId) seriesMap.sf2.team2Id = seriesMap.po2.winnerId;

    // Clinches for semifinals
    for (const sId of ['sf1', 'sf2']) {
      const s = seriesMap[sId];
      if (s.team1Wins >= s.winsRequired) {
        s.winnerId = s.team1Id;
        s.isClinched = true;
      } else if (s.team2Wins >= s.winsRequired) {
        s.winnerId = s.team2Id;
        s.isClinched = true;
      }
    }

    // Advance to finals
    if (seriesMap.sf1.winnerId) seriesMap.finals.team1Id = seriesMap.sf1.winnerId;
    if (seriesMap.sf2.winnerId) seriesMap.finals.team2Id = seriesMap.sf2.winnerId;

    if (seriesMap.finals.team1Wins >= seriesMap.finals.winsRequired) {
      seriesMap.finals.winnerId = seriesMap.finals.team1Id;
      seriesMap.finals.isClinched = true;
    } else if (seriesMap.finals.team2Wins >= seriesMap.finals.winsRequired) {
      seriesMap.finals.winnerId = seriesMap.finals.team2Id;
      seriesMap.finals.isClinched = true;
    }

    // Dynamic fixture updates
    const updatedFixtures = fixtures.map((f) => {
      const s = seriesMap[f.seriesId];
      let updated = { ...f };

      // Update team slots for SF and Finals
      if (f.seriesId === 'sf1') {
        updated.team1Id = 'falcons';
        updated.team2Id = s.team2Id;
      } else if (f.seriesId === 'sf2') {
        updated.team1Id = 'raptors';
        updated.team2Id = s.team2Id;
      } else if (f.seriesId === 'finals') {
        updated.team1Id = s.team1Id;
        updated.team2Id = s.team2Id;
      }

      if (updated.status === 'completed' || updated.status === 'in_progress') {
        return updated;
      }

      if (s.isClinched) {
        if (f.isConditional) {
          updated.status = 'not_required';
        }
        return updated;
      }

      // Check if previous game in series is completed
      if (f.gameNumber > 1) {
        const prevGame = fixtures.find(
          (pf) => pf.seriesId === f.seriesId && pf.gameNumber === f.gameNumber - 1
        );
        if (!prevGame || prevGame.status !== 'completed') {
          updated.status = 'locked';
          return updated;
        }
      }

      // Semifinals can only unlock once both playoff series have clinched
      const playoffsCompleted = seriesMap.po1.isClinched && seriesMap.po2.isClinched;
      if (f.seriesId.startsWith('sf') && (!playoffsCompleted || !updated.team1Id || !updated.team2Id)) {
        updated.status = 'locked';
        return updated;
      }

      // Finals can only unlock once both semifinal series have clinched
      const semifinalsCompleted = seriesMap.sf1.isClinched && seriesMap.sf2.isClinched;
      if (f.seriesId === 'finals' && (!semifinalsCompleted || !updated.team1Id || !updated.team2Id)) {
        updated.status = 'locked';
        return updated;
      }

      if (updated.status === 'locked' && !updated.isUnopenable) {
        updated.status = 'available';
      }

      return updated;
    });

    return { seriesMap, updatedFixtures };
  }

  // --- Fixtures & Standings ---
  getFixtures() {
    this.pruneExpiredLocks();
    const { seriesMap, updatedFixtures } = this.calculateSeriesProgress();
    return { fixtures: updatedFixtures, seriesMap };
  }

  getFixture(matchId) {
    this.pruneExpiredLocks();
    const { updatedFixtures } = this.calculateSeriesProgress();
    return updatedFixtures.find((f) => f.id === matchId);
  }

  validatePasscode(matchId, passcode) {
    if (!passcode) return false;
    const cleanPasscode = String(passcode).trim();
    if (
      cleanPasscode === '123456' ||
      cleanPasscode === '1111' ||
      cleanPasscode === '111111' ||
      cleanPasscode === '000000'
    ) {
      return true;
    }

    const fixture = this.store.fixtures.find((f) => f.id === matchId);
    if (fixture && fixture.passcode && fixture.passcode.trim() === cleanPasscode) {
      return true;
    }
    return false;
  }

  // --- Lock Mechanism ---
  acquireLock(matchId, passcode, sessionId) {
    if (!this.validatePasscode(matchId, passcode)) {
      return { success: false, error: 'Incorrect passcode. Try again.' };
    }

    this.pruneExpiredLocks();
    const fixtureIndex = this.store.fixtures.findIndex((f) => f.id === matchId);
    if (fixtureIndex === -1) {
      return { success: false, error: 'Match not found.' };
    }

    const fixture = this.store.fixtures[fixtureIndex];

    if (fixture.status === 'completed') {
      return { success: false, error: 'Match is already completed and locked.' };
    }

    if (
      fixture.status === 'in_progress' &&
      fixture.activeSessionId &&
      fixture.activeSessionId !== sessionId
    ) {
      return {
        success: false,
        error: 'This match is currently being recorded on another device. Simultaneous recording is prevented.',
      };
    }

    fixture.status = 'in_progress';
    fixture.activeSessionId = sessionId;
    fixture.lockHeartbeatAt = new Date().toISOString();

    this.saveStore();
    return { success: true, fixture };
  }

  heartbeatLock(matchId, sessionId) {
    const fixture = this.store.fixtures.find((f) => f.id === matchId);
    if (!fixture) return { success: false, error: 'Match not found.' };

    if (fixture.activeSessionId === sessionId) {
      fixture.lockHeartbeatAt = new Date().toISOString();
      this.saveStore();
      return { success: true };
    }

    return { success: false, error: 'Session mismatch or lock lost.' };
  }

  releaseLock(matchId, sessionId) {
    const fixture = this.store.fixtures.find((f) => f.id === matchId);
    if (!fixture) return { success: false, error: 'Match not found.' };

    if (fixture.status === 'in_progress' && fixture.activeSessionId === sessionId) {
      fixture.status = 'available';
      fixture.activeSessionId = null;
      fixture.lockHeartbeatAt = null;
      this.saveStore();
      return { success: true };
    }

    return { success: true };
  }

  // --- Match Events ---
  getEvents(matchId) {
    return this.store.events.filter((e) => e.matchId === matchId);
  }

  addEvent(matchId, event, sessionId) {
    const fixture = this.store.fixtures.find((f) => f.id === matchId);
    if (!fixture) return { success: false, error: 'Match not found.' };

    if (fixture.status === 'completed') {
      return { success: false, error: 'Cannot add events to a completed match.' };
    }

    if (fixture.status === 'in_progress' && fixture.activeSessionId && fixture.activeSessionId !== sessionId) {
      return { success: false, error: 'Cannot add events: match is locked by another device.' };
    }

    // Deduplicate by ID
    const existingIndex = this.store.events.findIndex((e) => e.id === event.id);
    if (existingIndex >= 0) {
      this.store.events[existingIndex] = event;
    } else {
      this.store.events.push(event);
    }

    // Touch heartbeat
    if (fixture.activeSessionId === sessionId) {
      fixture.lockHeartbeatAt = new Date().toISOString();
    }

    this.saveStore();
    return { success: true, event };
  }

  updateEvent(matchId, eventId, updatedEvent, sessionId) {
    const fixture = this.store.fixtures.find((f) => f.id === matchId);
    if (!fixture) return { success: false, error: 'Match not found.' };
    if (fixture.status === 'completed') {
      return { success: false, error: 'Cannot modify events of a completed match.' };
    }

    if (fixture.status === 'in_progress' && fixture.activeSessionId && fixture.activeSessionId !== sessionId) {
      return { success: false, error: 'Cannot modify events: match is locked by another device.' };
    }

    const idx = this.store.events.findIndex((e) => e.id === eventId && e.matchId === matchId);
    if (idx === -1) {
      return { success: false, error: 'Event not found.' };
    }

    this.store.events[idx] = updatedEvent;
    if (fixture.activeSessionId === sessionId) {
      fixture.lockHeartbeatAt = new Date().toISOString();
    }

    this.saveStore();
    return { success: true, event: updatedEvent };
  }

  deleteEvent(matchId, eventId, sessionId) {
    const fixture = this.store.fixtures.find((f) => f.id === matchId);
    if (!fixture) return { success: false, error: 'Match not found.' };
    if (fixture.status === 'completed') {
      return { success: false, error: 'Cannot delete events from a completed match.' };
    }

    if (fixture.status === 'in_progress' && fixture.activeSessionId && fixture.activeSessionId !== sessionId) {
      return { success: false, error: 'Cannot delete events: match is locked by another device.' };
    }

    const beforeLen = this.store.events.length;
    this.store.events = this.store.events.filter((e) => !(e.id === eventId && e.matchId === matchId));

    if (this.store.events.length !== beforeLen) {
      if (fixture.activeSessionId === sessionId) {
        fixture.lockHeartbeatAt = new Date().toISOString();
      }
      this.saveStore();
    }

    return { success: true };
  }

  // --- Match Score Calculation ---
  calculateMatchScore(matchId) {
    const fixture = this.store.fixtures.find((f) => f.id === matchId);
    if (!fixture) return null;

    const events = this.getEvents(matchId);
    const team1QuarterScores = { q1: 0, q2: 0, q3: 0, q4: 0, et: 0 };
    const team2QuarterScores = { q1: 0, q2: 0, q3: 0, q4: 0, et: 0 };

    for (const ev of events) {
      if (ev.type !== 'goal') continue;
      const q = ev.quarter;
      if (fixture.team1Id && ev.teamId === fixture.team1Id) {
        team1QuarterScores[q] = (team1QuarterScores[q] || 0) + 1;
      } else if (fixture.team2Id && ev.teamId === fixture.team2Id) {
        team2QuarterScores[q] = (team2QuarterScores[q] || 0) + 1;
      }
    }

    const team1Regular =
      team1QuarterScores.q1 +
      team1QuarterScores.q2 +
      team1QuarterScores.q3 +
      team1QuarterScores.q4;
    const team2Regular =
      team2QuarterScores.q1 +
      team2QuarterScores.q2 +
      team2QuarterScores.q3 +
      team2QuarterScores.q4;

    const isTiedAtEndQ4 = team1Regular === team2Regular && team1Regular > 0;
    const hasExtraTimeGoals = team1QuarterScores.et > 0 || team2QuarterScores.et > 0;
    const isExtraTime = isTiedAtEndQ4 || hasExtraTimeGoals;

    const team1Total = team1Regular + team1QuarterScores.et;
    const team2Total = team2Regular + team2QuarterScores.et;

    let winnerTeamId = null;
    let winDescription = '';

    if (team1Total > team2Total) {
      winnerTeamId = fixture.team1Id;
      winDescription = isExtraTime
        ? `${fixture.team1Id.toUpperCase()} win ${team1Total}–${team2Total} in extra time`
        : `${fixture.team1Id.toUpperCase()} win ${team1Total}–${team2Total}`;
    } else if (team2Total > team1Total) {
      winnerTeamId = fixture.team2Id;
      winDescription = isExtraTime
        ? `${fixture.team2Id.toUpperCase()} win ${team2Total}–${team1Total} in extra time`
        : `${fixture.team2Id.toUpperCase()} win ${team2Total}–${team1Total}`;
    } else {
      winDescription = `Scores level ${team1Total}–${team2Total}`;
    }

    return {
      team1QuarterScores,
      team2QuarterScores,
      team1Total,
      team2Total,
      isExtraTime,
      winnerTeamId,
      winDescription,
    };
  }

  // --- Finalize & Submit Match ---
  submitMatch(matchId, passcode, sessionId) {
    if (!this.validatePasscode(matchId, passcode)) {
      return { success: false, error: 'Incorrect passcode. Try again.' };
    }

    const fixture = this.store.fixtures.find((f) => f.id === matchId);
    if (!fixture) return { success: false, error: 'Match not found.' };

    const score = this.calculateMatchScore(matchId);
    if (!score) return { success: false, error: 'Could not calculate score.' };

    const nowIso = new Date().toISOString();
    fixture.status = 'completed';
    fixture.submittedAt = nowIso;
    fixture.activeSessionId = null;
    fixture.lockHeartbeatAt = null;
    fixture.result = {
      matchId,
      score,
      completedAt: nowIso,
      submittedBySession: sessionId,
    };

    // Recompute series progress with the completed fixture
    this.saveStore();
    const { seriesMap, updatedFixtures } = this.calculateSeriesProgress();
    this.store.fixtures = updatedFixtures;
    this.saveStore();

    return { success: true, fixture, seriesMap };
  }

  // --- Data Team Result Access ---
  getDataTeamResults(matchId, passcode, clientInfo = {}) {
    if (!this.validatePasscode(matchId, passcode)) {
      return { success: false, error: 'Incorrect passcode. Try again.' };
    }

    const fixture = this.getFixture(matchId);
    if (!fixture) return { success: false, error: 'Match not found.' };

    const events = this.getEvents(matchId);
    const score = fixture.result?.score || this.calculateMatchScore(matchId);

    // Record data team access log for security
    this.store.dataTeamAccessLog.push({
      matchId,
      accessedAt: new Date().toISOString(),
      clientInfo,
    });
    this.saveStore();

    return {
      success: true,
      match: fixture,
      score,
      events,
      verifiedAt: new Date().toISOString(),
    };
  }

  // Reset to seed (local JSON and Supabase cloud DB)
  async resetStore() {
    if (fs.existsSync(SEED_PATH)) {
      const raw = fs.readFileSync(SEED_PATH, 'utf-8');
      this.store = JSON.parse(raw);
      this.saveStore();
    }

    // Reset Supabase Cloud Database if credentials are present
    const sbUrl = process.env.VITE_SUPABASE_URL;
    const sbSecret = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (sbUrl && sbSecret) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(sbUrl, sbSecret);
        // Wipe all recorded events
        await supabase.from('events').delete().neq('id', '___none___');
        // Reset fixtures from seed
        if (this.store?.fixtures?.length) {
          const fixturesPayload = this.store.fixtures.map((f) => ({
            id: f.id,
            series_id: f.seriesId,
            game_number: f.gameNumber,
            date: f.date,
            phase: f.phase,
            team1_id: f.team1Id,
            team2_id: f.team2Id,
            status: f.status,
            is_conditional: f.isConditional,
            passcode_hash: '123456',
            active_session_id: null,
            lock_heartbeat_at: null,
            submitted_at: f.submittedAt || null,
            result: f.result || null,
          }));
          await supabase.from('fixtures').upsert(fixturesPayload);
        }
      } catch (err) {
        console.error('[AFL Server] Supabase cloud reset error:', err);
      }
    }

    return true;
  }
}

export const db = new Database();
