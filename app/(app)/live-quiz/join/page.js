'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

export default function JoinQuizPage() {
  const { user } = useAuth()
  const params = useSearchParams()
  const [phase,       setPhase]       = useState('join')
  const [code,        setCode]        = useState(params.get('code') || '')
  const [name,        setName]        = useState('')
  const [session,     setSession]     = useState(null)
  const [participant, setParticipant] = useState(null)
  const [question,    setQuestion]    = useState(null)
  const [qIdx,        setQIdx]        = useState(0)
  const [selected,    setSelected]    = useState(null)
  const [answered,    setAnswered]    = useState(false)
  const [timeLeft,    setTimeLeft]    = useState(90)
  const [results,     setResults]     = useState(null)
  const [error,       setError]       = useState('')
  // Exam mode
  const [examAnswers, setExamAnswers] = useState({})
  const [examQIdx,    setExamQIdx]    = useState(0)
  const [submitting,  setSubmitting]  = useState(false)

  const channelRef = useRef(null)
  const timerRef   = useRef(null)

  const isExam = session?.pace_mode === 'exam'

  // ── Join ─────────────────────────────────────────────────────────────────
  const join = async () => {
    setError('')
    const displayName = name.trim() || user?.email?.split('@')[0] || 'Student'
    const { data: sess, error: sessErr } = await supabase
      .from('quiz_sessions').select('*').eq('session_code', code.trim().toUpperCase()).single()
    if (sessErr || !sess) { setError('Session not found — check the code and try again'); return }
    if (sess.status === 'ended') { setError('This session has already ended'); return }

    const { data: part, error: partErr } = await supabase
      .from('quiz_participants')
      .insert({ session_id:sess.id, student_id:user?.id||null, student_name:displayName })
      .select().single()
    if (partErr) { setError('Could not join — '+partErr.message); return }

    setSession(sess)
    setParticipant(part)

    if (sess.pace_mode === 'exam') {
      setPhase(sess.status === 'active' ? 'exam-ready' : 'lobby')
    } else {
      setPhase(sess.status === 'active' ? 'question' : 'lobby')
      if (sess.status === 'active') {
        setQuestion(sess.questions[sess.current_question_idx])
        setQIdx(sess.current_question_idx)
      }
      subscribeReview(sess.session_code, sess.id)
    }
  }

  // ── Review: realtime ─────────────────────────────────────────────────────
  const subscribeReview = useCallback((sessionCode, sessionId) => {
    const ch = supabase.channel('quiz:'+sessionCode)
      .on('broadcast', { event:'next_question' }, ({ payload }) => {
        setQIdx(payload.idx); setQuestion(payload.question)
        setSelected(null); setAnswered(false)
        setTimeLeft(payload.timer || 90); setPhase('question')
      })
      .on('broadcast', { event:'end_quiz' }, () => {
        setPhase('score'); loadResults(sessionId)
      })
      .subscribe()
    channelRef.current = ch

    // Also poll for exam mode lobby → active
  }, [])

  // Lobby polling — for exam mode waiting for teacher to administer
  useEffect(() => {
    if (phase !== 'lobby' || !session || !isExam) return
    const poll = setInterval(async () => {
      const { data } = await supabase.from('quiz_sessions').select('status').eq('id', session.id).single()
      if (data?.status === 'active') { clearInterval(poll); setPhase('exam-ready') }
    }, 3000)
    return () => clearInterval(poll)
  }, [phase, session, isExam])

  // ── Review: timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'question') return
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); if (!answered) submitReviewAnswer(null); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, qIdx, answered])

  // ── Review: submit answer ────────────────────────────────────────────────
  const submitReviewAnswer = async (optionIdx) => {
    if (answered || !participant || !question) return
    clearInterval(timerRef.current)
    setAnswered(true); setSelected(optionIdx)
    const isCorrect = optionIdx === question.correct
    const newAnswers = { ...(participant.answers||{}), [qIdx]:{ selected:optionIdx, correct:isCorrect } }
    const newScore = (participant.score||0) + (isCorrect ? 100 : 0)
    const { data: updated } = await supabase.from('quiz_participants')
      .update({ answers:newAnswers, score:newScore }).eq('id', participant.id).select().single()
    if (updated) setParticipant(updated)
    channelRef.current?.send({ type:'broadcast', event:'student_answered', payload:{ participantId:participant.id, correct:isCorrect, qIdx } })
    setPhase('reveal')
  }

  // ── Review: load results ──────────────────────────────────────────────────
  const loadResults = async (sessionId) => {
    const { data: part } = await supabase.from('quiz_participants').select('*').eq('id', participant?.id).single()
    const { data: sess } = await supabase.from('quiz_sessions').select('questions').eq('id', sessionId||session?.id).single()
    if (!part || !sess) return
    const qs = sess.questions
    const answers = part.answers || {}
    const score = Object.values(answers).filter(a=>a.correct).length
    const weak = qs.filter((_,i)=>!answers[i]?.correct).map(q=>q.question)
    setResults({ score, total:qs.length, weak, answers, questions:qs, participant:part })
    setPhase('score')
  }

  // ── Exam: select answer (buffered, not saved until submit) ────────────────
  const selectExamAnswer = (qIdx, optionIdx) => {
    setExamAnswers(prev => ({ ...prev, [qIdx]: optionIdx }))
  }

  // ── Exam: submit ──────────────────────────────────────────────────────────
  const submitExam = async () => {
    if (submitting) return
    setSubmitting(true)
    const qs = session.questions
    let score = 0
    const savedAnswers = {}
    qs.forEach((q,i) => {
      const sel = examAnswers[i] !== undefined ? examAnswers[i] : null
      const correct = sel === q.correct
      savedAnswers[i] = { selected: sel, correct: sel !== null ? correct : false }
      if (correct) score += 100
    })
    await supabase.from('quiz_participants')
      .update({ answers: savedAnswers, score, completed: true }).eq('id', participant.id)
    // Build results
    const weak = qs.filter((_,i)=>!savedAnswers[i]?.correct).map(q=>q.question)
    const correctCount = Object.values(savedAnswers).filter(a=>a.correct).length
    setResults({ score:correctCount, total:qs.length, weak, answers:savedAnswers, questions:qs })
    setSubmitting(false)
    setPhase('score')
  }

  useEffect(() => () => { channelRef.current?.unsubscribe(); clearInterval(timerRef.current) }, [])

  const timerPct = timeLeft / (session?.timer_seconds || 90) * 100

  // ─────────────────────────────────────────────────────────────────────────
  // JOIN SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'join') return (
    <div style={{ minHeight:'100vh', background:'#0d1117', display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:13, background:'rgba(37,99,235,0.15)', border:'1px solid rgba(37,99,235,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><circle cx="12" cy="14" r="2"/></svg>
          </div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#e6edf3', marginBottom:6 }}>Join Session</h1>
          <p style={{ fontSize:14, color:'#8b949e' }}>Enter the code your teacher shared</p>
        </div>
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:14, padding:24 }}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#484f58', letterSpacing:'0.07em', display:'block', marginBottom:6 }}>SESSION CODE</label>
            <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={10}
              placeholder="e.g. BIO-4X7" onKeyDown={e=>e.key==='Enter'&&join()}
              style={{ width:'100%', height:44, background:'#0d1117', border:'1px solid #30363d', borderRadius:9, padding:'0 14px', color:'#e6edf3', fontSize:18, fontWeight:700, letterSpacing:'0.15em', fontFamily:'monospace', textAlign:'center', outline:'none', boxSizing:'border-box' }}/>
          </div>
          {!user && (
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#484f58', letterSpacing:'0.07em', display:'block', marginBottom:6 }}>YOUR NAME</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="First name or nickname"
                style={{ width:'100%', height:40, background:'#0d1117', border:'1px solid #30363d', borderRadius:9, padding:'0 14px', color:'#e6edf3', fontSize:14, outline:'none', boxSizing:'border-box' }}/>
            </div>
          )}
          {error && <p style={{ fontSize:12, color:'#ef4444', marginBottom:12 }}>{error}</p>}
          <button onClick={join} disabled={!code.trim()}
            style={{ width:'100%', height:44, borderRadius:9, border:'none', background:'#2563eb', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', opacity:code.trim()?1:0.5 }}>
            Join →
          </button>
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // LOBBY
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'lobby') return (
    <div style={{ minHeight:'100vh', background:'#0d1117', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ textAlign:'center', padding:24 }}>
        <div style={{ width:16, height:16, borderRadius:'50%', background:'#34d399', margin:'0 auto 20px', boxShadow:'0 0 0 6px rgba(52,211,153,0.15)' }}/>
        <h2 style={{ fontSize:20, fontWeight:700, color:'#e6edf3', marginBottom:8 }}>
          {isExam ? "You're in! Waiting for your teacher to start the exam..." : "You're in! Waiting for the teacher to start..."}
        </h2>
        <p style={{ fontSize:14, color:'#8b949e' }}>Hi {participant?.student_name} · {session?.title}</p>
        {isExam && <p style={{ fontSize:13, color:'#484f58', marginTop:8 }}>Once started, you'll work at your own pace and submit when done.</p>}
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // EXAM READY (teacher administered, student hasn't started yet)
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'exam-ready') return (
    <div style={{ minHeight:'100vh', background:'#0d1117', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ maxWidth:440, width:'100%', textAlign:'center' }}>
        <div style={{ width:60, height:60, borderRadius:15, background:'rgba(217,119,6,0.1)', border:'1px solid rgba(217,119,6,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
        </div>
        <h2 style={{ fontSize:22, fontWeight:700, color:'#e6edf3', marginBottom:8 }}>{session?.title}</h2>
        <p style={{ fontSize:14, color:'#8b949e', marginBottom:6 }}>{session?.questions?.length} questions · Work at your own pace</p>
        <p style={{ fontSize:13, color:'#484f58', marginBottom:28 }}>Your answers are private. Submit when you're done.</p>
        <button onClick={()=>setPhase('exam')}
          style={{ width:'100%', height:48, borderRadius:10, border:'none', background:'#d97706', color:'#fff', fontSize:16, fontWeight:700, cursor:'pointer' }}>
          Start Exam →
        </button>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // EXAM (student working through questions at own pace)
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'exam') {
    const qs = session?.questions || []
    const q = qs[examQIdx]
    const totalAnswered = Object.keys(examAnswers).length
    const allAnswered = totalAnswered === qs.length
    return (
      <div style={{ minHeight:'100vh', background:'#0d1117', display:'flex', flexDirection:'column', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
        {/* Header */}
        <div style={{ background:'#161b22', borderBottom:'1px solid #21262d', padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ fontSize:12, color:'#8b949e' }}>Q{examQIdx+1} of {qs.length}</span>
          <span style={{ fontSize:13, fontWeight:600, color:'#e6edf3' }}>{session?.title}</span>
          <span style={{ fontSize:12, color:'#8b949e' }}>{totalAnswered}/{qs.length} answered</span>
        </div>
        {/* Progress bar */}
        <div style={{ height:3, background:'#21262d' }}>
          <div style={{ height:3, background:'#d97706', width:(qs.length?totalAnswered/qs.length*100:0)+'%', transition:'width 0.3s ease' }}/>
        </div>

        <div style={{ flex:1, padding:'24px 20px', maxWidth:600, margin:'0 auto', width:'100%', boxSizing:'border-box' }}>
          <p style={{ fontSize:18, fontWeight:600, color:'#e6edf3', lineHeight:1.5, marginBottom:24 }}>{q?.question}</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
            {q?.options?.map((opt,i)=>{
              const isSelected = examAnswers[examQIdx] === i
              return (
                <button key={i} onClick={()=>selectExamAnswer(examQIdx,i)}
                  style={{ padding:'14px 16px', borderRadius:10, border:'1px solid '+(isSelected?'#d97706':'#21262d'), background:isSelected?'rgba(217,119,6,0.08)':'#161b22', color:isSelected?'#fbbf24':'#8b949e', fontSize:14, fontWeight:500, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10, transition:'all 0.15s' }}>
                  <span style={{ width:24, height:24, borderRadius:6, background:isSelected?'#d97706':'#21262d', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:isSelected?'#fff':'#8b949e', flexShrink:0 }}>
                    {['A','B','C','D'][i]}
                  </span>
                  {opt.replace(/^[A-D]s+/,'')}
                </button>
              )
            })}
          </div>

          {/* Question navigator */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:20 }}>
            {qs.map((_,i)=>(
              <button key={i} onClick={()=>setExamQIdx(i)}
                style={{ width:32, height:32, borderRadius:7, border:'1px solid '+(examQIdx===i?'#d97706':examAnswers[i]!==undefined?'rgba(217,119,6,0.4)':'#21262d'), background:examQIdx===i?'rgba(217,119,6,0.15)':examAnswers[i]!==undefined?'rgba(217,119,6,0.06)':'#0d1117', color:examQIdx===i?'#fbbf24':examAnswers[i]!==undefined?'#d97706':'#484f58', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                {i+1}
              </button>
            ))}
          </div>

          {/* Nav + submit */}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={()=>setExamQIdx(i=>Math.max(0,i-1))} disabled={examQIdx===0}
              style={{ height:42, padding:'0 16px', borderRadius:9, border:'1px solid #21262d', background:'#161b22', color:'#8b949e', fontSize:13, cursor:'pointer', opacity:examQIdx===0?0.3:1 }}>
              ← Prev
            </button>
            {examQIdx < qs.length-1 ? (
              <button onClick={()=>setExamQIdx(i=>Math.min(qs.length-1,i+1))}
                style={{ flex:1, height:42, borderRadius:9, border:'1px solid #21262d', background:'#161b22', color:'#e6edf3', fontSize:13, fontWeight:500, cursor:'pointer' }}>
                Next →
              </button>
            ) : null}
            <button onClick={submitExam} disabled={submitting}
              style={{ flex:examQIdx===qs.length-1?1:0, height:42, padding:'0 20px', borderRadius:9, border:'none', background:allAnswered?'#d97706':'#21262d', color:allAnswered?'#fff':'#484f58', fontSize:13, fontWeight:700, cursor:submitting?'wait':'pointer', whiteSpace:'nowrap' }}>
              {submitting ? 'Submitting...' : allAnswered ? 'Submit Exam ✓' : 'Submit ('+totalAnswered+'/'+qs.length+')'}
            </button>
          </div>
          {!allAnswered && <p style={{ fontSize:12, color:'#484f58', marginTop:10, textAlign:'center' }}>You can submit with unanswered questions — they'll be marked as missed.</p>}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCORE (shared — adapts for exam vs review)
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'score' && results) {
    const scorePct = Math.round(results.score/results.total*100)
    return (
      <div style={{ minHeight:'100vh', background:'#0d1117', padding:'24px 20px', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
        <div style={{ maxWidth:560, margin:'0 auto' }}>
          {/* Score card */}
          <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:16, padding:28, textAlign:'center', marginBottom:16 }}>
            <div style={{ fontSize:64, fontWeight:800, color:scorePct>=80?'#34d399':scorePct>=60?'#f59e0b':'#ef4444', lineHeight:1, marginBottom:6 }}>{scorePct}%</div>
            <div style={{ fontSize:16, fontWeight:600, color:'#e6edf3', marginBottom:4 }}>{results.score} / {results.total} correct</div>
            <div style={{ fontSize:13, color:'#8b949e' }}>{session?.title}</div>
            {isExam && <div style={{ fontSize:12, color:'#484f58', marginTop:6 }}>Exam submitted</div>}
          </div>

          {/* Nova analysis — review mode only */}
          {!isExam && results.weak.length > 0 && (
            <div style={{ background:'rgba(167,139,250,0.06)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:12, padding:18, marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#a78bfa', letterSpacing:'0.08em', marginBottom:10 }}>NOVA — AREAS TO REVIEW</div>
              {results.weak.slice(0,4).map((q,i)=>(
                <div key={i} style={{ fontSize:13, color:'#e6edf3', padding:'7px 0', borderTop:i>0?'1px solid rgba(167,139,250,0.1)':'none', lineHeight:1.5 }}>{q}</div>
              ))}
            </div>
          )}
          {!isExam && results.weak.length===0 && (
            <div style={{ background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:12, padding:18, marginBottom:16, textAlign:'center' }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#34d399' }}>Perfect score!</div>
              <div style={{ fontSize:13, color:'#8b949e', marginTop:4 }}>You got every question right.</div>
            </div>
          )}

          {/* Exam submitted message */}
          {isExam && (
            <div style={{ background:'rgba(217,119,6,0.06)', border:'1px solid rgba(217,119,6,0.2)', borderRadius:12, padding:18, marginBottom:16, textAlign:'center' }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#f59e0b', marginBottom:4 }}>Exam submitted</div>
              <div style={{ fontSize:13, color:'#8b949e' }}>Your teacher can now see your score. Good work!</div>
            </div>
          )}

          {/* Question breakdown */}
          <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:18 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#484f58', letterSpacing:'0.07em', marginBottom:12 }}>
              {isExam ? 'YOUR ANSWERS' : 'QUESTION BREAKDOWN'}
            </div>
            {results.questions.map((q,i)=>{
              const ans = results.answers[i]
              const correct = ans?.correct
              const missed = !ans || ans.selected === null
              return (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 0', borderTop:i>0?'1px solid #21262d':'none' }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background:missed?'#21262d':correct?'rgba(52,211,153,0.15)':'rgba(239,68,68,0.12)', border:'1px solid '+(missed?'#30363d':correct?'#34d399':'#ef4444'), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                    {!missed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={correct?'#34d399':'#ef4444'} strokeWidth="3" strokeLinecap="round">{correct?<polyline points="20 6 9 17 4 12"/>:<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}</svg>}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:'#e6edf3', lineHeight:1.4 }}>{q.question}</div>
                    {/* Show correct answer on exam results */}
                    {isExam && !correct && !missed && (
                      <div style={{ fontSize:11, color:'#34d399', marginTop:3 }}>Correct: {q.options[q.correct]?.replace(/^[A-D]s+/,'')}</div>
                    )}
                    {missed && <div style={{ fontSize:11, color:'#484f58', marginTop:2 }}>Not answered</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return <div style={{ minHeight:'100vh', background:'#0d1117', display:'flex', alignItems:'center', justifyContent:'center', color:'#8b949e' }}>Loading...</div>
}
