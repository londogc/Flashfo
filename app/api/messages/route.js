import { supabase } from '@/lib/supabase'

// v6.0 Messaging — background scaffold
// Tables needed (run in Supabase SQL editor before v6.0):
//   CREATE TABLE messages (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, thread_id uuid NOT NULL, sender_id uuid REFERENCES auth.users, sender_name text, content text NOT NULL, created_at timestamptz DEFAULT now(), read_by uuid[] DEFAULT '{}');
//   CREATE TABLE message_threads (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, classroom_id uuid REFERENCES classrooms, title text, type text DEFAULT 'direct', participants uuid[], created_at timestamptz DEFAULT now());
//   ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
//   ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "thread participants" ON messages FOR ALL USING (thread_id IN (SELECT id FROM message_threads WHERE sender_id=auth.uid() OR auth.uid()=ANY(participants)));
//   CREATE POLICY "classroom threads" ON message_threads FOR ALL USING (classroom_id IN (SELECT id FROM classrooms WHERE teacher_id=auth.uid()) OR auth.uid()=ANY(participants));

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const threadId = searchParams.get('threadId')
  if (!threadId) return Response.json({ error: 'threadId required' }, { status: 400 })
  const { data, error } = await supabase.from('messages').select('*').eq('thread_id', threadId).order('created_at', { ascending: true }).limit(100)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ messages: data })
}

export async function POST(request) {
  const { threadId, senderId, senderName, content } = await request.json()
  if (!threadId || !content) return Response.json({ error: 'Missing fields' }, { status: 400 })
  const { data, error } = await supabase.from('messages').insert({ thread_id: threadId, sender_id: senderId, sender_name: senderName, content }).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ message: data })
}