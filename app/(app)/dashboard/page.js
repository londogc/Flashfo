'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getDashboardType(profile) {
  if (!profile) return 'student'
  const plan = profile.plan || 'free'
  if (plan === 'teacher_pro') return 'teacher'
  if (plan === 'lifetime' && profile.dashboard_preference === 'teacher') return 'teacher'
  return 'student'
}

function injectStyles() {
  const id = 'dash-v2-styles'
  if (document.getElementById(id)) return
  const s = document.createElement('style')
  s.id = id
  s.textContent = `
    @keyframes dash-fadein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes dash-pulse{0%,100%{opacity:1}50%{opacity:.35}}
    @keyframes dash-spin{to{transform:rotate(360deg)}}
    @keyframes dash-shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
    @keyframes dash-slidehistory{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .dash-card-in{animation:dash-fadein .4s ease both}
    .dash-pulse-dot{animation:dash-pulse 1.4s ease-in-out infinite}
    .dash-tool:hover{transform:translateY(-3px)!important;transition:transform .18s ease,box-shadow .18s ease}
    .dash-nav-row:hover{background:rgba(255,255,255,0.04)!important}
    .dash-check-item:hover{background:rgba(255,255,255,0.03)!important}
    .dash-activity-row:hover{background:rgba(255,255,255,0.03)!important;border-radius:8px}
    .dash-btn-live{animation:dash-pulse 2s ease-in-out infinite}
  `
  document.head.appendChild(s)
}

// ─────────────────────────────────────────────
// Shared: This Day in History
// ─────────────────────────────────────────────

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
        const items = (data.selected || [])
          .filter(e => e.text && e.year && !BAD.some(w => e.text.toLowerCase().includes(w)))
          .slice(0, 6)
          .map(e => ({ year: e.year, text: e.text }))
        setEvents(items)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (events.length < 2) return
    const t = setInterval(() => setIdx(i => (i + 1) % events.length), 9000)
    return () => clearInterval(t)
  }, [events])

  const ev = events[idx]
  const cv = 'var(--c-surface)'
  const cl = 'var(--c-line)'

  return (
    <div style={{background:cv,border:`1px solid ${cl}`,borderRadius:12,padding:16,overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <div style={{width:24,height:24,borderRadius:7,background:'rgba(251,146,60,0.14)',border:'1px solid rgba(251,146,60,0.22)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="7"/><path d="M8 5v3l2 1.5"/></svg>
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
        <div style={{animation:'dash-slidehistory .35s ease'}} key={idx}>
          <div style={{display:'inline-block',background:'rgba(251,146,60,0.1)',border:'1px solid rgba(251,146,60,0.2)',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:700,color:'#fb923c',marginBottom:7}}>{ev.year}</div>
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

// ─────────────────────────────────────────────
// STUDENT DASHBOARD
// ─────────────────────────────────────────────

const STUDENT_TOOLS = [
  { href:'/ai-tutor',    label:'Nova',        sub:'AI tutor',      emoji:'🔮', glow:'rgba(99,102,241,0.15)',  border:'rgba(99,102,241,0.2)',  bg:'rgba(99,102,241,0.06)'  },
  { href:'/flashcards',  label:'Flashcards',  sub:'Study cards',   emoji:'🃏', glow:'rgba(16,185,129,0.12)', border:'rgba(16,185,129,0.18)', bg:'rgba(16,185,129,0.05)'  },
  { href:'/quiz',        label:'Quiz',        sub:'Test yourself', emoji:'📝', glow:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.18)', bg:'rgba(245,158,11,0.05)'  },
  { href:'/study-guide', label:'Study Guide', sub:'Deep notes',    emoji:'📖', glow:'rgba(59,130,246,0.12)', border:'rgba(59,130,246,0.18)', bg:'rgba(59,130,246,0.05)'  },
]

const STUDENT_STEPS = [
  { label:'Generate your first flashcard deck', sub:'Takes 10 seconds', href:'/flashcards' },
  { label:'Ask Nova your first question',        sub:'Any topic, instant answer', href:'/ai-tutor' },
  { label:'Take a practice quiz',               sub:'Test what you know', href:'/quiz' },
]

function StudentDashboard({ profile, user }) {
  const [classes, setClasses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [dueToday, setDueToday] = useState(0)
  const [dataLoading, setDataLoading] = useState(true)
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    if (user) loadData()
    else setDataLoading(false)
  }, [user])

  async function loadData() {
    try {
      const reviews = JSON.parse(localStorage.getItem('ff-card-reviews') || '{}')
      const due = Object.values(reviews).filter(v => v.nextReview && v.nextReview <= Date.now()).length
      setDueToday(due)
    } catch {}
    const { data: enroll } = await supabase.from('student_enrollments')
      .select('classroom_id, classrooms(name,subject)').eq('student_id', user.id)
    if (enroll) setClasses(enroll.map(e => e.classrooms).filter(Boolean))
    const { data: hw } = await supabase.from('homework_assignments')
      .select('id,title,due_date').order('due_date',{ascending:true}).limit(3)
    if (hw) setAssignments(hw)
    const { count } = await supabase.from('saved_items').select('id',{count:'exact',head:true}).eq('user_id', user.id)
    if (count) setSavedCount(count)
    setDataLoading(false)
  }

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const cs = 'var(--c-surface)'
  const cl = 'var(--c-line)'

  return (
    <div style={{padding:'24px 28px',maxWidth:1080,margin:'0 auto'}}>

      {/* ── Top bar ── */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:11,color:'var(--c-t3)',marginBottom:2}}>{greeting}</div>
          <div style={{fontSize:22,fontWeight:800,color:'var(--c-t1)',letterSpacing:'-.4px'}}>Hey, {firstName} 👋</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {dueToday > 0 && (
            <Link href="/flashcards" style={{display:'flex',alignItems:'center',gap:5,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.28)',borderRadius:20,padding:'5px 12px',textDecoration:'none'}}>
              <span style={{fontSize:11,color:'#f59e0b',fontWeight:700}}>↻ {dueToday} card{dueToday!==1?'s':''} due today</span>
            </Link>
          )}
          <Link href="/create" style={{display:'inline-flex',alignItems:'center',gap:6,background:'linear-gradient(90deg,#1d4ed8,#6d28d9)',color:'#fff',borderRadius:9,padding:'9px 18px',fontSize:12,fontWeight:700,textDecoration:'none',boxShadow:'0 4px 16px rgba(109,40,217,0.28)'}}>
            ＋ Create
          </Link>
        </div>
      </div>

      {/* ── Welcome banner ── */}
      <div style={{background:cs,border:`1px solid ${cl}`,borderRadius:12,padding:'18px 22px',marginBottom:12,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-60,right:-60,width:200,height:200,background:'radial-gradient(circle,rgba(124,58,237,0.1) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-50,left:40,width:160,height:160,background:'radial-gradient(circle,rgba(59,130,246,0.07) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',justifyContent:'space-between',gap:20,flexWrap:'wrap'}}>
          <div>
            <div style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:10,fontWeight:700,color:'#818cf8',background:'rgba(129,140,248,0.1)',border:'1px solid rgba(129,140,248,0.2)',borderRadius:20,padding:'3px 10px',marginBottom:9}}>✦ Welcome to Flashfo</div>
            <div style={{fontSize:16,fontWeight:700,color:'var(--c-t1)',marginBottom:4}}>You're all set. Let's get you studying.</div>
            <div style={{fontSize:12,color:'var(--c-t2)',lineHeight:1.55}}>Generate flashcards, quiz yourself, or ask Nova — all powered by AI, built for how you study.</div>
          </div>
          <div style={{display:'flex',gap:8,flexShrink:0}}>
            <Link href="/flashcards" style={{padding:'9px 16px',borderRadius:9,background:'linear-gradient(90deg,#1d4ed8,#6d28d9)',color:'#fff',fontSize:12,fontWeight:700,textDecoration:'none',boxShadow:'0 4px 14px rgba(109,40,217,0.28)'}}>Generate flashcards</Link>
            <Link href="/ai-tutor" style={{padding:'9px 16px',borderRadius:9,background:'rgba(255,255,255,0.05)',border:`1px solid ${cl}`,color:'var(--c-t2)',fontSize:12,fontWeight:700,textDecoration:'none'}}>Ask Nova</Link>
          </div>
        </div>
      </div>

      {/* ── 3-step checklist ── */}
      <div style={{display:'flex',border:`1px solid ${cl}`,borderRadius:12,overflow:'hidden',background:cs,marginBottom:16}}>
        {STUDENT_STEPS.map((step, i) => (
          <Link key={i} href={step.href} className="dash-check-item" style={{flex:1,padding:'13px 16px',display:'flex',alignItems:'center',gap:10,borderRight:i<2?`1px solid ${cl}`:'none',textDecoration:'none',transition:'background .15s'}}>
            <div style={{width:20,height:20,borderRadius:'50%',border:'1.5px solid rgba(255,255,255,0.12)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'var(--c-t3)'}}>○</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--c-t2)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{step.label}</div>
              <div style={{fontSize:10,color:'var(--c-t3)',marginTop:1}}>{step.sub}</div>
            </div>
            <div style={{fontSize:11,color:'var(--c-t3)'}}>→</div>
          </Link>
        ))}
      </div>

      {/* ── Tool cards ── */}
      <div style={{fontSize:10,fontWeight:700,color:'var(--c-t3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>Quick tools</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        {STUDENT_TOOLS.map((t,i) => (
          <Link key={t.href} href={t.href} className="dash-tool" style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:12,padding:16,textDecoration:'none',position:'relative',overflow:'hidden',display:'block',animationDelay:i*60+'ms'}} title={t.label}>
            <div style={{position:'absolute',top:-28,right:-28,width:100,height:100,background:`radial-gradient(circle,${t.glow},transparent)`,pointerEvents:'none'}}/>
            <div style={{fontSize:24,marginBottom:10,position:'relative',zIndex:1}}>{t.emoji}</div>
            <div style={{fontSize:13,fontWeight:700,color:'var(--c-t1)',marginBottom:2,position:'relative',zIndex:1}}>{t.label}</div>
            <div style={{fontSize:11,color:'var(--c-t3)',position:'relative',zIndex:1}}>{t.sub}</div>
          </Link>
        ))}
      </div>

      {/* ── Bottom: history + saved ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <TodayInHistory />
        <div style={{background:cs,border:`1px solid ${cl}`,borderRadius:12,padding:16,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',gap:8,minHeight:120}}>
          <div style={{fontSize:24}}>📚</div>
          {savedCount > 0 ? (
            <>
              <div style={{fontSize:13,fontWeight:600,color:'var(--c-t1)'}}>{savedCount} saved deck{savedCount!==1?'s':''}</div>
              <Link href="/my-stuff" style={{fontSize:11,fontWeight:600,color:'#3b82f6',textDecoration:'none'}}>View My Stuff →</Link>
            </>
          ) : (
            <>
              <div style={{fontSize:12,color:'var(--c-t3)'}}>Your saved decks will appear here</div>
              <Link href="/flashcards" style={{fontSize:11,fontWeight:600,color:'#3b82f6',textDecoration:'none'}}>Generate your first deck →</Link>
            </>
          )}
        </div>
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────
// TEACHER DASHBOARD
// ─────────────────────────────────────────────

const TEACHER_TOOLS = [
  { href:'/assign',        label:'Assign Content', sub:'Send to a class',           emoji:'📋', glow:'rgba(99,102,241,0.15)',  border:'rgba(99,102,241,0.22)', bg:'rgba(99,102,241,0.06)'  },
  { href:'/live-quiz',     label:'Live Quiz',      sub:'Real-time classroom game',  emoji:'🎯', glow:'rgba(239,68,68,0.15)',   border:'rgba(239,68,68,0.22)',  bg:'rgba(239,68,68,0.06)',   live:true },
  { href:'/create',        label:'Create Content', sub:'AI-generate via Nova',      emoji:'✨', glow:'rgba(16,185,129,0.12)', border:'rgba(16,185,129,0.18)', bg:'rgba(16,185,129,0.05)'  },
  { href:'/my-progress',   label:'Student Progress', sub:'Scores & completion',    emoji:'📊', glow:'rgba(59,130,246,0.12)', border:'rgba(59,130,246,0.18)', bg:'rgba(59,130,246,0.05)'  },
]

function TeacherDashboard({ profile, user }) {
  const [classes, setClasses] = useState([])
  const [studentCount, setStudentCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [avgScore, setAvgScore] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [atRisk, setAtRisk] = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (user) loadData()
    else setDataLoading(false)
  }, [user])

  async function loadData() {
    // Classrooms this teacher owns
    const { data: rooms } = await supabase.from('classrooms')
      .select('id,name,subject').eq('teacher_id', user.id)
    if (rooms) setClasses(rooms)

    if (rooms?.length) {
      const ids = rooms.map(r => r.id)
      // Student count
      const { count: sc } = await supabase.from('student_enrollments')
        .select('id',{count:'exact',head:true}).in('classroom_id', ids)
      if (sc) setStudentCount(sc)
      // Pending submissions
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

  const CLASS_COLORS = ['#818cf8','#34d399','#60a5fa','#f472b6','#fb923c']
  const MOCK_ACTIVITY = [
    { initials:'JR', color:'rgba(129,140,248,0.14)', icolor:'#818cf8', text:'scored 94% on Civil War Quiz',       name:'Jamie R.',  time:'12m ago' },
    { initials:'MK', color:'rgba(52,211,153,0.1)',   icolor:'#34d399', text:'submitted WWII essay assignment',    name:'Maya K.',   time:'1h ago'  },
    { initials:'TD', color:'rgba(239,68,68,0.09)',   icolor:'#f87171', text:'retook Economics vocab quiz (58%)', name:'Tyler D.',  time:'3h ago'  },
    { initials:'3×', color:'rgba(251,191,36,0.09)',  icolor:'#fbbf24', text:'completed the Reconstruction deck', name:'3 students',time:'5h ago'  },
  ]
  const MOCK_AT_RISK = [
    { initials:'LC', name:'Luis C.',   pct:48, color:'#ef4444' },
    { initials:'AS', name:'Aisha S.',  pct:55, color:'#f97316' },
    { initials:'MW', name:'Marcus W.', pct:61, color:'#f59e0b' },
    { initials:'PN', name:'Priya N.',  pct:63, color:'#f59e0b' },
  ]

  return (
    <div style={{padding:'24px 28px',maxWidth:1080,margin:'0 auto'}}>

      {/* ── Top bar ── */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:11,color:'var(--c-t3)',marginBottom:2}}>{greeting}</div>
          <div style={{fontSize:22,fontWeight:800,color:'var(--c-t1)',letterSpacing:'-.4px'}}>Ms. {firstName} 👋</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:20,background:'rgba(245,158,11,0.09)',border:'1px solid rgba(245,158,11,0.2)',fontSize:11,fontWeight:700,color:'#fbbf24'}}>★ Teacher Pro</div>
          <Link href="/live-quiz" style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:9,border:'1px solid rgba(239,68,68,0.28)',background:'rgba(239,68,68,0.09)',color:'#f87171',fontSize:12,fontWeight:700,textDecoration:'none'}}>
            <span className="dash-btn-live" style={{width:7,height:7,borderRadius:'50%',background:'#ef4444',display:'inline-block'}}/>
            Start Live Quiz
          </Link>
          <Link href="/create" style={{display:'inline-flex',alignItems:'center',gap:6,background:'linear-gradient(90deg,#1d4ed8,#6d28d9)',color:'#fff',borderRadius:9,padding:'9px 18px',fontSize:12,fontWeight:700,textDecoration:'none',boxShadow:'0 4px 16px rgba(109,40,217,0.28)'}}>
            ＋ New Assignment
          </Link>
        </div>
      </div>

      {/* ── Welcome banner ── */}
      <div style={{background:cs,border:`1px solid ${cl}`,borderRadius:12,padding:'18px 22px',marginBottom:12,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-60,right:-60,width:220,height:220,background:'radial-gradient(circle,rgba(124,58,237,0.1) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-50,left:40,width:180,height:180,background:'radial-gradient(circle,rgba(59,130,246,0.07) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',justifyContent:'space-between',gap:20,flexWrap:'wrap'}}>
          <div>
            <div style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:10,fontWeight:700,color:'#fbbf24',background:'rgba(251,191,36,0.09)',border:'1px solid rgba(251,191,36,0.2)',borderRadius:20,padding:'3px 10px',marginBottom:9}}>
              {pendingCount > 0 ? `📋 ${pendingCount} submission${pendingCount!==1?'s':''} need${pendingCount===1?'s':''} review` : '📋 All caught up'}
            </div>
            <div style={{fontSize:16,fontWeight:700,color:'var(--c-t1)',marginBottom:4}}>
              {classes.length > 0 ? `You have ${studentCount} student${studentCount!==1?'s':''} across ${classes.length} class${classes.length!==1?'es':''}.` : "Let's set up your first class."}
            </div>
            <div style={{fontSize:12,color:'var(--c-t2)',lineHeight:1.55}}>
              {classes.length > 0
                ? pendingCount > 0 ? 'Some submissions are waiting for your review. You can send reminders directly from Assignments.'
                  : 'Everything is on track — no pending submissions.'
                : 'Create a class and invite your students to get started.'}
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexShrink:0}}>
            {pendingCount > 0 && <Link href="/assignments" style={{padding:'9px 16px',borderRadius:9,background:'rgba(255,255,255,0.05)',border:`1px solid ${cl}`,color:'var(--c-t2)',fontSize:12,fontWeight:700,textDecoration:'none'}}>View submissions</Link>}
            <Link href={classes.length>0?'/assign':'/create'} style={{padding:'9px 16px',borderRadius:9,background:'linear-gradient(90deg,#1d4ed8,#6d28d9)',color:'#fff',fontSize:12,fontWeight:700,textDecoration:'none',boxShadow:'0 4px 14px rgba(109,40,217,0.26)'}}>
              {classes.length>0 ? 'Create assignment' : 'Create first class'}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stat strip ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        {[
          { label:'Active Classes',     val:classes.length||0, color:'#818cf8', grad:'linear-gradient(90deg,#6366f1,#8b5cf6)', sub:'This semester',   delta:null },
          { label:'Students Enrolled',  val:studentCount,       color:'#34d399', grad:'linear-gradient(90deg,#10b981,#3b82f6)', sub:'Across all classes', delta:null },
          { label:'Submissions Pending',val:pendingCount,       color:'#fbbf24', grad:'linear-gradient(90deg,#f59e0b,#ef4444)', sub:'Need your review',  delta:pendingCount>0?'warn':null },
          { label:'Class Avg Score',    val:avgScore!==null?avgScore+'%':'—',   color:'#60a5fa', grad:'linear-gradient(90deg,#3b82f6,#8b5cf6)', sub:'Last 7 days', delta:null },
        ].map((s,i)=>(
          <div key={i} style={{background:cs,border:`1px solid ${cl}`,borderRadius:12,padding:'14px 16px',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:s.grad}}/>
            <div style={{fontSize:10,fontWeight:700,color:'var(--c-t3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:8}}>{s.label}</div>
            <div style={{fontSize:26,fontWeight:800,letterSpacing:'-1px',lineHeight:1,color:s.color,marginBottom:3}}>{s.val}</div>
            <div style={{fontSize:11,color:'var(--c-t3)'}}>{s.sub}</div>
            {s.delta==='warn' && pendingCount>0 && <div style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:10,fontWeight:600,padding:'2px 6px',borderRadius:5,background:'rgba(245,158,11,0.1)',color:'#fbbf24',marginTop:5}}>⚠ Oldest is 2 days ago</div>}
          </div>
        ))}
      </div>

      {/* ── Tool cards ── */}
      <div style={{fontSize:10,fontWeight:700,color:'var(--c-t3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>Quick tools</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        {TEACHER_TOOLS.map((t,i)=>(
          <Link key={t.href} href={t.href} className="dash-tool" style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:12,padding:16,textDecoration:'none',position:'relative',overflow:'hidden',display:'block'}}>
            <div style={{position:'absolute',top:-28,right:-28,width:100,height:100,background:`radial-gradient(circle,${t.glow},transparent)`,pointerEvents:'none'}}/>
            <div style={{position:'relative',zIndex:1}}>
              <div style={{fontSize:24,marginBottom:10,position:'relative'}}>
                {t.emoji}
                {t.live && <span className="dash-btn-live" style={{position:'absolute',top:-3,right:-3,width:8,height:8,background:'#ef4444',borderRadius:'50%',display:'inline-block',border:'1.5px solid var(--c-surface)'}}/>}
              </div>
              <div style={{fontSize:13,fontWeight:700,color:'var(--c-t1)',marginBottom:2}}>{t.label}</div>
              <div style={{fontSize:11,color:'var(--c-t3)'}}>{t.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Bottom 3-col ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 260px',gap:10}}>

        {/* Active classes */}
        <div style={{background:cs,border:`1px solid ${cl}`,borderRadius:12,padding:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:700,color:'var(--c-t3)',textTransform:'uppercase',letterSpacing:'.07em'}}>Active Classes</div>
            <Link href="/classrooms" style={{fontSize:11,fontWeight:600,color:'#3b82f6',textDecoration:'none'}}>Manage →</Link>
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
              <Link href="/create" style={{background:'#2563eb',color:'#fff',borderRadius:8,padding:'7px 16px',fontSize:11,fontWeight:600,textDecoration:'none'}}>Create a class</Link>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div style={{background:cs,border:`1px solid ${cl}`,borderRadius:12,padding:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:700,color:'var(--c-t3)',textTransform:'uppercase',letterSpacing:'.07em'}}>Recent Activity</div>
            <span style={{fontSize:11,fontWeight:600,color:'#3b82f6',cursor:'pointer'}}>View all →</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:2}}>
            {MOCK_ACTIVITY.map((a,i)=>(
              <div key={i} className="dash-activity-row" style={{display:'flex',alignItems:'flex-start',gap:9,padding:'7px 5px',cursor:'pointer',transition:'background .15s'}}>
                <div style={{width:26,height:26,borderRadius:'50%',background:a.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:a.icolor,flexShrink:0}}>
                  {a.initials}
                </div>
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
            <div style={{fontSize:10,fontWeight:700,color:'#f87171',textTransform:'uppercase',letterSpacing:'.07em'}}>⚠ Needs Attention</div>
            <span style={{fontSize:11,fontWeight:600,color:'#3b82f6',cursor:'pointer'}}>Message →</span>
          </div>
          <div style={{fontSize:11,color:'var(--c-t3)',marginBottom:10,position:'relative',zIndex:1}}>Students below 65% this week</div>
          <div style={{position:'relative',zIndex:1}}>
            {MOCK_AT_RISK.map((s,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:9,padding:'7px 0',borderBottom:i<MOCK_AT_RISK.length-1?`1px solid ${cl}`:'none'}}>
                <div style={{width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,0.05)',border:`1px solid ${cl}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'var(--c-t2)',flexShrink:0}}>{s.initials}</div>
                <div style={{fontSize:12,fontWeight:600,color:'var(--c-t1)',flex:1}}>{s.name}</div>
                <div style={{width:52,height:3,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden'}}>
                  <div style={{height:'100%',width:s.pct+'%',background:s.color,borderRadius:2}}/>
                </div>
                <div style={{fontSize:10,fontWeight:600,color:s.color,minWidth:28,textAlign:'right'}}>{s.pct}%</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN EXPORT — branches on plan
// ─────────────────────────────────────────────

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()

  useEffect(() => { injectStyles() }, [])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
      <div style={{width:24,height:24,border:'2px solid #3b82f6',borderTopColor:'transparent',borderRadius:'50%',animation:'dash-spin .8s linear infinite'}}/>
    </div>
  )

  const type = getDashboardType(profile)

  if (type === 'teacher') return <TeacherDashboard profile={profile} user={user} />
  return <StudentDashboard profile={profile} user={user} />
}
