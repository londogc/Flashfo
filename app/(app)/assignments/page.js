'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { rpc } from '@/lib/api'

// ── Shared helpers ────────────────────────────────────────────────────────────

function timeUntil(d) {
  if (!d) return null
  const ms = new Date(d) - Date.now()
  if (ms < 0) return 'Overdue'
  const h = Math.floor(ms / 3600000)
  if (h < 24) return `Due in ${h}h`
  return `Due in ${Math.floor(h / 24)}d`
}

function statusColor(s) {
  return { not_started:'#6b7280', in_progress:'#f59e0b', submitted:'#34d399', graded:'#818cf8' }[s] || '#6b7280'
}
function statusLabel(s) {
  return { not_started:'Not started', in_progress:'In progress', submitted:'Submitted', graded:'Graded' }[s] || s
}

const inp = { width:'100%', padding:'9px 12px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:10, fontSize:13, color:'var(--c-t1)', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
const btn = (bg='#6366f1', col='#fff') => ({ height:36, padding:'0 16px', background:bg, color:col, border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' })
const card = { background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:14, padding:20 }

// ── Student view ──────────────────────────────────────────────────────────────

function StudentAssignments({ user }) {
  const [submissions, setSubmissions] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [active,      setActive]      = useState(null)
  const [answers,     setAnswers]     = useState({})
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => { loadSubmissions() }, [user.id])

  async function loadSubmissions() {
    setLoading(true)
    const { data } = await supabase
      .from('assignment_submissions')
      .select('*, assignment:homework_assignments(*)')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
    setSubmissions(data || [])
    setLoading(false)
  }

  async function openAssignment(sub) {
    setAnswers(sub.answers || {})
    setActive(sub)
    setSubmitError('')
  }

  async function saveProgress() {
    if (!active) return
    await supabase.from('assignment_submissions')
      .update({ answers, status: 'in_progress' })
      .eq('id', active.id)
    setSubmissions(s => s.map(x => x.id === active.id ? { ...x, answers, status:'in_progress' } : x))
  }

  async function submitAssignment() {
    if (!active) return
    setSubmitting(true); setSubmitError('')
    const qs = active.assignment?.content?.questions || []
    const unanswered = qs.filter((_, i) => answers[i] === undefined || answers[i] === '')
    if (unanswered.length) {
      setSubmitError(`Please answer all ${qs.length} questions before submitting.`)
      setSubmitting(false); return
    }
    const { error } = await supabase.from('assignment_submissions')
      .update({ answers, status:'submitted', submitted_at: new Date().toISOString() })
      .eq('id', active.id)
    if (error) { setSubmitError(error.message); setSubmitting(false); return }

    const needsNovaGrade = active.assignment?.grader === 'nova'
    if (needsNovaGrade) {
      try {
        const qs2 = active.assignment.content.questions
        const gradePrompt = [
          `Grade this student assignment. Assignment: "${active.assignment.title}"`,
          `Questions and student answers:`,
          qs2.map((q, i) => `Q${i+1} [${q.type}]: ${q.question}\nCorrect answer: ${q.type==='short_answer'?'(open-ended)':q.options?.[q.correct]??q.correct}\nStudent answer: ${answers[i]??'(no answer)'}`).join('\n\n'),
          ``,
          `Return ONLY valid JSON: {"score":0-100,"feedback":{"0":"feedback for Q1","1":"feedback for Q2",...},"summary":"brief overall feedback"}`,
          `For short_answer questions, grade on understanding and completeness. For MC/TF, mark correct/incorrect.`,
        ].join('\n')
        const { result } = await rpc('generateChatResponse', [gradePrompt, 'json'])
        const gradeData = JSON.parse(result.replace(/```json|```/g, '').trim())
        await supabase.from('assignment_submissions')
          .update({ nova_score: gradeData.score, nova_feedback: gradeData.feedback, graded_at: new Date().toISOString() })
          .eq('id', active.id)
      } catch(e) { /* non-critical */ }
    }
    await loadSubmissions()
    setActive(null); setAnswers({})
    setSubmitting(false)
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--c-t3)', fontSize:13 }}>Loading assignments…</div>

  if (active) {
    const qs = active.assignment?.content?.questions || []
    const isSubmitted = active.status === 'submitted' || active.status === 'graded'
    return (
      <div style={{ maxWidth:680, margin:'0 auto', paddingBottom:40 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button onClick={() => { setActive(null); setAnswers({}) }} style={{ ...btn('var(--c-surface2)','var(--c-t2)'), border:'1px solid var(--c-line)', height:32, padding:'0 12px' }}>← Back</button>
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'var(--c-t1)' }}>{active.assignment?.title}</h2>
            <p style={{ margin:'3px 0 0', fontSize:12, color:'var(--c-t3)' }}>{active.assignment?.description}</p>
          </div>
        </div>
        {active.nova_score !== null && active.nova_score !== undefined && (
          <div style={{ ...card, marginBottom:16, background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#818cf8', marginBottom:4 }}>Nova graded your submission</div>
            <div style={{ fontSize:28, fontWeight:700, color:'var(--c-t1)', marginBottom:4 }}>{active.nova_score}/100</div>
            {active.nova_feedback?.summary && <div style={{ fontSize:13, color:'var(--c-t2)' }}>{active.nova_feedback.summary}</div>}
          </div>
        )}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {qs.map((q, i) => (
            <div key={i} style={card}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#818cf8', background:'rgba(99,102,241,0.12)', padding:'2px 7px', borderRadius:6 }}>
                  {q.type?.replace('_',' ')}
                </span>
                <span style={{ fontSize:11, color:'var(--c-t3)' }}>Question {i+1}</span>
              </div>
              <div style={{ fontSize:14, fontWeight:500, color:'var(--c-t1)', marginBottom:12 }}>{q.question}</div>
              {q.type === 'short_answer' && (
                <textarea disabled={isSubmitted} value={answers[i] ?? ''} onChange={e => setAnswers(a => ({ ...a, [i]: e.target.value }))}
                  placeholder="Type your answer here…" rows={3} style={{ ...inp, resize:'vertical', opacity:isSubmitted?0.7:1 }}/>
              )}
              {(q.type === 'multiple_choice' || q.type === 'true_false') && (
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {(q.options || ['True','False']).map((opt, oi) => {
                    const sel      = answers[i] === oi
                    const isCorrect = isSubmitted && oi === q.correct
                    const isWrong   = isSubmitted && sel && oi !== q.correct
                    return (
                      <div key={oi} onClick={() => !isSubmitted && setAnswers(a => ({ ...a, [i]: oi }))}
                        style={{ padding:'9px 14px', borderRadius:9, border:`1px solid ${isCorrect?'rgba(52,211,153,0.4)':isWrong?'rgba(239,68,68,0.4)':sel?'rgba(99,102,241,0.4)':'var(--c-line)'}`, background:isCorrect?'rgba(52,211,153,0.06)':isWrong?'rgba(239,68,68,0.06)':sel?'rgba(99,102,241,0.08)':'var(--c-surface2)', cursor:isSubmitted?'default':'pointer', fontSize:13, color:'var(--c-t1)', display:'flex', alignItems:'center', gap:8 }}>
                        {isCorrect && <span style={{ color:'#34d399' }}>✓</span>}
                        {isWrong   && <span style={{ color:'#ef4444' }}>✗</span>}
                        {opt}
                      </div>
                    )
                  })}
                </div>
              )}
              {isSubmitted && active.nova_feedback?.[String(i)] && (
                <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(99,102,241,0.06)', borderRadius:8, fontSize:12, color:'var(--c-t2)', fontStyle:'italic' }}>
                  Nova: {active.nova_feedback[String(i)]}
                </div>
              )}
            </div>
          ))}
        </div>
        {!isSubmitted && (
          <div style={{ marginTop:20, display:'flex', gap:10 }}>
            <button onClick={submitAssignment} disabled={submitting} style={{ ...btn(), opacity:submitting?0.6:1 }}>
              {submitting ? 'Submitting…' : 'Submit assignment'}
            </button>
            <button onClick={saveProgress} style={{ ...btn('var(--c-surface2)','var(--c-t2)'), border:'1px solid var(--c-line)' }}>
              Save progress
            </button>
          </div>
        )}
        {submitError && <p style={{ fontSize:12, color:'#f87171', marginTop:8 }}>{submitError}</p>}
        {isSubmitted && <div style={{ marginTop:16, fontSize:13, color:'#34d399', fontWeight:600 }}>✓ Submitted {active.submitted_at ? new Date(active.submitted_at).toLocaleDateString() : ''}</div>}
      </div>
    )
  }

  return (
    <div style={{ maxWidth:680, margin:'0 auto', paddingBottom:40 }}>
      <h2 style={{ fontSize:20, fontWeight:700, color:'var(--c-t1)', marginBottom:4 }}>Assignments</h2>
      <p style={{ fontSize:13, color:'var(--c-t3)', marginBottom:20 }}>{submissions.length} assignment{submissions.length !== 1 ? 's' : ''} from your teacher</p>
      {submissions.length === 0 ? (
        <div style={{ ...card, textAlign:'center', padding:48 }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
            </svg>
          </div>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--c-t1)', marginBottom:6 }}>No assignments yet</div>
          <div style={{ fontSize:13, color:'var(--c-t3)' }}>Your teacher will send assignments here after quizzes and lessons.</div>
        </div>
      ) : submissions.map(sub => {
        const overdue = sub.assignment?.due_date && new Date(sub.assignment.due_date) < Date.now() && sub.status !== 'submitted' && sub.status !== 'graded'
        return (
          <div key={sub.id} onClick={() => openAssignment(sub)}
            style={{ ...card, cursor:'pointer', marginBottom:10, display:'flex', alignItems:'center', gap:14, borderColor: overdue ? 'rgba(239,68,68,0.3)' : 'var(--c-line)', transition:'border-color 0.15s' }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'rgba(99,102,241,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
              </svg>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--c-t1)', marginBottom:2 }}>{sub.assignment?.title}</div>
              <div style={{ fontSize:11, color:'var(--c-t3)' }}>
                {sub.assignment?.content?.questions?.length || 0} questions
                {sub.assignment?.due_date && ` · ${timeUntil(sub.assignment.due_date)}`}
                {sub.nova_score !== null && sub.nova_score !== undefined && ` · Score: ${sub.nova_score}/100`}
              </div>
            </div>
            <div style={{ padding:'3px 10px', borderRadius:20, background:statusColor(sub.status)+'18', border:`1px solid ${statusColor(sub.status)}44`, fontSize:11, fontWeight:600, color:statusColor(sub.status), flexShrink:0 }}>
              {statusLabel(sub.status)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Teacher view ──────────────────────────────────────────────────────────────

function TeacherAssignments({ user }) {
  const [assignments,  setAssignments]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [active,       setActive]       = useState(null)
  const [submissions,  setSubmissions]  = useState([])
  const [subLoading,   setSubLoading]   = useState(false)
  const [teacherNote,  setTeacherNote]  = useState('')
  const [teacherScore, setTeacherScore] = useState('')
  const [grading,      setGrading]      = useState(null)
  const [savingGrade,  setSavingGrade]  = useState(false)
  const [createOpen,   setCreateOpen]   = useState(false)
  const [newForm,      setNewForm]      = useState({ title:'', instructions:'', topic:'', grade_level:'', grading_mode:'completion', grader:'nova', due_date:'' })
  const [classrooms,   setClassrooms]   = useState([])
  const [classroomId,  setClassroomId]  = useState('')
  const [creating,     setCreating]     = useState(false)
  const [createError,  setCreateError]  = useState('')

  useEffect(() => {
    loadAssignments()
    supabase.from('classrooms').select('id,name').eq('teacher_id', user.id).then(({ data }) => setClassrooms(data || []))
  }, [user.id])

  async function loadAssignments() {
    setLoading(true)
    const { data } = await supabase
      .from('homework_assignments')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
    setAssignments(data || [])
    setLoading(false)
  }

  async function openAssignment(a) {
    setActive(a); setSubLoading(true); setGrading(null); setTeacherNote(''); setTeacherScore('')
    const { data } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('assignment_id', a.id)
      .order('submitted_at', { ascending: false })
    setSubmissions(data || [])
    setSubLoading(false)
  }

  async function saveTeacherGrade(subId) {
    setSavingGrade(true)
    await supabase.from('assignment_submissions').update({
      teacher_score: teacherScore ? parseInt(teacherScore) : null,
      teacher_note:  teacherNote,
      graded_at:     new Date().toISOString(),
    }).eq('id', subId)
    setSubmissions(s => s.map(x => x.id === subId ? { ...x, teacher_score: parseInt(teacherScore), teacher_note: teacherNote } : x))
    setGrading(null); setSavingGrade(false)
  }

  async function createNovaAssignment() {
    if (!newForm.title.trim() || !newForm.topic.trim()) { setCreateError('Title and topic are required.'); return }
    setCreating(true); setCreateError('')
    try {
      const prompt = [
        `You are a teacher creating a homework assignment on "${newForm.topic}" for ${newForm.grade_level || 'high school'} students.`,
        `${newForm.instructions ? `Teacher instructions: ${newForm.instructions}` : ''}`,
        `Create a SHORT focused assignment (8-12 questions) with a mix of short answer, multiple choice, and true/false.`,
        `Return ONLY valid JSON: {"title":"...","instructions":"...","questions":[{"type":"short_answer"|"multiple_choice"|"true_false","question":"...","options":["A","B","C","D"],"correct":0,"topic":"..."}]}`,
        `For short_answer omit options and correct. For true_false, options=["True","False"].`,
      ].join('\n')
      const { result } = await rpc('generateChatResponse', [prompt, 'json'])
      const content = JSON.parse(result.replace(/```json|```/g, '').trim())
      const { error: aErr } = await supabase.from('homework_assignments').insert({
        teacher_id:    user.id,
        classroom_id:  classroomId || null,
        title:         content.title,
        description:   content.instructions,
        type:          'nova_assignment',
        content,
        nova_generated: true,
        grading_mode:  newForm.grading_mode,
        grader:        newForm.grader,
        due_date:      newForm.due_date || null,
        status:        'open',
      })
      if (aErr) throw aErr
      setCreateOpen(false)
      setNewForm({ title:'', instructions:'', topic:'', grade_level:'', grading_mode:'completion', grader:'nova', due_date:'' })
      await loadAssignments()
    } catch(e) {
      setCreateError(e.message?.includes('free_limit') ? "You've reached your generation limit." : 'Failed: ' + (e.message || 'Unknown error'))
    }
    setCreating(false)
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--c-t3)', fontSize:13 }}>Loading…</div>

  if (active) {
    return (
      <div style={{ maxWidth:720, margin:'0 auto', paddingBottom:40 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button onClick={() => setActive(null)} style={{ ...btn('var(--c-surface2)','var(--c-t2)'), border:'1px solid var(--c-line)', height:32, padding:'0 12px' }}>← Back</button>
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'var(--c-t1)' }}>{active.title}</h2>
            <p style={{ margin:'3px 0 0', fontSize:12, color:'var(--c-t3)' }}>
              {submissions.filter(s=>s.status==='submitted'||s.status==='graded').length} / {submissions.length} submitted
              {active.due_date && ` · Due ${new Date(active.due_date).toLocaleDateString()}`}
            </p>
          </div>
        </div>
        {subLoading
          ? <div style={{ padding:30, textAlign:'center', color:'var(--c-t3)' }}>Loading submissions…</div>
          : submissions.length === 0
            ? <div style={{ ...card, textAlign:'center', padding:36, color:'var(--c-t3)', fontSize:13 }}>No submissions yet.</div>
            : submissions.map(sub => (
              <div key={sub.id} style={{ ...card, marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:sub.status==='submitted'||sub.status==='graded'?12:0 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--c-t1)' }}>{sub.student_name || 'Student'}</div>
                    <div style={{ fontSize:11, color:'var(--c-t3)' }}>
                      {statusLabel(sub.status)}
                      {sub.submitted_at && ` · ${new Date(sub.submitted_at).toLocaleString()}`}
                      {sub.nova_score !== null && sub.nova_score !== undefined && ` · Nova score: ${sub.nova_score}/100`}
                      {sub.teacher_score !== null && sub.teacher_score !== undefined && ` · Your score: ${sub.teacher_score}/100`}
                    </div>
                  </div>
                  {(sub.status === 'submitted' || sub.status === 'graded') && active.grader === 'teacher' && (
                    <button onClick={() => { setGrading(sub.id); setTeacherNote(sub.teacher_note||''); setTeacherScore(sub.teacher_score?.toString()||'') }}
                      style={{ ...btn('rgba(99,102,241,0.12)','#818cf8'), border:'1px solid rgba(99,102,241,0.25)', fontSize:12, height:30 }}>
                      {sub.teacher_score !== null ? 'Edit grade' : 'Grade'}
                    </button>
                  )}
                </div>
                {(sub.status === 'submitted' || sub.status === 'graded') && sub.answers && (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {active.content?.questions?.map((q, i) => (
                      <div key={i} style={{ padding:'10px 12px', background:'var(--c-surface2)', borderRadius:9, border:'1px solid var(--c-line)' }}>
                        <div style={{ fontSize:12, color:'var(--c-t3)', marginBottom:4 }}>Q{i+1}: {q.question}</div>
                        <div style={{ fontSize:13, color:'var(--c-t1)', fontWeight:500 }}>
                          {q.type === 'short_answer' ? (sub.answers[i] || '—') : q.options ? q.options[sub.answers[i]] ?? '—' : '—'}
                        </div>
                        {sub.nova_feedback?.[String(i)] && (
                          <div style={{ fontSize:11, color:'#818cf8', marginTop:5, fontStyle:'italic' }}>Nova: {sub.nova_feedback[String(i)]}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {grading === sub.id && (
                  <div style={{ marginTop:14, padding:14, background:'rgba(99,102,241,0.06)', borderRadius:10, border:'1px solid rgba(99,102,241,0.2)' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:10, marginBottom:10 }}>
                      <input type="number" min="0" max="100" placeholder="Score /100" value={teacherScore} onChange={e=>setTeacherScore(e.target.value)} style={inp}/>
                      <input placeholder="Feedback note for student" value={teacherNote} onChange={e=>setTeacherNote(e.target.value)} style={inp}/>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={()=>saveTeacherGrade(sub.id)} disabled={savingGrade} style={{ ...btn(), height:32, fontSize:12 }}>Save grade</button>
                      <button onClick={()=>setGrading(null)} style={{ ...btn('var(--c-surface2)','var(--c-t2)'), border:'1px solid var(--c-line)', height:32, fontSize:12 }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))
        }
      </div>
    )
  }

  return (
    <div style={{ maxWidth:720, margin:'0 auto', paddingBottom:40 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:'var(--c-t1)', margin:0 }}>Assignments</h2>
          <p style={{ fontSize:13, color:'var(--c-t3)', margin:'4px 0 0' }}>{assignments.length} total</p>
        </div>
        <button onClick={()=>setCreateOpen(true)} style={btn()}>+ Create with Nova</button>
      </div>

      {createOpen && (
        <div style={{ ...card, marginBottom:20, border:'1px solid rgba(99,102,241,0.25)', background:'rgba(99,102,241,0.04)' }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--c-t1)', marginBottom:14 }}>New assignment — Nova will generate it</div>
          <div style={{ display:'grid', gap:10, marginBottom:10 }}>
            <input placeholder="Assignment title" value={newForm.title} onChange={e=>setNewForm(f=>({...f,title:e.target.value}))} style={inp}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <input placeholder="Topic (e.g. Photosynthesis)" value={newForm.topic} onChange={e=>setNewForm(f=>({...f,topic:e.target.value}))} style={inp}/>
              <input placeholder="Grade level (e.g. AP Biology)" value={newForm.grade_level} onChange={e=>setNewForm(f=>({...f,grade_level:e.target.value}))} style={inp}/>
            </div>
            <textarea placeholder="Instructions or special notes (optional)" value={newForm.instructions} onChange={e=>setNewForm(f=>({...f,instructions:e.target.value}))} rows={2} style={{ ...inp, height:'auto', padding:'9px 12px', resize:'vertical' }}/>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {classrooms.length > 0 && (
                <select value={classroomId} onChange={e=>setClassroomId(e.target.value)} style={{ ...inp, height:38, padding:'0 10px' }}>
                  <option value="">No class</option>
                  {classrooms.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <select value={newForm.grading_mode} onChange={e=>setNewForm(f=>({...f,grading_mode:e.target.value}))} style={{ ...inp, height:38, padding:'0 10px' }}>
                <option value="completion">For completion</option>
                <option value="accuracy">For accuracy</option>
              </select>
              <select value={newForm.grader} onChange={e=>setNewForm(f=>({...f,grader:e.target.value}))} style={{ ...inp, height:38, padding:'0 10px' }}>
                <option value="nova">Nova grades</option>
                <option value="teacher">I grade</option>
              </select>
              <input type="datetime-local" value={newForm.due_date} onChange={e=>setNewForm(f=>({...f,due_date:e.target.value}))} style={{ ...inp, height:38, padding:'0 10px' }}/>
            </div>
          </div>
          {createError && <p style={{ fontSize:12, color:'#f87171', margin:'0 0 10px' }}>{createError}</p>}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={createNovaAssignment} disabled={creating} style={{ ...btn(), opacity:creating?0.6:1 }}>
              {creating ? 'Nova is generating…' : 'Generate & save'}
            </button>
            <button onClick={()=>{setCreateOpen(false);setCreateError('')}} style={{ ...btn('var(--c-surface2)','var(--c-t2)'), border:'1px solid var(--c-line)' }}>Cancel</button>
          </div>
        </div>
      )}

      {assignments.length === 0 ? (
        <div style={{ ...card, textAlign:'center', padding:48 }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--c-t1)', marginBottom:6 }}>No assignments yet</div>
          <div style={{ fontSize:13, color:'var(--c-t3)', marginBottom:16 }}>Create one with Nova or assign tasks after a live quiz.</div>
          <button onClick={()=>setCreateOpen(true)} style={btn()}>Create with Nova</button>
        </div>
      ) : assignments.map(a => {
        const subCount = a.target_student_ids?.length || 0
        return (
          <div key={a.id} onClick={() => openAssignment(a)} style={{ ...card, cursor:'pointer', marginBottom:10, display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:40, height:40, borderRadius:12, background: a.nova_generated?'rgba(99,102,241,0.12)':'rgba(16,185,129,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a.nova_generated?'#818cf8':'#34d399'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
              </svg>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--c-t1)', marginBottom:2 }}>{a.title}</div>
              <div style={{ fontSize:11, color:'var(--c-t3)' }}>
                {a.nova_generated ? 'Nova generated' : 'Manual'}
                {' · '}{a.content?.questions?.length || 0} questions
                {subCount > 0 && ` · ${subCount} student${subCount!==1?'s':''}`}
                {a.due_date && ` · Due ${new Date(a.due_date).toLocaleDateString()}`}
                {a.grader === 'nova' ? ' · Nova grades' : ' · You grade'}
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-t3)" strokeWidth="1.8" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AssignmentsPage() {
  const { user, profile, loading } = useAuth()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Render identically on server + client until mounted — prevents React hydration mismatch #425
  if (!mounted || loading || !user) return (
    <div style={{ padding:60, textAlign:'center', color:'var(--c-t3)', fontSize:13 }}>Loading…</div>
  )

  const role = profile?.role || 'student'
  return (
    <div style={{ padding:'28px 24px', maxWidth:1100, margin:'0 auto' }}>
      {role === 'teacher' ? <TeacherAssignments user={user}/> : <StudentAssignments user={user}/>}
    </div>
  )
}
