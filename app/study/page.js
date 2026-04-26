
const I = ({ d, cls }) => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls}>
    <path d={d} />
  </svg>
)

const MODES = [
  { label: 'Flashcard Review', desc: 'Go through your saved decks with spaced repetition.', href: '/flashcards', bg: 'bg-blue-500/10', ic: 'text-blue-500', icon: 'M1 2h6v5H1zm8 0h6v5H9zM1 9h6v5H1zm8 2h2m2 0h-2m0-2v2m0 2v-2' },
  { label: 'AI Tutor Session', desc: 'Ask questions and get personalized explanations.', href: '/ai-tutor', bg: 'bg-violet-500/10', ic: 'text-violet-500', icon: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10a3 3 0 100-6 3 3 0 000 6z' },
  { label: 'Quiz Yourself', desc: 'Test your knowledge with AI-generated questions.', href: '/quiz', bg: 'bg-emerald-500/10', ic: 'text-emerald-500', icon: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5v.5m0-7c1.1 0 2 .9 2 2s-.9 2-2 2' },
]

export default function StudyPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Study</h1>
      <p className="text-sm text-t2 mb-6">Review your material, use spaced repetition, and track your progress.</p>
      <div className="grid grid-cols-3 gap-3">
        {MODES.map(item => (
          <a key={item.label} href={item.href} className="bg-surface border border-line rounded-xl p-5 hover:border-blue-300/50 transition-all group block">
            <div className={`w-10 h-10 ${item.bg} rounded-xl mb-3 flex items-center justify-center`}>
              <I d={item.icon} cls={item.ic} />
            </div>
            <div className="text-[13px] font-bold text-t1 mb-1">{item.label}</div>
            <p className="text-[11px] text-t2">{item.desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}