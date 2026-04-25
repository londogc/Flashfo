
const CARDS = [
  {
    label: 'Create', href: '/create',
    bg: 'bg-blue-50', color: 'text-blue-600',
    icon: 'M8 1l1.8 5H15l-4.4 3.2 1.7 5.2L8 11.2 3.7 14.4l1.7-5.2L1 6h5.2z',
    desc: 'Turn any topic, file, URL, or source into study or teaching material.',
    linkColor: 'text-blue-700'
  },
  {
    label: 'Study', href: '/study',
    bg: 'bg-emerald-50', color: 'text-emerald-600',
    icon: 'M2 4h12M2 8h8M2 12h10',
    desc: 'Review, ask the AI tutor, make study guides, and keep learning at home.',
    linkColor: 'text-emerald-700'
  },
  {
    label: 'Teach', href: '/teach',
    bg: 'bg-violet-50', color: 'text-violet-600',
    icon: 'M8 1a4 4 0 100 8 4 4 0 000-8zm-6 14c0-3.3 2.7-6 6-6s6 2.7 6 6',
    desc: 'Create lesson plans, rubrics, handouts, assignments, and live review plans.',
    linkColor: 'text-violet-700'
  },
  {
    label: 'My Stuff', href: '/my-stuff',
    bg: 'bg-amber-50', color: 'text-amber-600',
    icon: 'M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm2 3h6m-6 3h4',
    desc: 'Find saved folders, decks, quizzes, lesson plans, sources, and recent work.',
    linkColor: 'text-amber-700'
  },
]

export default function FeatureCards() {
  return (
    <div className="grid grid-cols-4 gap-2.5 mb-3.5">
      {CARDS.map(card => (
        <a key={card.label} href={card.href}
          className="bg-white border border-slate-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer group block">
          <div className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center mb-3.5`}>
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" className={card.color}>
              <path d={card.icon}/>
            </svg>
          </div>
          <div className="text-[13px] font-bold text-slate-900 mb-1.5">{card.label}</div>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-3">{card.desc}</p>
          <span className={`text-[11px] font-semibold ${card.linkColor} group-hover:underline`}>
            Open {card.label} →
          </span>
        </a>
      ))}
    </div>
  )
}