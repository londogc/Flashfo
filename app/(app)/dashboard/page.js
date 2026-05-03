'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

// ── Today in History (unchanged) ──────────────────────────────────────────
function TodayInHistory() {
  const [events, setEvents] = useState([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()
    fetch('https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/' + month + '/' + day)
      .then(r => r.json())
      .then(data => {
        const BAD = ['kill','killed','murder','assassin','massacre','genocide','execut','suicide','terror','bomb','attack','shot','hung','hanged','beheaded','lynch','slaughter','riot','civil war','world war','holocaust','rape','torture','hostage','hijack','crash killed','died in','casualties','wounded']
        const items = (data.selected || []).filter(e => {
          if (!e.text || !e.year) return false
          const low = e.text.toLowerCase()
          return !BAD.some(w => low.includes(w))
        }).slice(0, 6).map(e => ({ year: e.year, text: e.text }))
        setEvents(items); setLoading(false)
      }).catch(() => setLoading(false))
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
          <span style={{ fontSize: 12, color: 'var(--c-t3)' }}>Loading events...</span>
        </div>
      ) : event ? (
        <div key={idx}>
          <div style={{ display: 'inline-block', background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, color: '#fb923c', marginBottom: 8 }}>{event.year}</div>
          <p style={{ fontSize: 13, color: 'var(--c-t1)', lineHeight: 1.55, margin: '0 0 12px' }}>{event.text.length > 140 ? event.text.slice(0, 140) + '...' : event.text}</p>
          <div style={{ display: 'flex', gap: 4 }}>
            {events.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 16 : 5, height: 5, borderRadius: 3, background: i === idx ? '#fb923c' : 'var(--c-line)', border: 'none', cursor: 'pointer', transition: 'all 0.25s', padding: 0 }}/>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--c-t3)', margin: 0 }}>Could not load events for today.</p>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Student Dashboard ──────────────────────────────────────────────────────
function StudentDashboard({ user, profile, dueToday }) {
  const [savedItems, setSavedItems] = useState([])
  const [streak, setStreak] = useState(0)
  const [weekDots, setWeekDots] = useState([false,false,false,false,false,false,false])
  const [totalMastered, setTotalMastered] = useState(0)
  const [quickTool, setQuickTool] = useState('flashcards')
  const [quickTopic, setQuickTopic] = useState('')

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const DAYS = ['M','T','W','T','F','S','S']
  const QUICK_TOOLS = [
    { id:'flashcards', label:'Flashcards', href:'/flashcards', color:'#3b82f6' },
    { id:'quiz', label:'Quiz', href:'/quiz', color:'#8b5cf6' },
    { id:'study-guide', label:'Study Guide', href:'/study-guide', color:'#10b981' },
    { id:'ai-tutor', label:'Ask Nova', href:'/ai-tutor', color:'#a78bfa' },
    { id:'summarize', label:'Summarize', href:'/summarize', color:'#f59e0b' },
  ]
  const selectedTool = QUICK_TOOLS.find(t => t.id === quickTool) || QUICK_TOOLS[0]
  const generateHref = quickTopic.trim() ? selectedTool.href + '?q=' + encodeURIComponent(quickTopic) : selectedTool.href

  useEffect(() => {
    try {
      const reviews = JSON.parse(localStorage.getItem('ff-card-reviews') || '{}')
      const dates = new Set()
      Object.values(reviews).forEach(r => {
        if (r.lastReviewed) dates.add(new Date(r.lastReviewed).toDateString())
      })
      let s = 0; const now = new Date()
      for (let i = 0; i < 365; i++) {
        const d = new Date(now); d.setDate(d.getDate() - i)
        if (dates.has(d.toDateString())) s++; else if (i > 0) break
      }
      setStreak(s)
      const dots = []; for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); dots.push(dates.has(d.toDateString())) }
      setWeekDots(dots)
      setTotalMastered(Object.values(reviews).filter(r => (r.repetitions || 0) >= 3).length)
    } catch(e) {}
    if (user) {
      supabase.from('saved_items').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(3)
        .then(({ data }) => { if (data) setSavedItems(data) })
    }
  }, [user])

  return (
    <div style={{ padding: 'clamp(14px,3vw,24px)', maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        @keyframes streak-glow{0%,100%{color:#fb923c}50%{color:#fdba74}}
        @keyframes nova-pulse{0%,100%{border-color:rgba(109,40,217,0.2)}50%{border-color:rgba(109,40,217,0.45)}}
        @keyframes card-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:700px){.sd-grid{grid-template-columns:1fr!important}}
      `}</style>

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:12, color:'var(--c-t3)', fontWeight:500, marginBottom:2 }}>{greeting}</div>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--c-t1)', letterSpacing:'-0.02em' }}>Hey, {firstName} &#128075;</div>
        </div>
        {streak > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(251,146,60,0.1)', border:'1px solid rgba(251,146,60,0.2)', borderRadius:12, padding:'8px 14px' }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 1c-1 2.5-3 3.5-3 6a3 3 0 006 0c0-2.5-2-3.5-3-6z" fill="#fb923c" opacity=".9"/><path d="M6 10c0 1.1.9 2 2 2" stroke="#fdba74" strokeWidth="1.2" fill="none"/></svg>
            <div>
              <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
                <span style={{ fontSize:24, fontWeight:800, color:'#fb923c', letterSpacing:'-0.03em', lineHeight:1, animation:'streak-glow 2s ease-in-out infinite' }}>{streak}</span>
                <span style={{ fontSize:10, fontWeight:700, color:'rgba(251,146,60,0.7)', textTransform:'uppercase', letterSpacing:'.07em' }}>day streak</span>
              </div>
              <div style={{ display:'flex', gap:3, marginTop:4 }}>
                {weekDots.map((active, i) => <div key={i} style={{ width:9, height:9, borderRadius:2, background: active ? '#fb923c' : 'rgba(255,255,255,0.08)' }}/>)}
              </div>
            </div>
          </div>
        )}
      </div>

      {dueToday > 0 && (
        <a href="/flashcards" style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.18)', borderRadius:12, padding:'11px 14px', marginBottom:16, textDecoration:'none', animation:'card-in 0.3s ease' }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'rgba(239,68,68,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M8 5v3.5M8 11v.5"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#f87171' }}>{dueToday} card{dueToday !== 1 ? 's' : ''} due for review today</div>
            <div style={{ fontSize:10, color:'rgba(239,68,68,0.5)', marginTop:2 }}>Skip and your streak resets &mdash; review now</div>
          </div>
          <div style={{ fontSize:10, fontWeight:700, color:'#f87171', border:'1px solid rgba(239,68,68,0.25)', borderRadius:6, padding:'4px 9px', flexShrink:0 }}>Review now</div>
        </a>
      )}

      <div className="sd-grid" style={{ display:'grid', gridTemplateColumns:'1fr 200px', gap:16, marginBottom:20 }}>
        <div>
          {savedItems.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.09em', textTransform:'uppercase', color:'var(--c-t3)', marginBottom:8 }}>Continue studying</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {savedItems.map((item, i) => {
                  const isCards = item.type === 'flashcards', isQuiz = item.type === 'quiz'
                  const color = isCards ? '#3b82f6' : isQuiz ? '#8b5cf6' : '#10b981'
                  const typeLabel = isCards ? 'Flashcards' : isQuiz ? 'Quiz' : 'Guide'
                  const data = item.data || {}
                  const total = isCards ? (data.cards?.length || 0) : isQuiz ? (data.questions?.length || 0) : 0
                  const href = '/' + (isCards ? 'flashcards' : isQuiz ? 'quiz' : 'study-guide')
                  return (
                    <a key={item.id} href={href} style={{ display:'flex', alignItems:'center', gap:10, background:'var(--c-surface)', border:'1px solid var(--c-line)', borderLeft:'3px solid ' + color, borderRadius:10, padding:'10px 12px', textDecoration:'none', animation:'card-in 0.3s ease ' + (i*0.06) + 's both' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--c-t1)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.title || 'Untitled'}</div>
                        <div style={{ fontSize:10, color:'var(--c-t3)', marginTop:2 }}>
                          <span style={{ background:color+'20', color, fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:4, marginRight:5, textTransform:'uppercase' }}>{typeLabel}</span>
                          {total > 0 ? total + ' ' + (isCards ? 'cards' : 'questions') : 'Saved'}
                        </div>
                      </div>
                      <div style={{ fontSize:10, fontWeight:700, color }}>{isCards ? 'Resume' : isQuiz ? 'Retake' : 'Open'}</div>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ background:'var(--c-surface)', border:'1px solid rgba(109,40,217,0.2)', borderRadius:12, padding:'11px 14px', animation:'nova-pulse 3s ease-in-out infinite' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'rgba(109,40,217,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.5"/><circle cx="8" cy="8" r="3"/><circle cx="8" cy="8" r="1" fill="#a78bfa" stroke="none"/></svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.07em', color:'#a78bfa', textTransform:'uppercase', marginBottom:4 }}>Nova suggests</div>
                <div style={{ fontSize:12, color:'var(--c-t2)', lineHeight:1.5 }}>
                  {dueToday > 0 ? 'You have ' + dueToday + ' cards waiting for review. Run through them to lock in your memory.' : savedItems.length > 0 ? 'Continue with "' + (savedItems[0]?.title || 'your last session') + '" or start something new.' : "What are you studying today? I can generate flashcards, a quiz, or explain any concept instantly."}
                </div>
                <div style={{ display:'flex', gap:6, marginTop:8 }}>
                  {dueToday > 0
                    ? <a href="/flashcards" style={{ fontSize:10, fontWeight:600, padding:'4px 9px', borderRadius:6, border:'1px solid rgba(109,40,217,0.25)', color:'#a78bfa', textDecoration:'none' }}>Review cards</a>
                    : <>
                        <a href="/flashcards" style={{ fontSize:10, fontWeight:600, padding:'4px 9px', borderRadius:6, border:'1px solid rgba(109,40,217,0.25)', color:'#a78bfa', textDecoration:'none' }}>Flashcards</a>
                        <a href="/quiz" style={{ fontSize:10, fontWeight:600, padding:'4px 9px', borderRadius:6, border:'1px solid rgba(109,40,217,0.25)', color:'#a78bfa', textDecoration:'none' }}>Quiz</a>
                        <a href="/ai-tutor" style={{ fontSize:10, fontWeight:600, padding:'4px 9px', borderRadius:6, border:'1px solid rgba(109,40,217,0.25)', color:'#a78bfa', textDecoration:'none' }}>Ask Nova</a>
                      </>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.09em', textTransform:'uppercase', color:'var(--c-t3)' }}>This week</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:10, padding:'10px 11px' }}>
              <div style={{ fontSize:22, fontWeight:800, color:'#34d399', letterSpacing:'-0.03em', lineHeight:1 }}>{totalMastered}</div>
              <div style={{ fontSize:10, color:'var(--c-t3)', marginTop:3 }}>Cards mastered</div>
            </div>
            <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:10, padding:'10px 11px' }}>
              <div style={{ fontSize:22, fontWeight:800, color:'#60a5fa', letterSpacing:'-0.03em', lineHeight:1 }}>{savedItems.length}</div>
              <div style={{ fontSize:10, color:'var(--c-t3)', marginTop:3 }}>Saved items</div>
            </div>
          </div>
          <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:10, padding:'10px 11px' }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'var(--c-t3)', marginBottom:7 }}>Activity</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
              {weekDots.map((active, i) => (
                <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                  <div style={{ height:22, width:'100%', borderRadius:4, background: active ? 'rgba(59,130,246,0.7)' : 'rgba(255,255,255,0.06)' }}/>
                  <span style={{ fontSize:8, color:'var(--c-t3)', fontWeight:600 }}>{DAYS[i]}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:10, padding:'10px 11px' }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'var(--c-t3)', marginBottom:7 }}>Quick start</div>
            <input value={quickTopic} onChange={e => setQuickTopic(e.target.value)} placeholder="Topic..."
              style={{ width:'100%', height:30, background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:7, padding:'0 8px', fontSize:11, color:'var(--c-t1)', outline:'none', marginBottom:7, boxSizing:'border-box' }}/>
            <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
              {QUICK_TOOLS.map(t => (
                <button key={t.id} onClick={() => setQuickTool(t.id)}
                  style={{ fontSize:9, fontWeight:700, padding:'3px 7px', borderRadius:5, border:'1px solid ' + (quickTool===t.id ? t.color+'50' : 'var(--c-line)'), background: quickTool===t.id ? t.color+'15' : 'transparent', color: quickTool===t.id ? t.color : 'var(--c-t3)', cursor:'pointer', letterSpacing:'.02em' }}>
                  {t.label}
                </button>
              ))}
            </div>
            <a href={generateHref} style={{ display:'block', textAlign:'center', padding:'7px 0', borderRadius:7, background:'#2563eb', fontSize:10, fontWeight:700, color:'#fff', textDecoration:'none' }}>Generate</a>
          </div>
        </div>
      </div>

      <TodayInHistory/>
    </div>
  )
}

// ── Teacher Dashboard ──────────────────────────────────────────────────────
function TeacherDashboard({ user, profile }) {
  const [classes, setClasses] = useState([])
  const [studentCount, setStudentCount] = useState(0)
  const [savedPlans, setSavedPlans] = useState([])
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    if (!user) return
    supabase.from('classrooms').select('id, name, subject').eq('teacher_id', user.id).limit(5)
      .then(({ data }) => {
        if (data) { setClasses(data); setStudentCount(data.length) }
      })
    supabase.from('saved_items').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(4)
      .then(({ data }) => { if (data) setSavedPlans(data) })
  }, [user])

  const PLAN_COLORS = { lesson_plan:'#10b981', curriculum:'#8b5cf6', quiz:'#3b82f6', flashcards:'#34d399' }

  return (
    <div style={{ padding:'clamp(14px,3vw,24px)', maxWidth:1100, margin:'0 auto' }}>
      <style>{`
        @keyframes card-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:700px){.td-cols{flex-direction:column!important}}
      `}</style>

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:12, color:'var(--c-t3)', fontWeight:500, marginBottom:2 }}>{greeting}</div>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--c-t1)', letterSpacing:'-0.02em' }}>Your classroom, {firstName}</div>
        </div>
        <a href="/live-quiz" style={{ display:'flex', alignItems:'center', gap:8, background:'#059669', borderRadius:10, padding:'9px 16px', textDecoration:'none', flexShrink:0 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#fff', opacity:0.9 }}/>
          <span style={{ fontSize:12, fontWeight:700, color:'#fff', letterSpacing:'.01em' }}>Launch Live Quiz</span>
        </a>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:18 }}>
        {[
          { val: studentCount || classes.length || '—', label:'Classes created', color:'var(--c-t1)' },
          { val: classes.length, label:'Active classes', color:'#34d399' },
          { val: savedPlans.length, label:'Saved items', color:'#a78bfa' },
        ].map((s, i) => (
          <div key={i} style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:12, padding:'12px 14px', textAlign:'center' }}>
            <div style={{ fontSize:28, fontWeight:800, color:s.color, letterSpacing:'-0.02em', lineHeight:1 }}>{s.val}</div>
            <div style={{ fontSize:10, color:'var(--c-t3)', marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="td-cols" style={{ display:'flex', gap:16, marginBottom:20 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.09em', textTransform:'uppercase', color:'var(--c-t3)', marginBottom:8 }}>
            {classes.length > 0 ? 'My classes' : 'Get started'}
          </div>
          {classes.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
              {classes.slice(0, 3).map((cls, i) => (
                <a key={cls.id} href={'/teach?class=' + cls.id} style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:10, padding:'10px 12px', textDecoration:'none', animation:'card-in 0.3s ease ' + (i*0.05) + 's both' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--c-t1)' }}>{cls.name}</div>
                  <div style={{ fontSize:10, color:'var(--c-t3)', marginTop:2 }}>{cls.subject || 'No subject set'}</div>
                </a>
              ))}
            </div>
          ) : (
            <div style={{ background:'var(--c-surface)', border:'1px dashed var(--c-line)', borderRadius:10, padding:'16px 12px', textAlign:'center', marginBottom:12 }}>
              <div style={{ fontSize:12, color:'var(--c-t3)', marginBottom:10 }}>No classes yet</div>
              <a href="/teach" style={{ fontSize:11, fontWeight:600, padding:'6px 14px', borderRadius:7, background:'#059669', color:'#fff', textDecoration:'none' }}>Create a class</a>
            </div>
          )}
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.09em', textTransform:'uppercase', color:'var(--c-t3)', marginBottom:8 }}>Quick create</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {[
              { href:'/lesson-builder', label:'Lesson Plan', color:'#10b981', bg:'rgba(16,185,129,0.08)', border:'rgba(16,185,129,0.2)' },
              { href:'/live-quiz', label:'Live Quiz', color:'#059669', bg:'rgba(5,150,105,0.08)', border:'rgba(5,150,105,0.2)' },
              { href:'/curriculum', label:'Curriculum', color:'#8b5cf6', bg:'rgba(139,92,246,0.08)', border:'rgba(139,92,246,0.2)' },
              { href:'/teach/insights', label:'Insights', color:'var(--c-t2)', bg:'rgba(255,255,255,0.03)', border:'var(--c-line)' },
            ].map(item => (
              <a key={item.href} href={item.href} style={{ background:item.bg, border:'1px solid ' + item.border, borderRadius:8, padding:'8px', textAlign:'center', fontSize:10, fontWeight:700, color:item.color, textDecoration:'none', letterSpacing:'.02em' }}>{item.label}</a>
            ))}
          </div>
        </div>

        <div style={{ flex:1 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.09em', textTransform:'uppercase', color:'var(--c-t3)', marginBottom:8 }}>Saved items</div>
          {savedPlans.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
              {savedPlans.map((plan, i) => {
                const color = PLAN_COLORS[plan.type] || '#60a5fa'
                return (
                  <div key={plan.id} style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderLeft:'3px solid ' + color, borderRadius:10, padding:'10px 12px', display:'flex', alignItems:'center', gap:10, animation:'card-in 0.3s ease ' + (i*0.05) + 's both' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--c-t1)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{plan.title || 'Untitled'}</div>
                      <div style={{ fontSize:10, color:'var(--c-t3)', marginTop:2, textTransform:'capitalize' }}>{(plan.type || '').replace('_', ' ')}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ background:'var(--c-surface)', border:'1px dashed var(--c-line)', borderRadius:10, padding:'16px 12px', textAlign:'center', marginBottom:12 }}>
              <div style={{ fontSize:12, color:'var(--c-t3)', marginBottom:10 }}>No saved items yet</div>
              <a href="/lesson-builder" style={{ fontSize:11, fontWeight:600, padding:'6px 14px', borderRadius:7, background:'#10b981', color:'#fff', textDecoration:'none' }}>Build a lesson plan</a>
            </div>
          )}
          <div style={{ background:'var(--c-surface)', border:'1px solid rgba(109,40,217,0.2)', borderRadius:10, padding:'11px 12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
              <div style={{ width:22, height:22, borderRadius:6, background:'rgba(109,40,217,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.5"/><circle cx="8" cy="8" r="3"/><circle cx="8" cy="8" r="1" fill="#a78bfa" stroke="none"/></svg>
              </div>
              <span style={{ fontSize:9, fontWeight:700, color:'#a78bfa', textTransform:'uppercase', letterSpacing:'.07em' }}>Nova for teachers</span>
            </div>
            <div style={{ fontSize:11, color:'var(--c-t2)', lineHeight:1.5, marginBottom:8 }}>Generate lesson plans, differentiated materials, and curriculum-aligned resources instantly.</div>
            <a href="/ai-tutor" style={{ fontSize:10, fontWeight:600, padding:'4px 9px', borderRadius:6, border:'1px solid rgba(109,40,217,0.25)', color:'#a78bfa', textDecoration:'none' }}>Ask Nova</a>
          </div>
        </div>
      </div>

      <TodayInHistory/>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const [dueToday, setDueToday] = useState(0)

  useEffect(() => {
    try {
      const reviews = JSON.parse(localStorage.getItem('ff-card-reviews') || '{}')
      const now = Date.now()
      const due = Object.values(reviews).filter(c => c.nextReview && c.nextReview <= now).length
      setDueToday(due)
    } catch(e) {}
  }, [])

  const isTeacher = profile?.plan === 'teacher' || profile?.plan === 'school'

  if (loading) return (
    <div style={{ padding:'clamp(14px,3vw,24px)', maxWidth:1100, margin:'0 auto' }}>
      <div style={{ height:32, width:200, borderRadius:8, background:'var(--c-surface2)', marginBottom:20 }}/>
      <div style={{ height:120, borderRadius:12, background:'var(--c-surface)', marginBottom:16 }}/>
      <div style={{ height:200, borderRadius:12, background:'var(--c-surface)' }}/>
    </div>
  )

  return isTeacher
    ? <TeacherDashboard user={user} profile={profile}/>
    : <StudentDashboard user={user} profile={profile} dueToday={dueToday}/>
}
