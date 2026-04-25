export default function HeroCard() {
  return (
    <div className="bg-ff-surface border border-ff-border rounded-2xl p-6 mb-4 grid grid-cols-[1fr_280px] gap-5 items-center">
      <div>
        <div className="inline-flex items-center gap-1.5 bg-ff-blue-light text-ff-blue text-[11px] font-semibold px-2.5 py-1 rounded-full mb-3">
          <span className="w-1.5 h-1.5 bg-ff-blue rounded-full"/>
          Your study workspace
        </div>
        <h1 className="text-[28px] font-bold text-ff-navy leading-tight tracking-tight mb-2">
          Learn <span className="text-ff-blue">faster</span> without<br/>juggling a dozen tools.
        </h1>
        <p className="text-sm text-ff-slate leading-relaxed mb-5">
          Flashfo organizes your prompts, sources, saved work, and classroom tools in one calm workspace — so students keep learning and teachers create faster.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button className="h-9 px-4 bg-ff-blue text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">Start creating</button>
          <button className="h-9 px-4 bg-slate-50 border border-ff-border text-ff-slate text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors">Study something</button>
          <button className="h-9 px-4 bg-slate-50 border border-ff-border text-ff-slate text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors">Build for class</button>
        </div>
      </div>
      <div className="bg-[#1e3a8a] rounded-xl p-4 flex flex-col gap-2">
        <p className="text-xs font-semibold text-white mb-1">Choose the path that fits what you need.</p>
        {[
          { label: 'Create learning material', sub: 'Summaries, cards, quizzes, lessons, worksheets' },
          { label: 'Continue learning', sub: 'Study mode, AI tutor, missed questions, guides' },
          { label: 'Open saved work', sub: 'Folders, decks, quizzes, lessons, history' },
        ].map(opt => (
          <button key={opt.label} className="flex items-center gap-2.5 p-2.5 bg-white/10 hover:bg-white/15 rounded-lg text-left transition-colors w-full">
            <div className="w-6 h-6 bg-white/15 rounded-md flex-shrink-0"/>
            <div>
              <div className="text-xs font-medium text-white leading-none mb-0.5">{opt.label}</div>
              <div className="text-[10px] text-white/60">{opt.sub}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}