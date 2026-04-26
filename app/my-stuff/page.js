
const I = ({ d, cls }) => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls}>
    <path d={d} />
  </svg>
)

const SECTIONS = [
  { label: 'Folders', sub: 'Nothing saved yet', bg: 'bg-amber-500/10', ic: 'text-amber-500', icon: 'M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm2 3h6m-6 3h4' },
  { label: 'Saved Decks', sub: 'Nothing saved yet', bg: 'bg-blue-500/10', ic: 'text-blue-500', icon: 'M1 2h6v5H1zm8 0h6v5H9zM1 9h6v5H1zm8 2h2m2 0h-2m0-2v2m0 2v-2' },
  { label: 'Recent History', sub: 'Nothing saved yet', bg: 'bg-violet-500/10', ic: 'text-violet-500', icon: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 3v4l2.5 2.5' },
]

export default function MyStuffPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">My Stuff</h1>
      <p className="text-sm text-t2 mb-6">All your saved work, folders, decks, and recent activity in one place.</p>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {SECTIONS.map(s => (
          <div key={s.label} className="bg-surface border border-line rounded-xl p-5 text-center">
            <div className={`w-10 h-10 ${s.bg} rounded-xl mx-auto mb-3 flex items-center justify-center`}>
              <I d={s.icon} cls={s.ic} />
            </div>
            <div className="text-[13px] font-bold text-t1">{s.label}</div>
            <div className="text-[11px] text-t3 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="bg-surface border border-line rounded-xl p-6 text-center">
        <p className="text-sm text-t2 mb-4">Start creating to build your personal library of study materials.</p>
        <a href="/create" className="inline-flex h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors items-center">Start creating →</a>
      </div>
    </div>
  )
}