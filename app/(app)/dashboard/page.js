'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { useIsMobile } from '@/hooks/useIsMobile'

function TodayInHistory() {
  const [events, setEvents] = useState([])
  const [idx, setIdx]       = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date(); const m = now.getMonth()+1; const d = now.getDate()
    fetch(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${m}/${d}`)
      .then(r => r.json())
      .then(data => {
        const BAD = ['kill','killed','murder','assassin','massacre','genocide','execut','suicide','terror','bomb','attack','shot','hung','hanged','beheaded','lynch','slaughter','riot','civil war','world war','holocaust','rape','torture','hostage','hijack']
        const items = (data.selected||[])
          .filter(e => e.text && e.year && !BAD.some(w => e.text.toLowerCase().includes(w)))
          .slice(0,6).map(e => ({year:e.year, text:e.text}))
        setEvents(items); setLoading(false)
      }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (events.length < 2) return
    const t = setInterval(() => setIdx(i => (i+1) % events.length), 9000)
    return () => clearInterval(t)
  }, [events])

  const event = events[idx]
  return (
    <div style={{ background:'rgba(255,255,255,0.025)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:14, padding:16, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <div style={{ width:24, height:24, borderRadius:8, background:'rgba(251,146,60,0.15)', border:'1px solid rgba(251,146,60,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 4v4l3 1.5"/></svg>
          </div>
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>This day in history</span>
        </div>
        <span style={{ fontSize:10, color:'#fb923c', fontWeight:600 }}>{new Date().toLocaleDateString('en-US',{month:'long',day:'numeric'})}</span>
      </div>
      {loading ? (
        <div style={{ height:60, display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:20, height:20, borderRadius:'50%', border:'2px solid #fb923c', borderTopColor:'transparent', animation:'dash-spin 0.8s linear infinite' }}/>
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}>Loading today's events…</span>
        </div>
      ) : event ? (
        <div key={idx} style={{ animation:'fadeSlide 0.4s ease' }}>
          <div style={{ display:'inline-block', background:'rgba(251,146,60,0.12)', border:'1px solid rgba(251,146,60,0.2)', borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:700, color:'#fb923c', marginBottom:8 }}>{event.year}</div>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.75)', lineHeight:1.55, margin:'0 0 12px' }}>
            {event.text.length > 140 ? event.text.slice(0,140)+'…' : event.text}
          </p>
          <div style={{ display:'flex', gap:4 }}>
            {events.map((_,i) => (
              <button key={i} onClick={() => setIdx(i)}
                style={{ width:i===idx?16:5, height:5, borderRadius:3, background:i===idx?'#fb923c':'rgba(255,255,255,0.12)', border:'none', cursor:'pointer', transition:'all 0.25s', padding:0 }}/>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ fontSize:12, color:'rgba(255,255,255,0.25)', margin:0 }}>Could not load events for today.</p>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const isMobile        = useIsMobile()
  const { user, profile } = useAuth()
  const isTeacher = profile?.role === 'teacher'

  // ── Student state ──────────────────────────────────────────────────────────
  const [classes,      setClasses]      = useState([])
  const [assignments,  setAssignments]  = useState([])
  const [dataLoading,  setDataLoading]  = useState(true)
  const [dueToday,     setDueToday]     = useState(0)
  const [weakCardCount,setWeakCardCount]= useState(0)
  const [weekStats,    setWeekStats]    = useState(null)
  const [continueIdx,  setContinueIdx]  = useState(0)
  const touchStartX = useRef(0)

  // ── Teacher state ──────────────────────────────────────────────────────────
  const [classrooms,      setClassrooms]      = useState([])
  const [studentCounts,   setStudentCounts]   = useState({})  // classroomId → count
  const [pendingAssigns,  setPendingAssigns]  = useState([])  // upcoming due assignments
  const [totalStudents,   setTotalStudents]   = useState(0)

  useEffect(() => {
    if (user) loadData()
    else setDataLoading(false)
  }, [user, profile?.role])

  async function loadData() {
    setDataLoading(true)

    // ── Teacher data ────────────────────────────────────────────────────────
    if (profile?.role === 'teacher') {
      try {
        const { data: cls } = await supabase
          .from('classrooms')
          .select('*')
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: false })
        setClassrooms(cls || [])

        if (cls?.length) {
          const ids = cls.map(c => c.id)
          // Student counts
          const { data: enroll } = await supabase
            .from('student_enrollments')
            .select('classroom_id')
            .in('classroom_id', ids)
          const counts = {}
          ;(enroll||[]).forEach(e => { counts[e.classroom_id] = (counts[e.classroom_id]||0)+1 })
          setStudentCounts(counts)
          setTotalStudents(Object.values(counts).reduce((a,b) => a+b, 0))

          // Pending assignments — due in future, ordered soonest first
          const { data: hw } = await supabase
            .from('homework_assignments')
            .select('*')
            .in('classroom_id', ids)
            .order('due_date', { ascending: true })
            .limit(5)
          setPendingAssigns(hw || [])
        }
      } catch {}
      setDataLoading(false)
      return
    }

    // ── Student data ────────────────────────────────────────────────────────
    try {
      const reviews = JSON.parse(localStorage.getItem('ff-card-reviews')||'{}')
      const now = Date.now()
      setDueToday(Object.values(reviews).filter(r => r.nextReview && r.nextReview <= now).length)
      // Weak = easeFactor < 2.0 and reviewed at least twice
      setWeakCardCount(Object.values(reviews).filter(r => r.repetitions >= 2 && r.easeFactor < 2.0).length)
    } catch {}
    try {
      // Weekly snapshot — last 14 days so we can compare this week vs last
      const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13)
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('date, cards_studied, minutes_spent')
        .eq('user_id', user.id)
        .gte('date', twoWeeksAgo.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (sessions?.length) {
        const today    = new Date().toISOString().split('T')[0]
        const weekAgo  = new Date(); weekAgo.setDate(weekAgo.getDate() - 6)
        const weekAgoStr = weekAgo.toISOString().split('T')[0]
        const thisWeek = sessions.filter(s => s.date >= weekAgoStr)
        const lastWeek = sessions.filter(s => s.date < weekAgoStr)
        // Build 7-day activity array
        const activity = Array.from({length:7}, (_,i) => {
          const d = new Date(); d.setDate(d.getDate() - (6-i))
          const ds = d.toISOString().split('T')[0]
          const s  = thisWeek.find(x => x.date === ds)
          return { date:ds, cards: s?.cards_studied||0, mins: s?.minutes_spent||0, isToday: ds===today }
        })
        // Streak: consecutive days with at least 1 session ending today/yesterday
        const allDates = new Set(sessions.map(s => s.date))
        let streak = 0
        for (let i = 0; i < 30; i++) {
          const d = new Date(); d.setDate(d.getDate() - i)
          if (allDates.has(d.toISOString().split('T')[0])) streak++
          else if (i === 0) continue  // allow today to not be studied yet
          else break
        }
        setWeekStats({
          daysStudied:  thisWeek.length,
          cardsStudied: thisWeek.reduce((s,r) => s+(r.cards_studied||0), 0),
          minutesSpent: thisWeek.reduce((s,r) => s+(r.minutes_spent||0), 0),
          prevCards:    lastWeek.reduce((s,r) => s+(r.cards_studied||0), 0),
          streak,
          activity,
        })
      }
    } catch {}
    try {
      const { data: enroll } = await supabase
        .from('student_enrollments').select('classroom_id, classrooms(name, subject)').eq('student_id', user.id)
      if (enroll) setClasses(enroll.map(e => e.classrooms).filter(Boolean))
      const { data: hw } = await supabase
        .from('homework_assignments').select('id, title, due_date, classroom_id')
        .eq('classroom_id', enroll?.[0]?.classroom_id).order('due_date',{ascending:true}).limit(3)
      if (hw) setAssignments(hw)
    } catch {}
    setDataLoading(false)
  }

  // ── ALL HOOKS MUST BE ABOVE ANY EARLY RETURN (Rules of Hooks) ──────────────
  // useMemo + useEffect were previously below the mobile early return, which
  // crashed mobile the moment useLayoutEffect in useIsMobile flipped isMobile
  // to true: React saw fewer hooks called → "Rendered fewer hooks" → crash.
  const nextAsgn = assignments[0]
  const dueLabel = nextAsgn?.due_date
    ? `Due ${new Date(nextAsgn.due_date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}`
    : 'No due date'

  const continueCards = useMemo(() => {
    const hasAsgn = !dataLoading && assignments.length > 0
    const hasDue  = !dataLoading && dueToday > 0
    const hasWeak = !dataLoading && weakCardCount > 0
    const card1 = hasAsgn
      ? { badge:'Assignment', title:assignments[0].title, sub:dueLabel, href:'/assignments', cta:'Open →' }
      : hasDue
        ? { badge:'Review', title:`${dueToday} card${dueToday!==1?'s':''} ready to review`, sub:'Spaced repetition · due now', href:'/review', cta:'Review →' }
        : { badge:'Study', title:'Explore your study tools', sub:'Flashcards, quizzes, guides & more', href:'/flashcards', cta:'Study now →' }
    const card2 = hasWeak
      ? { badge:'Weak Spots', title:`${weakCardCount} card${weakCardCount!==1?'s':''} need attention`, sub:'Based on your review history', href:'/my-progress?tab=flashcards', cta:'Drill now →' }
      : { badge:'Nova', title:'Ask Nova anything', sub:'Your AI study assistant is ready', href:'/ai-tutor', cta:'Ask Nova →' }
    const card3 = hasAsgn && hasDue
      ? { badge:'Review', title:`${dueToday} card${dueToday!==1?'s':''} ready to review`, sub:'Spaced repetition · due now', href:'/review', cta:'Review →' }
      : hasAsgn
        ? { badge:'My Progress', title:"See how you're doing", sub:'Streaks, stats & weak spots', href:'/my-progress', cta:'View →' }
        : { badge:'My Stuff', title:'Browse saved content', sub:'Notes, decks and study guides', href:'/my-stuff', cta:'Open →' }
    return [card1, card2, card3]
  }, [assignments, dueToday, dueLabel, dataLoading, weakCardCount])

  // Cycling useEffect also moved above early return — same reason
  useEffect(() => {
    const t = setInterval(() => setContinueIdx(i => (i+1) % 3), 5000)
    return () => clearInterval(t)
  }, [])

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const cc   = continueCards[continueIdx]
  const card = { background:'rgba(255,255,255,0.025)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:16, overflow:'hidden' }

  // ── TEACHER DASHBOARD ────────────────────────────────────────────────────────
  if (isTeacher) {
    const QUICK_ACTIONS = [
      { label:'New Classroom',   href:'/teach',           color:'#3b82f6', bg:'rgba(59,130,246,0.1)',  border:'rgba(59,130,246,0.25)', icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg> },
      { label:'Lesson Builder',  href:'/lesson-builder',  color:'#34d399', bg:'rgba(52,211,153,0.1)',  border:'rgba(52,211,153,0.25)', icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg> },
      { label:'Assign Homework', href:'/assignments',     color:'#f59e0b', bg:'rgba(245,158,11,0.1)',  border:'rgba(245,158,11,0.25)', icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
      { label:'Live Quiz',       href:'/live-quiz',       color:'#f87171', bg:'rgba(239,68,68,0.1)',   border:'rgba(239,68,68,0.25)',  icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg> },
      { label:'Source Library',  href:'/source-library',  color:'#a78bfa', bg:'rgba(167,139,250,0.1)', border:'rgba(167,139,250,0.25)',icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg> },
      { label:'Nova',            href:'/ai-tutor',        color:'#c4b5fd', bg:'rgba(196,181,253,0.1)', border:'rgba(196,181,253,0.25)',icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg> },
    ]
    return (
      <div style={{ padding: isMobile ? '20px 16px 100px' : '28px 28px 80px', maxWidth:1100, margin:'0 auto' }}>
        <style>{`
          @keyframes dash-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
          .dash-card{animation:dash-in 0.3s cubic-bezier(.4,0,.2,1) both}
        `}</style>

        {/* Greeting */}
        <div className="dash-card" style={{ marginBottom:24, display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginBottom:3 }}>{greeting}</div>
            <div style={{ fontSize:26, fontWeight:600, color:'rgba(255,255,255,0.88)', letterSpacing:'-0.03em' }}>{firstName}</div>
          </div>
          {isMobile && (
            <Link href="/profile" style={{ textDecoration:'none', flexShrink:0 }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" style={{ width:42, height:42, borderRadius:'50%', objectFit:'cover', border:'2px solid rgba(99,102,241,0.4)' }}/>
                : <div style={{ width:42, height:42, borderRadius:'50%', background:'linear-gradient(135deg,#f59e0b,#d97706)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#fff', border:'2px solid rgba(245,158,11,0.4)' }}>{firstName[0]?.toUpperCase()||'T'}</div>
              }
            </Link>
          )}
        </div>

        {/* Stats row */}
        <div className="dash-card" style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:12, marginBottom:16, animationDelay:'0.05s' }}>
          {[
            { label:'Classrooms',     value: classrooms.length,    color:'#60a5fa',
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg> },
            { label:'Total students', value: totalStudents,         color:'#34d399',
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
            { label:'Assignments',    value: pendingAssigns.length, color:'#fbbf24',
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
            { label:'Collab decks',   value: '—',                   color:'#a78bfa',
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="5" width="14" height="12" rx="2"/><rect x="8" y="3" width="14" height="12" rx="2"/></svg> },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding:'16px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                {s.icon}
                <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'.07em' }}>{s.label}</div>
              </div>
              <div style={{ fontSize:28, fontWeight:700, color:s.color, letterSpacing:'-.03em', lineHeight:1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14, marginBottom:14 }}>

          {/* Classrooms */}
          <div className="dash-card" style={{ ...card, padding:'18px 20px', animationDelay:'0.08s' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'.07em' }}>Your classrooms</span>
              <Link href="/teach" style={{ fontSize:12, color:'#60a5fa', textDecoration:'none', fontWeight:600 }}>Manage →</Link>
            </div>
            {dataLoading ? (
              <div style={{ color:'rgba(255,255,255,0.2)', fontSize:13 }}>Loading…</div>
            ) : classrooms.length === 0 ? (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.3)', marginBottom:10 }}>No classrooms yet</div>
                <Link href="/teach" style={{ display:'inline-block', padding:'7px 16px', borderRadius:9, background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.3)', color:'#60a5fa', fontSize:12, fontWeight:700, textDecoration:'none' }}>Create your first classroom →</Link>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {classrooms.slice(0,4).map(cls => (
                  <Link key={cls.id} href="/teach" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:12, padding:'9px 12px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', transition:'all .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(59,130,246,0.3)'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}>
                    <div style={{ width:32, height:32, borderRadius:8, background:'rgba(59,130,246,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.8)' }}>{cls.name}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>{studentCounts[cls.id]||0} students · {cls.subject||'No subject'}</div>
                    </div>
                    <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.3)', fontFamily:'monospace', letterSpacing:'.1em' }}>{cls.code}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming assignments */}
          <div className="dash-card" style={{ ...card, padding:'18px 20px', animationDelay:'0.1s' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'.07em' }}>Assignments</span>
              <Link href="/assignments" style={{ fontSize:12, color:'#f59e0b', textDecoration:'none', fontWeight:600 }}>View all →</Link>
            </div>
            {dataLoading ? (
              <div style={{ color:'rgba(255,255,255,0.2)', fontSize:13 }}>Loading…</div>
            ) : pendingAssigns.length === 0 ? (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.3)', marginBottom:10 }}>No assignments yet</div>
                <Link href="/teach" style={{ display:'inline-block', padding:'7px 16px', borderRadius:9, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)', color:'#fbbf24', fontSize:12, fontWeight:700, textDecoration:'none' }}>Create an assignment →</Link>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {pendingAssigns.map((hw, i) => {
                  const dueDate = hw.due_date ? new Date(hw.due_date) : null
                  const overdue = dueDate && dueDate < new Date()
                  return (
                    <div key={hw.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 12px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background: overdue ? '#f87171' : '#fbbf24', flexShrink:0 }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.8)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{hw.title}</div>
                        <div style={{ fontSize:11, color: overdue ? '#f87171' : 'rgba(255,255,255,0.3)' }}>
                          {dueDate ? `${overdue ? 'Overdue · ' : 'Due '}${dueDate.toLocaleDateString('en-US',{month:'short',day:'numeric'})}` : 'No due date'}
                        </div>
                      </div>
                      <div style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', color:'#fbbf24', textTransform:'uppercase', letterSpacing:'.05em', flexShrink:0 }}>{hw.type||'task'}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Nova row */}
        <div className="dash-card" style={{ ...card, padding:'16px 20px', animationDelay:'0.16s', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:38, height:38, borderRadius:12, background:'rgba(139,92,246,0.18)', border:'0.5px solid rgba(139,92,246,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#c4b5fd" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="7"/><circle cx="8" cy="8" r="4"/><circle cx="8" cy="8" r="1.5" fill="#c4b5fd" stroke="none"/></svg>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.8)', marginBottom:2 }}>Ask Nova to help with lesson planning, quiz content, or student questions</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>Your AI teaching assistant is always available</div>
          </div>
          <Link href="/ai-tutor" style={{ flexShrink:0, height:32, padding:'0 14px', background:'rgba(139,92,246,0.2)', border:'0.5px solid rgba(139,92,246,0.35)', borderRadius:9, display:'flex', alignItems:'center', fontSize:12, fontWeight:600, color:'#c4b5fd', textDecoration:'none' }}>
            Ask Nova →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? '20px 16px 100px' : '28px 28px 80px', maxWidth:1100, margin:'0 auto' }}>
      <style>{`
        @keyframes dash-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dash-spin{to{transform:rotate(360deg)}}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .dash-card{animation:dash-in 0.3s cubic-bezier(.4,0,.2,1) both}
      `}</style>

      {/* Greeting */}
      <div className="dash-card" style={{ marginBottom:20, display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginBottom:3 }}>{greeting}</div>
          <div style={{ fontSize:26, fontWeight:600, color:'rgba(255,255,255,0.88)', letterSpacing:'-0.03em' }}>{firstName}</div>
        </div>
        {/* Mobile-only avatar — links to profile/settings */}
        {isMobile && (
          <Link href="/profile" style={{ textDecoration:'none', flexShrink:0 }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" style={{ width:42, height:42, borderRadius:'50%', objectFit:'cover', border:'2px solid rgba(99,102,241,0.4)' }}/>
            ) : (
              <div style={{ width:42, height:42, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#fff', border:'2px solid rgba(99,102,241,0.4)', boxShadow:'0 0 14px rgba(99,102,241,0.3)' }}>
                {firstName[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </Link>
        )}
      </div>

      {/* Continue card — always 3 cards, cycles every 5s */}
      <div className="dash-card"
              onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
              onTouchEnd={e => {
                const dx = e.changedTouches[0].clientX - touchStartX.current
                if (dx < -40) setContinueIdx(i => (i+1) % continueCards.length)
                else if (dx > 40) setContinueIdx(i => (i - 1 + continueCards.length) % continueCards.length)
              }}
              style={{ ...card, marginBottom:12, animationDelay:'0.05s', position:'relative', minHeight:110, cursor:'grab' }}>
        <canvas id="dash-particle-canvas" style={{ position:'absolute', inset:0, width:'100%', height:'100%', borderRadius:16 }}/>
        <div style={{ position:'relative', zIndex:1, padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.1)', border:'0.5px solid rgba(255,255,255,0.18)', borderRadius:20, padding:'3px 9px', marginBottom:8 }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#c4b5fd', boxShadow:'0 0 5px #c4b5fd' }}/>
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.8)' }}>{cc.badge}</span>
            </div>
            <div style={{ fontSize:16, fontWeight:600, color:'#fff', marginBottom:4, letterSpacing:'-0.02em' }}>{cc.title}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{cc.sub}</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, flexShrink:0 }}>
            <Link href={cc.href}
              style={{ height:32, padding:'0 14px', background:'rgba(99,102,241,0.25)', border:'0.5px solid rgba(99,102,241,0.4)', borderRadius:9, display:'flex', alignItems:'center', fontSize:12, fontWeight:600, color:'#c4b5fd', textDecoration:'none', whiteSpace:'nowrap' }}>
              {cc.cta}
            </Link>
            <div style={{ display:'flex', gap:4 }}>
              {continueCards.map((_,i) => (
                <button key={i} onClick={() => setContinueIdx(i)}
                  style={{ width:i===continueIdx?14:5, height:5, borderRadius:3, background:i===continueIdx?'#c4b5fd':'rgba(255,255,255,0.2)', border:'none', cursor:'pointer', transition:'all 0.3s', padding:0 }}/>
              ))}
            </div>
          </div>
        </div>
      </div>
      <ParticleInit/>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12, marginBottom:12 }}>
        <div className="dash-card" style={{ ...card, padding:'16px 20px', animationDelay:'0.1s' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'rgba(255,255,255,0.25)' }}>Due for review</span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.4" strokeLinecap="round"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 4v4l3 1.5"/></svg>
          </div>
          <div style={{ fontSize:32, fontWeight:600, color:dueToday>0?'#c4b5fd':'rgba(255,255,255,0.35)', letterSpacing:'-0.04em', lineHeight:1, marginBottom:12 }}>{dueToday}</div>
          {dueToday>0 && <Link href="/flashcards" style={{ display:'inline-flex', alignItems:'center', height:28, padding:'0 12px', background:'rgba(99,102,241,0.15)', border:'0.5px solid rgba(99,102,241,0.3)', borderRadius:8, fontSize:11, fontWeight:600, color:'#c4b5fd', textDecoration:'none' }}>Review now →</Link>}
        </div>

        <div className="dash-card" style={{ ...card, padding:'16px 20px', animationDelay:'0.13s' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'rgba(255,255,255,0.25)' }}>Class activity</span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.4" strokeLinecap="round"><path d="M8 1l7 3.5-7 3.5-7-3.5zm-5 5.5v4c0 2 2.2 3 5 3s5-1 5-3V10"/></svg>
          </div>
          {classes.length > 0 ? (
            <>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
                {classes.slice(0,3).map((cls,i) => {
                  const colors=['#c4b5fd','#34d399','#60a5fa']
                  return <span key={i} style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:6, background:colors[i%3]+'22', border:`0.5px solid ${colors[i%3]}44`, color:colors[i%3] }}>{cls.name||cls.subject||'Class'}</span>
                })}
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>{classes.length} class{classes.length!==1?'es':''} enrolled</div>
            </>
          ) : (
            <>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginBottom:8 }}>No classes yet</div>
              <Link href="/student-portal" style={{ display:'inline-flex', alignItems:'center', height:28, padding:'0 12px', background:'rgba(20,184,166,0.12)', border:'0.5px solid rgba(20,184,166,0.3)', borderRadius:8, fontSize:11, fontWeight:600, color:'#34d399', textDecoration:'none' }}>Join a class →</Link>
            </>
          )}
        </div>
      </div>

      {/* Nova suggestion */}
      <div className="dash-card" style={{ ...card, padding:'16px 20px', marginBottom:12, animationDelay:'0.16s', display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:38, height:38, borderRadius:12, background:'rgba(139,92,246,0.18)', border:'0.5px solid rgba(139,92,246,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#c4b5fd" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="7"/><circle cx="8" cy="8" r="4"/><circle cx="8" cy="8" r="1.5" fill="#c4b5fd" stroke="none"/></svg>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.8)', marginBottom:2 }}>
            {dataLoading ? 'Nova is ready…' : assignments.length > 0 ? `Continue working on "${assignments[0].title.slice(0,30)}${assignments[0].title.length>30?'…':''}"` : 'Start studying — ask Nova anything'}
          </div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>Your AI tutor is always available</div>
        </div>
        <Link href="/ai-tutor" style={{ flexShrink:0, height:32, padding:'0 14px', background:'rgba(139,92,246,0.2)', border:'0.5px solid rgba(139,92,246,0.35)', borderRadius:9, display:'flex', alignItems:'center', fontSize:12, fontWeight:600, color:'#c4b5fd', textDecoration:'none' }}>
          Ask Nova →
        </Link>
      </div>

      {/* Weekly snapshot */}
      {weekStats && (weekStats.cardsStudied > 0 || weekStats.daysStudied > 0) && (
        <div className="dash-card" style={{ ...card, padding:'18px 20px', marginBottom:12, animationDelay:'0.2s' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.25)' }}>This week</span>
              {weekStats.streak > 1 && (
                <span style={{ marginLeft:10, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'rgba(245,158,11,0.1)', border:'0.5px solid rgba(245,158,11,0.3)', color:'#fbbf24' }}>
                  🔥 {weekStats.streak} day streak
                </span>
              )}
            </div>
            <Link href="/my-progress" style={{ fontSize:11, color:'rgba(255,255,255,0.3)', textDecoration:'none', fontWeight:600 }}>Full stats →</Link>
          </div>

          {/* Stats row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
            {[
              { label:'Days studied',  value: weekStats.daysStudied,  unit:'/ 7',  color:'#60a5fa' },
              { label:'Cards reviewed', value: weekStats.cardsStudied, unit:'cards', color:'#34d399',
                trend: weekStats.prevCards > 0 ? (weekStats.cardsStudied >= weekStats.prevCards ? '↑' : '↓') : null,
                trendColor: weekStats.cardsStudied >= weekStats.prevCards ? '#34d399' : '#f87171' },
              { label:'Time spent',    value: weekStats.minutesSpent < 60 ? weekStats.minutesSpent : Math.round(weekStats.minutesSpent/60*10)/10,
                unit: weekStats.minutesSpent < 60 ? 'min' : 'hrs', color:'#a78bfa' },
            ].map(s => (
              <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'10px 12px' }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:3 }}>
                  <span style={{ fontSize:22, fontWeight:800, color:s.color, letterSpacing:'-.03em', lineHeight:1 }}>{s.value}</span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>{s.unit}</span>
                  {s.trend && <span style={{ fontSize:11, fontWeight:700, color:s.trendColor, marginLeft:2 }}>{s.trend}</span>}
                </div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* 7-day activity bars */}
          <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:36 }}>
            {weekStats.activity.map((day,i) => {
              const maxCards = Math.max(...weekStats.activity.map(d=>d.cards), 1)
              const h = day.cards > 0 ? Math.max(6, Math.round((day.cards/maxCards)*32)) : 3
              const dayLabel = ['S','M','T','W','T','F','S'][new Date(day.date+'T12:00:00').getDay()]
              return (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                  <div style={{ width:'100%', height:32, display:'flex', alignItems:'flex-end' }}>
                    <div style={{ width:'100%', height:h, borderRadius:3, background: day.isToday ? '#a78bfa' : day.cards>0 ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)', transition:'height .3s' }}/>
                  </div>
                  <span style={{ fontSize:9, color: day.isToday ? '#a78bfa' : 'rgba(255,255,255,0.2)', fontWeight: day.isToday?700:400 }}>{dayLabel}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* This Day in History */}
      <div className="dash-card" style={{ animationDelay:'0.19s' }}>
        <TodayInHistory/>
      </div>
    </div>
  )
}

function ParticleInit() {
  useEffect(() => {
    const canvas = document.getElementById('dash-particle-canvas')
    if (!canvas || canvas._init) return
    canvas._init = true
    const ctx = canvas.getContext('2d')
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    canvas.width = W; canvas.height = H
    const pts = Array.from({length:22}, () => ({
      x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-.5)*.3, vy:(Math.random()-.5)*.15,
      r:Math.random()*1.2+.4, col:`hsl(${250+Math.random()*40},70%,75%)`
    }))
    let raf
    function draw() {
      ctx.clearRect(0,0,W,H)
      ctx.fillStyle='rgba(12,10,30,0.82)'; ctx.fillRect(0,0,W,H)
      const g=ctx.createRadialGradient(W*.8,H*.2,0,W*.8,H*.2,110)
      g.addColorStop(0,'rgba(99,102,241,0.35)'); g.addColorStop(1,'transparent')
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
      for(let i=0;i<pts.length;i++){
        for(let j=i+1;j<pts.length;j++){
          const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy)
          if(d<50){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle=`rgba(129,140,248,${(1-d/50)*.12})`;ctx.lineWidth=.5;ctx.stroke()}
        }
        ctx.beginPath();ctx.arc(pts[i].x,pts[i].y,pts[i].r,0,Math.PI*2)
        ctx.fillStyle=pts[i].col;ctx.globalAlpha=.45;ctx.fill();ctx.globalAlpha=1
        pts[i].x+=pts[i].vx;pts[i].y+=pts[i].vy
        if(pts[i].x<0||pts[i].x>W)pts[i].vx*=-1
        if(pts[i].y<0||pts[i].y>H)pts[i].vy*=-1
      }
      raf=requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])
  return null
}
