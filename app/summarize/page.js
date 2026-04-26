'use client'
import { useState } from 'react'

export default function SummarizePage() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    if (!input.trim()) return
    setLoading(true); setOutput(''); setError('')
    try {
      const res = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'summarizeText', args: [input.trim(), 'paragraph', 300, 'English'] })
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setOutput(typeof data.result === 'string' ? data.result : JSON.stringify(data.result))
    } catch { setError('Something went wrong.') }
    finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Summarize</h1>
      <p className="text-sm text-t2 mb-6">Paste any text, article, or notes and get a clean concise summary.</p>
      <div className="bg-surface border border-line rounded-2xl p-5 mb-4">
        <textarea value={input} onChange={e => setInput(e.target.value)}
          placeholder="Paste text, article content, or notes here..."
          className="w-full h-40 text-sm text-t1 bg-transparent resize-none outline-none placeholder:text-t3" />
      </div>
      <button onClick={run} disabled={loading || !input.trim()}
        className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 flex items-center gap-2">
        {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Summarizing...</> : 'Summarize'}
      </button>
      {error && <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-500">{error}</div>}
      {output && (
        <div className="mt-5 bg-surface border border-line rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[13px] font-bold text-t1">Summary</span>
            <button onClick={() => navigator.clipboard.writeText(output)} className="text-[11px] text-blue-500 font-medium hover:underline">Copy</button>
          </div>
          <p className="text-sm text-t1 leading-relaxed whitespace-pre-wrap">{output}</p>
        </div>
      )}
    </div>
  )
}