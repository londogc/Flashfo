'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const SOURCES = ['All', 'Web', 'Wikipedia']

function SearchInner() {
  const searchParams  = useSearchParams()
  const [q, setQ]     = useState('')
  const [allResults, setAllResults] = useState([])
  const [results, setResults]       = useState([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [page, setPage]             = useState(1)
  const [source, setSource]         = useState('All')
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
    setLoading(true); setAllResults([]); setResults([]); setError(''); setPage(1); setSource('All')

    try {
      // Wikipedia search
      const wikiRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&srlimit=10&format=json&origin=*`
      )
      const wikiData = await wikiRes.json()
      const wikiItems = (wikiData?.query?.search || []).map(item => ({
        title:   item.title,
        snippet: item.snippet?.replace(/<[^>]+>/g, '') || '',
        url:     'https://en.wikipedia.org/wiki/' + encodeURIComponent(item.title.replace(/ /g, '_')),
        source:  'Wikipedia',
      }))

      // DuckDuckGo instant answer API (no key needed, CORS allowed)
      let webItems = []
      try {
        const ddgRes = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(term)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`
        )
        const ddg = await ddgRes.json()
        // RelatedTopics give us web results
        const topics = (ddg.RelatedTopics || []).filter(t => t.FirstURL && t.Text)
        webItems = topics.slice(0, 8).map(t => ({
          title:   t.Text.split(' - ')[0] || t.Text.substring(0, 60),
          snippet: t.Text,
          url:     t.FirstURL,
          source:  'Web',
        }))
        // Also add the main result if exists
        if (ddg.AbstractText && ddg.AbstractURL) {
          webItems.unshift({
            title:   ddg.Heading || term,
            snippet: ddg.AbstractText,
            url:     ddg.AbstractURL,
            source:  'Web',
          })
        }
      } catch { /* DuckDuckGo failed, continue with Wikipedia only */ }

      // Interleave: web first, then wikipedia
      const combined = [...webItems, ...wikiItems]
      if (!combined.length) { setError('No results found. Try a different search term.'); setLoading(false); return }
      setAllResults(combined)
      setResults(combined.slice(0, PER_PAGE))
    } catch (e) {
      setError('Search failed. Please try again.')
    } finally { setLoading(false) }
  }

  function filterSource(s) {
    setSource(s); setPage(1)
    const filtered = s === 'All' ? allResults : allResults.filter(r => r.source === s)
    setResults(filtered.slice(0, PER_PAGE))
  }

  function loadPage(p) {
    setPage(p)
    const filtered = source === 'All' ? allResults : allResults.filter(r => r.source === source)
    setResults(filtered.slice((p - 1) * PER_PAGE, p * PER_PAGE))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filteredAll = source === 'All' ? allResults : allResults.filter(r => r.source === source)
  const totalPages  = Math.ceil(filteredAll.length / PER_PAGE)

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Search</h1>
      <p className="text-sm text-t2 mb-6">Search the web and Wikipedia for sources and research.</p>

      <form onSubmit={e => { e.preventDefault(); doSearch() }} className="flex gap-2 mb-5">
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search for any topic, question, or keyword..."
          className="flex-1 h-10 bg-surface border border-line rounded-xl px-4 text-sm text-t1 outline-none focus:border-blue-400 transition-colors placeholder:text-t3"/>
        <button type="submit" disabled={loading || !q.trim()}
          className="h-10 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Source filter */}
      {allResults.length > 0 && (
        <div className="flex gap-2 mb-5 items-center">
          {SOURCES.map(s => (
            <button key={s} onClick={() => filterSource(s)}
              className={`h-7 px-3 rounded-full text-[12px] font-medium border transition-all ${source === s ? 'bg-blue-700 text-white border-blue-700' : 'bg-surface text-t2 border-line hover:border-blue-300'}`}>
              {s}
              {s !== 'All' && (
                <span className="ml-1 opacity-60">({allResults.filter(r => r.source === s).length})</span>
              )}
            </button>
          ))}
          <span className="ml-auto text-[12px] text-t3">{filteredAll.length} results</span>
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

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map((item, i) => (
            <a key={i} href={item.url || '#'} target="_blank" rel="noopener noreferrer"
              className="block bg-surface border border-line rounded-xl p-4 hover:border-blue-300/50 hover:shadow-sm transition-all group">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  item.source === 'Wikipedia' ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-blue-500/10 text-blue-600'
                }`}>{item.source || 'Web'}</span>
                {item.url && (
                  <span className="text-[10px] text-t3 truncate">
                    {(() => { try { return new URL(item.url).hostname } catch { return '' } })()}
                  </span>
                )}
              </div>
              <div className="text-[13px] font-semibold text-blue-500 mb-1 group-hover:underline">{item.title}</div>
              <div className="text-[12px] text-t2 leading-relaxed">{item.snippet}</div>
            </a>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => loadPage(page - 1)} disabled={page === 1}
            className="h-8 px-3 bg-surface border border-line text-t2 text-sm rounded-lg disabled:opacity-30 hover:bg-surface2 transition-colors">← Prev</button>
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} onClick={() => loadPage(i + 1)}
              className={`h-8 w-8 text-sm rounded-lg border transition-colors ${page===i+1?'bg-blue-700 text-white border-blue-700':'bg-surface border-line text-t2 hover:bg-surface2'}`}>
              {i + 1}
            </button>
          ))}
          <button onClick={() => loadPage(page + 1)} disabled={page === totalPages}
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