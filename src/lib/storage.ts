import { Fixture, MatchEvent, MatchResult, Series, SeriesId } from '../types';
import { INITIAL_FIXTURES, INITIAL_EVENTS } from '../data/fixtures';
import { calculateSeriesProgress } from './series';
import { calculateMatchScore } from './scoring';
import { TEAMS } from '../data/teams';

const STORAGE_KEY_FIXTURES = 'afl_fixtures_v1';
const STORAGE_KEY_EVENTS = 'afl_events_v1';
const STORAGE_KEY_SESSIONS = 'afl_active_sessions_v1';

const LOCK_EXPIRATION_MS = 3 * 60 * 1000; // 3 minutes without heartbeat expires lock

export interface MatchSession {
  sessionId: string;
  matchId: string;
  lastHeartbeat: number;
}

export class MatchStorage {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<() => void> = new Set();

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
    if (matchId) {
      return allEvents
        .filter((e) => e.matchId === matchId)
        .sort((a, b) => a.minute - b.minute);
    }
    return allEvents;
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
    return newEvent;
  }

  public updateEvent(event: MatchEvent): void {
    const allEvents = this.getEvents();
    const idx = allEvents.findIndex((e) => e.id === event.id);
    if (idx !== -1) {
      allEvents[idx] = event;
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(allEvents));
      this.broadcast();
    }
  }

  public deleteEvent(eventId: string): void {
    const allEvents = this.getEvents();
    const filtered = allEvents.filter((e) => e.id !== eventId);
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(filtered));
    this.broadcast();
  }

  // --- Lock Acquisition & Validation ---
  public validatePasscode(matchId: string, passcode: string): boolean {
    const fixture = this.getFixtureById(matchId);
    if (!fixture) return false;
    return fixture.passcode.trim() === passcode.trim();
  }

  public acquireRecordingLock(
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
          error: 'This match is currently being recorded by someone else.',
        };
      }
    }

    // Acquire lock
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

    return { success: true };
  }

  // Reset helper for development testing
  public resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEY_FIXTURES);
    localStorage.removeItem(STORAGE_KEY_EVENTS);
    localStorage.removeItem(STORAGE_KEY_SESSIONS);
    this.broadcast();
  }
}

export const matchStorage = new MatchStorage();
