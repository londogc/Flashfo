-- Notifications table for Flashfo v6
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'general',
  category text,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id, created_at DESC);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service can insert notifications" ON notifications FOR INSERT WITH CHECK (true);