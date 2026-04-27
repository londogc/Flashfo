'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const d = Math.floor(diff/86400000), h = Math.floor(diff/3600000), m = Math.floor(diff/60000)
  return d>0?d+'d ago':h>0?h+'h ago':m>0?m+'m ago':'just now'
}

export default function GradebookPage({ params }) {
  const { code } = params
  const { user, loading: authLoading } = useAuth()
  const [classroom, setClassroom] = useState(null)
  const [sessions, setSessions]   = useState([])
  const [expanded, setExpanded]   = useState(null)
  const [sessionData, setSessionData] = useState({})   // { [sessionId]: [{name, score, total}] }
  const [loading, setLoading]     = useState(true)

  useEffect(()=>{ if(!authLoading&&user) init() },[authLoading,user])

  async function init() {
    const { data: cls } = await supabase.from('classrooms').select('*').eq('code',code).single()
    if (!cls) { setLoading(false); return }
    setClassroom(cls)
    const { data: sess } = await supabase.from('classroom_sessions').select('*')
      .eq('classroom_id',cls.id).order('created_at',{ascending:false})
    setSessions(sess||[])
    setLoading(false)
  }

  async function loadSession(sessionId) {
    if (sessionData[sessionId]) { setExpanded(expanded===sessionId?null:sessionId); return }
    const { data: rows } = await supabase.from('session_responses').select('*').eq('session_id',sessionId)
    const scores = {}
    ;(rows||[]).forEach(r=>{
      if(!scores[r.student_name]) scores[r.student_name]={score:0,total:0}
      if(r.is_correct===true) scores[r.student_name].score++
      if(r.is_correct!==null) scores[r.student_name].total++
    })
    const list = Object.entries(scores).map(([name,{score,total}])=>({name,score,total,pct:total>0?Math.round(score/total*100):null}))
      .sort((a,b)=>(b.pct||0)-(a.pct||0))
    setSessionData(d=>({...d,[sessionId]:list}))
    setExpanded(sessionId)
  }

  async function deleteSession(id) {
    if (!confirm('Delete this session and all its responses?')) return
    await supabase.from('classroom_sessions').delete().eq('id',id)
    setSessions(s=>s.filter(x=>x.id!==id))
    if (expanded===id) setExpanded(null)
  }

  if (loading) return <div className="p-6 flex items-center justify-center"><span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
  if (!classroom) return <div className="p-6"><p className="text-t2">Classroom not found.</p></div>

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <a href={'/teach/'+code} className="text-[12px] text-blue-500 hover:underline">← Back to Classroom</a>
        <h1 className="text-2xl font-bold text-t1 mt-1">{classroom.name} — Grade Book</h1>
        <p className="text-sm text-t2">{sessions.length} session{sessions.length!==1?'s':''} total</p>
      </div>

      {sessions.length===0 && (
        <div className="text-center py-12 bg-surface border border-line rounded-xl">
          <p className="text-t2 text-sm">No sessions yet. Go live to start collecting grades.</p>
        </div>
      )}

      <div className="space-y-3">
        {sessions.map(sess=>{
          const qs = sess.quiz_data?.questions||[]
          const isHomework = !!sess.quiz_data?.homework
          const isOpen = expanded===sess.id
          const data = sessionData[sess.id]||[]
          const avgPct = data.length>0 ? Math.round(data.filter(s=>s.pct!==null).reduce((a,s)=>a+s.pct,0)/data.filter(s=>s.pct!==null).length) : null
          return (
            <div key={sess.id} className="bg-surface border border-line rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-surface2 transition-colors" onClick={()=>loadSession(sess.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-t1 truncate">{sess.title}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isHomework?'bg-amber-500/10 text-amber-500':sess.status==='closed'?'bg-surface2 text-t3':'bg-emerald-500/10 text-emerald-500'}`}>
                      {isHomework?'📋 Homework':sess.status==='closed'?'Closed':'Active'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-t3">
                    <span>{timeAgo(sess.created_at)}</span>
                    <span>·</span>
                    <span>{qs.length} questions</span>
                    {isHomework&&sess.quiz_data?.due_date&&<><span>·</span><span>Due {new Date(sess.quiz_data.due_date).toLocaleDateString()}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {data.length>0&&<div className="text-center">
                    <div className="text-lg font-black text-blue-600">{data.length}</div>
                    <div className="text-[10px] text-t3">submitted</div>
                  </div>}
                  {avgPct!==null&&<div className="text-center">
                    <div className={`text-lg font-black ${avgPct>=70?'text-emerald-600':avgPct>=50?'text-amber-500':'text-red-500'}`}>{avgPct}%</div>
                    <div className="text-[10px] text-t3">avg</div>
                  </div>}
                  <button onClick={e=>{e.stopPropagation();deleteSession(sess.id)}} className="text-red-400 hover:text-red-600 text-sm px-2 h-7 border border-red-200 dark:border-red-500/30 rounded-lg">✕</button>
                  <span className="text-t3 text-sm">{isOpen?'▲':'▼'}</span>
                </div>
              </div>
              {isOpen&&(
                <div className="border-t border-line p-4">
                  {data.length===0 ? <p className="text-sm text-t3 text-center py-4">No submissions for this session.</p> : (
                    <table className="w-full">
                      <thead><tr className="text-left">
                        <th className="text-[11px] font-bold text-t3 uppercase pb-2">Student</th>
                        <th className="text-[11px] font-bold text-t3 uppercase pb-2">Score</th>
                        <th className="text-[11px] font-bold text-t3 uppercase pb-2">Grade</th>
                      </tr></thead>
                      <tbody className="divide-y divide-line">
                        {data.map(s=>(
                          <tr key={s.name}>
                            <td className="py-2 text-sm font-medium text-t1">{s.name}</td>
                            <td className="py-2 text-sm text-t2">{s.pct!==null?`${s.score}/${s.total}`:'Short answer'}</td>
                            <td className="py-2">
                              <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${s.pct===null?'bg-surface2 text-t3':s.pct>=90?'bg-emerald-500/10 text-emerald-600':s.pct>=70?'bg-blue-500/10 text-blue-600':s.pct>=60?'bg-amber-500/10 text-amber-600':'bg-red-500/10 text-red-600'}`}>
                                {s.pct===null?'Pending':s.pct+'%'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
