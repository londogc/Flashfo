'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

const TOPICS = ['Civil War causes','Photosynthesis','Quadratic equations','The Great Gatsby']
const CARDS = {
  'Civil War causes':[
    {q:'What year did the Civil War begin?',a:'1861'},
    {q:'Primary economic difference between North and South?',a:'Industrial vs agricultural'},
    {q:'What was the Missouri Compromise?',a:'Limited slavery expansion to new territories'},
  ],
  'Photosynthesis':[
    {q:'What is the main product of photosynthesis?',a:'Glucose (C₆H₁₂O₆)'},
    {q:'Where does the light reaction occur?',a:'Thylakoid membrane'},
    {q:'What gas is released as a byproduct?',a:'Oxygen'},
  ],
  'Quadratic equations':[
    {q:'What is the quadratic formula?',a:'x = (−b ± √(b²−4ac)) / 2a'},
    {q:'What is the discriminant?',a:'b² − 4ac'},
    {q:'When does a quadratic have no real roots?',a:'When discriminant < 0'},
  ],
  'The Great Gatsby':[
    {q:'Who narrates the story?',a:'Nick Carraway'},
    {q:'What does the green light symbolize?',a:"Gatsby's hopes and the American Dream"},
    {q:'In what era is the novel set?',a:'The Roaring Twenties (1922)'},
  ],
}

function AnimatedDemo() {
  const [topicIdx, setTopicIdx] = useState(0)
  const [typed, setTyped] = useState('')
  const [showCards, setShowCards] = useState(false)
  const topic = TOPICS[topicIdx]
  const timerRef = useRef(null)

  useEffect(() => {
    setTyped('')
    setShowCards(false)
    let charIdx = 0
    const typeNext = () => {
      charIdx++
      setTyped(topic.slice(0, charIdx))
      if (charIdx < topic.length) {
        timerRef.current = setTimeout(typeNext, 85)
      } else {
        timerRef.current = setTimeout(() => setShowCards(true), 400)
      }
    }
    timerRef.current = setTimeout(typeNext, 300)
    return () => clearTimeout(timerRef.current)
  }, [topicIdx, topic])

  useEffect(() => {
    if (!showCards) return
    timerRef.current = setTimeout(() => setTopicIdx(i => (i+1) % TOPICS.length), 6000)
    return () => clearTimeout(timerRef.current)
  }, [showCards])

  const cards = CARDS[topic] || []

  return (
    <div style={{ background:'#0d1117', border:'1px solid #30363d', borderRadius:12, padding:'12px 16px', maxWidth:580, margin:'0 auto', minHeight:440, fontFamily:'ui-monospace,monospace', fontSize:13 }}>
      <div style={{ display:'flex', gap:6, marginBottom:12 }}>
        {['#ff5f57','#febc2e','#28c840'].map(c=>(
          <div key={c} style={{ width:10,height:10,borderRadius:'50%',background:c }}/>
        ))}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, background:'#161b22', borderRadius:8, padding:'8px 12px', marginBottom:12, border:'1px solid #30363d' }}>
        <span style={{ color:'#8b949e' }}>›</span>
        <span style={{ color:'#e6edf3', flex:1 }}>{typed}<span style={{ color:'#2563eb', animation:'blink 1s step-end infinite' }}>|</span></span>
      </div>
      <div style={{ minHeight:320, transition:'opacity 0.4s', opacity: showCards ? 1 : 0 }}>
        {(
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ color:'#8b949e', fontSize:11, marginBottom:2 }}>✦ Nova generated {cards.length} flashcards</div>
            {cards.map((c,i) => (
              <div key={i} style={{ background:'#161b22', borderRadius:8, padding:'10px 14px', border:'1px solid #30363d', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                <span style={{ color:'#e6edf3', flex:1 }}>{c.q}</span>
                <span style={{ color:'#34d399', fontSize:11, whiteSpace:'nowrap' }}>{c.a}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display:'flex', alignItems:'center', gap:10, color:'#8b949e', fontSize:13, padding:'24px 8px' }}>
            <span style={{ width:8,height:8,borderRadius:'50%',background:'#a78bfa',display:'inline-block',flexShrink:0 }} className="nova-thinking"/>
            Nova is building your flashcard kit…
          </div>
        )}
      </div>
      <div style={{ display:'flex', gap:6, marginTop:12, justifyContent:'center' }}>
        {TOPICS.map((_,i) => (
          <button key={i} onClick={() => setTopicIdx(i)} style={{ width:i===topicIdx?20:6,height:6,borderRadius:3,background:i===topicIdx?'#2563eb':'#30363d',border:'none',cursor:'pointer',padding:0,transition:'width 0.3s,background 0.2s' }}/>
        ))}
      </div>
    </div>
  )
}

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  if (loading) return <div style={{ background:'#0d1117', minHeight:'100dvh' }}/>

  return (
    <div style={{ background:'#0d1117', minHeight:'100dvh', color:'#e6edf3', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* ── Nav ── */}
      <nav style={{ position:'sticky',top:0,zIndex:50,background:'rgba(13,17,23,0.92)',backdropFilter:'blur(12px)',borderBottom:'1px solid #21262d' }}>
        <div style={{ maxWidth:1200,margin:'0 auto',padding:'0 16px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28,height:28,background:'#1d4ed8',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#fff' }}>F</div>
            <span style={{ fontWeight:600, fontSize:16 }}>Flashfo</span>
          </div>
          <div className="lp-nav-links" style={{ display:'flex', gap:28, fontSize:13 }}>
            {['Features','For Teachers','Resource Hub','Pricing'].map(l=>(
              <a key={l} href="#" style={{ color:'#8b949e', textDecoration:'none' }}>{l}</a>
            ))}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <a href="/sign-in" style={{ color:'#8b949e', fontSize:13, textDecoration:'none' }}>Sign in</a>
            <a href="/sign-up" style={{ background:'#2563eb', color:'#fff', fontSize:13, fontWeight:500, padding:'7px 14px', borderRadius:8, textDecoration:'none' }}>Get started free</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ maxWidth:1200, margin:'0 auto', padding:'80px 16px 64px', textAlign:'center' }}>
        <div style={{ display:'inline-flex',alignItems:'center',gap:6,background:'rgba(167,139,250,0.08)',border:'1px solid rgba(167,139,250,0.2)',borderRadius:20,padding:'4px 12px',fontSize:12,color:'#a78bfa',marginBottom:24 }}>
          <span style={{ width:6,height:6,borderRadius:'50%',background:'#a78bfa',display:'inline-block' }}/>
          Powered by Nova AI
        </div>
        <h1 style={{ fontSize:'clamp(32px,6vw,64px)',fontWeight:700,lineHeight:1.1,marginBottom:20,background:'linear-gradient(135deg,#e6edf3 0%,#a78bfa 50%,#2563eb 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>
          Study smarter.<br/>Teach better. Together.
        </h1>
        <p style={{ fontSize:18, color:'#8b949e', maxWidth:520, margin:'0 auto 36px', lineHeight:1.6 }}>
          Nova builds personalised flashcards, quizzes, and study guides in seconds — tailored to your exact curriculum.
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <a href="/sign-up" style={{ background:'#2563eb',color:'#fff',fontSize:15,fontWeight:600,padding:'12px 24px',borderRadius:10,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:8 }}>
            Get started free <span>→</span>
          </a>
          <button onClick={() => document.getElementById('nova-demo')?.scrollIntoView({behavior:'smooth'})} style={{ background:'transparent',color:'#e6edf3',fontSize:15,fontWeight:500,padding:'12px 24px',borderRadius:10,border:'1px solid #30363d',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8 }}>
            <span style={{ width:6,height:6,borderRadius:'50%',background:'#a78bfa',display:'inline-block' }}/>
            See Nova in action
          </button>
        </div>
      </section>

      {/* ── How it works — flowchart ── */}
      <section id="how-it-works" style={{ maxWidth:960, margin:'0 auto', padding:'0 16px 80px' }}>
        <p style={{ textAlign:'center',fontSize:12,color:'#484f58',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:56 }}>How it works</p>
        <div style={{ display:'flex', alignItems:'stretch', justifyContent:'center', gap:0 }}>
          {[
            { step:'01', icon:'📋', label:'Drop any topic', desc:'Type a subject, paste notes, or pick a curriculum standard.', color:'#2563eb', bg:'rgba(37,99,235,0.08)', border:'rgba(37,99,235,0.25)' },
            { step:'02', icon:'✦', label:'Nova builds your kit', desc:'Flashcards, a study guide, and a quiz — ready in seconds.', color:'#a78bfa', bg:'rgba(167,139,250,0.08)', border:'rgba(167,139,250,0.25)' },
            { step:'03', icon:'🎯', label:'Study, quiz, repeat', desc:'Spaced repetition brings back what needs work. Share with one link.', color:'#34d399', bg:'rgba(52,211,153,0.08)', border:'rgba(52,211,153,0.25)' },
          ].map((s, i) => (
            <div key={s.step} style={{ display:'flex', alignItems:'stretch', flex:1, minWidth:0 }}>
              {/* Node */}
              <div style={{ flex:1, background:s.bg, border:'1px solid '+s.border, borderRadius:14, padding:'28px 24px', display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:s.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'#fff', fontWeight:700, flexShrink:0 }}>{s.step}</div>
                  <span style={{ fontSize:18 }}>{s.icon}</span>
                </div>
                <p style={{ fontWeight:600, fontSize:15, color:'#e6edf3', margin:0 }}>{s.label}</p>
                <p style={{ fontSize:13, color:'#8b949e', lineHeight:1.6, margin:0 }}>{s.desc}</p>
              </div>
              {/* Arrow connector (between nodes) */}
              {i < 2 && (
                <div style={{ width:40, flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 }}>
                  <div style={{ width:24, height:1, background:'#30363d' }}/>
                  <div style={{ width:0, height:0, borderTop:'5px solid transparent', borderBottom:'5px solid transparent', borderLeft:'7px solid #30363d' }}/>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Mobile: vertical flow */}
        <style>{'.fc-mobile{display:none}@media(max-width:640px){.fc-mobile{display:flex}.fc-desktop{display:none!important}}'}</style>
      </section>

      {/* ── Nova in action demo ── */}
      <section id="nova-demo" style={{ borderTop:'1px solid #21262d', borderBottom:'1px solid #21262d', padding:'80px 16px', background:'#0a0e14' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', textAlign:'center' }}>
          <p style={{ fontSize:12,color:'#484f58',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:16 }}>Nova in action</p>
          <h2 style={{ fontSize:'clamp(24px,4vw,40px)', fontWeight:700, marginBottom:12 }}>Watch Nova work</h2>
          <p style={{ color:'#8b949e', marginBottom:48, fontSize:15 }}>Type any topic and Nova builds your complete study kit instantly.</p>
          <AnimatedDemo/>
        </div>
      </section>

      {/* ── Nova callout ── */}
      <section style={{ maxWidth:1200, margin:'0 auto', padding:'80px 16px' }}>
        <div style={{ background:'rgba(167,139,250,0.05)',border:'1px solid rgba(167,139,250,0.18)',borderRadius:16,padding:'40px 48px',display:'flex',gap:40,alignItems:'center',flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:260 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <span style={{ width:8,height:8,borderRadius:'50%',background:'#34d399',display:'inline-block' }} className="nova-thinking"/>
              <span style={{ fontSize:12, color:'#a78bfa', fontWeight:600, letterSpacing:'0.08em' }}>NOVA</span>
            </div>
            <h2 style={{ fontSize:'clamp(20px,3vw,32px)', fontWeight:700, marginBottom:12, lineHeight:1.2 }}>
              Nova is part of your class<br/>— not just a chatbot
            </h2>
            <p style={{ color:'#8b949e', fontSize:15, lineHeight:1.6 }}>Nova learns which classes you're in, what you're studying, and where you're stuck. Every resource she creates is built around your exact curriculum.</p>
          </div>
          <div style={{ flex:'0 0 auto', display:'flex', flexDirection:'column', gap:12 }}>
            {['Personalised to your syllabus','Aware of your teacher\'s assignments','Remembers what you find hard','Works across all your subjects'].map(f => (
              <div key={f} style={{ display:'flex', alignItems:'center', gap:10, fontSize:14, color:'#e6edf3' }}>
                <span style={{ color:'#34d399', fontWeight:600, fontSize:16 }}>✓</span>{f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section style={{ background:'#161b22', borderTop:'1px solid #21262d', padding:'80px 16px', textAlign:'center' }}>
        <h2 style={{ fontSize:'clamp(24px,4vw,40px)', fontWeight:700, marginBottom:16 }}>Ready to study smarter?</h2>
        <p style={{ color:'#8b949e', fontSize:16, marginBottom:32 }}>Join thousands of students and teachers already using Flashfo.</p>
        <a href="/sign-up" style={{ background:'#2563eb', color:'#fff', fontSize:15, fontWeight:600, padding:'14px 28px', borderRadius:10, textDecoration:'none' }}>Get started free →</a>
      </section>

    </div>
  )
}
