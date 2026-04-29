-- nova_user_classes: persists classes/subjects a user tells Nova about
CREATE TABLE IF NOT EXISTS nova_user_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text,
  teacher text,
  grade text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);
ALTER TABLE nova_user_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own classes" ON nova_user_classes FOR ALL USING (auth.uid() = user_id);

-- homework_assignments: teacher creates, students see on dashboard
CREATE TABLE IF NOT EXISTS homework_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid REFERENCES classrooms(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'flashcards',
  -- type: 'flashcards' | 'quiz' | 'study_guide' | 'reading'
  content_ref text,
  due_date timestamptz,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE homework_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own assignments" ON homework_assignments FOR ALL USING (auth.uid() = teacher_id);
CREATE POLICY "Students view class assignments" ON homework_assignments FOR SELECT USING (
  classroom_id IN (SELECT classroom_id FROM student_enrollments WHERE student_id = auth.uid())
);

-- collaborative_decks: shared flashcard sets
CREATE TABLE IF NOT EXISTS collaborative_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  classroom_id uuid REFERENCES classrooms(id) ON DELETE SET NULL,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS collaborative_deck_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES collaborative_decks(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE collaborative_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_deck_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deck members can view" ON collaborative_decks FOR SELECT USING (
  is_public = true OR owner_id = auth.uid() OR
  classroom_id IN (SELECT classroom_id FROM student_enrollments WHERE student_id = auth.uid())
);
CREATE POLICY "Owner manages deck" ON collaborative_decks FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Members view cards" ON collaborative_deck_cards FOR SELECT USING (
  deck_id IN (SELECT id FROM collaborative_decks WHERE is_public = true OR owner_id = auth.uid() OR
    classroom_id IN (SELECT classroom_id FROM student_enrollments WHERE student_id = auth.uid()))
);
CREATE POLICY "Members add cards" ON collaborative_deck_cards FOR INSERT WITH CHECK (
  deck_id IN (SELECT id FROM collaborative_decks WHERE owner_id = auth.uid() OR
    classroom_id IN (SELECT classroom_id FROM student_enrollments WHERE student_id = auth.uid()))
);