'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

function genCode() {
  const subjects = ['BIO','CHM','MTH','ENG','HIS','PHY','GEO','SCI','ART','LIT']
  const s = subjects[Math.floor(Math.random()*subjects.length)]
  const n = Math.random().toString(36).slice(2,5).toUpperCase()
  return s+'-'+n
}

export default function LiveQuizTeacher() {
  const { user } = useAuth()
  const [phase, setPhase] = useState('setup') // setup | lobby | active | results
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [paceMode, setPaceMode] = useState('timer')
  const [timerSecs, setTimerSecs] = useState(90)
  const [questions, setQuestions] = useState([])
  const [generating, setGenerating] = useState(false)
  const [session, setSession] = useState(null)
  const [participants, setParticipants] = useState([])
  const [qIdx, setQIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(90)
  const [timerActive, setTimerActive] = useState(false)
  const [qBank, setQBank] = useState([])
  const [showBank, setShowBank] = useState(false)
  const [bankTitle, setBankTitle] = useState('')
  const [savingBank, setSavingBank] = useState(false)
  const channelRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (user) loadQBank()
  }, [user])

  const loadQBank = async () => {
    const { data } = await supabase.from('quiz_question_bank').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false })
    if (data) setQBank(data)
  }

  // ── Generate questions via Nova ─────────────────────────────────────────
  const generateQuestions = async () => {
    if (!topic.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/nova-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, subject, count: 10 })
      })
      const data = await res.json()
      if (data.questions) setQuestions(data.questions)
    } catch (e) { console.error(e) }
    setGenerating(false)
  }

  // ── Save to question bank ───────────────────────────────────────────────
  const saveToBank = async () => {
    if (!questions.length || !bankTitle.trim()) return
    setSavingBank(true)
    await supabase.from('quiz_question_bank').insert({ teacher_id: user.id, title: bankTitle, subject, questions })
    await loadQBank()
    setBankTitle(''); setSavingBank(false)
  }

  // ── Edit question manually ──────────────────────────────────────────────
  const updateQuestion = (idx, field, val) => {
    setQuestions(prev => prev.map((q,i) => i===idx ? {...q, [field]: val} : q))
  }
  const updateOption = (qIdx, oIdx, val) => {
    setQuestions(prev => prev.map((q,i) => i===qIdx ? {...q, options: q.options.map((o,oi)=>oi===oIdx?val:o)} : q))
  }
  const addQuestion = () => {
    setQuestions(prev => [...prev, { question:'', options:['A ','B ','C ','D '], correct:0, explanation:'' }])
  }
  const removeQuestion = (idx) => setQuestions(prev => prev.filter((_,i)=>i!==idx))

  // ── Launch session ──────────────────────────────────────────────────────
  const launchSession = async () => {
    if (!questions.length || !title.trim()) return
    const code = genCode()
    const { data: sess } = await supabase.from('quiz_sessions').insert({
      teacher_id: user.id, session_code: code, title, subject,
      questions, pace_mode: paceMode, timer_seconds: timerSecs, status: 'lobby'
    }).select().single()
    if (!sess) return
    setSession(sess)
    setPhase('lobby')
    subscribeChannel(code, sess.id)
  }

  // ── Realtime channel ────────────────────────────────────────────────────
  const subscribeChannel = useCallback((code, sessionId) => {
    const channel = supabase.channel('quiz:' + code)
      .on('broadcast', { event: 'student_answered' }, ({ payload }) => {
        setParticipants(prev => {
          const updated = prev.map(p => p.id === payload.participantId
            ? { ...p, _answered: (p._answered || 0) + 1 } : p)
          return updated
        })
      })
      .subscribe()
    channelRef.current = channel

    // Poll participants every 3s
    const poll = setInterval(async () => {
      const { data } = await supabase.from('quiz_participants').select('*')
        .eq('session_id', sessionId).order('joined_at')
      if (data) setParticipants(data)
    }, 3000)
    return () => { clearInterval(poll); channel.unsubscribe() }
  }, [])

  // ── Start quiz ──────────────────────────────────────────────────────────
  const startQuiz = async () => {
    await supabase.from('quiz_sessions').update({ status:'active', current_question_idx:0, question_started_at: new Date().toISOString() }).eq('id', session.id)
    setPhase('active')
    setQIdx(0)
    broadcastQuestion(0)
    if (paceMode === 'timer') startTimer(timerSecs)
  }

  const broadcastQuestion = (idx) => {
    const q = questions[idx]
    channelRef.current?.send({ type:'broadcast', event:'next_question', payload:{ idx, question:q, timer: timerSecs } })
  }

  // ── Timer ───────────────────────────────────────────────────────────────
  const startTimer = (secs) => {
    setTimeLeft(secs); setTimerActive(true)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); setTimerActive(false); return 0 }
        return t - 1
      })
    }, 1000)
  }

  // Auto-advance when timer hits 0 or all answered
  useEffect(() => {
    if (paceMode !== 'timer' || phase !== 'active' || timerActive || timeLeft > 0) return
    if (qIdx < questions.length - 1) nextQuestion()
    else endQuiz()
  }, [timeLeft, timerActive])

  // Check if all participants answered
  useEffect(() => {
    if (paceMode !== 'timer' || phase !== 'active' || !participants.length) return
    const answeredCount = participants.filter(p => p.answers && Object.keys(p.answers).includes(String(qIdx))).length
    if (answeredCount >= participants.length && participants.length > 0) {
      clearInterval(timerRef.current); setTimerActive(false)
      setTimeout(() => {
        if (qIdx < questions.length - 1) nextQuestion()
        else endQuiz()
      }, 1200)
    }
  }, [participants, qIdx])

  const nextQuestion = async () => {
    const next = qIdx + 1
    setQIdx(next)
    await supabase.from('quiz_sessions').update({ current_question_idx: next, question_started_at: new Date().toISOString() }).eq('id', session.id)
    broadcastQuestion(next)
    if (paceMode === 'timer') startTimer(timerSecs)
  }

  const endQuiz = async () => {
    clearInterval(timerRef.current)
    await supabase.from('quiz_sessions').update({ status:'ended' }).eq('id', session.id)
    channelRef.current?.send({ type:'broadcast', event:'end_quiz', payload:{} })
    // Final participant fetch
    const { data } = await supabase.from('quiz_participants').select('*').eq('session_id', session.id).order('score', { ascending: false })
    if (data) setParticipants(data)
    setPhase('results')
  }

  useEffect(() => () => { clearInterval(timerRef.current); channelRef.current?.unsubscribe() }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (phase === 'setup') return (
    <div style={{ maxWidth:720, margin:'0 auto', padding:'0 0 40px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700, color:'var(--c-t1)', margin:0 }}>Live Quiz Setup</h2>
          <p style={{ fontSize:13, color:'var(--c-t2)', marginTop:2 }}>Create a session code and launch for your class</p>
        </div>
        <button onClick={()=>setShowBank(v=>!v)}
          style={{ height:32, padding:'0 14px', borderRadius:8, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t2)', fontSize:12, fontWeight:500, cursor:'pointer' }}>
          📋 Question Bank ({qBank.length})
        </button>
      </div>

      {/* Question Bank panel */}
      {showBank && qBank.length > 0 && (
        <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:12, padding:16, marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.07em', marginBottom:10 }}>SAVED QUESTION SETS</div>
          {qBank.map(b => (
            <div key={b.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', borderRadius:8, background:'var(--c-surface2)', marginBottom:6 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--c-t1)' }}>{b.title}</div>
                <div style={{ fontSize:11, color:'var(--c-t3)', marginTop:2 }}>{b.questions.length} questions{b.subject ? ' · '+b.subject : ''}</div>
              </div>
              <button onClick={()=>{ setQuestions(b.questions); setShowBank(false) }}
                style={{ padding:'5px 12px', borderRadius:7, background:'var(--c-surface)', border:'1px solid var(--c-line)', color:'var(--c-t2)', fontSize:12, cursor:'pointer' }}>
                Load
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Session config */}
      <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:14, padding:20, marginBottom:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.07em', display:'block', marginBottom:6 }}>QUIZ TITLE *</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Chapter 5 Review"
              style={{ width:'100%', height:38, background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:8, padding:'0 12px', color:'var(--c-t1)', fontSize:13, outline:'none' }}/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.07em', display:'block', marginBottom:6 }}>SUBJECT</label>
            <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. AP Biology"
              style={{ width:'100%', height:38, background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:8, padding:'0 12px', color:'var(--c-t1)', fontSize:13, outline:'none' }}/>
          </div>
        </div>
        {/* Pace mode */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.07em', display:'block', marginBottom:8 }}>PACE MODE</label>
          <div style={{ display:'flex', gap:8 }}>
            {[['timer','⏱ Timer-paced (default)'],['manual','🖐 Manual (teacher controls)']].map(([v,l])=>(
              <button key={v} onClick={()=>setPaceMode(v)}
                style={{ flex:1, height:38, borderRadius:8, border:'1px solid '+(paceMode===v?'#2563eb':'var(--c-line)'), background:paceMode===v?'rgba(37,99,235,0.1)':'var(--c-surface2)', color:paceMode===v?'#3b82f6':'var(--c-t2)', fontSize:12, fontWeight:500, cursor:'pointer' }}>
                {l}
              </button>
            ))}
          </div>
          {paceMode==='timer' && (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
              <span style={{ fontSize:12, color:'var(--c-t3)' }}>Seconds per question:</span>
              {[30,60,90].map(s=>(
                <button key={s} onClick={()=>setTimerSecs(s)}
                  style={{ height:28, width:42, borderRadius:6, border:'1px solid '+(timerSecs===s?'#2563eb':'var(--c-line)'), background:timerSecs===s?'rgba(37,99,235,0.1)':'var(--c-surface2)', color:timerSecs===s?'#3b82f6':'var(--c-t2)', fontSize:12, cursor:'pointer' }}>
                  {s}s
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Question builder */}
      <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:14, padding:20, marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--c-t1)' }}>Questions ({questions.length})</div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={addQuestion}
              style={{ height:32, padding:'0 12px', borderRadius:7, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t2)', fontSize:12, cursor:'pointer' }}>
              + Add manually
            </button>
          </div>
        </div>

        {/* Nova generate */}
        <div style={{ background:'rgba(167,139,250,0.06)', border:'1px solid rgba(167,139,250,0.15)', borderRadius:10, padding:14, marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#a78bfa', letterSpacing:'0.07em', marginBottom:8 }}>✦ LET NOVA GENERATE</div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Topic to generate questions about..."
              onKeyDown={e=>e.key==='Enter'&&generateQuestions()}
              style={{ flex:1, height:36, background:'var(--c-surface)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:8, padding:'0 12px', color:'var(--c-t1)', fontSize:13, outline:'none' }}/>
            <button onClick={generateQuestions} disabled={generating||!topic.trim()}
              style={{ height:36, padding:'0 16px', borderRadius:8, border:'none', background:'#7c3aed', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', opacity:generating||!topic.trim()?0.5:1, whiteSpace:'nowrap' }}>
              {generating ? 'Generating...' : 'Generate 10 Qs'}
            </button>
          </div>
        </div>

        {/* Question list */}
        {questions.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:400, overflowY:'auto' }}>
            {questions.map((q,qi)=>(
              <div key={qi} style={{ background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:10, padding:12 }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'var(--c-t3)', minWidth:20, marginTop:6 }}>Q{qi+1}</span>
                  <input value={q.question} onChange={e=>updateQuestion(qi,'question',e.target.value)}
                    style={{ flex:1, background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:7, padding:'6px 10px', color:'var(--c-t1)', fontSize:13, outline:'none' }}/>
                  <button onClick={()=>removeQuestion(qi)} style={{ width:24, height:24, borderRadius:5, border:'1px solid var(--c-line)', background:'none', color:'var(--c-t3)', cursor:'pointer', fontSize:12, flexShrink:0 }}>×</button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginLeft:28 }}>
                  {q.options.map((opt,oi)=>(
                    <div key={oi} style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <button onClick={()=>updateQuestion(qi,'correct',oi)}
                        style={{ width:20, height:20, borderRadius:'50%', border:'2px solid '+(q.correct===oi?'#34d399':'var(--c-line)'), background:q.correct===oi?'#34d399':'none', flexShrink:0, cursor:'pointer' }}/>
                      <input value={opt} onChange={e=>updateOption(qi,oi,e.target.value)}
                        style={{ flex:1, background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:6, padding:'4px 8px', color:'var(--c-t1)', fontSize:12, outline:'none' }}/>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {questions.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12, paddingTop:12, borderTop:'1px solid var(--c-line)' }}>
            <input value={bankTitle} onChange={e=>setBankTitle(e.target.value)} placeholder="Save these questions as..."
              style={{ flex:1, height:32, background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:7, padding:'0 10px', color:'var(--c-t1)', fontSize:12, outline:'none' }}/>
            <button onClick={saveToBank} disabled={savingBank||!bankTitle.trim()}
              style={{ height:32, padding:'0 12px', borderRadius:7, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t2)', fontSize:12, cursor:'pointer', opacity:savingBank||!bankTitle.trim()?0.5:1 }}>
              {savingBank?'Saving...':'Save to Bank'}
            </button>
          </div>
        )}
      </div>

      <button onClick={launchSession} disabled={!questions.length||!title.trim()}
        style={{ width:'100%', height:46, borderRadius:10, border:'none', background:'#2563eb', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', opacity:!questions.length||!title.trim()?0.4:1 }}>
        🚀 Launch Session
      </button>
    </div>
  )

  if (phase === 'lobby') return (
    <div style={{ maxWidth:560, margin:'0 auto', padding:'0 0 40px' }}>
      <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:14, padding:24, textAlign:'center', marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.1em', marginBottom:8 }}>SESSION CODE</div>
        <div style={{ fontSize:48, fontWeight:800, color:'var(--c-t1)', letterSpacing:'0.12em', fontFamily:'monospace', marginBottom:8 }}>{session?.session_code}</div>
        <div style={{ fontSize:13, color:'var(--c-t2)', marginBottom:16 }}>Students go to <strong>flashfo.com/join</strong> and enter this code</div>
        <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#34d399' }}/>
          <span style={{ fontSize:14, fontWeight:600, color:'#34d399' }}>{participants.length} student{participants.length!==1?'s':''} joined</span>
        </div>
      </div>

      {participants.length > 0 && (
        <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:12, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.07em', marginBottom:10 }}>IN THE ROOM</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {participants.map(p=>(
              <div key={p.id} style={{ padding:'5px 12px', borderRadius:20, background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)', fontSize:12, color:'#34d399' }}>
                {p.student_name}
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={startQuiz} disabled={participants.length===0}
        style={{ width:'100%', height:46, borderRadius:10, border:'none', background:'#34d399', color:'#0d1117', fontSize:15, fontWeight:700, cursor:'pointer', opacity:participants.length===0?0.4:1 }}>
        Start Quiz ({questions.length} questions) →
      </button>
    </div>
  )

  if (phase === 'active') {
    const q = questions[qIdx]
    const totalParticipants = participants.length
    const answeredThis = participants.filter(p => p.answers && p.answers[String(qIdx)] !== undefined).length
    const pct = timerSecs > 0 ? (timeLeft/timerSecs*100) : 0
    return (
      <div style={{ maxWidth:720, margin:'0 auto', padding:'0 0 40px' }}>
        {/* Question header */}
        <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:14, padding:20, marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:12, color:'var(--c-t3)' }}>Question {qIdx+1} of {questions.length}</span>
            {paceMode==='timer' && (
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:100, height:6, background:'var(--c-surface2)', borderRadius:3 }}>
                  <div style={{ height:6, background:timeLeft<=10?'#ef4444':'#2563eb', width:pct+'%', borderRadius:3, transition:'width 1s linear' }}/>
                </div>
                <span style={{ fontSize:14, fontWeight:700, color:timeLeft<=10?'#ef4444':'var(--c-t1)', fontVariantNumeric:'tabular-nums' }}>{timeLeft}s</span>
              </div>
            )}
            <span style={{ fontSize:13, color:'#34d399', fontWeight:600 }}>{answeredThis}/{totalParticipants} answered</span>
          </div>
          <p style={{ fontSize:16, fontWeight:600, color:'var(--c-t1)', lineHeight:1.5, margin:0 }}>{q?.question}</p>
          {/* Answer distribution bars */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:14 }}>
            {q?.options?.map((opt,i)=>{
              const count = participants.filter(p=>p.answers?.[qIdx]?.selected===i).length
              const barPct = totalParticipants ? (count/totalParticipants*100) : 0
              return (
                <div key={i} style={{ background: i===q.correct?'rgba(52,211,153,0.07)':'var(--c-surface2)', border:'1px solid '+(i===q.correct?'rgba(52,211,153,0.25)':'var(--c-line)'), borderRadius:8, padding:'8px 12px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', left:0, top:0, height:'100%', width:barPct+'%', background:i===q.correct?'rgba(52,211,153,0.1)':'rgba(139,148,158,0.06)', transition:'width 0.4s ease' }}/>
                  <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:12, color: i===q.correct?'#34d399':'var(--c-t2)', fontWeight:500 }}>{opt.replace(/^[A-D]s+/,'')}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:'var(--c-t1)' }}>{count}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Participants grid */}
        <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:12, padding:16, marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.07em', marginBottom:10 }}>STUDENTS</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {participants.map(p=>{
              const ans = p.answers?.[qIdx]
              const hasAnswered = ans !== undefined
              const correct = ans?.correct
              return (
                <div key={p.id} style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:500,
                  background: hasAnswered ? (correct?'rgba(52,211,153,0.1)':'rgba(239,68,68,0.08)') : 'var(--c-surface2)',
                  border: '1px solid '+(hasAnswered?(correct?'rgba(52,211,153,0.3)':'rgba(239,68,68,0.25)'):'var(--c-line)'),
                  color: hasAnswered?(correct?'#34d399':'#ef4444'):'var(--c-t3)' }}>
                  {hasAnswered ? (correct?'✓':'✗') : '·'} {p.student_name}
                </div>
              )
            })}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', gap:10 }}>
          {paceMode === 'manual' && (
            <button onClick={() => qIdx < questions.length-1 ? nextQuestion() : endQuiz()}
              style={{ flex:1, height:44, borderRadius:10, border:'none', background:'#2563eb', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
              {qIdx < questions.length-1 ? 'Next Question →' : 'End Quiz'}
            </button>
          )}
          {paceMode === 'timer' && qIdx < questions.length-1 && (
            <button onClick={nextQuestion}
              style={{ flex:1, height:44, borderRadius:10, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t2)', fontSize:13, cursor:'pointer' }}>
              Skip to next →
            </button>
          )}
          <button onClick={endQuiz}
            style={{ height:44, padding:'0 18px', borderRadius:10, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.07)', color:'#ef4444', fontSize:13, cursor:'pointer' }}>
            End Quiz
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'results') {
    const sorted = [...participants].sort((a,b)=>b.score-a.score)
    const total = questions.length
    const avg = participants.length ? Math.round(participants.reduce((s,p)=>s+(p.score||0),0)/participants.length) : 0
    const maxScore = total * 100
    const avgPct = Math.round(avg/maxScore*100)
    return (
      <div style={{ maxWidth:720, margin:'0 auto', padding:'0 0 40px' }}>
        <h2 style={{ fontSize:18, fontWeight:700, color:'var(--c-t1)', marginBottom:16 }}>Results — {session?.title}</h2>

        {/* Class summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
          {[
            { label:'STUDENTS', val:participants.length },
            { label:'CLASS AVG', val:avgPct+'%' },
            { label:'TOP SCORE', val:sorted[0]?Math.round(sorted[0].score/maxScore*100)+'%':'—' }
          ].map(({label,val})=>(
            <div key={label} style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.07em', marginBottom:4 }}>{label}</div>
              <div style={{ fontSize:26, fontWeight:800, color:'var(--c-t1)' }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Leaderboard */}
        <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:12, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.07em', marginBottom:12 }}>LEADERBOARD</div>
          {sorted.map((p,i)=>{
            const pct = Math.round(p.score/maxScore*100)
            return (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderTop:i>0?'1px solid var(--c-line)':'none' }}>
                <span style={{ fontSize:12, fontWeight:700, color:i===0?'#f59e0b':i===1?'#8b949e':i===2?'#b87333':'var(--c-t3)', minWidth:20 }}>#{i+1}</span>
                <span style={{ flex:1, fontSize:13, color:'var(--c-t1)', fontWeight:i<3?600:400 }}>{p.student_name}</span>
                <div style={{ width:120, height:6, background:'var(--c-surface2)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:6, background:pct>=80?'#34d399':pct>=60?'#f59e0b':'#ef4444', width:pct+'%', borderRadius:3 }}/>
                </div>
                <span style={{ fontSize:13, fontWeight:700, color:pct>=80?'#34d399':pct>=60?'#f59e0b':'#ef4444', minWidth:36, textAlign:'right' }}>{pct}%</span>
              </div>
            )
          })}
        </div>

        {/* Per-question breakdown */}
        <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:12, padding:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.07em', marginBottom:12 }}>QUESTION BREAKDOWN</div>
          {questions.map((q,qi)=>{
            const correctCount = participants.filter(p=>p.answers?.[qi]?.correct).length
            const pct = participants.length ? Math.round(correctCount/participants.length*100) : 0
            return (
              <div key={qi} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderTop:qi>0?'1px solid var(--c-line)':'none' }}>
                <span style={{ fontSize:11, color:'var(--c-t3)', minWidth:24 }}>Q{qi+1}</span>
                <span style={{ flex:1, fontSize:13, color:'var(--c-t1)', lineHeight:1.4 }}>{q.question}</span>
                <div style={{ width:80, height:5, background:'var(--c-surface2)', borderRadius:3 }}>
                  <div style={{ height:5, background:pct>=70?'#34d399':pct>=50?'#f59e0b':'#ef4444', width:pct+'%', borderRadius:3 }}/>
                </div>
                <span style={{ fontSize:12, fontWeight:600, color:pct>=70?'#34d399':pct>=50?'#f59e0b':'#ef4444', minWidth:36, textAlign:'right' }}>{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return null
}
