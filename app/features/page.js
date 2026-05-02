'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function FeaturesPage() {
  const [menuOpen, setMenuOpen] = useState(false)
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
  ]

  const S = {
    page: {minHeight:'100vh',background:'#080c14',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:'#e6edf3'},
    nav: {background:'#0d1117',borderBottom:'1px solid #21262d',padding:'12px 24px',display:'flex',alignItems:'center',gap:24,position:'sticky',top:0,zIndex:50},
    section: {padding:'56px 24px',maxWidth:900,margin:'0 auto'},
    card: {background:'#161b22',border:'1px solid #21262d',borderRadius:14,padding:'20px 22px'},
    badge: (col) => ({display:'inline-flex',alignItems:'center',gap:5,borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700,letterSpacing:'.05em',background:'rgba('+col+',.08)',border:'1px solid rgba('+col+',.2)',color:'rgb('+col+')',marginBottom:14}),
    tick: {display:'flex',alignItems:'center',gap:10,fontSize:13,color:'#8b949e',marginBottom:8},
    tickDot: (col) => ({width:20,height:20,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:'rgba('+col+',.15)'}),
  }

  return (
    <div style={S.page}>
      <nav style={{background:'#0d1117',borderBottom:'1px solid #21262d',padding:'0 20px',display:'flex',alignItems:'center',justifyContent:'space-between',height:56,position:'sticky',top:0,zIndex:50}}>
        <style>{`
          @media(max-width:768px){.spnl{display:none!important}.spcta{display:none!important}.sphb{display:flex!important}}
          .spnl{display:flex}.spcta{display:inline-flex}.sphb{display:none;flex-direction:column;gap:5px;cursor:pointer;background:transparent;border:none;padding:6px;outline:none}
          .sphb-line{width:20px;height:2px;background:#8b949e;border-radius:1px;transition:transform .2s,opacity .2s;display:block}
        
          @media(max-width:768px){
            .mg2{grid-template-columns:1fr!important}
            .mg4{grid-template-columns:1fr 1fr!important;gap:10px!important}
            .mg3{grid-template-columns:1fr!important}
            .mob-section{padding:40px 16px!important}
          }`}</style>
          <a href="/" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none',flexShrink:0}}>
            <div style={{position:'relative',width:28,height:28}}>
              <div style={{position:'absolute',top:-2,left:-2,right:-2,bottom:-2,borderRadius:9,background:'conic-gradient(#3b82f6,#8b5cf6,#a78bfa,#3b82f6)',animation:'nav-spin 3s linear infinite'}}/>
              <div style={{position:'absolute',top:2,left:2,right:2,bottom:2,background:'#0d1117',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="#3b82f6"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
              </div>
            </div>
            <span style={{fontSize:15,fontWeight:700,color:'#e6edf3'}}>Flashfo</span>
          </a>
          <div className="spnl" style={{gap:20,alignItems:'center',flex:1,justifyContent:'center'}}>
            {[{l:'Home',h:'/'},{l:'Features',h:'/features'},{l:'For Teachers',h:'/for-teachers'},{l:'For Parents',h:'/for-parents'},{l:'Pricing',h:'/pricing'}].map(({l,h})=>(
              <a key={l} href={h} style={{fontSize:13,color:h==='/features'?'#3b82f6':'#8b949e',fontWeight:h==='/features'?600:400,textDecoration:'none',borderBottom:h==='/features'?'2px solid #3b82f6':'none',paddingBottom:2}}>{l}</a>
            ))}
          </div>
          <a href="/auth?mode=signup" className="spcta" style={{background:'linear-gradient(90deg,#2563eb,#7c3aed)',color:'#fff',border:'none',borderRadius:9,fontSize:13,fontWeight:700,padding:'8px 16px',textDecoration:'none',flexShrink:0}}>Sign up free</a>
          <button className="sphb" onClick={()=>setMenuOpen(o=>!o)} aria-label="Menu">
            <span className="sphb-line" style={{transform:menuOpen?'rotate(45deg) translateY(7px)':'none'}}/>
            <span className="sphb-line" style={{opacity:menuOpen?0:1}}/>
            <span className="sphb-line" style={{transform:menuOpen?'rotate(-45deg) translateY(-7px)':'none'}}/>
          </button>
        </nav>
        {menuOpen && (
          <div style={{background:'#0d1117',borderBottom:'1px solid #21262d',position:'sticky',top:56,zIndex:49}}>
            {[{l:'Home',h:'/'},{l:'Features',h:'/features'},{l:'For Teachers',h:'/for-teachers'},{l:'For Parents',h:'/for-parents'},{l:'Pricing',h:'/pricing'}].map(({l,h})=>(
              <a key={l} href={h} onClick={()=>setMenuOpen(false)}
                style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid #21262d',fontSize:15,color:'#e6edf3',textDecoration:'none',fontWeight:500}}>
                {l} <span style={{color:'#484f58'}}>{'›'}</span>
              </a>
            ))}
            <a href="/auth?mode=signup" style={{display:'block',margin:'12px 16px 16px',padding:'13px 0',textAlign:'center',background:'linear-gradient(90deg,#2563eb,#7c3aed)',color:'#fff',fontSize:15,fontWeight:700,borderRadius:9,textDecoration:'none'}}>Sign up free</a>
          </div>
        )}

      {/* HERO */}
      <div style={{padding:'64px 24px 40px',textAlign:'center',maxWidth:760,margin:'0 auto'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:6,borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700,letterSpacing:'.05em',background:'rgba(167,139,250,.08)',border:'1px solid rgba(167,139,250,.2)',color:'#a78bfa',marginBottom:18}}>
          FLASHFO - STUDENT FEATURES
        </div>
        <h1 style={{fontSize:46,fontWeight:800,letterSpacing:'-.03em',lineHeight:1.1,marginBottom:16}}>
          Every study tool you need.<br/>
          <span style={{background:'linear-gradient(90deg,#2563eb,#a78bfa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Built by AI in seconds.</span>
        </h1>
        <p style={{fontSize:16,color:'#8b949e',lineHeight:1.7,marginBottom:28,maxWidth:560,margin:'0 auto 28px'}}>
          Type any topic and Nova generates personalized flashcards, quizzes, study guides, and summaries — tailored to exactly what you're studying.
        </p>
        <div style={{display:'flex',gap:12,justifyContent:'center'}}>
          <button onClick={()=>router.push('/auth?mode=signup')} style={{background:'linear-gradient(90deg,#2563eb,#7c3aed)',color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',padding:'12px 28px',letterSpacing:'-.01em'}}>
            Start 3-day free trial →
          </button>
          <button onClick={()=>router.push('/pricing')} style={{background:'transparent',color:'#8b949e',border:'1px solid #30363d',borderRadius:10,fontSize:13,cursor:'pointer',padding:'12px 20px'}}>
            View pricing
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{maxWidth:900,margin:'0 auto 56px',padding:'0 24px'}}>
        <div className="mg4" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          {[
            {num:'3×',label:'better retention vs passive reading'},
            {num:'15s',label:'average time to generate a full deck'},
            {num:'6',label:'AI study tools in one workspace'},
            {num:'∞',label:'any topic, any subject, any level'},
          ].map(({num,label})=>(
            <div key={num} style={{textAlign:'center',background:'#161b22',border:'1px solid #21262d',borderRadius:12,padding:'20px 12px'}}>
              <div style={{fontSize:34,fontWeight:800,letterSpacing:'-.03em',color:'#e6edf3'}}>{num}</div>
              <div style={{fontSize:12,color:'#8b949e',marginTop:5,lineHeight:1.4}}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURE 1: FLASHCARDS */}
      <div className="mob-section" style={{...S.section,paddingTop:0}}>
        <div className="mg2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:36,alignItems:'start'}}>
          <div>
            <div style={S.badge('37,99,235')}>FLASHCARDS</div>
            <h2 style={{fontSize:30,fontWeight:800,letterSpacing:'-.02em',marginBottom:10,color:'#e6edf3'}}>A full deck from one sentence</h2>
            <p style={{fontSize:14,color:'#8b949e',lineHeight:1.7,marginBottom:20}}>Type your topic and Nova generates comprehensive flashcards covering every angle — definitions, dates, causes, comparisons, and more. No more spending hours making cards by hand.</p>
            {[
              {n:'1',c:'37,99,235',title:'Type any topic',desc:'Course notes, a subject, or paste text directly'},
              {n:'2',c:'167,139,250',title:'Nova builds your deck',desc:'Cards appear one by one as Nova writes them — live'},
              {n:'3',c:'52,211,153',title:'Study, edit, and save',desc:'Flip cards, rate difficulty, save to your library'},
            ].map(({n,c,title,desc})=>(
              <div key={n} style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:14}}>
                <div style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0,background:'rgba('+c+',.15)',color:'rgb('+c+')'}}>
                  {n}
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'#e6edf3',marginBottom:2}}>{title}</div>
                  <div style={{fontSize:12,color:'#8b949e'}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:12,padding:16}}>
            <div style={{fontSize:10,color:'#484f58',letterSpacing:'.07em',marginBottom:8}}>TOPIC</div>
            <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:8,padding:'10px 13px',fontSize:13,color:'#e6edf3',marginBottom:12}}>The French Revolution</div>
            <div style={{fontSize:10,color:'#484f58',letterSpacing:'.07em',marginBottom:8}}>GENERATED · 12 CARDS</div>
            {[
              {q:'What were the three Estates in pre-revolutionary France?',a:'Clergy (1st), Nobility (2nd), Commoners (3rd). The Third Estate was 98% of the population but paid the most taxes.',c:'37,99,235'},
              {q:'In what year did the French Revolution begin?',a:'1789 — triggered by financial crisis, food shortages, and the convening of the Estates-General.',c:'167,139,250'},
              {q:'What was the Declaration of the Rights of Man?',a:'A 1789 document proclaiming liberty, equality, and popular sovereignty as fundamental rights.',c:'52,211,153'},
            ].map((card,i)=>(
              <div key={i} className="page-card-anim" style={{background:'#161b22',border:'1px solid #21262d',borderRadius:10,padding:12,marginBottom:8,animationDelay:i*150+'ms',display:'flex',gap:10}}>
                <div style={{width:22,height:22,borderRadius:6,background:'rgba('+card.c+',.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:9,fontWeight:700,color:'rgb('+card.c+')'}}>
                  {i+1}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'#e6edf3',marginBottom:5}}>{card.q}</div>
                  <div style={{fontSize:11,color:'#8b949e',paddingTop:5,borderTop:'1px solid #21262d',lineHeight:1.5}}>{card.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURE 2: SPACED REP */}
      <div style={{background:'#161b22',borderTop:'1px solid #21262d',borderBottom:'1px solid #21262d',padding:'56px 24px'}}>
        <div style={{maxWidth:900,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:36,alignItems:'center'}}>
          <div style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:12,padding:20}}>
            <div style={{fontSize:13,fontWeight:700,color:'#e6edf3',marginBottom:18}}>Retention after 2 weeks</div>
            {[
              {label:'Without spaced repetition',pct:28,col:'#f87171'},
              {label:'With Flashfo spaced repetition',pct:84,col:'#34d399'},
            ].map(({label,pct,col})=>(
              <div key={label} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}>
                  <span style={{color:'#8b949e'}}>{label}</span>
                  <span style={{color:col,fontWeight:700}}>{pct}%</span>
                </div>
                <div style={{height:8,background:'#21262d',borderRadius:4,overflow:'hidden'}}>
                  <div style={{width:pct+'%',height:'100%',background:col,borderRadius:4,transition:'width 1.5s ease'}}/>
                </div>
              </div>
            ))}
            <div style={{marginTop:18,paddingTop:14,borderTop:'1px solid #21262d'}}>
              <div style={{fontSize:12,color:'#8b949e',marginBottom:10}}>Rate each card — Flashfo adapts:</div>
              <div style={{display:'flex',gap:6}}>
                {['Again','Hard','Good','Easy'].map((l,i)=>(
                  <div key={l} style={{flex:1,textAlign:'center',padding:'7px 0',borderRadius:7,fontSize:11,fontWeight:700,cursor:'pointer',background:['rgba(239,68,68,.1)','rgba(245,158,11,.1)','rgba(34,197,94,.1)','rgba(37,99,235,.1)'][i],color:['#f87171','#f59e0b','#4ade80','#3b82f6'][i]}}>
                    {l}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div style={S.badge('167,139,250')}>SPACED REPETITION</div>
            <h2 style={{fontSize:30,fontWeight:800,letterSpacing:'-.02em',marginBottom:10,color:'#e6edf3'}}>Study less. Remember more.</h2>
            <p style={{fontSize:14,color:'#8b949e',lineHeight:1.7,marginBottom:20}}>Flashfo uses a proven spaced repetition algorithm. Cards you struggle with appear more often. Cards you know fade into the background. Your study time goes exactly where it's needed.</p>
            {['Cards adapt to your personal learning pace','Study streaks keep you consistent every day','Progress tracking shows exactly what you know','No more cramming — retention that actually lasts'].map(t=>(
              <div key={t} style={S.tick}>
                <div style={S.tickDot('52,211,153')}>
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURE 3: QUIZ */}
      <div style={S.section}>
        <div className="mg2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:36,alignItems:'start'}}>
          <div>
            <div style={S.badge('52,211,153')}>QUIZZES</div>
            <h2 style={{fontSize:30,fontWeight:800,letterSpacing:'-.02em',marginBottom:10,color:'#e6edf3'}}>Test yourself before the test does</h2>
            <p style={{fontSize:14,color:'#8b949e',lineHeight:1.7,marginBottom:20}}>Nova generates multiple choice, true/false, and short-answer questions — complete with detailed explanations for every answer so you actually learn, not just guess.</p>
            <div className="mg2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[
                {t:'Multiple choice',c:'#3b82f6'},
                {t:'True / false',c:'#a78bfa'},
                {t:'Short answer',c:'#34d399'},
                {t:'Matching pairs',c:'#f59e0b'},
              ].map(({t,c})=>(
                <div key={t} style={{background:'#161b22',border:'1px solid #21262d',borderRadius:8,padding:'10px 12px',display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:c,flexShrink:0}}/>
                  <span style={{fontSize:12,color:'#8b949e'}}>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:12,padding:16}}>
            <div style={{fontSize:12,fontWeight:600,color:'#e6edf3',marginBottom:12}}>Q2 of 10 · Photosynthesis</div>
            <div style={{fontSize:13,color:'#e6edf3',marginBottom:12,lineHeight:1.6}}>Which organelle is the primary site of photosynthesis in plant cells?</div>
            {[
              {l:'A',t:'Mitochondria',correct:false},
              {l:'B',t:'Chloroplast',correct:true},
              {l:'C',t:'Nucleus',correct:false},
            ].map(({l,t,correct})=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:8,border:'1px solid '+(correct?'rgba(52,211,153,.4)':'#21262d'),background:correct?'rgba(52,211,153,.08)':'#161b22',marginBottom:6,fontSize:12,color:correct?'#34d399':'#8b949e'}}>
                <div style={{width:22,height:22,borderRadius:6,background:correct?'rgba(52,211,153,.2)':'#21262d',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:correct?'#34d399':'#6b7280'}}>{l}</div>
                {t}{correct?' ✓':''}
              </div>
            ))}
            <div style={{background:'rgba(52,211,153,.06)',border:'1px solid rgba(52,211,153,.2)',borderRadius:8,padding:'10px 12px',marginTop:10,fontSize:11,color:'#34d399',lineHeight:1.6}}>
              Chloroplasts contain chlorophyll and the thylakoid membranes where light reactions occur — making them the site of photosynthesis.
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE 4: NOVA TUTOR */}
      <div style={{background:'#161b22',borderTop:'1px solid #21262d',borderBottom:'1px solid #21262d',padding:'56px 24px'}}>
        <div style={{maxWidth:900,margin:'0 auto',textAlign:'center'}}>
          <div style={S.badge('167,139,250')}>MEET NOVA</div>
          <h2 style={{fontSize:30,fontWeight:800,letterSpacing:'-.02em',marginBottom:10,color:'#e6edf3'}}>Ask Nova anything. Get it explained your way.</h2>
          <p style={{fontSize:14,color:'#8b949e',lineHeight:1.7,marginBottom:32,maxWidth:540,margin:'0 auto 32px'}}>Stuck on a concept? Nova explains it step by step, in plain English, with examples tailored to your level — available any time, for any subject.</p>
          <div style={{maxWidth:560,margin:'0 auto',background:'#0d1117',border:'1px solid #21262d',borderRadius:14,overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid #21262d',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:26,height:26,borderRadius:8,background:'linear-gradient(135deg,#2563eb,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="white"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
              </div>
              <span style={{fontSize:13,fontWeight:600,color:'#e6edf3'}}>Nova</span>
              <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:5}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:'#34d399'}}/>
                <span style={{fontSize:11,color:'#34d399'}}>Online</span>
              </div>
            </div>
            <div style={{padding:16,display:'flex',flexDirection:'column',gap:12}}>
              <div style={{alignSelf:'flex-end',background:'#21262d',borderRadius:'12px 12px 2px 12px',padding:'10px 14px',fontSize:13,color:'#e6edf3',maxWidth:'80%',textAlign:'left'}}>
                Can you explain osmosis? I keep mixing it up with diffusion.
              </div>
              <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                <div style={{width:26,height:26,borderRadius:'50%',background:'#161b22',border:'1px solid #30363d',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#a78bfa" strokeWidth="1.2"/>
                    <circle cx="12" cy="12" r="6" stroke="#a78bfa" strokeWidth="1.2"/>
                    <circle cx="12" cy="12" r="2" fill="#a78bfa"/>
                  </svg>
                </div>
                <div style={{background:'#161b22',border:'1px solid #21262d',borderRadius:'2px 12px 12px 12px',padding:'12px 14px',fontSize:12,color:'#8b949e',lineHeight:1.7,maxWidth:'85%',textAlign:'left'}}>
                  Great question — this trips up a lot of people!<br/><br/>
                  <span style={{color:'#3b82f6',fontWeight:600}}>Diffusion</span> = movement of <em>any</em> molecule from high to low concentration.<br/>
                  <span style={{color:'#a78bfa',fontWeight:600}}>Osmosis</span> = movement of <em>water specifically</em> across a semi-permeable membrane.<br/><br/>
                  Think of it this way: osmosis is just a special type of diffusion, but only for water, and only when there's a membrane involved.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE 5: STUDY GUIDE + SUMMARY */}
      <div style={S.section}>
        <div className="mg2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <div style={S.card}>
            <div style={S.badge('34,197,94')}>STUDY GUIDES</div>
            <h3 style={{fontSize:20,fontWeight:800,letterSpacing:'-.02em',marginBottom:8,color:'#e6edf3'}}>Deep, structured guides on anything</h3>
            <p style={{fontSize:13,color:'#8b949e',lineHeight:1.7,marginBottom:16}}>Nova writes in-depth, section-by-section study guides on any topic. Choose brief, standard, or deep — and get a guide that covers exactly what you need.</p>
            <button onClick={()=>router.push('/study-guide')} style={{background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.3)',color:'#4ade80',borderRadius:8,fontSize:12,fontWeight:600,padding:'7px 16px',cursor:'pointer'}}>
              Try study guide →
            </button>
          </div>
          <div style={S.card}>
            <div style={S.badge('167,139,250')}>SUMMARIES</div>
            <h3 style={{fontSize:20,fontWeight:800,letterSpacing:'-.02em',marginBottom:8,color:'#e6edf3'}}>Turn any text into bullet-point gold</h3>
            <p style={{fontSize:13,color:'#8b949e',lineHeight:1.7,marginBottom:16}}>Paste your notes, an article, or a chapter. Nova condenses it into a clear overview and key takeaways — in seconds.</p>
            <button onClick={()=>router.push('/summarize')} style={{background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.3)',color:'#a78bfa',borderRadius:8,fontSize:12,fontWeight:600,padding:'7px 16px',cursor:'pointer'}}>
              Try summariser →
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM CTA */}
      <div style={{background:'linear-gradient(135deg,rgba(37,99,235,.1),rgba(124,58,237,.1))',borderTop:'1px solid #21262d',padding:'56px 24px',textAlign:'center'}}>
        <div style={{maxWidth:520,margin:'0 auto'}}>
          <h2 style={{fontSize:34,fontWeight:800,letterSpacing:'-.02em',color:'#e6edf3',marginBottom:10}}>Ready to study smarter?</h2>
          <p style={{fontSize:15,color:'#8b949e',marginBottom:24}}>Start your 3-day free trial. No credit card required to get going.</p>
          <button onClick={()=>router.push('/auth?mode=signup')} style={{background:'linear-gradient(90deg,#2563eb,#7c3aed)',color:'#fff',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer',padding:'14px 36px',letterSpacing:'-.01em'}}>
            Start 3-day free trial →
          </button>
        </div>
      </div>
    </div>
  )
}
