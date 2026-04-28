'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'

const TOPICS = ['Civil War causes', 'Photosynthesis', 'Quadratic equations', 'The Great Gatsby']

function FeatureDemo() {
  const [topicIdx, setTopicIdx] = useState(0)
  const [typed, setTyped] = useState('')
  const [showCards, setShowCards] = useState(false)
  const topic = TOPICS[topicIdx]

  useEffect(() => {
    let i = 0
    let t1, t2
    setTyped('')
    setShowCards(false)

    const interval = setInterval(() => {
      i++
      setTyped(topic.slice(0, i))
      if (i >= topic.length) {
        clearInterval(interval)
        t1 = setTimeout(() => {
          setShowCards(true)
          // auto-advance to next topic after 3 s of showing results
          t2 = setTimeout(() => {
            setTopicIdx(idx => (idx + 1) % TOPICS.length)
          }, 6000)
        }, 400)
      }
    }, 85) // 85ms per character — readable but lively

    return () => { clearInterval(interval); clearTimeout(t1); clearTimeout(t2) }
  }, [topicIdx, topic])

  const cards = [
    { label: 'Flashcards', color: '#34d399' },
    { label: 'Quiz', color: '#a78bfa' },
    { label: 'Study Guide', color: '#fb923c' },
    { label: 'Nova ready', color: '#60a5fa' },
  ]

  return (
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 20, padding: 28, maxWidth: 520, margin: '0 auto' }}>
      {/* Topic indicator dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, justifyContent: 'center' }}>
        {TOPICS.map((_, i) => (
          <button key={i} onClick={() => setTopicIdx(i)} style={{ width: i === topicIdx ? 20 : 6, height: 6, borderRadius: 3, background: i === topicIdx ? '#2563eb' : '#30363d', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }}/>
        ))}
      </div>

      {/* Fake search input */}
      <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 12, padding: '12px 16px', fontSize: 15, color: '#e6edf3', marginBottom: 20, minHeight: 48, display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#8b949e" strokeWidth="1.5"><path d="M7 1a6 6 0 100 12A6 6 0 007 1zm7 14l-3-3"/></svg>
        <span style={{ flex: 1 }}>{typed}<span style={{ opacity: 0.4, animation: 'blink 1s step-end infinite' }}>|</span></span>
      </div>

      {/* Result cards */}
      {showCards && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {cards.map((c, i) => (
              <div key={c.label} style={{
                background: '#21262d', border: '1px solid ' + c.color + '40', borderRadius: 12, padding: '14px 12px',
                display: 'flex', alignItems: 'center', gap: 8,
                animation: 'cardIn 0.35s ease ' + (i * 0.07) + 's both',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }}/>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>{c.label}</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#a78bfa', marginBottom: 16 }}>
            Nova noticed this matches AP US History — materials tailored for your class
          </div>
        </>
      )}

      <span style={{ fontSize: 11, color: '#484f58' }}>Auto-advances · {TOPICS.length} topics</span>

      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: scale(0.88) translateY(6px); }
          60% { transform: scale(1.03) translateY(-2px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes blink { 0%,100%{opacity:0.4} 50%{opacity:0} }
      `}</style>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  if (loading) return <div style={{ background: '#0d1117', minHeight: '100dvh' }}/>
  if (user) return null

  const NAV_LINKS = ['Features', 'For Teachers', 'Resource Hub', 'Pricing']
  const STEPS = [
    { n: '01', title: 'Drop any topic', body: 'Paste your notes, a URL, or just type a subject. Nova reads everything you give it.', icon: 'M2 3h12v2.5H2zm0 4h8v2.5H2zm0 4h10v2H2' },
    { n: '02', title: 'Nova builds your kit', body: 'Nova generates flashcards, quizzes, and study guides — tailored to your actual class, not just generic AI output.', icon: 'M8 1l1.8 5H15l-4.4 3.2 1.7 5.2L8 11.2 3.7 14.4l1.7-5.2L1 6h5.2z' },
    { n: '03', title: 'Study, quiz, repeat', body: 'Nova stays with you through every session. Ask questions, get explanations, never study alone.', icon: 'M2 4h12M2 8h8M2 12h10' },
  ]

  return (
    <div style={{ background: '#0d1117', minHeight: '100dvh', color: '#e6edf3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid #21262d', background: 'rgba(13,17,23,0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, background: '#1d4ed8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#e6edf3' }}>Flashfo</span>
          </div>
          {/* Nav links — desktop only via inline media trick */}
          <div className="ff-desktop-only" style={{ display: 'flex', gap: 2, flex: 1, marginLeft: 12 }}>
            {NAV_LINKS.map(l => (
              <a key={l} href={'#' + l.toLowerCase().replace(/ /g,'-')} style={{ padding: '6px 12px', fontSize: 13, fontWeight: 500, color: '#8b949e', textDecoration: 'none', borderRadius: 8 }}
                onMouseEnter={e => e.currentTarget.style.color='#e6edf3'} onMouseLeave={e => e.currentTarget.style.color='#8b949e'}>{l}</a>
            ))}
          </div>
          {/* Spacer on mobile */}
          <div style={{ flex: 1 }}/>
          {/* CTAs — always visible, compact on mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <a href="/auth" style={{ padding: '7px 12px', fontSize: 13, fontWeight: 600, color: '#8b949e', textDecoration: 'none', borderRadius: 8, whiteSpace: 'nowrap' }}
              onMouseEnter={e => e.currentTarget.style.color='#e6edf3'} onMouseLeave={e => e.currentTarget.style.color='#8b949e'}>Sign in</a>
            <a href="/auth?mode=signup" style={{ padding: '8px 14px', fontSize: 13, fontWeight: 700, background: '#2563eb', color: 'white', textDecoration: 'none', borderRadius: 10, whiteSpace: 'nowrap' }}>Get started free</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(48px,8vw,96px) 20px clamp(48px,6vw,80px)', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)', fontSize: 12, fontWeight: 600, color: '#60a5fa', marginBottom: 32, letterSpacing: '0.02em' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }}/>
          Now with Nova — your AI class companion
        </div>
        <h1 style={{ fontSize: 'clamp(40px, 7vw, 76px)', fontWeight: 800, lineHeight: 1.08, margin: '0 0 28px', letterSpacing: '-0.025em' }}>
          <span style={{ background: 'linear-gradient(135deg, #e6edf3 20%, #a78bfa 80%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Study smarter.</span>
          <br/>
          <span style={{ background: 'linear-gradient(135deg, #60a5fa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Teach better.</span>
          <br/>
          <span style={{ color: '#e6edf3' }}>Together.</span>
        </h1>
        <p style={{ fontSize: 19, color: '#8b949e', lineHeight: 1.7, maxWidth: 540, margin: '0 auto 44px' }}>
          Drop any topic and Nova builds your flashcards, quizzes, and study guides — tailored to your actual class.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/auth?mode=signup" style={{ padding: '15px 32px', fontSize: 16, fontWeight: 700, background: '#2563eb', color: 'white', textDecoration: 'none', borderRadius: 14, boxShadow: '0 0 40px rgba(37,99,235,0.35)', letterSpacing: '-0.01em' }}>
            Start for free →
          </a>
          <a href="#how-it-works" style={{ padding: '15px 28px', fontSize: 16, fontWeight: 600, background: '#161b22', color: '#e6edf3', textDecoration: 'none', borderRadius: 14, border: '1px solid #30363d' }}>
            See how it works
          </a>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(40px,6vw,80px) 20px clamp(32px,4vw,60px)' }}>
        <h2 style={{ textAlign: 'center', fontSize: 34, fontWeight: 800, marginBottom: 60, color: '#e6edf3', letterSpacing: '-0.02em' }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 48 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 20, padding: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#484f58', letterSpacing: '0.1em', marginBottom: 20 }}>{s.n}</div>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"><path d={s.icon}/></svg>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e6edf3', margin: '0 0 10px' }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: '#8b949e', lineHeight: 1.65, margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>

        {/* Nova callout */}
        <div style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 24, padding: '36px 40px', textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10a3 3 0 100-6 3 3 0 000 6z"/></svg>
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#a78bfa', margin: '0 0 14px' }}>Nova is part of your class — not just a chatbot.</h3>
          <p style={{ fontSize: 15, color: '#8b949e', lineHeight: 1.7, margin: 0 }}>
            Connect your classroom and Nova learns your syllabus, tracks your homework, and preps you for every assignment.
          </p>
        </div>
      </section>

      {/* Animated Demo */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 20px clamp(60px,8vw,100px)' }}>
        <h2 style={{ textAlign: 'center', fontSize: 34, fontWeight: 800, marginBottom: 14, color: '#e6edf3', letterSpacing: '-0.02em' }}>See Nova in action</h2>
        <p style={{ textAlign: 'center', fontSize: 15, color: '#8b949e', marginBottom: 48 }}>Drop a topic and watch your study kit appear.</p>
        <FeatureDemo />
      </section>

      {/* Footer CTA */}
      <section style={{ borderTop: '1px solid #21262d', padding: 'clamp(48px,6vw,80px) 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: '#e6edf3', margin: '0 0 14px', letterSpacing: '-0.02em' }}>Ready to study smarter?</h2>
        <p style={{ fontSize: 16, color: '#8b949e', margin: '0 0 36px' }}>Join students and teachers already using Flashfo.</p>
        <a href="/auth?mode=signup" style={{ padding: '16px 40px', fontSize: 16, fontWeight: 700, background: '#2563eb', color: 'white', textDecoration: 'none', borderRadius: 14, boxShadow: '0 0 48px rgba(37,99,235,0.32)' }}>
          Get started free →
        </a>
        <div style={{ marginTop: 60, fontSize: 12, color: '#484f58' }}>© 2025 Flashfo · Study workspace</div>
      </section>

    </div>
  )
}
