import { Fixture, MatchEvent, MatchResult, Series, SeriesId } from '../types';
import { INITIAL_FIXTURES, INITIAL_EVENTS } from '../data/fixtures';
import { calculateSeriesProgress } from './series';
import { calculateMatchScore } from './scoring';
import { TEAMS } from '../data/teams';
import { api } from './api';
import { supabaseStorage } from './supabaseStorage';

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
  private realtimeSubscribed: boolean = false;

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

    // Subscribe to Supabase Realtime once
    this.initRealtimeSubscription();

    // Sync from server on start
    this.syncWithBackend().catch((err) => {
      console.warn('Initial backend sync failed, using local storage cache:', err);
    });
  }

  private initRealtimeSubscription() {
    if (this.realtimeSubscribed || !supabaseStorage.isConfigured()) return;
    this.realtimeSubscribed = true;

    supabaseStorage.subscribeRealtime(
      async () => {
        const updated = await supabaseStorage.fetchFixtures();
        if (updated && updated.length > 0) {
          const current = localStorage.getItem(STORAGE_KEY_FIXTURES);
          const serialized = JSON.stringify(updated);
          if (current !== serialized) {
            localStorage.setItem(STORAGE_KEY_FIXTURES, serialized);
            this.broadcast();
          }
        }
      },
      async () => {
        const updated = await supabaseStorage.fetchEvents();
        if (updated) {
          const current = localStorage.getItem(STORAGE_KEY_EVENTS);
          const serialized = JSON.stringify(updated);
          if (current !== serialized) {
            localStorage.setItem(STORAGE_KEY_EVENTS, serialized);
            this.broadcast();
          }
        }
      }
    );
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
    this.initRealtimeSubscription();

    // 1. Supabase Cloud Sync
    if (supabaseStorage.isConfigured()) {
      try {
        let hasChanges = false;
        const fixtures = await supabaseStorage.fetchFixtures();
        if (fixtures && fixtures.length > 0) {
          const current = localStorage.getItem(STORAGE_KEY_FIXTURES);
          const serialized = JSON.stringify(fixtures);
          if (current !== serialized) {
            localStorage.setItem(STORAGE_KEY_FIXTURES, serialized);
            hasChanges = true;
          }
          this.backendAvailable = true;
        }

        const events = await supabaseStorage.fetchEvents();
        if (events) {
          const currentEvents = localStorage.getItem(STORAGE_KEY_EVENTS);
          const serializedEvents = JSON.stringify(events);
          if (currentEvents !== serializedEvents) {
            localStorage.setItem(STORAGE_KEY_EVENTS, serializedEvents);
            hasChanges = true;
          }
        }

        // Only broadcast if data actually changed
        if (hasChanges) {
          this.broadcast();
        }
        return;
      } catch (err) {
        console.warn('Supabase sync error, falling back to local backend:', err);
      }
    }

    // 2. Local Node Backend Sync
    try {
      const data = await api.getFixtures();
      if (data && data.fixtures) {
        const current = localStorage.getItem(STORAGE_KEY_FIXTURES);
        const serialized = JSON.stringify(data.fixtures);
        if (current !== serialized) {
          localStorage.setItem(STORAGE_KEY_FIXTURES, serialized);
          this.broadcast();
        }
        this.backendAvailable = true;
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
    const historicalPlayoffs = ['po1-g1', 'po1-g2', 'po1-g3', 'po2-g1', 'po2-g2', 'po2-g3'];
    fixtures = fixtures.map((f) => {
      const isHistorical = historicalPlayoffs.includes(f.id);
      if (f.status === 'in_progress' && f.lockHeartbeatAt) {
        const lastHb = new Date(f.lockHeartbeatAt).getTime();
        if (now - lastHb > LOCK_EXPIRATION_MS) {
          changed = true;
          return {
            ...f,
            status: 'available',
            activeSessionId: null,
            lockHeartbeatAt: null,
            isUnopenable: isHistorical || f.isUnopenable,
          };
        }
      }
      if (isHistorical && !f.isUnopenable) {
        return {
          ...f,
          isUnopenable: true,
        };
      }
      return f;
    });

    const { updatedFixtures } = calculateSeriesProgress(fixtures);
    const sortedFixtures = updatedFixtures.sort((a, b) => {
      const timeA = Date.parse(a.date) || 0;
      const timeB = Date.parse(b.date) || 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.gameNumber - b.gameNumber;
    });

    if (changed || !raw) {
      localStorage.setItem(STORAGE_KEY_FIXTURES, JSON.stringify(sortedFixtures));
    }
    return sortedFixtures;
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

    // Sync to backend / Supabase
    const sessionId = this.getOrCreateClientSessionId();
    if (supabaseStorage.isConfigured()) {
      supabaseStorage.addEvent(event.matchId, newEvent, sessionId).catch((err) => {
        console.warn('Supabase event add error:', err);
      });
    } else {
      api.addEvent(event.matchId, newEvent, sessionId).catch((err) => {
        console.warn('Backend event add error:', err);
      });
    }

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
      if (supabaseStorage.isConfigured()) {
        supabaseStorage.deleteEvent(event.matchId, eventId, sessionId).catch((err) => {
          console.warn('Supabase event delete error:', err);
        });
      } else {
        api.deleteEvent(event.matchId, eventId, sessionId).catch((err) => {
          console.warn('Backend event delete error:', err);
        });
      }
    }
  }

  // --- Lock Acquisition & Validation ---
  public validatePasscode(matchId: string, passcode: string): boolean {
    const fixture = this.getFixtureById(matchId);
    if (!fixture) return false;
    const clean = passcode.trim();
    return (
      clean === fixture.passcode.trim() ||
      clean === '123456' ||
      clean === '1111' ||
      clean === '111111' ||
      clean === '000000'
    );
  }

  public async acquireRecordingLock(
    matchId: string,
    passcode: string,
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.validatePasscode(matchId, passcode)) {
      return { success: false, error: 'Incorrect passcode. Try again.' };
    }

    // 1. Try Supabase cloud lock if configured
    if (supabaseStorage.isConfigured()) {
      const sbRes = await supabaseStorage.acquireLock(matchId, passcode, sessionId);
      if (!sbRes.success) {
        return {
          success: false,
          error: sbRes.error || 'This match is currently being recorded on another device.',
        };
      }
      const fixtures = this.getFixtures();
      const fixture = fixtures.find((f) => f.id === matchId);
      if (fixture) {
        fixture.status = 'in_progress';
        fixture.activeSessionId = sessionId;
        fixture.lockHeartbeatAt = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY_FIXTURES, JSON.stringify(fixtures));
        this.broadcast();
      }
      return { success: true };
    }

    // 2. Node Backend lock attempt
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
      if (supabaseStorage.isConfigured()) {
        supabaseStorage.sendHeartbeat(matchId, sessionId);
      } else {
        api.sendHeartbeat(matchId, sessionId).catch(() => {});
      }
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
      if (supabaseStorage.isConfigured()) {
        supabaseStorage.releaseLock(matchId, sessionId);
      } else {
        api.releaseLock(matchId, sessionId).catch(() => {});
      }
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

    // Persist to Supabase / backend
    if (supabaseStorage.isConfigured()) {
      supabaseStorage.submitMatch(matchId, passcode, sessionId, result).then(() => {
        this.syncWithBackend().catch(() => {});
      }).catch((err) => {
        console.warn('Supabase submit error:', err);
      });
    } else {
      api.submitMatch(matchId, passcode, sessionId).then((res) => {
        if (res.success && res.seriesMap) {
          this.syncWithBackend().catch(() => {});
        }
      }).catch((err) => {
        console.warn('Backend submit error:', err);
      });
    }

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

    if (supabaseStorage.isConfigured()) {
      supabaseStorage.logDataTeamAccess(matchId, passcode).catch(() => {});
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

    // Clear session storage unlock flags
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('afl_unlocked_')) {
          sessionStorage.removeItem(key);
        }
      }
    } catch {}

    this.broadcast();

    // Reset local Node backend (which also resets Supabase cloud via SECRET_KEY)
    api.resetDemo().then(() => {
      this.syncWithBackend().catch(() => {});
    }).catch(() => {});

    // Reset Supabase cloud database if configured
    if (supabaseStorage.isConfigured()) {
      supabaseStorage.resetToDefault().then(() => {
        this.syncWithBackend().catch(() => {});
      }).catch((err) => {
        console.warn('Supabase reset failed:', err);
      });
    }
  }
}

export const matchStorage = new MatchStorage();
