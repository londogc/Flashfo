'use client'
  const [menuOpen, setMenuOpen] = useState(false)
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ForParentsPage() {
  const router = useRouter()

  useEffect(() => {
    const id = 'flashfo-page-css'
    if (document.getElementById(id)) return
    const s = document.createElement('style')
    s.id = id
    s.textContent = '@keyframes nav-spin{to{transform:rotate(360deg)}} @keyframes card-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} .c-anim{opacity:0;animation:card-in .42s cubic-bezier(.22,.68,0,1.2) forwards}@media(max-width:768px){.sp-nav-links{display:none!important}.sp-nav-cta{display:none!important}.sp-hamburger{display:flex!important}}.sp-hamburger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:6px;background:transparent;border:none;outline:none;}.sp-hb{width:20px;height:2px;background:#8b949e;border-radius:1px;transition:transform 0.2s,opacity 0.2s;}.sp-mobile-menu{background:#0d1117;border-bottom:1px solid #21262d;position:sticky;top:56px;z-index:49;}.sp-mobile-link{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #21262d;font-size:14px;color:#e6edf3;text-decoration:none;font-weight:500;}.sp-mobile-cta{display:block;margin:12px 16px 16px;padding:11px 0;text-align:center;background:linear-gradient(90deg,#2563eb,#7c3aed);color:#fff;font-size:14px;font-weight:700;border-radius:9px;text-decoration:none;}'
    document.head.appendChild(s)
  }, [])

  const NAV_LINKS = [
    {label:'Home',href:'/'},
    {label:'Features',href:'/features'},
    {label:'For Teachers',href:'/for-teachers'},
    {label:'For Parents',href:'/for-parents'},
    {label:'Pricing',href:'/pricing'},
  ]

  const S = {
    page: {minHeight:'100vh',background:'#080c14',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:'#e6edf3'},
    section: {padding:'56px 24px',maxWidth:900,margin:'0 auto'},
    badge: (col) => ({display:'inline-flex',alignItems:'center',gap:5,borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700,letterSpacing:'.05em',background:'rgba('+col+',.08)',border:'1px solid rgba('+col+',.2)',color:'rgb('+col+')',marginBottom:14}),
    tick: {display:'flex',alignItems:'flex-start',gap:10,fontSize:13,color:'#8b949e',marginBottom:10,lineHeight:1.5},
    tickDot: (col) => ({width:20,height:20,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1,background:'rgba('+col+',.15)'}),
  }

  const CheckIcon = ({col}) => (
    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
      <path d="M2 7l3 3 7-7" stroke={'rgb('+col+')'} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )

  return (
    <div style={S.page}>
      <nav style={{background:'#0d1117',borderBottom:'1px solid #21262d',padding:'12px 24px',display:'flex',alignItems:'center',gap:24,position:'sticky',top:0,zIndex:50}}>
        <a href="/" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none',flexShrink:0}}>
          <div style={{position:'relative',width:30,height:30}}>
            <div style={{position:'absolute',inset:-3,borderRadius:11,background:'conic-gradient(#3b82f6,#8b5cf6,#a78bfa,#3b82f6)',animation:'nav-spin 3s linear infinite'}}/>
            <div style={{position:'absolute',inset:2,background:'#0d1117',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="#3b82f6"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
            </div>
          </div>
          <span style={{fontSize:15,fontWeight:700,color:'#e6edf3'}}>Flashfo</span>
        </a>
        <div className="sp-nav-links" style={{display:'flex',gap:22,flex:1,justifyContent:'center'}}>
          {NAV_LINKS.map(({label,href})=>(
            <a key={label} href={href} style={{fontSize:13,color:href==='/for-parents'?'#60a5fa':'#8b949e',fontWeight:href==='/for-parents'?600:400,textDecoration:'none',borderBottom:href==='/for-parents'?'2px solid #60a5fa':'none',paddingBottom:2}}>
              {label}
            </a>
          ))}
        </div>
        <a href="/auth?mode=signup" style={{background:'linear-gradient(90deg,#2563eb,#7c3aed)',color:'#fff',border:'none',borderRadius:9,fontSize:13,fontWeight:700,padding:'8px 18px',cursor:'pointer',textDecoration:'none',letterSpacing:'-.01em',flexShrink:0}}>
          Sign up free →
        </a>
      </nav>
      {menuOpen && (
        <div className="sp-mobile-menu">
          <a className="sp-mobile-link" href="/" onClick={()=>setMenuOpen(false)}>Home <span style={{color:'#484f58'}}>›</span></a>
          <a className="sp-mobile-link" href="/features" onClick={()=>setMenuOpen(false)}>Features <span style={{color:'#484f58'}}>›</span></a>
          <a className="sp-mobile-link" href="/for-teachers" onClick={()=>setMenuOpen(false)}>For Teachers <span style={{color:'#484f58'}}>›</span></a>
          <a className="sp-mobile-link" href="/for-parents" onClick={()=>setMenuOpen(false)}>For Parents <span style={{color:'#484f58'}}>›</span></a>
          <a className="sp-mobile-link" href="/pricing" onClick={()=>setMenuOpen(false)}>Pricing <span style={{color:'#484f58'}}>›</span></a>
          <a className="sp-mobile-cta" href="/auth?mode=signup">Sign up free →</a>
        </div>
      )}

      {/* HERO */}
      <div style={{padding:'64px 24px 40px',textAlign:'center',maxWidth:740,margin:'0 auto'}}>
        <div style={{...S.badge('96,165,250'),marginBottom:18,justifyContent:'center'}}>
          FLASHFO - FOR PARENTS
        </div>
        <h1 style={{fontSize:44,fontWeight:800,letterSpacing:'-.03em',lineHeight:1.1,marginBottom:16,color:'#e6edf3'}}>
          Your child deserves help<br/>
          <span style={{background:'linear-gradient(90deg,#60a5fa,#a78bfa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>at 10pm on a Tuesday.</span>
        </h1>
        <p style={{fontSize:16,color:'#8b949e',lineHeight:1.7,maxWidth:540,margin:'0 auto 28px'}}>
          Flashfo gives your child a personal AI study assistant that explains homework, builds revision materials, and helps them actually understand — not just copy. Available any time, for any subject.
        </p>
        <div style={{display:'flex',gap:12,justifyContent:'center'}}>
          <button onClick={()=>router.push('/auth?mode=signup')} style={{background:'linear-gradient(90deg,#2563eb,#7c3aed)',color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',padding:'12px 28px',letterSpacing:'-.01em'}}>
            Start 3-day free trial →
          </button>
          <button onClick={()=>router.push('/features')} style={{background:'transparent',color:'#8b949e',border:'1px solid #30363d',borderRadius:10,fontSize:13,cursor:'pointer',padding:'12px 20px'}}>
            See how it works
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{maxWidth:900,margin:'0 auto 56px',padding:'0 24px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          {[
            {num:'24/7',label:'homework help, any night of the week',col:'#60a5fa'},
            {num:'Any',label:'subject — math, science, history, English',col:'#e6edf3'},
            {num:'Free',label:'to start, with 15 AI sessions per month',col:'#e6edf3'},
            {num:'$7',label:'per month for unlimited everything',col:'#e6edf3'},
          ].map(({num,label,col})=>(
            <div key={num} style={{textAlign:'center',background:'#161b22',border:'1px solid '+(col==='#60a5fa'?'rgba(96,165,250,.2)':'#21262d'),borderRadius:12,padding:'20px 12px'}}>
              <div style={{fontSize:34,fontWeight:800,letterSpacing:'-.03em',color:col}}>{num}</div>
              <div style={{fontSize:12,color:'#8b949e',marginTop:5,lineHeight:1.4}}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURE 1: HOMEWORK HELP */}
      <div style={{...S.section,paddingTop:0}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:36,alignItems:'start'}}>
          <div>
            <div style={S.badge('96,165,250')}>HOMEWORK HELP</div>
            <h2 style={{fontSize:28,fontWeight:800,letterSpacing:'-.02em',marginBottom:10,color:'#e6edf3'}}>Stuck on homework? Nova explains it step by step.</h2>
            <p style={{fontSize:14,color:'#8b949e',lineHeight:1.7,marginBottom:20}}>Your child types in the question or topic they are struggling with. Nova does not just give the answer — it walks through the reasoning so they actually understand and can do it again next time.</p>
            <div style={S.tick}><div style={S.tickDot('96,165,250')}><CheckIcon col="96,165,250"/></div>Works for math, science, history, English, and more</div>
            <div style={S.tick}><div style={S.tickDot('96,165,250')}><CheckIcon col="96,165,250"/></div>Explains at the right level — not too simple, not over their head</div>
            <div style={S.tick}><div style={S.tickDot('96,165,250')}><CheckIcon col="96,165,250"/></div>Available at 10pm when you are exhausted and they are panicking</div>
            <div style={S.tick}><div style={S.tickDot('96,165,250')}><CheckIcon col="96,165,250"/></div>No judgment, infinite patience — asking again gets the same quality answer</div>
          </div>
          <div style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:12,overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid #21262d',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:24,height:24,borderRadius:'50%',background:'#161b22',border:'1px solid #30363d',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#a78bfa" strokeWidth="1.3"/>
                  <circle cx="12" cy="12" r="6" stroke="#a78bfa" strokeWidth="1.3"/>
                  <circle cx="12" cy="12" r="2" fill="#a78bfa"/>
                </svg>
              </div>
              <span style={{fontSize:12,fontWeight:600,color:'#e6edf3'}}>Nova</span>
              <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:5}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:'#34d399'}}/>
                <span style={{fontSize:11,color:'#34d399'}}>Online</span>
              </div>
            </div>
            <div style={{padding:14,display:'flex',flexDirection:'column',gap:10}}>
              <div style={{alignSelf:'flex-end',background:'#21262d',borderRadius:'12px 12px 2px 12px',padding:'10px 14px',fontSize:12,color:'#e6edf3',maxWidth:'80%'}}>
                I do not get how to find the area of a triangle. My homework is due tomorrow
              </div>
              <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:'#161b22',border:'1px solid #30363d',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#a78bfa" strokeWidth="1.3"/><circle cx="12" cy="12" r="6" stroke="#a78bfa" strokeWidth="1.3"/><circle cx="12" cy="12" r="2" fill="#a78bfa"/></svg>
                </div>
                <div style={{background:'#161b22',border:'1px solid #21262d',borderRadius:'2px 12px 12px 12px',padding:'12px 14px',fontSize:12,color:'#8b949e',lineHeight:1.7,maxWidth:'85%'}}>
                  No worries! The formula is: <span style={{color:'#60a5fa',fontWeight:600}}>Area = ½ × base × height</span><br/><br/>
                  Think of it this way: a triangle is exactly half of a rectangle. That's why we multiply by ½.<br/><br/>
                  So if your triangle has a base of 8cm and height of 5cm: ½ × 8 × 5 = <span style={{color:'#34d399',fontWeight:600}}>20cm²</span><br/><br/>
                  Want me to work through one of your actual questions?
                </div>
              </div>
              <div style={{alignSelf:'flex-end',background:'#21262d',borderRadius:'12px 12px 2px 12px',padding:'10px 14px',fontSize:12,color:'#e6edf3',maxWidth:'80%'}}>
                yes! it says the base is 12 and height is 7
              </div>
              <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:'#161b22',border:'1px solid #30363d',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#a78bfa" strokeWidth="1.3"/><circle cx="12" cy="12" r="6" stroke="#a78bfa" strokeWidth="1.3"/><circle cx="12" cy="12" r="2" fill="#a78bfa"/></svg>
                </div>
                <div style={{background:'#161b22',border:'1px solid #21262d',borderRadius:'2px 12px 12px 12px',padding:'12px 14px',fontSize:12,color:'#8b949e',lineHeight:1.7}}>
                  ½ × 12 × 7 = <span style={{color:'#34d399',fontWeight:600}}>42cm²</span> ✓<br/>
                  Try the next one yourself and I'll check it.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE 2: REVISION MATERIALS */}
      <div style={{background:'#161b22',borderTop:'1px solid #21262d',borderBottom:'1px solid #21262d',padding:'56px 24px'}}>
        <div style={{maxWidth:900,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:36,alignItems:'center'}}>
          <div style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:12,padding:16}}>
            <div style={{fontSize:10,color:'#484f58',letterSpacing:'.07em',marginBottom:8}}>GENERATED FOR YEAR 9 BIOLOGY</div>
            <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:8,padding:'9px 12px',fontSize:12,color:'#e6edf3',marginBottom:10}}>Cell division for my biology test next week</div>
            <div style={{fontSize:10,color:'#484f58',letterSpacing:'.07em',marginBottom:8}}>15 FLASHCARDS READY</div>
            {[
              {q:'What is mitosis?',a:'The division of a cell into two identical daughter cells, each with the same number of chromosomes as the parent.',delay:0},
              {q:'What are the 4 stages of mitosis?',a:'Prophase, Metaphase, Anaphase, Telophase — remember: PMAT.',delay:120},
              {q:'What is the difference between mitosis and meiosis?',a:'Mitosis produces 2 identical cells. Meiosis produces 4 genetically unique cells...',delay:240,dim:true},
            ].map(({q,a,delay,dim})=>(
              <div key={q} className="c-anim" style={{background:'#161b22',border:'1px solid #21262d',borderRadius:8,padding:'10px 12px',marginBottom:6,animationDelay:delay+'ms',opacity:dim?0.6:1}}>
                <div style={{fontSize:11,fontWeight:600,color:'#e6edf3',marginBottom:4}}>{q}</div>
                <div style={{fontSize:10,color:'#8b949e',paddingTop:5,borderTop:'1px solid #21262d',lineHeight:1.5}}>{a}</div>
              </div>
            ))}
          </div>
          <div>
            <div style={S.badge('167,139,250')}>REVISION MATERIALS</div>
            <h2 style={{fontSize:28,fontWeight:800,letterSpacing:'-.02em',marginBottom:10,color:'#e6edf3'}}>A full revision kit, built in seconds</h2>
            <p style={{fontSize:14,color:'#8b949e',lineHeight:1.7,marginBottom:20}}>Your child tells Nova what they are revising for — a test, an exam, a class topic — and Nova builds a complete set of flashcards, a quiz, and a study guide instantly. No prep needed from you.</p>
            <div style={S.tick}><div style={S.tickDot('167,139,250')}><CheckIcon col="167,139,250"/></div>Flashcards to memorise key facts and definitions</div>
            <div style={S.tick}><div style={S.tickDot('167,139,250')}><CheckIcon col="167,139,250"/></div>Practice quizzes to test themselves before the real thing</div>
            <div style={S.tick}><div style={S.tickDot('167,139,250')}><CheckIcon col="167,139,250"/></div>Study guides that explain the topic clearly and completely</div>
            <div style={S.tick}><div style={S.tickDot('167,139,250')}><CheckIcon col="167,139,250"/></div>Works across every subject at every school level</div>
          </div>
        </div>
      </div>

      {/* FEATURE 3: SMARTER REVISION */}
      <div style={S.section}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:36,alignItems:'center'}}>
          <div>
            <div style={S.badge('52,211,153')}>SMARTER REVISION</div>
            <h2 style={{fontSize:28,fontWeight:800,letterSpacing:'-.02em',marginBottom:10,color:'#e6edf3'}}>Studying more does not mean better grades. Studying right does.</h2>
            <p style={{fontSize:14,color:'#8b949e',lineHeight:1.7,marginBottom:20}}>Flashfo uses spaced repetition — the most evidence-backed revision technique. The cards your child struggles with come back more often. The ones they know fade out. Study time goes exactly where it matters.</p>
            <div style={S.tick}><div style={S.tickDot('52,211,153')}><CheckIcon col="52,211,153"/></div>Proven to improve long-term recall vs re-reading notes</div>
            <div style={S.tick}><div style={S.tickDot('52,211,153')}><CheckIcon col="52,211,153"/></div>Shorter, focused sessions — not hours of aimless revision</div>
            <div style={S.tick}><div style={S.tickDot('52,211,153')}><CheckIcon col="52,211,153"/></div>Progress tracking shows exactly what they know and what needs work</div>
          </div>
          <div style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:12,padding:18}}>
            <div style={{fontSize:13,fontWeight:700,color:'#e6edf3',marginBottom:16}}>What revision looks like with Flashfo</div>
            {[
              {label:'Cramming the night before',pct:32,col:'#f87171',pctLabel:'32% retained after 1 week'},
              {label:'Spaced revision with Flashfo',pct:86,col:'#34d399',pctLabel:'86% retained after 1 week'},
            ].map(({label,pct,col,pctLabel})=>(
              <div key={label} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}>
                  <span style={{color:'#8b949e'}}>{label}</span>
                  <span style={{color:col,fontWeight:700}}>{pctLabel}</span>
                </div>
                <div style={{height:9,background:'#21262d',borderRadius:5,overflow:'hidden'}}>
                  <div style={{width:pct+'%',height:'100%',background:col,borderRadius:5}}/>
                </div>
              </div>
            ))}
            <div style={{borderTop:'1px solid #21262d',paddingTop:14,marginTop:4}}>
              <div style={{fontSize:12,color:'#8b949e',marginBottom:10}}>After each card, they rate how well they knew it:</div>
              <div style={{display:'flex',gap:6}}>
                {['Again','Hard','Good','Easy'].map((l,i)=>(
                  <div key={l} style={{flex:1,textAlign:'center',padding:'7px 0',borderRadius:7,fontSize:11,fontWeight:700,background:['rgba(239,68,68,.1)','rgba(245,158,11,.1)','rgba(34,197,94,.1)','rgba(37,99,235,.1)'][i],color:['#f87171','#f59e0b','#4ade80','#3b82f6'][i]}}>
                    {l}
                  </div>
                ))}
              </div>
              <div style={{marginTop:8,fontSize:11,color:'#484f58',textAlign:'center'}}>Flashfo figures out when they need to see each card again</div>
            </div>
          </div>
        </div>
      </div>

      {/* DESIGNED FOR KIDS */}
      <div style={{background:'#161b22',borderTop:'1px solid #21262d',borderBottom:'1px solid #21262d',padding:'56px 24px'}}>
        <div style={{maxWidth:900,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:28}}>
            <div style={{...S.badge('37,99,235'),justifyContent:'center'}}>DESIGNED FOR STUDENTS</div>
            <h2 style={{fontSize:28,fontWeight:800,letterSpacing:'-.02em',color:'#e6edf3',marginBottom:10}}>A study tool you can feel good about</h2>
            <p style={{fontSize:14,color:'#8b949e',lineHeight:1.7,maxWidth:520,margin:'0 auto'}}>Flashfo is built for genuine learning — not shortcuts. Nova explains the why, not just the answer, so your child builds real understanding they can take into any exam.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
            {[
              {t:'Explains, does not just answer',d:'Nova walks through the reasoning, not just the result. Your child learns how to solve it — not just what the answer is.',c:'#3b82f6'},
              {t:'Any subject, any level',d:'Primary school times tables to A-level chemistry — Nova adjusts to the right level automatically based on what they are studying.',c:'#a78bfa'},
              {t:'Focused on education',d:'Flashfo is built specifically for students. Nova stays focused on learning — helping your child study, nothing else.',c:'#34d399'},
            ].map(({t,d,c})=>(
              <div key={t} style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:12,padding:'18px'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:c,marginBottom:10}}/>
                <div style={{fontSize:13,fontWeight:700,color:'#e6edf3',marginBottom:6}}>{t}</div>
                <div style={{fontSize:12,color:'#8b949e',lineHeight:1.6}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div style={{padding:'56px 24px',maxWidth:900,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <h2 style={{fontSize:28,fontWeight:800,letterSpacing:'-.02em',color:'#e6edf3',marginBottom:8}}>Simple, honest pricing</h2>
          <p style={{fontSize:14,color:'#8b949e'}}>Start free. Upgrade when you are ready.</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {/* Free plan */}
          <div style={{background:'#161b22',border:'1px solid #21262d',borderRadius:14,padding:'22px 24px'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#484f58',letterSpacing:'.07em',marginBottom:10}}>FREE PLAN</div>
            <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:4}}>
              <span style={{fontSize:38,fontWeight:800,color:'#e6edf3',letterSpacing:'-.03em'}}>$0</span>
              <span style={{fontSize:14,color:'#8b949e'}}>/mo</span>
            </div>
            <div style={{fontSize:12,color:'#8b949e',marginBottom:16}}>15 AI study sessions per month — enough to try it properly</div>
            {['15 flashcard decks, quizzes, or guides per month','Nova AI Tutor for homework questions','Save up to 5 decks'].map(t=>(
              <div key={t} style={{display:'flex',alignItems:'flex-start',gap:10,fontSize:13,color:'#8b949e',marginBottom:8,lineHeight:1.5}}>
                <div style={{width:20,height:20,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:'rgba(52,211,153,.15)'}}>
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                {t}
              </div>
            ))}
            <button onClick={()=>router.push('/auth?mode=signup')} style={{width:'100%',marginTop:16,padding:'10px 0',borderRadius:9,border:'1px solid #30363d',background:'transparent',color:'#8b949e',fontSize:13,fontWeight:600,cursor:'pointer'}}>
              Get started free →
            </button>
          </div>
          {/* Student Pro */}
          <div style={{background:'#161b22',border:'2px solid rgba(96,165,250,.3)',borderRadius:14,padding:'22px 24px',position:'relative'}}>
            <div style={{position:'absolute',top:-12,left:20,background:'#60a5fa',color:'#fff',fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20}}>
              RECOMMENDED FOR FAMILIES
            </div>
            <div style={{fontSize:12,fontWeight:700,color:'#484f58',letterSpacing:'.07em',marginBottom:10}}>STUDENT PRO</div>
            <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:4}}>
              <span style={{fontSize:38,fontWeight:800,color:'#e6edf3',letterSpacing:'-.03em'}}>$7</span>
              <span style={{fontSize:14,color:'#8b949e'}}>/mo</span>
            </div>
            <div style={{fontSize:12,color:'#8b949e',marginBottom:16}}>Or $55/year · includes a 3-day free trial</div>
            {['Unlimited AI flashcards, quizzes, guides and summaries','Unlimited Nova AI Tutor conversations','Spaced repetition, progress tracking, voice mode'].map(t=>(
              <div key={t} style={{display:'flex',alignItems:'flex-start',gap:10,fontSize:13,color:'#8b949e',marginBottom:8,lineHeight:1.5}}>
                <div style={{width:20,height:20,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:'rgba(96,165,250,.15)'}}>
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                {t}
              </div>
            ))}
            <button onClick={()=>router.push('/auth?mode=signup')} style={{width:'100%',marginTop:16,padding:'11px 0',borderRadius:9,border:'none',background:'linear-gradient(90deg,#2563eb,#7c3aed)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',letterSpacing:'-.01em'}}>
              Start 3-day free trial →
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM CTA */}
      <div style={{background:'linear-gradient(135deg,rgba(96,165,250,.08),rgba(167,139,250,.08))',borderTop:'1px solid #21262d',padding:'56px 24px',textAlign:'center'}}>
        <div style={{maxWidth:500,margin:'0 auto'}}>
          <h2 style={{fontSize:32,fontWeight:800,letterSpacing:'-.02em',color:'#e6edf3',marginBottom:10}}>Give them the help they deserve.</h2>
          <p style={{fontSize:15,color:'#8b949e',marginBottom:24}}>Try Flashfo free for 3 days. Cancel any time.</p>
          <button onClick={()=>router.push('/auth?mode=signup')} style={{background:'linear-gradient(90deg,#2563eb,#7c3aed)',color:'#fff',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer',padding:'14px 36px',letterSpacing:'-.01em'}}>
            Start free trial →
          </button>
        </div>
      </div>
    </div>
  )
}
