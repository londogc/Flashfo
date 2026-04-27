'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { getUserItems } from '@/lib/savedItems'
import { useRouter } from 'next/navigation'

export default function HomeworkPage({ params }) {
  const { code } = params
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [classroom, setClassroom] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [savedQuizzes, setSavedQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title:'', dueDate:'', quizId:'' })
  const [creating, setCreating] = useState(false)
  const [submissions, setSubmissions] = useState({}) // { assignmentId: [{name, score, total}] }

  useEffect(()=>{ if(!authLoading&&user) init() },[authLoading,user])

  async function init() {
    const { data: cls } = await supabase.from('classrooms').select('*').eq('code',code).single()
    if (!cls) { setLoading(false); return }
    setClassroom(cls)
    const { data: asgn } = await supabase.from('homework_assignments').select('*').eq('classroom_id',cls.id).order('due_date',{ascending:true})
    setAssignments(asgn||[])
    // Load submission counts
    for (const a of (asgn||[])) {
      const { data: subs } = await supabase.from('homework_submissions').select('student_name,score,total').eq('assignment_id',a.id)
      setSubmissions(s=>({...s,[a.id]:subs||[]}))
    }
    const items = await getUserItems(user.id,'quiz').catch(()=>[])
    setSavedQuizzes(items)
    setLoading(false)
  }

  async function createAssignment() {
    if (!form.title||!form.dueDate||!form.quizId) return
    setCreating(true)
    const quiz = savedQuizzes.find(q=>q.id===form.quizId)
    const { data, error } = await supabase.from('homework_assignments').insert({
      classroom_id: classroom.id,
      title: form.title,
      due_date: form.dueDate,
      quiz_data: quiz?.data || {},
      status: 'open'
    }).select().single()
    if (!error) { setAssignments(a=>[...a,data]); setShowCreate(false); setForm({title:'',dueDate:'',quizId:''}) }
    setCreating(false)
  }

  async function toggleStatus(id, current) {
    const next = current==='open'?'closed':'open'
    await supabase.from('homework_assignments').update({status:next}).eq('id',id)
    setAssignments(a=>a.map(x=>x.id===id?{...x,status:next}:x))
  }

  async function deleteAssignment(id) {
    if (!confirm('Delete this assignment?')) return
    await supabase.from('homework_assignments').delete().eq('id',id)
    setAssignments(a=>a.filter(x=>x.id!==id))
  }

  function daysUntil(dateStr) {
    const diff = new Date(dateStr) - new Date()
    const days = Math.ceil(diff/(1000*60*60*24))
    if (days < 0) return 'Past due'
    if (days === 0) return 'Due today'
    return 'Due in '+days+' day'+(days!==1?'s':'')
  }

  if (loading) return <div className="p-6 flex items-center justify-center min-h-64"><span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="bg-surface border border-line rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-base font-bold text-t1 mb-5">New Homework Assignment</h2>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[11px] font-bold text-t3 uppercase tracking-wider mb-1">Title</label>
                <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Chapter 5 Review Quiz"
                  className="w-full h-9 bg-surface2 border border-line rounded-lg px-3 text-sm text-t1 outline-none focus:border-blue-400"/>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-t3 uppercase tracking-wider mb-1">Due Date</label>
                <input type="datetime-local" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}
                  className="w-full h-9 bg-surface2 border border-line rounded-lg px-3 text-sm text-t1 outline-none focus:border-blue-400"/>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-t3 uppercase tracking-wider mb-1">Quiz</label>
                <select value={form.quizId} onChange={e=>setForm(f=>({...f,quizId:e.target.value}))}
                  className="w-full h-9 bg-surface2 border border-line rounded-lg px-3 text-sm text-t1 outline-none focus:border-blue-400">
                  <option value="">Select a saved quiz...</option>
                  {savedQuizzes.map(q=><option key={q.id} value={q.id}>{q.title} ({q.data?.questions?.length||0} questions)</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={createAssignment} disabled={creating||!form.title||!form.dueDate||!form.quizId}
                className="flex-1 h-9 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40">{creating?'Creating...':'Assign'}</button>
              <button onClick={()=>setShowCreate(false)} className="h-9 px-4 bg-surface border border-line text-t2 text-sm rounded-xl hover:bg-surface2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <a href={'/teach/'+code} className="text-[12px] text-blue-500 hover:underline block mb-1">← Back to Live</a>
          <h1 className="text-2xl font-bold text-t1">Homework</h1>
          <p className="text-sm text-t2 mt-0.5">{classroom?.name} · Async assignments</p>
        </div>
        <button onClick={()=>setShowCreate(true)} className="h-9 px-4 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 flex items-center gap-1.5">
          + New Assignment
        </button>
      </div>

      {assignments.length===0 ? (
        <div className="border-2 border-dashed border-line rounded-2xl p-14 text-center">
          <div className="text-4xl mb-3">📚</div>
          <p className="text-t1 font-semibold mb-1">No assignments yet</p>
          <p className="text-sm text-t2 mb-5">Create a homework assignment from any saved quiz. Students join with the class code at flashfo.org/join.</p>
          <button onClick={()=>setShowCreate(true)} className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800">Create Assignment</button>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map(a=>{
            const subs = submissions[a.id]||[]
            const avg = subs.length>0 ? Math.round(subs.reduce((acc,s)=>acc+(s.total>0?s.score/s.total*100:0),0)/subs.length) : null
            const isPast = new Date(a.due_date) < new Date()
            return (
              <div key={a.id} className="bg-surface border border-line rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-bold text-t1">{a.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${a.status==='open'?'bg-emerald-500/10 text-emerald-500':'bg-surface2 text-t3'}`}>{a.status==='open'?'Open':'Closed'}</span>
                      <span className={`text-[11px] ${isPast&&a.status==='open'?'text-red-400':'text-t3'}`}>{daysUntil(a.due_date)}</span>
                      <span className="text-[11px] text-t3">{a.quiz_data?.questions?.length||0} questions</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>toggleStatus(a.id,a.status)} className={`h-7 px-3 text-[11px] font-semibold rounded-lg border transition-colors ${a.status==='open'?'border-amber-300/50 text-amber-500 hover:bg-amber-500/10':'border-emerald-300/50 text-emerald-500 hover:bg-emerald-500/10'}`}>
                      {a.status==='open'?'Close':'Reopen'}
                    </button>
                    <button onClick={()=>deleteAssignment(a.id)} className="h-7 px-2 text-[11px] text-red-400 border border-red-200 dark:border-red-500/30 rounded-lg hover:bg-red-500/10">✕</button>
                  </div>
                </div>
                <div className="flex items-center gap-6 p-3 bg-surface2 rounded-xl">
                  <div className="text-center"><div className="text-xl font-black text-t1">{subs.length}</div><div className="text-[10px] text-t3">Submitted</div></div>
                  <div className="text-center"><div className="text-xl font-black text-blue-600">{avg!==null?avg+'%':'—'}</div><div className="text-[10px] text-t3">Avg Score</div></div>
                  <div className="flex-1">
                    {subs.slice(0,5).map(s=>(
                      <div key={s.student_name} className="flex items-center justify-between text-[12px] mb-0.5">
                        <span className="text-t2">{s.student_name}</span>
                        <span className="font-semibold text-t1">{s.total>0?Math.round(s.score/s.total*100)+'%':'SA'}</span>
                      </div>
                    ))}
                    {subs.length>5&&<div className="text-[11px] text-t3">+{subs.length-5} more</div>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
