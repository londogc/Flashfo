'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ForTeachersPage() {
  const router = useRouter()

  useEffect(() => {
    const id = 'flashfo-page-css'
    if (document.getElementById(id)) return
    const s = document.createElement('style')
    s.id = id
    s.textContent = '@keyframes nav-spin{to{transform:rotate(360deg)}} @keyframes card-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} .page-card-anim{opacity:0;animation:card-in .42s cubic-bezier(.22,.68,0,1.2) forwards} @keyframes nova-pulse{0%,100%{opacity:1}50%{opacity:.4}} .nova-pulse{animation:nova-pulse .9s ease-in-out infinite}'
    document.head.appendChild(s)
  }, [])

  const NAV_LINKS = [
    {label:'Home',href:'/'},
    {label:'Features',href:'/features'},
    {label:'For Teachers',href:'/for-teachers'},
    {label:'Pricing',href:'/pricing'},
    {label:"What's new",href:'/whats-new'},
  ]

  const S = {
    page: {minHeight:'100vh',background:'#080c14',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:'#e6edf3'},
    section: {padding:'56px 24px',maxWidth:900,margin:'0 auto'},
    card: {background:'#161b22',border:'1px solid #21262d',borderRadius:14,padding:'20px 22px'},
    badge: (col) => ({display:'inline-flex',alignItems:'center',gap:5,borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700,letterSpacing:'.05em',background:'rgba('+col+',.08)',border:'1px solid rgba('+col+',.2)',color:'rgb('+col+')',marginBottom:14}),
    tick: {display:'flex',alignItems:'center',gap:10,fontSize:13,color:'#8b949e',marginBottom:8},
    tickDot: (col) => ({width:20,height:20,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:'rgba('+col+',.15)'}),
  }

  return (
    <div style={S.page}>
      <nav style={{background:'#0d1117',borderBottom:'1px solid #21262d',padding:'12px 24px',display:'flex',alignItems:'center',gap:24,position:'sticky',top:0,zIndex:50}}>
        <a href="/" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none'}}>
          <div style={{position:'relative',width:30,height:30,flexShrink:0}}>
            <div style={{position:'absolute',inset:-3,borderRadius:11,background:'conic-gradient(#3b82f6,#8b5cf6,#a78bfa,#3b82f6)',animation:'nav-spin 3s linear infinite'}}/>
            <div style={{position:'absolute',inset:2,background:'#0d1117',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="#3b82f6"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
            </div>
          </div>
          <span style={{fontSize:15,fontWeight:700,color:'#e6edf3'}}>Flashfo</span>
        </a>
        <div style={{display:'flex',gap:22,marginLeft:16}}>
          {NAV_LINKS.map(({label,href})=>(
            <a key={label} href={href} style={{fontSize:13,color:href==='/for-teachers'?'#34d399':'#8b949e',fontWeight:href==='/for-teachers'?600:400,textDecoration:'none',borderBottom:href==='/for-teachers'?'2px solid #34d399':'none',paddingBottom:2}}>
              {label}
            </a>
          ))}
        </div>
        <a href="/auth?mode=signup" style={{marginLeft:'auto',background:'linear-gradient(90deg,#2563eb,#7c3aed)',color:'#fff',border:'none',borderRadius:9,fontSize:13,fontWeight:700,padding:'8px 18px',cursor:'pointer',textDecoration:'none',letterSpacing:'-.01em'}}>
          Start free trial →
        </a>
      </nav>

      {/* HERO */}
      <div style={{padding:'64px 24px 40px',textAlign:'center',maxWidth:760,margin:'0 auto'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:6,borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700,letterSpacing:'.05em',background:'rgba(52,211,153,.08)',border:'1px solid rgba(52,211,153,.2)',color:'#34d399',marginBottom:18}}>
          <div className="nova-pulse" style={{width:7,height:7,borderRadius:'50%',background:'#34d399'}}/>
          NOVA AI · FOR TEACHERS
        </div>
        <h1 style={{fontSize:46,fontWeight:800,letterSpacing:'-.03em',lineHeight:1.1,marginBottom:16}}>
          Teach smarter.<br/>
          <span style={{background:'linear-gradient(90deg,#34d399,#2563eb)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Save hours every week.</span>
        </h1>
        <p style={{fontSize:16,color:'#8b949e',lineHeight:1.7,marginBottom:28,maxWidth:560,margin:'0 auto 28px'}}>
          Nova AI generates lesson plans, quizzes, and study materials in seconds. Run live classroom quizzes, track student performance, and manage your whole class — all in one workspace.
        </p>
        <div style={{display:'flex',gap:12,justifyContent:'center'}}>
          <button onClick={()=>router.push('/auth?mode=signup')} style={{background:'linear-gradient(90deg,#2563eb,#7c3aed)',color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',padding:'12px 28px',letterSpacing:'-.01em'}}>
            Start 3-day free trial →
          </button>
          <button onClick={()=>router.push('/pricing')} style={{background:'transparent',color:'#8b949e',border:'1px solid #30363d',borderRadius:10,fontSize:13,cursor:'pointer',padding:'12px 20px'}}>
            View Teacher Pro
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{maxWidth:900,margin:'0 auto 56px',padding:'0 24px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          {[
            {num:'4h',label:'saved per week on average',col:'#34d399'},
            {num:'30s',label:'to generate a full lesson plan',col:'#e6edf3'},
            {num:'∞',label:'students can join a live quiz',col:'#e6edf3'},
            {num:'1',label:'workspace for all teaching tools',col:'#e6edf3'},
          ].map(({num,label,col})=>(
            <div key={num} style={{textAlign:'center',background:'#161b22',border:'1px solid '+(col==='#34d399'?'rgba(52,211,153,.2)':'#21262d'),borderRadius:12,padding:'20px 12px'}}>
              <div style={{fontSize:34,fontWeight:800,letterSpacing:'-.03em',color:col}}>{num}</div>
              <div style={{fontSize:12,color:'#8b949e',marginTop:5,lineHeight:1.4}}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURE 1: LIVE QUIZ */}
      <div style={{...S.section,paddingTop:0}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:36,alignItems:'start'}}>
          <div>
            <div style={S.badge('52,211,153')}>LIVE QUIZ</div>
            <h2 style={{fontSize:30,fontWeight:800,letterSpacing:'-.02em',marginBottom:10,color:'#e6edf3'}}>Your whole class, answering in real time</h2>
            <p style={{fontSize:14,color:'#8b949e',lineHeight:1.7,marginBottom:20}}>Generate a quiz from any topic, share a 6-digit code, and watch every student respond live. See who's struggling instantly — before you move on to the next topic.</p>
            {['Nova generates questions from your topic in seconds','Students join on any device — no app needed','Live leaderboard keeps every student engaged','Results breakdown shows exactly who struggled and why'].map(t=>(
              <div key={t} style={S.tick}>
                <div style={S.tickDot('52,211,153')}>
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                {t}
              </div>
            ))}
          </div>
          <div style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:12,overflow:'hidden'}}>
            <div style={{background:'#161b22',padding:'10px 14px',borderBottom:'1px solid #21262d',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:'#34d399'}}/>
                <span style={{fontSize:12,fontWeight:600,color:'#e6edf3'}}>Live · Q3 of 8</span>
              </div>
              <span style={{fontSize:11,color:'#8b949e'}}>28 students · 0:42 left</span>
            </div>
            <div style={{padding:14}}>
              <div style={{fontSize:13,color:'#e6edf3',fontWeight:500,marginBottom:12,lineHeight:1.5}}>Which process do plants use to convert sunlight into glucose?</div>
              {[
                {l:'A',t:'Photosynthesis',pct:75,correct:true},
                {l:'B',t:'Cellular respiration',pct:18,correct:false},
                {l:'C',t:'Osmosis',pct:7,correct:false},
              ].map(({l,t,pct,correct})=>(
                <div key={l} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:8,border:'1px solid '+(correct?'rgba(52,211,153,.3)':'#21262d'),background:correct?'rgba(52,211,153,.08)':'#161b22',marginBottom:6}}>
                  <div style={{width:22,height:22,borderRadius:6,background:correct?'rgba(52,211,153,.2)':'#21262d',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:correct?'#34d399':'#6b7280'}}>{l}</div>
                  <span style={{flex:1,fontSize:12,color:correct?'#34d399':'#8b949e'}}>{t}</span>
                  <span style={{fontSize:12,fontWeight:700,color:correct?'#34d399':'#8b949e'}}>{pct}%</span>
                </div>
              ))}
              <div style={{marginTop:12,fontSize:10,color:'#484f58',letterSpacing:'.07em',marginBottom:8}}>LEADERBOARD</div>
              {[
                {init:'TR',name:'Tyler R.',score:360,col:'rgba(245,158,11,.2)',tcol:'#f59e0b'},
                {init:'AS',name:'Ava S.',score:310,col:'rgba(167,139,250,.2)',tcol:'#a78bfa'},
                {init:'BW',name:'Ben W.',score:290,col:'rgba(37,99,235,.2)',tcol:'#3b82f6'},
              ].map(({init,name,score,col,tcol},i)=>(
                <div key={name} className="page-card-anim" style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:'1px solid #21262d',animationDelay:i*100+'ms'}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:col,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:tcol,flexShrink:0}}>{init}</div>
                  <div style={{flex:1,fontSize:12,color:'#e6edf3'}}>{name}</div>
                  <div style={{fontSize:13,fontWeight:700,color:tcol}}>{score}</div>
                  <div style={{width:20,height:20,borderRadius:6,background:'rgba(52,211,153,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <svg width="9" height="9" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                </div>
              ))}
              <div style={{textAlign:'center',fontSize:11,color:'#484f58',marginTop:8}}>+25 more students</div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE 2: LESSON BUILDER */}
      <div style={{background:'#161b22',borderTop:'1px solid #21262d',borderBottom:'1px solid #21262d',padding:'56px 24px'}}>
        <div style={{maxWidth:900,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:36,alignItems:'start'}}>
          <div style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:12,padding:16}}>
            <div style={{fontSize:10,color:'#484f58',letterSpacing:'.07em',marginBottom:8}}>NOVA LESSON BUILDER</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
              <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:7,padding:'8px 10px',fontSize:11,color:'#e6edf3'}}>The Water Cycle</div>
              <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:7,padding:'8px 10px',fontSize:11,color:'#e6edf3'}}>Grade 6 · 45 min</div>
            </div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:12}}>
              {['Objectives','Warm-up','Main activity','Assessment'].map(s=>(
                <div key={s} style={{padding:'4px 9px',borderRadius:5,fontSize:10,fontWeight:600,background:'rgba(37,99,235,.1)',border:'1px solid rgba(37,99,235,.25)',color:'#3b82f6'}}>{s}</div>
              ))}
            </div>
            <div style={{borderTop:'1px solid #21262d',paddingTop:12}}>
              {[
                {heading:'Learning Objectives',col:'#3b82f6',body:'Students will identify and describe the four stages of the water cycle — evaporation, condensation, precipitation, and collection.'},
                {heading:'Warm-up (5 min)',col:'#a78bfa',body:'Ask students: "Where does rain come from?" Record ideas on the board without correcting — revisit at the end of the lesson.'},
                {heading:'Main activity (30 min)',col:'#34d399',body:'Students label a water cycle diagram in pairs, then create their own mini-cycle using a sealed bag, water, and sunlight...'},
              ].map(({heading,col,body})=>(
                <div key={heading} style={{marginBottom:12}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
                    <div style={{width:3,height:14,background:col,borderRadius:2}}/>
                    <span style={{fontSize:11,fontWeight:700,color:'#e6edf3'}}>{heading}</span>
                  </div>
                  <p style={{fontSize:11,color:'#8b949e',lineHeight:1.6}}>{body}</p>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8,marginTop:12,paddingTop:10,borderTop:'1px solid #21262d'}}>
              <button style={{flex:1,padding:'6px 0',borderRadius:7,border:'1px solid #30363d',background:'transparent',color:'#8b949e',fontSize:11,cursor:'pointer'}}>Export PDF</button>
              <button style={{flex:1,padding:'6px 0',borderRadius:7,border:'1px solid rgba(37,99,235,.3)',background:'rgba(37,99,235,.08)',color:'#3b82f6',fontSize:11,fontWeight:600,cursor:'pointer'}}>Auto-generate quiz →</button>
            </div>
          </div>
          <div>
            <div style={S.badge('37,99,235')}>LESSON BUILDER</div>
            <h2 style={{fontSize:30,fontWeight:800,letterSpacing:'-.02em',marginBottom:10,color:'#e6edf3'}}>A complete lesson plan in 30 seconds</h2>
            <p style={{fontSize:14,color:'#8b949e',lineHeight:1.7,marginBottom:20}}>Tell Nova the topic, grade, and duration. Get a fully structured lesson plan with objectives, warm-up, main activity, and assessment — ready to use in class, with zero extra work from you.</p>
            {['Customisable sections for any teaching style','One click to auto-generate a quiz from the lesson topic','Export as PDF or save to your personal lesson library','Works for any subject and any grade level'].map(t=>(
              <div key={t} style={S.tick}>
                <div style={S.tickDot('37,99,235')}>
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURE 3: CLASS ANALYTICS */}
      <div style={S.section}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={S.badge('245,158,11')}>CLASS ANALYTICS</div>
          <h2 style={{fontSize:30,fontWeight:800,letterSpacing:'-.02em',marginBottom:10,color:'#e6edf3'}}>Know exactly who needs help</h2>
          <p style={{fontSize:14,color:'#8b949e',lineHeight:1.7,maxWidth:540,margin:'0 auto'}}>After every quiz, Flashfo shows you which questions tripped up the class and which students need support — without you having to grade a single thing.</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={S.card}>
            <div style={{fontSize:12,fontWeight:700,color:'#e6edf3',marginBottom:14}}>Question breakdown · Water Cycle Quiz</div>
            {[
              {q:'Q1: Define evaporation',pct:94,col:'#34d399'},
              {q:'Q2: Water cycle stages',pct:88,col:'#34d399'},
              {q:'Q3: Condensation vs precipitation',pct:61,col:'#f59e0b'},
              {q:'Q4: Groundwater movement',pct:42,col:'#f87171'},
            ].map(({q,pct,col})=>(
              <div key={q} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}>
                  <span style={{color:'#8b949e'}}>{q}</span>
                  <span style={{color:col,fontWeight:700}}>{pct}%</span>
                </div>
                <div style={{height:7,background:'#21262d',borderRadius:4,overflow:'hidden'}}>
                  <div style={{width:pct+'%',height:'100%',background:col,borderRadius:4}}/>
                </div>
              </div>
            ))}
            <div style={{marginTop:10,padding:'10px 12px',background:'rgba(239,68,68,.06)',border:'1px solid rgba(239,68,68,.15)',borderRadius:8,fontSize:11,color:'#f87171'}}>
              ↗ Recommend revisiting: Groundwater movement — 58% of the class missed this
            </div>
          </div>
          <div style={S.card}>
            <div style={{fontSize:12,fontWeight:700,color:'#e6edf3',marginBottom:14}}>Student performance · Class 7B</div>
            {[
              {init:'TR',name:'Tyler R.',pct:96,col:'#34d399',note:''},
              {init:'AS',name:'Ava S.',pct:82,col:'#3b82f6',note:''},
              {init:'BW',name:'Ben W.',pct:68,col:'#f59e0b',note:''},
              {init:'CL',name:'Casey L.',pct:44,col:'#f87171',note:'Needs support'},
            ].map(({init,name,pct,col,note})=>(
              <div key={name} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #21262d'}}>
                <div style={{width:30,height:30,borderRadius:'50%',background:'rgba('+col.replace('#','').match(/../g).map(h=>parseInt(h,16)).join(',')+',.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:col,flexShrink:0}}>{init}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:'#e6edf3'}}>{name}</div>
                  {note&&<div style={{fontSize:10,color:col}}>{note}</div>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:56,height:5,background:'#21262d',borderRadius:3,overflow:'hidden'}}>
                    <div style={{width:pct+'%',height:'100%',background:col,borderRadius:3}}/>
                  </div>
                  <span style={{fontSize:11,color:col,fontWeight:700,minWidth:28}}>{pct}%</span>
                </div>
              </div>
            ))}
            <div style={{fontSize:10,color:'#484f58',marginTop:8,textAlign:'center'}}>Showing 4 of 28 students</div>
          </div>
        </div>
      </div>

      {/* MORE TOOLS GRID */}
      <div style={{background:'#161b22',borderTop:'1px solid #21262d',borderBottom:'1px solid #21262d',padding:'56px 24px'}}>
        <div style={{maxWidth:900,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:28}}>
            <div style={S.badge('167,139,250')}>MORE TEACHER TOOLS</div>
            <h2 style={{fontSize:30,fontWeight:800,letterSpacing:'-.02em',color:'#e6edf3'}}>Everything in one place</h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
            {[
              {t:'Assignment builder',d:'Create and assign tasks to your class. Students complete them at their own pace.',c:'#3b82f6'},
              {t:'Curriculum planner',d:'Map your whole year by subject and term. Stay organised across every class.',c:'#a78bfa'},
              {t:'Student Portal',d:'Students see their assignments, scores, and study materials in one personal view.',c:'#34d399'},
              {t:'Class roster management',d:'Add students, create class codes, and manage your classroom from one screen.',c:'#f59e0b'},
              {t:'AI study material generation',d:'Generate flashcards, quizzes, and guides for your students from any topic.',c:'#3b82f6'},
              {t:'School Admin Dashboard',d:'On the School plan: manage up to 10 teacher accounts and track school-wide usage.',c:'#f59e0b'},
            ].map(({t,d,c})=>(
              <div key={t} style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:12,padding:'16px 18px'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:c,marginBottom:10}}/>
                <div style={{fontSize:13,fontWeight:700,color:'#e6edf3',marginBottom:6}}>{t}</div>
                <div style={{fontSize:12,color:'#8b949e',lineHeight:1.6}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM CTA */}
      <div style={{background:'linear-gradient(135deg,rgba(52,211,153,.08),rgba(37,99,235,.08))',borderTop:'1px solid #21262d',padding:'56px 24px',textAlign:'center'}}>
        <div style={{maxWidth:520,margin:'0 auto'}}>
          <h2 style={{fontSize:34,fontWeight:800,letterSpacing:'-.02em',color:'#e6edf3',marginBottom:10}}>Save 4+ hours every week</h2>
          <p style={{fontSize:15,color:'#8b949e',marginBottom:24}}>Try Teacher Pro free for 3 days. No commitment, cancel any time.</p>
          <button onClick={()=>router.push('/auth?mode=signup')} style={{background:'linear-gradient(90deg,#2563eb,#7c3aed)',color:'#fff',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer',padding:'14px 36px',letterSpacing:'-.01em'}}>
            Start 3-day free trial →
          </button>
          <div style={{fontSize:12,color:'#484f58',marginTop:12}}>Teacher Pro · $13/month after trial · Cancel any time</div>
        </div>
      </div>
    </div>
  )
}
