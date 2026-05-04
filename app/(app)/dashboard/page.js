'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

// ─── Icon components ─────────────────────────────────────
// All use the same style: 16x16 viewBox, stroke only, 1.5px, round caps
// This matches the sidebar and shell icons throughout the app

const Ic = ({ d, size=15, color='currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
    stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
)

const ICONS = {
  nova:        'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10a3 3 0 100-6 3 3 0 000 6z',
  flashcards:  'M3 3h7l3 3v7H3V3zm0 0v10m7-10v3h3M6 8h4M6 11h2',
  quiz:        'M6 5.5A2.5 2.5 0 0111 7c0 2-2.5 2-2.5 3.5M8.5 13v.5',
  guide:       'M2 2h8l4 4v9H2V2zm0 0v13m4-9h4M6 10h4M6 13h2',
  assign:      'M3 2h10v12H3V2zm3 4h4M6 9h4M6 12h2M9 2v3H6V2',
  livequiz:    'M1 8a7 7 0 1014 0A7 7 0 001 8zm5-2l5 2-5 2V6z',
  create:      'M8 1v14M1 8h14',
  progress:    'M2 12l3-6 3 3 3-4 3 7M2 2v12h12',
  history:     'M8 1a7 7 0 100 14A7 7 0 008 1zm0 4v4l3 1.5',
  classes:     'M8 1a4 4 0 100 8A4 4 0 008 1zm-6 14c0-3.3 2.7-6 6-6s6 2.7 6 6',
  assignment:  'M4 1h8a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1zm2 4h4M6 8h4M6 11h2',
  activity:    'M1 8h2l2-6 3 12 2-8 2 4 1-2h2',
  warning:     'M8 1l7 13H1L8 1zm0 5v4M8 12v1',
  arrow:       'M3 8h10M9 4l4 4-4 4',
  saved:       'M3 2h10a1 1 0 011 1v12l-6-3-6 3V3a1 1 0 011-1z',
  star:        'M8 1l1.8 3.8 4.2.6-3 3 .7 4.1L8 11.3 4.3 13.4l.7-4.1-3-3 4.2-.6z',
  message:     'M1 4h14v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4zm0 0l7 5 7-5',
}

// ─── Helpers ────────────────────────────────────────────

function getDashboardType(profile) {
  if (!profile) return 'student'
  const plan = profile.plan || 'free'
  // teacher_pro always gets teacher view — no choice needed
  if (plan === 'teacher_pro') return 'teacher'
  // For lifetime: check localStorage first (works before migration runs),
  // then fall back to DB value
  const isLifetime = plan === 'lifetime'
  if (isLifetime) {
    const local = typeof window !== 'undefined' ? localStorage.getItem('ff-dashboard-pref') : null
    const pref = local || profile.dashboard_preference || 'student'
    if (pref === 'teacher') return 'teacher'
  }
  return 'student'
}

function injectStyles() {
  const id = 'dash-v2'
  if (document.getElementById(id)) return
  const s = document.createElement('style')
  s.id = id
  s.textContent = `
    @keyframes dash-fadein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes dash-pulse{0%,100%{opacity:1}50%{opacity:.3}}
    @keyframes dash-spin{to{transform:rotate(360deg)}}
    @keyframes dash-history{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .dash-tool:hover{transform:translateY(-2px)!important;transition:transform .16s ease,box-shadow .16s ease}
    .dash-row-hover:hover{background:rgba(255,255,255,0.04)!important;border-radius:8px}
    .dash-live-dot{animation:dash-pulse 1.6s ease-in-out infinite}
  `
  document.head.appendChild(s)
}

// ─── This Day in History ─────────────────────────────────

function TodayInHistory() {
  const [events, setEvents] = useState([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    fetch(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${now.getMonth()+1}/${now.getDate()}`)
      .then(r => r.json())
      .then(data => {
        const BAD = ['kill','murder','assassin','massacre','genocide','execut','suicide','terror','bomb','attack','shot','hung','beheaded','slaughter','riot','holocaust','rape','torture','hostage','hijack','casualties','wounded']
        const items = (data.selected||[])
          .filter(e => e.text && e.year && !BAD.some(w => e.text.toLowerCase().includes(w)))
          .slice(0, 6).map(e => ({ year: e.year, text: e.text }))
        setEvents(items)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (events.length < 2) return
    const t = setInterval(() => setIdx(i => (i+1) % events.length), 9000)
    return () => clearInterval(t)
  }, [events])

  const ev = events[idx]
  const cv = 'var(--c-surface)'
  const cl = 'var(--c-line)'

  return (
    <div style={{background:cv,border:`1px solid ${cl}`,borderRadius:12,padding:16,overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:24,height:24,borderRadius:7,background:'rgba(251,146,60,0.12)',border:'1px solid rgba(251,146,60,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Ic d={ICONS.history} size={12} color="#fb923c"/>
          </div>
          <span style={{fontSize:10,color:'var(--c-t3)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em'}}>This day in history</span>
        </div>
        <span style={{fontSize:10,color:'#fb923c',fontWeight:600}}>{new Date().toLocaleDateString('en-US',{month:'long',day:'numeric'})}</span>
      </div>
      {loading ? (
        <div style={{height:56,display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:18,height:18,border:'2px solid #fb923c',borderTopColor:'transparent',borderRadius:'50%',animation:'dash-spin .8s linear infinite'}}/>
          <span style={{fontSize:12,color:'var(--c-t3)'}}>Loading…</span>
        </div>
      ) : ev ? (
        <div style={{animation:'dash-history .35s ease'}} key={idx}>
          <div style={{display:'inline-block',background:'rgba(251,146,60,0.1)',border:'1px solid rgba(251,146,60,0.18)',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:700,color:'#fb923c',marginBottom:7}}>{ev.year}</div>
          <p style={{fontSize:12,color:'var(--c-t1)',lineHeight:1.6,margin:'0 0 10px'}}>{ev.text.length>150?ev.text.slice(0,150)+'…':ev.text}</p>
          <div style={{display:'flex',gap:4}}>
            {events.map((_,i)=>(
              <button key={i} onClick={()=>setIdx(i)} style={{width:i===idx?16:5,height:5,borderRadius:3,background:i===idx?'#fb923c':'var(--c-line)',border:'none',cursor:'pointer',transition:'all .22s',padding:0}}/>
            ))}
          </div>
        </div>
      ) : (
        <p style={{fontSize:12,color:'var(--c-t3)'}}>Could not load events for today.</p>
      )}
    </div>
  )
}

// ─── Tool card — used by both dashboards ─────────────────

function ToolCard({ href, icon, label, sub, glow, border, bg }) {
  return (
    <Link href={href} className="dash-tool" style={{
      background:bg, border:`1px solid ${border}`, borderRadius:12,
      padding:16, textDecoration:'none', position:'relative', overflow:'hidden', display:'block'
    }}>
      <div style={{position:'absolute',top:-28,right:-28,width:90,height:90,background:`radial-gradient(circle,${glow},transparent)`,pointerEvents:'none'}}/>
      <div style={{
        width:34,height:34,borderRadius:9,
        background:`rgba(${glow.slice(5,glow.lastIndexOf(','))},0.18)`,
        display:'flex',alignItems:'center',justifyContent:'center',
        marginBottom:11,position:'relative',zIndex:1,
        border:`1px solid ${border}`
      }}>
        <Ic d={icon} size={15} color={border.replace('0.18','0.9').replace('0.2','0.9').replace('0.22','0.9')}/>
      </div>
      <div style={{fontSize:13,fontWeight:700,color:'var(--c-t1)',marginBottom:2,position:'relative',zIndex:1}}>{label}</div>
      <div style={{fontSize:11,color:'var(--c-t3)',position:'relative',zIndex:1,lineHeight:1.4}}>{sub}</div>
    </Link>
  )
}

// ─── Student Dashboard ───────────────────────────────────

const STUDENT_TOOLS = [
  { href:'/ai-tutor',    icon:ICONS.nova,       label:'Nova',        sub:'AI tutor',       glow:'rgba(99,102,241,0.14)',  border:'rgba(99,102,241,0.2)',  bg:'rgba(99,102,241,0.05)'  },
  { href:'/flashcards',  icon:ICONS.flashcards, label:'Flashcards',  sub:'Study cards',    glow:'rgba(16,185,129,0.12)', border:'rgba(16,185,129,0.18)', bg:'rgba(16,185,129,0.04)'  },
  { href:'/quiz',        icon:ICONS.quiz,       label:'Quiz',        sub:'Test yourself',  glow:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.18)', bg:'rgba(245,158,11,0.04)'  },
  { href:'/study-guide', icon:ICONS.guide,      label:'Study Guide', sub:'Deep notes',     glow:'rgba(59,130,246,0.12)', border:'rgba(59,130,246,0.18)', bg:'rgba(59,130,246,0.04)'  },
]

const STEPS = [
  { label:'Generate your first flashcard deck', sub:'Takes 10 seconds',      href:'/flashcards', icon:ICONS.flashcards, color:'rgba(16,185,129,0.8)'  },
  { label:'Ask Nova your first question',        sub:'Any topic, instant',    href:'/ai-tutor',   icon:ICONS.nova,       color:'rgba(99,102,241,0.8)'  },
  { label:'Take a practice quiz',               sub:'Test what you know',    href:'/quiz',       icon:ICONS.quiz,       color:'rgba(245,158,11,0.8)'  },
]

function StudentDashboard({ profile, user }) {
  const [classes, setClasses] = useState([])
  const [dueToday, setDueToday] = useState(0)
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    if (user) loadData()
  }, [user])

  async function loadData() {
    try {
      const reviews = JSON.parse(localStorage.getItem('ff-card-reviews') || '{}')
      const due = Object.values(reviews).filter(v => v.nextReview && v.nextReview <= Date.now()).length
      setDueToday(due)
    } catch {}
    const { data: enroll } = await supabase.from('student_enrollments')
      .select('classroom_id,classrooms(name,subject)').eq('student_id', user.id)
    if (enroll) setClasses(enroll.map(e=>e.classrooms).filter(Boolean))
    const { count } = await supabase.from('saved_items')
      .select('id',{count:'exact',head:true}).eq('user_id', user.id)
    if (count) setSavedCount(count)
  }

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const cs = 'var(--c-surface)'
  const cl = 'var(--c-line)'

  return (
    <div style={{padding:'24px 28px',maxWidth:1080,margin:'0 auto'}}>

      {/* Top bar — no Create button on student, it clutters */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:11,color:'var(--c-t3)',marginBottom:2}}>{greeting}</div>
          <div style={{fontSize:22,fontWeight:800,color:'var(--c-t1)',letterSpacing:'-.4px'}}>Hey, {firstName} 👋</div>
        </div>
        {dueToday > 0 && (
          <Link href="/flashcards" style={{display:'inline-flex',alignItems:'center',gap:7,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.24)',borderRadius:9,padding:'8px 14px',textDecoration:'none'}}>
            <Ic d={ICONS.flashcards} size={13} color="#f59e0b"/>
            <span style={{fontSize:12,color:'#f59e0b',fontWeight:700}}>{dueToday} card{dueToday!==1?'s':''} due today</span>
          </Link>
        )}
      </div>

      {/* Welcome banner */}
      <div style={{background:cs,border:`1px solid ${cl}`,borderRadius:12,padding:'18px 22px',marginBottom:12,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-60,right:-60,width:200,height:200,background:'radial-gradient(circle,rgba(124,58,237,0.09) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-50,left:40,width:160,height:160,background:'radial-gradient(circle,rgba(59,130,246,0.06) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',justifyContent:'space-between',gap:20,flexWrap:'wrap'}}>
          <div>
            <div style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:10,fontWeight:700,color:'#818cf8',background:'rgba(129,140,248,0.1)',border:'1px solid rgba(129,140,248,0.18)',borderRadius:20,padding:'3px 10px',marginBottom:9}}>
              <Ic d={ICONS.star} size={10} color="#818cf8"/>
              Welcome to Flashfo
            </div>
            <div style={{fontSize:16,fontWeight:700,color:'var(--c-t1)',marginBottom:4}}>You're all set. Let's get you studying.</div>
            <div style={{fontSize:12,color:'var(--c-t2)',lineHeight:1.55}}>Generate flashcards, quiz yourself, or ask Nova — all powered by AI, built for how you study.</div>
          </div>
          <div style={{display:'flex',gap:8,flexShrink:0}}>
            <Link href="/flashcards" style={{display:'inline-flex',alignItems:'center',gap:7,padding:'9px 16px',borderRadius:9,background:'linear-gradient(90deg,#1d4ed8,#6d28d9)',color:'#fff',fontSize:12,fontWeight:700,textDecoration:'none',boxShadow:'0 4px 14px rgba(109,40,217,0.26)'}}>
              <Ic d={ICONS.flashcards} size={13} color="#fff"/>
              Generate flashcards
            </Link>
            <Link href="/ai-tutor" style={{display:'inline-flex',alignItems:'center',gap:7,padding:'9px 16px',borderRadius:9,background:'rgba(255,255,255,0.05)',border:`1px solid ${cl}`,color:'var(--c-t2)',fontSize:12,fontWeight:700,textDecoration:'none'}}>
              <Ic d={ICONS.nova} size={13} color="var(--c-t2)"/>
              Ask Nova
            </Link>
          </div>
        </div>
      </div>

      {/* 3-step checklist */}
      <div style={{display:'flex',border:`1px solid ${cl}`,borderRadius:12,overflow:'hidden',background:cs,marginBottom:16}}>
        {STEPS.map((step,i) => (
          <Link key={i} href={step.href} className="dash-row-hover" style={{flex:1,padding:'12px 16px',display:'flex',alignItems:'center',gap:10,borderRight:i<2?`1px solid ${cl}`:'none',textDecoration:'none',transition:'background .15s'}}>
            <div style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,0.04)',border:`1px solid ${cl}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Ic d={step.icon} size={13} color={step.color}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--c-t2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{step.label}</div>
              <div style={{fontSize:10,color:'var(--c-t3)',marginTop:1}}>{step.sub}</div>
            </div>
            <Ic d={ICONS.arrow} size={12} color="var(--c-t3)"/>
          </Link>
        ))}
      </div>

      {/* Tool grid */}
      <div style={{fontSize:10,fontWeight:700,color:'var(--c-t3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>Quick tools</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        {STUDENT_TOOLS.map(t => <ToolCard key={t.href} {...t}/>)}
      </div>

      {/* Bottom */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <TodayInHistory/>
        <div style={{background:cs,border:`1px solid ${cl}`,borderRadius:12,padding:16,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',gap:10,minHeight:120}}>
          <div style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,0.04)',border:`1px solid ${cl}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Ic d={ICONS.saved} size={16} color="var(--c-t3)"/>
          </div>
          {savedCount > 0 ? (
            <>
              <div style={{fontSize:13,fontWeight:600,color:'var(--c-t1)'}}>{savedCount} saved deck{savedCount!==1?'s':''}</div>
              <Link href="/my-stuff" style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:'#3b82f6',textDecoration:'none'}}>
                View My Stuff <Ic d={ICONS.arrow} size={11} color="#3b82f6"/>
              </Link>
            </>
          ) : (
            <>
              <div style={{fontSize:12,color:'var(--c-t3)'}}>Your saved decks will appear here</div>
              <Link href="/flashcards" style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:'#3b82f6',textDecoration:'none'}}>
                Generate your first deck <Ic d={ICONS.arrow} size={11} color="#3b82f6"/>
              </Link>
            </>
          )}
        </div>
      </div>

    </div>
  )
}

// ─── Teacher Dashboard ───────────────────────────────────

const TEACHER_TOOLS = [
  { href:'/assign',      icon:ICONS.assign,    label:'Assign Content',    sub:'Send to a class',          glow:'rgba(99,102,241,0.14)',  border:'rgba(99,102,241,0.2)',  bg:'rgba(99,102,241,0.05)'  },
  { href:'/live-quiz',   icon:ICONS.livequiz,  label:'Live Quiz',         sub:'Real-time classroom',      glow:'rgba(239,68,68,0.14)',   border:'rgba(239,68,68,0.2)',   bg:'rgba(239,68,68,0.05)',   live:true },
  { href:'/create',      icon:ICONS.create,    label:'Create Content',    sub:'AI-generate via Nova',     glow:'rgba(16,185,129,0.12)', border:'rgba(16,185,129,0.18)', bg:'rgba(16,185,129,0.04)'  },
  { href:'/my-progress', icon:ICONS.progress,  label:'Student Progress',  sub:'Scores and completion',   glow:'rgba(59,130,246,0.12)', border:'rgba(59,130,246,0.18)', bg:'rgba(59,130,246,0.04)'  },
]

const CLASS_COLORS = ['#818cf8','#34d399','#60a5fa','#f472b6','#fb923c']

function TeacherDashboard({ profile, user }) {
  const [classes, setClasses] = useState([])
  const [studentCount, setStudentCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [avgScore, setAvgScore] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (user) loadData()
    else setDataLoading(false)
  }, [user])

  async function loadData() {
    const { data: rooms } = await supabase.from('classrooms')
      .select('id,name,subject').eq('teacher_id', user.id)
    if (rooms) setClasses(rooms)
    if (rooms?.length) {
      const ids = rooms.map(r => r.id)
      const { count: sc } = await supabase.from('student_enrollments')
        .select('id',{count:'exact',head:true}).in('classroom_id', ids)
      if (sc) setStudentCount(sc)
      const { count: pc } = await supabase.from('assignment_submissions')
        .select('id',{count:'exact',head:true}).eq('status','pending').in('classroom_id', ids)
      if (pc) setPendingCount(pc)
    }
    setDataLoading(false)
  }

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const cs = 'var(--c-surface)'
  const cl = 'var(--c-line)'

  // Sample recent activity — replace with real Supabase query when activity log table exists
  const ACTIVITY = [
    { initials:'JR', bg:'rgba(129,140,248,0.13)', color:'#818cf8', name:'Jamie R.',   text:'scored 94% on Civil War Quiz',       time:'12m ago' },
    { initials:'MK', bg:'rgba(52,211,153,0.1)',   color:'#34d399', name:'Maya K.',    text:'submitted WWII essay assignment',    time:'1h ago'  },
    { initials:'TD', bg:'rgba(239,68,68,0.09)',   color:'#f87171', name:'Tyler D.',   text:'retook Economics quiz (58%)',        time:'3h ago'  },
    { initials:'3×', bg:'rgba(251,191,36,0.09)',  color:'#fbbf24', name:'3 students', text:'completed Reconstruction deck',      time:'5h ago'  },
  ]
  const AT_RISK = [
    { initials:'LC', name:'Luis C.',   pct:48, color:'#ef4444' },
    { initials:'AS', name:'Aisha S.',  pct:55, color:'#f97316' },
    { initials:'MW', name:'Marcus W.', pct:61, color:'#f59e0b' },
    { initials:'PN', name:'Priya N.',  pct:63, color:'#f59e0b' },
  ]

  return (
    <div style={{padding:'24px 28px',maxWidth:1080,margin:'0 auto'}}>

      {/* Top bar */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:11,color:'var(--c-t3)',marginBottom:2}}>{greeting}</div>
          <div style={{fontSize:22,fontWeight:800,color:'var(--c-t1)',letterSpacing:'-.4px'}}>
            {profile?.full_name ? `${profile.full_name} 👋` : 'Good to see you 👋'}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:20,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.18)',fontSize:11,fontWeight:700,color:'#fbbf24'}}>
            <Ic d={ICONS.star} size={10} color="#fbbf24"/>
            Teacher Pro
          </div>
          <Link href="/live-quiz" style={{display:'inline-flex',alignItems:'center',gap:7,padding:'8px 16px',borderRadius:9,border:'1px solid rgba(239,68,68,0.24)',background:'rgba(239,68,68,0.08)',color:'#f87171',fontSize:12,fontWeight:700,textDecoration:'none'}}>
            <span className="dash-live-dot" style={{width:7,height:7,borderRadius:'50%',background:'#ef4444',display:'inline-block',flexShrink:0}}/>
            Start Live Quiz
          </Link>
          <Link href="/create" style={{display:'inline-flex',alignItems:'center',gap:7,background:'linear-gradient(90deg,#1d4ed8,#6d28d9)',color:'#fff',borderRadius:9,padding:'9px 18px',fontSize:12,fontWeight:700,textDecoration:'none',boxShadow:'0 4px 14px rgba(109,40,217,0.26)'}}>
            <Ic d={ICONS.create} size={12} color="#fff"/>
            New Assignment
          </Link>
        </div>
      </div>

      {/* Welcome banner */}
      <div style={{background:cs,border:`1px solid ${cl}`,borderRadius:12,padding:'18px 22px',marginBottom:12,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-60,right:-60,width:220,height:220,background:'radial-gradient(circle,rgba(124,58,237,0.09) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-50,left:40,width:180,height:180,background:'radial-gradient(circle,rgba(59,130,246,0.06) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',justifyContent:'space-between',gap:20,flexWrap:'wrap'}}>
          <div>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:10,fontWeight:700,color:'#fbbf24',background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.18)',borderRadius:20,padding:'3px 10px',marginBottom:9}}>
              <Ic d={ICONS.assignment} size={10} color="#fbbf24"/>
              {pendingCount > 0 ? `${pendingCount} submission${pendingCount!==1?'s':''} need review` : 'All caught up'}
            </div>
            <div style={{fontSize:16,fontWeight:700,color:'var(--c-t1)',marginBottom:4}}>
              {classes.length > 0
                ? `You have ${studentCount} student${studentCount!==1?'s':''} across ${classes.length} class${classes.length!==1?'es':''}.`
                : "Let's set up your first class."}
            </div>
            <div style={{fontSize:12,color:'var(--c-t2)',lineHeight:1.55}}>
              {pendingCount > 0
                ? 'Some submissions are waiting for your review.'
                : classes.length > 0 ? 'Everything is on track — no pending submissions.' : 'Create a class and invite your students to get started.'}
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexShrink:0}}>
            {pendingCount > 0 && (
              <Link href="/assignments" style={{display:'inline-flex',alignItems:'center',gap:7,padding:'9px 16px',borderRadius:9,background:'rgba(255,255,255,0.05)',border:`1px solid ${cl}`,color:'var(--c-t2)',fontSize:12,fontWeight:700,textDecoration:'none'}}>
                <Ic d={ICONS.assignment} size={13} color="var(--c-t2)"/>
                View submissions
              </Link>
            )}
            <Link href={classes.length>0?'/assign':'/create'} style={{display:'inline-flex',alignItems:'center',gap:7,padding:'9px 16px',borderRadius:9,background:'linear-gradient(90deg,#1d4ed8,#6d28d9)',color:'#fff',fontSize:12,fontWeight:700,textDecoration:'none',boxShadow:'0 4px 14px rgba(109,40,217,0.24)'}}>
              <Ic d={ICONS.create} size={13} color="#fff"/>
              {classes.length>0 ? 'Create assignment' : 'Create first class'}
            </Link>
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        {[
          { label:'Active Classes',      val:classes.length||0, color:'#818cf8', grad:'linear-gradient(90deg,#6366f1,#8b5cf6)', sub:'This semester', icon:ICONS.classes },
          { label:'Students Enrolled',   val:studentCount,      color:'#34d399', grad:'linear-gradient(90deg,#10b981,#3b82f6)', sub:'All classes',   icon:ICONS.classes },
          { label:'Submissions Pending', val:pendingCount,      color:'#fbbf24', grad:'linear-gradient(90deg,#f59e0b,#ef4444)', sub:'Need review',   icon:ICONS.assignment, warn:pendingCount>0 },
          { label:'Class Avg Score',     val:avgScore!==null?avgScore+'%':'—', color:'#60a5fa', grad:'linear-gradient(90deg,#3b82f6,#8b5cf6)', sub:'Last 7 days', icon:ICONS.progress },
        ].map((s,i)=>(
          <div key={i} style={{background:cs,border:`1px solid ${cl}`,borderRadius:12,padding:'14px 16px',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:s.grad}}/>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
              <Ic d={s.icon} size={12} color="var(--c-t3)"/>
              <span style={{fontSize:10,fontWeight:700,color:'var(--c-t3)',textTransform:'uppercase',letterSpacing:'.07em'}}>{s.label}</span>
            </div>
            <div style={{fontSize:26,fontWeight:800,letterSpacing:'-1px',lineHeight:1,color:s.color,marginBottom:3}}>{s.val}</div>
            <div style={{fontSize:11,color:'var(--c-t3)'}}>{s.sub}</div>
            {s.warn && <div style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:10,fontWeight:600,padding:'2px 6px',borderRadius:5,background:'rgba(245,158,11,0.09)',color:'#fbbf24',marginTop:5}}>
              <Ic d={ICONS.warning} size={10} color="#fbbf24"/> Oldest 2 days ago
            </div>}
          </div>
        ))}
      </div>

      {/* Tool grid */}
      <div style={{fontSize:10,fontWeight:700,color:'var(--c-t3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>Quick tools</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        {TEACHER_TOOLS.map(t => (
          <Link key={t.href} href={t.href} className="dash-tool" style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:12,padding:16,textDecoration:'none',position:'relative',overflow:'hidden',display:'block'}}>
            <div style={{position:'absolute',top:-28,right:-28,width:90,height:90,background:`radial-gradient(circle,${t.glow},transparent)`,pointerEvents:'none'}}/>
            <div style={{position:'relative',zIndex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:11}}>
                <div style={{width:34,height:34,borderRadius:9,background:`rgba(${t.glow.slice(5,t.glow.lastIndexOf(','))},0.18)`,border:`1px solid ${t.border}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Ic d={t.icon} size={15} color={t.border.replace('0.2','0.9').replace('0.18','0.9')}/>
                </div>
                {t.live && <span className="dash-live-dot" style={{width:7,height:7,borderRadius:'50%',background:'#ef4444',display:'inline-block',border:'1.5px solid var(--c-surface)'}}/>}
              </div>
              <div style={{fontSize:13,fontWeight:700,color:'var(--c-t1)',marginBottom:2}}>{t.label}</div>
              <div style={{fontSize:11,color:'var(--c-t3)'}}>{t.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom 3-col */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 256px',gap:10}}>

        {/* Active classes */}
        <div style={{background:cs,border:`1px solid ${cl}`,borderRadius:12,padding:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              <Ic d={ICONS.classes} size={12} color="var(--c-t3)"/>
              <span style={{fontSize:10,fontWeight:700,color:'var(--c-t3)',textTransform:'uppercase',letterSpacing:'.07em'}}>Active Classes</span>
            </div>
            <Link href="/classrooms" style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:600,color:'#3b82f6',textDecoration:'none'}}>
              Manage <Ic d={ICONS.arrow} size={11} color="#3b82f6"/>
            </Link>
          </div>
          {classes.length > 0 ? classes.map((cls,i)=>(
            <div key={cls.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:i<classes.length-1?`1px solid ${cl}`:'none'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:CLASS_COLORS[i%CLASS_COLORS.length],flexShrink:0}}/>
              <div style={{fontSize:12,fontWeight:600,color:'var(--c-t1)',flex:1}}>{cls.name}</div>
              <div style={{fontSize:10,color:'var(--c-t3)'}}>Active</div>
            </div>
          )) : (
            <div style={{textAlign:'center',padding:'16px 0'}}>
              <div style={{fontSize:12,color:'var(--c-t3)',marginBottom:10}}>No classes yet</div>
              <Link href="/create" style={{display:'inline-flex',alignItems:'center',gap:6,background:'#2563eb',color:'#fff',borderRadius:8,padding:'7px 14px',fontSize:11,fontWeight:600,textDecoration:'none'}}>
                <Ic d={ICONS.create} size={11} color="#fff"/> Create a class
              </Link>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div style={{background:cs,border:`1px solid ${cl}`,borderRadius:12,padding:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              <Ic d={ICONS.activity} size={12} color="var(--c-t3)"/>
              <span style={{fontSize:10,fontWeight:700,color:'var(--c-t3)',textTransform:'uppercase',letterSpacing:'.07em'}}>Recent Activity</span>
            </div>
            <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:600,color:'#3b82f6',cursor:'pointer'}}>
              View all <Ic d={ICONS.arrow} size={11} color="#3b82f6"/>
            </span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:1}}>
            {ACTIVITY.map((a,i)=>(
              <div key={i} className="dash-row-hover" style={{display:'flex',alignItems:'flex-start',gap:9,padding:'7px 5px',cursor:'pointer',transition:'background .15s'}}>
                <div style={{width:26,height:26,borderRadius:'50%',background:a.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:a.color,flexShrink:0}}>{a.initials}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:'var(--c-t2)',lineHeight:1.4}}><span style={{color:'var(--c-t1)',fontWeight:600}}>{a.name}</span> {a.text}</div>
                  <div style={{fontSize:10,color:'var(--c-t3)',marginTop:1}}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Needs attention */}
        <div style={{background:cs,border:`1px solid ${cl}`,borderRadius:12,padding:16,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:-40,right:-40,width:140,height:140,background:'radial-gradient(circle,rgba(239,68,68,0.06),transparent)',pointerEvents:'none'}}/>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8,position:'relative',zIndex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <Ic d={ICONS.warning} size={12} color="#f87171"/>
              <span style={{fontSize:10,fontWeight:700,color:'#f87171',textTransform:'uppercase',letterSpacing:'.07em'}}>Needs Attention</span>
            </div>
            <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:600,color:'#3b82f6',cursor:'pointer'}}>
              <Ic d={ICONS.message} size={11} color="#3b82f6"/> Message
            </span>
          </div>
          <div style={{fontSize:11,color:'var(--c-t3)',marginBottom:10,position:'relative',zIndex:1}}>Students below 65% this week</div>
          <div style={{position:'relative',zIndex:1}}>
            {AT_RISK.map((s,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:i<AT_RISK.length-1?`1px solid ${cl}`:'none'}}>
                <div style={{width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,0.04)',border:`1px solid ${cl}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'var(--c-t2)',flexShrink:0}}>{s.initials}</div>
                <div style={{fontSize:12,fontWeight:600,color:'var(--c-t1)',flex:1}}>{s.name}</div>
                <div style={{width:48,height:3,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden'}}>
                  <div style={{height:'100%',width:s.pct+'%',background:s.color,borderRadius:2}}/>
                </div>
                <div style={{fontSize:10,fontWeight:700,color:s.color,minWidth:26,textAlign:'right'}}>{s.pct}%</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Main export ─────────────────────────────────────────

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()

  useEffect(() => { injectStyles() }, [])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
      <div style={{width:24,height:24,border:'2px solid #3b82f6',borderTopColor:'transparent',borderRadius:'50%',animation:'dash-spin .8s linear infinite'}}/>
    </div>
  )

  const type = getDashboardType(profile)
  if (type === 'teacher') return <TeacherDashboard profile={profile} user={user}/>
  return <StudentDashboard profile={profile} user={user}/>
}
