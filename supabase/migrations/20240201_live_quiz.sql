-- Live Quiz: sessions
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_code text NOT NULL UNIQUE,
  title text NOT NULL,
  subject text,
  questions jsonb NOT NULL DEFAULT '[]',
  pace_mode text NOT NULL DEFAULT 'timer', -- 'timer' | 'manual'
  timer_seconds int NOT NULL DEFAULT 90,
  status text NOT NULL DEFAULT 'lobby', -- 'lobby' | 'active' | 'ended'
  current_question_idx int NOT NULL DEFAULT 0,
  question_started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own sessions" ON quiz_sessions FOR ALL USING (auth.uid() = teacher_id);
CREATE POLICY "Anyone can read active sessions" ON quiz_sessions FOR SELECT USING (status IN ('lobby','active'));

-- Live Quiz: participants + answers
CREATE TABLE IF NOT EXISTS quiz_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  student_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  student_name text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}',
  score int NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quiz_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants manage own record" ON quiz_participants FOR ALL USING (
  auth.uid() = student_id OR
  EXISTS (SELECT 1 FROM quiz_sessions WHERE id = session_id AND teacher_id = auth.uid())
);
CREATE POLICY "Anyone can insert participant" ON quiz_participants FOR INSERT WITH CHECK (true);

-- Question bank
CREATE TABLE IF NOT EXISTS quiz_question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text,
  questions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quiz_question_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers own question bank" ON quiz_question_bank FOR ALL USING (auth.uid() = teacher_id);