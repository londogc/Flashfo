'use client'
import { useState, useRef, useEffect } from 'react'

export default function AITutorPage() {
  const [msgs, setMsgs] = useState([{ role: 'assistant', content: "Hi! I\'m your AI Tutor. Paste some notes or ask me anything about a topic you\'re studying and I\'ll explain, quiz, and adapt to your level." }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function send() {
    const text = input.trim(); if (!text || loading) return
    const newMsgs = [...msgs, { role: 'user', content: text }]
    setMsgs(newMsgs); setInput(''); setLoading(true)
    try {
      const history = msgs.slice(-8).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fn: 'runLearningFeature',
          args: [{ feature: 'tutor', message: text, history }, 'English']
        })
      })
      const data = await res.json()
      const reply = (typeof data.result === 'string' ? data.result : data.result?.message || data.result?.response || data.result?.content) || "I couldn\'t process that. Try asking differently."
      setMsgs(m => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-line bg-surface flex-shrink-0">
        <h1 className="text-base font-bold text-t1">AI Tutor</h1>
        <p className="text-xs text-t2 mt-0.5">Ask anything — explains concepts, quizzes you, and adapts to your level.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mr-3 mt-0.5">AI</div>
            )}
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-700 text-white rounded-tr-sm' : 'bg-surface border border-line text-t1 rounded-tl-sm'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex">
            <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mr-3">AI</div>
            <div className="bg-surface border border-line px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
              {[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-t3 animate-bounce" style={{ animationDelay: i * 0.15 + 's' }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-4 border-t border-line bg-surface flex-shrink-0">
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask a question or paste your notes..."
            rows={1} className="flex-1 bg-surface2 border border-line rounded-xl px-4 py-2.5 text-sm text-t1 resize-none outline-none focus:border-blue-400 transition-colors placeholder:text-t3"
            style={{ minHeight: '42px', maxHeight: '120px' }} />
          <button onClick={send} disabled={loading || !input.trim()}
            className="h-[42px] w-10 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2L2 8l5 2 2 4 5-12z" /></svg>
          </button>
        </div>
        <p className="text-center text-[10px] text-t3 mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}