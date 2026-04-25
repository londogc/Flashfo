const JUMP = [
  { label: 'Folders & collections', sub: 'Open grouped summaries, cards, quizzes, and lessons.', badge: 'My Stuff', badgeColor: 'bg-ff-blue-light text-ff-blue' },
  { label: 'Saved sources', sub: 'Reuse URLs, notes, files, and research without starting over.', badge: 'Sources', badgeColor: 'bg-green-50 text-green-700' },
  { label: 'Missed questions', sub: 'Review weak spots and turn mistakes into practice.', badge: 'Study', badgeColor: 'bg-purple-50 text-purple-700' },
]

const QUICK = [
  { label: 'AI Tutor', sub: 'Ask a question about saved material.', href: '/ai-tutor' },
  { label: 'Smart Study Path', sub: 'Get a guided study sequence.', href: '/study' },
  { label: 'Worksheet Generator', sub: 'Create a printable worksheet.', href: '/create' },
  { label: 'Rubric Generator', sub: 'Build teacher-ready rubrics.', href: '/teach' },
]

export default function BottomPanels() {
  return (
    <div className="grid grid-cols-[1fr_260px] gap-3 mb-4">
      <div className="bg-ff-surface border border-ff-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-ff-navy">Jump back in</span>
          <span className="text-[11px] text-ff-blue font-medium cursor-pointer hover:underline">View all history</span>
        </div>
        {JUMP.map((item, i) => (
          <div key={item.label} className={`flex items-center gap-2.5 py-2.5 cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors ${i < JUMP.length - 1 ? 'border-b border-ff-border' : ''}`}>
            <div className="w-7 h-7 bg-slate-100 rounded-lg flex-shrink-0"/>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-ff-navy truncate">{item.label}</div>
              <div className="text-[10px] text-ff-muted truncate">{item.sub}</div>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.badgeColor} flex-shrink-0`}>{item.badge}</span>
          </div>
        ))}
      </div>

      <div className="bg-ff-surface border border-ff-border rounded-xl p-4">
        <div className="text-sm font-semibold text-ff-navy mb-3">Quick actions</div>
        {QUICK.map(item => (
          <a key={item.label} href={item.href}
            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer mb-1 group">
            <div className="w-7 h-7 bg-ff-blue-light rounded-lg flex-shrink-0"/>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-ff-navy">{item.label}</div>
              <div className="text-[10px] text-ff-muted">{item.sub}</div>
            </div>
            <svg className="w-3 h-3 text-ff-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M6 4l5 4-5 4z"/></svg>
          </a>
        ))}
      </div>
    </div>
  )
}