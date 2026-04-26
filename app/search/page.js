'use client'
import { useState } from 'react'

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function search() {
    if (!q.trim()) return
    setLoading(true); setResults([]); setError('')
    try {
      const res = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'searchWebSources', args: [q.trim(), 'English'] })
      })
      const data = await res.json()
      const list = Array.isArray(data.result) ? data.result : (data.result?.results || [])
      setResults(list)
      if (!list.length) setError('No results found. Try a different search.')
    } catch { setError('Search failed. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Search</h1>
      <p className="text-sm text-t2 mb-6">Search the web for sources, articles, and research material.</p>
      <div className="flex gap-2 mb-6">
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Search for any topic, question, or keyword..."
          className="flex-1 h-10 bg-surface border border-line rounded-xl px-4 text-sm text-t1 outline-none focus:border-blue-400 transition-colors placeholder:text-t3" />
        <button onClick={search} disabled={loading || !q.trim()}
          className="h-10 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      {error && <p className="text-sm text-t3 text-center py-4">{error}</p>}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((item, i) => (
            <a key={i} href={item.url || '#'} target="_blank" rel="noopener noreferrer"
              className="block bg-surface border border-line rounded-xl p-4 hover:border-blue-300/50 transition-all">
              <div className="text-[13px] font-semibold text-blue-500 mb-1">{item.title || item.name || 'Result ' + (i + 1)}</div>
              <div className="text-[12px] text-t2 leading-relaxed">{item.snippet || item.description || ''}</div>
              {item.url && <div className="text-[10px] text-t3 mt-1.5 truncate">{item.url}</div>}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}