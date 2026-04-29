'use client'
import React from 'react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join('')
}

const LAUNCH_STEPS = [
  { id:'classroom', label:'Create a classroom', desc:'Set up your first class and get a join code for students.', href:'/teach/new', cta:'Create classroom' },
  { id:'invite', label:'Invite students', desc:'Share your class code or a direct join link with your students.', href:null, cta:'Copy link' },
  { id:'curriculum', label:'Connect curriculum', desc:'Link a subject or standard so Nova can tailor content.', href:'/teach/curriculum', cta:'Connect now' },
  { id:'quiz', label:'Launch your first quiz', desc:'Run a live quiz session with your class in real time.', href:'/teach/quiz', cta:'Start quiz' },
  { id:'results', label:'Share results', desc:'Review class performance and share a summary with students.', href:'/teach/results', cta:'View results' },
]


export default function TeachPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [classrooms, setClassrooms] = useState([])
  const [enrollments, setEnrollments] = useState({})
  const [fetching, setFetching]     = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]             = useState({ name:'', subject:'' })
  const [creating, setCreating]     = useState(false)
  const [checklistDone, setChecklistDone] = useState(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse((typeof window!=='undefined'&&localStorage).getItem('ff-launch-checklist') || '{}') } catch { return {} }
  })
  const [checklistCollapsed, setChecklistCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return (typeof window!=='undefined'&&localStorage).getItem('ff-checklist-done') === '1'
  })
  const allDone = LAUNCH_STEPS.every(s => checklistDone[s.id])
  const markDone = (id) => {
    const next = {...checklistDone, [id]: true}
    setChecklistDone(next)
    if (typeof window !== 'undefined') {
      ;(typeof window!=='undefined'&&localStorage).setItem('ff-launch-checklist', JSON.stringify(next))
      if (LAUNCH_STEPS.every(s => next[s.id])) (typeof window!=='undefined'&&localStorage).setItem('ff-checklist-done', '1')
    }
  }

  const [checklistDone, setChecklistDone] = React.useState(false)
  const [checklistSkipped, setChecklistSkipped] = React.useState(() => {
    try { return localStorage.getItem('ff-checklist-skipped') === '1' } catch(e) { return false }
  })
  const [checks, setChecks] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('ff-checklist') || '[false,false,false,false,false]') } catch(e) { return [false,false,false,false,false] }
  })
  function setCheck(i) {
    const next = checks.map((v,j) => j===i ? true : v)
    setChecks(next)
    try { localStorage.setItem('ff-checklist', JSON.stringify(next)) } catch(e) {}
    if (next.every(Boolean)) setChecklistDone(true)
  }
  function skipChecklist() {
    setChecklistSkipped(true)
    try { localStorage.setItem('ff-checklist-skipped','1') } catch(e) {}
  }
  const [copied, setCopied]         = useState(null)
  const [err, setErr]               = useState('')

  useEffect(()=>{
    if (!authLoading) { if (user) load(); else setFetching(false) }
  },[user,authLoading])

  async function load() {
    setFetching(true)
    const { data } = await supabase.from('classrooms').select('*').eq('teacher_id',user.id).order('created_at',{ascending:false})
    setClassrooms(data||[])
    if (data?.length) {
      const { data: enroll } = await supabase.from('student_enrollments').select('classroom_id').in('classroom_id', data.map(c=>c.id))
      const counts = {}
      ;(enroll||[]).forEach(e=>{ counts[e.classroom_id] = (counts[e.classroom_id]||0)+1 })
      setEnrollments(counts)
    }
    setFetching(false)
  }

  async function create() {
    if (!form.name.trim()) return
    setCreating(true); setErr('')
    try {
      const code = genCode()
      const { data, error } = await supabase.from('classrooms').insert({ teacher_id:user.id, name:form.name.trim(), subject:form.subject.trim(), code }).select().single()
      if (error) throw error
      setClassrooms(c=>[data,...c]); setShowCreate(false); setForm({name:'',subject:''})
    } catch(e){ setErr(e.message) } finally { setCreating(false) }
  }

  async function del(id) {
    if (!confirm('Delete this classroom and all its sessions?')) return
    await supabase.from('classrooms').delete().eq('id',id)
    setClassrooms(c=>c.filter(x=>x.id!==id))
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(()=>setCopied(null), 2000)
  }

  if (!authLoading && !user) return (
    <div className="p-6 max-w-4xl mx-auto text-center py-20">
      <div className="text-5xl mb-4">🏫</div>
      <h1 className="text-2xl font-bold text-t1 mb-2">Live Classrooms</h1>
      <p className="text-t2 text-sm mb-6">Sign in to create and manage your classrooms.</p>
      <a href="/auth" className="inline-flex h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl items-center">Sign in →</a>
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      {/* ── Teacher Launch Checklist ── */}
      {!checklistCollapsed && (
        <div style={{ background:'rgba(37,99,235,0.06)', border:'1px solid rgba(37,99,235,0.2)', borderRadius:14, padding:'20px 24px', marginBottom:28 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div>
              <p style={{ margin:0, fontWeight:700, fontSize:16, color:'#e6edf3' }}>🚀 Get your class ready</p>
              <p style={{ margin:0, fontSize:13, color:'#8b949e', marginTop:4 }}>{LAUNCH_STEPS.filter(s=>checklistDone[s.id]).length} of {LAUNCH_STEPS.length} steps complete</p>
            </div>
            <button onClick={() => setChecklistCollapsed(true)} style={{ background:'transparent', border:'none', color:'#484f58', fontSize:12, cursor:'pointer', padding:'4px 8px' }}>Skip for now</button>
          </div>
          {/* Progress bar */}
          <div style={{ height:4, background:'#21262d', borderRadius:4, marginBottom:20, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'#2563eb', borderRadius:4, width:(LAUNCH_STEPS.filter(s=>checklistDone[s.id]).length/LAUNCH_STEPS.length*100)+'%', transition:'width 0.4s' }}/>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {LAUNCH_STEPS.map((step, i) => {
              const done = !!checklistDone[step.id]
              return (
                <div key={step.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background: done ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.03)', borderRadius:10, border:'1px solid '+(done?'rgba(52,211,153,0.2)':'rgba(255,255,255,0.06)') }}>
                  <button onClick={() => markDone(step.id)} style={{ width:22, height:22, borderRadius:'50%', border:'2px solid '+(done?'#34d399':'#30363d'), background: done?'#34d399':'transparent', color:'#fff', fontSize:12, cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>{done?'✓':i+1}</button>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:0, fontSize:14, fontWeight:done?400:500, color:done?'#8b949e':'#e6edf3', textDecoration:done?'line-through':'none' }}>{step.label}</p>
                    {!done && <p style={{ margin:0, fontSize:12, color:'#484f58', marginTop:2 }}>{step.desc}</p>}
                  </div>
                  {!done && step.href && (
                    <a href={step.href} style={{ fontSize:12, color:'#2563eb', textDecoration:'none', fontWeight:500, whiteSpace:'nowrap' }}>{step.cta} →</a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
      {checklistCollapsed && !allDone && (
        <button onClick={() => setChecklistCollapsed(false)} style={{ background:'rgba(37,99,235,0.08)', border:'1px solid rgba(37,99,235,0.2)', borderRadius:8, padding:'8px 14px', fontSize:13, color:'#2563eb', cursor:'pointer', marginBottom:20, display:'block' }}>
          📋 {LAUNCH_STEPS.filter(s=>checklistDone[s.id]).length}/{LAUNCH_STEPS.length} setup steps — continue →
        </button>
      )}
      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="bg-surface border border-line rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4">
            <h2 className="text-lg font-bold text-t1 mb-5">New Classroom</h2>
            <div className="space-y-3 mb-5">
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Classroom name (e.g. Period 3 Biology)"
                onKeyDown={e=>e.key==='Enter'&&create()}
                className="w-full h-10 bg-surface2 border border-line rounded-xl px-3 text-sm text-t1 outline-none focus:border-blue-400 placeholder:text-t3"/>
              <input value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} placeholder="Subject (optional)"
                className="w-full h-10 bg-surface2 border border-line rounded-xl px-3 text-sm text-t1 outline-none focus:border-blue-400 placeholder:text-t3"/>
            </div>
            {err && <p className="text-red-500 text-sm mb-3">{err}</p>}
            <div className="flex gap-2">
              <button onClick={create} disabled={creating||!form.name.trim()}
                className="flex-1 h-9 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40">{creating?'Creating...':'Create Classroom'}</button>
              <button onClick={()=>setShowCreate(false)} className="h-9 px-4 bg-surface border border-line text-t2 text-sm rounded-xl hover:bg-surface2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Teach</h1>
          <p className="text-sm text-t2">Host live quizzes, share class codes, and track student progress.</p>
        </div>
        {user && <button onClick={()=>setShowCreate(true)} className="h-9 px-4 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 flex items-center gap-1.5 flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2v12M2 8h12"/></svg>New Classroom
        </button>}
      </div>


      {/* Teacher launch checklist */}
      {!checklistSkipped && !checklistDone && (
        <div style={{ background:'rgba(37,99,235,0.05)', border:'1px solid rgba(37,99,235,0.2)', borderRadius:16, padding:'18px 20px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--c-t1)', marginBottom:2 }}>🚀 Launch checklist</div>
              <div style={{ fontSize:11, color:'var(--c-t3)' }}>{checks.filter(Boolean).length} of 5 complete</div>
            </div>
            <button onClick={skipChecklist} style={{ fontSize:11, color:'var(--c-t3)', background:'none', border:'none', cursor:'pointer', padding:'4px 8px' }}>Skip for now</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { label:'Create your first classroom', href: null },
              { label:'Invite students with your class code', href: null },
              { label:'Connect curriculum — add subject & grade', href: '/settings' },
              { label:'Launch your first live quiz', href: null },
              { label:'Share results with students', href: null },
            ].map((step, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }} onClick={() => setCheck(i)}>
                <div style={{ width:18, height:18, borderRadius:5, border:'1.5px solid', borderColor: checks[i] ? '#34d399' : 'var(--c-line)', background: checks[i] ? '#34d399' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, transition:'all 0.15s' }}>
                  {checks[i] && <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M2 8l4 4 8-8"/></svg>}
                </div>
                <span style={{ fontSize:12, color: checks[i] ? 'var(--c-t3)' : 'var(--c-t2)', textDecoration: checks[i] ? 'line-through' : 'none' }}>{step.label}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:12, height:3, background:'var(--c-surface2)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:(checks.filter(Boolean).length/5*100)+'%', background:'linear-gradient(90deg,#2563eb,#7c3aed)', borderRadius:2, transition:'width 0.4s ease' }}/>
          </div>
        </div>
      )}
      {checklistDone && !checklistSkipped && (
        <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.25)', borderRadius:12, padding:'10px 16px', marginBottom:16 }}>
          <span style={{ fontSize:16 }}>🎉</span>
          <span style={{ fontSize:13, fontWeight:600, color:'#34d399' }}>Setup complete! You're ready to teach.</span>
          <button onClick={() => setChecklistSkipped(true)} style={{ marginLeft:'auto', fontSize:11, color:'var(--c-t3)', background:'none', border:'none', cursor:'pointer' }}>Dismiss</button>
        </div>
      )}
      {fetching && <div className="space-y-4">{[...Array(2)].map((_,i)=><div key={i} className="h-40 bg-surface border border-line rounded-xl animate-pulse"/>)}</div>}

      {!fetching && classrooms.length===0 && (
        <div className="border-2 border-dashed border-line rounded-2xl p-12 text-center mb-8">
          <div className="text-4xl mb-3">🏫</div>
          <p className="text-t1 font-semibold mb-1">No classrooms yet</p>
          <p className="text-t2 text-sm mb-5">Create your first classroom and share the code with students to go live.</p>
          <button onClick={()=>setShowCreate(true)} className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800">Create Classroom</button>
        </div>
      )}

      <div className="space-y-4 mb-8">
        {classrooms.map(cls=>(
          <div key={cls.id} className="bg-surface border border-line rounded-xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-t1">{cls.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {cls.subject&&<span className="text-[12px] text-t3">{cls.subject}</span>}
                    <span className="text-[11px] text-t3">{enrollments[cls.id]||0} student{(enrollments[cls.id]||0)!==1?'s':''}</span>
                  </div>
                </div>
                <button onClick={()=>del(cls.id)} className="text-t3 hover:text-red-500 text-lg w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">✕</button>
              </div>
              <div className="flex items-center gap-4 p-3 bg-surface2 rounded-xl border border-line mb-4">
                <div>
                  <div className="text-[10px] font-bold text-t3 uppercase tracking-widest mb-0.5">Class Code</div>
                  <div className="text-3xl font-black tracking-widest" style={{color:'var(--c-t1)',letterSpacing:'0.15em'}}>{cls.code}</div>
                </div>
                <div className="ml-auto flex gap-2">
                  <button onClick={()=>copy(cls.code, cls.id+'-code')}
                    className={`h-8 px-3 text-[11px] font-semibold rounded-lg border transition-colors ${copied===cls.id+'-code'?'bg-emerald-500 text-white border-emerald-500':'bg-surface border-line text-t2 hover:border-blue-400'}`}>
                    {copied===cls.id+'-code'?'✓ Copied!':'Copy Code'}</button>
                  <button onClick={()=>copy('https://flashfo.org/join?code='+cls.code, cls.id+'-link')}
                    className={`h-8 px-3 text-[11px] font-semibold rounded-lg border transition-colors ${copied===cls.id+'-link'?'bg-emerald-500 text-white border-emerald-500':'bg-surface border-line text-t2 hover:border-blue-400'}`}>
                    {copied===cls.id+'-link'?'✓ Copied!':'Copy Link'}</button>
                </div>
              </div>
              <button onClick={()=>router.push('/teach/'+cls.code)}
                className="w-full h-10 bg-blue-700 text-white text-sm font-bold rounded-xl hover:bg-blue-800 transition-colors flex items-center justify-center gap-2">
                <span>🚀</span> Go Live
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-bold text-t3 uppercase tracking-wider mb-3">Teacher Tools</h2>
      <div className="grid grid-cols-2 gap-3">
        {[{label:'Lesson Builder',href:'/lesson-builder',e:'📋'},{label:'Quiz Builder',href:'/quiz',e:'❓'},{label:'My Saved Items',href:'/my-stuff',e:'💾'},{label:'Source Library',href:'/source-library',e:'📚'}].map(t=>(
          <a key={t.label} href={t.href} className="bg-surface border border-line rounded-xl p-4 hover:border-blue-300/50 transition-all flex items-center gap-3 group">
            <span className="text-xl">{t.e}</span>
            <span className="text-sm font-semibold text-t1">{t.label}</span>
            <span className="ml-auto text-blue-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </a>
        ))}
      </div>
    </div>
  )
}
