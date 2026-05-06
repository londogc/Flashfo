'use client'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

function calcStreak(sessions) {
  if (!sessions.length) return { current: 0, longest: 0 }
  const dates = new Set(sessions.map(s => s.date))
  const today = new Date()
  let current = 0
  let longest = 0
  let run = 0

  // Current streak — walk backwards from today
  const check = new Date(today)
  while (true) {
    const key = check.toISOString().split('T')[0]
    if (dates.has(key)) {
      current++
      check.setDate(check.getDate() - 1)
    } else {
      // Allow today not yet studied without breaking streak
      if (current === 0 && key === today.toISOString().split('T')[0]) {
        check.setDate(check.getDate() - 1)
        continue
      }
      break
    }
  }

  // Longest streak — scan all sorted dates
  const sorted = [...dates].sort()
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) { run = 1 } else {
      const prev = new Date(sorted[i - 1])
      const curr = new Date(sorted[i])
      const diff = (curr - prev) / (1000 * 60 * 60 * 24)
      run = diff === 1 ? run + 1 : 1
    }
    if (run > longest) longest = run
  }

  return { current, longest }
}

function calcWeekBars(sessions) {
  const map = {}
  sessions.forEach(s => {
    map[s.date] = (map[s.date] || 0) + s.cards_studied
  })
  const days = ['M','T','W','T','F','S','S']
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  // Start from Monday of current week
  const dayOfWeek = (today.getDay() + 6) % 7 // 0=Mon
  return days.map((label, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - dayOfWeek + i)
    const key = d.toISOString().split('T')[0]
    const cards = map[key] || 0
    const isToday = key === todayStr
    const isFuture = d > today
    const maxCards = Math.max(...Object.values(map), 1)
    const height = cards > 0 ? Math.max(14, Math.round((cards / maxCards) * 56)) : 10
    return { label, key, cards, isToday, isFuture, height }
  })
}

function calcHeatmap(sessions) {
  const map = {}
  sessions.forEach(s => { map[s.date] = (map[s.date] || 0) + s.cards_studied })
  const max = Math.max(...Object.values(map), 1)
  const cells = []
  const today = new Date()
  // 91 days = 13 weeks
  for (let i = 90; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().split('T')[0]
    const cards = map[key] || 0
    const ratio = cards / max
    const level = cards === 0 ? 0 : ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.75 ? 3 : 4
    cells.push(level)
  }
  return cells
}

export default function StreakCard() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return setLoading(false)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      const { data } = await supabase
        .from('study_sessions')
        .select('date, cards_studied, minutes_spent, source')
        .eq('user_id', user.id)
        .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })
      setSessions(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const { current: streakDays, longest } = calcStreak(sessions)
  const weekBars = calcWeekBars(sessions)
  const heatmap = calcHeatmap(sessions)

  const totalCards = sessions.reduce((a, s) => a + s.cards_studied, 0)
  const weekSessions = sessions.filter(s => {
    const d = new Date(s.date)
    const now = new Date()
    return (now - d) / (1000 * 60 * 60 * 24) <= 7
  })
  const weekMinutes = weekSessions.reduce((a, s) => a + s.minutes_spent, 0)
  const weekHours = (weekMinutes / 60).toFixed(1)

  const studiedToday = sessions.some(s => s.date === new Date().toISOString().split('T')[0])

  if (loading) return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '0.5px solid rgba(255,255,255,0.09)', padding: 20, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 13, color: 'rgba(241,240,255,0.35)' }}>Loading streak…</span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Nudge banner — only show if not yet studied today */}
      {!studiedToday && streakDays > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'rgba(245,158,11,0.07)', border: '0.5px solid rgba(245,158,11,0.22)', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'radial-gradient(circle at 35% 35%, #fcd34d, #f59e0b 45%, #b45309 75%, #78350f)', boxShadow: '0 0 14px rgba(245,158,11,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fcd34d" stroke="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <span style={{ fontSize: 13, color: 'rgba(245,158,11,0.88)', flex: 1 }}>
            Study today to keep your {streakDays}-day streak alive
          </span>
          <a href="/flashcards" style={{ fontSize: 12, fontWeight: 500, background: 'rgba(245,158,11,0.12)', border: '0.5px solid rgba(245,158,11,0.28)', color: '#fcd34d', borderRadius: 8, padding: '7px 14px', textDecoration: 'none', whiteSpace: 'nowrap', display: 'block', width: '100%', textAlign: 'center', maxWidth: 120 }}>
            Study now →
          </a>
        </div>
      )}

      {/* Main row — streak + stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>

        {/* Streak card */}
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(241,240,255,0.35)', marginBottom: 14 }}>Current streak</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0, position: 'relative', background: 'radial-gradient(circle at 35% 35%, #fcd34d, #f59e0b 45%, #b45309 75%, #78350f)', boxShadow: '0 0 20px rgba(245,158,11,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', width: 66, height: 66, borderRadius: '50%', border: '1px solid rgba(245,158,11,0.25)', animation: 'ffspin 3s linear infinite' }}/>
              <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', border: '1px solid rgba(245,158,11,0.15)', animation: 'ffspin 5s linear infinite reverse' }}/>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fcd34d" stroke="none">
                <path d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-2-1-4-2-5 0 2-1 3-2 3-1 0-2-1-2-3 0 0 1-1 1-4z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, background: 'linear-gradient(135deg, #fcd34d, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{streakDays}</div>
              <div style={{ fontSize: 13, color: 'rgba(241,240,255,0.45)', marginTop: 3 }}>days in a row</div>
              <div style={{ fontSize: 11, color: 'rgba(245,158,11,0.6)', marginTop: 2 }}>Best: {longest} days</div>
            </div>
          </div>

          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', margin: '0 0 14px' }}/>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(241,240,255,0.35)', marginBottom: 10 }}>This week</div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
            {weekBars.map((day, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: '100%', maxWidth: 26,
                  height: day.isFuture ? 10 : day.height,
                  borderRadius: '4px 4px 2px 2px',
                  background: day.isFuture
                    ? 'rgba(255,255,255,0.04)'
                    : day.isToday && day.cards > 0
                      ? 'linear-gradient(180deg, #fcd34d, #f59e0b)'
                      : day.isToday
                        ? 'rgba(245,158,11,0.2)'
                        : day.cards > 0
                          ? 'linear-gradient(180deg, #818cf8, #6366f1)'
                          : 'rgba(255,255,255,0.06)',
                  border: `0.5px solid ${day.isToday ? 'rgba(245,158,11,0.3)' : day.cards > 0 && !day.isFuture ? 'rgba(129,140,248,0.2)' : 'rgba(255,255,255,0.07)'}`,
                  boxShadow: day.isToday && day.cards > 0 ? '0 0 8px rgba(245,158,11,0.25)' : 'none',
                  transition: 'height 0.3s ease',
                }}/>
                <div style={{ fontSize: 9, color: day.isToday ? 'rgba(245,158,11,0.7)' : 'rgba(241,240,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{day.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stat rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>, bg: 'rgba(99,102,241,0.15)', val: totalCards.toLocaleString(), color: '#818cf8', label: 'Cards studied total' },
            { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, bg: 'rgba(20,184,166,0.12)', val: `${weekHours}h`, color: '#14b8a6', label: 'Study time this week' },
            { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, bg: 'rgba(129,140,248,0.12)', val: `${longest}d`, color: '#a5b4fc', label: 'Longest streak ever' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 600, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'rgba(241,240,255,0.38)', marginTop: 1 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(241,240,255,0.35)' }}>Activity — last 13 weeks</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {['rgba(255,255,255,0.05)', 'rgba(99,102,241,0.2)', 'rgba(99,102,241,0.42)', 'rgba(99,102,241,0.7)', '#818cf8'].map((bg, i) => (
              <div key={i} style={{ width: 9, height: 9, borderRadius: 2, background: bg, border: i === 0 ? '0.5px solid rgba(255,255,255,0.08)' : 'none' }}/>
            ))}
            <span style={{ fontSize: 10, color: 'rgba(241,240,255,0.3)', marginLeft: 2 }}>More</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          {['Feb','Mar','Apr','May'].map(m => <span key={m} style={{ fontSize: 10, color: 'rgba(241,240,255,0.3)' }}>{m}</span>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 3 }}>
          {heatmap.map((level, i) => (
            <div key={i} style={{ aspectRatio: 1, borderRadius: 2, background: ['rgba(255,255,255,0.05)', 'rgba(99,102,241,0.2)', 'rgba(99,102,241,0.42)', 'rgba(99,102,241,0.7)', '#818cf8'][level] }}/>
          ))}
        </div>
      </div>

      <style>{`@keyframes ffspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
