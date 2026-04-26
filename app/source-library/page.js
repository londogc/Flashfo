export default function SourceLibraryPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Source Library</h1>
      <p className="text-sm text-t2 mb-6">Save URLs, files, and notes to reuse across all your study materials.</p>
      <div className="bg-surface border border-line rounded-2xl p-12 text-center">
        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
          {/* 3 clearly distinct books with spines */}
          <svg width="28" height="24" viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
            {/* Book 1 — left */}
            <rect x="1" y="3" width="6" height="18" rx="1"/>
            <line x1="3" y1="3" x2="3" y2="21"/>
            {/* Book 2 — middle */}
            <rect x="9" y="1" width="6" height="22" rx="1"/>
            <line x1="11" y1="1" x2="11" y2="23"/>
            {/* Book 3 — right */}
            <rect x="17" y="4" width="6" height="16" rx="1"/>
            <line x1="19" y1="4" x2="19" y2="20"/>
          </svg>
        </div>
        <h2 className="text-base font-bold text-t1 mb-2">Your source library is empty</h2>
        <p className="text-sm text-t2 mb-6 max-w-sm mx-auto">Add URLs, paste text, or upload files to build a reusable library of research and notes.</p>
        <div className="flex gap-2 justify-center">
          <a href="/search" className="inline-flex h-9 px-4 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors items-center">Search the web</a>
          <a href="/create" className="inline-flex h-9 px-4 bg-surface2 border border-line text-t2 text-sm font-medium rounded-xl hover:bg-bg transition-colors items-center">Add from Create</a>
        </div>
      </div>
    </div>
  )
}