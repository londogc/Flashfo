import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

/**
 * Call this whenever a user completes a study activity.
 * Safe to call multiple times per day — upserts on (user_id, date, source).
 *
 * Usage:
 *   logStudySession({ cardsStudied: 10, minutesSpent: 5, source: 'flashcards' })
 */
export async function logStudySession({ cardsStudied = 0, minutesSpent = 0, source = 'flashcards' }) {
  const supabase = createClientComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const today = new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'

  // Check if a session already exists for this user/date/source
  const { data: existing } = await supabase
    .from('study_sessions')
    .select('id, cards_studied, minutes_spent')
    .eq('user_id', user.id)
    .eq('date', today)
    .eq('source', source)
    .maybeSingle()

  if (existing) {
    // Accumulate — don't overwrite
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
