'use client'
import { useState } from 'react'

export default function QuizPage() {
  const [topic, setTopic] = useState('')
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    if (!topic.trim()) return
    setLoading(true); setQuestions([]); setSelected({}); setSubmitted(false); setError('')
    try {
      const res = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'generateQuizAdvancedFromText', args: [topic.trim(), { mcq: 5 }, 'English'] })
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      const qs = data.result?.questions || []
      if (!qs.length) { setError('Could not generate quiz. Try entering more detailed text.'); return }
      setQuestions(qs)
    } catch { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  const score = submitted ? questions.filter((q, i) => selected[i] === q.answerIndex).length : 0

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Quiz</h1>
      <p className="text-sm text-t2 mb-6">Generate a multiple-choice quiz on any topic and test your knowledge.</p>

      {!questions.length ? (
        <div className="bg-surface border border-line rounded-2xl p-5">
          <textarea value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="Enter a topic or paste notes to generate a quiz from..."
            className="w-full h-28 text-sm text-t1 bg-transparent resize-none outline-none placeholder:text-t3 mb-4" />
          {error && <div className="mb-3 text-sm text-red-500">{error}</div>}
          <button onClick={generate} disabled={loading || !topic.trim()}
            className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 flex items-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</> : 'Generate Quiz'}
          </button>
        </div>
      ) : (
        <div>
          {submitted && (
            <div className={`mb-5 p-4 rounded-xl border text-sm font-semibold ${score === questions.length ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : score >= questions.length / 2 ? 'bg-blue-500/10 border-blue-500/20 text-blue-600' : 'bg-amber-500/10 border-amber-500/20 text-amber-600'}`}>
              {score}/{questions.length} correct — {score === questions.length ? 'Perfect score! 🎉' : score >= questions.length / 2 ? 'Good job! Keep studying.' : 'Keep practising — you can do it!'}
            </div>
          )}

          <div className="space-y-4 mb-6">
            {questions.map((q, i) => (
              <div key={i} className="bg-surface border border-line rounded-xl p-4">
                <p className="text-sm font-semibold text-t1 mb-3">{i + 1}. {q.question}</p>
                <div className="space-y-2">
                  {(q.options || []).map((opt, j) => {
                    const isSelected = selected[i] === j
                    const isCorrect = q.answerIndex === j
                    let cls = 'border-line text-t2 hover:border-blue-300 hover:bg-surface2'
                    if (submitted) {
                      if (isCorrect) cls = 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      else if (isSelected) cls = 'border-red-400 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                      else cls = 'border-line text-t3'
                    } else if (isSelected) cls = 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                    return (
                      <button key={j} onClick={() => !submitted && setSelected(s => ({ ...s, [i]: j }))}
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

          <div className="flex gap-3">
            {!submitted
              ? <button onClick={() => setSubmitted(true)} disabled={Object.keys(selected).length === 0}
                  className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40">
                  Submit Answers
                </button>
              : null}
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