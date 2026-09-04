-- Round 2 Database Schema & Mock Data
-- Execute this in your Supabase SQL Editor

-- 1. Destinations
CREATE TABLE IF NOT EXISTS round2_destinations (
  id VARCHAR(10) PRIMARY KEY, -- e.g. 'D1', 'D2'
  name VARCHAR(255) NOT NULL,
  qr_identifier VARCHAR(50) UNIQUE NOT NULL
);

-- 2. Questions (The Riddles pointing TO a destination)
CREATE TABLE IF NOT EXISTS round2_questions (
  id SERIAL PRIMARY KEY,
  destination_id VARCHAR(10) REFERENCES round2_destinations(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  correct_answer VARCHAR(255) NOT NULL,
  difficulty VARCHAR(20) DEFAULT 'OTHER'
);

-- 3. Paths (Predefined Sequences of destinations)
CREATE TABLE IF NOT EXISTS round2_paths (
  id VARCHAR(20) PRIMARY KEY,
  checkpoints JSONB NOT NULL -- e.g. ["D1", "D2", "D3", "D4", "D5", "D6"]
);

-- 4. Team Assignments (Pre-configured mapping of Team -> Path)
CREATE TABLE IF NOT EXISTS round2_team_assignments (
  team_id VARCHAR(50) PRIMARY KEY REFERENCES teams(team_id) ON DELETE CASCADE,
  path_id VARCHAR(20) REFERENCES round2_paths(id),
  current_step INTEGER DEFAULT 0,
  state VARCHAR(20) DEFAULT 'PENDING_SOLVE', -- 'PENDING_SOLVE', 'TRANSIT', 'COMPLETE'
  current_question_id INTEGER REFERENCES round2_questions(id)
);

-- 5. Progress (Logging completions)
CREATE TABLE IF NOT EXISTS round2_progress (
  id SERIAL PRIMARY KEY,
  team_id VARCHAR(50) REFERENCES teams(team_id) ON DELETE CASCADE,
  destination_id VARCHAR(10) REFERENCES round2_destinations(id),
  step_no INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- MOCK DATA
-- ==========================================

-- Insert 6 Destinations
INSERT INTO round2_destinations (id, name, qr_identifier) VALUES
('D1', 'The Owlery', 'qr_owlery_d1'),
('D2', 'The Greenhouses', 'qr_greenhouses_d2'),
('D3', 'The Library', 'qr_library_d3'),
('D4', 'The Great Hall', 'qr_greathall_d4'),
('D5', 'The Astronomy Tower', 'qr_astronomy_d5'),
('D6', 'The Potions Dungeon', 'qr_potions_d6')
ON CONFLICT (id) DO NOTHING;

-- Insert Questions for Destinations (These are the riddles pointing TO these destinations)
INSERT INTO round2_questions (destination_id, question_text, correct_answer) VALUES
('D1', 'I am where letters rest before they fly. What am I?', 'owlery'),
('D1', 'Feathers and screeches, perched high in the cold. Where am I?', 'owlery'),
('D2', 'Beware the crying Mandrake here. What is this place?', 'greenhouses'),
('D2', 'Glass walls and magical plants abound. Name the location.', 'greenhouses'),
('D3', 'Silence is golden where books are kept. Where do I refer?', 'library'),
('D3', 'Rows of knowledge, overseen by Madam Pince.', 'library'),
('D4', 'Four long tables and a ceiling of stars.', 'great hall'),
('D4', 'Where you are sorted and where you feast.', 'great hall'),
('D5', 'The highest point to observe the night sky.', 'astronomy tower'),
('D5', 'Look through the telescope at the stars above.', 'astronomy tower'),
('D6', 'Cauldrons bubble in the cold underground.', 'potions dungeon'),
('D6', 'Snape’s domain, dark and damp.', 'potions dungeon');

-- Insert a few mock paths
INSERT INTO round2_paths (id, checkpoints) VALUES
('PATH_A', '["D1", "D2", "D3", "D4", "D5", "D6"]'),
('PATH_B', '["D6", "D5", "D4", "D3", "D2", "D1"]'),
('PATH_C', '["D3", "D1", "D5", "D2", "D6", "D4"]')
ON CONFLICT (id) DO UPDATE SET checkpoints = EXCLUDED.checkpoints;

-- Assign TH-001 through TH-003 to these paths
INSERT INTO round2_team_assignments (team_id, path_id, current_step) VALUES
('TH-001', 'PATH_A', 0),
('TH-002', 'PATH_B', 0),
('TH-003', 'PATH_C', 0)
ON CONFLICT (team_id) DO NOTHING;
