import { supabase } from '@/lib/supabase'

export async function logStudySession({ cardsStudied = 0, minutesSpent = 0, source = 'flashcards' }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('study_sessions')
    .select('id, cards_studied, minutes_spent')
    .eq('user_id', user.id)
    .eq('date', today)
    .eq('source', source)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('study_sessions')
      .update({
        cards_studied: existing.cards_studied + cardsStudied,
        minutes_spent: existing.minutes_spent + minutesSpent,
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('study_sessions')
      .insert({ user_id: user.id, date: today, cards_studied: cardsStudied, minutes_spent: minutesSpent, source })
  }
}
