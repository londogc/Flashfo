'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

const COLORS = { correct:'#34d399', wrong:'#ef4444', neutral:'#30363d' }

export default function JoinQuizPage() {
  const { user } = useAuth()
  const params = useSearchParams()
  const [phase, setPhase] = useState('join') // join | lobby | question | reveal | score
  const [code, setCode] = useState(params.get('code') || '')
  const [name, setName] = useState('')
  const [session, setSession] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [question, setQuestion] = useState(null)
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [timeLeft, setTimeLeft] = useState(90)
  const [results, setResults] = useState(null) // { score, total, weak, breakdown }
  const [error, setError] = useState('')
  const channelRef = useRef(null)
  const timerRef = useRef(null)

  // ── Join session ──────────────────────────────────────────────────────────
  const join = async () => {
    setError('')
    const displayName = name.trim() || user?.email?.split('@')[0] || 'Student'
    const { data: sess, error: sessErr } = await supabase
      .from('quiz_sessions').select('*').eq('session_code', code.trim().toUpperCase()).single()
    if (sessErr || !sess) { setError('Session not found — check the code and try again'); return }
    if (sess.status === 'ended') { setError('This quiz has already ended'); return }

    const { data: part, error: partErr } = await supabase
      .from('quiz_participants')
      .insert({ session_id: sess.id, student_id: user?.id || null, student_name: displayName })
      .select().single()
    if (partErr) { setError('Could not join — ' + partErr.message); return }

    setSession(sess)
    setParticipant(part)
    setPhase(sess.status === 'active' ? 'question' : 'lobby')
    if (sess.status === 'active') {
      const q = sess.questions[sess.current_question_idx]
      setQuestion(q); setQIdx(sess.current_question_idx)
    }
    subscribeToSession(sess.id, sess.session_code)
  }

  // ── Realtime subscription ─────────────────────────────────────────────────
  const subscribeToSession = useCallback((sessionId, sessionCode) => {
    const channel = supabase.channel('quiz:' + sessionCode)
      .on('broadcast', { event: 'next_question' }, ({ payload }) => {
        setQIdx(payload.idx)
        setQuestion(payload.question)
        setSelected(null)
        setAnswered(false)
        setTimeLeft(payload.timer || 90)
        setPhase('question')
      })
      .on('broadcast', { event: 'end_quiz' }, () => {
        setPhase('score')
        loadResults(sessionId)
      })
      .subscribe()
    channelRef.current = channel
  }, [])

  // ── Timer countdown ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'question') return
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); if (!answered) submitAnswer(null); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, qIdx, answered])

  // ── Submit answer ─────────────────────────────────────────────────────────
  const submitAnswer = async (optionIdx) => {
    if (answered || !participant || !question) return
    clearInterval(timerRef.current)
    setAnswered(true)
    setSelected(optionIdx)
    const isCorrect = optionIdx === question.correct
    const newAnswers = { ...(participant.answers || {}), [qIdx]: { selected: optionIdx, correct: isCorrect } }
    const newScore = (participant.score || 0) + (isCorrect ? 100 : 0)
    const { data: updated } = await supabase.from('quiz_participants')
      .update({ answers: newAnswers, score: newScore }).eq('id', participant.id).select().single()
    if (updated) setParticipant(updated)
    // Broadcast to teacher that this student answered
    if (channelRef.current) {
      channelRef.current.send({ type:'broadcast', event:'student_answered', payload:{ participantId: participant.id, correct: isCorrect } })
    }
    setPhase('reveal')
  }

  // ── Load final results ────────────────────────────────────────────────────
  const loadResults = async (sessionId) => {
    const { data: part } = await supabase.from('quiz_participants')
      .select('*').eq('id', participant?.id).single()
    if (!part) return
    const { data: sess } = await supabase.from('quiz_sessions').select('questions').eq('id', sessionId).single()
    const qs = sess?.questions || []
    const answers = part.answers || {}
    const total = qs.length
    const score = Object.values(answers).filter(a => a.correct).length
    const weak = qs.filter((q,i) => !answers[i]?.correct).map(q => q.question)
    setResults({ score, total, weak, answers, questions: qs, participant: part })
    setPhase('score')
  }

  useEffect(() => () => { channelRef.current?.unsubscribe() }, [])

  // ── Phases ────────────────────────────────────────────────────────────────
  const pct = timeLeft / (session?.timer_seconds || 90) * 100

  if (phase === 'join') return (
    <div style={{ minHeight:'100vh', background:'#0d1117', display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:13, background:'rgba(37,99,235,0.15)', border:'1px solid rgba(37,99,235,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><circle cx="12" cy="14" r="2"/></svg>
          </div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#e6edf3', marginBottom:6 }}>Join Live Quiz</h1>
          <p style={{ fontSize:14, color:'#8b949e' }}>Enter the code your teacher shared</p>
        </div>
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:14, padding:24 }}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#484f58', letterSpacing:'0.07em', display:'block', marginBottom:6 }}>SESSION CODE</label>
            <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={10}
              placeholder="e.g. BIO-4X7"
              onKeyDown={e=>e.key==='Enter'&&join()}
              style={{ width:'100%', height:44, background:'#0d1117', border:'1px solid #30363d', borderRadius:9, padding:'0 14px', color:'#e6edf3', fontSize:18, fontWeight:700, letterSpacing:'0.15em', fontFamily:'monospace', textAlign:'center', outline:'none' }}/>
          </div>
          {!user && (
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#484f58', letterSpacing:'0.07em', display:'block', marginBottom:6 }}>YOUR NAME</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="First name or nickname"
                style={{ width:'100%', height:40, background:'#0d1117', border:'1px solid #30363d', borderRadius:9, padding:'0 14px', color:'#e6edf3', fontSize:14, outline:'none' }}/>
            </div>
          )}
          {error && <p style={{ fontSize:12, color:'#ef4444', marginBottom:12 }}>{error}</p>}
          <button onClick={join} disabled={!code.trim()}
            style={{ width:'100%', height:44, borderRadius:9, border:'none', background:'#2563eb', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', opacity:code.trim()?1:0.5 }}>
            Join Quiz →
          </button>
        </div>
      </div>
    </div>
  )

  if (phase === 'lobby') return (
    <div style={{ minHeight:'100vh', background:'#0d1117', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:16, height:16, borderRadius:'50%', background:'#34d399', margin:'0 auto 20px', animation:'pulse 1.5s ease-in-out infinite', boxShadow:'0 0 0 6px rgba(52,211,153,0.15)' }}/>
        <h2 style={{ fontSize:20, fontWeight:700, color:'#e6edf3', marginBottom:8 }}>You're in! Waiting for the teacher to start...</h2>
        <p style={{ fontSize:14, color:'#8b949e' }}>Hi {participant?.student_name} · {session?.title}</p>
        <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}`}</style>
      </div>
    </div>
  )

  if (phase === 'question' || phase === 'reveal') {
    const qs = session?.questions || []
    const isReveal = phase === 'reveal'
    return (
      <div style={{ minHeight:'100vh', background:'#0d1117', display:'flex', flexDirection:'column', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
        {/* Header */}
        <div style={{ background:'#161b22', borderBottom:'1px solid #21262d', padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:12, color:'#8b949e' }}>Q{qIdx+1} of {qs.length}</span>
          <span style={{ fontSize:13, fontWeight:600, color:'#e6edf3' }}>{session?.title}</span>
          <span style={{ fontSize:13, fontWeight:700, color: timeLeft<=10?'#ef4444':'#f59e0b' }}>
            {isReveal ? '✓ Answered' : timeLeft + 's'}
          </span>
        </div>
        {/* Timer bar */}
        {!isReveal && (
          <div style={{ height:4, background:'#21262d' }}>
            <div style={{ height:4, background: timeLeft<=10?'#ef4444':'#2563eb', width:pct+'%', transition:'width 1s linear' }}/>
          </div>
        )}
        <div style={{ flex:1, padding:'24px 20px', maxWidth:600, margin:'0 auto', width:'100%' }}>
          <p style={{ fontSize:18, fontWeight:600, color:'#e6edf3', lineHeight:1.5, marginBottom:24 }}>{question?.question}</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {question?.options?.map((opt, i) => {
              let bg = '#161b22', border = '#21262d', color = '#8b949e'
              if (isReveal) {
                if (i === question.correct) { bg='rgba(52,211,153,0.08)'; border='#34d399'; color='#34d399' }
                else if (i === selected && i !== question.correct) { bg='rgba(239,68,68,0.07)'; border='#ef4444'; color='#ef4444' }
              } else if (i === selected) { bg='rgba(37,99,235,0.1)'; border='#2563eb'; color='#93c5fd' }
              return (
                <button key={i} onClick={() => !answered && submitAnswer(i)}
                  disabled={answered}
                  style={{ padding:'14px 16px', borderRadius:10, border:'1px solid '+border, background:bg, color, fontSize:14, fontWeight:500, cursor:answered?'default':'pointer', textAlign:'left', transition:'all 0.2s', display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ width:24, height:24, borderRadius:6, background:answered&&i===question.correct?'#34d399':answered&&i===selected&&i!==question.correct?'#ef4444':'#21262d', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0, color:'#fff' }}>
                    {['A','B','C','D'][i]}
                  </span>
                  {opt.replace(/^[A-D]s+/,'')}
                </button>
              )
            })}
          </div>
          {isReveal && question?.explanation && (
            <div style={{ marginTop:18, padding:'12px 14px', background:'rgba(167,139,250,0.07)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:10 }}>
              <span style={{ fontSize:11, fontWeight:600, color:'#a78bfa', letterSpacing:'0.07em' }}>NOVA</span>
              <p style={{ fontSize:13, color:'#e6edf3', marginTop:4, lineHeight:1.6 }}>{question.explanation}</p>
            </div>
          )}
          {isReveal && selected === null && <p style={{ color:'#484f58', fontSize:13, marginTop:14 }}>You didn't answer in time — marked as missed.</p>}
        </div>
      </div>
    )
  }

  if (phase === 'score' && results) {
    const pct = Math.round(results.score / results.total * 100)
    return (
      <div style={{ minHeight:'100vh', background:'#0d1117', padding:'24px 20px', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
        <div style={{ maxWidth:560, margin:'0 auto' }}>
          {/* Score card */}
          <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:16, padding:28, textAlign:'center', marginBottom:16 }}>
            <div style={{ fontSize:64, fontWeight:800, color: pct>=80?'#34d399':pct>=60?'#f59e0b':'#ef4444', lineHeight:1, marginBottom:6 }}>{pct}%</div>
            <div style={{ fontSize:16, fontWeight:600, color:'#e6edf3', marginBottom:4 }}>{results.score} / {results.total} correct</div>
            <div style={{ fontSize:13, color:'#8b949e' }}>{session?.title}</div>
          </div>
          {/* Nova weak areas */}
          {results.weak.length > 0 && (
            <div style={{ background:'rgba(167,139,250,0.06)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:12, padding:18, marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#a78bfa', letterSpacing:'0.08em', marginBottom:10 }}>NOVA — AREAS TO REVIEW</div>
              {results.weak.slice(0,4).map((q,i)=>(
                <div key={i} style={{ fontSize:13, color:'#e6edf3', padding:'7px 0', borderTop: i>0?'1px solid rgba(167,139,250,0.1)':'none', lineHeight:1.5 }}>
                  {q}
                </div>
              ))}
            </div>
          )}
          {results.weak.length === 0 && (
            <div style={{ background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:12, padding:18, marginBottom:16, textAlign:'center' }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#34d399' }}>Perfect score! 🎉</div>
              <div style={{ fontSize:13, color:'#8b949e', marginTop:4 }}>You got every question right.</div>
            </div>
          )}
          {/* Breakdown */}
          <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:18 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#484f58', letterSpacing:'0.07em', marginBottom:12 }}>QUESTION BREAKDOWN</div>
            {results.questions.map((q,i)=>{
              const ans = results.answers[i]
              const correct = ans?.correct
              const missed = !ans
              return (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 0', borderTop:i>0?'1px solid #21262d':'none' }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background:missed?'#21262d':correct?'rgba(52,211,153,0.15)':'rgba(239,68,68,0.12)', border:'1px solid '+(missed?'#30363d':correct?'#34d399':'#ef4444'), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                    {!missed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={correct?'#34d399':'#ef4444'} strokeWidth="3" strokeLinecap="round">{correct?<polyline points="20 6 9 17 4 12"/>:<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}</svg>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, color:'#e6edf3', lineHeight:1.4 }}>{q.question}</div>
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
