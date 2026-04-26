'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

const Q_COLORS  = ['#2563eb','#dc2626','#d97706','#16a34a']
const Q_HOVER   = ['#1d4ed8','#b91c1c','#b45309','#15803d']
const Q_LABELS  = ['A','B','C','D']
const Q_SHAPES  = ['▲','⬟','●','⬛']

function JoinInner() {
  const searchParams = useSearchParams()
  const [code, setCode]         = useState((searchParams.get('code')||'').toUpperCase())
  const [name, setName]         = useState('')
  const [step, setStep]         = useState('entry')   // entry | joining | waiting | question | answered | leaderboard | final
  const [classroom, setClassroom] = useState(null)
  const [session, setSession]   = useState(null)
  const [question, setQuestion] = useState(null)      // current question object
  const [qIdx, setQIdx]         = useState(-1)
  const [answered, setAnswered] = useState(null)      // index chosen
  const [isCorrect, setIsCorrect] = useState(null)
  const [score, setScore]       = useState(0)
  const [leaderboard, setLeaderboard] = useState([])
  const [error, setError]       = useState('')
  const [timer, setTimer]       = useState(null)
  const channelRef = useRef(null)
  const nameRef    = useRef('')

  useEffect(()=>{ nameRef.current = name },[name])

  async function join() {
    if (!code.trim()||!name.trim()) return
    setStep('joining'); setError('')
    const c = code.trim().toUpperCase()
    // Find classroom
    const { data: cls } = await supabase.from('classrooms').select('*').eq('code',c).maybeSingle()
    if (!cls) { setError('Classroom not found. Check the code and try again.'); setStep('entry'); return }
    // Find active or waiting session
    const { data: sess } = await supabase.from('classroom_sessions').select('*')
      .eq('classroom_id',cls.id).in('status',['waiting','active']).order('created_at',{ascending:false}).limit(1).maybeSingle()
    if (!sess) { setError('No active session for this classroom right now.'); setStep('entry'); return }

    setClassroom(cls); setSession(sess)
    // Announce presence via broadcast
    const ch = supabase.channel('teacher-session-'+sess.id)
    ch.subscribe(status=>{
      if(status==='SUBSCRIBED') {
        ch.send({type:'broadcast',event:'student_joined',payload:{name:name.trim()}})
      }
    })
    // Subscribe to session updates
    const sessChannel = supabase.channel('student-session-'+sess.id)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'classroom_sessions',filter:'id=eq.'+sess.id},(payload)=>{
        handleSessionUpdate(payload.new)
      })
      .subscribe()
    channelRef.current = sessChannel

    // If already active, load the current question
    if (sess.status==='active' && sess.current_q >= 0) {
      const qs = sess.quiz_data?.questions||[]
      if (qs[sess.current_q]) { setQIdx(sess.current_q); setQuestion(qs[sess.current_q]); setStep('question') }
      else setStep('waiting')
    } else {
      setStep('waiting')
    }
  }

  function handleSessionUpdate(newSess) {
    setSession(newSess)
    const qs = newSess.quiz_data?.questions||[]
    if (newSess.status==='closed'||newSess.current_q>=qs.length) {
      buildLeaderboard(newSess.id).then(lb=>{ setLeaderboard(lb); setStep('final') })
      return
    }
    if (newSess.status==='active' && newSess.current_q >= 0) {
      setQIdx(newSess.current_q)
      setQuestion(qs[newSess.current_q])
      setAnswered(null); setIsCorrect(null)
      setStep('question')
    }
  }

  async function buildLeaderboard(sessionId) {
    const { data } = await supabase.from('session_responses').select('student_name,is_correct').eq('session_id',sessionId)
    const scores = {}
    ;(data||[]).forEach(r=>{ if(!scores[r.student_name]) scores[r.student_name]=0; if(r.is_correct) scores[r.student_name]++ })
    return Object.entries(scores).sort((a,b)=>b[1]-a[1])
  }

  async function submitAnswer(idx) {
    if (answered!==null||!session||!question) return
    setAnswered(idx)
    const correct = idx===question.answerIndex
    setIsCorrect(correct)
    if(correct) setScore(s=>s+1)
    await supabase.from('session_responses').insert({
      session_id: session.id,
      student_name: nameRef.current.trim(),
      question_idx: qIdx,
      answer_idx: idx,
      is_correct: correct
    })
    setStep('answered')
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  // Entry screen
  if (step==='entry'||step==='joining') return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 50%,#1e3a8a 100%)'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎓</div>
          <h1 className="text-3xl font-black text-white tracking-tight">Flashfo</h1>
          <p className="text-blue-200 text-sm mt-1">Join a live classroom</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Class Code</label>
              <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="e.g. MATH42" maxLength={8}
                className="w-full h-12 text-2xl font-black text-center tracking-widest border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 uppercase text-gray-900"/>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Your Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your name" maxLength={30}
                onKeyDown={e=>e.key==='Enter'&&join()}
                className="w-full h-11 text-base border-2 border-gray-200 rounded-xl px-3 outline-none focus:border-blue-500 text-gray-900"/>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mb-3 text-center">{error}</p>}
          <button onClick={join} disabled={step==='joining'||!code.trim()||!name.trim()}
            className="w-full h-12 bg-blue-600 text-white text-base font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {step==='joining'?'Joining...':'Join Class →'}
          </button>
        </div>
      </div>
    </div>
  )

  // Waiting room
  if (step==='waiting') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{background:'linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%)'}}>
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-white/10 border-4 border-white/30 flex items-center justify-center mx-auto mb-6 animate-pulse">
          <span className="text-3xl">⏳</span>
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Waiting for teacher...</h2>
        <p className="text-blue-200 mb-1">You're in <strong className="text-white">{classroom?.name}</strong></p>
        <p className="text-blue-300 text-sm">Get ready — the quiz will start soon!</p>
        <div className="mt-8 bg-white/10 rounded-2xl px-8 py-4">
          <p className="text-blue-200 text-[11px] uppercase tracking-wider mb-1">Playing as</p>
          <p className="text-white text-xl font-black">{name}</p>
        </div>
      </div>
    </div>
  )

  // Active question
  if ((step==='question'||step==='answered') && question) {
    const qs = session?.quiz_data?.questions||[]
    const isSA = question.type==='short_answer'
    return (
      <div className="min-h-screen flex flex-col" style={{background:'#0f172a'}}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/30">
          <span className="text-white/60 text-[12px] font-semibold">Q{qIdx+1}/{qs.length}</span>
          <span className="text-white font-black">{name}</span>
          <span className="text-white/60 text-[12px] font-semibold">Score: <span className="text-white font-black">{score}</span></span>
        </div>
        {/* Question */}
        <div className="flex-1 flex flex-col justify-center px-4 py-6">
          <div className="bg-white rounded-2xl p-5 mb-6 shadow-xl text-center max-w-lg mx-auto w-full">
            <p className="text-gray-900 text-xl font-bold leading-snug">{question.question}</p>
          </div>

          {step==='answered' ? (
            <div className={`max-w-lg mx-auto w-full rounded-2xl p-6 text-center ${isCorrect?'bg-emerald-500':'bg-red-500'}`}>
              <div className="text-5xl mb-2">{isCorrect?'✓':'✗'}</div>
              <div className="text-white text-xl font-black mb-1">{isCorrect?'Correct!':'Wrong!'}</div>
              {!isCorrect&&<div className="text-white/80 text-sm">Correct: {question.options?question.options[question.answerIndex]:question.correctAnswer||'—'}</div>}
              <p className="text-white/70 text-sm mt-3">Waiting for next question...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto w-full">
              {(question.options||['True','False']).map((opt,j)=>(
                <button key={j} onClick={()=>submitAnswer(j)}
                  className="rounded-2xl p-4 text-white font-bold text-left flex flex-col items-start gap-2 transition-transform active:scale-95 shadow-lg min-h-[80px]"
                  style={{background:Q_COLORS[j]}}>
                  <span className="text-2xl">{Q_SHAPES[j]}</span>
                  <span className="text-base leading-tight">{opt}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Final leaderboard
  if (step==='final') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{background:'linear-gradient(135deg,#713f12 0%,#854d0e 50%,#ca8a04 100%)'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🏆</div>
          <h2 className="text-3xl font-black text-white">Final Results!</h2>
          <p className="text-yellow-200 mt-1">Your score: <strong className="text-white">{score}</strong></p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-2xl space-y-2">
          {leaderboard.map(([pname,pscore],i)=>(
            <div key={pname} className={`flex items-center gap-3 p-2.5 rounded-xl ${pname===name?'bg-blue-50 border border-blue-200':i<3?'bg-amber-50':'bg-gray-50'}`}>
              <span className="text-xl">{i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1)+'.'}</span>
              <span className={`font-bold flex-1 ${pname===name?'text-blue-600':i<3?'text-amber-700':'text-gray-700'}`}>{pname}{pname===name?' (you)':''}</span>
              <span className="font-black text-gray-900">{pscore}</span>
            </div>
          ))}
        </div>
        <button onClick={()=>{setStep('entry');setScore(0);setSession(null);setClassroom(null);setAnswered(null);setIsCorrect(null)}}
          className="w-full mt-5 h-11 bg-white text-yellow-800 font-bold rounded-xl hover:bg-yellow-50">Play Again</button>
      </div>
    </div>
  )

  return null
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{background:'#1e3a5f'}}><span className="text-white">Loading...</span></div>}>
      <JoinInner/>
    </Suspense>
  )
}
