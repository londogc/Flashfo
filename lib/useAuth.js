'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

export function useAuth() {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (data) {
        setProfile(data)
      } else if (error?.code === 'PGRST116') {
        // Row not found — profile doesn't exist yet (no signup trigger).
        // Upsert a minimal profile so the user doesn't get stuck with "there".
        const sessionData = await supabase.auth.getSession()
        const email       = sessionData.data?.session?.user?.email || ''
        const defaultName = email.split('@')[0] || 'User'

        const { data: created } = await supabase
          .from('profiles')
          .upsert({
            id:        userId,
            full_name: defaultName,
            email,
            role:      'student', // default; teacher can change in settings
            plan:      'free',
          }, { onConflict: 'id' })
          .select()
          .single()

        setProfile(created || { id: userId, full_name: defaultName, email, role: 'student', plan: 'free' })
      }
    } catch (e) {
      // Fail silently — the UI has fallbacks for null profile
      console.warn('[useAuth] fetchProfile error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  async function refreshProfile() {
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) setProfile(data)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { user, profile, loading, signOut, refreshProfile }
}
