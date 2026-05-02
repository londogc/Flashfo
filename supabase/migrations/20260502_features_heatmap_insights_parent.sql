-- Feature 2: Weakness Heatmap
-- Store quiz attempt results per user per topic
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic        text NOT NULL,
  subject      text,
  correct      int NOT NULL DEFAULT 0,
  total        int NOT NULL DEFAULT 1,
  is_practice  boolean DEFAULT true,  -- false = live quiz (not shown in heatmap)
  created_at   timestamptz DEFAULT now()
);

-- Only student can see their own attempts
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own attempts" ON quiz_attempts
  FOR ALL USING (auth.uid() = user_id);

-- Feature 3: Live quiz sessions (teacher insight feed)
CREATE TABLE IF NOT EXISTS live_quiz_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic          text NOT NULL,
  subject        text,
  student_count  int DEFAULT 0,
  avg_score      int DEFAULT 0,
  results_json   jsonb,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE live_quiz_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers see own sessions" ON live_quiz_sessions
  FOR ALL USING (auth.uid() = teacher_id);

-- Feature 4: Parent dashboard — parent-child account linking
CREATE TABLE IF NOT EXISTS parent_child_links (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  child_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  link_code  text UNIQUE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

ALTER TABLE parent_child_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents see own links" ON parent_child_links
  FOR SELECT USING (auth.uid() = parent_id);

-- Function to generate a 6-char link code for a student
CREATE OR REPLACE FUNCTION generate_parent_link()
RETURNS text AS $$
DECLARE
  code text;
BEGIN
  code := upper(substring(md5(auth.uid()::text || now()::text), 1, 6));
  INSERT INTO parent_child_links (parent_id, child_id, link_code)
    VALUES (auth.uid(), auth.uid(), code)
    ON CONFLICT DO NOTHING;
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Parent can claim a child using the link code
CREATE OR REPLACE FUNCTION claim_child(code text)
RETURNS void AS $$
BEGIN
  UPDATE parent_child_links
    SET parent_id = auth.uid()
    WHERE link_code = code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;