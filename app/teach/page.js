'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join('')
}

export default function TeachPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [classrooms, setClassrooms] = useState([])
  const [fetching, setFetching]     = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]             = useState({ name:'', subject:'' })
  const [creating, setCreating]     = useState(false)
  const [copied, setCopied]         = useState(null)
  const [err, setErr]               = useState('')

  useEffect(()=>{
    if (!authLoading) { if (user) load(); else setFetching(false) }
  },[user,authLoading])

  async function load() {
    setFetching(true)
    const { data } = await supabase.from('classrooms').select('*').eq('teacher_id',user.id).order('created_at',{ascending:false})
    setClassrooms(data||[])
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
                  {cls.subject&&<p className="text-[12px] text-t3 mt-0.5">{cls.subject}</p>}
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
