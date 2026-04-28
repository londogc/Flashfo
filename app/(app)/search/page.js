'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function SearchInner() {
  const searchParams = useSearchParams()
  const [q, setQ]           = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [page, setPage]       = useState(1)
  const PER_PAGE = 6
  const didAutoSearch = useRef(false)

  useEffect(() => {
    const param = searchParams.get('q')
    if (param && !didAutoSearch.current) {
      didAutoSearch.current = true
      setQ(param)
      doSearch(param)
    }
  }, [searchParams])

  async function doSearch(query) {
    const term = (query || q).trim()
    if (!term) return
    setLoading(true); setResults([]); setError(''); setPage(1)
    try {
      const res = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&srlimit=18&format=json&origin=*`
      )
      const data = await res.json()
      const items = (data?.query?.search || []).map(item => ({
        title:   item.title,
        snippet: item.snippet?.replace(/<[^>]+>/g, '') || '',
        url:     'https://en.wikipedia.org/wiki/' + encodeURIComponent(item.title.replace(/ /g, '_')),
      }))
      if (!items.length) { setError('No results found. Try a different search term.'); setLoading(false); return }
      setResults(items)
    } catch {
      setError('Search failed. Please try again.')
    } finally { setLoading(false) }
  }

  const totalPages  = Math.ceil(results.length / PER_PAGE)
  const pageResults = results.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Search</h1>
      <p className="text-sm text-t2 mb-6">Search Wikipedia for sources and research.</p>

      <form onSubmit={e => { e.preventDefault(); doSearch() }} className="flex gap-2 mb-5">
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search for any topic, question, or keyword..."
          className="flex-1 h-10 bg-surface border border-line rounded-xl px-4 text-sm text-t1 outline-none focus:border-blue-400 transition-colors placeholder:text-t3"/>
        <button type="submit" disabled={loading || !q.trim()}
          className="h-10 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {results.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-[12px] text-t3">{results.length} Wikipedia results</span>
        </div>
      )}

      {error && <p className="text-sm text-t3 text-center py-6">{error}</p>}

      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface border border-line rounded-xl p-4 animate-pulse">
              <div className="h-2 bg-surface2 rounded w-16 mb-3"/>
              <div className="h-3 bg-surface2 rounded w-3/4 mb-2"/>
              <div className="h-2 bg-surface2 rounded w-full mb-1"/>
              <div className="h-2 bg-surface2 rounded w-2/3"/>
            </div>
          ))}
        </div>
      )}

      {!loading && pageResults.length > 0 && (
        <div className="space-y-3">
          {pageResults.map((item, i) => (
            <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
              className="block bg-surface border border-line rounded-xl p-4 hover:border-blue-300/50 hover:shadow-sm transition-all group">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">Wikipedia</span>
                <span className="text-[10px] text-t3">en.wikipedia.org</span>
              </div>
              <div className="text-[13px] font-semibold text-blue-500 mb-1 group-hover:underline">{item.title}</div>
              <div className="text-[12px] text-t2 leading-relaxed">{item.snippet}</div>
            </a>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }} disabled={page === 1}
            className="h-8 px-3 bg-surface border border-line text-t2 text-sm rounded-lg disabled:opacity-30 hover:bg-surface2 transition-colors">← Prev</button>
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} onClick={() => { setPage(i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className={`h-8 w-8 text-sm rounded-lg border transition-colors ${page === i + 1 ? 'bg-blue-700 text-white border-blue-700' : 'bg-surface border-line text-t2 hover:bg-surface2'}`}>
              {i + 1}
            </button>
          ))}
          <button onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }} disabled={page === totalPages}
            className="h-8 px-3 bg-surface border border-line text-t2 text-sm rounded-lg disabled:opacity-30 hover:bg-surface2 transition-colors">Next →</button>
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-6 text-t3 text-sm">Loading...</div>}>
      <SearchInner />
    </Suspense>
  )
}
