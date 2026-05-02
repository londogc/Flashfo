'use client'
import { useState, useEffect } from 'react'

const Ico = ({d, s=14}) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
)
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

export default function TeacherInsights() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(null)
  const [insights, setInsights] = useState({})

  useEffect(() => {
    if (!user) { router.push('/auth'); return }
    loadSessions()
  }, [user])

  async function loadSessions() {
    const { data } = await supabase
      .from('live_quiz_sessions')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setSessions(data || [])
    setLoading(false)
  }

  async function generateInsight(session) {
    setGenerating(session.id)
    const response = await fetch('/api/nova/insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, sessionData: session })
    })
    const data = await response.json()
    setInsights(prev => ({ ...prev, [session.id]: data.insight }))
    setGenerating(null)
  }

  const placeholderSessions = [
    { id: 'demo1', topic: 'Photosynthesis', subject: 'AP Biology', student_count: 28, avg_score: 74, created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'demo2', topic: 'The French Revolution', subject: 'AP US History', student_count: 24, avg_score: 61, created_at: new Date(Date.now() - 172800000).toISOString() },
  ]

  const displaySessions = sessions.length > 0 ? sessions : placeholderSessions

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--c-t1)', marginBottom: 8 }}>
          Nova Insight Feed
        </h1>
        <p style={{ fontSize: 15, color: 'var(--c-t2)' }}>
          After each live quiz, Nova generates a 3-sentence class summary so you know exactly what to do next lesson.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--c-t3)' }}>Loading sessions...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {displaySessions.map(s => (
            <div key={s.id} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 16, padding: '28px 32px' }}>
              {/* Session header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--c-t1)', marginBottom: 4 }}>{s.topic}</div>
                  <div style={{ fontSize: 13, color: 'var(--c-t2)' }}>{s.subject} · {s.student_count} students · {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.avg_score >= 75 ? '#34d399' : s.avg_score >= 60 ? '#f59e0b' : '#f87171' }}>{s.avg_score}%</div>
                    <div style={{ fontSize: 11, color: 'var(--c-t3)' }}>class avg</div>
                  </div>
                </div>
              </div>

              {/* Insight */}
              {insights[s.id] ? (
                <div style={{ background: 'rgba(167,139,250,.06)', border: '1px solid rgba(167,139,250,.2)', borderRadius: 12, padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa' }}/>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', letterSpacing: '.08em', textTransform: 'uppercase' }}>Nova Insight</span>
                  </div>
                  <p style={{ fontSize: 15, color: 'var(--c-t1)', lineHeight: 1.65, margin: 0 }}>{insights[s.id]}</p>
                </div>
              ) : (
                <button
                  onClick={() => generateInsight(s)}
                  disabled={generating === s.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', background: 'rgba(167,139,250,.08)', border: '1px solid rgba(167,139,250,.2)', borderRadius: 10, cursor: generating === s.id ? 'default' : 'pointer', color: '#a78bfa', fontSize: 14, fontWeight: 600 }}>
                  <Ico d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a4 4 0 100 8 4 4 0 000-8zm0 3a1 1 0 100 2 1 1 0 000-2z" s={15}/>
                  {generating === s.id ? 'Nova is thinking...' : 'Generate Nova Insight'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}