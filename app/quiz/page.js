'use client'
import { useState } from 'react'

const TYPES = [
  { id: 'mcq',        label: 'Multiple Choice', config: n => ({ mcq: n }) },
  { id: 'true_false', label: 'True / False',    config: n => ({ true_false: n }) },
  { id: 'mixed',      label: 'Mixed',            config: n => ({ mcq: Math.ceil(n/2), true_false: Math.floor(n/2) }) },
]

function SpeakerBtn({ text }) {
  const [busy, setBusy] = useState(false)
  async function speak() {
    if (busy || !text) return
    setBusy(true)
    try {
      const res = await fetch('/api/rpc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'generateOpenAITtsAudio', args: [text, 'nova', 1] })
      })
      const data = await res.json()
      const audio = new Audio('data:audio/mp3;base64,' + data.result.audio)
      audio.onended = () => setBusy(false)
      audio.play()
    } catch { setBusy(false) }
  }
  return (
    <button onClick={e => { e.stopPropagation(); speak() }} title="Listen"
      className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full hover:bg-blue-500/10 transition-colors"
      style={{ color: busy ? '#93c5fd' : '#60a5fa', opacity: busy ? 0.6 : 1 }}>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 6h2.5L8 4v8L5.5 10H3V6z"/>
        {busy ? <path d="M10 6.5a2 2 0 010 3"/> : <><path d="M10 5a4 4 0 010 6"/><path d="M12.5 3a7 7 0 010 10"/></>}
      </svg>
    </button>
  )
}

function AnswerKeyModal({ questions, topic, onClose }) {
  function printKey() {
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head><title>Answer Key — ${topic}</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 720px; margin: 40px auto; color: #111; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      .subtitle { font-size: 13px; color: #666; margin-bottom: 28px; }
      .question { margin-bottom: 20px; page-break-inside: avoid; }
      .q-text { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
      .option { font-size: 13px; padding: 4px 8px; border-radius: 6px; margin-bottom: 4px; }
      .correct { background: #d1fae5; color: #065f46; font-weight: 600; }
      .other { color: #555; }
      .explanation { font-size: 12px; color: #666; margin-top: 6px; padding: 6px 10px; background: #f9fafb; border-radius: 6px; }
      @media print { body { margin: 20px; } }
    </style></head><body>
    <h1>Answer Key</h1>
    <div class="subtitle">${topic} · ${questions.length} questions</div>
    ${questions.map((q, i) => `
      <div class="question">
        <div class="q-text">${i+1}. ${q.question}</div>
        ${(q.options || ['True','False']).map((opt, j) => `
          <div class="option ${j === q.answerIndex ? 'correct' : 'other'}">
            ${['A','B','C','D'][j]}. ${opt}${j === q.answerIndex ? ' ✓' : ''}
          </div>
        `).join('')}
        ${q.explanation ? `<div class="explanation"><strong>Explanation:</strong> ${q.explanation}</div>` : ''}
      </div>
    `).join('')}
    </body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', padding: '24px 16px', overflowY: 'auto' }}>
      <div className="bg-surface border border-line rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-line">
          <div>
            <div className="text-base font-bold text-t1">Answer Key</div>
            <div className="text-[12px] text-t3 mt-0.5">{topic} · {questions.length} questions</div>
          </div>
          <div className="flex gap-2">
            <button onClick={printKey}
              className="h-8 px-3 bg-blue-700 text-white text-[12px] font-semibold rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 6V2h8v4M4 11H2V6h12v5h-2M4 9h8v5H4V9z"/>
              </svg>
              Print
            </button>
            <button onClick={onClose}
              className="h-8 w-8 flex items-center justify-center text-t3 hover:text-t1 hover:bg-surface2 rounded-lg transition-colors text-lg">✕</button>
          </div>
        </div>
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {questions.map((q, i) => (
            <div key={i} className="border border-line rounded-xl p-4">
              <p className="text-sm font-semibold text-t1 mb-3">{i+1}. {q.question}</p>
              <div className="space-y-1.5">
                {(q.options || ['True','False']).map((opt, j) => (
                  <div key={j} className={`px-3 py-2 rounded-lg text-[13px] flex items-center gap-2 ${j === q.answerIndex ? 'bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-300/50' : 'text-t3'}`}>
                    <span className="font-bold w-4">{['A','B','C','D'][j]}.</span>
                    {opt}
                    {j === q.answerIndex && <span className="ml-auto text-emerald-500 text-xs font-bold">✓ Correct</span>}
                  </div>
                ))}
              </div>
              {q.explanation && (
                <div className="mt-3 text-[11px] text-t2 bg-surface2 px-3 py-2 rounded-lg border border-line">
                  <span className="font-semibold text-t1">Explanation: </span>{q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function QuizPage() {
  const [topic, setTopic]         = useState('')
  const [qType, setQType]         = useState(TYPES[0])
  const [count, setCount]         = useState(5)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading]     = useState(false)
  const [selected, setSelected]   = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]         = useState('')
  const [showKey, setShowKey]     = useState(false)
  const [editMode, setEditMode]   = useState(false)
  const [editData, setEditData]   = useState([])

  async function generate() {
    if (!topic.trim()) return
    setLoading(true); setQuestions([]); setSelected({}); setSubmitted(false); setError(''); setShowKey(false); setEditMode(false)
    try {
      const res = await fetch('/api/rpc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'generateQuizAdvancedFromText', args: [topic.trim(), qType.config(count), 'English'] })
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      const qs = data.result?.questions || []
      if (!qs.length) { setError('Could not generate quiz. Try adding more detail.'); return }
      setQuestions(qs)
    } catch { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  function startEdit() {
    setEditData(questions.map(q => ({ ...q, options: [...(q.options || ['True','False'])] })))
    setEditMode(true)
  }
  function saveEdit() {
    setQuestions(editData)
    setEditMode(false)
    setSelected({}); setSubmitted(false)
  }

  const score = submitted ? questions.filter((q, i) => selected[i] === q.answerIndex).length : 0
  const pct   = submitted && questions.length ? Math.round((score / questions.length) * 100) : 0

  if (editMode) return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-t1">Edit Questions</h2>
        <div className="flex gap-2">
          <button onClick={saveEdit} className="h-8 px-3 bg-blue-700 text-white text-[12px] font-semibold rounded-lg hover:bg-blue-800 transition-colors">Save Changes</button>
          <button onClick={() => setEditMode(false)} className="h-8 px-3 bg-surface border border-line text-t2 text-[12px] rounded-lg hover:bg-surface2 transition-colors">Cancel</button>
        </div>
      </div>
      <div className="space-y-4">
        {editData.map((q, i) => (
          <div key={i} className="bg-surface border border-line rounded-xl p-4">
            <div className="text-[10px] font-bold text-t3 uppercase mb-1">Question {i+1}</div>
            <textarea value={q.question} onChange={e => setEditData(d => d.map((item, idx) => idx===i ? {...item, question: e.target.value} : item))}
              className="w-full text-sm text-t1 bg-surface2 border border-line rounded-lg p-2 resize-none outline-none focus:border-blue-400 mb-3" rows={2}/>
            <div className="text-[10px] font-bold text-t3 uppercase mb-1">Options (click ✓ to mark correct)</div>
            <div className="space-y-1.5">
              {q.options.map((opt, j) => (
                <div key={j} className="flex items-center gap-2">
                  <button onClick={() => setEditData(d => d.map((item, idx) => idx===i ? {...item, answerIndex: j} : item))}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] flex-shrink-0 transition-colors ${q.answerIndex===j ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-line text-t3 hover:border-emerald-400'}`}>
                    {q.answerIndex===j ? '✓' : ['A','B','C','D'][j]}
                  </button>
                  <input value={opt} onChange={e => setEditData(d => d.map((item, idx) => {
                    if (idx !== i) return item
                    const opts = [...item.options]; opts[j] = e.target.value; return {...item, options: opts}
                  }))}
                  className="flex-1 h-8 text-[13px] text-t1 bg-surface2 border border-line rounded-lg px-2 outline-none focus:border-blue-400"/>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Quiz</h1>
      <p className="text-sm text-t2 mb-6">Generate a quiz on any topic and test your knowledge.</p>

      {showKey && <AnswerKeyModal questions={questions} topic={topic} onClose={() => setShowKey(false)} />}

      {!questions.length ? (
        <div className="bg-surface border border-line rounded-2xl p-5">
          <textarea value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="Enter a topic or paste notes to generate a quiz from..."
            className="w-full h-28 text-sm text-t1 bg-transparent resize-none outline-none placeholder:text-t3 mb-5"/>
          <div className="grid grid-cols-2 gap-6 mb-5">
            <div>
              <div className="text-[11px] font-semibold text-t3 uppercase tracking-wider mb-2">Question Type</div>
              <div className="flex flex-col gap-1.5">
                {TYPES.map(t => (
                  <button key={t.id} onClick={() => setQType(t)}
                    className={`h-8 px-3 rounded-lg text-[12px] font-medium border text-left transition-all ${qType.id === t.id ? 'bg-blue-700 text-white border-blue-700' : 'bg-surface2 text-t2 border-line hover:border-blue-300'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-semibold text-t3 uppercase tracking-wider">Number of Questions</div>
                <div className="text-[18px] font-bold text-blue-600 leading-none">{count}</div>
              </div>
              <input type="range" min={3} max={35} step={1} value={count}
                onChange={e => setCount(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer" style={{ height: 4 }}/>
              <div className="flex justify-between text-[10px] text-t3 mt-1.5">
                <span>3</span><span>10</span><span>20</span><span>35</span>
              </div>
            </div>
          </div>
          {error && <div className="mb-3 text-sm text-red-500">{error}</div>}
          <button onClick={generate} disabled={loading || !topic.trim()}
            className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 flex items-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Generating...</> : `Generate ${count} Questions`}
          </button>
        </div>
      ) : (
        <div>
          {submitted && (
            <div className={`mb-5 p-4 rounded-xl border text-sm font-semibold ${pct===100?'bg-emerald-500/10 border-emerald-500/20 text-emerald-600':pct>=60?'bg-blue-500/10 border-blue-500/20 text-blue-600':'bg-amber-500/10 border-amber-500/20 text-amber-600'}`}>
              {score}/{questions.length} correct ({pct}%) — {pct===100?'🎉 Perfect!':pct>=60?'Good job! Keep studying.':'Keep practising — review the explanations below.'}
            </div>
          )}
          <div className="space-y-4 mb-6">
            {questions.map((q, i) => (
              <div key={i} className="bg-surface border border-line rounded-xl p-4">
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-[10px] font-bold bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full uppercase flex-shrink-0 mt-0.5">{q.type||'mcq'}</span>
                  <p className="text-sm font-semibold text-t1 flex-1">{i+1}. {q.question}</p>
                  <SpeakerBtn text={q.question} />
                </div>
                <div className="space-y-2">
                  {(q.options||['True','False']).map((opt, j) => {
                    const isSel = selected[i]===j, isCorr = q.answerIndex===j
                    let cls = 'border-line text-t2 hover:border-blue-300 hover:bg-surface2'
                    if (submitted) {
                      if (isCorr) cls = 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      else if (isSel) cls = 'border-red-400 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                      else cls = 'border-line text-t3 opacity-60'
                    } else if (isSel) cls = 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                    return (
                      <button key={j} onClick={() => !submitted && setSelected(s => ({...s,[i]:j}))}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border text-[13px] transition-all ${cls}`}>
                        <span className="font-semibold mr-2">{['A','B','C','D'][j]}.</span>{opt}
                      </button>
                    )
                  })}
                </div>
                {submitted && q.explanation && (
                  <div className="mt-3 text-[11px] text-t2 bg-surface2 px-3 py-2 rounded-lg border border-line">
                    <span className="font-semibold text-t1">Explanation: </span>{q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {!submitted && (
              <button onClick={() => setSubmitted(true)} disabled={Object.keys(selected).length===0}
                className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40">
                Submit Answers
              </button>
            )}
            <button onClick={() => setShowKey(true)}
              className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl hover:bg-surface2 transition-colors flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 4v4m0 2.5v.5"/>
              </svg>
              View Answer Key
            </button>
            {!submitted && (
              <button onClick={startEdit}
                className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl hover:bg-surface2 transition-colors">
                Edit Questions
              </button>
            )}
            <button onClick={() => { setQuestions([]); setError('') }}
              className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl hover:bg-surface2 transition-colors">
              New Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
