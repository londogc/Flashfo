'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const TOOLS = [
  { icon: 'M4 3h9a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zM2 5H1v7a1 1 0 001 1h9', label: 'Flashcards', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  { icon: 'M6 5.5a2.5 2.5 0 014.5 1.5c0 1.5-1.5 2-2 3V11m0 2.5v.5', label: 'Quiz', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  { icon: 'M1 3h6.5L9 4.5h6V13H9l-1.5-1.5H1zm0 0v10', label: 'Study Guide', color: '#fb923c', bg: 'rgba(251,146,60,0.15)' },
  { icon: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10a3 3 0 100-6 3 3 0 000 6z', label: 'Nova ready', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
]

const TOPICS = ['Civil War causes', 'Photosynthesis', 'Quadratic equations', 'The Great Gatsby', 'French Revolution']

export default function LandingPage() {
  const router = useRouter()
  const [dark, setDark] = useState(false)
  const [typedText, setTypedText] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [topicIdx, setTopicIdx] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    const d = localStorage.getItem('ff-theme') === 'dark' || (!localStorage.getItem('ff-theme') && window.matchMedia('(prefers-color-scheme:dark)').matches)
    setDark(d)
    // Redirect logged-in users to dashboard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })
  }, [])

  useEffect(() => {
    runDemo(topicIdx)
    return () => clearTimeout(timerRef.current)
  }, [topicIdx])

  function runDemo(idx) {
    const phrase = TOPICS[idx % TOPICS.length]
    setTypedText(''); setShowResults(false); setShowNote(false)
    let ci = 0
    function typeChar() {
      ci++
      setTypedText(phrase.substring(0, ci))
      if (ci < phrase.length) timerRef.current = setTimeout(typeChar, 70)
      else timerRef.current = setTimeout(() => {
        setShowResults(true)
        timerRef.current = setTimeout(() => setShowNote(true), 400)
      }, 500)
    }
    timerRef.current = setTimeout(typeChar, 400)
  }

  const c = dark ? {
    bg: '#0d1117', surface: '#161b22', surface2: '#21262d', line: '#30363d',
    t1: '#e6edf3', t2: '#8b949e', t3: '#484f58'
  } : {
    bg: '#f1f5f9', surface: '#ffffff', surface2: '#f8fafc', line: '#e8ecf0',
    t1: '#0f172a', t2: '#475569', t3: '#94a3b8'
  }

  return (
    <div style={{ minHeight: '100dvh', background: c.bg, color: c.t1, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Nav */}
      <nav style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 32px', borderBottom: `1px solid ${c.line}`, background: c.surface, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, background: '#1d4ed8', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 14 14" fill="white"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: c.t1 }}>Flashfo</span>
        </div>
        <div style={{ display: 'flex', gap: 24, marginLeft: 32 }}>
          {['Features', 'For Teachers', 'Resource Hub', 'Pricing'].map(l => (
            <span key={l} style={{ fontSize: 13, color: c.t2, cursor: 'pointer', fontWeight: 500 }}>{l}</span>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/auth" style={{ fontSize: 13, color: c.t2, textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
          <Link href="/auth" style={{ background: '#2563eb', color: 'white', borderRadius: 9, padding: '8px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            Get started free →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '80px 32px 60px', textAlign: 'center', maxWidth: 760, margin: '0 auto', position: 'relative' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: dark ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 20, padding: '4px 14px', marginBottom: 24 }}>
          <span style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%', display: 'inline-block' }}></span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#60a5fa' }}>Now in v6.0 — Resource Hub is live</span>
        </div>
        <h1 style={{ fontSize: 'clamp(36px,6vw,60px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em', marginBottom: 20, background: dark ? 'linear-gradient(135deg,#e6edf3 0%,#e6edf3 40%,#93c5fd 65%,#c4b5fd 100%)' : 'linear-gradient(135deg,#0f172a 0%,#1e3a8a 60%,#7c3aed 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Study smarter.<br/>Teach better.<br/>Together.
        </h1>
        <p style={{ fontSize: 17, color: c.t2, maxWidth: 520, margin: '0 auto 32px', lineHeight: 1.7 }}>
          Flashfo gives students an AI tutor that knows their class, and gives teachers tools to build, assign, and track — all in one calm workspace.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/auth" style={{ background: '#2563eb', color: 'white', borderRadius: 12, padding: '13px 28px', fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Start for free →
          </Link>
          <button style={{ background: 'transparent', color: c.t2, border: `1.5px solid ${c.line}`, borderRadius: 12, padding: '13px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Watch demo
          </button>
        </div>
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{ display: 'flex' }}>
            {['#1d4ed8','#059669','#7c3aed'].map((bg,i) => (
              <div key={i} style={{ width: 24, height: 24, borderRadius: '50%', background: bg, border: `2px solid ${c.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 700, marginRight: i < 2 ? -6 : 0 }}>
                {['A','B','C'][i]}
              </div>
            ))}
          </div>
          <span style={{ fontSize: 12, color: c.t3 }}>Trusted by early students and teachers</span>
        </div>
      </section>

      {/* Nova demo */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px 64px' }}>
        <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 20, padding: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: c.t1, marginBottom: 4 }}>See Nova in action</div>
            <div style={{ fontSize: 12, color: c.t3 }}>Type any topic and watch what Nova builds for you</div>
          </div>

          {/* Typing input */}
          <div style={{ background: c.surface2, border: '1.5px solid #3b82f6', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, boxShadow: '0 0 0 4px rgba(37,99,235,0.08)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="7"/><circle cx="8" cy="8" r="3"/></svg>
            <span style={{ fontSize: 14, color: c.t1, flex: 1, minHeight: 20 }}>{typedText}</span>
            <span style={{ display: 'inline-block', width: 2, height: 16, background: '#60a5fa', animation: 'blink 0.8s ease infinite' }}></span>
          </div>

          {/* Results */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, opacity: showResults ? 1 : 0, transition: 'opacity 0.5s', marginBottom: 12 }}>
            {TOOLS.map((t, i) => (
              <div key={t.label} style={{ background: c.surface2, border: `1px solid ${c.line}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, transform: showResults ? 'scale(1)' : 'scale(0.9)', transition: `transform 0.3s ${i*0.08}s, opacity 0.3s ${i*0.08}s`, opacity: showResults ? 1 : 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={t.color} strokeWidth="1.5" strokeLinecap="round"><path d={t.icon}/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.t1 }}>{t.label === 'Flashcards' ? '15 Flashcards' : t.label === 'Quiz' ? '10-question Quiz' : t.label}</div>
                  <div style={{ fontSize: 10, color: c.t3, marginTop: 1 }}>{t.label === 'Nova ready' ? 'Ask anything about this topic' : 'Auto-generated'}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Class context note */}
          <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, opacity: showNote ? 1 : 0, transition: 'opacity 0.5s', marginBottom: 14 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="7"/><circle cx="8" cy="8" r="3"/></svg>
            <span style={{ fontSize: 12, color: c.t2 }}>Nova noticed this matches <span style={{ color: '#a78bfa', fontWeight: 600 }}>your AP US History class</span> — materials tailored to your actual syllabus</span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button onClick={() => setTopicIdx(i => i+1)} style={{ background: 'transparent', border: `1px solid ${c.line}`, borderRadius: 8, padding: '7px 16px', fontSize: 12, color: c.t2, cursor: 'pointer', fontWeight: 600 }}>Try another topic ↺</button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: c.t3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>How it works</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: c.t1, letterSpacing: '-0.02em' }}>From topic to ready — in seconds</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', alignItems: 'center', gap: 12 }}>
          {[
            { step: '01', icon: 'M8 1l1.8 5H15l-4.4 3.2 1.7 5.2L8 11.2 3.7 14.4l1.7-5.2L1 6h5.2z', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', title: 'Drop any topic', desc: 'Paste notes, a URL, or just type a subject — Nova figures out the rest.' },
            null,
            { step: '02', icon: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10a3 3 0 100-6 3 3 0 000 6z', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', title: 'Nova builds your kit', desc: 'Flashcards, quizzes, study guides — tailored to your actual class and syllabus. Nova is part of your classroom, not just a chatbot.' },
            null,
            { step: '03', icon: 'M6 5.5a2.5 2.5 0 014.5 1.5c0 1.5-1.5 2-2 3V11m0 2.5v.5', color: '#34d399', bg: 'rgba(52,211,153,0.15)', title: 'Study, quiz, repeat', desc: 'Nova stays with you through every session — ask questions, get explanations, never study alone again.' },
          ].map((item, i) => item === null ? (
            <div key={i} style={{ color: c.t3, fontSize: 20, textAlign: 'center' }}>→</div>
          ) : (
            <div key={i} style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 18, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: item.color, letterSpacing: '0.1em', marginBottom: 12 }}>STEP {item.step}</div>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke={item.color} strokeWidth="1.5" strokeLinecap="round"><path d={item.icon}/></svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: c.t1, marginBottom: 8 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: c.t2, lineHeight: 1.65 }}>{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Nova class callout */}
        <div style={{ marginTop: 20, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 15 }}>N</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.t1, marginBottom: 4 }}>Nova is part of your class — not just a chatbot</div>
            <div style={{ fontSize: 12, color: c.t2, lineHeight: 1.6 }}>Connect your classroom and Nova learns your syllabus, tracks your homework, and preps you for every assignment automatically. The more your class uses Flashfo, the smarter Nova gets for everyone in it.</div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: c.t1, letterSpacing: '-0.02em' }}>Everything you need, nothing you don't</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {[
            { icon: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10a3 3 0 100-6 3 3 0 000 6z', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', title: 'Nova AI Tutor', desc: 'Class-aware AI that knows your assignments, grade level, and curriculum. Always there, never judgmental.' },
            { icon: 'M8 1a4 4 0 100 8 4 4 0 000-8zm-6 14c0-3.3 2.7-6 6-6s6 2.7 6 6', color: '#34d399', bg: 'rgba(52,211,153,0.15)', title: 'Teacher Portal', desc: 'Create classes, post homework, build quizzes and track every student — all from one dashboard.' },
            { icon: 'M1 4h5l2 2h7v8H1zm0 2v8', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', title: 'Resource Hub', desc: 'Browse teacher-curated lessons, quizzes and flashcard decks. Share your best work with others.' },
          ].map(f => (
            <div key={f.title} style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 18, padding: 24 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke={f.color} strokeWidth="1.5" strokeLinecap="round"><path d={f.icon}/></svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: c.t1, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: c.t2, lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA footer */}
      <section style={{ background: c.surface, borderTop: `1px solid ${c.line}`, padding: '60px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: c.t1, marginBottom: 14, letterSpacing: '-0.02em' }}>Ready to study smarter?</div>
        <div style={{ fontSize: 15, color: c.t2, marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>Join students and teachers already using Flashfo. Free to start, no credit card needed.</div>
        <Link href="/auth" style={{ background: '#2563eb', color: 'white', borderRadius: 12, padding: '14px 32px', fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Get started free →
        </Link>
      </section>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  )
}