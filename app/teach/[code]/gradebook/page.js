'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { printContent } from '@/lib/exportPdf'

export default function GradeBookPage({ params }) {
  const { code } = params
  const { user, loading: authLoading } = useAuth()
  const [classroom, setClassroom] = useState(null)
  const [sessions, setSessions] = useState([])
  const [allResponses, setAllResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('overview') // 'overview' | 'students' | 'sessions'

  useEffect(()=>{ if(!authLoading&&user) init() },[authLoading,user])

  async function init() {
    const { data: cls } = await supabase.from('classrooms').select('*').eq('code',code).single()
    if (!cls) { setLoading(false); return }
    setClassroom(cls)
    const { data: sess } = await supabase.from('classroom_sessions').select('*').eq('classroom_id',cls.id).eq('status','closed').order('created_at',{ascending:false})
    setSessions(sess||[])
    if (sess?.length) {
      const ids = sess.map(s=>s.id)
      const { data: resp } = await supabase.from('session_responses').select('*').in('session_id',ids)
      setAllResponses(resp||[])
    }
    setLoading(false)
  }

  // Build student × session score matrix
  const studentScores = {}
  allResponses.forEach(r=>{
    if (!studentScores[r.student_name]) studentScores[r.student_name] = {}
    const sess = sessions.find(s=>s.id===r.session_id)
    if (!sess) return
    if (!studentScores[r.student_name][r.session_id]) studentScores[r.student_name][r.session_id] = {score:0,total:0}
    if (r.is_correct===true) studentScores[r.student_name][r.session_id].score++
    if (r.is_correct!==null) studentScores[r.student_name][r.session_id].total++
  })
  const students = Object.keys(studentScores).sort()

  function studentAvg(name) {
    const scores = Object.values(studentScores[name]||{})
    if (!scores.length) return null
    const total = scores.reduce((a,s)=>a+(s.total>0?s.score/s.total*100:0),0)
    return Math.round(total/scores.length)
  }

  function sessionAvg(sessionId) {
    const relevant = allResponses.filter(r=>r.session_id===sessionId&&r.is_correct!==null)
    if (!relevant.length) return null
    const byStudent = {}
    relevant.forEach(r=>{ if(!byStudent[r.student_name])byStudent[r.student_name]={score:0,total:0}; if(r.is_correct)byStudent[r.student_name].score++; byStudent[r.student_name].total++ })
    const vals = Object.values(byStudent)
    return Math.round(vals.reduce((a,v)=>a+(v.total>0?v.score/v.total*100:0),0)/vals.length)
  }

  function gradeColor(pct) {
    if (pct===null) return 'text-t3'
    if (pct>=90) return 'text-emerald-600'
    if (pct>=70) return 'text-blue-600'
    if (pct>=60) return 'text-amber-600'
    return 'text-red-500'
  }

  function printGradeBook() {
    const rows = students.map(name=>{
      const sessData = sessions.map(s=>{
        const sc = studentScores[name]?.[s.id]
        return sc ? (sc.total>0?Math.round(sc.score/sc.total*100)+'%':'SA') : '—'
      }).join('</td><td style="padding:6px 10px;border:1px solid #e5e7eb">')
      const avg = studentAvg(name)
      return `<tr><td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:600">${name}</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${rows}</td><td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:700;color:${avg>=90?'#059669':avg>=70?'#2563eb':avg>=60?'#d97706':'#dc2626'}">${avg!==null?avg+'%':'—'}</td></tr>`
    }).join('')
    const headers = ['Student',...sessions.map(s=>s.title.substring(0,20)),'Avg'].map(h=>`<th style="padding:8px 10px;background:#f9fafb;border:1px solid #e5e7eb;text-align:left;font-size:11px">${h}</th>`).join('')
    printContent(classroom.name+' — Grade Book', `<h1>${classroom.name}</h1><div class="meta">Grade Book · ${students.length} students · ${sessions.length} sessions</div><div style="overflow-x:auto;margin-top:16px"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`)
  }

  if (loading) return <div className="p-6 flex items-center justify-center min-h-64"><span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <a href={'/teach/'+code} className="text-[12px] text-blue-500 hover:underline block mb-1">← Back to Live</a>
          <h1 className="text-2xl font-bold text-t1">Grade Book</h1>
          <p className="text-sm text-t2 mt-0.5">{classroom?.name} · {students.length} students · {sessions.length} sessions</p>
        </div>
        <button onClick={printGradeBook} className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl hover:bg-surface2 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6V2h8v4M4 11H2V6h12v5h-2M4 9h8v5H4V9z"/></svg>Print Grade Book
        </button>
      </div>

      {sessions.length===0 ? (
        <div className="border-2 border-dashed border-line rounded-2xl p-14 text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-t1 font-semibold mb-1">No closed sessions yet</p>
          <p className="text-sm text-t2">Grades appear here after you close a live session.</p>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left px-5 py-3 font-bold text-t1 bg-surface2 sticky left-0 min-w-36">Student</th>
                  {sessions.map(s=>(
                    <th key={s.id} className="text-center px-4 py-3 font-semibold text-t3 text-[11px] uppercase bg-surface2 min-w-28 whitespace-nowrap">{s.title.substring(0,18)}</th>
                  ))}
                  <th className="text-center px-4 py-3 font-bold text-t1 bg-surface2 min-w-20">Avg</th>
                </tr>
                <tr className="border-b-2 border-line">
                  <td className="px-5 py-2 text-[11px] text-t3 bg-surface sticky left-0">Class avg</td>
                  {sessions.map(s=>{ const avg=sessionAvg(s.id); return <td key={s.id} className={`text-center px-4 py-2 text-[12px] font-bold ${gradeColor(avg)}`}>{avg!==null?avg+'%':'—'}</td> })}
                  <td className="text-center px-4 py-2"></td>
                </tr>
              </thead>
              <tbody>
                {students.map((name,idx)=>{
                  const avg = studentAvg(name)
                  return (
                    <tr key={name} className={'border-b border-line '+(idx%2===0?'bg-surface':'bg-surface2/50')}>
                      <td className="px-5 py-3 font-semibold text-t1 sticky left-0 bg-inherit">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-bold flex items-center justify-center">{name.charAt(0).toUpperCase()}</span>
                          {name}
                        </div>
                      </td>
                      {sessions.map(s=>{
                        const sc = studentScores[name]?.[s.id]
                        const pct = sc?.total>0 ? Math.round(sc.score/sc.total*100) : null
                        return <td key={s.id} className={`text-center px-4 py-3 text-[13px] font-semibold ${gradeColor(pct)}`}>{sc?pct!==null?pct+'%':'SA':'—'}</td>
                      })}
                      <td className={`text-center px-4 py-3 font-black text-base ${gradeColor(avg)}`}>{avg!==null?avg+'%':'—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
