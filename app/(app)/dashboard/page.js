'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import StreakCard from '@/components/StreakCard'
import { useIsMobile } from '@/hooks/useIsMobile'
import dynamic from 'next/dynamic'
// Dynamic import — MobileDashboard is code-split into its own chunk.
// Desktop users never download it. TO REVERT: replace with:
//   import MobileDashboard from '@/components/dashboard/MobileDashboard'
const MobileDashboard = dynamic(() => import('@/components/dashboard/MobileDashboard'), { ssr: false })

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
  const isMobile = useIsMobile()
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

  if (isMobile) return <MobileDashboard />

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const nextAssignment = assignments[0]
  const dueLabel = nextAssignment?.due_date ? `Due ${new Date(nextAssignment.due_date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}` : 'No due date'
  const savedCount = 0 // placeholder — fetched by My Stuff

  // ── Card styles ────────────────────────────────────────────────────────────
  const card = {
    background:'rgba(255,255,255,0.025)',
    border:'0.5px solid rgba(255,255,255,0.07)',
    borderRadius:16, overflow:'hidden',
  }

  return (
    <div style={{ padding:'28px 28px 80px', maxWidth:900, margin:'0 auto' }}>
      <style>{`
        @keyframes dash-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:0.3}}
        .dash-card{animation:dash-in 0.3s cubic-bezier(.4,0,.2,1) both}
        .dash-card:hover .dash-card-hover{opacity:1!important}
      `}</style>

      {/* Greeting */}
      <div className="dash-card" style={{ marginBottom:20 }}>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginBottom:3 }}>{greeting}</div>
        <div style={{ fontSize:26, fontWeight:600, color:'rgba(255,255,255,0.88)', letterSpacing:'-0.03em' }}>{firstName}</div>
      </div>

      {/* ── 1. Continue card ── */}
      <div className="dash-card" style={{ ...card, marginBottom:12, animationDelay:'0.05s', position:'relative', minHeight:110 }}>
        <canvas id="dash-particle-canvas" style={{ position:'absolute', inset:0, width:'100%', height:'100%', borderRadius:16 }}/>
        <div style={{ position:'relative', zIndex:1, padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.1)', border:'0.5px solid rgba(255,255,255,0.18)', borderRadius:20, padding:'3px 9px', marginBottom:8 }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#c4b5fd', boxShadow:'0 0 5px #c4b5fd' }}/>
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.8)' }}>Continue</span>
            </div>
            <div style={{ fontSize:16, fontWeight:600, color:'#fff', marginBottom:4, letterSpacing:'-0.02em' }}>
              {dataLoading ? 'Loading…' : assignments.length > 0 ? assignments[0].title : 'Start something new'}
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>
              {assignments.length > 0 ? `Assignment · ${dueLabel}` : 'Your work will appear here'}
            </div>
          </div>
          {assignments.length > 0 && (
            <Link href="/assignments" style={{ flexShrink:0, height:32, padding:'0 14px', background:'rgba(99,102,241,0.25)', border:'0.5px solid rgba(99,102,241,0.4)', borderRadius:9, display:'flex', alignItems:'center', fontSize:12, fontWeight:600, color:'#c4b5fd', textDecoration:'none' }}>
              Open →
            </Link>
          )}
        </div>
      </div>
      <ParticleInit/>

      {/* ── 2. Stats row: Due for review + Class activity ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>

        {/* Due for review */}
        <div className="dash-card" style={{ ...card, padding:'16px 20px', animationDelay:'0.1s' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'rgba(255,255,255,0.25)' }}>Due for review</span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.4" strokeLinecap="round"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 4v4l3 1.5"/></svg>
          </div>
          <div style={{ fontSize:32, fontWeight:600, color: dueToday > 0 ? '#c4b5fd' : 'rgba(255,255,255,0.35)', letterSpacing:'-0.04em', lineHeight:1, marginBottom:6 }}>{dueToday}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginBottom:12 }}>{dueToday === 1 ? 'card due today' : 'cards due today'}</div>
          {dueToday > 0 && (
            <Link href="/flashcards" style={{ display:'inline-flex', alignItems:'center', gap:4, height:28, padding:'0 12px', background:'rgba(99,102,241,0.15)', border:'0.5px solid rgba(99,102,241,0.3)', borderRadius:8, fontSize:11, fontWeight:600, color:'#c4b5fd', textDecoration:'none' }}>Review now →</Link>
          )}
        </div>

        {/* Class activity */}
        <div className="dash-card" style={{ ...card, padding:'16px 20px', animationDelay:'0.13s' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'rgba(255,255,255,0.25)' }}>Class activity</span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.4" strokeLinecap="round"><path d="M8 1l7 3.5-7 3.5-7-3.5zm-5 5.5v4c0 2 2.2 3 5 3s5-1 5-3V10"/></svg>
          </div>
          {classes.length > 0 ? (
            <>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
                {classes.slice(0,3).map((cls, i) => {
                  const colors=['#c4b5fd','#34d399','#60a5fa']
                  return <span key={i} style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:6, background:colors[i%3]+'22', border:`0.5px solid ${colors[i%3]}44`, color:colors[i%3] }}>{cls.name||cls.subject||'Class'}</span>
                })}
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>{classes.length} class{classes.length!==1?'es':''} enrolled</div>
            </>
          ) : (
            <>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginBottom:8 }}>No classes yet</div>
              <Link href="/student-portal" style={{ display:'inline-flex', alignItems:'center', gap:4, height:28, padding:'0 12px', background:'rgba(20,184,166,0.12)', border:'0.5px solid rgba(20,184,166,0.3)', borderRadius:8, fontSize:11, fontWeight:600, color:'#34d399', textDecoration:'none' }}>Join a class →</Link>
            </>
          )}
        </div>
      </div>

      {/* ── 3. Nova suggestion card ── */}
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

      {/* ── 4. This Day in History ── */}
      <div className="dash-card" style={{ animationDelay:'0.19s' }}>
        <TodayInHistory/>
      </div>

    </div>
  )
}

// Particle canvas init — runs after mount
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
      const g2=ctx.createRadialGradient(W*.1,H*.8,0,W*.1,H*.8,80)
      g2.addColorStop(0,'rgba(124,58,237,0.2)'); g2.addColorStop(1,'transparent')
      ctx.fillStyle=g2; ctx.fillRect(0,0,W,H)
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
