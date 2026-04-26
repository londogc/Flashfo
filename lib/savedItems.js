import { supabase } from './supabase'

export async function saveItem(userId, type, title, data) {
  const { data: result, error } = await supabase
    .from('saved_items')
    .insert({ user_id: userId, type, title, data })
    .select().single()
  if (error) throw error
  return result
}

export async function updateSavedItem(id, updates) {
  const { data: result, error } = await supabase
    .from('saved_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw error
  return result
}

export async function getUserItems(userId, type) {
  let q = supabase.from('saved_items').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (type) q = q.eq('type', type)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function deleteItem(id) {
  const { error } = await supabase.from('saved_items').delete().eq('id', id)
  if (error) throw error
}
