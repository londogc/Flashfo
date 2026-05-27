'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

function CreatureSVG({ id, size = 40 }) {
  const svgs = {
    fox: <svg width={size} height={size} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="50" rx="18" ry="14" fill="#f97316"/><ellipse cx="36" cy="30" rx="18" ry="17" fill="#f97316"/><polygon points="20,18 14,4 28,14" fill="#f97316"/><polygon points="52,18 58,4 44,14" fill="#f97316"/><polygon points="21,17 16,7 27,15" fill="#fda4af"/><polygon points="51,17 56,7 45,15" fill="#fda4af"/><ellipse cx="36" cy="33" rx="11" ry="9" fill="#fff7ed"/><ellipse cx="30" cy="27" rx="3.5" ry="3.5" fill="#1c1917"/><ellipse cx="42" cy="27" rx="3.5" ry="3.5" fill="#1c1917"/><circle cx="31.2" cy="26" r="1.2" fill="#fff"/><circle cx="43.2" cy="26" r="1.2" fill="#fff"/><ellipse cx="36" cy="32" rx="2.2" ry="1.5" fill="#9a3412"/></svg>,
    dragon: <svg width={size} height={size} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="51" rx="17" ry="13" fill="#6366f1"/><ellipse cx="36" cy="28" rx="17" ry="16" fill="#6366f1"/><polygon points="26,16 22,4 30,13" fill="#4f46e5"/><polygon points="46,16 50,4 42,13" fill="#4f46e5"/><ellipse cx="36" cy="33" rx="9" ry="7" fill="#818cf8"/><ellipse cx="29" cy="25" rx="3.5" ry="3.5" fill="#fbbf24"/><ellipse cx="43" cy="25" rx="3.5" ry="3.5" fill="#fbbf24"/><ellipse cx="29" cy="25" rx="2" ry="2.5" fill="#1c1917"/><ellipse cx="43" cy="25" rx="2" ry="2.5" fill="#1c1917"/><circle cx="29.8" cy="24" r="0.9" fill="#fff"/><circle cx="43.8" cy="24" r="0.9" fill="#fff"/></svg>,
    owl: <svg width={size} height={size} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="50" rx="16" ry="15" fill="#92400e"/><ellipse cx="36" cy="26" rx="17" ry="16" fill="#92400e"/><polygon points="27,13 23,3 31,12" fill="#78350f"/><polygon points="45,13 49,3 41,12" fill="#78350f"/><ellipse cx="36" cy="28" rx="13" ry="12" fill="#fef3c7"/><ellipse cx="29" cy="26" rx="4.2" ry="4.2" fill="#f59e0b"/><ellipse cx="43" cy="26" rx="4.2" ry="4.2" fill="#f59e0b"/><ellipse cx="29" cy="26" rx="2.8" ry="2.8" fill="#1c1917"/><ellipse cx="43" cy="26" rx="2.8" ry="2.8" fill="#1c1917"/><circle cx="30" cy="25" r="1" fill="#fff"/><circle cx="44" cy="25" r="1" fill="#fff"/><polygon points="36,30 33,35 39,35" fill="#f97316"/></svg>,
    bear: <svg width={size} height={size} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="51" rx="18" ry="14" fill="#78350f"/><ellipse cx="20" cy="16" rx="8" ry="8" fill="#78350f"/><ellipse cx="52" cy="16" rx="8" ry="8" fill="#78350f"/><ellipse cx="20" cy="16" rx="5" ry="5" fill="#fda4af"/><ellipse cx="52" cy="16" rx="5" ry="5" fill="#fda4af"/><ellipse cx="36" cy="30" rx="19" ry="18" fill="#92400e"/><ellipse cx="36" cy="35" rx="10" ry="8" fill="#b45309"/><ellipse cx="28" cy="26" rx="3.8" ry="3.8" fill="#1c1917"/><ellipse cx="44" cy="26" rx="3.8" ry="3.8" fill="#1c1917"/><circle cx="29.2" cy="25" r="1.3" fill="#fff"/><circle cx="45.2" cy="25" r="1.3" fill="#fff"/><ellipse cx="36" cy="33" rx="3" ry="2" fill="#1c1917"/></svg>,
    rabbit: <svg width={size} height={size} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="52" rx="16" ry="13" fill="#e2e8f0"/><ellipse cx="26" cy="12" rx="6" ry="14" fill="#e2e8f0"/><ellipse cx="46" cy="12" rx="6" ry="14" fill="#e2e8f0"/><ellipse cx="26" cy="12" rx="3.5" ry="11" fill="#fda4af"/><ellipse cx="46" cy="12" rx="3.5" ry="11" fill="#fda4af"/><ellipse cx="36" cy="32" rx="18" ry="17" fill="#e2e8f0"/><ellipse cx="29" cy="28" rx="3.8" ry="3.8" fill="#be185d"/><ellipse cx="43" cy="28" rx="3.8" ry="3.8" fill="#be185d"/><ellipse cx="36" cy="34" rx="2" ry="1.5" fill="#fda4af"/></svg>,
    wolf: <svg width={size} height={size} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="51" rx="17" ry="13" fill="#64748b"/><polygon points="22,18 16,3 30,14" fill="#64748b"/><polygon points="50,18 56,3 42,14" fill="#64748b"/><polygon points="23,17 18,6 29,14" fill="#fda4af"/><polygon points="49,17 54,6 43,14" fill="#fda4af"/><ellipse cx="36" cy="29" rx="18" ry="17" fill="#64748b"/><ellipse cx="36" cy="35" rx="10" ry="7" fill="#94a3b8"/><ellipse cx="29" cy="25" rx="3.8" ry="3.8" fill="#fbbf24"/><ellipse cx="43" cy="25" rx="3.8" ry="3.8" fill="#fbbf24"/><ellipse cx="29" cy="25" rx="2.2" ry="2.8" fill="#1c1917"/><ellipse cx="43" cy="25" rx="2.2" ry="2.8" fill="#1c1917"/></svg>,
    panda: <svg width={size} height={size} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="52" rx="18" ry="14" fill="#f8fafc"/><ellipse cx="20" cy="15" rx="8" ry="8" fill="#1e293b"/><ellipse cx="52" cy="15" rx="8" ry="8" fill="#1e293b"/><ellipse cx="36" cy="30" rx="19" ry="18" fill="#f8fafc"/><ellipse cx="27" cy="27" rx="7" ry="6" fill="#1e293b" transform="rotate(-10 27 27)"/><ellipse cx="45" cy="27" rx="7" ry="6" fill="#1e293b" transform="rotate(10 45 27)"/><ellipse cx="27" cy="27" rx="4" ry="4" fill="#fff"/><ellipse cx="45" cy="27" rx="4" ry="4" fill="#fff"/><ellipse cx="27" cy="27" rx="2.5" ry="2.5" fill="#1e293b"/><ellipse cx="45" cy="27" rx="2.5" ry="2.5" fill="#1e293b"/><ellipse cx="36" cy="33" rx="2.5" ry="1.8" fill="#1e293b"/></svg>,
    cat: <svg width={size} height={size} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="52" rx="16" ry="13" fill="#f59e0b"/><polygon points="21,18 16,4 30,15" fill="#f59e0b"/><polygon points="51,18 56,4 42,15" fill="#f59e0b"/><polygon points="22,17 18,7 29,15" fill="#fda4af"/><polygon points="50,17 54,7 43,15" fill="#fda4af"/><ellipse cx="36" cy="29" rx="18" ry="17" fill="#f59e0b"/><ellipse cx="36" cy="34" rx="11" ry="9" fill="#fef3c7"/><ellipse cx="28.5" cy="26" rx="4" ry="3.5" fill="#1c1917"/><ellipse cx="43.5" cy="26" rx="4" ry="3.5" fill="#1c1917"/><ellipse cx="28.5" cy="26" rx="1" ry="2.2" fill="#1c1917"/><ellipse cx="43.5" cy="26" rx="1" ry="2.2" fill="#1c1917"/><polygon points="36,31.5 34,34 38,34" fill="#be185d"/></svg>,
  }
  return svgs[id] || svgs.fox
}

// ── Hydration guard ───────────────────────────────────────────────────────────
export default function KidsPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return <div style={{ position: 'fixed', inset: 0, background: '#0f0f1a' }} />
  return <KidsHomeUI />
}

function KidsHomeUI() {
  const router = useRouter()
  const [child, setChild]       = useState(null)
  const [streak, setStreak]     = useState(0)
  const [sessions, setSessions] = useState([])
  const [dueCards, setDueCards] = useState(0)

  // ── Load child session from localStorage ─────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('flashfo_child_session')
    if (!raw) { router.replace('/kids-login'); return }
    try {
      const session = JSON.parse(raw)
      // Check session is not older than 12 hours
      if (Date.now() - session.loginAt > 12 * 60 * 60 * 1000) {
        localStorage.removeItem('flashfo_child_session')
        router.replace('/kids-login')
        return
      }
      setChild(session)
      loadChildData(session)
    } catch {
      router.replace('/kids-login')
    }
  }, [])

  async function loadChildData(session) {
    try {
      const { supabase } = await import('@/lib/supabase')

      // Load recent sessions
      const { data: sessionData } = await supabase
        .from('homework_sessions')
        .select('subject, topic, duration_minutes, created_at')
        .eq('child_id', session.childId)
        .order('created_at', { ascending: false })
        .limit(3)

      if (sessionData) setSessions(sessionData)

      // Calculate streak — count distinct days with sessions in last 30 days
      const { data: streakData } = await supabase
        .from('homework_sessions')
        .select('created_at')
        .eq('child_id', session.childId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      if (streakData) {
        const days = new Set(streakData.map(s => s.created_at.slice(0, 10)))
        // Count consecutive days from today
        let count = 0
        const today = new Date()
        for (let i = 0; i < 30; i++) {
          const d = new Date(today)
          d.setDate(today.getDate() - i)
          if (days.has(d.toISOString().slice(0, 10))) count++
          else if (i > 0) break
        }
        setStreak(count)
      }
    } catch (e) { /* silent */ }
  }

  function handleLogout() {
    localStorage.removeItem('flashfo_child_session')
    router.replace('/kids-login')
  }

  function relativeTime(iso) {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 60) return 'today'
    if (hours < 24) return 'today'
    if (days === 1) return 'yesterday'
    return `${days}d ago`
  }

  const subjectColor = {
    Math: '#6366f1', Science: '#1D9E75', History: '#f59e0b',
    English: '#e11d48', Reading: '#1D9E75', Writing: '#f59e0b',
    Geography: '#8b5cf6', Art: '#ec4899',
  }

  const s = {
    page: { minHeight: '100vh', background: '#0f0f1a', fontFamily: 'system-ui,sans-serif' },
    topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(255,255,255,0.04)', borderBottom: '0.5px solid rgba(255,255,255,0.07)' },
    logo: { fontSize: 15, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em' },
    logoAccent: { color: '#e11d48' },
    streak: { fontSize: 12, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '4px 10px', borderRadius: 999, border: '0.5px solid rgba(245,158,11,0.25)' },
    body: { padding: '24px 20px', maxWidth: 480, margin: '0 auto' },
    greetingRow: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
    avatarWrap: { width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))', border: '2px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' },
    hi: { fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em' },
    hiName: { color: '#fda4af' },
    subtext: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
    bigBtns: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
    bigBtn: (bg, border) => ({ borderRadius: 16, padding: '20px 16px', border: `0.5px solid ${border}`, cursor: 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden', background: bg, display: 'block', width: '100%' }),
    btnIconWrap: (bg) => ({ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, fontSize: 18 }),
    btnTitle: { fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 3 },
    btnSub: { fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 },
    practiceBtn: { width: '100%', borderRadius: 16, padding: '16px 18px', background: '#0f1a10', border: '0.5px solid rgba(99,185,50,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, boxSizing: 'border-box' },
    pbIcon: { width: 36, height: 36, borderRadius: 10, background: 'rgba(99,185,50,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 },
    pbTitle: { fontSize: 14, fontWeight: 500, color: '#fff', textAlign: 'left' },
    pbSub: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'left' },
    pbBadge: { marginLeft: 'auto', fontSize: 11, background: 'rgba(99,185,50,0.15)', color: '#86efac', padding: '3px 9px', borderRadius: 999, border: '0.5px solid rgba(99,185,50,0.3)', whiteSpace: 'nowrap' },
    sectionLbl: { fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 },
    sessionsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
    sessionCard: { background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '10px 12px' },
    sessionSubject: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 3 },
    sessionTopic: { fontSize: 12, color: '#fff', marginBottom: 5 },
    sessionBar: { height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 4 },
    sessionTime: { fontSize: 10, color: 'rgba(255,255,255,0.25)' },
    emptyState: { textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13, padding: '20px 0' },
    logoutBtn: { display: 'block', margin: '24px auto 0', fontSize: 11, color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' },
  }

  if (!child) return <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'system-ui,sans-serif' }}>Loading...</div></div>

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div style={s.logo}>flash<span style={s.logoAccent}>fo</span></div>
        {streak > 0 && (
          <div style={s.streak}>{streak} day streak</div>
        )}
      </div>

      <div style={s.body}>
        {/* Greeting */}
        <div style={s.greetingRow}>
          <div style={s.avatarWrap}>
            <CreatureSVG id={child.creatureId || 'fox'} size={42} />
          </div>
          <div>
            <div style={s.hi}>Hey, <span style={s.hiName}>{child.childName}!</span></div>
            <div style={s.subtext}>Nova is ready to help you learn today</div>
          </div>
        </div>

        {/* Main action buttons */}
        <div style={s.bigBtns}>
          <button style={s.bigBtn('#1a1030', 'rgba(99,102,241,0.35)')} onClick={() => router.push('/kids/homework')}>
            <div style={s.btnIconWrap('rgba(99,102,241,0.18)')}>📸</div>
            <div style={s.btnTitle}>Homework help</div>
            <div style={s.btnSub}>Take a photo of your homework</div>
          </button>
          <button style={s.bigBtn('#0d1f1a', 'rgba(29,158,117,0.35)')} onClick={() => router.push('/kids/nova')}>
            <div style={s.btnIconWrap('rgba(29,158,117,0.18)')}>💬</div>
            <div style={s.btnTitle}>Ask Nova</div>
            <div style={s.btnSub}>Chat about anything at school</div>
          </button>
        </div>

        {/* Practice flashcards */}
        <button style={s.practiceBtn} onClick={() => router.push('/kids/flashcards')}>
          <div style={s.pbIcon}>🃏</div>
          <div>
            <div style={s.pbTitle}>Practice flashcards</div>
            <div style={s.pbSub}>Review your cards and sets</div>
          </div>
          {dueCards > 0 && <div style={s.pbBadge}>{dueCards} due</div>}
        </button>

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <>
            <div style={s.sectionLbl}>Recent sessions</div>
            <div style={s.sessionsGrid}>
              {sessions.map((session, i) => {
                const color = subjectColor[session.subject] || '#6366f1'
                const pct = Math.min(100, ((session.duration_minutes || 10) / 30) * 100)
                return (
                  <div key={i} style={s.sessionCard}>
                    <div style={s.sessionSubject}>{session.subject || 'Study'}</div>
                    <div style={s.sessionTopic}>{session.topic || 'Session'}</div>
                    <div style={s.sessionBar}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999 }} />
                    </div>
                    <div style={s.sessionTime}>{session.duration_minutes || '?'} min · {relativeTime(session.created_at)}</div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {sessions.length === 0 && (
          <div style={s.emptyState}>No sessions yet. Start with Homework Help!</div>
        )}

        <button style={s.logoutBtn} onClick={handleLogout}>Switch account</button>
      </div>
    </div>
  )
}
