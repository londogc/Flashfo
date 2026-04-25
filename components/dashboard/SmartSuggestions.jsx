export default function SmartSuggestions(){
  const items=[
    {title:'Generate your first flashcard deck',sub:'Paste any topic or notes and Flashfo turns it into a study deck in seconds.',href:'/flashcards',cta:'Get started →'},
    {title:'Try the AI Tutor',sub:'Paste your notes and ask anything — it explains, quizzes, and adapts to you.',href:'/ai-tutor',cta:'Open AI Tutor →'},
    {title:'Build a lesson plan',sub:'Give a topic and grade level and get a complete, editable lesson plan instantly.',href:'/lesson-builder',cta:'Try Lesson Builder →'},
  ]
  return(
    <div className="mt-3.5">
      <div className="text-[13px] font-bold text-t1 mb-2.5">Smart suggestions</div>
      <div className="flex flex-col gap-2">
        {items.map(item=>(
          <a key={item.title} href={item.href} className="bg-surface border border-line rounded-xl px-4 py-3.5 flex items-center gap-4 hover:border-blue-400/40 hover:bg-surface2 transition-all group">
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"/>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-t1">{item.title}</div>
              <div className="text-[11px] text-t2 mt-0.5">{item.sub}</div>
            </div>
            <span className="text-[12px] text-blue-500 font-semibold flex-shrink-0 group-hover:underline">{item.cta}</span>
          </a>
        ))}
      </div>
    </div>
  )
}