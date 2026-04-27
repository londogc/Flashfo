'use client'
import { useState, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

function JoinInner() {
  const searchParams = useSearchParams()
  const [code, setCode]   = useState((searchParams.get('code')||'').toUpperCase())
  const [name, setName]   = useState('')
  const [step, setStep]   = useState('entry')   // entry | quiz | submitted
  const [error, setError] = useState('')
  const [session, setSession]   = useState(null)
  const [classroom, setClassroom] = useState(null)
  const [questions, setQuestions] = useState([])
  const [selected, setSelected] = useState({})   // { [qIdx]: answerIdx }
  const [saInputs, setSaInputs] = useState({})   // { [qIdx]: string }
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)    // { score, total, answers: [{q, chosen, correct, isCorrect}] }
  const nameRef = useRef('')

  async function join() {
    if (!code.trim() || !name.trim()) return
    setStep('loading'); setError('')
    nameRef.current = name.trim()
    const c = code.trim().toUpperCase()
    const { data: cls } = await supabase.from('classrooms').select('*').eq('code', c).maybeSingle()
    if (!cls) { setError('Classroom not found. Check the code and try again.'); setStep('entry'); return }
    const { data: sess } = await supabase.from('classroom_sessions').select('*')
      .eq('classroom_id', cls.id).in('status', ['waiting','active'])
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!sess) { setError('No active session right now. Ask your teacher to start the quiz.'); setStep('entry'); return }
    const qs = sess.quiz_data?.questions || []
    if (!qs.length) { setError('Session has no questions yet.'); setStep('entry'); return }
    setClassroom(cls); setSession(sess); setQuestions(qs)
    if (sess.status === 'waiting') {
      // Poll until teacher distributes
      setStep('waiting')
      const poll = setInterval(async () => {
        const { data } = await supabase.from('classroom_sessions').select('status').eq('id', sess.id).single()
        if (data?.status === 'active') { clearInterval(poll); setStep('quiz') }
        if (data?.status === 'closed') { clearInterval(poll); setError('Session closed.'); setStep('entry') }
      }, 2000)
    } else {
      setStep('quiz')
    }
  }

  async function submit() {
    if (submitting) return
    const unanswered = questions.filter((q,i) => q.type === 'short_answer' ? !saInputs[i]?.trim() : selected[i] === undefined)
    if (unanswered.length > 0) { alert('Please answer all questions before submitting.'); return }
    setSubmitting(true)
    const rows = []
    let score = 0
    const answers = questions.map((q, i) => {
      const isSA = q.type === 'short_answer'
      const chosenIdx = isSA ? null : selected[i]
      const chosenText = isSA ? (saInputs[i] || '') : null
      const isCorrect = isSA ? null : chosenIdx === q.answerIndex   // SA = self-grade later
      if (isCorrect === true) score++
      rows.push({ session_id: session.id, student_name: nameRef.current, question_idx: i, answer_idx: chosenIdx, answer_text: chosenText, is_correct: isCorrect })
      return { q: q.question, type: q.type, chosen: isSA ? chosenText : (q.options || ['True','False'])[chosenIdx], correct: isSA ? q.correctAnswer : (q.options || ['True','False'])[q.answerIndex], isCorrect, isSA }
    })
    try {
      await supabase.from('session_responses').insert(rows)
    } catch(e) { console.error(e) }
    setResult({ score, total: questions.filter(q=>q.type!=='short_answer').length, answers })
    setSubmitting(false)
    setStep('submitted')
  }

  const answered = questions.filter((q,i) => q.type==='short_answer' ? !!saInputs[i]?.trim() : selected[i] !== undefined).length

  // ── Entry ─────────────────────────────────────────────────────────────────
  if (step === 'entry' || step === 'loading') return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'var(--c-bg)'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
<div className="text-3xl font-black mb-1" style={{color:'var(--c-t1)'}}>Flashfo</div>
          <p style={{color:'var(--c-t2)'}} className="text-sm">Join a class quiz</p>
        </div>
        <div className="rounded-2xl border p-6" style={{background:'var(--c-surface)',borderColor:'var(--c-line)'}}>
          <div className="space-y-4 mb-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{color:'var(--c-t3)'}}>Class Code</label>
              <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="e.g. MATH42"
                maxLength={8} autoCapitalize="characters"
                className="w-full h-12 text-2xl font-black text-center tracking-widest rounded-xl border px-3 outline-none uppercase"
                style={{background:'var(--c-surface2)',borderColor:'var(--c-line)',color:'var(--c-t1)'}}
                onFocus={e=>e.target.style.borderColor='#3b82f6'} onBlur={e=>e.target.style.borderColor='var(--c-line)'}/>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{color:'var(--c-t3)'}}>Your Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="First and last name"
                maxLength={40} onKeyDown={e=>e.key==='Enter'&&join()}
                className="w-full h-10 rounded-xl border px-3 text-sm outline-none"
                style={{background:'var(--c-surface2)',borderColor:'var(--c-line)',color:'var(--c-t1)'}}
                onFocus={e=>e.target.style.borderColor='#3b82f6'} onBlur={e=>e.target.style.borderColor='var(--c-line)'}/>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          <button onClick={join} disabled={step==='loading'||!code.trim()||!name.trim()}
            className="w-full h-10 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40 transition-colors">
            {step==='loading'?'Looking up class...':'Join Quiz'}
          </button>
        </div>
        <div className="text-center mt-5">
          <a href="/" className="inline-flex items-center justify-center gap-2 h-9 px-5 rounded-xl border text-sm font-medium transition-colors"
            style={{borderColor:'var(--c-line)',color:'var(--c-t2)',background:'var(--c-surface)'}}>
            ← Back to Flashfo
          </a>
        </div>
      </div>
    </div>
  )

  // ── Waiting for teacher to distribute ────────────────────────────────────
  if (step === 'waiting') return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{background:'var(--c-bg)'}}>
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full border-2 border-blue-200 flex items-center justify-center mx-auto mb-5">
          <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block"/>
        </div>
        <h2 className="text-xl font-bold mb-2" style={{color:'var(--c-t1)'}}>Waiting for your teacher...</h2>
        <p className="text-sm mb-1" style={{color:'var(--c-t2)'}}>{classroom?.name}</p>
        <p className="text-sm" style={{color:'var(--c-t3)'}}>You're in. The quiz will appear when your teacher distributes it.</p>
        <div className="mt-6 px-5 py-3 rounded-xl border inline-block" style={{background:'var(--c-surface)',borderColor:'var(--c-line)'}}>
          <p className="text-xs mb-0.5" style={{color:'var(--c-t3)'}}>Joined as</p>
          <p className="font-bold" style={{color:'var(--c-t1)'}}>{name}</p>
        </div>
      </div>
    </div>
  )

  // ── Quiz ─────────────────────────────────────────────────────────────────
  if (step === 'quiz') return (
    <div className="min-h-screen pb-24" style={{background:'var(--c-bg)'}}>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b px-4 py-3 flex items-center justify-between" style={{background:'var(--c-surface)',borderColor:'var(--c-line)'}}>
        <div>
          <div className="text-sm font-bold" style={{color:'var(--c-t1)'}}>{classroom?.name}</div>
          <div className="text-[11px]" style={{color:'var(--c-t3)'}}>{session?.title || 'Quiz'} · {name}</div>
        </div>
        <div className="text-[12px] font-semibold" style={{color:'var(--c-t2)'}}>{answered}/{questions.length} answered</div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {questions.map((q, i) => {
          const isSA = q.type === 'short_answer'
          const isTF = q.type === 'true_false'
          const opts = q.options || (isTF ? ['True','False'] : [])
          return (
            <div key={i} className="rounded-2xl border p-5" style={{background:'var(--c-surface)',borderColor:'var(--c-line)'}}>
              <div className="flex items-start gap-3 mb-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-700 text-white text-[12px] font-bold flex items-center justify-center">{i+1}</span>
                <p className="text-sm font-semibold leading-relaxed pt-0.5" style={{color:'var(--c-t1)'}}>{q.question}</p>
              </div>
              {isSA ? (
                <textarea value={saInputs[i]||''} onChange={e=>setSaInputs(s=>({...s,[i]:e.target.value}))}
                  placeholder="Type your answer here..." rows={4}
                  className="w-full text-sm rounded-xl border px-3 py-2 resize-none outline-none transition-colors"
                  style={{background:'var(--c-surface2)',borderColor:'var(--c-line)',color:'var(--c-t1)'}}
                  onFocus={e=>e.target.style.borderColor='#3b82f6'} onBlur={e=>e.target.style.borderColor='var(--c-line)'}/>
              ) : (
                <div className="space-y-2">
                  {opts.map((opt,j)=>{
                    const isSel = selected[i]===j
                    return (
                      <button key={j} onClick={()=>setSelected(s=>({...s,[i]:j}))}
                        className="w-full text-left px-4 py-3 rounded-xl border text-[13px] transition-all flex items-center gap-3"
                        style={{
                          background: isSel ? '#eff6ff' : 'var(--c-surface2)',
                          borderColor: isSel ? '#3b82f6' : 'var(--c-line)',
                          color: isSel ? '#1d4ed8' : 'var(--c-t2)'
                        }}>
                        <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-all"
                          style={{borderColor:isSel?'#3b82f6':'var(--c-line)',background:isSel?'#3b82f6':'transparent',color:isSel?'white':'var(--c-t3)'}}>
                          {isSel ? '✓' : ['A','B','C','D'][j]}
                        </span>
                        <span className="font-medium">{opt}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Sticky submit bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t px-4 py-4 flex items-center justify-between" style={{background:'var(--c-surface)',borderColor:'var(--c-line)'}}>
        <p className="text-sm" style={{color:'var(--c-t2)'}}>{answered < questions.length ? questions.length-answered+' question'+(questions.length-answered!==1?'s':'')+' remaining' : 'All answered — ready to submit!'}</p>
        <button onClick={submit} disabled={submitting||answered<questions.length}
          className="h-10 px-6 bg-blue-700 text-white text-sm font-bold rounded-xl hover:bg-blue-800 disabled:opacity-40 transition-colors">
          {submitting ? 'Submitting...' : 'Submit Quiz'}
        </button>
      </div>
    </div>
  )

  // ── Results (private to student) ─────────────────────────────────────────
  if (step === 'submitted' && result) {
    const autoTotal = result.total
    const autoScore = result.score
    const hasSA = result.answers.some(a=>a.isSA)
    const pct = autoTotal > 0 ? Math.round(autoScore/autoTotal*100) : null
    return (
      <div className="min-h-screen pb-10" style={{background:'var(--c-bg)'}}>
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Score card */}
          <div className="rounded-2xl border p-6 mb-6 text-center" style={{background:'var(--c-surface)',borderColor:'var(--c-line)'}}>
            <div className="text-4xl mb-3">{pct===100?'🎉':pct>=70?'✓':'📝'}</div>
            <h1 className="text-2xl font-black mb-1" style={{color:'var(--c-t1)'}}>Quiz Submitted</h1>
            <p className="text-sm mb-4" style={{color:'var(--c-t3)'}}>{classroom?.name} · {session?.title}</p>
            {pct !== null && (
              <div className="inline-flex flex-col items-center px-8 py-4 rounded-xl" style={{background:'var(--c-surface2)'}}>
                <div className="text-4xl font-black text-blue-600 leading-none">{autoScore}/{autoTotal}</div>
                <div className="text-sm font-semibold mt-1" style={{color:'var(--c-t2)'}}>{pct}% — {pct>=90?'Excellent':pct>=80?'Great':pct>=70?'Good':pct>=60?'Fair':'Needs Review'}</div>
              </div>
            )}
            {hasSA && <p className="text-[12px] mt-3" style={{color:'var(--c-t3)'}}>Short answer questions will be reviewed by your teacher.</p>}
          </div>

          {/* Answer review */}
          <h2 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{color:'var(--c-t3)'}}>Answer Review</h2>
          <div className="space-y-3">
            {result.answers.map((a,i)=>(
              <div key={i} className="rounded-xl border p-4" style={{background:'var(--c-surface)',borderColor:'var(--c-line)'}}>
                <div className="flex items-start gap-2 mb-2">
                  {!a.isSA && (
                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{background:a.isCorrect?'#10b981':a.isCorrect===false?'#ef4444':'#6b7280',color:'white'}}>
                      {a.isCorrect?'✓':'✗'}
                    </span>
                  )}
                  <p className="text-sm font-semibold leading-snug flex-1" style={{color:'var(--c-t1)'}}>{i+1}. {a.q}</p>
                </div>
                <div className="pl-7 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px]" style={{color:'var(--c-t3)'}}>Your answer:</span>
                    <span className="text-[12px] font-semibold" style={{color:a.isCorrect?'#10b981':a.isCorrect===false?'#ef4444':'var(--c-t2)'}}>{a.chosen||'(no answer)'}</span>
                  </div>
                  {!a.isSA && !a.isCorrect && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px]" style={{color:'var(--c-t3)'}}>Correct answer:</span>
                      <span className="text-[12px] font-semibold text-emerald-500">{a.correct}</span>
                    </div>
                  )}
                  {a.isSA && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px]" style={{color:'var(--c-t3)'}}>Model answer:</span>
                      <span className="text-[12px]" style={{color:'var(--c-t2)'}}>{a.correct||'Open-ended'}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{background:'var(--c-bg)'}}><span style={{color:'var(--c-t3)'}}>Loading...</span></div>}>
      <JoinInner/>
    </Suspense>
  )
}
