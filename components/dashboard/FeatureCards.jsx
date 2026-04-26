
const CARDS = [
  { label:'Create',   href:'/create',   bg:'bg-blue-500/10',   clr:'text-blue-500',   icon:'M8 1l1.8 5H15l-4.4 3.2 1.7 5.2L8 11.2 3.7 14.4l1.7-5.2L1 6h5.2z',   lclr:'text-blue-600 dark:text-blue-400',   desc:'Turn any topic, file, or URL into study material.' },
  { label:'Study',    href:'/study',    bg:'bg-emerald-500/10', clr:'text-emerald-500', icon:'M2 4h12M2 8h8M2 12h10',                                               lclr:'text-emerald-600 dark:text-emerald-400', desc:'AI tutor, study guides, and learning at home.' },
  { label:'Teach',    href:'/teach',    bg:'bg-violet-500/10',  clr:'text-violet-500',  icon:'M8 1a4 4 0 100 8 4 4 0 000-8zm-6 14c0-3.3 2.7-6 6-6s6 2.7 6 6',      lclr:'text-violet-600 dark:text-violet-400',   desc:'Lesson plans, rubrics, handouts, and review plans.' },
  { label:'My Stuff', href:'/my-stuff', bg:'bg-amber-500/10',   clr:'text-amber-500',   icon:'M1 4h5l2 2h7v8H1zm0 2v8',                                             lclr:'text-amber-600 dark:text-amber-400',    desc:'Saved folders, decks, quizzes, and recent work.' },
]
export default function FeatureCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3.5">
      {CARDS.map(c => (
        <a key={c.label} href={c.href} className="bg-surface border border-line rounded-xl p-4 hover:border-blue-400/40 hover:shadow-sm transition-all block group">
          <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center mb-3`}>
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={c.clr}><path d={c.icon}/></svg>
          </div>
          <div className="text-[13px] font-bold text-t1 mb-1">{c.label}</div>
          <p className="text-[11px] text-t2 leading-relaxed mb-2.5 hidden md:block">{c.desc}</p>
          <span className={`text-[11px] font-semibold ${c.lclr} group-hover:underline`}>Open {c.label} →</span>
        </a>
      ))}
    </div>
  )
}