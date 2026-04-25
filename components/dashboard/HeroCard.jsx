
const Opt = ({ icon, label, sub }) => (
  <button className="flex items-center gap-3 p-2.5 bg-white/10 hover:bg-white/[0.16] rounded-xl text-left transition-all w-full group">
    <div className="w-7 h-7 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0 text-white">
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[12px] font-semibold text-white leading-tight">{label}</div>
      <div className="text-[10px] text-white/55 mt-0.5 leading-tight">{sub}</div>
    </div>
    <svg className="ml-auto w-3 h-3 text-white/30 flex-shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4"/></svg>
  </button>
)

export default function HeroCard() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 mb-3.5 grid gap-5 items-center" style={{gridTemplateColumns:'1fr 290px'}}>
      <div>
        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[11px] font-semibold px-3 py-1 rounded-full mb-3.5">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"/>
          Your study workspace
        </div>
        <h1 className="text-[30px] font-extrabold text-slate-900 leading-[1.2] tracking-tight mb-3">
          Learn <span className="text-blue-700">faster</span> without<br/>juggling a dozen tools.
        </h1>
        <p className="text-[13px] text-slate-500 leading-relaxed mb-5 max-w-md">
          Flashfo organizes your prompts, sources, saved work, and classroom tools in one calm workspace — so students keep learning and teachers create faster.
        </p>
        <div className="flex gap-2 flex-wrap">
          <a href="/create" className="h-9 px-5 bg-blue-700 text-white text-[13px] font-semibold rounded-xl hover:bg-blue-800 transition-colors flex items-center">Start creating</a>
          <a href="/study" className="h-9 px-4 bg-slate-50 border border-slate-200 text-slate-600 text-[13px] font-medium rounded-xl hover:bg-slate-100 transition-colors flex items-center">Study something</a>
          <a href="/teach" className="h-9 px-4 bg-slate-50 border border-slate-200 text-slate-600 text-[13px] font-medium rounded-xl hover:bg-slate-100 transition-colors flex items-center">Build for class</a>
        </div>
      </div>
      <div className="bg-[#1e3a8a] rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-[12px] font-semibold text-white mb-1 leading-snug">Choose the path that fits<br/>what you need.</p>
        <Opt
          icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M8 1l1.8 5H15l-4.4 3.2 1.7 5.2L8 11.2 3.7 14.4l1.7-5.2L1 6h5.2z"/></svg>}
          label="Create learning material"
          sub="Summaries, cards, quizzes, lessons, worksheets"
        />
        <Opt
          icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4h12M2 8h8M2 12h10"/></svg>}
          label="Continue learning"
          sub="Study mode, AI tutor, missed questions, guides"
        />
        <Opt
          icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/></svg>}
          label="Open saved work"
          sub="Folders, decks, quizzes, lessons, history"
        />
      </div>
    </div>
  )
}