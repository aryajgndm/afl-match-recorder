-- ==========================================================
-- AFL POSTSEASON MATCH RECORDER: SUPABASE PRODUCTION SCHEMA
-- ==========================================================
-- Complete schema for PostgreSQL / Supabase with Row Level Security,
-- Realtime Subscriptions, Concurrency Locks, and Seed Data.

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. TEAMS TABLE
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PLAYERS TABLE
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  name TEXT NOT NULL,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  result JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
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

-- 5. AUDIT LOGS TABLE (Data Team Access & Recorder Actions)
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  role TEXT NOT NULL,
  client_ip TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Read policies: public read for viewing results and schedule
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read players" ON players FOR SELECT USING (true);
CREATE POLICY "Public read fixtures" ON fixtures FOR SELECT USING (true);
CREATE POLICY "Public read events" ON events FOR SELECT USING (true);
CREATE POLICY "Public read audit_logs" ON audit_logs FOR SELECT USING (true);

-- Allow authenticated or anon access via verified RPCs
CREATE POLICY "Anon insert audit_logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- ==========================================================
-- REALTIME CONFIGURATION
-- ==========================================================
-- Enables Supabase Realtime notifications on fixture status & events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'fixtures'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE fixtures;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE events;
  END IF;
END $$;

-- ==========================================================
-- SECURE DATABASE FUNCTIONS (RPC)
-- ==========================================================

-- 1. Acquire Recording Lock
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

  -- Check existing active lock (expired after 3 minutes of no heartbeat)
  IF v_fixture.status = 'in_progress' AND v_fixture.active_session_id IS NOT NULL AND v_fixture.active_session_id != p_session_id THEN
    IF v_fixture.lock_heartbeat_at IS NOT NULL AND (v_now - v_fixture.lock_heartbeat_at) < INTERVAL '3 minutes' THEN
      RETURN jsonb_build_object('success', false, 'error', 'This match is currently being recorded by someone else.');
    END IF;
  END IF;

  -- Acquire or renew lock
  UPDATE fixtures
  SET status = 'in_progress',
      active_session_id = p_session_id,
      lock_heartbeat_at = v_now,
      updated_at = v_now
  WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2. Heartbeat Lock
CREATE OR REPLACE FUNCTION heartbeat_recording_lock(
  p_match_id TEXT,
  p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fixture RECORD;
BEGIN
  SELECT * INTO v_fixture FROM fixtures WHERE id = p_match_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found');
  END IF;

  IF v_fixture.status != 'in_progress' OR v_fixture.active_session_id != p_session_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session does not hold active recording lock');
  END IF;

  UPDATE fixtures
  SET lock_heartbeat_at = NOW(),
      updated_at = NOW()
  WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Release Lock
CREATE OR REPLACE FUNCTION release_recording_lock(
  p_match_id TEXT,
  p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE fixtures
  SET status = 'available',
      active_session_id = NULL,
      lock_heartbeat_at = NULL,
      updated_at = NOW()
  WHERE id = p_match_id AND active_session_id = p_session_id AND status != 'completed';

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. Add Match Event
CREATE OR REPLACE FUNCTION add_match_event(
  p_match_id TEXT,
  p_session_id TEXT,
  p_event JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fixture RECORD;
  v_event_id TEXT;
BEGIN
  SELECT * INTO v_fixture FROM fixtures WHERE id = p_match_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found');
  END IF;

  IF v_fixture.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot add events to a completed match');
  END IF;

  IF v_fixture.active_session_id IS NOT NULL AND v_fixture.active_session_id != p_session_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session does not hold active recording lock');
  END IF;

  v_event_id := COALESCE(p_event->>'id', 'ev_' || gen_random_uuid());

  INSERT INTO events (
    id,
    match_id,
    quarter,
    minute,
    type,
    goal_type,
    card_type,
    team_id,
    player_id,
    assister_id,
    conceding_team_id,
    is_second_yellow_red,
    created_at
  ) VALUES (
    v_event_id,
    p_match_id,
    p_event->>'quarter',
    (p_event->>'minute')::INTEGER,
    p_event->>'type',
    p_event->>'goalType',
    p_event->>'cardType',
    p_event->>'teamId',
    p_event->>'playerId',
    p_event->>'assisterId',
    p_event->>'concedingTeamId',
    COALESCE((p_event->>'isSecondYellowRed')::BOOLEAN, FALSE),
    NOW()
  );

  RETURN jsonb_build_object('success', true, 'eventId', v_event_id);
END;
$$;

-- 5. Delete Match Event
CREATE OR REPLACE FUNCTION delete_match_event(
  p_match_id TEXT,
  p_session_id TEXT,
  p_event_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fixture RECORD;
BEGIN
  SELECT * INTO v_fixture FROM fixtures WHERE id = p_match_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found');
  END IF;

  IF v_fixture.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot modify events of a completed match');
  END IF;

  IF v_fixture.active_session_id IS NOT NULL AND v_fixture.active_session_id != p_session_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session does not hold active recording lock');
  END IF;

  DELETE FROM events WHERE id = p_event_id AND match_id = p_match_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. Submit and Finalize Match
CREATE OR REPLACE FUNCTION submit_match(
  p_match_id TEXT,
  p_passcode TEXT,
  p_session_id TEXT,
  p_result JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fixture RECORD;
BEGIN
  SELECT * INTO v_fixture FROM fixtures WHERE id = p_match_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found');
  END IF;

  IF v_fixture.passcode_hash != crypt(p_passcode, v_fixture.passcode_hash) AND v_fixture.passcode_hash != p_passcode THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incorrect passcode. Verification required to submit.');
  END IF;

  UPDATE fixtures
  SET status = 'completed',
      active_session_id = NULL,
      lock_heartbeat_at = NULL,
      submitted_at = NOW(),
      result = p_result,
      updated_at = NOW()
  WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. Log Data Team Access
CREATE OR REPLACE FUNCTION log_data_team_access(
  p_match_id TEXT,
  p_passcode TEXT,
  p_ip TEXT,
  p_user_agent TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fixture RECORD;
BEGIN
  SELECT * INTO v_fixture FROM fixtures WHERE id = p_match_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found');
  END IF;

  IF v_fixture.passcode_hash != crypt(p_passcode, v_fixture.passcode_hash) AND v_fixture.passcode_hash != p_passcode THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incorrect passcode.');
  END IF;

  INSERT INTO audit_logs (match_id, action, role, client_ip, user_agent, metadata)
  VALUES (p_match_id, 'DATA_TEAM_VERIFY', 'data_team', p_ip, p_user_agent, jsonb_build_object('timestamp', NOW()));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ==========================================================
-- SEED DATA (Teams & Initial Postseason Fixtures)
-- ==========================================================

INSERT INTO teams (id, name, short_name, logo_url) VALUES
('panthers', 'Panthers', 'PAN', './logos/panthers.png'),
('bulls', 'Bulls', 'BUL', './logos/bulls.png'),
('grizzlies', 'Grizzlies', 'GRI', './logos/grizzlies.png'),
('stallions', 'Stallions', 'STA', './logos/stallions.png'),
('falcons', 'Falcons', 'FAL', './logos/falcons.png'),
('raptors', 'Raptors', 'RAP', './logos/raptors.png')
ON CONFLICT (id) DO NOTHING;

-- Initial Playoffs Fixture Seeds (Passcode: 1111)
INSERT INTO fixtures (id, series_id, game_number, date, phase, team1_id, team2_id, status, is_conditional, passcode_hash) VALUES
('po1-g1', 'po1', 1, 'Nov 18, 2026', 'playoffs', 'bulls', 'falcons', 'available', false, '1111'),
('po1-g2', 'po1', 2, 'Nov 19, 2026', 'playoffs', 'falcons', 'bulls', 'locked', false, '1111'),
('po1-g3', 'po1', 3, 'Nov 20, 2026', 'playoffs', 'bulls', 'falcons', 'locked', true, '1111'),
('po2-g1', 'po2', 1, 'Nov 18, 2026', 'playoffs', 'grizzlies', 'panthers', 'available', false, '1111'),
('po2-g2', 'po2', 2, 'Nov 19, 2026', 'playoffs', 'panthers', 'grizzlies', 'locked', false, '1111'),
('po2-g3', 'po2', 3, 'Nov 20, 2026', 'playoffs', 'grizzlies', 'panthers', 'locked', true, '1111'),
('sf1-g1', 'sf1', 1, 'Nov 22, 2026', 'semifinals', 'stallions', NULL, 'locked', false, '1111'),
('sf1-g2', 'sf1', 2, 'Nov 23, 2026', 'semifinals', NULL, 'stallions', 'locked', false, '1111'),
('sf1-g3', 'sf1', 3, 'Nov 24, 2026', 'semifinals', 'stallions', NULL, 'locked', true, '1111'),
('sf2-g1', 'sf2', 1, 'Nov 22, 2026', 'semifinals', 'raptors', NULL, 'locked', false, '1111'),
('sf2-g2', 'sf2', 2, 'Nov 23, 2026', 'semifinals', NULL, 'raptors', 'locked', false, '1111'),
('sf2-g3', 'sf2', 3, 'Nov 24, 2026', 'semifinals', 'raptors', NULL, 'locked', true, '1111'),
('fn-g1', 'finals', 1, 'Nov 26, 2026', 'finals', NULL, NULL, 'locked', false, '1111'),
('fn-g2', 'finals', 2, 'Nov 27, 2026', 'finals', NULL, NULL, 'locked', false, '1111'),
('fn-g3', 'finals', 3, 'Nov 28, 2026', 'finals', NULL, NULL, 'locked', true, '1111')
ON CONFLICT (id) DO NOTHING;
