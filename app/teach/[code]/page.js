'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { getUserItems } from '@/lib/savedItems'

export default function TeachSessionPage({ params }) {
  const { code } = params
  const { user, loading: authLoading } = useAuth()
  const [classroom, setClassroom]   = useState(null)
  const [session, setSession]       = useState(null)
  const [submissions, setSubmissions] = useState({})  // { studentName: { score, total, rows } }
  const [loading, setLoading]       = useState(true)
  const [savedQuizzes, setSavedQuizzes] = useState([])
  const [showPicker, setShowPicker] = useState(false)
  const [pickerTab, setPickerTab]   = useState('saved')
  const [genTopic, setGenTopic]     = useState('')
  const [generating, setGenerating] = useState(false)
  const [launching, setLaunching]   = useState(false)
  const [distributing, setDistributing] = useState(false)
  const [sessionError, setSessionError] = useState(null)
  const channelRef = useRef(null)

  useEffect(()=>{
    if (!authLoading && user) init()
  },[authLoading, user, code])

  async function init() {
    const { data: cls } = await supabase.from('classrooms').select('*').eq('code', code).single()
    if (!cls) { setLoading(false); return }
    setClassroom(cls)
    const { data: sess, error: sessErr } = await supabase.from('classroom_sessions').select('*')
      .eq('classroom_id', cls.id).neq('status','closed')
      .order('created_at',{ascending:false}).limit(1).maybeSingle()
    if (sessErr && (sessErr.code === '42501' || (sessErr.message||'').includes('permission'))) {
      setSessionError('Live sessions need a Supabase RLS policy — see error banner for details.')
    }
    if (sess) { setSession(sess); loadSubmissions(sess.id); subscribeToResponses(sess.id) }
    const items = await getUserItems(user.id, 'quiz').catch(()=>[])
    setSavedQuizzes(items)
    setLoading(false)
  }

  async function loadSubmissions(sessionId) {
    const { data } = await supabase.from('session_responses').select('*').eq('session_id', sessionId)
    buildSubmissions(data || [])
  }

  function buildSubmissions(rows) {
    const map = {}
    rows.forEach(r => {
      if (!map[r.student_name]) map[r.student_name] = { rows: [], score: 0, total: 0 }
      map[r.student_name].rows.push(r)
      if (r.is_correct === true) map[r.student_name].score++
      if (r.is_correct !== null) map[r.student_name].total++
    })
    setSubmissions(map)
  }

  function subscribeToResponses(sessionId) {
    if (channelRef.current) channelRef.current.unsubscribe()
    const ch = supabase.channel('teacher-responses-'+sessionId)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'session_responses',filter:'session_id=eq.'+sessionId},
        ()=>{ loadSubmissions(sessionId) })
      .subscribe()
    channelRef.current = ch
  }

  async function launchSession(quizData, isHomework=false, dueDate=null) {
    setLaunching(true)
    setSessionError(null)
    try {
      if (session) await supabase.from('classroom_sessions').update({status:'closed'}).eq('id',session.id)
      const enriched = isHomework ? { ...quizData, homework: true, due_date: dueDate } : quizData
      const { data, error } = await supabase.from('classroom_sessions').insert({
        classroom_id: classroom.id,
        title: quizData.topic || (isHomework?'Homework':'Quiz'),
        quiz_data: enriched,
        status: isHomework ? 'active' : 'waiting',
        current_q: -1
      }).select().single()
      if (error) throw error
      setSession(data); setSubmissions({})
      subscribeToResponses(data.id)
      setShowPicker(false)
    } catch (e) {
      const isRLS = e.code === '42501' || (e.message||'').toLowerCase().includes('permission')
      setSessionError(isRLS
        ? 'Permission denied — the classroom_sessions table needs a Supabase RLS policy for teachers. Run: CREATE POLICY \"Teachers manage sessions\" ON classroom_sessions FOR ALL USING (auth.uid() = teacher_id);'
        : (e.message || 'Failed to launch session'))
    } finally { setLaunching(false) }
  }

  async function generateAndLaunch() {
    if (!genTopic.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/rpc',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({fn:'generateQuizAdvancedFromText',args:[genTopic.trim(),{mcq:5},'English']})})
      const data = await res.json()
      const qs = data.result?.questions||[]
      if (!qs.length) throw new Error('Could not generate quiz')
      await launchSession({topic:genTopic.trim(),questions:qs})
    } catch(e){alert(e.message)} finally{setGenerating(false)}
  }

  async function distribute() {
    setDistributing(true)
    const { data } = await supabase.from('classroom_sessions').update({status:'active'}).eq('id',session.id).select().single()
    setSession(data)
    setDistributing(false)
  }

  async function closeSession() {
    if (!confirm('Close this session? Students will no longer be able to submit.')) return
    const { data } = await supabase.from('classroom_sessions').update({status:'closed'}).eq('id',session.id).select().single()
    setSession(data)
    if (channelRef.current) channelRef.current.unsubscribe()
  }

  async function newSession() {
    setSession(null); setSubmissions({})
    if (channelRef.current) channelRef.current.unsubscribe()
  }

  if (loading) return <div className="p-6 flex items-center justify-center min-h-64"><span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
  if (!classroom) return <div className="p-6"><p className="text-t2 text-sm">Classroom not found.</p></div>

  const qs = session?.quiz_data?.questions||[]
  const submittedNames = Object.keys(submissions)
  const submittedCount = submittedNames.length

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-3">
            <a href="/teach" className="text-[12px] text-blue-500 hover:underline">← All Classrooms</a>
            <a href={'/teach/'+code+'/gradebook'} className="text-[12px] text-t2 hover:text-blue-500 hover:underline">📊 Grade Book</a>
            <a href={'/teach/'+code+'/homework'} className="text-[12px] text-t2 hover:text-blue-500 hover:underline">📚 Homework</a>
          </div>
          </div>
          <h1 className="text-2xl font-bold text-t1 tracking-tight">{classroom.name}</h1>
          <p className="text-sm text-t2 mt-0.5">
            Share code <span className="font-black tracking-widest text-blue-600">{code}</span> · students join at <span className="text-t3">flashfo.org/join</span>
            {' · '}<a href={'/teach/'+code+'/gradebook'} className="text-blue-500 hover:underline text-[12px] font-semibold">📊 Grade Book</a>
          </p>
        </div>
        {session && session.status !== 'closed' && (
          <div className="flex gap-2">
            {session.status === 'waiting' && (
              <button onClick={distribute} disabled={distributing}
                className="h-9 px-4 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-1.5">
                {distributing ? 'Distributing...' : '📤 Distribute Quiz'}
              </button>
            )}
            <button onClick={closeSession} className="h-9 px-3 text-[12px] font-semibold rounded-xl border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10">Close Session</button>
          </div>
        )}
      </div>

      {/* Quiz picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="bg-surface border border-line rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-line">
              <h2 className="text-base font-bold text-t1">{showPicker==='homework'?'Post Homework':'Select a Quiz'}</h2>
              <button onClick={()=>setShowPicker(false)} className="text-t3 hover:text-t1 text-xl w-7 h-7 flex items-center justify-center">✕</button>
            </div>
            <div className="flex border-b border-line">
              {[{id:'saved',label:'From Saved Quizzes'},{id:'generate',label:'Generate Now'}].map(t=>(
                <button key={t.id} onClick={()=>setPickerTab(t.id)}
                  className={'flex-1 py-3 text-[12px] font-semibold transition-colors ' + (pickerTab===t.id?'text-blue-600 border-b-2 border-blue-600':'text-t3 hover:text-t1')}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              {showPicker==='homework'&&<div className="mb-4 p-3 bg-amber-500/10 border border-amber-400/20 rounded-xl">
                <label className="block text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">Due Date (optional)</label>
                <input type="datetime-local" id="hw-due" className="h-9 bg-surface border border-line rounded-lg px-3 text-sm text-t1 outline-none focus:border-amber-400"/>
                <p className="text-[11px] text-t3 mt-1">Students can submit anytime before this date. Leave blank for no deadline.</p>
              </div>}
              {pickerTab==='saved' && (
                savedQuizzes.length === 0
                  ? <div className="text-center py-10"><p className="text-t3 text-sm">No saved quizzes. Generate one from the Quiz page and save it first.</p><a href="/quiz" className="inline-block mt-4 text-blue-500 text-sm hover:underline">Go to Quiz Builder →</a></div>
                  : <div className="space-y-2">
                      {savedQuizzes.map(q=>(
                        <button key={q.id} onClick={()=>{const dd=document.getElementById('hw-due');launchSession(q.data,showPicker==='homework',dd?.value||null)}} disabled={launching}
                          className="w-full text-left p-4 bg-surface2 border border-line rounded-xl hover:border-blue-400 transition-colors disabled:opacity-40">
                          <div className="text-sm font-semibold text-t1">{q.title}</div>
                          <div className="text-[11px] text-t3 mt-0.5">{q.data?.questions?.length||0} questions · {q.data?.type||'MCQ'}</div>
                        </button>
                      ))}
                    </div>
              )}
              {pickerTab==='generate' && (
                <div className="space-y-3">
                  <p className="text-[12px] text-t3">Generate a quick 5-question MCQ quiz on any topic.</p>
                  <input value={genTopic} onChange={e=>setGenTopic(e.target.value)} placeholder="Enter a topic..."
                    onKeyDown={e=>e.key==='Enter'&&generateAndLaunch()}
                    className="w-full h-10 bg-surface2 border border-line rounded-xl px-3 text-sm text-t1 outline-none focus:border-blue-400 placeholder:text-t3"/>
                  <button onClick={generateAndLaunch} disabled={generating||!genTopic.trim()||launching}
                    className="w-full h-9 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40 flex items-center justify-center gap-2">
                    {generating?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Generating...</>:'Generate & Load Quiz'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No session */}
      {!session && (
        <div className="border-2 border-dashed border-line rounded-2xl p-14 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="text-base font-bold text-t1 mb-1">No active session</h2>
          <p className="text-sm text-t2 mb-6">Load a quiz and distribute it to your students.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={()=>setShowPicker(true)} className="h-10 px-6 bg-blue-700 text-white text-sm font-bold rounded-xl hover:bg-blue-800">🚀 Live Quiz</button>
            <button onClick={()=>setShowPicker('homework')} className="h-10 px-6 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600">📋 Post Homework</button>
          </div>
        </div>
      )}

      {/* Session loaded — waiting to distribute */}
      {session && session.status === 'waiting' && (
        <div className="space-y-4">
          <div className="bg-surface border border-line rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-t1">{session.title}</h2>
              <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-amber-500/10 text-amber-500">⏳ Ready to Distribute</span>
            </div>
            <p className="text-[12px] text-t3 mb-4">{qs.length} questions · Students can join now but won't see the quiz until you distribute it</p>
            <div className="p-4 bg-blue-500/5 border border-blue-200/30 rounded-xl">
              <p className="text-[12px] text-blue-600 font-semibold mb-1">Share with students:</p>
              <p className="text-[12px] text-t2">Go to <strong>flashfo.org/join</strong> and enter code <strong className="text-blue-600 tracking-widest">{code}</strong></p>
            </div>
          </div>
          <button onClick={distribute} disabled={distributing}
            className="w-full h-12 bg-emerald-600 text-white text-base font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center gap-2">
            {distributing?<><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Distributing...</>:'📤 Distribute Quiz to Students'}
          </button>
        </div>
      )}

      {/* Active session — submissions coming in */}
      {session && session.status === 'active' && (
        <div className="space-y-4">
          <div className="bg-surface border border-line rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-t1">{session.title}</h2>
                <p className="text-[12px] text-t3">{qs.length} questions · Students are taking the quiz now</p>
              </div>
              <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500">🔴 Live</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-500/5 border border-blue-200/30 rounded-xl">
              <div className="flex-1">
                <div className="text-[11px] text-t3 mb-1">{submittedCount} student{submittedCount!==1?'s':''} submitted</div>
                <div className="w-full h-2 bg-surface2 rounded-full overflow-hidden">
                  <div className="h-2 bg-blue-500 rounded-full transition-all" style={{width:submittedCount>0?Math.min(100,submittedCount*10)+'%':'0%'}}/>
                </div>
              </div>
              <span className="text-2xl font-black text-blue-600">{submittedCount}</span>
            </div>
          </div>

          {/* Submissions table */}
          {submittedCount > 0 && (
            <div className="bg-surface border border-line rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-line flex items-center justify-between">
                <h3 className="text-sm font-bold text-t1">Submissions</h3>
                <span className="text-[11px] text-t3">Grades are private — only visible to each student on their screen</span>
              </div>
              <div className="divide-y divide-line">
                {submittedNames.sort().map(sname=>{
                  const sub = submissions[sname]
                  const hasSA = sub.rows.some(r=>r.is_correct===null)
                  const pct = sub.total > 0 ? Math.round(sub.score/sub.total*100) : null
                  return (
                    <div key={sname} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-600 text-[11px] font-bold flex items-center justify-center">
                          {sname.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-sm font-semibold text-t1">{sname}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {hasSA && <span className="text-[11px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">Has short answer</span>}
                        {pct !== null && <span className="text-sm font-bold text-t1">{sub.score}/{sub.total}</span>}
                        <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${pct===null?'bg-surface2 text-t3':pct>=90?'bg-emerald-500/10 text-emerald-600':pct>=70?'bg-blue-500/10 text-blue-600':pct>=60?'bg-amber-500/10 text-amber-600':'bg-red-500/10 text-red-600'}`}>
                          {pct===null?'SA only':pct+'%'}
                        </span>
                        <span className="text-emerald-500 text-sm">✓</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {submittedCount === 0 && (
            <div className="text-center py-8 text-t3 text-sm">
              <div className="animate-pulse mb-2">⏳</div>
              Waiting for students to submit...
            </div>
          )}
        </div>
      )}

      {/* Session closed — final summary */}
      {session && session.status === 'closed' && (
        <div className="space-y-4">
          <div className="bg-surface border border-line rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-t1">{session.title}</h2>
                <p className="text-[12px] text-t3">{qs.length} questions · Session closed</p>
              </div>
              <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-surface2 text-t3">✓ Closed</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-surface2 rounded-xl">
                <div className="text-2xl font-black text-t1">{submittedCount}</div>
                <div className="text-[11px] text-t3">Submitted</div>
              </div>
              <div className="text-center p-3 bg-surface2 rounded-xl">
                <div className="text-2xl font-black text-blue-600">
                  {submittedCount > 0 ? Math.round(Object.values(submissions).reduce((a,s)=>a+(s.total>0?s.score/s.total*100:0),0)/submittedCount)+'%' : '—'}
                </div>
                <div className="text-[11px] text-t3">Class Avg</div>
              </div>
              <div className="text-center p-3 bg-surface2 rounded-xl">
                <div className="text-2xl font-black text-emerald-600">
                  {submittedCount > 0 ? Math.round(Math.max(...Object.values(submissions).map(s=>s.total>0?s.score/s.total*100:0)))+'%' : '—'}
                </div>
                <div className="text-[11px] text-t3">Top Score</div>
              </div>
            </div>
          </div>
          {submittedCount > 0 && (
            <div className="bg-surface border border-line rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-line"><h3 className="text-sm font-bold text-t1">All Submissions</h3></div>
              <div className="divide-y divide-line">
                {Object.entries(submissions).sort((a,b)=>(b[1].total>0?b[1].score/b[1].total:0)-(a[1].total>0?a[1].score/a[1].total:0)).map(([sname,sub])=>{
                  const pct = sub.total > 0 ? Math.round(sub.score/sub.total*100) : null
                  return (
                    <div key={sname} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-600 text-[11px] font-bold flex items-center justify-center">{sname.charAt(0).toUpperCase()}</span>
                        <span className="text-sm font-semibold text-t1">{sname}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {pct !== null && <span className="text-sm font-bold text-t1">{sub.score}/{sub.total}</span>}
                        <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${pct===null?'bg-surface2 text-t3':pct>=90?'bg-emerald-500/10 text-emerald-600':pct>=70?'bg-blue-500/10 text-blue-600':pct>=60?'bg-amber-500/10 text-amber-600':'bg-red-500/10 text-red-600'}`}>
                          {pct===null?'Short answer':pct+'%'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <button onClick={newSession} className="h-10 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800">Load Another Quiz</button>
        </div>
      )}
    </div>
  )
}
