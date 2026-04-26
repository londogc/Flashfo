
const I = ({ d, cls }) => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls}>
    <path d={d} />
  </svg>
)

const TOOLS = [
  { label: 'Lesson Builder', desc: 'Generate a full structured lesson plan from a topic', href: '/lesson-builder', bg: 'bg-blue-500/10', ic: 'text-blue-500', icon: 'M13 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V2a1 1 0 00-1-1zM5 5h6m-6 3h6m-6 3h4' },
  { label: 'Rubric Generator', desc: 'Create teacher-ready rubrics for any assignment', href: '/lesson-builder', bg: 'bg-emerald-500/10', ic: 'text-emerald-500', icon: 'M1 3h14v2H1zm0 4h14v2H1zm0 4h10v2H1' },
  { label: 'Worksheet Maker', desc: 'Build printable worksheets and handouts', href: '/create', bg: 'bg-amber-500/10', ic: 'text-amber-500', icon: 'M3 1h10a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1zm2 4h6m-6 3h6m-6 3h4' },
  { label: 'Quiz Builder', desc: 'Create assessments with answer keys', href: '/quiz', bg: 'bg-violet-500/10', ic: 'text-violet-500', icon: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5v.5m0-7c1.1 0 2 .9 2 2s-.9 2-2 2' },
]

export default function TeachPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Teach</h1>
      <p className="text-sm text-t2 mb-6">Build lesson plans, rubrics, handouts, and classroom materials with AI.</p>
      <div className="grid grid-cols-2 gap-3">
        {TOOLS.map(item => (
          <a key={item.label} href={item.href} className="bg-surface border border-line rounded-xl p-5 hover:border-blue-300/50 transition-all group block">
            <div className={`w-10 h-10 ${item.bg} rounded-xl mb-3 flex items-center justify-center`}>
              <I d={item.icon} cls={item.ic} />
            </div>
            <div className="text-[13px] font-bold text-t1 mb-1.5">{item.label}</div>
            <p className="text-[12px] text-t2 mb-3">{item.desc}</p>
            <span className="text-[11px] text-blue-500 font-semibold group-hover:underline">Open →</span>
          </a>
        ))}
      </div>
    </div>
  )
}