import { supabase } from '@/lib/supabase'

export async function saveDraft(tool, topic, data) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('drafts').upsert(
    { user_id: user.id, tool, topic: topic || '', data, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,tool' }
  )
}

export async function loadDraft(tool) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('drafts')
    .select('data, topic, updated_at')
    .eq('user_id', user.id)
    .eq('tool', tool)
    .maybeSingle()
  return data || null
}

export async function clearDraft(tool) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('drafts').delete().eq('user_id', user.id).eq('tool', tool)
}
