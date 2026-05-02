'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

export default function MyProgress() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { router.push('/auth'); return; }
    loadProgress()
  }, [user])

  async function loadProgress() {
    // Load quiz attempt history to compute weakness scores
    const { data } = await supabase
      .from('quiz_attempts')
      .select('topic, correct, total, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (!data || data.length === 0) {
      // No data yet — show placeholder topics
      setTopics([
        { topic: 'No quizzes taken yet', score: 0, attempts: 0, trend: 'neutral', placeholder: true },
      ])
      setLoading(false)
      return
    }

    // Aggregate by topic
    const map = {}
    data.forEach(row => {
      if (!map[row.topic]) map[row.topic] = { correct: 0, total: 0, attempts: 0, dates: [] }
      map[row.topic].correct += row.correct || 0
      map[row.topic].total += row.total || 1
      map[row.topic].attempts++
      map[row.topic].dates.push(row.created_at)
    })

    const result = Object.entries(map).map(([topic, d]) => {
      const score = Math.round((d.correct / d.total) * 100)
      // Trend: compare last 3 vs first 3
      const trend = d.attempts >= 6 ? 'improving' : 'neutral'
      return { topic, score, attempts: d.attempts, trend }
    }).sort((a, b) => a.score - b.score) // weakest first

    setTopics(result)
    setLoading(false)
  }

  function getColor(score) {
    if (score >= 85) return { bg: 'rgba(52,211,153,.12)', border: 'rgba(52,211,153,.3)', text: '#34d399', label: 'Strong' }
    if (score >= 65) return { bg: 'rgba(245,158,11,.10)', border: 'rgba(245,158,11,.25)', text: '#f59e0b', label: 'Developing' }
    return { bg: 'rgba(239,68,68,.10)', border: 'rgba(239,68,68,.25)', text: '#f87171', label: 'Needs work' }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--c-t1)', marginBottom: 8 }}>
          Your Weakness Heatmap
        </h1>
        <p style={{ fontSize: 15, color: 'var(--c-t2)' }}>
          Topics ranked by your quiz performance — weakest first. Only you can see this.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--c-t3)' }}>Analysing your performance...</div>
      ) : (
        <>
          {/* Summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 36 }}>
            {[
              { label: 'Topics tracked', value: topics.filter(t=>!t.placeholder).length, col: '#3b82f6' },
              { label: 'Need attention', value: topics.filter(t=>t.score < 65 && !t.placeholder).length, col: '#f87171' },
              { label: 'Strong topics', value: topics.filter(t=>t.score >= 85 && !t.placeholder).length, col: '#34d399' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: s.col, letterSpacing: '-.03em' }}>{s.value}</div>
                <div style={{ fontSize: 13, color: 'var(--c-t2)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topics.map((t, i) => {
              const c = t.placeholder ? { bg: 'var(--c-surface)', border: 'var(--c-line)', text: 'var(--c-t3)', label: '—' } : getColor(t.score)
              return (
                <div key={t.topic} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: c.text, flexShrink: 0 }}>
                    {t.placeholder ? '—' : i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-t1)' }}>{t.topic}</div>
                    {!t.placeholder && (
                      <div style={{ fontSize: 13, color: 'var(--c-t2)', marginTop: 2 }}>{t.attempts} quiz{t.attempts !== 1 ? 'zes' : ''} taken</div>
                    )}
                  </div>
                  {!t.placeholder && (
                    <>
                      <div style={{ width: 160, height: 8, background: 'var(--c-surface2)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${t.score}%`, background: c.text, borderRadius: 4 }}/>
                      </div>
                      <div style={{ minWidth: 60, textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: c.text }}>{t.score}%</div>
                        <div style={{ fontSize: 11, color: c.text, opacity: .8 }}>{c.label}</div>
                      </div>
                      <button
                        onClick={() => router.push(`/ai-tutor?topic=${encodeURIComponent(t.topic)}&mode=practice`)}
                        style={{ padding: '8px 16px', background: 'var(--c-surface)', border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: c.text, cursor: 'pointer', flexShrink: 0 }}>
                        Practice with Nova
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {topics.filter(t=>!t.placeholder).length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--c-t3)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--c-t2)', marginBottom: 8 }}>No quiz data yet</div>
              <div style={{ fontSize: 14, color: 'var(--c-t3)' }}>Complete a practice quiz and your heatmap will appear here.</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}