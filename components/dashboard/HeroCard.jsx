'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const Opt = ({ icon, label, sub, href }) => (
  <a href={href} className="flex items-center gap-3 p-2.5 bg-white/10 hover:bg-white/[0.16] rounded-xl text-left transition-all w-full group">
    <div className="w-7 h-7 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0 text-white">{icon}</div>
    <div className="min-w-0">
      <div className="text-[12px] font-semibold text-white leading-tight">{label}</div>
      <div className="text-[10px] text-white/55 mt-0.5 leading-tight">{sub}</div>
    </div>
    <svg className="ml-auto w-3 h-3 text-white/30 flex-shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4"/></svg>
  </a>
)

export default function HeroCard() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleSearch(e) {
    e.preventDefault()
    if (query.trim()) router.push('/search?q=' + encodeURIComponent(query.trim()))
  }

  return (
    <div className="bg-surface border border-line rounded-2xl p-6 mb-3.5">
      {/* Desktop: side-by-side. Mobile: stacked */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_290px] gap-5 items-start">

        <div>
          <div className="inline-flex items-center gap-1.5 bg-blue-700/10 text-blue-500 text-[11px] font-semibold px-3 py-1 rounded-full mb-3.5">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"/>Your study workspace
          </div>
          <h1 className="text-[26px] md:text-[30px] font-extrabold text-t1 leading-[1.2] tracking-tight mb-3">
            Learn <span className="text-blue-600 dark:text-blue-400">faster</span> without<br className="hidden md:block"/>juggling a dozen tools.
          </h1>
          <p className="text-[13px] text-t2 leading-relaxed mb-5 max-w-md">
            Flashfo organizes your prompts, sources, saved work, and classroom tools in one calm workspace.
          </p>

          {/* ── Search bar — the centrepiece ── */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-5 max-w-lg">
            <div className="flex-1 flex items-center gap-2 bg-surface2 border border-line rounded-xl px-4 h-11 focus-within:border-blue-400 transition-colors">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-t3 flex-shrink-0">
                <path d="M7 1a6 6 0 100 12A6 6 0 007 1zm7 14l-3-3"/>
              </svg>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search any topic, question, or keyword..."
                className="flex-1 bg-transparent text-sm text-t1 outline-none placeholder:text-t3"
              />
            </div>
            <button type="submit"
              className="h-11 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors flex-shrink-0">
              Search
            </button>
          </form>

          <div className="flex gap-2 flex-wrap">
            <a href="/create" className="h-9 px-5 bg-blue-700 text-white text-[13px] font-semibold rounded-xl hover:bg-blue-800 transition-colors flex items-center">Start creating</a>
            <a href="/study"  className="h-9 px-4 bg-surface2 border border-line text-t2 text-[13px] font-medium rounded-xl hover:bg-bg transition-colors flex items-center">Study something</a>
            <a href="/teach"  className="h-9 px-4 bg-surface2 border border-line text-t2 text-[13px] font-medium rounded-xl hover:bg-bg transition-colors flex items-center">Build for class</a>
          </div>
        </div>

        {/* Right panel — hidden on small mobile, shown md+ */}
        <div className="hidden md:flex bg-[#1e3a8a] rounded-2xl p-4 flex-col gap-2">
          <p className="text-[12px] font-semibold text-white mb-1 leading-snug">Choose the path that fits<br/>what you need.</p>
          <Opt href="/create" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M8 1l1.8 5H15l-4.4 3.2 1.7 5.2L8 11.2 3.7 14.4l1.7-5.2L1 6h5.2z"/></svg>} label="Create learning material" sub="Summaries, cards, quizzes, lessons, worksheets"/>
          <Opt href="/study"  icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4h12M2 8h8M2 12h10"/></svg>}                                                          label="Continue learning"       sub="Study mode, AI tutor, missed questions, guides"/>
          <Opt href="/my-stuff" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/></svg>}              label="Open saved work"         sub="Folders, decks, quizzes, lessons, history"/>
        </div>
      </div>
    </div>
  )
}