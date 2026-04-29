'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'

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

const QUIZ = {
  'Civil War causes': { q:'What was the primary cause of Southern secession?', opts:['Economic competition','Slavery & states\' rights','Border disputes','Religious freedom'], correct:1 },
  'Photosynthesis':   { q:'Where does the light-dependent reaction occur?', opts:['Cell wall','Nucleus','Chloroplast stroma','Thylakoid membrane'], correct:3 },
  'Quadratic equations': { q:'When does a quadratic have no real roots?', opts:['Discriminant > 0','Discriminant = 0','Discriminant < 0','Coefficient = 0'], correct:2 },
  'The Great Gatsby':    { q:'What social class does Gatsby represent?', opts:['Old money','Middle class','Newly rich','Working poor'], correct:2 },
}

function ProductDemo() {
  const [topicIdx, setTopicIdx] = useState(0)
  const [phase, setPhase] = useState(0)
  const [typed, setTyped] = useState('')
  const [visibleCards, setVisibleCards] = useState(0)
  const [selectedOpt, setSelectedOpt] = useState(null)
  const [score, setScore] = useState(0)
  const [fading, setFading] = useState(false)
  const t = useRef(null)
  const topic = TOPICS[topicIdx]
  const cards = CARDS[topic] || []
  const quiz = QUIZ[topic]

  useEffect(() => {
    const delay = (fn, ms) => { t.current = setTimeout(fn, ms) }
    const clear = () => clearTimeout(t.current)
    if (phase === 0) {
      setTyped(''); setVisibleCards(0); setSelectedOpt(null); setScore(0)
      let i = 0
      const type = () => { setTyped(topic.slice(0,i)); i++; i <= topic.length ? delay(type, 60) : delay(() => setPhase(1), 900) }
      delay(type, 400)
      return clear
    }
    if (phase === 1) {
      setVisibleCards(0)
      let c = 0
      const show = () => { setVisibleCards(++c); c < cards.length ? delay(show, 650) : delay(() => setPhase(2), 1400) }
      delay(show, 1300)
      return clear
    }
    if (phase === 2) {
      setSelectedOpt(null)
      delay(() => { setSelectedOpt(quiz.correct); delay(() => setPhase(3), 1450) }, 2300)
      return clear
    }
    if (phase === 3) {
      let s = 0
      const count = () => { s = Math.min(s+5,80); setScore(s); s < 80 ? delay(count,25) : delay(()=>{ setFading(true); delay(()=>{ setTopicIdx(i=>(i+1)%TOPICS.length); setPhase(0); setFading(false) },400) },2800) }
      delay(count, 300)
      return clear
    }
  }, [phase, topicIdx])

  const phases = ['Type a topic','Nova generates','Take a quiz','See your score']
  const frameH = 300

  return (
    <div style={{ maxWidth:640, margin:'0 auto', opacity:fading?0:1, transition:'opacity 0.35s' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:20, marginBottom:20 }}>
        {phases.map((label,i)=>(
          <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, opacity:phase===i?1:0.3, transition:'opacity 0.3s' }}>
            <div style={{ width:8,height:8,borderRadius:'50%',background:phase===i?'#a78bfa':'#30363d',transition:'background 0.3s' }}/>
            <span style={{ fontSize:10,color:'#8b949e',whiteSpace:'nowrap' }}>{label}</span>
          </div>
        ))}
      </div>
      <div style={{ borderRadius:12,overflow:'hidden',border:'1px solid #30363d',background:'#0d1117' }}>
        <div style={{ background:'#161b22',padding:'9px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:'1px solid #21262d' }}>
          <div style={{ display:'flex',gap:5 }}>
            {['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{ width:10,height:10,borderRadius:'50%',background:c }}/>)}
          </div>
          <div style={{ flex:1,background:'#0d1117',borderRadius:5,padding:'3px 10px',fontSize:11,color:'#484f58',textAlign:'left',border:'1px solid #21262d' }}>flashfo.org/create</div>
        </div>
        <div style={{ padding:'20px',minHeight:frameH,fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
          {phase===0&&(
            <div>
              <p style={{ color:'#8b949e',fontSize:12,marginBottom:8,textAlign:'left' }}>What do you want to study?</p>
              <div style={{ background:'#161b22',border:'1px solid #30363d',borderRadius:8,padding:'12px 14px',fontSize:14,color:'#e6edf3',textAlign:'left',minHeight:42 }}>
                {typed}<span style={{ borderRight:'2px solid #a78bfa',animation:'blink 1s step-end infinite',marginLeft:1 }}>&nbsp;</span>
              </div>
              <div style={{ marginTop:12,display:'flex',gap:8 }}>
                <div style={{ height:32,padding:'0 14px',background:'rgba(167,139,250,0.12)',borderRadius:6,display:'flex',alignItems:'center',fontSize:12,color:'#a78bfa',border:'1px solid rgba(167,139,250,0.2)' }}>✦ Generate kit</div>
              </div>
            </div>
          )}
          {phase===1&&(
            <div>
              <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:14,color:'#8b949e',fontSize:12 }}>
                <span style={{ display:'inline-block',width:8,height:8,borderRadius:'50%',background:'#a78bfa',flexShrink:0 }} className="nova-thinking"/>
                Nova built <strong style={{ color:'#e6edf3',fontWeight:500,margin:'0 4px' }}>{visibleCards}</strong> of {cards.length} cards for &ldquo;{topic}&rdquo;
              </div>
              {cards.slice(0,visibleCards).map((c,i)=>(
                <div key={i} style={{ background:'#161b22',border:'1px solid #30363d',borderRadius:8,padding:'10px 14px',marginBottom:8,display:'flex',justifyContent:'space-between',gap:12,animation:'card-drop 0.3s ease both' }}>
                  <span style={{ color:'#e6edf3',fontSize:13,textAlign:'left' }}>{c.q}</span>
                  <span style={{ color:'#34d399',fontSize:11,whiteSpace:'nowrap' }}>{c.a}</span>
                </div>
              ))}
            </div>
          )}
          {phase===2&&quiz&&(
            <div>
              <div style={{ marginBottom:10,color:'#484f58',fontSize:10,letterSpacing:'0.08em',textAlign:'left' }}>QUIZ · {topic.toUpperCase()}</div>
              <p style={{ color:'#e6edf3',fontSize:14,fontWeight:500,marginBottom:14,textAlign:'left' }}>{quiz.q}</p>
              <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                {quiz.opts.map((opt,i)=>(
                  <div key={i} style={{ padding:'9px 14px',borderRadius:8,fontSize:13,textAlign:'left',border:selectedOpt===i?'1px solid #34d399':'1px solid #30363d',background:selectedOpt===i?'rgba(52,211,153,0.08)':'#161b22',color:selectedOpt===i?'#34d399':'#e6edf3',transition:'all 0.25s' }}>
                    {selectedOpt===i&&<span style={{ marginRight:6 }}>✓</span>}{opt}
                  </div>
                ))}
              </div>
            </div>
          )}
          {phase===3&&(
            <div style={{ textAlign:'center',padding:'24px 0' }}>
              <div style={{ width:80,height:80,borderRadius:'50%',border:'3px solid #34d399',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',background:'rgba(52,211,153,0.06)' }}>
                <span style={{ fontSize:22,fontWeight:700,color:'#34d399' }}>{score}%</span>
              </div>
              <p style={{ color:'#e6edf3',fontWeight:600,marginBottom:4 }}>Study set complete</p>
              <p style={{ color:'#8b949e',fontSize:13,marginBottom:16 }}>Your flashcards, quiz &amp; guide are ready.</p>
              <div style={{ display:'flex',gap:8,justifyContent:'center' }}>
                {['Flashcards','Quiz','Study Guide'].map(label=>(
                  <div key={label} style={{ padding:'6px 12px',borderRadius:6,background:'#161b22',border:'1px solid #30363d',fontSize:11,color:'#8b949e' }}>{label}</div>
                ))}
              </div>
            </div>
          )}
        </div>
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
            <a href="/auth" style={{ color:'#8b949e', fontSize:13, textDecoration:'none' }}>Sign in</a>
            <a href="/auth?mode=signup" style={{ background:'#2563eb', color:'#fff', fontSize:13, fontWeight:500, padding:'7px 14px', borderRadius:8, textDecoration:'none' }}>Get started free</a>
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
          <a href="/auth?mode=signup" style={{ background:'#2563eb',color:'#fff',fontSize:15,fontWeight:600,padding:'12px 24px',borderRadius:10,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:8 }}>
            Get started free <span>→</span>
          </a>
          <button onClick={() => document.getElementById('nova-demo')?.scrollIntoView({behavior:'smooth'})} style={{ background:'transparent',color:'#e6edf3',fontSize:15,fontWeight:500,padding:'12px 24px',borderRadius:10,border:'1px solid #30363d',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8 }}>
            <span style={{ width:6,height:6,borderRadius:'50%',background:'#a78bfa',display:'inline-block' }}/>
            See Nova in action
          </button>
        </div>
      </section>

      {/* ── How it works — flowchart ── */}
      <section id="how-it-works" style={{ maxWidth:700, margin:'0 auto', padding:'0 16px 80px' }}>
        <p style={{ textAlign:'center',fontSize:12,color:'#484f58',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:56 }}>How it works</p>
        <div style={{ position:'relative', paddingLeft:52 }}>
          {/* Vertical connector line */}
          <div style={{ position:'absolute',left:19,top:32,bottom:32,width:2,background:'linear-gradient(180deg,#2563eb 0%,#a78bfa 50%,#34d399 100%)',borderRadius:2 }}/>
          {[
            { step:'01', label:'Drop any topic', desc:'Type a subject, paste your notes, or pick a curriculum standard — any format works.', color:'#2563eb', bg:'rgba(37,99,235,0.08)', border:'rgba(37,99,235,0.2)' },
            { step:'02', label:'Nova builds your kit', desc:'Flashcards, a full study guide, and a quiz appear instantly — tailored to exactly what you pasted.', color:'#a78bfa', bg:'rgba(167,139,250,0.08)', border:'rgba(167,139,250,0.2)' },
            { step:'03', label:'Study, quiz, repeat', desc:'Spaced repetition surfaces cards you found hard. Share everything with one link.', color:'#34d399', bg:'rgba(52,211,153,0.08)', border:'rgba(52,211,153,0.2)' },
          ].map((s, i) => (
            <div key={s.step} style={{ position:'relative', marginBottom: i < 2 ? 12 : 0 }}>
              {/* Step circle */}
              <div style={{ position:'absolute', left:-52, top:24, width:40, height:40, borderRadius:'50%', background:s.bg, border:'2px solid '+s.border, display:'flex', alignItems:'center', justifyContent:'center', zIndex:1 }}>
                <span style={{ fontSize:12, fontWeight:700, color:s.color }}>{s.step}</span>
              </div>
              {/* Card */}
              <div style={{ background:s.bg, border:'1px solid '+s.border, borderRadius:14, padding:'24px 28px' }}>
                <p style={{ fontWeight:600, fontSize:16, color:'#e6edf3', margin:'0 0 8px' }}>{s.label}</p>
                <p style={{ fontSize:14, color:'#8b949e', lineHeight:1.6, margin:0 }}>{s.desc}</p>
              </div>
              {/* Arrow connector between steps */}
              {i < 2 && (
                <div style={{ position:'absolute', left:-33, bottom:-22, display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>
                  <div style={{ width:0, height:0, borderLeft:'6px solid transparent', borderRight:'6px solid transparent', borderTop:'8px solid #30363d' }}/>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Nova in action demo ── */}
      <section id="nova-demo" style={{ borderTop:'1px solid #21262d', borderBottom:'1px solid #21262d', padding:'80px 16px', background:'#0a0e14' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', textAlign:'center' }}>
          <p style={{ fontSize:12,color:'#484f58',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:16 }}>Nova in action</p>
          <h2 style={{ fontSize:'clamp(24px,4vw,40px)', fontWeight:700, marginBottom:12 }}>Watch Nova work</h2>
          <p style={{ color:'#8b949e', marginBottom:48, fontSize:15 }}>Type any topic and Nova builds your complete study kit instantly.</p>
          <ProductDemo/>
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
        <a href="/auth?mode=signup" style={{ background:'#2563eb', color:'#fff', fontSize:15, fontWeight:600, padding:'14px 28px', borderRadius:10, textDecoration:'none' }}>Get started free →</a>
      </section>

    </div>
  )
}
