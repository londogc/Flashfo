import Shell from '@/components/Shell'

const I = ({ d, cls }) => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls}>
    <path d={d} />
  </svg>
)

const TOOLS = [
  { label: 'AI Tutor', desc: 'Get personalized explanations and tutoring', href: '/ai-tutor', bg: 'bg-blue-500/10', ic: 'text-blue-500', icon: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10a3 3 0 100-6 3 3 0 000 6z' },
  { label: 'Summarizer', desc: 'Condense long texts into key points', href: '/summarize', bg: 'bg-emerald-500/10', ic: 'text-emerald-500', icon: 'M2 3h12v2.5H2zm0 4h8v2.5H2zm0 4h10v2H2' },
  { label: 'Quiz Generator', desc: 'Create tests and assessments from any topic', href: '/quiz', bg: 'bg-amber-500/10', ic: 'text-amber-500', icon: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5v.5m0-7c1.1 0 2 .9 2 2s-.9 2-2 2' },
  { label: 'Flashcard Maker', desc: 'Turn notes into interactive study cards', href: '/flashcards', bg: 'bg-violet-500/10', ic: 'text-violet-500', icon: 'M1 2h6v5H1zm8 0h6v5H9zM1 9h6v5H1zm8 2h2m2 0h-2m0-2v2m0 2v-2' },
  { label: 'Lesson Builder', desc: 'Build full structured lesson plans', href: '/lesson-builder', bg: 'bg-rose-500/10', ic: 'text-rose-500', icon: 'M13 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V2a1 1 0 00-1-1zM5 5h6m-6 3h6m-6 3h4' },
  { label: 'Content Creator', desc: 'Generate any study material from a topic', href: '/create', bg: 'bg-cyan-500/10', ic: 'text-cyan-500', icon: 'M8 1l1.8 5H15l-4.4 3.2 1.7 5.2L8 11.2 3.7 14.4l1.7-5.2L1 6h5.2z' },
]

export default function AISuitePage() {
  return (
    <Shell>
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