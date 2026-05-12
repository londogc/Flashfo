'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

export default function ParentDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [children, setChildren] = useState([])
  const [selected, setSelected] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [linkCode, setLinkCode] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState('')

  useEffect(() => {
    if (!user) { router.push('/auth'); return }
    loadChildren()
  }, [user])

  async function handleLinkChild() {
    const code = linkCode.trim().toUpperCase()
    if (!code) return
    setLinking(true); setLinkError('')
    // Find child by link_code on their profile
    const { data: profile, error: findErr } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('link_code', code)
      .single()
    if (findErr || !profile) {
      setLinkError('No account found with that code. Ask your child to check Settings → Share with Parent.')
      setLinking(false); return
    }
    if (profile.id === user.id) {
      setLinkError("You can't link your own account."); setLinking(false); return
    }
    const { error: linkErr } = await supabase.from('parent_child_links').insert({
      parent_id: user.id, child_id: profile.id
    })
    if (linkErr && !linkErr.message.includes('duplicate')) {
      setLinkError(linkErr.message); setLinking(false); return
    }
    setLinkCode(''); await loadChildren()
    setLinking(false)
  }

  async function loadChildren() {
    const { data } = await supabase
      .from('parent_child_links')
      .select('child_id, profiles!parent_child_links_child_id_fkey(id, full_name, email, plan)')
      .eq('parent_id', user.id)
    const kids = (data || []).map(d => d.profiles).filter(Boolean)
    setChildren(kids)
    if (kids.length > 0) {
      setSelected(kids[0])
      loadActivity(kids[0].id)
    } else {
      setLoading(false)
    }
  }

  async function loadActivity(childId) {
    setLoading(true)
    const { data } = await supabase
      .from('quiz_attempts')
      .select('topic, correct, total, created_at')
      .eq('user_id', childId)
      .order('created_at', { ascending: false })
      .limit(20)
    setActivity(data || [])
    setLoading(false)
  }

  const demoChild = { id: 'demo', full_name: 'Your child', email: 'student@example.com', plan: 'student' }
  const demoActivity = [
    { topic: 'AP Biology — Photosynthesis', correct: 18, total: 20, created_at: new Date(Date.now()-3600000).toISOString() },
    { topic: 'AP US History — Civil War', correct: 14, total: 20, created_at: new Date(Date.now()-86400000).toISOString() },
    { topic: 'Algebra II — Quadratics', correct: 12, total: 20, created_at: new Date(Date.now()-172800000).toISOString() },
  ]

  const displayChild = children.length > 0 ? selected : demoChild
  const displayActivity = children.length > 0 ? activity : demoActivity
  const totalStudyTime = displayActivity.length * 8 // rough estimate: 8 min per quiz
  const avgScore = displayActivity.length > 0
    ? Math.round(displayActivity.reduce((sum, a) => sum + Math.round((a.correct/a.total)*100), 0) / displayActivity.length)
    : 0

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--c-t1)', marginBottom: 8 }}>
          Parent Dashboard
        </h1>
        <p style={{ fontSize: 15, color: 'var(--c-t2)' }}>See exactly what your child has been studying, how they are performing, and where they need help.</p>
      </div>

      {children.length === 0 && (
        <div style={{ background: 'rgba(37,99,235,.06)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 14, padding: '20px 24px', marginBottom: 32 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#3b82f6', marginBottom: 6 }}>Link your child's account</div>
          <div style={{ fontSize: 14, color: 'var(--c-t2)', marginBottom: 14 }}>Ask your child to go to Settings → Share with Parent and send you their link code.</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={linkCode} onChange={e => setLinkCode(e.target.value.toUpperCase().trim())}
              placeholder="Enter your child's link code" maxLength={10}
              onKeyDown={e => e.key === 'Enter' && handleLinkChild()}
              style={{ flex: 1, padding: '10px 14px', background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 8, fontSize: 14, color: 'var(--c-t1)' }}/>
            <button onClick={handleLinkChild} disabled={linking || !linkCode.trim()}
              style={{ padding: '10px 20px', background: linking ? '#1d4ed8' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: linking ? 0.7 : 1 }}>
              {linking ? 'Linking…' : 'Link account'}
            </button>
          </div>
          {linkError && <p style={{ fontSize: 13, color: '#f87171', margin: '8px 0 0' }}>{linkError}</p>}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Quizzes this week', value: displayActivity.length, col: '#3b82f6' },
          { label: 'Average score', value: avgScore + '%', col: avgScore >= 75 ? '#34d399' : avgScore >= 60 ? '#f59e0b' : '#f87171' },
          { label: 'Study time (est.)', value: totalStudyTime + ' min', col: '#a78bfa' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: s.col, letterSpacing: '-.03em' }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--c-t2)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 16, padding: '24px 28px' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--c-t1)', marginBottom: 20 }}>Recent study activity</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--c-t3)' }}>Loading...</div>
        ) : displayActivity.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--c-t3)' }}>No activity yet this week.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {displayActivity.map((a, i) => {
              const score = Math.round((a.correct / a.total) * 100)
              const col = score >= 75 ? '#34d399' : score >= 60 ? '#f59e0b' : '#f87171'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: 'var(--c-bg)', border: '1px solid var(--c-line)', borderRadius: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-t1)' }}>{a.topic}</div>
                    <div style={{ fontSize: 13, color: 'var(--c-t2)', marginTop: 2 }}>
                      {new Date(a.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: col }}>{score}%</div>
                    <div style={{ fontSize: 12, color: 'var(--c-t3)' }}>{a.correct}/{a.total} correct</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
