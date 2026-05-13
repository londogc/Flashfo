'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  const now  = new Date(); now.setHours(0,0,0,0)
  const exam = new Date(dateStr); exam.setHours(0,0,0,0)
  return Math.ceil((exam - now) / 86400000)
}

function urgencyStyle(days) {
  if (days <= 3)  return { color:'#f87171', bg:'rgba(239,68,68,0.08)',  border:'rgba(239,68,68,0.25)',  label:'Urgent' }
  if (days <= 7)  return { color:'#fbbf24', bg:'rgba(245,158,11,0.08)', border:'rgba(245,158,11,0.25)', label:'Soon' }
  if (days <= 14) return { color:'#60a5fa', bg:'rgba(59,130,246,0.08)', border:'rgba(59,130,246,0.25)', label:'Coming up' }
  return            { color:'#34d399', bg:'rgba(52,211,153,0.07)',  border:'rgba(52,211,153,0.2)',  label:'On track' }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
}

// Study plan: given days remaining and topics, return today's focus
function getDailyPlan(exam, daysLeft) {
  const topics = (exam.topics||'').split(',').map(t=>t.trim()).filter(Boolean)
  if (!topics.length || daysLeft <= 0) return null

  // Simple distribution: cycle through topics weighted by days left
  const phase = daysLeft <= 2 ? 'review' : daysLeft <= 5 ? 'practice' : 'learn'
  const topicIdx = Math.abs(daysLeft) % topics.length
  const todayTopic = topics[topicIdx] || topics[0]

  const plans = {
    learn:    { action:'Study',    cta:'Generate a study guide', href:`/study-guide?q=${encodeURIComponent(todayTopic)}&autoGenerate=1`, icon:'book' },
    practice: { action:'Practice', cta:'Take a quiz',           href:`/quiz?q=${encodeURIComponent(todayTopic)}&autoGenerate=1`,        icon:'target' },
    review:   { action:'Review',   cta:'Review flashcards',     href:`/review`,                                                          icon:'refresh' },
  }
  return { topic:todayTopic, phase, ...plans[phase] }
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const ICONS = {
  book:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  target:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>,
  refresh: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/></svg>,
  add:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  cal:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  check:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>,
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExamCountdownPage() {
  const { user } = useAuth()

  const [exams,   setExams]   = useState([])
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(false)
  const [saving,  setSaving]  = useState(false)

  // Form state
  const [form, setForm] = useState({ name:'', date:'', topics:'', notes:'' })
  const [formErr, setFormErr] = useState('')

  // ── Load from Supabase ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    loadExams()
  }, [user])

  async function loadExams() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('saved_items')
        .select('id, title, data, created_at')
        .eq('user_id', user.id)
        .eq('type', 'exam_countdown')
        .order('data->date', { ascending: true })
      setExams((data||[]).map(d => ({ id:d.id, ...d.data })).filter(e => daysUntil(e.date) > -1))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function addExam() {
    if (!form.name.trim()) { setFormErr('Give your exam a name.'); return }
    if (!form.date)        { setFormErr('Pick an exam date.'); return }
    if (daysUntil(form.date) < 0) { setFormErr("That date is in the past."); return }
    setSaving(true); setFormErr('')
    try {
      await supabase.from('saved_items').insert({
        user_id: user.id,
        type:    'exam_countdown',
        title:   form.name,
        data:    { name:form.name, date:form.date, topics:form.topics, notes:form.notes },
      })
      setForm({ name:'', date:'', topics:'', notes:'' })
      setAdding(false)
      await loadExams()
    } catch(e) { setFormErr('Failed to save. Please try again.') }
    finally { setSaving(false) }
  }

  async function deleteExam(id) {
    await supabase.from('saved_items').delete().eq('id', id).eq('user_id', user.id)
    setExams(prev => prev.filter(e => e.id !== id))
  }

  // sort: soonest first
  const sorted = [...exams].sort((a,b) => new Date(a.date) - new Date(b.date))
  const nextExam = sorted[0]

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding:'28px 24px 56px', maxWidth:780, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Header */}
      <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:20, padding:'5px 13px', fontSize:10, fontWeight:800, color:'#a5b4fc', marginBottom:16, letterSpacing:'.08em', textTransform:'uppercase' }}>
        {ICONS.cal}
        Exam Countdown
      </div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, gap:16 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-.03em', marginBottom:5, color:'var(--c-t1)', lineHeight:1.15 }}>Your exam schedule</h1>
          <p style={{ fontSize:13, color:'var(--c-t2)', lineHeight:1.65, maxWidth:480 }}>Track upcoming exams and get a daily study plan so you're never cramming the night before.</p>
        </div>
        <button
          onClick={()=>{ setAdding(a=>!a); setFormErr('') }}
          style={{ height:38, padding:'0 18px', borderRadius:10, border:'1px solid rgba(99,102,241,0.35)', background:'rgba(99,102,241,0.1)', color:'#a5b4fc', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
          {ICONS.add}
          Add exam
        </button>
      </div>

      {/* Add exam form */}
      {adding && (
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:14, padding:20, marginBottom:24 }}>
          <div style={{ fontSize:13, fontWeight:800, color:'var(--c-t1)', marginBottom:16, letterSpacing:'-.01em' }}>Add a new exam</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'.05em', display:'block', marginBottom:5 }}>Exam name *</label>
              <input
                value={form.name}
                onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                placeholder="e.g. AP Chemistry Final"
                style={{ width:'100%', height:36, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'0 12px', fontSize:13, color:'#e2e8f0', outline:'none', fontFamily:'inherit' }}
              />
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'.05em', display:'block', marginBottom:5 }}>Exam date *</label>
              <input
                type="date"
                value={form.date}
                onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                style={{ width:'100%', height:36, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'0 12px', fontSize:13, color:'#e2e8f0', outline:'none', fontFamily:'inherit', colorScheme:'dark' }}
              />
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'.05em', display:'block', marginBottom:5 }}>Topics to cover</label>
            <input
              value={form.topics}
              onChange={e=>setForm(f=>({...f,topics:e.target.value}))}
              placeholder="e.g. Thermodynamics, Equilibrium, Acids & Bases  (comma separated)"
              style={{ width:'100%', height:36, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'0 12px', fontSize:13, color:'#e2e8f0', outline:'none', fontFamily:'inherit' }}
            />
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.2)', marginTop:4 }}>Separate topics with commas — Flashfo will rotate through them in your daily plan</div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'.05em', display:'block', marginBottom:5 }}>Notes (optional)</label>
            <input
              value={form.notes}
              onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
              placeholder="e.g. 40% MCQ, 60% free response"
              style={{ width:'100%', height:36, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'0 12px', fontSize:13, color:'#e2e8f0', outline:'none', fontFamily:'inherit' }}
            />
          </div>
          {formErr && <div style={{ fontSize:12, color:'#f87171', marginBottom:10 }}>{formErr}</div>}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={addExam} disabled={saving} style={{ height:36, padding:'0 20px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:saving?.6:1 }}>
              {saving ? 'Saving…' : 'Add exam →'}
            </button>
            <button onClick={()=>{ setAdding(false); setFormErr('') }} style={{ height:36, padding:'0 14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'rgba(255,255,255,0.4)', borderRadius:9, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--c-t3)' }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#a5b4fc', animation:'nova-pulse .9s ease-in-out infinite', margin:'0 auto 12px' }}/>
          Loading your exams…
        </div>
      )}

      {/* Empty state */}
      {!loading && exams.length === 0 && !adding && (
        <div style={{ textAlign:'center', padding:'48px 24px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'rgba(99,102,241,0.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', color:'#a5b4fc' }}>
            {ICONS.cal}
          </div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--c-t1)', marginBottom:6 }}>No exams added yet</div>
          <div style={{ fontSize:13, color:'var(--c-t2)', marginBottom:20, lineHeight:1.6 }}>Add your first exam and get a day-by-day study plan that makes sure you're ready.</div>
          <button onClick={()=>setAdding(true)} style={{ height:36, padding:'0 20px', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.3)', color:'#a5b4fc', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            Add your first exam
          </button>
        </div>
      )}

      {/* Exam list */}
      {!loading && sorted.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {sorted.map((exam, idx) => {
            const days  = daysUntil(exam.date)
            const u     = urgencyStyle(days)
            const plan  = getDailyPlan(exam, days)
            const isNext = idx === 0
            const topics = (exam.topics||'').split(',').map(t=>t.trim()).filter(Boolean)

            return (
              <div key={exam.id||idx} style={{ background: isNext ? u.bg : 'rgba(255,255,255,0.03)', border:`1px solid ${isNext ? u.border : 'rgba(255,255,255,0.08)'}`, borderRadius:14, padding:'20px 22px', position:'relative' }}>

                {/* Top row */}
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:14 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                      <h3 style={{ fontSize:16, fontWeight:800, color:'var(--c-t1)', margin:0, letterSpacing:'-.02em' }}>{exam.name}</h3>
                      <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:20, background:u.bg, border:`1px solid ${u.border}`, color:u.color, textTransform:'uppercase', letterSpacing:'.06em' }}>{u.label}</span>
                      {isNext && <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)' }}>Next up</span>}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ color:'rgba(255,255,255,0.3)', display:'flex' }}>{ICONS.cal}</span>
                      <span style={{ fontSize:12, color:'var(--c-t2)' }}>{formatDate(exam.date)}</span>
                    </div>
                  </div>

                  {/* Countdown */}
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:32, fontWeight:900, color:u.color, lineHeight:1, letterSpacing:'-.04em' }}>{days}</div>
                    <div style={{ fontSize:11, color:'var(--c-t3)', fontWeight:600 }}>day{days!==1?'s':''} left</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height:3, background:'rgba(255,255,255,0.07)', borderRadius:2, overflow:'hidden', marginBottom:14 }}>
                  <div style={{ height:'100%', width:`${Math.max(2, Math.min(100, 100 - (days/60)*100))}%`, background:u.color, borderRadius:2, transition:'width .5s ease' }}/>
                </div>

                {/* Topics */}
                {topics.length > 0 && (
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                    {topics.map((t,i) => (
                      <span key={i} style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'rgba(255,255,255,0.45)' }}>{t}</span>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {exam.notes && (
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginBottom:14, lineHeight:1.5 }}>{exam.notes}</div>
                )}

                {/* Daily plan */}
                {plan && days > 0 && (
                  <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:30, height:30, borderRadius:8, background:u.bg, border:`1px solid ${u.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:u.color }}>
                      {ICONS[plan.icon]}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:2 }}>Today's focus</div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--c-t1)' }}>{plan.topic}</div>
                    </div>
                    <a href={plan.href} style={{ textDecoration:'none', height:32, padding:'0 14px', borderRadius:8, border:`1px solid ${u.border}`, background:u.bg, color:u.color, fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6, flexShrink:0, whiteSpace:'nowrap' }}>
                      {plan.cta} →
                    </a>
                  </div>
                )}

                {/* Exam day message */}
                {days === 0 && (
                  <div style={{ background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ color:'#a5b4fc' }}>{ICONS.check}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:'#a5b4fc' }}>Exam day — good luck! You've got this.</span>
                  </div>
                )}

                {/* Delete */}
                <button
                  onClick={()=>deleteExam(exam.id)}
                  style={{ position:'absolute', top:16, right:16, width:28, height:28, borderRadius:7, border:'none', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.25)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}
                  title="Remove exam">
                  {ICONS.trash}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
