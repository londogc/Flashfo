'use client'
import { useState } from 'react'

export default function QuizPage() {
  const [topic, setTopic] = useState('')
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)

  async function generate() {
    if (!topic.trim()) return
    setLoading(true); setQuestions([]); setAnswers({}); setSubmitted(false)
    try {
      const res = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'generateQuizAdvancedFromText', args: [topic.trim(), { format: 'short_answer', count: 5 }, 'English'] })
      })
      const data = await res.json()
      const raw = data.result
      let qs = []
      if (Array.isArray(raw)) qs = raw
      else if (raw?.questions) qs = raw.questions
      else if (typeof raw === 'string') {
        qs = raw.split(/\n/).filter(l => /^\d+\./.test(l.trim())).map(l => ({ question: l, answer: '' }))
      }
      setQuestions(qs.length ? qs : [{ question: 'Could not generate quiz. Try pasting more detailed text.', answer: '' }])
    } catch { setQuestions([{ question: 'Error generating quiz. Please try again.', answer: '' }]) }
    finally { setLoading(false) }
  }

  const getQ = q => q.question || q.front || q.text || q
  const getA = q => q.answer || q.back || q.correctAnswer || ''

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Quiz</h1>
      <p className="text-sm text-t2 mb-6">Generate a quiz on any topic and test your knowledge.</p>

      {!questions.length ? (
        <div className="bg-surface border border-line rounded-2xl p-5">
          <textarea value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="Enter a topic or paste notes to generate a quiz from..."
            className="w-full h-28 text-sm text-t1 bg-transparent resize-none outline-none placeholder:text-t3 mb-4" />
          <button onClick={generate} disabled={loading || !topic.trim()}
            className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 flex items-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</> : 'Generate Quiz'}
          </button>
        </div>
      ) : (
        <div>
          <div className="space-y-4 mb-6">
            {questions.map((q, i) => (
              <div key={i} className="bg-surface border border-line rounded-xl p-4">
                <p className="text-sm font-semibold text-t1 mb-3">{i + 1}. {getQ(q)}</p>
                <textarea rows={2} value={answers[i] || ''} onChange={e => setAnswers(a => ({ ...a, [i]: e.target.value }))}
                  placeholder="Your answer..."
                  className="w-full text-sm text-t1 bg-surface2 border border-line rounded-lg px-3 py-2 outline-none focus:border-blue-400 transition-colors resize-none placeholder:text-t3" />
                {submitted && getA(q) && (
                  <div className="mt-2 text-xs text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-lg">
                    <span className="font-semibold">Answer: </span>{getA(q)}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            {!submitted
              ? <button onClick={() => setSubmitted(true)} className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors">Check Answers</button>
              : <div className="text-sm text-emerald-600 font-medium flex items-center gap-2">✓ Answers revealed above</div>}
            <button onClick={() => setQuestions([])} className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl hover:bg-surface2 transition-colors">New Quiz</button>
          </div>
        </div>
      )}
    </div>
  )
}