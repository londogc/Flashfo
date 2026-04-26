'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { getUserItems } from '@/lib/savedItems'

const Q_COLORS = ['#2563eb','#dc2626','#d97706','#16a34a']
const Q_LABELS = ['A','B','C','D']

export default function TeachSessionPage({ params }) {
  const { code } = params
  const { user, loading: authLoading } = useAuth()
  const [classroom, setClassroom] = useState(null)
  const [session, setSession]     = useState(null)
  const [students, setStudents]   = useState([])   // names from realtime
  const [responses, setResponses] = useState([])   // {student_name, question_idx, answer_idx, is_correct}
  const [loading, setLoading]     = useState(true)
  const [savedQuizzes, setSavedQuizzes] = useState([])
  const [showPicker, setShowPicker]     = useState(false)
  const [genTopic, setGenTopic]         = useState('')
  const [generating, setGenerating]     = useState(false)
  const [pickerTab, setPickerTab]       = useState('saved')
  const [launching, setLaunching]       = useState(false)
  const channelRef = useRef(null)

  useEffect(()=>{
    if (!authLoading && user) init()
  },[authLoading, user, code])

  async function init() {
    // Load classroom
    const { data: cls } = await supabase.from('classrooms').select('*').eq('code',code).single()
    if (!cls) { setLoading(false); return }
    setClassroom(cls)
    // Load latest session
    const { data: sess } = await supabase.from('classroom_sessions').select('*').eq('classroom_id',cls.id).order('created_at',{ascending:false}).limit(1).maybeSingle()
    if (sess && sess.status !== 'closed') {
      setSession(sess)
      loadResponses(sess.id)
      subscribeToSession(sess.id, cls.id)
    }
    // Load saved quizzes
    const items = await getUserItems(user.id, 'quiz').catch(()=>[])
    setSavedQuizzes(items)
    setLoading(false)
  }

  async function loadResponses(sessionId) {
    const { data } = await supabase.from('session_responses').select('*').eq('session_id',sessionId)
    setResponses(data||[])
    // Extract unique student names
    const names = [...new Set((data||[]).map(r=>r.student_name))]
    setStudents(prev=>[...new Set([...prev,...names])])
  }

  function subscribeToSession(sessionId, classroomId) {
    if (channelRef.current) channelRef.current.unsubscribe()
    const ch = supabase.channel('teacher-session-'+sessionId)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'session_responses',filter:'session_id=eq.'+sessionId},(payload)=>{
        setResponses(r=>[...r,payload.new])
        setStudents(s=>[...new Set([...s,payload.new.student_name])])
      })
      .on('broadcast',{event:'student_joined'},(payload)=>{
        setStudents(s=>[...new Set([...s,payload.payload.name])])
      })
      .subscribe()
    channelRef.current = ch
  }

  async function launchQuiz(quizData) {
    setLaunching(true)
    try {
      const { data, error } = await supabase.from('classroom_sessions').insert({
        classroom_id: classroom.id,
        title: quizData.topic || 'Live Quiz',
        quiz_data: quizData,
        status: 'waiting',
        current_q: -1
      }).select().single()
      if (error) throw error
      setSession(data); setStudents([]); setResponses([])
      subscribeToSession(data.id, classroom.id)
      setShowPicker(false)
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
      await launchQuiz({topic:genTopic.trim(),questions:qs})
    } catch(e){alert(e.message)} finally{setGenerating(false)}
  }

  async function setCurrentQ(q) {
    const newStatus = q >= session.quiz_data.questions.length ? 'closed' : 'active'
    const { data } = await supabase.from('classroom_sessions').update({current_q:q,status:newStatus}).eq('id',session.id).select().single()
    setSession(data)
  }

  async function endSession() {
    if (!confirm('End this session?')) return
    const { data } = await supabase.from('classroom_sessions').update({status:'closed'}).eq('id',session.id).select().single()
    setSession(data)
  }

  async function newSession() {
    setSession(null); setStudents([]); setResponses([])
    if (channelRef.current) channelRef.current.unsubscribe()
  }

  if (loading) return <div className="p-6 flex items-center justify-center min-h-64"><span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
  if (!classroom) return <div className="p-6"><p className="text-t2">Classroom not found.</p></div>

  const qs = session?.quiz_data?.questions||[]
  const currentQ = session ? qs[session.current_q] : null
  const qResponses = responses.filter(r=>r.question_idx===session?.current_q)
  const answeredCount = new Set(qResponses.map(r=>r.student_name)).size
  const totalStudents = students.length

  // Leaderboard — score by student
  const scores = {}
  responses.forEach(r=>{ if(!scores[r.student_name]) scores[r.student_name]=0; if(r.is_correct) scores[r.student_name]++ })
  const leaderboard = Object.entries(scores).sort((a,b)=>b[1]-a[1])

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-t1">{classroom.name}</h1>
            <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${!session?'bg-surface2 text-t3':session.status==='waiting'?'bg-amber-500/10 text-amber-500':session.status==='active'?'bg-emerald-500/10 text-emerald-500':'bg-surface2 text-t3'}`}>
              {!session?'No Session':session.status==='waiting'?'⏳ Waiting':session.status==='active'?'🔴 Live':'✓ Ended'}
            </span>
          </div>
          <p className="text-sm text-t2 mt-0.5">Code: <span className="font-black tracking-widest text-blue-600">{code}</span> · Students join at flashfo.org/join</p>
        </div>
        {session && session.status!=='closed' && (
          <button onClick={endSession} className="h-8 px-3 bg-red-500/10 text-red-500 text-[12px] font-semibold rounded-lg border border-red-300/30 hover:bg-red-500/20">End Session</button>
        )}
      </div>

      {/* No session — launch picker */}
      {!session && (
        <div className="text-center py-16 bg-surface border border-line rounded-2xl mb-6">
          <div className="text-4xl mb-3">🚀</div>
          <h2 className="text-lg font-bold text-t1 mb-2">Ready to go live?</h2>
          <p className="text-t2 text-sm mb-6">Launch a live quiz and students can join with code <span className="font-black text-blue-600">{code}</span></p>
          <button onClick={()=>setShowPicker(true)} className="h-10 px-6 bg-blue-700 text-white text-sm font-bold rounded-xl hover:bg-blue-800">Launch Live Quiz</button>
        </div>
      )}

      {/* Quiz picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.5)',padding:'24px'}}>
          <div className="bg-surface border border-line rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-line">
              <h2 className="text-base font-bold text-t1">Choose a Quiz</h2>
              <button onClick={()=>setShowPicker(false)} className="text-t3 hover:text-t1 text-xl">✕</button>
            </div>
            <div className="flex border-b border-line">
              {['saved','generate'].map(t=>(
                <button key={t} onClick={()=>setPickerTab(t)}
                  className={`flex-1 py-2.5 text-[12px] font-semibold transition-colors ${pickerTab===t?'text-blue-600 border-b-2 border-blue-600':'text-t3 hover:text-t1'}`}>
                  {t==='saved'?'From My Saved':'Generate Now'}
                </button>
              ))}
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              {pickerTab==='saved' && (
                savedQuizzes.length===0
                  ? <div className="text-center py-8"><p className="text-t3 text-sm">No saved quizzes yet. Use "Generate Now" tab or save a quiz from the Quiz page.</p></div>
                  : <div className="space-y-2">
                      {savedQuizzes.map(q=>(
                        <button key={q.id} onClick={()=>launchQuiz(q.data)} disabled={launching}
                          className="w-full text-left p-3 bg-surface2 border border-line rounded-xl hover:border-blue-400 transition-colors">
                          <div className="text-sm font-semibold text-t1">{q.title}</div>
                          <div className="text-[11px] text-t3">{q.data?.questions?.length||0} questions</div>
                        </button>
                      ))}
                    </div>
              )}
              {pickerTab==='generate' && (
                <div>
                  <input value={genTopic} onChange={e=>setGenTopic(e.target.value)} placeholder="Enter a topic to quiz on..."
                    className="w-full h-10 bg-surface2 border border-line rounded-xl px-3 text-sm text-t1 outline-none focus:border-blue-400 mb-3 placeholder:text-t3"/>
                  <button onClick={generateAndLaunch} disabled={generating||!genTopic.trim()||launching}
                    className="w-full h-9 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40 flex items-center justify-center gap-2">
                    {generating?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Generating 5 questions...</>:'Generate & Launch (5 MCQ)'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Waiting room */}
      {session && session.status==='waiting' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-surface border border-line rounded-xl p-5">
            <h2 className="text-sm font-bold text-t1 mb-4">Students Joined ({students.length})</h2>
            <div className="flex flex-wrap gap-2 min-h-16">
              {students.length===0
                ? <p className="text-sm text-t3 w-full">Waiting for students to join at flashfo.org/join with code <strong>{code}</strong></p>
                : students.map(n=>(
                  <span key={n} className="h-7 px-3 bg-blue-500/10 text-blue-600 text-[12px] font-semibold rounded-full flex items-center">{n}</span>
                ))}
            </div>
            <div className="mt-5 pt-4 border-t border-line flex items-center justify-between">
              <p className="text-sm text-t2">{qs.length} questions ready</p>
              <button onClick={()=>setCurrentQ(0)} disabled={students.length===0}
                className="h-9 px-6 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 disabled:opacity-40">
                🎯 Start Quiz
              </button>
            </div>
          </div>
          <div className="bg-surface border border-line rounded-xl p-5 text-center">
            <div className="text-[11px] font-bold text-t3 uppercase mb-2">Share Code</div>
            <div className="text-4xl font-black tracking-widest text-blue-600 mb-2">{code}</div>
            <div className="text-[11px] text-t3">flashfo.org/join</div>
          </div>
        </div>
      )}

      {/* Active question */}
      {session && session.status==='active' && currentQ && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            <div className="bg-surface border border-line rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-t3 uppercase">Question {session.current_q+1} of {qs.length}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-t2">{answeredCount}/{totalStudents} answered</span>
                  <div className="w-24 h-2 bg-surface2 rounded-full overflow-hidden">
                    <div className="h-2 bg-emerald-500 rounded-full transition-all" style={{width:totalStudents?answeredCount/totalStudents*100+'%':'0%'}}/>
                  </div>
                </div>
              </div>
              <p className="text-lg font-bold text-t1 mb-5">{currentQ.question}</p>
              <div className="grid grid-cols-2 gap-2">
                {(currentQ.options||['True','False']).map((opt,j)=>{
                  const count = qResponses.filter(r=>r.answer_idx===j).length
                  const isCorrect = j===currentQ.answerIndex
                  return (
                    <div key={j} className="rounded-xl p-3 text-white relative overflow-hidden" style={{background:Q_COLORS[j]}}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-white/80 text-sm">{Q_LABELS[j]}</span>
                        <span className="text-sm font-semibold">{opt}</span>
                        {isCorrect&&<span className="ml-auto text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">✓ Correct</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-1.5 bg-white/60 rounded-full transition-all" style={{width:answeredCount?count/answeredCount*100+'%':'0%'}}/>
                        </div>
                        <span className="text-xs font-bold text-white/80">{count}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex gap-3">
              {session.current_q < qs.length-1
                ? <button onClick={()=>setCurrentQ(session.current_q+1)} className="flex-1 h-10 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800">Next Question →</button>
                : <button onClick={()=>setCurrentQ(qs.length)} className="flex-1 h-10 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700">🏁 End & Show Results</button>}
            </div>
          </div>
          {/* Live leaderboard */}
          <div className="bg-surface border border-line rounded-xl p-5">
            <h2 className="text-sm font-bold text-t1 mb-3">🏆 Leaderboard</h2>
            <div className="space-y-2">
              {leaderboard.slice(0,8).map(([name,score],i)=>(
                <div key={name} className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-t3 w-5">{i+1}.</span>
                  <span className="text-[12px] font-semibold text-t1 flex-1 truncate">{name}</span>
                  <span className="text-[12px] font-bold text-blue-600">{score}/{qs.length}</span>
                </div>
              ))}
              {leaderboard.length===0&&<p className="text-[12px] text-t3">No answers yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* Session closed — final leaderboard */}
      {session && session.status==='closed' && (
        <div className="bg-surface border border-line rounded-xl p-6">
          <h2 className="text-xl font-bold text-t1 mb-1 text-center">🏆 Final Results</h2>
          <p className="text-t3 text-[12px] text-center mb-6">{session.title} · {qs.length} questions</p>
          <div className="space-y-2 max-w-lg mx-auto mb-6">
            {leaderboard.map(([name,score],i)=>(
              <div key={name} className={`flex items-center gap-3 p-3 rounded-xl ${i===0?'bg-amber-500/10 border border-amber-400/30':i===1?'bg-surface2':i===2?'bg-surface2':''}`}>
                <span className="text-xl">{i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1)+'.'}</span>
                <span className={`font-bold text-t1 flex-1 ${i<3?'text-base':'text-sm'}`}>{name}</span>
                <span className="font-black text-blue-600">{score}<span className="text-t3 font-normal text-[11px]">/{qs.length}</span></span>
                <span className="text-[12px] text-t3">{Math.round(score/qs.length*100)}%</span>
              </div>
            ))}
          </div>
          <div className="text-center">
            <button onClick={newSession} className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800">Launch Another Quiz</button>
          </div>
        </div>
      )}
    </div>
  )
}
