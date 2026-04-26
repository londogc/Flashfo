import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set in env' }, { status: 500 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey)
  const sql = `
    CREATE TABLE IF NOT EXISTS saved_items (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid REFERENCES auth.users NOT NULL,
      type text NOT NULL,
      title text NOT NULL,
      data jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_items' AND policyname='users own items') THEN
        CREATE POLICY "users own items" ON saved_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
      END IF;
    END $$;
  `
  const { error } = await admin.rpc('exec_sql', { sql }).single().catch(()=>({error:'rpc not available'}))
  // Fallback: try direct insert to check connection
  if (error) {
    return NextResponse.json({ 
      message: 'Auto-setup unavailable. Run this SQL in your Supabase dashboard SQL editor:',
      sql: `CREATE TABLE IF NOT EXISTS saved_items (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid REFERENCES auth.users NOT NULL, type text NOT NULL, title text NOT NULL, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()); ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY; CREATE POLICY "users own items" ON saved_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`
    })
  }
  return NextResponse.json({ success: true, message: 'saved_items table created!' })
}
