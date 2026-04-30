-- Nova messages: session memory across conversations
CREATE TABLE IF NOT EXISTS nova_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nova_messages_user_idx ON nova_messages(user_id, created_at DESC);
ALTER TABLE nova_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own messages" ON nova_messages FOR ALL USING (auth.uid() = user_id);