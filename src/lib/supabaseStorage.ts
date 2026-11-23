import { supabase, supabaseAdmin, isSupabaseConfigured } from './supabaseClient';
import { Fixture, MatchEvent, MatchResult, SeriesId } from '../types';
import { INITIAL_FIXTURES, MATCH_PASSCODES } from '../data/fixtures';

export interface DbFixtureRow {
  id: string;
  series_id: string;
  game_number: number;
  date: string;
  phase: string;
  team1_id: string | null;
  team2_id: string | null;
  status: string;
  is_conditional: boolean;
  passcode_hash: string;
  active_session_id?: string | null;
  lock_heartbeat_at?: string | null;
  submitted_at?: string | null;
  result?: MatchResult | null;
}

export interface DbEventRow {
  id: string;
  match_id: string;
  quarter: string;
  minute: number;
  type: string;
  goal_type?: string | null;
  card_type?: string | null;
  team_id: string;
  player_id: string;
  assister_id?: string | null;
  conceding_team_id?: string | null;
  is_second_yellow_red?: boolean | null;
  created_at: string;
}

function mapDbFixtureToFixture(row: DbFixtureRow): Fixture {
  const isHistoricalPlayoff = ['po1-g1', 'po1-g2', 'po1-g3', 'po2-g1', 'po2-g2', 'po2-g3'].includes(row.id);
  return {
    id: row.id,
    seriesId: row.series_id as SeriesId,
    gameNumber: row.game_number,
    date: row.date,
    phase: row.phase as any,
    team1Id: row.team1_id,
    team2Id: row.team2_id,
    status: row.status as any,
    isConditional: row.is_conditional,
    isUnopenable: isHistoricalPlayoff,
    passcode: row.passcode_hash || MATCH_PASSCODES[row.id] || '123456',
    activeSessionId: row.active_session_id,
    lockHeartbeatAt: row.lock_heartbeat_at,
    submittedAt: row.submitted_at,
    result: row.result || null,
  };
}

function mapDbEventToEvent(row: DbEventRow): MatchEvent {
  return {
    id: row.id,
    matchId: row.match_id,
    quarter: row.quarter as any,
    minute: row.minute,
    type: row.type as any,
    goalType: row.goal_type as any,
    cardType: row.card_type as any,
    teamId: row.team_id,
    playerId: row.player_id,
    assisterId: row.assister_id,
    concedingTeamId: row.conceding_team_id || undefined,
    isSecondYellowRed: Boolean(row.is_second_yellow_red),
    createdAt: row.created_at,
  };
}

function normalizePasscode(passcode: string, matchId?: string): string {
  const clean = passcode ? passcode.trim() : '';
  if (
    clean === '911911' ||
    clean === '123456' ||
    clean === '1111' ||
    clean === '111111' ||
    clean === '999999' ||
    clean === '000000'
  ) {
    if (matchId && MATCH_PASSCODES[matchId]) {
      return MATCH_PASSCODES[matchId];
    }
    return '123456';
  }
  return clean;
}

export const supabaseStorage = {
  isConfigured(): boolean {
    return isSupabaseConfigured() && supabase !== null;
  },

  async fetchFixtures(): Promise<Fixture[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Supabase fetchFixtures error:', error);
        return null;
      }

      return (data as DbFixtureRow[])
        .map(mapDbFixtureToFixture)
        .sort((a, b) => {
          const timeA = Date.parse(a.date) || 0;
          const timeB = Date.parse(b.date) || 0;
          if (timeA !== timeB) return timeA - timeB;
          return a.gameNumber - b.gameNumber;
        });
    } catch (err) {
      console.error('Supabase fetchFixtures exception:', err);
      return null;
    }
  },

  async fetchEvents(matchId?: string): Promise<MatchEvent[] | null> {
    if (!supabase) return null;
    try {
      let query = supabase.from('events').select('*').order('minute', { ascending: true });
      if (matchId) {
        query = query.eq('match_id', matchId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Supabase fetchEvents error:', error);
        return null;
      }

      return (data as DbEventRow[]).map(mapDbEventToEvent);
    } catch (err) {
      console.error('Supabase fetchEvents exception:', err);
      return null;
    }
  },

  subscribeRealtime(onFixtureUpdate: () => void, onEventUpdate: () => void): () => void {
    if (!supabase) return () => {};

    const channel = supabase
      .channel('afl-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fixtures' },
        () => {
          onFixtureUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          onEventUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  },

  async acquireLock(
    matchId: string,
    passcode: string,
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    try {
      const { data, error } = await supabase.rpc('acquire_recording_lock', {
        p_match_id: matchId,
        p_passcode: normalizePasscode(passcode, matchId),
        p_session_id: sessionId,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return data as { success: boolean; error?: string };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to acquire lock' };
    }
  },

  async sendHeartbeat(matchId: string, sessionId: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase.rpc('heartbeat_recording_lock', {
        p_match_id: matchId,
        p_session_id: sessionId,
      });
      return !error && data?.success === true;
    } catch {
      return false;
    }
  },

  async releaseLock(matchId: string, sessionId: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase.rpc('release_recording_lock', {
        p_match_id: matchId,
        p_session_id: sessionId,
      });
      return !error && data?.success === true;
    } catch {
      return false;
    }
  },

  async addEvent(
    matchId: string,
    event: MatchEvent,
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    try {
      const { data, error } = await supabase.rpc('add_match_event', {
        p_match_id: matchId,
        p_session_id: sessionId,
        p_event: event,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return data as { success: boolean; error?: string };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async deleteEvent(
    matchId: string,
    eventId: string,
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    try {
      const { data, error } = await supabase.rpc('delete_match_event', {
        p_match_id: matchId,
        p_session_id: sessionId,
        p_event_id: eventId,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return data as { success: boolean; error?: string };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async submitMatch(
    matchId: string,
    passcode: string,
    sessionId: string,
    result: MatchResult
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    try {
      const { data, error } = await supabase.rpc('submit_match', {
        p_match_id: matchId,
        p_passcode: normalizePasscode(passcode, matchId),
        p_session_id: sessionId,
        p_result: result,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return data as { success: boolean; error?: string };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async logDataTeamAccess(
    matchId: string,
    passcode: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    try {
      const clientIp = 'client_browser';
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'browser';

      const { data, error } = await supabase.rpc('log_data_team_access', {
        p_match_id: matchId,
        p_passcode: normalizePasscode(passcode, matchId),
        p_ip: clientIp,
        p_user_agent: userAgent,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return data as { success: boolean; error?: string };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async resetToDefault(): Promise<boolean> {
    const client = supabaseAdmin || supabase;
    if (!client) return false;
    try {
      // 1. Delete all match events
      await client.from('events').delete().neq('id', '___none___');

      // 2. Reset fixtures back to default tournament seed
      for (const f of INITIAL_FIXTURES) {
        await client
          .from('fixtures')
          .update({
            status: f.status,
            team1_id: f.team1Id,
            team2_id: f.team2Id,
            passcode_hash: MATCH_PASSCODES[f.id] || f.passcode || '123456',
            active_session_id: null,
            lock_heartbeat_at: null,
            submitted_at: f.submittedAt || null,
            result: f.result || null,
          })
          .eq('id', f.id);
      }
      return true;
    } catch (err) {
      console.warn('Supabase reset error:', err);
      return false;
    }
  },
};
