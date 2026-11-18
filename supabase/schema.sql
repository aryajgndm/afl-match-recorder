-- ==========================================================
-- AFL POSTSEASON MATCH RECORDER: SUPABASE PRODUCTION SCHEMA
-- ==========================================================

-- Enable pgcrypto for secure hashing if needed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. TEAMS TABLE
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  logo_url TEXT NOT NULL
);

-- 2. PLAYERS TABLE
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  name TEXT NOT NULL,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE
);

-- 3. FIXTURES TABLE
CREATE TABLE IF NOT EXISTS fixtures (
  id TEXT PRIMARY KEY,
  series_id TEXT NOT NULL,
  game_number INTEGER NOT NULL,
  date TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('playoffs', 'semifinals', 'finals')),
  team1_id TEXT REFERENCES teams(id),
  team2_id TEXT REFERENCES teams(id),
  status TEXT NOT NULL CHECK (status IN ('available', 'in_progress', 'completed', 'locked', 'not_required')),
  is_conditional BOOLEAN NOT NULL DEFAULT FALSE,
  passcode_hash TEXT NOT NULL,
  active_session_id TEXT,
  lock_heartbeat_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  result JSONB
);

-- 4. EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  quarter TEXT NOT NULL CHECK (quarter IN ('q1', 'q2', 'q3', 'q4', 'et')),
  minute INTEGER NOT NULL CHECK (minute >= 0 AND minute <= 100),
  type TEXT NOT NULL CHECK (type IN ('goal', 'card')),
  goal_type TEXT CHECK (goal_type IN ('regular', 'penalty', 'own_goal')),
  card_type TEXT CHECK (card_type IN ('yellow', 'red')),
  team_id TEXT NOT NULL REFERENCES teams(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  assister_id TEXT REFERENCES players(id),
  conceding_team_id TEXT REFERENCES teams(id),
  is_second_yellow_red BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Read policies: public read for viewing results and schedule
CREATE POLICY "Public can view teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public can view players" ON players FOR SELECT USING (true);
CREATE POLICY "Public can view fixtures" ON fixtures FOR SELECT USING (true);
CREATE POLICY "Public can view match events" ON events FOR SELECT USING (true);

-- ==========================================================
-- SECURE DATABASE FUNCTIONS (RPC)
-- ==========================================================

-- Function to acquire match recording lock
CREATE OR REPLACE FUNCTION acquire_recording_lock(
  p_match_id TEXT,
  p_passcode TEXT,
  p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fixture RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_fixture FROM fixtures WHERE id = p_match_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found');
  END IF;

  IF v_fixture.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match is already completed and permanently locked');
  END IF;

  IF v_fixture.passcode_hash != crypt(p_passcode, v_fixture.passcode_hash) AND v_fixture.passcode_hash != p_passcode THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incorrect passcode. Try again.');
  END IF;

  -- Check existing active lock
  IF v_fixture.status = 'in_progress' AND v_fixture.active_session_id IS NOT NULL AND v_fixture.active_session_id != p_session_id THEN
    IF v_fixture.lock_heartbeat_at IS NOT NULL AND (v_now - v_fixture.lock_heartbeat_at) < INTERVAL '3 minutes' THEN
      RETURN jsonb_build_object('success', false, 'error', 'This match is currently being recorded by someone else.');
    END IF;
  END IF;

  -- Acquire or renew lock
  UPDATE fixtures
  SET status = 'in_progress',
      active_session_id = p_session_id,
      lock_heartbeat_at = v_now
  WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
