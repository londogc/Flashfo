
const I = ({ d, cls }) => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls}>
    <path d={d} />
  </svg>
)

const TOOLS = [
  // Nova — target/bullseye icon (same as sidebar)
  { label: 'Nova',            desc: 'Your AI study companion — explains, summarizes, and adapts to you', href: '/ai-tutor',       bg: 'bg-blue-500/10',   ic: 'text-blue-500',   icon: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10a3 3 0 100-6 3 3 0 000 6z' },
  // Summarizer
  { label: 'Summarizer',      desc: 'Condense long texts into key points',                               href: '/summarize',      bg: 'bg-emerald-500/10', ic: 'text-emerald-500', icon: 'M2 3h12v2.5H2zm0 4h8v2.5H2zm0 4h10v2H2' },
  // Quiz Generator — question mark
  { label: 'Quiz Generator',  desc: 'Create tests and assessments from any topic',                       href: '/quiz',           bg: 'bg-amber-500/10',  ic: 'text-amber-500',   icon: 'M6 5.5a2.5 2.5 0 014.5 1.5c0 1.5-1.5 2-2 3V11m0 2.5v.5' },
  // Flashcard Maker — two offset cards (updated icon matching sidebar)
  { label: 'Flashcard Maker', desc: 'Turn notes into interactive study cards',                           href: '/flashcards',     bg: 'bg-violet-500/10', ic: 'text-violet-500',  icon: 'M4 3h9a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zM2 5H1v7a1 1 0 001 1h9' },
  // Lesson Builder
  { label: 'Lesson Builder',  desc: 'Build full structured lesson plans',                                href: '/lesson-builder', bg: 'bg-rose-500/10',   ic: 'text-rose-500',    icon: 'M13 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V2a1 1 0 00-1-1zM5 5h6m-6 3h6m-6 3h4' },
  // Content Creator — star
  { label: 'Content Creator', desc: 'Generate any study material from a topic',                          href: '/create',         bg: 'bg-cyan-500/10',   ic: 'text-cyan-500',    icon: 'M8 1l1.8 5H15l-4.4 3.2 1.7 5.2L8 11.2 3.7 14.4l1.7-5.2L1 6h5.2z' },
  // Study Guide Creator
  { label: 'Study Guide',     desc: 'Build a full structured study guide from any topic or notes',       href: '/study-guide',    bg: 'bg-indigo-500/10', ic: 'text-indigo-500',  icon: 'M2 2h4v12H2zm5-1h2v14H7zm4 2h3v10h-3z' },
]

export default function AISuitePage() {
  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">AI Suite</h1>
      <p className="text-sm text-t2 mb-6">Your complete collection of AI-powered study and teaching tools.</p>
      <div className="grid grid-cols-3 gap-3">
        {TOOLS.map(t => (
          <a key={t.label} href={t.href} className="bg-surface border border-line rounded-xl p-5 hover:border-blue-300/50 transition-all group block">
            <div className={`w-10 h-10 ${t.bg} rounded-xl mb-3 flex items-center justify-center`}>
              <I d={t.icon} cls={t.ic} />
            </div>
            <div className="text-[13px] font-bold text-t1 mb-1">{t.label}</div>
            <p className="text-[11px] text-t2 mb-3">{t.desc}</p>
            <span className="text-[11px] text-blue-500 font-semibold group-hover:underline">Open →</span>
          </a>
        ))}
      </div>
    </div>
  )
}