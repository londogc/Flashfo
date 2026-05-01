-- Migration: add plan column for subscription tracking
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lifetime_granted boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_updated_at timestamptz;

-- Index for fast plan lookups
CREATE INDEX IF NOT EXISTS profiles_plan_idx ON profiles(plan);

-- RLS: users can read their own plan but NOT update it themselves
-- (only service role / webhooks can set plan)
CREATE POLICY IF NOT EXISTS "Users can read own plan"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Helper: grant lifetime access to a user by email
-- Usage: SELECT grant_lifetime('user@email.com');
CREATE OR REPLACE FUNCTION grant_lifetime(user_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET plan = 'lifetime',
      lifetime_granted = true,
      plan_updated_at = now()
  WHERE id = (SELECT id FROM auth.users WHERE email = user_email);
END;
$$;

-- Helper: revoke and reset to free (just in case)
CREATE OR REPLACE FUNCTION revoke_plan(user_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET plan = 'free',
      lifetime_granted = false,
      plan_updated_at = now()
  WHERE id = (SELECT id FROM auth.users WHERE email = user_email);
END;
$$;

-- Helper: view all lifetime users
CREATE OR REPLACE VIEW lifetime_users AS
  SELECT u.email, p.plan, p.lifetime_granted, p.plan_updated_at, p.created_at
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.lifetime_granted = true
  ORDER BY p.plan_updated_at DESC;
