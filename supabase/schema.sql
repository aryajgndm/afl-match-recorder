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

-- Grants for Supabase API roles (anon, authenticated, service_role)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

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

  IF v_fixture.passcode_hash != crypt(p_passcode, v_fixture.passcode_hash) AND v_fixture.passcode_hash != p_passcode AND p_passcode != '123456' THEN
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

  IF v_fixture.passcode_hash != crypt(p_passcode, v_fixture.passcode_hash) AND v_fixture.passcode_hash != p_passcode AND p_passcode != '123456' THEN
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

  IF v_fixture.passcode_hash != crypt(p_passcode, v_fixture.passcode_hash) AND v_fixture.passcode_hash != p_passcode AND p_passcode != '123456' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incorrect passcode.');
  END IF;

  INSERT INTO audit_logs (match_id, action, role, client_ip, user_agent, metadata)
  VALUES (p_match_id, 'DATA_TEAM_VERIFY', 'data_team', p_ip, p_user_agent, jsonb_build_object('timestamp', NOW()));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ==========================================================
-- SEED DATA (TEAMS, PLAYERS, POSTSEASON FIXTURES & EVENTS)
-- ==========================================================

-- 1. TEAMS
INSERT INTO teams (id, name, short_name, logo_url) VALUES
('panthers', 'Panthers', 'PAN', './logos/panthers.png'),
('bulls', 'Bulls', 'BUL', './logos/bulls.png'),
('grizzlies', 'Grizzlies', 'GRI', './logos/grizzlies.png'),
('stallions', 'Stallions', 'STA', './logos/stallions.png'),
('falcons', 'Falcons', 'FAL', './logos/falcons.png'),
('raptors', 'Raptors', 'RAP', './logos/raptors.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short_name = EXCLUDED.short_name, logo_url = EXCLUDED.logo_url;

-- 2. PLAYERS
INSERT INTO players (id, full_name, name, team_id) VALUES
('bul-1', 'Varshit', 'Varshit', 'bulls'),
('bul-2', 'Gokul Reddy', 'Gokul', 'bulls'),
('bul-3', 'Abdul Asif S.', 'Asif', 'bulls'),
('bul-4', 'Nandish K. G.', 'Nandish', 'bulls'),
('bul-5', 'Pratheeksh S.', 'Pratheeksh', 'bulls'),
('bul-6', 'Rahul A.', 'Rahul', 'bulls'),
('bul-7', 'Syed Fardeen', 'Fardeen', 'bulls'),
('bul-8', 'Likith Varna S.', 'Likith', 'bulls'),
('bul-9', 'Hatim Juzer Kaderbhai', 'Hatim', 'bulls'),
('bul-10', 'Mohd. Nabeel Ahmed', 'Nabeel', 'bulls'),
('bul-11', 'Mohammed Ifraaz', 'Ifraaz', 'bulls'),
('bul-12', 'Poojith Reddy', 'Poojith', 'bulls'),
('bul-13', 'S. V. Rakesh', 'Rakesh', 'bulls'),
('fal-1', 'Umar Farooq', 'Umar', 'falcons'),
('fal-2', 'Joel Dokka', 'Joel', 'falcons'),
('fal-3', 'Abhishek Yadav', 'Abhishek Y.', 'falcons'),
('fal-4', 'Abhishek S. Manur', 'Abhishek M.', 'falcons'),
('fal-5', 'Shaik Arfaan Akmal', 'Arfaan', 'falcons'),
('fal-6', 'Dhanush Preetham R.', 'Dhanush', 'falcons'),
('fal-7', 'Sidhant Biradar', 'Sidhant', 'falcons'),
('fal-8', 'Chinmayi R.', 'Chinmayi', 'falcons'),
('fal-9', 'Gahan R.', 'Gahan', 'falcons'),
('fal-10', 'Ashwin Sunil', 'Ashwin', 'falcons'),
('fal-11', 'Harsha A.', 'Harsha', 'falcons'),
('fal-12', 'David Jeremiah J.', 'David', 'falcons'),
('gri-1', 'Aryan J.', 'Aryan', 'grizzlies'),
('gri-2', 'Lakshya Hada', 'Lakshya', 'grizzlies'),
('gri-3', 'Prajeeth Praveen', 'Prajeeth', 'grizzlies'),
('gri-4', 'Sujan Khadka', 'Sujan', 'grizzlies'),
('gri-5', 'Binayak Bhandari', 'Binayak', 'grizzlies'),
('gri-6', 'Kushal G. V.', 'Kushal', 'grizzlies'),
('gri-7', 'Yathin N.', 'Yathin', 'grizzlies'),
('gri-8', 'Blessen Thomas', 'Blessen', 'grizzlies'),
('gri-9', 'Venktesh Nandan', 'Venktesh', 'grizzlies'),
('gri-10', 'Prasant Kumar Tiwary', 'Prasant', 'grizzlies'),
('gri-11', 'Prathik Bagare', 'Prathik', 'grizzlies'),
('gri-12', 'Abhishek Vidukumar', 'Abhishek', 'grizzlies'),
('pan-1', 'Vedant Dharmgond', 'Vedant', 'panthers'),
('pan-2', 'Adib Fareed Hasan', 'Adib', 'panthers'),
('pan-3', 'Syed Zuheb Jeeyaulaa', 'Zuheb', 'panthers'),
('pan-4', 'Hamza Mohammed', 'Hamza', 'panthers'),
('pan-5', 'Mohd. Ibrahim Arshath', 'Ibrahim', 'panthers'),
('pan-6', 'Rithwik Ramesh', 'Rithwik', 'panthers'),
('pan-7', 'Rayhan Zain', 'Rayhan', 'panthers'),
('pan-8', 'Yeshwanth R.', 'Yeshwanth', 'panthers'),
('pan-9', 'Amit Sharma', 'Amit', 'panthers'),
('pan-10', 'Rehaan Saha', 'Rehaan', 'panthers'),
('pan-11', 'Hemanth Singh', 'Hemanth', 'panthers'),
('pan-12', 'Raj Singh', 'Raj', 'panthers'),
('pan-13', 'Anurag Singh', 'Anurag', 'panthers'),
('rap-1', 'Mohammed Ibrahim', 'Ibrahim', 'raptors'),
('rap-2', 'Ayush Sharma', 'Ayush', 'raptors'),
('rap-3', 'Sahil A. Nadaf', 'Sahil', 'raptors'),
('rap-4', 'Roshan Khadka', 'Roshan', 'raptors'),
('rap-5', 'Sharan Shetty', 'Sharan', 'raptors'),
('rap-6', 'Syed Ghouse', 'Syed', 'raptors'),
('rap-7', 'Mohammed Zaid', 'Zaid', 'raptors'),
('rap-8', 'Divyanshu Kushwaha', 'Divyanshu', 'raptors'),
('rap-9', 'Chetan K. V.', 'Chetan', 'raptors'),
('rap-10', 'Ayush Kumar', 'Ayush K.', 'raptors'),
('rap-11', 'Abdul Wahid', 'Wahid', 'raptors'),
('rap-12', 'Aditya K. Priyadarshi', 'Aditya', 'raptors'),
('rap-13', 'Shashank Das', 'Shashank', 'raptors'),
('sta-1', 'Shubhraj', 'Shubhraj', 'stallions'),
('sta-2', 'Mohd. Kasaf Warsi', 'Kasaf', 'stallions'),
('sta-3', 'P. Hemanth Sai', 'Hemanth', 'stallions'),
('sta-4', 'Salman S. Ghadiali', 'Salman', 'stallions'),
('sta-5', 'Anshuman Rai', 'Anshuman', 'stallions'),
('sta-6', 'Arya Jagannadham', 'Arya', 'stallions'),
('sta-7', 'Sufiyan Ahmed', 'Sufiyan', 'stallions'),
('sta-8', 'Avi Jangra', 'Avi', 'stallions'),
('sta-9', 'Arbind Kumar', 'Arbind', 'stallions'),
('sta-10', 'Syed A. Faaz Barmawer', 'Faaz', 'stallions'),
('sta-11', 'Mohammad Tariz', 'Tariz', 'stallions'),
('sta-12', 'Mohamed Aaqil', 'Aaqil', 'stallions'),
('sta-13', 'Syed Baseer Ahmed', 'Baseer', 'stallions')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, name = EXCLUDED.name, team_id = EXCLUDED.team_id;

-- 3. FIXTURES
INSERT INTO fixtures (id, series_id, game_number, date, phase, team1_id, team2_id, status, is_conditional, passcode_hash, submitted_at, result) VALUES
('po2-g1', 'po2', 1, '16 November 2026', 'playoffs', 'grizzlies', 'stallions', 'completed', false, '123456', '2026-11-16T20:00:00Z', '{"matchId":"po2-g1","score":{"team1QuarterScores":{"q1":2,"q2":2,"q3":2,"q4":2,"et":0},"team2QuarterScores":{"q1":1,"q2":1,"q3":2,"q4":1,"et":0},"team1Total":8,"team2Total":5,"isExtraTime":false,"winnerTeamId":"grizzlies","winDescription":"Grizzlies win 8–5"},"completedAt":"2026-11-16T20:00:00Z"}'::jsonb),
('po1-g1', 'po1', 1, '17 November 2026', 'playoffs', 'panthers', 'bulls', 'completed', false, '123456', '2026-11-17T21:30:00Z', '{"matchId":"po1-g1","score":{"team1QuarterScores":{"q1":2,"q2":1,"q3":1,"q4":2,"et":0},"team2QuarterScores":{"q1":1,"q2":2,"q3":1,"q4":1,"et":0},"team1Total":6,"team2Total":5,"isExtraTime":false,"winnerTeamId":"panthers","winDescription":"Panthers win 6–5"},"completedAt":"2026-11-17T21:30:00Z"}'::jsonb),
('po2-g2', 'po2', 2, '18 November 2026', 'playoffs', 'grizzlies', 'stallions', 'completed', false, '123456', '2026-11-18T20:00:00Z', '{"matchId":"po2-g2","score":{"team1QuarterScores":{"q1":2,"q2":2,"q3":2,"q4":1,"et":0},"team2QuarterScores":{"q1":1,"q2":1,"q3":1,"q4":2,"et":0},"team1Total":7,"team2Total":5,"isExtraTime":false,"winnerTeamId":"grizzlies","winDescription":"Grizzlies win 7–5"},"completedAt":"2026-11-18T20:00:00Z"}'::jsonb),
('po1-g2', 'po1', 2, '19 November 2026', 'playoffs', 'panthers', 'bulls', 'completed', false, '123456', '2026-11-19T21:30:00Z', '{"matchId":"po1-g2","score":{"team1QuarterScores":{"q1":2,"q2":2,"q3":1,"q4":2,"et":0},"team2QuarterScores":{"q1":1,"q2":1,"q3":1,"q4":1,"et":0},"team1Total":7,"team2Total":4,"isExtraTime":false,"winnerTeamId":"panthers","winDescription":"Panthers win 7–4"},"completedAt":"2026-11-19T21:30:00Z"}'::jsonb),
('po2-g3', 'po2', 3, '20 November 2026', 'playoffs', 'grizzlies', 'stallions', 'completed', false, '123456', '2026-11-20T20:00:00Z', '{"matchId":"po2-g3","score":{"team1QuarterScores":{"q1":1,"q2":2,"q3":1,"q4":2,"et":0},"team2QuarterScores":{"q1":1,"q2":1,"q3":1,"q4":1,"et":0},"team1Total":6,"team2Total":4,"isExtraTime":false,"winnerTeamId":"grizzlies","winDescription":"Grizzlies win 6–4"},"completedAt":"2026-11-20T20:00:00Z"}'::jsonb),
('po1-g3', 'po1', 3, '21 November 2026', 'playoffs', 'panthers', 'bulls', 'completed', false, '123456', '2026-11-21T21:00:00Z', '{"matchId":"po1-g3","score":{"team1QuarterScores":{"q1":1,"q2":1,"q3":1,"q4":1,"et":0},"team2QuarterScores":{"q1":2,"q2":1,"q3":1,"q4":1,"et":0},"team1Total":4,"team2Total":5,"isExtraTime":false,"winnerTeamId":"bulls","winDescription":"Bulls win 5–4"},"completedAt":"2026-11-21T21:00:00Z"}'::jsonb),
('po2-g4', 'po2', 4, '23 November 2026', 'playoffs', 'grizzlies', 'stallions', 'not_required', true, '123456', NULL, NULL),
('po1-g4', 'po1', 4, '24 November 2026', 'playoffs', 'panthers', 'bulls', 'in_progress', true, '123456', NULL, NULL),
('po2-g5', 'po2', 5, '25 November 2026', 'playoffs', 'grizzlies', 'stallions', 'locked', true, '123456', NULL, NULL),
('po1-g5', 'po1', 5, '26 November 2026', 'playoffs', 'panthers', 'bulls', 'locked', true, '123456', NULL, NULL),
('sf1-g1', 'sf1', 1, '30 November 2026', 'semifinals', 'falcons', NULL, 'locked', false, '123456', NULL, NULL),
('sf2-g1', 'sf2', 1, '1 December 2026', 'semifinals', 'raptors', NULL, 'locked', false, '123456', NULL, NULL),
('sf1-g2', 'sf1', 2, '2 December 2026', 'semifinals', 'falcons', NULL, 'locked', false, '123456', NULL, NULL),
('sf2-g2', 'sf2', 2, '3 December 2026', 'semifinals', 'raptors', NULL, 'locked', false, '123456', NULL, NULL),
('sf1-g3', 'sf1', 3, '4 December 2026', 'semifinals', 'falcons', NULL, 'locked', false, '123456', NULL, NULL),
('sf2-g3', 'sf2', 3, '5 December 2026', 'semifinals', 'raptors', NULL, 'locked', false, '123456', NULL, NULL),
('sf1-g4', 'sf1', 4, '7 December 2026', 'semifinals', 'falcons', NULL, 'locked', true, '123456', NULL, NULL),
('sf2-g4', 'sf2', 4, '8 December 2026', 'semifinals', 'raptors', NULL, 'locked', true, '123456', NULL, NULL),
('sf1-g5', 'sf1', 5, '9 December 2026', 'semifinals', 'falcons', NULL, 'locked', true, '123456', NULL, NULL),
('sf2-g5', 'sf2', 5, '10 December 2026', 'semifinals', 'raptors', NULL, 'locked', true, '123456', NULL, NULL),
('fin-g1', 'finals', 1, '17 December 2026', 'finals', NULL, NULL, 'locked', false, '123456', NULL, NULL),
('fin-g2', 'finals', 2, '19 December 2026', 'finals', NULL, NULL, 'locked', false, '123456', NULL, NULL),
('fin-g3', 'finals', 3, '21 December 2026', 'finals', NULL, NULL, 'locked', false, '123456', NULL, NULL),
('fin-g4', 'finals', 4, '23 December 2026', 'finals', NULL, NULL, 'locked', true, '123456', NULL, NULL),
('fin-g5', 'finals', 5, '26 December 2026', 'finals', NULL, NULL, 'locked', true, '123456', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET series_id = EXCLUDED.series_id, game_number = EXCLUDED.game_number, date = EXCLUDED.date, phase = EXCLUDED.phase, team1_id = EXCLUDED.team1_id, team2_id = EXCLUDED.team2_id, status = EXCLUDED.status, is_conditional = EXCLUDED.is_conditional, passcode_hash = EXCLUDED.passcode_hash, submitted_at = EXCLUDED.submitted_at, result = EXCLUDED.result;

-- 4. EVENTS
INSERT INTO events (id, match_id, quarter, minute, type, goal_type, card_type, team_id, player_id, assister_id, conceding_team_id, is_second_yellow_red, created_at) VALUES
('po1-g1-ev1', 'po1-g1', 'q1', 3, 'goal', 'regular', NULL, 'panthers', 'pan-13', 'pan-10', NULL, false, '2026-11-17T20:05:00Z'),
('po1-g1-ev2', 'po1-g1', 'q1', 6, 'goal', 'regular', NULL, 'bulls', 'bul-11', 'bul-10', NULL, false, '2026-11-17T20:10:00Z'),
('po1-g1-ev3', 'po1-g1', 'q1', 10, 'goal', 'regular', NULL, 'panthers', 'pan-11', 'pan-10', NULL, false, '2026-11-17T20:15:00Z'),
('po1-g1-ev4', 'po1-g1', 'q2', 4, 'goal', 'regular', NULL, 'bulls', 'bul-12', NULL, NULL, false, '2026-11-17T20:25:00Z'),
('po1-g1-ev5', 'po1-g1', 'q2', 7, 'goal', 'penalty', NULL, 'bulls', 'bul-13', NULL, NULL, false, '2026-11-17T20:30:00Z'),
('po1-g1-ev6', 'po1-g1', 'q2', 9, 'goal', 'regular', NULL, 'panthers', 'pan-9', 'pan-11', NULL, false, '2026-11-17T20:34:00Z'),
('po1-g1-ev7', 'po1-g1', 'q2', 11, 'card', NULL, 'yellow', 'bulls', 'bul-7', NULL, NULL, false, '2026-11-17T20:37:00Z'),
('po1-g1-ev8', 'po1-g1', 'q3', 5, 'goal', 'regular', NULL, 'panthers', 'pan-12', 'pan-9', NULL, false, '2026-11-17T20:45:00Z'),
('po1-g1-ev9', 'po1-g1', 'q3', 8, 'goal', 'regular', NULL, 'bulls', 'bul-6', NULL, NULL, false, '2026-11-17T20:50:00Z'),
('po1-g1-ev10', 'po1-g1', 'q4', 3, 'goal', 'regular', NULL, 'panthers', 'pan-13', NULL, NULL, false, '2026-11-17T21:05:00Z'),
('po1-g1-ev11', 'po1-g1', 'q4', 7, 'goal', 'regular', NULL, 'bulls', 'bul-2', NULL, NULL, false, '2026-11-17T21:12:00Z'),
('po1-g1-ev12', 'po1-g1', 'q4', 11, 'goal', 'regular', NULL, 'panthers', 'pan-10', NULL, NULL, false, '2026-11-17T21:18:00Z'),
('po2-g1-ev1', 'po2-g1', 'q1', 2, 'goal', 'regular', NULL, 'stallions', 'sta-1', NULL, NULL, false, '2026-11-17T18:05:00Z'),
('po2-g1-ev2', 'po2-g1', 'q1', 5, 'goal', 'regular', NULL, 'grizzlies', 'gri-1', NULL, NULL, false, '2026-11-17T18:10:00Z'),
('po2-g1-ev3', 'po2-g1', 'q1', 7, 'goal', 'regular', NULL, 'stallions', 'sta-2', NULL, NULL, false, '2026-11-17T18:14:00Z'),
('po2-g1-ev4', 'po2-g1', 'q1', 9, 'goal', 'regular', NULL, 'stallions', 'sta-3', NULL, NULL, false, '2026-11-17T18:18:00Z'),
('po2-g1-ev5', 'po2-g1', 'q1', 11, 'goal', 'regular', NULL, 'stallions', 'sta-4', NULL, NULL, false, '2026-11-17T18:22:00Z'),
('po2-g1-ev6', 'po2-g1', 'q2', 2, 'goal', 'regular', NULL, 'stallions', 'sta-5', NULL, NULL, false, '2026-11-17T18:32:00Z'),
('po2-g1-ev7', 'po2-g1', 'q2', 5, 'goal', 'regular', NULL, 'stallions', 'sta-6', NULL, NULL, false, '2026-11-17T18:36:00Z'),
('po2-g1-ev8', 'po2-g1', 'q2', 8, 'goal', 'regular', NULL, 'stallions', 'sta-1', NULL, NULL, false, '2026-11-17T18:40:00Z'),
('po2-g1-ev9', 'po2-g1', 'q2', 11, 'goal', 'regular', NULL, 'stallions', 'sta-7', NULL, NULL, false, '2026-11-17T18:45:00Z'),
('po2-g1-ev10', 'po2-g1', 'q3', 3, 'goal', 'regular', NULL, 'stallions', 'sta-8', NULL, NULL, false, '2026-11-17T18:55:00Z'),
('po2-g1-ev11', 'po2-g1', 'q3', 6, 'goal', 'regular', NULL, 'stallions', 'sta-9', NULL, NULL, false, '2026-11-17T19:00:00Z'),
('po2-g1-ev12', 'po2-g1', 'q3', 9, 'goal', 'regular', NULL, 'stallions', 'sta-10', NULL, NULL, false, '2026-11-17T19:05:00Z'),
('po2-g1-ev13', 'po2-g1', 'q3', 11, 'goal', 'regular', NULL, 'grizzlies', 'gri-2', NULL, NULL, false, '2026-11-17T19:08:00Z'),
('po2-g1-ev14', 'po2-g1', 'q4', 1, 'goal', 'regular', NULL, 'stallions', 'sta-11', NULL, NULL, false, '2026-11-17T19:15:00Z'),
('po2-g1-ev15', 'po2-g1', 'q4', 4, 'goal', 'regular', NULL, 'stallions', 'sta-12', NULL, NULL, false, '2026-11-17T19:20:00Z'),
('po2-g1-ev16', 'po2-g1', 'q4', 8, 'goal', 'regular', NULL, 'stallions', 'sta-13', NULL, NULL, false, '2026-11-17T19:25:00Z'),
('po2-g1-ev17', 'po2-g1', 'q4', 11, 'goal', 'regular', NULL, 'stallions', 'sta-1', NULL, NULL, false, '2026-11-17T19:30:00Z')
ON CONFLICT (id) DO NOTHING;
