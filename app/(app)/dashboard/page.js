'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import StreakCard from '@/components/StreakCard'

const TOOLS = [
  { href:'/ai-tutor',    label:'Nova',        sub:'AI tutor',     icon:'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10a3 3 0 100-6 3 3 0 000 6z', color:'#a78bfa', bg:'rgba(124,58,237,0.12)', border:'rgba(124,58,237,0.25)' },
  { href:'/flashcards',  label:'Flashcards',  sub:'Quick review', icon:'M4 3h9a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zM2 5H1v7a1 1 0 001 1h9', color:'#34d399', bg:'rgba(52,211,153,0.12)', border:'rgba(52,211,153,0.2)' },
  { href:'/quiz',        label:'Quiz',        sub:'Test yourself', icon:'M6 5.5a2.5 2.5 0 014.5 1.5c0 1.5-1.5 2-2 3V11m0 2.5v.5',   color:'#a78bfa', bg:'rgba(167,139,250,0.12)', border:'rgba(167,139,250,0.2)' },
  { href:'/study-guide', label:'Study Guide', sub:'Deep dive',     icon:'M1 3h6.5L9 4.5h6V13H9l-1.5-1.5H1zm0 0v10',                  color:'#fb923c', bg:'rgba(251,146,60,0.12)',  border:'rgba(251,146,60,0.2)'  },
  { href:'/summarize',   label:'Summarize',   sub:'Quick notes',   icon:'M2 3h12v2.5H2zm0 4h8v2.5H2zm0 4h10v2H2',                    color:'#60a5fa', bg:'rgba(96,165,250,0.12)',   border:'rgba(96,165,250,0.2)'  },
  { href:'/search',      label:'Search',      sub:'Find anything', icon:'M7 1a6 6 0 100 12A6 6 0 007 1zm7 14l-3-3',                   color:'#f59e0b', bg:'rgba(245,158,11,0.12)',  border:'rgba(245,158,11,0.2)'  },
]

const SUBJECT_COLORS = ['#60a5fa','#34d399','#a78bfa','#fb923c','#f472b6']

function TodayInHistory() {
  const [events, setEvents] = useState([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = 'dash-anim'
    if (document.getElementById(id)) return
    const s = document.createElement('style')
    s.id = id
    s.textContent = "@keyframes spin { to { transform: rotate(360deg) } } @keyframes fadeSlide { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } } @media(max-width:700px){ .dash-metrics{ grid-template-columns:1fr!important; gap:8px!important; } .dash-tools{ grid-template-columns:repeat(3,1fr)!important; gap:8px!important; } .dash-bottom{ grid-template-columns:1fr!important; } } @media(min-width:701px) and (max-width:900px){ .dash-tools{ grid-template-columns:repeat(3,1fr)!important; } .dash-bottom{ grid-template-columns:1fr 1fr!important; } } @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:0.3}} @keyframes card-in{from{opacity:0;transform:translateY(16px) scale(0.96)}60%{transform:translateY(-3px) scale(1.01)}to{opacity:1;transform:translateY(0) scale(1)}} @keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}} .skel{background:linear-gradient(90deg,#21262d 25%,#2d333b 50%,#21262d 75%);background-size:1200px 100%;animation:shimmer 1.6s infinite linear;border-radius:8px} html:not(.dark) .skel{background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);background-size:1200px 100%;animation:shimmer 1.6s infinite linear} @media(max-width:700px){ .dash-metrics{ grid-template-columns:1fr!important; gap:8px!important; } .dash-tools{ grid-template-columns:repeat(3,1fr)!important; gap:8px!important; } .dash-bottom{ grid-template-columns:1fr!important; } } @media(min-width:701px) and (max-width:900px){ .dash-tools{ grid-template-columns:repeat(3,1fr)!important; } .dash-bottom{ grid-template-columns:1fr 1fr!important; } } @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }"
    document.head.appendChild(s)
  }, [])

  useEffect(() => {
    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()

    fetch(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${month}/${day}`)
      .then(r => r.json())
      .then(data => {
        const items = (data.selected || [])
          .filter(e => {
            if (!e.text || !e.year) return false
            const BAD = ['kill','killed','murder','assassin','massacre','genocide','execut','suicide','terror','bomb','attack','shot','hung','hanged','beheaded','lynch','slaughter','riot','civil war','world war','holocaust','rape','torture','hostage','hijack','crash killed','died in','casualties','wounded']
            const low = e.text.toLowerCase()
            return !BAD.some(w => low.includes(w))
          })
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

  const event = events[idx]

  return (
    <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 14, padding: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 4v4l3 1.5"/></svg>
          </div>
          <span style={{ fontSize: 10, color: 'var(--c-t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>This day in history</span>
        </div>
        <span style={{ fontSize: 10, color: '#fb923c', fontWeight: 600 }}>{new Date().toLocaleDateString('en-US',{month:'long',day:'numeric'})}</span>
      </div>

      {loading ? (
        <div style={{ height: 60, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #fb923c', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
          <span style={{ fontSize: 12, color: 'var(--c-t3)' }}>Loading today's events…</span>
        </div>
      ) : event ? (
        <div style={{ animation: 'fadeSlide 0.4s ease' }} key={idx}>
          <div style={{ display: 'inline-block', background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, color: '#fb923c', marginBottom: 8 }}>
            {event.year}
          </div>
          <p style={{ fontSize: 13, color: 'var(--c-t1)', lineHeight: 1.55, margin: '0 0 12px' }}>
            {event.text.length > 140 ? event.text.slice(0, 140) + '…' : event.text}
          </p>
          <div style={{ display: 'flex', gap: 4 }}>
            {events.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                style={{ width: i === idx ? 16 : 5, height: 5, borderRadius: 3, background: i === idx ? '#fb923c' : 'var(--c-line)', border: 'none', cursor: 'pointer', transition: 'all 0.25s', padding: 0 }}/>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--c-t3)', margin: 0 }}>Could not load events for today.</p>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const [classes, setClasses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [quizScore, setQuizScore] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [dueToday, setDueToday] = useState(0)

  useEffect(() => {
    if (user) loadData()
    else setDataLoading(false)
  }, [user])

  async function loadData() {
    setDataLoading(true)
    try {
      const sm2 = JSON.parse(localStorage.getItem('ff-sm2') || '{}')
      const now = Date.now()
      const due = Object.values(sm2).filter(c => c.nextReview && c.nextReview <= now).length
      setDueToday(due)
    } catch(e) {}
    const { data: enroll } = await supabase
      .from('student_enrollments')
      .select('classroom_id, classrooms(name, subject)')
      .eq('student_id', user.id)
    if (enroll) setClasses(enroll.map(e => e.classrooms).filter(Boolean))

    const { data: hw } = await supabase
      .from('homework_assignments')
      .select('id, title, due_date, classroom_id')
      .eq('classroom_id', enroll?.[0]?.classroom_id)
      .order('due_date', { ascending: true })
      .limit(3)
    if (hw) setAssignments(hw)
    setDataLoading(false)
  }

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const subjectColors = classes.map((cls, i) => ({ ...cls, color: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }))

  return (
    <div style={{ padding: 'clamp(14px,3vw,24px) clamp(12px,3vw,24px) 0', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--c-t3)', fontWeight: 500, marginBottom: 2 }}>{greeting}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-t1)', letterSpacing: '-0.02em' }}>Hey, {firstName} 👋</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {classes.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '4px 12px' }}>
              <span style={{ width: 5, height: 5, background: '#4ade80', borderRadius: '50%', display: 'inline-block', animation: 'pulse-dot 1.2s infinite' }}></span>
              <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>{classes.length} class{classes.length !== 1 ? 'es' : ''} active</span>
            </div>
          )}
          {dueToday > 0 && (
            <a href="/flashcards" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 20, padding: '4px 12px', textDecoration: 'none' }}>
              <span style={{ fontSize: 11 }}>↻</span>
              <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>{dueToday} card{dueToday !== 1 ? 's' : ''} due today</span>
            </a>
          )}
          <Link href="/create" style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 9, padding: '8px 16px', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M8 1v14M1 8h14"/></svg>
            Create
          </Link>
        </div>
      </div>

      {/* Metric cards */}
      <div className="dash-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 9, color: 'var(--c-t3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 8 }}>Subjects active</div>
          {subjectColors.length > 0 ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                {subjectColors.slice(0, 4).map(cls => (
                  <span key={cls.name} style={{ background: cls.color + '22', border: '1px solid ' + cls.color + '44', color: cls.color, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6 }}>
                    {cls.name || cls.subject || 'Class'}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'var(--c-t3)' }}>{subjectColors.length} class{subjectColors.length !== 1 ? 'es' : ''} connected</div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                <span style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6 }}>Join a class</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--c-t3)' }}>No classes yet — <Link href="/student-portal" style={{ color: '#60a5fa', textDecoration: 'none' }}>enroll now</Link></div>
            </>
          )}
        </div>

        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 9, color: 'var(--c-t3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 8 }}>Assignments due</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: assignments.length > 0 ? '#f59e0b' : 'var(--c-t2)', lineHeight: 1 }}>
            {assignments.length}<span style={{ fontSize: 12, color: 'var(--c-t3)', fontWeight: 400 }}> pending</span>
          </div>
          <div style={{ height: 3, background: 'var(--c-surface2)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: Math.min(assignments.length * 20, 100) + '%', background: 'linear-gradient(90deg,#f59e0b,#d97706)', borderRadius: 2 }}/>
          </div>
        </div>

        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 9, color: 'var(--c-t3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 8 }}>Last quiz score</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#60a5fa', lineHeight: 1 }}>
            {quizScore !== null ? <>{quizScore}<span style={{ fontSize: 12, color: 'var(--c-t3)', fontWeight: 400 }}>%</span></> : <span style={{ fontSize: 13, color: 'var(--c-t3)', fontWeight: 500 }}>No quiz yet</span>}
          </div>
          <div style={{ height: 3, background: 'var(--c-surface2)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: (quizScore || 0) + '%', background: 'linear-gradient(90deg,#3b82f6,#6366f1)', borderRadius: 2 }}/>
          </div>
        </div>
      </div>

      {/* Tool grid */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--c-t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Quick tools</div>
        <div className="dash-tools" style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
          {TOOLS.map((t,i) => (
            <a key={t.href} href={t.href} style={{ background: t.bg, border: '1px solid ' + t.border, borderRadius: 14, padding: 14, textDecoration: 'none', transition: 'transform 0.15s, box-shadow 0.15s', display: 'block', animation: `card-in 0.4s ease ${i*60}ms both`, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px ' + t.color + '22'; }}
              onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
              <div style={{ width: 30, height: 30, borderRadius: 10, background: t.bg.replace('0.12','0.2'), display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={t.color} strokeWidth="1.5" strokeLinecap="round"><path d={t.icon}/></svg>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.color }}>{t.label}</div>
              <div style={{ fontSize: 10, color: 'var(--c-t3)', marginTop: 2 }}>{t.sub}</div>
            </a>
          ))}
        </div>
      </div>

      {/* ── Study Streaks ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--c-t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Study progress</div>
        <StreakCard />
      </div>

      {/* Nova Noticed callout */}
      {!dataLoading && classes.length > 0 && (
        <div style={{ background:'rgba(124,58,237,0.06)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:14, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:32, height:32, borderRadius:10, background:'rgba(167,139,250,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10a3 3 0 100-6 3 3 0 000 6z"/></svg>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#a78bfa', marginBottom:2 }}>Nova noticed</div>
            <div style={{ fontSize:12, color:'var(--c-t2)', lineHeight:1.5 }}>You've been studying {classes[0]?.name || 'your class'} — want Nova to build you a comprehensive study guide to round it out?</div>
          </div>
          <a href="/ai-tutor" style={{ flexShrink:0, background:'rgba(167,139,250,0.15)', border:'1px solid rgba(167,139,250,0.3)', borderRadius:8, padding:'6px 12px', fontSize:11, fontWeight:700, color:'#a78bfa', textDecoration:'none', whiteSpace:'nowrap' }}>Ask Nova →</a>
        </div>
      )}

      {/* What's due today */}
      {assignments.length > 0 && (
        <div style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span style={{ fontSize:11, fontWeight:700, color:'#f59e0b', letterSpacing:'0.07em' }}>DUE TODAY</span>
          </div>
          {assignments.filter(a => {
            if (!a.due_date) return false
            return new Date(a.due_date).toDateString() === new Date().toDateString()
          }).length === 0 ? (
            <p style={{ fontSize:13, color:'var(--c-t3)' }}>Nothing due today — you're all caught up!</p>
          ) : (
            assignments.filter(a => {
              if (!a.due_date) return false
              return new Date(a.due_date).toDateString() === new Date().toDateString()
            }).map((a,i) => (
              <div key={a.id||i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderTop: i>0 ? '1px solid rgba(245,158,11,0.1)' : 'none' }}>
                <span style={{ fontSize:13, color:'var(--c-t1)', fontWeight:500 }}>{a.title}</span>
                <a href={'/'+a.type} style={{ padding:'4px 10px', borderRadius:6, background:'#f59e0b', color:'#0d1117', fontSize:11, fontWeight:600, textDecoration:'none' }}>Start →</a>
              </div>
            ))
          )}
        </div>
      )}

      {/* Bottom row */}
      <div className="dash-bottom" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 1fr', gap: 12, paddingBottom: 24 }}>

        {/* Active class */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--c-t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Active class</div>
          {classes.length > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"><path d="M8 1a4 4 0 100 8 4 4 0 000-8zm-6 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-t1)' }}>{classes[0].name || 'My Class'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '2px 8px' }}>
                  <span style={{ width: 4, height: 4, background: '#4ade80', borderRadius: '50%', display: 'inline-block' }}></span>
                  <span style={{ fontSize: 9, color: '#4ade80', fontWeight: 600 }}>Live</span>
                </div>
              </div>
              {assignments.slice(0,2).map(a => (
                <div key={a.id} style={{ background: 'var(--c-surface2)', borderRadius: 8, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 4, height: 4, background: '#f59e0b', borderRadius: '50%', flexShrink: 0 }}></div>
                  <span style={{ fontSize: 11, color: 'var(--c-t2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                  {a.due_date && <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>{new Date(a.due_date).toLocaleDateString('en',{month:'short',day:'numeric'})}</span>}
                </div>
              ))}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 12, color: 'var(--c-t3)', marginBottom: 10 }}>No classes yet</div>
              <Link href="/student-portal" style={{ background: '#2563eb', color: 'white', borderRadius: 8, padding: '7px 16px', fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>Join a class</Link>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--c-t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Recent activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { color: '#34d399', label: 'Start generating flashcards', href: '/flashcards' },
              { color: '#a78bfa', label: 'Ask Nova your first question', href: '/ai-tutor' },
              { color: '#60a5fa', label: 'Take a practice quiz', href: '/quiz' },
            ].map((a, i) => (
              <Link key={i} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.color, flexShrink: 0 }}></div>
                <span style={{ fontSize: 11, color: 'var(--c-t2)', flex: 1 }}>{a.label}</span>
                <span style={{ fontSize: 10, color: '#3b82f6' }}>→</span>
              </Link>
            ))}
          </div>
        </div>

        {/* This Day in History */}
        <TodayInHistory />
      </div>

    </div>
  )
}
