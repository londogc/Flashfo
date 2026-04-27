import { supabase } from '@/lib/supabase'

// v6.0 Resource Hub API
// Tables needed (run in Supabase before v6.0):
//
// CREATE TABLE resource_hub (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   publisher_id uuid REFERENCES auth.users NOT NULL,
//   title text NOT NULL,
//   description text,
//   resource_type text NOT NULL, -- 'Quiz' | 'Flashcards' | 'Lesson Plan' | 'Study Guide'
//   subject text DEFAULT 'Other',
//   grade_level text DEFAULT 'All',
//   tags text[] DEFAULT '{}',
//   resource_data jsonb NOT NULL DEFAULT '{}',
//   status text DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
//   download_count int DEFAULT 0,
//   avg_rating numeric(3,1) DEFAULT 0,
//   created_at timestamptz DEFAULT now()
// );
// ALTER TABLE resource_hub ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "anyone reads approved" ON resource_hub FOR SELECT USING (status='approved' OR auth.uid()=publisher_id);
// CREATE POLICY "publishers insert" ON resource_hub FOR INSERT WITH CHECK (auth.uid()=publisher_id);
// CREATE POLICY "publishers update own" ON resource_hub FOR UPDATE USING (auth.uid()=publisher_id);
// GRANT ALL ON TABLE resource_hub TO authenticated;
//
// CREATE TABLE resource_ratings (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   resource_id uuid REFERENCES resource_hub ON DELETE CASCADE,
//   user_id uuid REFERENCES auth.users,
//   rating int CHECK (rating BETWEEN 1 AND 5),
//   created_at timestamptz DEFAULT now(),
//   UNIQUE(resource_id, user_id)
// );
// ALTER TABLE resource_ratings ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "anyone rates" ON resource_ratings FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
// GRANT ALL ON TABLE resource_ratings TO authenticated;

export async function POST(request) {
  try {
    const { publisherId, title, description, resourceType, subject, gradeLevel, tags, resourceData } = await request.json()
    if (!publisherId || !title || !resourceType || !resourceData) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const { data, error } = await supabase.from('resource_hub').insert({
      publisher_id: publisherId,
      title,
      description: description || '',
      resource_type: resourceType,
      subject: subject || 'Other',
      grade_level: gradeLevel || 'All',
      tags: tags || [],
      resource_data: resourceData,
      status: 'pending' // goes to moderation queue
    }).select().single()
    if (error) throw error
    return Response.json({ resource: data, message: 'Submitted for review! We will approve within 24 hours.' })
  } catch(err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const subject = searchParams.get('subject')
  const grade   = searchParams.get('grade')
  const type    = searchParams.get('type')
  const sort    = searchParams.get('sort') || 'popular'
  const search  = searchParams.get('search')

  let q = supabase.from('resource_hub')
    .select('*, profiles(full_name)')
    .eq('status', 'approved')

  if (subject && subject !== 'All') q = q.eq('subject', subject)
  if (grade   && grade   !== 'All') q = q.eq('grade_level', grade)
  if (type    && type    !== 'All') q = q.eq('resource_type', type)
  if (search) q = q.ilike('title', '%'+search+'%')

  if (sort === 'popular') q = q.order('download_count', { ascending: false })
  else if (sort === 'newest') q = q.order('created_at', { ascending: false })
  else if (sort === 'rating') q = q.order('avg_rating', { ascending: false })

  const { data, error } = await q.limit(40)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ resources: data || [] })
}