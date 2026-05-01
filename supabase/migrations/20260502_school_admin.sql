-- ============================================================
-- FLASHFO — School Admin & Multi-Teacher Support
-- Run this in Supabase SQL Editor AFTER the plan migration
-- ============================================================

-- 1. Add school_admin_id to profiles (links teachers to their school admin)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_school_admin boolean NOT NULL DEFAULT false;

-- 2. Index for fast lookups
CREATE INDEX IF NOT EXISTS profiles_school_admin_idx ON profiles(school_admin_id);

-- 3. RLS policy — school admins can view their teachers
CREATE POLICY IF NOT EXISTS "School admins can view their teachers"
  ON profiles FOR SELECT
  USING (
    auth.uid() = school_admin_id OR
    auth.uid() = id
  );

-- 4. When a school plan user is created, mark them as school admin
CREATE OR REPLACE FUNCTION handle_school_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.plan = 'school' AND OLD.plan != 'school' THEN
    UPDATE profiles SET is_school_admin = true WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_plan_set_school_admin ON profiles;
CREATE TRIGGER on_plan_set_school_admin
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_school_admin();

-- 5. Helper — manually set a user as school admin by email
CREATE OR REPLACE FUNCTION make_school_admin(user_email text, school text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET
    plan = 'school',
    is_school_admin = true,
    school_name = COALESCE(school, school_name),
    plan_updated_at = now()
  WHERE id = (SELECT id FROM auth.users WHERE email = user_email);
END;
$$;

-- 6. View — see all schools and their teacher counts
CREATE OR REPLACE VIEW school_overview AS
  SELECT
    u.email AS admin_email,
    p.school_name,
    p.plan,
    p.created_at,
    COUNT(t.id) AS teacher_count,
    10 - COUNT(t.id) AS seats_remaining
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN profiles t ON t.school_admin_id = p.id
  WHERE p.is_school_admin = true
  GROUP BY u.email, p.school_name, p.plan, p.created_at
  ORDER BY p.created_at DESC;

-- ============================================================
-- VERIFY
-- ============================================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('school_admin_id','school_name','is_school_admin');
