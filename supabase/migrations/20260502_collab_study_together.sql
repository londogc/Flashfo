-- Feature 5: Collaborative Decks with Edit History
CREATE TABLE IF NOT EXISTS collab_decks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  subject     text,
  created_by  uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_count  int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE collab_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can read collab decks" ON collab_decks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create collab decks" ON collab_decks FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update their decks" ON collab_decks FOR UPDATE USING (auth.uid() = created_by);

CREATE TABLE IF NOT EXISTS collab_cards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id     uuid REFERENCES collab_decks(id) ON DELETE CASCADE NOT NULL,
  front       text NOT NULL,
  back        text NOT NULL,
  added_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE collab_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can read collab cards" ON collab_cards FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can add cards" ON collab_cards FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Card creators can delete their cards" ON collab_cards FOR DELETE USING (auth.uid() = added_by);

CREATE TABLE IF NOT EXISTS collab_edit_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id     uuid REFERENCES collab_decks(id) ON DELETE CASCADE NOT NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  detail      text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE collab_edit_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can read edit history" ON collab_edit_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System inserts edit history" ON collab_edit_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Feature 6: Study With a Friend sessions
CREATE TABLE IF NOT EXISTS study_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text UNIQUE NOT NULL,
  host_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  guest_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deck_id          uuid,
  status           text DEFAULT 'waiting',
  current_card_idx int DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can see their sessions" ON study_sessions
  FOR SELECT USING (auth.uid() = host_id OR auth.uid() = guest_id OR status = 'waiting');
CREATE POLICY "Hosts can create sessions" ON study_sessions FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Participants can update sessions" ON study_sessions
  FOR UPDATE USING (auth.uid() = host_id OR auth.uid() = guest_id);

-- Enable realtime for collab features
ALTER PUBLICATION supabase_realtime ADD TABLE collab_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE collab_edit_history;
ALTER PUBLICATION supabase_realtime ADD TABLE study_sessions;