'use client'
import { useEffect } from 'react'

const ENTRIES = [
  {
    date: 'April 30, 2026',
    version: 'v6.2',
    category: 'New feature',
    catColor: '#a78bfa',
    title: 'School Admin Dashboard',
    desc: 'School plan users now have access to a full admin dashboard. Invite teachers, track seat usage (up to 10), monitor class activity, and manage your whole school from one screen.',
  },
  {
    date: 'April 30, 2026',
    version: 'v6.2',
    category: 'New feature',
    catColor: '#a78bfa',
    title: 'Nova Lesson Builder — full overhaul',
    desc: 'The lesson builder has been completely rebuilt. Choose grade level, duration, and which sections to include. Nova generates a structured, classroom-ready lesson plan and you can auto-generate a quiz from it in one click.',
  },
  {
    date: 'April 29, 2026',
    version: 'v6.1',
    category: 'New feature',
    catColor: '#a78bfa',
    title: 'Stripe checkout & 3-day free trial',
    desc: 'Flashfo is now monetised. Student Pro ($7/mo), Teacher Pro ($13/mo), and School ($149/mo) plans are live. All paid plans include a 3-day free trial — no charge until day 4.',
  },
  {
    date: 'April 29, 2026',
    version: 'v6.1',
    category: 'New feature',
    catColor: '#a78bfa',
    title: 'Pricing page',
    desc: 'A full pricing page is now live at /pricing with monthly/annual toggle, feature lists for each plan, and a current plan indicator for logged-in users.',
  },
  {
    date: 'April 28, 2026',
    version: 'v6.1',
    category: 'Improvement',
    catColor: '#3b82f6',
    title: 'Nova generation animation',
    desc: 'Flashcards, quizzes, study guides, and summaries now pop in with a smooth spring animation as Nova generates them — each item bounces in one by one, exactly like the demo on the landing page.',
  },
  {
    date: 'April 28, 2026',
    version: 'v6.1',
    category: 'Improvement',
    catColor: '#3b82f6',
    title: 'Auth page redesign',
    desc: 'The sign-in and sign-up page has been redesigned with a deep dark background, spinning gradient logo, blue-to-purple gradient button, and an inline tab switcher between sign in and sign up.',
  },
  {
    date: 'April 27, 2026',
    version: 'v6.0',
    category: 'New feature',
    catColor: '#a78bfa',
    title: 'Live Quiz system',
    desc: 'Teachers can now host live quizzes for their whole class. Generate questions from any topic, share a code, and watch every student respond in real time with a live leaderboard.',
  },
  {
    date: 'April 27, 2026',
    version: 'v6.0',
    category: 'Legal',
    catColor: '#f59e0b',
    title: 'Privacy Policy & Terms of Service',
    desc: 'Flashfo now has a full Privacy Policy and Terms of Service, both effective May 1, 2026. These cover COPPA, FERPA, CCPA, data retention, and subscription terms. Available at /privacy and /terms.',
  },
  {
    date: 'April 26, 2026',
    version: 'v6.0',
    category: 'Improvement',
    catColor: '#3b82f6',
    title: 'Lifetime access for beta testers',
    desc: 'Everyone who beta tested Flashfo has been granted lifetime free access to all pro features. No subscription required — ever. Thank you for helping build this.',
  },
  {
    date: 'April 25, 2026',
    version: 'v6.0',
    category: 'Launch',
    catColor: '#34d399',
    title: 'Flashfo v6.0 — platform launch',
    desc: 'Flashfo v6.0 is live. Includes Nova AI flashcard generation, quiz builder, study guide writer, summariser, Nova AI Tutor, spaced repetition, voice mode, live quizzes, lesson builder, curriculum planner, assignment builder, student portal, collab decks, and a full settings suite.',
  },
]

export default function WhatsNewPage() {
  useEffect(() => {
    const id = 'flashfo-page-css'
    if (document.getElementById(id)) return
    const s = document.createElement('style')
    s.id = id
    s.textContent = '@keyframes nav-spin{to{transform:rotate(360deg)}} @keyframes card-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} .wn-card{opacity:0;animation:card-in .35s ease forwards}'
    document.head.appendChild(s)
    document.querySelectorAll('.wn-card').forEach((el,i)=>{
      el.style.animationDelay = i*60+'ms'
    })
  }, [])

  const NAV_LINKS = [
    {label:'Home',href:'/'},
    {label:'Features',href:'/features'},
    {label:'For Teachers',href:'/for-teachers'},
    {label:'Pricing',href:'/pricing'},
    {label:"What's new",href:'/whats-new'},
  ]

  return (
    <div style={{minHeight:'100vh',background:'#080c14',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:'#e6edf3'}}>
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
            <a key={label} href={href} style={{fontSize:13,color:href==='/whats-new'?'#f59e0b':'#8b949e',fontWeight:href==='/whats-new'?600:400,textDecoration:'none',borderBottom:href==='/whats-new'?'2px solid #f59e0b':'none',paddingBottom:2}}>
              {label}
            </a>
          ))}
        </div>
        <a href="/auth?mode=signup" style={{marginLeft:'auto',background:'linear-gradient(90deg,#2563eb,#7c3aed)',color:'#fff',border:'none',borderRadius:9,fontSize:13,fontWeight:700,padding:'8px 18px',cursor:'pointer',textDecoration:'none',letterSpacing:'-.01em'}}>
          Sign up free →
        </a>
      </nav>

      <div style={{maxWidth:720,margin:'0 auto',padding:'56px 24px'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:6,borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700,letterSpacing:'.05em',background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.2)',color:'#f59e0b',marginBottom:18}}>
          CHANGELOG
        </div>
        <h1 style={{fontSize:40,fontWeight:800,letterSpacing:'-.03em',marginBottom:8,color:'#e6edf3'}}>What's new in Flashfo</h1>
        <p style={{fontSize:15,color:'#8b949e',lineHeight:1.7,marginBottom:48}}>Every update, improvement, and new feature — in one place.</p>

        <div style={{position:'relative'}}>
          <div style={{position:'absolute',left:79,top:0,bottom:0,width:1,background:'#21262d'}}/>
          {ENTRIES.map((entry,i)=>(
            <div key={i} className="wn-card" style={{display:'flex',gap:20,marginBottom:32,animationDelay:i*60+'ms'}}>
              <div style={{width:80,flexShrink:0,textAlign:'right',paddingTop:2}}>
                <div style={{fontSize:11,color:'#484f58',lineHeight:1.4}}>{entry.date.split(',')[0]}</div>
                <div style={{fontSize:10,color:'#30363d',marginTop:2}}>{entry.version}</div>
              </div>
              <div style={{width:20,flexShrink:0,display:'flex',justifyContent:'center',paddingTop:4,position:'relative',zIndex:1}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:entry.catColor,border:'2px solid #080c14'}}/>
              </div>
              <div style={{flex:1,background:'#161b22',border:'1px solid #21262d',borderRadius:12,padding:'16px 18px'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <div style={{padding:'2px 8px',borderRadius:5,fontSize:10,fontWeight:700,background:'rgba('+entry.catColor.replace('#','').match(/../g).map(h=>parseInt(h,16)).join(',')+',.1)',color:entry.catColor}}>
                    {entry.category}
                  </div>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:'#e6edf3',marginBottom:6}}>{entry.title}</div>
                <div style={{fontSize:13,color:'#8b949e',lineHeight:1.7}}>{entry.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
