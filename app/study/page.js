export default function StudyPage(){
  return(
    <div className="p-6 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Study</h1>
      <p className="text-sm text-t2 mb-6">Review your material, use spaced repetition, and track your progress.</p>
      <div className="grid grid-cols-3 gap-3">
        {[
          {label:'Flashcard Review',desc:'Go through your saved decks',href:'/flashcards',clr:'bg-blue-500/10 text-blue-500'},
          {label:'AI Tutor Session',desc:'Ask questions and get explanations',href:'/ai-tutor',clr:'bg-violet-500/10 text-violet-500'},
          {label:'Quiz Yourself',desc:'Test your knowledge with questions',href:'/quiz',clr:'bg-emerald-500/10 text-emerald-500'},
        ].map(item=>(
          <a key={item.label} href={item.href} className="bg-surface border border-line rounded-xl p-5 hover:border-blue-300/50 transition-all group">
            <div className={`w-10 h-10 ${item.clr} rounded-xl mb-3`}/>
            <div className="text-[13px] font-bold text-t1 mb-1">{item.label}</div>
            <p className="text-[11px] text-t2">{item.desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}