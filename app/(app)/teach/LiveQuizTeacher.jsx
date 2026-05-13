'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { rpc } from '@/lib/api'

// ── Assign Task Modal ─────────────────────────────────────────────────────────
function AssignTaskModal({ participants, questions, session, user, onClose }) {
  const [step, setStep] = useState('config') // config | preview | sending | done
  const [selectedStudents, setSelectedStudents] = useState(
    participants.filter(p => p.status === 'struggling' || p.status === 'at_risk').map(p => p.participant.id)
  )
  const [gradingMode, setGradingMode] = useState('completion') // 'accuracy' | 'completion'
  const [grader, setGrader] = useState('nova') // 'nova' | 'teacher'
  const [dueDate, setDueDate] = useState('')
  const [generatedContent, setGeneratedContent] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [sending, setSending] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editText, setEditText] = useState('')
  const [classrooms, setClassrooms] = useState([])
  const [classroomId, setClassroomId] = useState(session?.classroom_id || '')

  useEffect(() => {
    supabase.from('classrooms').select('id,name').eq('teacher_id', user.id).then(({ data }) => setClassrooms(data || []))
  }, [user.id])

  const selectedParticipants = participants.filter(p => selectedStudents.includes(p.participant.id))

  async function generateAssignment() {
    if (!selectedParticipants.length) { setGenError('Select at least one student.'); return }
    setGenerating(true); setGenError('')
    try {
      // Build per-student weak area summary for Nova
      const studentWeakAreas = selectedParticipants.map(({ participant: p, topicScores }) => {
        const sorted = Object.entries(topicScores)
          .map(([topic, d]) => ({ topic, pct: d.total ? Math.round(d.correct / d.total * 100) : 0 }))
          .filter(t => t.pct < 80)
          .sort((a, b) => a.pct - b.pct)
        return `${p.student_name}: ${sorted.map(t => `${t.topic} (${t.pct}%)`).join(', ') || 'general review'}`
      }).join('\n')

      const prompt = [
        `You are a teacher creating a personalized homework assignment after a "${session?.title || 'quiz'}" quiz.`,
        `These students need extra practice:`,
        studentWeakAreas,
        ``,
        `Create a SHORT focused assignment (8-12 questions total) that:`,
        `- Heavily covers the weakest topics (most questions on lowest scores)`,
        `- Includes a few questions on secondary weak areas`,
        `- Mix of: short answer (explain in your own words), multiple choice (4 options), and true/false`,
        `- Each question is clearly labeled with its type`,
        ``,
        `Return ONLY valid JSON in this exact format, no markdown:`,
        `{"title":"...","instructions":"...","questions":[{"type":"short_answer"|"multiple_choice"|"true_false","question":"...","options":["A","B","C","D"],"correct":0,"topic":"..."}]}`,
        `For short_answer, omit options and correct. For true_false, options=["True","False"], correct=0 or 1.`,
      ].join('\n')

      const { result } = await rpc('generateChatResponse', [prompt, 'json'])
      const clean = result.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setGeneratedContent(parsed)
      setEditText(JSON.stringify(parsed, null, 2))
      setStep('preview')
    } catch (e) {
      setGenError(e.message?.includes('free_limit') ? "You've reached your generation limit." : 'Generation failed. Please try again.')
    }
    setGenerating(false)
  }

  async function sendAssignment() {
    setSending(true)
    let content = generatedContent
    if (editMode) {
      try { content = JSON.parse(editText) } catch { setSending(false); setGenError('Invalid JSON — fix the format before sending.'); return }
    }
    try {
      // Create one assignment record
      const { data: assignment, error: aErr } = await supabase.from('homework_assignments').insert({
        teacher_id: user.id,
        classroom_id: classroomId || null,
        title: content.title,
        description: content.instructions,
        type: 'nova_assignment',
        content,
        nova_generated: true,
        grading_mode: gradingMode,
        grader,
        due_date: dueDate || null,
        source_session_id: session?.id || null,
        target_student_ids: selectedParticipants.map(p => p.participant.user_id).filter(Boolean),
        weak_topics: [...new Set(content.questions.map(q => q.topic).filter(Boolean))],
        status: 'open',
      }).select().single()
      if (aErr) throw aErr

      // Create a submission stub for each targeted student (so they can see it)
      const stubs = selectedParticipants
        .filter(p => p.participant.user_id)
        .map(p => ({
          assignment_id: assignment.id,
          student_id: p.participant.user_id,
          student_name: p.participant.student_name,
          status: 'not_started',
        }))
      if (stubs.length) await supabase.from('assignment_submissions').insert(stubs)

      // Send notification to each student
      const notifs = selectedParticipants
        .filter(p => p.participant.user_id)
        .map(p => ({
          user_id: p.participant.user_id,
          type: 'assignment',
          category: 'Homework',
          title: `New assignment: ${content.title}`,
          body: content.instructions || '',
          link: '/student-portal',
        }))
      if (notifs.length) await supabase.from('notifications').insert(notifs)

      setStep('done')
    } catch (e) {
      setGenError('Failed to send: ' + (e.message || 'Unknown error'))
    }
    setSending(false)
  }

  const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }
  const modal  = { background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:16, width:'100%', maxWidth:600, maxHeight:'85vh', overflowY:'auto', padding:28 }
  const btn = (bg, col='#fff') => ({ height:36, padding:'0 18px', background:bg, color:col, border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' })

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:'var(--c-t1)' }}>
            {step === 'done' ? '✓ Assignment sent!' : step === 'preview' ? 'Review assignment' : 'Assign task'}
          </h3>
          <button onClick={onClose} style={{ ...btn('var(--c-surface2)','var(--c-t2)'), border:'1px solid var(--c-line)', height:30, padding:'0 12px' }}>✕</button>
        </div>

        {step === 'done' && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
            <div style={{ fontSize:15, fontWeight:600, color:'var(--c-t1)', marginBottom:8 }}>Assignment delivered!</div>
            <div style={{ fontSize:13, color:'var(--c-t2)', marginBottom:20 }}>
              Sent to {selectedParticipants.length} student{selectedParticipants.length !== 1 ? 's' : ''}. They'll see it on their dashboard and receive a notification.
            </div>
            <button onClick={onClose} style={btn('#6366f1')}>Done</button>
          </div>
        )}

        {step === 'config' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Send to</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:180, overflowY:'auto' }}>
                {participants.map(({ participant: p, status }) => {
                  const meta = { struggling:'#ef4444', at_risk:'#f59e0b', completed:'#60a5fa', excelling:'#34d399' }
                  const sel = selectedStudents.includes(p.id)
                  return (
                    <div key={p.id} onClick={() => setSelectedStudents(s => sel ? s.filter(id=>id!==p.id) : [...s, p.id])}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:10, cursor:'pointer',
                        background:sel?'rgba(99,102,241,0.08)':'var(--c-surface2)', border:`1px solid ${sel?'rgba(99,102,241,0.3)':'var(--c-line)'}` }}>
                      <div style={{ width:16, height:16, borderRadius:4, border:`1.5px solid ${sel?'#818cf8':'var(--c-line)'}`, background:sel?'#6366f1':'transparent', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {sel && <svg width="9" height="9" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>}
                      </div>
                      <span style={{ flex:1, fontSize:13, color:'var(--c-t1)' }}>{p.student_name}</span>
                      <span style={{ fontSize:10, fontWeight:600, color:meta[status] }}>{status.replace('_',' ')}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Grading</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                {[['accuracy','For accuracy'],['completion','For completion']].map(([val,lbl])=>(
                  <div key={val} onClick={()=>setGradingMode(val)} style={{ padding:'10px 12px', borderRadius:10, border:`1px solid ${gradingMode===val?'rgba(99,102,241,0.4)':'var(--c-line)'}`, background:gradingMode===val?'rgba(99,102,241,0.08)':'var(--c-surface2)', cursor:'pointer' }}>
                    <div style={{ fontSize:12, fontWeight:600, color:gradingMode===val?'#818cf8':'var(--c-t1)' }}>{lbl}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[['nova','Let Nova grade'],['teacher','Grade it myself']].map(([val,lbl])=>(
                  <div key={val} onClick={()=>setGrader(val)} style={{ padding:'10px 12px', borderRadius:10, border:`1px solid ${grader===val?'rgba(99,102,241,0.4)':'var(--c-line)'}`, background:grader===val?'rgba(99,102,241,0.08)':'var(--c-surface2)', cursor:'pointer' }}>
                    <div style={{ fontSize:12, fontWeight:600, color:grader===val?'#818cf8':'var(--c-t1)' }}>{lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Due date <span style={{ fontWeight:400, textTransform:'none' }}>(optional)</span></div>
              <input type="datetime-local" value={dueDate} onChange={e=>setDueDate(e.target.value)}
                style={{ width:'100%', height:38, padding:'0 12px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:10, fontSize:13, color:'var(--c-t1)', boxSizing:'border-box' }}/>
            </div>

            {classrooms.length > 0 && (
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Class <span style={{ fontWeight:400, textTransform:'none' }}>(optional)</span></div>
                <select value={classroomId} onChange={e=>setClassroomId(e.target.value)}
                  style={{ width:'100%', height:38, padding:'0 12px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:10, fontSize:13, color:'var(--c-t1)' }}>
                  <option value="">No class selected</option>
                  {classrooms.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {genError && <p style={{ fontSize:12, color:'#f87171', margin:0 }}>{genError}</p>}
            <button onClick={generateAssignment} disabled={generating || !selectedStudents.length}
              style={{ ...btn('#6366f1'), opacity: generating||!selectedStudents.length ? 0.6 : 1 }}>
              {generating ? 'Nova is generating…' : `Generate assignment for ${selectedStudents.length} student${selectedStudents.length!==1?'s':''}`}
            </button>
          </div>
        )}

        {step === 'preview' && generatedContent && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:12, padding:16 }}>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--c-t1)', marginBottom:4 }}>{generatedContent.title}</div>
              <div style={{ fontSize:12, color:'var(--c-t2)' }}>{generatedContent.instructions}</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:280, overflowY:'auto' }}>
              {generatedContent.questions?.map((q, i) => (
                <div key={i} style={{ background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#818cf8', background:'rgba(99,102,241,0.12)', padding:'2px 7px', borderRadius:6 }}>
                      {q.type?.replace('_',' ')}
                    </span>
                    {q.topic && <span style={{ fontSize:10, color:'var(--c-t3)' }}>{q.topic}</span>}
                  </div>
                  <div style={{ fontSize:13, color:'var(--c-t1)', marginBottom:q.options?8:0 }}>{q.question}</div>
                  {q.options && <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {q.options.map((opt, oi) => (
                      <div key={oi} style={{ fontSize:12, color: oi===q.correct?'#34d399':'var(--c-t3)', paddingLeft:8 }}>
                        {oi===q.correct?'✓ ':'  '}{opt}
                      </div>
                    ))}
                  </div>}
                </div>
              ))}
            </div>
            {editMode && (
              <textarea value={editText} onChange={e=>setEditText(e.target.value)} rows={8}
                style={{ width:'100%', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:10, padding:'10px 12px', fontSize:12, color:'var(--c-t1)', fontFamily:'monospace', resize:'vertical', boxSizing:'border-box' }}/>
            )}
            {genError && <p style={{ fontSize:12, color:'#f87171', margin:0 }}>{genError}</p>}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button onClick={sendAssignment} disabled={sending} style={{ ...btn('#6366f1'), opacity:sending?0.6:1 }}>
                {sending ? 'Sending…' : 'Send to students'}
              </button>
              <button onClick={()=>setEditMode(e=>!e)} style={{ ...btn('var(--c-surface2)','var(--c-t2)'), border:'1px solid var(--c-line)' }}>
                {editMode ? 'Hide editor' : 'Edit assignment'}
              </button>
              <button onClick={()=>setStep('config')} style={{ ...btn('var(--c-surface2)','var(--c-t2)'), border:'1px solid var(--c-line)' }}>← Back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function genCode() {
  const subjects = ['BIO','CHM','MTH','ENG','HIS','PHY','GEO','SCI','ART','LIT']
  const s = subjects[Math.floor(Math.random()*subjects.length)]
  const n = Math.random().toString(36).slice(2,5).toUpperCase()
  return s+'-'+n
}

const MODES = [
  { id:'review', label:'⚡ Review Quiz', desc:'Live paced, class answers together, see scores instantly' },
  { id:'exam',   label:'📝 Exam',        desc:'Student-paced, private, submit when done, no live reveals' },
]

export default function LiveQuizTeacher() {
  const { user } = useAuth()
  // ── Setup state ──────────────────────────────────────────────────────────
  const [quizMode,    setQuizMode]    = useState('review') // 'review' | 'exam'
  const [phase,       setPhase]       = useState('setup')  // setup | lobby | active | results
  const [title,       setTitle]       = useState('')
  const [subject,     setSubject]     = useState('')
  const [topic,       setTopic]       = useState('')
  const [paceMode,    setPaceMode]    = useState('timer')   // 'timer' | 'manual'
  const [timerSecs,   setTimerSecs]   = useState(90)
  const [questions,   setQuestions]   = useState([])
  const [generating,  setGenerating]  = useState(false)
  const [session,     setSession]     = useState(null)
  const [participants,setParticipants]= useState([])
  const [assignOpen,  setAssignOpen]  = useState(false)
  // Review-mode active state
  const [qIdx,        setQIdx]        = useState(0)
  const [timeLeft,    setTimeLeft]    = useState(90)
  const [timerActive, setTimerActive] = useState(false)
  // Question bank
  const [qBank,       setQBank]       = useState([])
  const [showBank,    setShowBank]    = useState(false)
  const [bankTitle,   setBankTitle]   = useState('')
  const [savingBank,  setSavingBank]  = useState(false)

  const channelRef = useRef(null)
  const timerRef   = useRef(null)
  const pollRef    = useRef(null)

  useEffect(() => { if (user) loadQBank() }, [user])

  const loadQBank = async () => {
    const { data } = await supabase.from('quiz_question_bank').select('*')
      .eq('teacher_id', user.id).order('created_at', { ascending: false })
    if (data) setQBank(data)
  }

  // ── Nova generate ─────────────────────────────────────────────────────────
  const generateQuestions = async () => {
    if (!topic.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/nova-quiz', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ topic, subject, count: 10 })
      })
      const data = await res.json()
      if (data.questions) setQuestions(data.questions)
    } catch(e) { console.error(e) }
    setGenerating(false)
  }

  // ── Question bank ─────────────────────────────────────────────────────────
  const saveToBank = async () => {
    if (!questions.length || !bankTitle.trim()) return
    setSavingBank(true)
    await supabase.from('quiz_question_bank').insert({ teacher_id:user.id, title:bankTitle, subject, questions })
    await loadQBank()
    setBankTitle(''); setSavingBank(false)
  }

  const updateQuestion = (idx,field,val) => setQuestions(p=>p.map((q,i)=>i===idx?{...q,[field]:val}:q))
  const updateOption   = (qi,oi,val)    => setQuestions(p=>p.map((q,i)=>i===qi?{...q,options:q.options.map((o,x)=>x===oi?val:o)}:q))
  const addQuestion    = ()             => setQuestions(p=>[...p,{question:'',options:['A ','B ','C ','D '],correct:0,explanation:''}])
  const removeQuestion = idx            => setQuestions(p=>p.filter((_,i)=>i!==idx))

  // ── Launch session ────────────────────────────────────────────────────────
  const launchSession = async () => {
    if (!questions.length || !title.trim()) return
    const code = genCode()
    const { data: sess } = await supabase.from('quiz_sessions').insert({
      teacher_id: user.id, session_code: code, title, subject,
      questions, pace_mode: quizMode === 'exam' ? 'exam' : paceMode,
      timer_seconds: timerSecs, status: 'lobby',
      mode: quizMode,
    }).select().single()
    if (!sess) return
    setSession(sess)
    setPhase('lobby')
    startPolling(sess.id)
    if (quizMode === 'review') subscribeReview(code, sess.id)
  }

  // ── Polling (shared) ──────────────────────────────────────────────────────
  const startPolling = (sessionId) => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const { data } = await supabase.from('quiz_participants').select('*')
        .eq('session_id', sessionId).order('joined_at')
      if (data) setParticipants(data)
    }, 3000)
  }

  // ── Review: realtime channel ──────────────────────────────────────────────
  const subscribeReview = useCallback((code, sessionId) => {
    const ch = supabase.channel('quiz:'+code)
      .on('broadcast', { event:'student_answered' }, ({ payload }) => {
        setParticipants(prev => prev.map(p =>
          p.id === payload.participantId ? {...p, _lastAnswered: payload.qIdx} : p
        ))
      }).subscribe()
    channelRef.current = ch
  }, [])

  // ── Review: timer ─────────────────────────────────────────────────────────
  const startTimer = (secs) => {
    setTimeLeft(secs); setTimerActive(true)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if(t<=1){clearInterval(timerRef.current);setTimerActive(false);return 0} return t-1 })
    }, 1000)
  }

  useEffect(() => {
    if (quizMode!=='review'||paceMode!=='timer'||phase!=='active'||timerActive||timeLeft>0) return
    if (qIdx < questions.length-1) nextQuestion()
    else endQuiz()
  }, [timeLeft, timerActive])

  useEffect(() => {
    if (quizMode!=='review'||paceMode!=='timer'||phase!=='active'||!participants.length) return
    const answered = participants.filter(p=>p.answers&&Object.keys(p.answers).includes(String(qIdx))).length
    if (answered >= participants.length && participants.length > 0) {
      clearInterval(timerRef.current); setTimerActive(false)
      setTimeout(() => { if(qIdx<questions.length-1) nextQuestion(); else endQuiz() }, 1200)
    }
  }, [participants, qIdx])

  // ── Review: start / next / end ────────────────────────────────────────────
  const startReview = async () => {
    await supabase.from('quiz_sessions').update({ status:'active', current_question_idx:0, question_started_at:new Date().toISOString() }).eq('id', session.id)
    setPhase('active'); setQIdx(0)
    channelRef.current?.send({ type:'broadcast', event:'next_question', payload:{ idx:0, question:questions[0], timer:timerSecs } })
    if (paceMode==='timer') startTimer(timerSecs)
  }

  const nextQuestion = async () => {
    const next = qIdx+1
    setQIdx(next)
    await supabase.from('quiz_sessions').update({ current_question_idx:next, question_started_at:new Date().toISOString() }).eq('id', session.id)
    channelRef.current?.send({ type:'broadcast', event:'next_question', payload:{ idx:next, question:questions[next], timer:timerSecs } })
    if (paceMode==='timer') startTimer(timerSecs)
  }

  // ── Compute per-topic breakdown from participant answer data ─────────────
  const computeTopicBreakdown = (parts, qs) => {
    return parts.map(p => {
      const topicScores = {}
      qs.forEach((q, qi) => {
        const topic = q.topic || `Question ${qi + 1}`
        if (!topicScores[topic]) topicScores[topic] = { correct: 0, total: 0 }
        topicScores[topic].total++
        if (p.answers?.[qi]?.correct) topicScores[topic].correct++
      })
      const totalCorrect = Object.values(topicScores).reduce((s, t) => s + t.correct, 0)
      const totalQs = qs.length
      const scorePct = totalQs ? Math.round(totalCorrect / totalQs * 100) : 0
      const status = scorePct >= 80 ? 'excelling' : scorePct >= 65 ? 'completed' : scorePct >= 45 ? 'at_risk' : 'struggling'
      return { participant: p, topicScores, totalCorrect, totalQs, scorePct, status }
    })
  }

  const saveSessionResults = async (parts, qs, sess) => {
    if (!parts?.length || !qs?.length) return
    const breakdown = computeTopicBreakdown(parts, qs)
    const rows = breakdown.map(({ participant: p, topicScores, totalCorrect, totalQs, scorePct, status }) => ({
      session_id: sess.id,
      teacher_id: user.id,
      student_id: p.user_id || null,
      student_name: p.student_name || 'Unknown',
      session_title: sess.title,
      classroom_id: sess.classroom_id || null,
      topic_scores: topicScores,
      total_correct: totalCorrect,
      total_qs: totalQs,
      score_pct: scorePct,
      status,
    }))
    try { await supabase.from('quiz_session_results').insert(rows) }
    catch(e) { console.error('Failed to save session results:', e) }
  }

  const endQuiz = async () => {
    clearInterval(timerRef.current)
    await supabase.from('quiz_sessions').update({ status:'ended' }).eq('id', session.id)
    channelRef.current?.send({ type:'broadcast', event:'end_quiz', payload:{} })
    const { data } = await supabase.from('quiz_participants').select('*').eq('session_id', session.id).order('score', { ascending:false })
    if (data) { setParticipants(data); await saveSessionResults(data, questions, session) }
    setPhase('results')
    clearInterval(pollRef.current)
  }

  // ── Exam: administer ──────────────────────────────────────────────────────
  const administerExam = async () => {
    await supabase.from('quiz_sessions').update({ status:'active' }).eq('id', session.id)
    setPhase('active')
    // Keep polling so we see who's started and who's submitted
  }

  const endExam = async () => {
    await supabase.from('quiz_sessions').update({ status:'ended' }).eq('id', session.id)
    const { data } = await supabase.from('quiz_participants').select('*').eq('session_id', session.id).order('score', { ascending:false })
    if (data) { setParticipants(data); await saveSessionResults(data, questions, session) }
    setPhase('results')
    clearInterval(pollRef.current)
  }

  useEffect(() => () => {
    clearInterval(timerRef.current)
    clearInterval(pollRef.current)
    channelRef.current?.unsubscribe()
  }, [])

  // ── Shared UI helpers ─────────────────────────────────────────────────────
  const card = (children, extra={}) => (
    <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:14, padding:20, marginBottom:16, ...extra }}>
      {children}
    </div>
  )

  const maxScore = questions.length * 100

  // ─────────────────────────────────────────────────────────────────────────
  // SETUP
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'setup') return (
    <div style={{ maxWidth:720, margin:'0 auto', paddingBottom:40 }}>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:18, fontWeight:700, color:'var(--c-t1)', margin:0 }}>Live Quiz Setup</h2>
        <p style={{ fontSize:13, color:'var(--c-t2)', marginTop:2 }}>Create a session code and launch for your class</p>
      </div>

      {/* Mode picker */}
      {card(<>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.07em', marginBottom:10 }}>SESSION TYPE</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {MODES.map(m=>(
            <button key={m.id} onClick={()=>setQuizMode(m.id)}
              style={{ padding:'14px 16px', borderRadius:10, border:'2px solid '+(quizMode===m.id?'#2563eb':'var(--c-line)'), background:quizMode===m.id?'rgba(37,99,235,0.07)':'var(--c-surface2)', cursor:'pointer', textAlign:'left' }}>
              <div style={{ fontSize:14, fontWeight:700, color:quizMode===m.id?'#3b82f6':'var(--c-t1)', marginBottom:4 }}>{m.label}</div>
              <div style={{ fontSize:11, color:'var(--c-t3)', lineHeight:1.5 }}>{m.desc}</div>
            </button>
          ))}
        </div>
      </>)}

      {/* Session config */}
      {card(<>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:quizMode==='review'?14:0 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.07em', display:'block', marginBottom:6 }}>QUIZ TITLE *</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Chapter 5 Review"
              style={{ width:'100%', height:38, background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:8, padding:'0 12px', color:'var(--c-t1)', fontSize:13, outline:'none', boxSizing:'border-box' }}/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.07em', display:'block', marginBottom:6 }}>SUBJECT</label>
            <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. AP Biology"
              style={{ width:'100%', height:38, background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:8, padding:'0 12px', color:'var(--c-t1)', fontSize:13, outline:'none', boxSizing:'border-box' }}/>
          </div>
        </div>

        {/* Pace mode — review only */}
        {quizMode === 'review' && (<>
          <div style={{ marginBottom:0 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.07em', display:'block', marginBottom:8 }}>PACE MODE</label>
            <div style={{ display:'flex', gap:8 }}>
              {[['timer','⏱ Timer-paced (default)'],['manual','🖐 Manual control']].map(([v,l])=>(
                <button key={v} onClick={()=>setPaceMode(v)}
                  style={{ flex:1, height:38, borderRadius:8, border:'1px solid '+(paceMode===v?'#2563eb':'var(--c-line)'), background:paceMode===v?'rgba(37,99,235,0.1)':'var(--c-surface2)', color:paceMode===v?'#3b82f6':'var(--c-t2)', fontSize:12, fontWeight:paceMode===v?600:400, cursor:'pointer' }}>
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
        </>)}

        {quizMode === 'exam' && (
          <div style={{ marginTop:12, padding:'10px 12px', background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:8 }}>
            <span style={{ fontSize:12, color:'#f59e0b' }}>📋 Exam mode — students work at their own pace. No timers, no live answer reveals. Each student's view is private.</span>
          </div>
        )}
      </>)}

      {/* Question bank */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
        <button onClick={()=>setShowBank(v=>!v)}
          style={{ height:32, padding:'0 14px', borderRadius:8, border:'1px solid var(--c-line)', background:'var(--c-surface)', color:'var(--c-t2)', fontSize:12, cursor:'pointer' }}>
          📋 Question Bank ({qBank.length})
        </button>
      </div>

      {showBank && qBank.length > 0 && card(
        <>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.07em', marginBottom:10 }}>SAVED SETS</div>
          {qBank.map(b=>(
            <div key={b.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', borderRadius:8, background:'var(--c-surface2)', marginBottom:6 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--c-t1)' }}>{b.title}</div>
                <div style={{ fontSize:11, color:'var(--c-t3)', marginTop:2 }}>{b.questions.length} questions{b.subject?' · '+b.subject:''}</div>
              </div>
              <button onClick={()=>{setQuestions(b.questions);setShowBank(false)}}
                style={{ padding:'5px 12px', borderRadius:7, background:'var(--c-surface)', border:'1px solid var(--c-line)', color:'var(--c-t2)', fontSize:12, cursor:'pointer' }}>
                Load
              </button>
            </div>
          ))}
        </>
      )}

      {/* Question builder */}
      {card(<>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--c-t1)' }}>Questions ({questions.length})</div>
          <button onClick={addQuestion}
            style={{ height:32, padding:'0 12px', borderRadius:7, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t2)', fontSize:12, cursor:'pointer' }}>
            + Add manually
          </button>
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
          <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:380, overflowY:'auto' }}>
            {questions.map((q,qi)=>(
              <div key={qi} style={{ background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:10, padding:12 }}>
                <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'var(--c-t3)', minWidth:20, marginTop:6 }}>Q{qi+1}</span>
                  <input value={q.question} onChange={e=>updateQuestion(qi,'question',e.target.value)}
                    style={{ flex:1, background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:7, padding:'6px 10px', color:'var(--c-t1)', fontSize:13, outline:'none' }}/>
                  <button onClick={()=>removeQuestion(qi)} style={{ width:24, height:24, borderRadius:5, border:'1px solid var(--c-line)', background:'none', color:'var(--c-t3)', cursor:'pointer', fontSize:12, flexShrink:0, marginTop:2 }}>×</button>
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
          <div style={{ display:'flex', gap:8, marginTop:12, paddingTop:12, borderTop:'1px solid var(--c-line)' }}>
            <input value={bankTitle} onChange={e=>setBankTitle(e.target.value)} placeholder="Save these questions as..."
              style={{ flex:1, height:32, background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:7, padding:'0 10px', color:'var(--c-t1)', fontSize:12, outline:'none' }}/>
            <button onClick={saveToBank} disabled={savingBank||!bankTitle.trim()}
              style={{ height:32, padding:'0 12px', borderRadius:7, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t2)', fontSize:12, cursor:'pointer', opacity:savingBank||!bankTitle.trim()?0.5:1 }}>
              {savingBank?'Saving...':'Save to Bank'}
            </button>
          </div>
        )}
      </>)}

      <button onClick={launchSession} disabled={!questions.length||!title.trim()}
        style={{ width:'100%', height:46, borderRadius:10, border:'none', background: quizMode==='exam'?'#d97706':'#2563eb', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', opacity:!questions.length||!title.trim()?0.4:1 }}>
        {quizMode==='exam' ? '📝 Create Exam Session' : '🚀 Launch Review Session'}
      </button>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // LOBBY (shared)
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    const isExam = quizMode === 'exam'
    return (
      <div style={{ maxWidth:560, margin:'0 auto', paddingBottom:40 }}>
        {card(<>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.1em', marginBottom:8, textAlign:'center' }}>
            {isExam ? 'EXAM CODE' : 'SESSION CODE'}
          </div>
          <div style={{ fontSize:48, fontWeight:800, color:'var(--c-t1)', letterSpacing:'0.12em', fontFamily:'monospace', textAlign:'center', marginBottom:8 }}>{session?.session_code}</div>
          <div style={{ fontSize:13, color:'var(--c-t2)', textAlign:'center', marginBottom:16 }}>
            Students go to <strong>flashfo.com/join</strong> and enter this code
          </div>
          {isExam && (
            <div style={{ padding:'10px 14px', background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:8, fontSize:12, color:'#f59e0b', textAlign:'center', marginBottom:12 }}>
              Students won't see questions until you click "Administer Exam" — they'll then be able to hit Start whenever they're ready.
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#34d399' }}/>
            <span style={{ fontSize:14, fontWeight:600, color:'#34d399' }}>{participants.length} student{participants.length!==1?'s':''} joined</span>
          </div>
        </>, { textAlign:'center' })}

        {participants.length > 0 && card(<>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.07em', marginBottom:10 }}>IN THE ROOM</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {participants.map(p=>(
              <div key={p.id} style={{ padding:'5px 12px', borderRadius:20, background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)', fontSize:12, color:'#34d399' }}>
                {p.student_name}
              </div>
            ))}
          </div>
        </>)}

        <button onClick={isExam ? administerExam : startReview} disabled={participants.length===0}
          style={{ width:'100%', height:46, borderRadius:10, border:'none', background:isExam?'#d97706':'#34d399', color:isExam?'#fff':'#0d1117', fontSize:15, fontWeight:700, cursor:'pointer', opacity:participants.length===0?0.4:1 }}>
          {isExam ? '📝 Administer Exam' : 'Start Quiz ('+questions.length+' questions) →'}
        </button>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIVE — REVIEW MODE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'active' && quizMode === 'review') {
    const q = questions[qIdx]
    const total = participants.length
    const answeredThis = participants.filter(p=>p.answers&&p.answers[String(qIdx)]!==undefined).length
    const pct = timerSecs > 0 ? (timeLeft/timerSecs*100) : 0
    return (
      <div style={{ maxWidth:720, margin:'0 auto', paddingBottom:40 }}>
        {card(<>
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
            <span style={{ fontSize:13, color:'#34d399', fontWeight:600 }}>{answeredThis}/{total} answered</span>
          </div>
          <p style={{ fontSize:16, fontWeight:600, color:'var(--c-t1)', lineHeight:1.5, margin:'0 0 14px' }}>{q?.question}</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {q?.options?.map((opt,i)=>{
              const count = participants.filter(p=>p.answers?.[qIdx]?.selected===i).length
              const barPct = total ? (count/total*100) : 0
              return (
                <div key={i} style={{ background:i===q.correct?'rgba(52,211,153,0.07)':'var(--c-surface2)', border:'1px solid '+(i===q.correct?'rgba(52,211,153,0.25)':'var(--c-line)'), borderRadius:8, padding:'8px 12px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', left:0, top:0, height:'100%', width:barPct+'%', background:i===q.correct?'rgba(52,211,153,0.1)':'rgba(139,148,158,0.06)', transition:'width 0.4s ease' }}/>
                  <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:12, color:i===q.correct?'#34d399':'var(--c-t2)' }}>{opt.replace(/^[A-D]s+/,'')}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:'var(--c-t1)' }}>{count}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>)}

        {card(<>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', letterSpacing:'0.07em', marginBottom:10 }}>STUDENTS</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {participants.map(p=>{
              const ans = p.answers?.[qIdx]
              const has = ans !== undefined
              return (
                <div key={p.id} style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:500,
                  background:has?(ans.correct?'rgba(52,211,153,0.1)':'rgba(239,68,68,0.08)'):'var(--c-surface2)',
                  border:'1px solid '+(has?(ans.correct?'rgba(52,211,153,0.3)':'rgba(239,68,68,0.25)'):'var(--c-line)'),
                  color:has?(ans.correct?'#34d399':'#ef4444'):'var(--c-t3)' }}>
                  {has?(ans.correct?'✓':'✗'):'·'} {p.student_name}
                </div>
              )
            })}
          </div>
        </>)}

        <div style={{ display:'flex', gap:10 }}>
          {paceMode==='manual' && (
            <button onClick={()=>qIdx<questions.length-1?nextQuestion():endQuiz()}
              style={{ flex:1, height:44, borderRadius:10, border:'none', background:'#2563eb', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
              {qIdx<questions.length-1?'Next Question →':'End Quiz'}
            </button>
          )}
          {paceMode==='timer' && qIdx<questions.length-1 && (
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

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIVE — EXAM MODE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'active' && quizMode === 'exam') {
    const submitted   = participants.filter(p=>p.completed)
    const inProgress  = participants.filter(p=>!p.completed && p.answers && Object.keys(p.answers).length > 0)
    const notStarted  = participants.filter(p=>!p.completed && (!p.answers || Object.keys(p.answers).length === 0))
    return (
      <div style={{ maxWidth:720, margin:'0 auto', paddingBottom:40 }}>
        {/* Header card */}
        {card(<>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--c-t1)' }}>{session?.title}</div>
              <div style={{ fontSize:12, color:'var(--c-t3)', marginTop:2 }}>Exam in progress · {questions.length} questions</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:24, fontWeight:800, color:'#34d399' }}>{submitted.length}<span style={{ fontSize:13, color:'var(--c-t3)', fontWeight:400 }}>/{participants.length}</span></div>
              <div style={{ fontSize:11, color:'var(--c-t3)' }}>submitted</div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height:6, background:'var(--c-surface2)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:6, background:'#34d399', width:(participants.length?submitted.length/participants.length*100:0)+'%', borderRadius:3, transition:'width 0.5s ease' }}/>
          </div>
        </>)}

        {/* Student status grid */}
        {card(<>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
            {[
              { label:'NOT STARTED', count:notStarted.length, color:'var(--c-t3)', bg:'var(--c-surface2)', border:'var(--c-line)' },
              { label:'IN PROGRESS', count:inProgress.length, color:'#f59e0b', bg:'rgba(245,158,11,0.06)', border:'rgba(245,158,11,0.2)' },
              { label:'SUBMITTED',   count:submitted.length,  color:'#34d399', bg:'rgba(52,211,153,0.06)', border:'rgba(52,211,153,0.2)' },
            ].map(({label,count,color,bg,border})=>(
              <div key={label} style={{ background:bg, border:'1px solid '+border, borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:800, color }}>{count}</div>
                <div style={{ fontSize:10, fontWeight:700, color, letterSpacing:'0.06em', marginTop:2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Per-student rows */}
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {participants.map(p=>{
              const done = p.completed
              const started = !done && p.answers && Object.keys(p.answers).length > 0
              const answered = p.answers ? Object.keys(p.answers).length : 0
              return (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, background:'var(--c-surface2)', border:'1px solid var(--c-line)' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:done?'#34d399':started?'#f59e0b':'#484f58' }}/>
                  <span style={{ flex:1, fontSize:13, color:'var(--c-t1)' }}>{p.student_name}</span>
                  {done ? (
                    <span style={{ fontSize:12, fontWeight:700, color:'#34d399' }}>
                      {Math.round(p.score/maxScore*100)}% · Submitted
                    </span>
                  ) : started ? (
                    <span style={{ fontSize:12, color:'#f59e0b' }}>{answered}/{questions.length} answered</span>
                  ) : (
                    <span style={{ fontSize:12, color:'#484f58' }}>Not started</span>
                  )}
                </div>
              )
            })}
          </div>
        </>)}

        <div style={{ display:'flex', gap:10 }}>
          {submitted.length > 0 && (
            <button onClick={endExam}
              style={{ flex:1, height:44, borderRadius:10, border:'none', background:'#d97706', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
              End Exam & View Results ({submitted.length}/{participants.length} submitted)
            </button>
          )}
          {submitted.length === 0 && (
            <div style={{ flex:1, height:44, borderRadius:10, border:'1px solid var(--c-line)', background:'var(--c-surface2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'var(--c-t3)' }}>
              Waiting for submissions...
            </div>
          )}
          <button onClick={endExam}
            style={{ height:44, padding:'0 18px', borderRadius:10, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.07)', color:'#ef4444', fontSize:13, cursor:'pointer' }}>
            End Exam
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESULTS (shared, adapts label for exam vs review)
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'results') {
    const breakdown = computeTopicBreakdown(participants, questions)
    const topicMastery = {}
    questions.forEach((q, qi) => {
      const topic = q.topic || `Question ${qi + 1}`
      if (!topicMastery[topic]) topicMastery[topic] = { correct: 0, total: 0 }
      topicMastery[topic].total += participants.length
      topicMastery[topic].correct += participants.filter(p => p.answers?.[qi]?.correct).length
    })
    const topicList = Object.entries(topicMastery)
      .map(([name, d]) => ({ name, pct: d.total ? Math.round(d.correct / d.total * 100) : 0 }))
      .sort((a, b) => a.pct - b.pct)
    const statusOrder = { struggling: 0, at_risk: 1, completed: 2, excelling: 3 }
    const studentList = breakdown.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
    const statusMeta = {
      struggling: { label:'Struggling', color:'#ef4444', bg:'rgba(239,68,68,0.12)', border:'rgba(239,68,68,0.3)' },
      at_risk:    { label:'At Risk',    color:'#f59e0b', bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.3)' },
      completed:  { label:'On track',   color:'#60a5fa', bg:'rgba(96,165,250,0.12)', border:'rgba(96,165,250,0.3)' },
      excelling:  { label:'Excelling',  color:'#34d399', bg:'rgba(52,211,153,0.12)', border:'rgba(52,211,153,0.3)' },
    }
    return (
      <div style={{ maxWidth:860, margin:'0 auto', paddingBottom:40 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <h2 style={{ fontSize:20, fontWeight:700, color:'var(--c-t1)', margin:0 }}>{session?.title || 'Quiz Results'}</h2>
            <p style={{ fontSize:12, color:'var(--c-t3)', margin:'4px 0 0' }}>{questions.length} questions · {participants.length} students · {new Date().toLocaleDateString()}</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, height:32, padding:'0 12px', background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.25)', borderRadius:20, fontSize:12, color:'#34d399', fontWeight:600 }}>✓ Quiz complete</div>
            <button onClick={()=>{setPhase('setup');setSession(null);setParticipants([]);setQuestions([]);setQIdx(0)}}
              style={{ height:32, padding:'0 14px', borderRadius:8, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t2)', fontSize:12, cursor:'pointer' }}>New session</button>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:14, padding:20 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--c-t3)', marginBottom:16 }}>Class Topic Mastery</div>
            {topicList.map(({ name, pct }) => (
              <div key={name} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--c-t1)' }}>{name}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:pct>=70?'#34d399':pct>=50?'#f59e0b':'#ef4444' }}>{pct}%</span>
                </div>
                <div style={{ height:8, background:'var(--c-surface2)', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:pct+'%', borderRadius:4, background:pct>=70?'#34d399':pct>=50?'#f59e0b':'#ef4444', transition:'width 0.6s ease' }}/>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:14, padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--c-t3)' }}>Students to Watch</div>
              <button onClick={()=>setAssignOpen(true)} style={{ height:28, padding:'0 12px', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:8, fontSize:11, fontWeight:600, color:'#818cf8', cursor:'pointer' }}>+ Assign task</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:280, overflowY:'auto' }}>
              {studentList.map(({ participant: p, topicScores, status }) => {
                const meta = statusMeta[status]
                const weakTopics = Object.entries(topicScores).filter(([,d])=>d.total>0&&d.correct/d.total<0.6).sort(([,a],[,b]=>a.correct/a.total-b.correct/b.total)).map(([t])=>t)
                return (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:10 }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', background:meta.bg, border:`1px solid ${meta.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:meta.color, flexShrink:0 }}>
                      {(p.student_name||'S').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--c-t1)' }}>{p.student_name}</div>
                      <div style={{ fontSize:11, color:'var(--c-t3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {weakTopics.length ? `Needs help with ${weakTopics[0]}` : 'Strong across all topics'}
                      </div>
                    </div>
                    <div style={{ padding:'3px 10px', borderRadius:20, background:meta.bg, border:`1px solid ${meta.border}`, fontSize:11, fontWeight:600, color:meta.color, flexShrink:0 }}>{meta.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        {card(<>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--c-t3)', marginBottom:14 }}>Question Breakdown</div>
          {questions.map((q,qi)=>{
            const correctCount=participants.filter(p=>p.answers?.[qi]?.correct).length
            const attempted=participants.filter(p=>p.answers?.[qi]!==undefined).length
            const pct=attempted?Math.round(correctCount/attempted*100):0
            return(
              <div key={qi} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderTop:qi>0?'1px solid var(--c-line)':'none' }}>
                <span style={{ fontSize:11, color:'var(--c-t3)', minWidth:28 }}>Q{qi+1}</span>
                <span style={{ flex:1, fontSize:13, color:'var(--c-t1)', lineHeight:1.4 }}>{q.question}</span>
                <span style={{ fontSize:11, color:'var(--c-t3)', whiteSpace:'nowrap' }}>{correctCount}/{attempted} correct</span>
                <div style={{ width:64, height:5, background:'var(--c-surface2)', borderRadius:3 }}>
                  <div style={{ height:5, background:pct>=70?'#34d399':pct>=50?'#f59e0b':'#ef4444', width:pct+'%', borderRadius:3 }}/>
                </div>
                <span style={{ fontSize:12, fontWeight:600, color:pct>=70?'#34d399':pct>=50?'#f59e0b':'#ef4444', minWidth:36, textAlign:'right' }}>{pct}%</span>
              </div>
            )
          })}
        </>)}
        {assignOpen && <AssignTaskModal participants={studentList} questions={questions} session={session} user={user} onClose={()=>setAssignOpen(false)}/>}
      </div>
    )
  }

  return null
}
