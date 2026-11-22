import { Fixture, MatchEvent, MatchScore, Series, SeriesId } from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  const data = await res.json();
  if (!res.ok && !data.error) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  return data as T;
}

export const api = {
  // Check backend availability
  async checkHealth(): Promise<boolean> {
    try {
      const res = await request<{ status: string }>('/health');
      return res.status === 'ok';
    } catch {
      return false;
    }
  },

  // Fixtures and Standings
  async getFixtures(): Promise<{ fixtures: Fixture[]; seriesMap: Record<SeriesId, Series> }> {
    return request<{ fixtures: Fixture[]; seriesMap: Record<SeriesId, Series> }>('/fixtures');
  },

  async getFixture(
    matchId: string
  ): Promise<{ fixture: Fixture; events: MatchEvent[]; score: MatchScore }> {
    return request<{ fixture: Fixture; events: MatchEvent[]; score: MatchScore }>(
      `/fixtures/${matchId}`
    );
  },

  // Auth & Passcode
  async verifyPasscode(
    matchId: string,
    passcode: string,
    role: 'recorder' | 'data_team' = 'recorder'
  ): Promise<{ success: boolean; valid?: boolean; error?: string }> {
    try {
      return await request<{ success: boolean; valid: boolean }>(
        '/auth/verify-passcode',
        {
          method: 'POST',
          body: JSON.stringify({ matchId, passcode, role }),
        }
      );
    } catch (err: any) {
      return { success: false, error: err.message || 'Passcode verification failed.' };
    }
  },

  // Match Recording Locks
  async acquireLock(
    matchId: string,
    passcode: string,
    sessionId: string
  ): Promise<{ success: boolean; fixture?: Fixture; error?: string }> {
    try {
      return await request<{ success: boolean; fixture?: Fixture; error?: string }>(
        `/fixtures/${matchId}/lock`,
        {
          method: 'POST',
          body: JSON.stringify({ passcode, sessionId }),
        }
      );
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to acquire lock.' };
    }
  },

  async sendHeartbeat(matchId: string, sessionId: string): Promise<boolean> {
    try {
      const res = await request<{ success: boolean }>(`/fixtures/${matchId}/heartbeat`, {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      });
      return res.success;
    } catch {
      return false;
    }
  },

  async releaseLock(matchId: string, sessionId: string): Promise<boolean> {
    try {
      const res = await request<{ success: boolean }>(`/fixtures/${matchId}/unlock`, {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      });
      return res.success;
    } catch {
      return false;
    }
  },

  // Events CRUD
  async getEvents(
    matchId: string
  ): Promise<{ success: boolean; events: MatchEvent[]; score: MatchScore }> {
    return request<{ success: boolean; events: MatchEvent[]; score: MatchScore }>(
      `/fixtures/${matchId}/events`
    );
  },

  async addEvent(
    matchId: string,
    event: MatchEvent,
    sessionId: string
  ): Promise<{ success: boolean; event?: MatchEvent; score?: MatchScore; error?: string }> {
    try {
      return await request<{ success: boolean; event: MatchEvent; score: MatchScore }>(
        `/fixtures/${matchId}/events`,
        {
          method: 'POST',
          body: JSON.stringify({ event, sessionId }),
        }
      );
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to add event.' };
    }
  },

  async updateEvent(
    matchId: string,
    eventId: string,
    event: MatchEvent,
    sessionId: string
  ): Promise<{ success: boolean; event?: MatchEvent; score?: MatchScore; error?: string }> {
    try {
      return await request<{ success: boolean; event: MatchEvent; score: MatchScore }>(
        `/fixtures/${matchId}/events/${eventId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ event, sessionId }),
        }
      );
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update event.' };
    }
  },

  async deleteEvent(
    matchId: string,
    eventId: string,
    sessionId: string
  ): Promise<{ success: boolean; score?: MatchScore; error?: string }> {
    try {
      return await request<{ success: boolean; score: MatchScore }>(
        `/fixtures/${matchId}/events/${eventId}`,
        {
          method: 'DELETE',
          body: JSON.stringify({ sessionId }),
        }
      );
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete event.' };
    }
  },

  // Finalize & Submit Match
  async submitMatch(
    matchId: string,
    passcode: string,
    sessionId: string
  ): Promise<{ success: boolean; fixture?: Fixture; seriesMap?: Record<SeriesId, Series>; error?: string }> {
    try {
      return await request<{ success: boolean; fixture: Fixture; seriesMap: Record<SeriesId, Series>; error?: string }>(
        `/fixtures/${matchId}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({ passcode, sessionId }),
        }
      );
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to submit match.' };
    }
  },

  // Secure Data Team Access
  async getDataTeamResults(
    matchId: string,
    passcode: string
  ): Promise<{
    success: boolean;
    match?: Fixture;
    score?: MatchScore;
    events?: MatchEvent[];
    verifiedAt?: string;
    error?: string;
  }> {
    try {
      return await request<{
        success: boolean;
        match?: Fixture;
        score?: MatchScore;
        events?: MatchEvent[];
        verifiedAt?: string;
        error?: string;
      }>(`/results/${matchId}`, {
        method: 'POST',
        body: JSON.stringify({ passcode }),
      });
    } catch (err: any) {
      return { success: false, error: err.message || 'Access denied or server error.' };
    }
  },

  // Reset store
  async resetDemo(): Promise<void> {
    await request('/reset', { method: 'POST' });
  },
};
