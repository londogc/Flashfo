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


function LiveQuizDemo() {
  const [phase, setPhase] = useState('answering') // 'answering' | 'reveal' | 'next'
  const [answered, setAnswered] = useState(18)
  const [qIdx, setQIdx] = useState(0)
  const [scores, setScores] = useState([420,390,360,310,290])
  const [studentAnswered, setStudentAnswered] = useState([true,true,true,false,false])
  const [timerSec, setTimerSec] = useState(14)

  const QUESTIONS = [
    { q:'Which organelle produces ATP through cellular respiration?', opts:['Nucleus','Mitochondria','Ribosome','Vacuole'], correct:1, pct:[8,75,14,3] },
    { q:'What do light-dependent reactions in photosynthesis primarily produce?', opts:['Glucose','Carbon dioxide','ATP + NADPH','Water'], correct:2, pct:[12,5,68,15] },
    { q:'In which phase of mitosis do chromosomes align at the cell equator?', opts:['Prophase','Anaphase','Telophase','Metaphase'], correct:3, pct:[11,9,6,74] },
  ]
  const STUDENTS = [
    { init:'JL', name:'Jamie L.', color:'rgba(167,139,250,0.15)', text:'#a78bfa' },
    { init:'MK', name:'Maya K.',  color:'rgba(37,99,235,0.12)',    text:'#3b82f6' },
    { init:'TR', name:'Tyler R.', color:'rgba(52,211,153,0.1)',    text:'#34d399' },
    { init:'AS', name:'Ava S.',   color:'rgba(251,146,60,0.1)',    text:'#fb923c' },
    { init:'BW', name:'Ben W.',   color:'rgba(167,139,250,0.1)',   text:'#a78bfa' },
  ]
  const q = QUESTIONS[qIdx]

  useEffect(() => {
    const iv = setInterval(() => setTimerSec(s => s+1), 1000)
    return () => clearInterval(iv)
  }, [qIdx])

  useEffect(() => {
    if (phase !== 'answering') return
    const timers = []
    // Student 4 answers at 1.2s
    timers.push(setTimeout(() => {
      setStudentAnswered(prev => { const n=[...prev]; n[3]=true; return n })
      setAnswered(prev => prev + 1)
    }, 1200))
    // Student 5 answers at 2.6s
    timers.push(setTimeout(() => {
      setStudentAnswered(prev => { const n=[...prev]; n[4]=true; return n })
      setAnswered(prev => prev + 1)
    }, 2600))
    // All answered — reveal at 3.4s
    timers.push(setTimeout(() => setPhase('reveal'), 3400))
    return () => timers.forEach(t => clearTimeout(t))
  }, [phase, qIdx])

  useEffect(() => {
    if (phase !== 'reveal') return
    // Animate scores up
    const adds = [90, 70, 20, 90, 70]
    const timer = setTimeout(() => {
      setScores(prev => prev.map((s,i) => s + adds[i]))
    }, 300)
    // Auto advance
    const adv = setTimeout(() => {
      setQIdx(i => (i+1) % QUESTIONS.length)
      setPhase('answering')
      setAnswered(14)
      setStudentAnswered([true,true,true,false,false])
      setTimerSec(0)
      setScores([420,390,360,310,290])
    }, 4000)
    return () => { clearTimeout(timer); clearTimeout(adv) }
  }, [phase])

  const mins = Math.floor(timerSec/60)
  const secs = timerSec % 60

  const optStyle = (i) => {
    if (phase === 'reveal') {
      if (i === q.correct) return { border:'1px solid #34d399', background:'rgba(52,211,153,0.07)', color:'#34d399' }
      if (i === 1 && q.correct !== 1) return { border:'1px solid #21262d', background:'#161b22', color:'#484f58' }
    }
    if (i === (phase==='answering'?q.correct:q.correct)) return { border:'1px solid #2563eb', background:'rgba(37,99,235,0.08)', color:'#93c5fd' }
    return { border:'1px solid #21262d', background:'#161b22', color:'#8b949e' }
  }
  const letStyle = (i) => {
    if (phase === 'reveal' && i === q.correct) return { background:'#34d399', color:'#0d1117' }
    if (i === q.correct) return { background:'#2563eb', color:'#fff' }
    return { background:'#21262d', color:'#484f58' }
  }

  return (
    <div style={{ background:'#0d1117', border:'1px solid #21262d', borderRadius:14, overflow:'hidden', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', minHeight:480 }}>

      {/* Top bar */}
      <div style={{ background:'#161b22', borderBottom:'1px solid #21262d', padding:'10px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, fontWeight:500, color:'#e6edf3' }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'#ef4444', display:'inline-block', boxShadow:'0 0 0 3px rgba(239,68,68,0.2)', animation:'livepulse 1.2s ease-in-out infinite' }}/>
          Live Quiz
        </div>
        <span style={{ fontSize:11, color:'#484f58', background:'#21262d', padding:'3px 9px', borderRadius:20 }}>AP Biology · Period 3</span>
        <span style={{ fontSize:13, fontWeight:600, color:'#f59e0b', fontVariantNumeric:'tabular-nums' }}>{mins}:{secs<10?'0':''}{secs}</span>
      </div>

      {/* Body */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', height:400 }}>

        {/* Left — question */}
        <div style={{ borderRight:'1px solid #21262d', padding:'20px 18px', display:'flex', flexDirection:'column', gap:14, overflow:'hidden', height:400 }}>
          <div>
            <div style={{ fontSize:10, color:'#484f58', letterSpacing:'0.08em', marginBottom:6 }}>QUESTION {qIdx+2} OF 6</div>
            <div style={{ fontSize:14, fontWeight:500, color:'#e6edf3', lineHeight:1.55, minHeight:52 }}>{q.q}</div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
              <div style={{ flex:1, height:3, background:'#21262d', borderRadius:2 }}>
                <div style={{ height:3, borderRadius:2, background:'#a78bfa', width:((qIdx+2)/6*100)+'%', transition:'width 0.6s ease' }}/>
              </div>
              <div style={{ fontSize:10, color:'#484f58', whiteSpace:'nowrap' }}>{answered}/24 answered</div>
            </div>
          </div>

          {/* Options */}
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {q.opts.map((opt,i) => (
              <div key={i} style={{ padding:'9px 12px', borderRadius:8, display:'flex', alignItems:'center', gap:8, position:'relative', overflow:'hidden', ...optStyle(i) }}>
                {phase === 'reveal' && (
                  <div style={{ position:'absolute', left:0, top:0, height:'100%', width:q.pct[i]+'%', background: i===q.correct?'rgba(52,211,153,0.08)':'rgba(139,148,158,0.04)', transition:'width 0.8s ease', pointerEvents:'none' }}/>
                )}
                <div style={{ width:18, height:18, borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:600, flexShrink:0, ...letStyle(i) }}>
                  {['A','B','C','D'][i]}
                </div>
                <span style={{ fontSize:12, flex:1 }}>{opt}</span>
                {phase === 'reveal' && <span style={{ fontSize:10, color: i===q.correct?'#34d399':'#484f58' }}>{q.pct[i]}%</span>}
              </div>
            ))}
          </div>

          {/* Answer reveal label — always rendered, opacity transition so height is always reserved */}
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#34d399', padding:'8px 12px', background:'rgba(52,211,153,0.07)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:8, opacity: phase==='reveal' ? 1 : 0, transition:'opacity 0.4s ease', pointerEvents: phase==='reveal' ? 'auto' : 'none', overflow:'hidden', maxWidth:'100%' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              {q.pct[q.correct]}% of the class got it right
            </div>
        </div>

        {/* Right — leaderboard */}
        <div style={{ padding:'18px 16px', display:'flex', flexDirection:'column', gap:8, overflow:'hidden', height:400 }}>
          <div style={{ fontSize:10, color:'#484f58', letterSpacing:'0.08em', marginBottom:2, display:'flex', justifyContent:'space-between' }}>
            <span>STUDENTS</span>
            <span style={{ color:'#a78bfa' }}>{answered} answered</span>
          </div>
          {STUDENTS.map((s,i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:8, padding:'7px 9px', borderRadius:8,
              border: i===0 ? '1px solid rgba(167,139,250,0.25)' : '1px solid #21262d',
              background: i===0 ? 'rgba(167,139,250,0.06)' : '#161b22',
              transition:'all 0.3s'
            }}>
              <div style={{ width:26, height:26, borderRadius:7, background:s.color, color:s.text, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, flexShrink:0 }}>{s.init}</div>
              <div style={{ flex:1, fontSize:12, color:'#e6edf3' }}>{s.name}</div>
              <div style={{ fontSize:11, fontWeight:600, color:'#a78bfa', fontVariantNumeric:'tabular-nums', minWidth:32, textAlign:'right' }}>{scores[i]}</div>
              <div style={{ width:18, height:18, borderRadius:5, background: studentAnswered[i]?'rgba(52,211,153,0.12)':'#21262d', border: studentAnswered[i]?'1px solid rgba(52,211,153,0.3)':'1px solid #30363d', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.3s' }}>
                {studentAnswered[i] && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
            </div>
          ))}
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', borderRadius:8, border:'1px solid #21262d', background:'#161b22' }}>
            <div style={{ width:26, height:26, borderRadius:7, background:'#21262d', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#484f58', fontWeight:600 }}>+6</div>
            <div style={{ fontSize:12, color:'#484f58' }}>more students</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes livepulse{0%,100%{box-shadow:0 0 0 3px rgba(239,68,68,0.3)}50%{box-shadow:0 0 0 6px rgba(239,68,68,0)}}
      
        @media(max-width:768px){.lp-nav-links{display:none!important}.lp-desktop-btns{display:none!important}.lp-hamburger{display:flex!important}}
        .lp-hamburger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:6px;background:transparent;border:none;outline:none;}
        .lp-hb{width:20px;height:2px;background:#8b949e;border-radius:1px;transition:transform 0.2s,opacity 0.2s;}
        .lp-mobile-menu{background:#0d1117;border-bottom:1px solid #21262d;}
        .lp-mobile-link{display:flex;align-items:center;justify-content:space-between;padding:15px 20px;border-bottom:1px solid #21262d;font-size:14px;color:#e6edf3;text-decoration:none;font-weight:500;}
        .lp-mobile-link:last-of-type{border-bottom:none;}
        .lp-mobile-cta{display:block;margin:12px 16px 16px;padding:12px 0;text-align:center;background:linear-gradient(90deg,#2563eb,#7c3aed);color:#fff;font-size:14px;font-weight:700;border-radius:9px;text-decoration:none;}@media(max-width:768px){.lp-quiz-section{overflow:hidden!important}.lp-quiz-bubble{max-width:100%!important;font-size:11px!important}}`}</style>
    </div>
  )
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  if (loading) return <div style={{ background:'#0d1117', minHeight:'100dvh' }}/>

  return (
    <div style={{ background:'#0d1117', minHeight:'100dvh', color:'#e6edf3', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* ── Nav ── */}
      <style>{`@keyframes lp-spin{to{transform:rotate(360deg)}}@keyframes lp-rock{0%,100%{transform:rotate(-4deg) scale(1)}50%{transform:rotate(4deg) scale(1.08)}}@media(prefers-reduced-motion:reduce){.lp-no-motion *{animation:none!important}}`}</style>
      <nav style={{ position:'sticky',top:0,zIndex:50,background:'rgba(13,17,23,0.92)',backdropFilter:'blur(12px)',borderBottom:'1px solid #21262d' }}>
        <div style={{ maxWidth:1200,margin:'0 auto',padding:'0 16px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ position:'relative', width:36, height:36, flexShrink:0 }}>
              <div style={{ position:'absolute', inset:-3, borderRadius:12, background:'conic-gradient(#3b82f6,#8b5cf6,#a78bfa,#3b82f6)', animation:'lp-spin 3s linear infinite' }}/>
              <div style={{ position:'absolute', inset:2, borderRadius:9, background:'#0d1117', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
            </div>
            <span style={{ fontWeight:600, fontSize:16 }}>Flashfo</span>
          </div>
          <div className="lp-nav-links" style={{ display:'flex', gap:24, fontSize:13, alignItems:'center' }}>
            {[
              {l:'Features', h:'/features'},
              {l:'For Teachers', h:'/for-teachers'},
              {l:'For Parents', h:'/for-parents'},
              {l:'Pricing', h:'/pricing'},
            ].map(({l,h})=>( <a key={l} href={h} style={{ color:'#8b949e', textDecoration:'none' }}>{l}</a> ))}
          </div>
          <div className="lp-desktop-btns" style={{ display:'flex', gap:8, alignItems:'center' }}>
            <a href="/auth?mode=signup" style={{ color:'#8b949e', fontSize:13, textDecoration:'none' }}>Sign in</a>
            <a href="/auth?mode=signup" style={{ background:'#2563eb', color:'#fff', fontSize:13, fontWeight:500, padding:'7px 14px', borderRadius:8, textDecoration:'none' }}>Sign up today</a>
          </div>
          <button className="lp-hamburger" onClick={()=>setMobileMenuOpen(o=>!o)} aria-label="Open menu">
            <span className="lp-hb" style={{transform:mobileMenuOpen?'rotate(45deg) translateY(7px)':'none'}}/>
            <span className="lp-hb" style={{opacity:mobileMenuOpen?0:1}}/>
            <span className="lp-hb" style={{transform:mobileMenuOpen?'rotate(-45deg) translateY(-7px)':'none'}}/>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="lp-mobile-menu">
            <a className="lp-mobile-link" href="/features" onClick={()=>setMobileMenuOpen(false)}>Features <span style={{color:'#484f58'}}>›</span></a>
            <a className="lp-mobile-link" href="/for-teachers" onClick={()=>setMobileMenuOpen(false)}>For Teachers <span style={{color:'#484f58'}}>›</span></a>
            <a className="lp-mobile-link" href="/for-parents" onClick={()=>setMobileMenuOpen(false)}>For Parents <span style={{color:'#484f58'}}>›</span></a>
            <a className="lp-mobile-link" href="/pricing" onClick={()=>setMobileMenuOpen(false)}>Pricing <span style={{color:'#484f58'}}>›</span></a>
            <a className="lp-mobile-cta" href="/auth?mode=signup">Sign up free →</a>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section style={{ maxWidth:1200, margin:'0 auto', padding:'80px 16px 64px', textAlign:'center' }}>
        <div style={{ display:'inline-flex',alignItems:'center',gap:6,background:'rgba(167,139,250,0.08)',border:'1px solid rgba(167,139,250,0.2)',borderRadius:20,padding:'4px 12px',fontSize:12,color:'#a78bfa',marginBottom:24 }}>
          <span style={{ width:6,height:6,borderRadius:'50%',background:'#a78bfa',display:'inline-block' }}/>
          Welcome to Flashfo
        </div>
        <h1 style={{ fontSize:'clamp(32px,6vw,64px)',fontWeight:700,lineHeight:1.1,marginBottom:20,background:'linear-gradient(135deg,#e6edf3 0%,#a78bfa 50%,#2563eb 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>
          Study smarter.<br/>Teach better. Together.
        </h1>
        <p style={{ fontSize:18, color:'#8b949e', maxWidth:520, margin:'0 auto 36px', lineHeight:1.6 }}>
          Nova builds personalized flashcards, quizzes, and study guides in seconds — tailored to your exact curriculum.
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <a href="/auth?mode=signup" style={{ background:'#2563eb',color:'#fff',fontSize:15,fontWeight:600,padding:'12px 24px',borderRadius:10,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:8 }}>
            Sign up today <span>→</span>
          </a>
          <button onClick={() => document.getElementById('nova-demo')?.scrollIntoView({behavior:'smooth'})} style={{ background:'transparent',color:'#e6edf3',fontSize:15,fontWeight:500,padding:'12px 24px',borderRadius:10,border:'1px solid #30363d',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8 }}>
            <span style={{ width:6,height:6,borderRadius:'50%',background:'#a78bfa',display:'inline-block' }}/>
            See Nova in action
          </button>
        </div>
      </section>

      {/* ── Live Quiz Feature ── */}
      <section id="live-quiz" style={{ maxWidth:720, margin:'0 auto', padding:'0 16px 80px' }}>
        <p style={{ textAlign:'center',fontSize:12,color:'#484f58',letterSpacing:'0.1em',marginBottom:12 }}>LIVE CLASSROOM</p>
        <h2 style={{ textAlign:'center',fontSize:28,fontWeight:700,color:'#e6edf3',letterSpacing:'-0.03em',marginBottom:10 }}>Your whole class, in sync</h2>
        <p style={{ textAlign:'center',fontSize:15,color:'#8b949e',marginBottom:36,maxWidth:440,margin:'0 auto 36px' }}>Run a live quiz and watch every student respond in real time — scores, answers, and who needs help, all on one screen.</p>
        <LiveQuizDemo/>
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
            {['Personalized to your syllabus','Aware of your teacher\'s assignments','Remembers what you find hard','Works across all your subjects'].map(f => (
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
        <p style={{ color:'#8b949e', fontSize:16, marginBottom:32 }}>Join students and teachers already using Flashfo.</p>
        <a href="/auth?mode=signup" style={{ background:'#2563eb', color:'#fff', fontSize:15, fontWeight:600, padding:'14px 28px', borderRadius:10, textDecoration:'none' }}>Sign up today →</a>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop:'1px solid #21262d', padding:'40px 24px', textAlign:'center' }}>
        <div style={{ maxWidth:700, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:20 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#1e40af,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style={{ animation:'lp-rock 4s ease-in-out infinite', transformOrigin:'center' }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <span style={{ fontSize:15, fontWeight:700, color:'#e6edf3' }}>Flashfo</span>
          </div>
          <div style={{ display:'flex', gap:24, justifyContent:'center', marginBottom:20, flexWrap:'wrap' }}>
            {[
              {l:'Privacy Policy', h:'/privacy'},
              {l:'Terms of Service', h:'/terms'},
              {l:'Contact', h:'mailto:hello@flashfo.com'},
              {l:'Sign up free', h:'/auth?mode=signup'},
            ].map(({l,h})=>(
              <a key={l} href={h} style={{ fontSize:13, color:'#8b949e', textDecoration:'none' }}>{l}</a>
            ))}
          </div>
          <p style={{ fontSize:12, color:'#484f58' }}>© {new Date().getFullYear()} Flashfo. Built for students and teachers.</p>
        </div>
      </footer>


    </div>
  )
}
