const CARDS = [
  { label: 'Create', desc: 'Turn a topic, file, URL, or source into study or teaching material.', color: 'bg-ff-blue-light', link: '/create' },
  { label: 'Study', desc: 'Review, ask the AI tutor, make study guides, and keep learning at home.', color: 'bg-green-50', link: '/study' },
  { label: 'Teach', desc: 'Create lesson plans, rubrics, handouts, assignments, and live review plans.', color: 'bg-purple-50', link: '/teach' },
  { label: 'My Stuff', desc: 'Find saved folders, decks, quizzes, lesson plans, sources, and recent work.', color: 'bg-orange-50', link: '/my-stuff' },
]

export default function FeatureCards() {
  return (
    <div className="grid grid-cols-4 gap-2.5 mb-4">
      {CARDS.map(card => (
        <a key={card.label} href={card.link}
          className="bg-ff-surface border border-ff-border rounded-xl p-4 hover:border-ff-border-hover hover:shadow-sm transition-all cursor-pointer group">
          <div className={`w-8 h-8 ${card.color} rounded-lg mb-3`}/>
          <div className="text-sm font-semibold text-ff-navy mb-1">{card.label}</div>
          <p className="text-[11px] text-ff-muted leading-relaxed">{card.desc}</p>
          <span className="text-[11px] text-ff-blue font-medium mt-2.5 block group-hover:underline">Open {card.label} →</span>
        </a>
      ))}
    </div>
  )
}