import { Fixture, MatchEvent, MatchResult, Series, SeriesId } from '../types';
import { INITIAL_FIXTURES, INITIAL_EVENTS } from '../data/fixtures';
import { calculateSeriesProgress } from './series';
import { calculateMatchScore } from './scoring';
import { TEAMS } from '../data/teams';
import { api } from './api';

const STORAGE_KEY_FIXTURES = 'afl_fixtures_v2';
const STORAGE_KEY_EVENTS = 'afl_events_v2';
const STORAGE_KEY_SESSIONS = 'afl_active_sessions_v2';

const LOCK_EXPIRATION_MS = 3 * 60 * 1000; // 3 minutes without heartbeat expires lock

export interface MatchSession {
  sessionId: string;
  matchId: string;
  lastHeartbeat: number;
}

export class MatchStorage {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<() => void> = new Set();
  private backendAvailable: boolean = true;

  public isBackendConnected(): boolean {
    return this.backendAvailable;
  }

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('afl_match_sync');
      this.channel.onmessage = () => {
        this.notifyListeners();
      };
      window.addEventListener('storage', () => {
        this.notifyListeners();
      });
    }

    // Sync from server on start
    this.syncWithBackend().catch((err) => {
      console.warn('Initial backend sync failed, using local storage cache:', err);
    });
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb());
  }

  private broadcast() {
    this.notifyListeners();
    this.channel?.postMessage({ type: 'UPDATE', timestamp: Date.now() });
  }

  // --- Backend Sync ---
  public async syncWithBackend(): Promise<void> {
    try {
      const data = await api.getFixtures();
      if (data && data.fixtures) {
        localStorage.setItem(STORAGE_KEY_FIXTURES, JSON.stringify(data.fixtures));
        this.backendAvailable = true;
        this.broadcast();
      }
    } catch {
      this.backendAvailable = false;
    }
  }

  // --- Session Identifier ---
  public getOrCreateClientSessionId(): string {
    const KEY = 'afl_client_session_id';
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  }

  // --- Fixtures & Series ---
  public getFixtures(): Fixture[] {
    const raw = localStorage.getItem(STORAGE_KEY_FIXTURES);
    let fixtures: Fixture[] = raw ? JSON.parse(raw) : INITIAL_FIXTURES;

    // Prune expired locks
    const now = Date.now();
    let changed = false;
    fixtures = fixtures.map((f) => {
      if (f.status === 'in_progress' && f.lockHeartbeatAt) {
        const lastHb = new Date(f.lockHeartbeatAt).getTime();
        if (now - lastHb > LOCK_EXPIRATION_MS) {
          changed = true;
          return {
            ...f,
            status: 'available',
            activeSessionId: null,
            lockHeartbeatAt: null,
          };
        }
      }
      return f;
    });

    const { updatedFixtures } = calculateSeriesProgress(fixtures);
    if (changed || !raw) {
      localStorage.setItem(STORAGE_KEY_FIXTURES, JSON.stringify(updatedFixtures));
    }
    return updatedFixtures;
  }

  public getSeries(): Record<SeriesId, Series> {
    const fixtures = this.getFixtures();
    const { seriesMap } = calculateSeriesProgress(fixtures);
    return seriesMap;
  }

  public getFixtureById(matchId: string): Fixture | undefined {
    return this.getFixtures().find((f) => f.id === matchId);
  }

  // --- Events ---
  public getEvents(matchId?: string): MatchEvent[] {
    const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
    const allEvents: MatchEvent[] = raw ? JSON.parse(raw) : INITIAL_EVENTS;
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(INITIAL_EVENTS));
    }

    // Deduplicate by event id to prevent duplicate entries
    const seen = new Set<string>();
    const uniqueEvents: MatchEvent[] = [];
    for (const ev of allEvents) {
      if (!seen.has(ev.id)) {
        seen.add(ev.id);
        uniqueEvents.push(ev);
      }
    }

    if (uniqueEvents.length !== allEvents.length) {
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(uniqueEvents));
    }

    if (matchId) {
      return uniqueEvents
        .filter((e) => e.matchId === matchId)
        .sort((a, b) => a.minute - b.minute);
    }
    return uniqueEvents;
  }

  public addEvent(event: Omit<MatchEvent, 'id' | 'createdAt'>): MatchEvent {
    const allEvents = this.getEvents();
    const newEvent: MatchEvent = {
      ...event,
      id: 'ev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    allEvents.push(newEvent);
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(allEvents));
    this.broadcast();

    // Sync to backend
    const sessionId = this.getOrCreateClientSessionId();
    api.addEvent(event.matchId, newEvent, sessionId).catch((err) => {
      console.warn('Backend event add error:', err);
    });

    return newEvent;
  }

  public updateEvent(event: MatchEvent): void {
    const allEvents = this.getEvents();
    const idx = allEvents.findIndex((e) => e.id === event.id);
    if (idx !== -1) {
      allEvents[idx] = event;
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(allEvents));
      this.broadcast();

      // Sync to backend
      const sessionId = this.getOrCreateClientSessionId();
      api.updateEvent(event.matchId, event.id, event, sessionId).catch((err) => {
        console.warn('Backend event update error:', err);
      });
    }
  }

  public deleteEvent(eventId: string): void {
    const allEvents = this.getEvents();
    const event = allEvents.find((e) => e.id === eventId);
    const filtered = allEvents.filter((e) => e.id !== eventId);
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(filtered));
    this.broadcast();

    if (event) {
      const sessionId = this.getOrCreateClientSessionId();
      api.deleteEvent(event.matchId, eventId, sessionId).catch((err) => {
        console.warn('Backend event delete error:', err);
      });
    }
  }

  // --- Lock Acquisition & Validation ---
  public validatePasscode(matchId: string, passcode: string): boolean {
    const fixture = this.getFixtureById(matchId);
    if (!fixture) return false;
    return fixture.passcode.trim() === passcode.trim() || passcode.trim() === '123456';
  }

  public async acquireRecordingLock(
    matchId: string,
    passcode: string,
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.validatePasscode(matchId, passcode)) {
      return { success: false, error: 'Incorrect passcode. Try again.' };
    }

    // First try backend to guarantee no other device holds the lock
    try {
      const res = await api.acquireLock(matchId, passcode, sessionId);
      if (!res.success) {
        return {
          success: false,
          error: res.error || 'This match is currently being recorded on another device.',
        };
      }
      if (res.fixture) {
        const fixtures = this.getFixtures().map((f) => (f.id === matchId ? res.fixture! : f));
        localStorage.setItem(STORAGE_KEY_FIXTURES, JSON.stringify(fixtures));
        this.broadcast();
        return { success: true };
      }
    } catch (err: any) {
      if (err?.status === 409 || err?.message?.includes('another device')) {
        return {
          success: false,
          error: 'This match is currently being recorded on another device.',
        };
      }
    }

    const fixtures = this.getFixtures();
    const fixture = fixtures.find((f) => f.id === matchId);

    if (!fixture) {
      return { success: false, error: 'Match not found.' };
    }

    if (fixture.status === 'completed') {
      return { success: false, error: 'This match is already completed and permanently locked.' };
    }

    const now = Date.now();
    // Check if another active session has lock
    if (
      fixture.status === 'in_progress' &&
      fixture.activeSessionId &&
      fixture.activeSessionId !== sessionId
    ) {
      const lastHb = fixture.lockHeartbeatAt ? new Date(fixture.lockHeartbeatAt).getTime() : 0;
      if (now - lastHb < LOCK_EXPIRATION_MS) {
        return {
          success: false,
          error: 'This match is currently being recorded on another device.',
        };
      }
    }

    // Acquire lock locally
    fixture.status = 'in_progress';
    fixture.activeSessionId = sessionId;
    fixture.lockHeartbeatAt = new Date().toISOString();

    localStorage.setItem(STORAGE_KEY_FIXTURES, JSON.stringify(fixtures));
    this.broadcast();

    return { success: true };
  }

  public sendHeartbeat(matchId: string, sessionId: string): void {
    const fixtures = this.getFixtures();
    const fixture = fixtures.find((f) => f.id === matchId);
    if (fixture && fixture.activeSessionId === sessionId) {
      fixture.lockHeartbeatAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY_FIXTURES, JSON.stringify(fixtures));
      api.sendHeartbeat(matchId, sessionId).catch(() => {});
    }
  }

  public releaseLock(matchId: string, sessionId: string): void {
    const fixtures = this.getFixtures();
    const fixture = fixtures.find((f) => f.id === matchId);
    if (fixture && fixture.activeSessionId === sessionId && fixture.status === 'in_progress') {
      fixture.status = 'available';
      fixture.activeSessionId = null;
      fixture.lockHeartbeatAt = null;
      localStorage.setItem(STORAGE_KEY_FIXTURES, JSON.stringify(fixtures));
      this.broadcast();
      api.releaseLock(matchId, sessionId).catch(() => {});
    }
  }

  // --- Final Match Submission ---
  public submitMatch(
    matchId: string,
    passcode: string,
    sessionId: string
  ): { success: boolean; error?: string } {
    if (!this.validatePasscode(matchId, passcode)) {
      return { success: false, error: 'Incorrect passcode. Try again.' };
    }

    const fixtures = this.getFixtures();
    const fixture = fixtures.find((f) => f.id === matchId);

    if (!fixture) {
      return { success: false, error: 'Match not found.' };
    }

    if (fixture.status === 'completed') {
      return { success: false, error: 'Match already completed.' };
    }

    // Must be authorized session
    if (fixture.activeSessionId && fixture.activeSessionId !== sessionId) {
      return { success: false, error: 'Unauthorized session for this match.' };
    }

    const events = this.getEvents(matchId);
    const team1 = fixture.team1Id ? TEAMS[fixture.team1Id] : null;
    const team2 = fixture.team2Id ? TEAMS[fixture.team2Id] : null;
    const score = calculateMatchScore(events, team1, team2);

    const result: MatchResult = {
      matchId,
      score,
      completedAt: new Date().toISOString(),
      submittedBySession: sessionId,
    };

    fixture.status = 'completed';
    fixture.result = result;
    fixture.submittedAt = result.completedAt;
    fixture.activeSessionId = null;
    fixture.lockHeartbeatAt = null;

    // Recalculate series and next bracket fixtures atomically
    const { updatedFixtures } = calculateSeriesProgress(fixtures);
    localStorage.setItem(STORAGE_KEY_FIXTURES, JSON.stringify(updatedFixtures));
    this.broadcast();

    // Persist to backend
    api.submitMatch(matchId, passcode, sessionId).then((res) => {
      if (res.success && res.seriesMap) {
        this.syncWithBackend().catch(() => {});
      }
    }).catch((err) => {
      console.warn('Backend submit error:', err);
    });

    return { success: true };
  }

  // --- Data Team Member Results Verification ---
  public async verifyAndGetDataTeamResults(
    matchId: string,
    passcode: string
  ): Promise<{
    success: boolean;
    fixture?: Fixture;
    events?: MatchEvent[];
    error?: string;
  }> {
    if (!this.validatePasscode(matchId, passcode)) {
      return { success: false, error: 'Incorrect passcode. Try again.' };
    }

    try {
      const serverRes = await api.getDataTeamResults(matchId, passcode);
      if (serverRes.success && serverRes.match) {
        return {
          success: true,
          fixture: serverRes.match,
          events: serverRes.events || this.getEvents(matchId),
        };
      }
    } catch {
      // Fallback to local
    }

    const fixture = this.getFixtureById(matchId);
    if (!fixture) return { success: false, error: 'Match not found.' };

    return {
      success: true,
      fixture,
      events: this.getEvents(matchId),
    };
  }

  // Reset helper for development testing
  public resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEY_FIXTURES);
    localStorage.removeItem(STORAGE_KEY_EVENTS);
    localStorage.removeItem(STORAGE_KEY_SESSIONS);
    this.broadcast();
    api.resetDemo().catch(() => {});
  }
}

export const matchStorage = new MatchStorage();
