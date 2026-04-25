export default function AISuitePage(){
  const tools=[
    {label:'AI Tutor',desc:'Get personalized explanations and tutoring',href:'/ai-tutor',color:'bg-blue-500/10 text-blue-500'},
    {label:'Summarizer',desc:'Condense long texts into key points',href:'/summarize',color:'bg-emerald-500/10 text-emerald-500'},
    {label:'Quiz Generator',desc:'Create tests and assessments from any topic',href:'/quiz',color:'bg-amber-500/10 text-amber-500'},
    {label:'Flashcard Maker',desc:'Turn notes into interactive study cards',href:'/flashcards',color:'bg-violet-500/10 text-violet-500'},
    {label:'Lesson Builder',desc:'Build full structured lesson plans',href:'/lesson-builder',color:'bg-rose-500/10 text-rose-500'},
    {label:'Content Creator',desc:'Generate any study material from a topic',href:'/create',color:'bg-cyan-500/10 text-cyan-500'},
  ]
  return(
    <div className="p-6 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">AI Suite</h1>
      <p className="text-sm text-t2 mb-6">Your complete collection of AI-powered study and teaching tools.</p>
      <div className="grid grid-cols-3 gap-3">
        {tools.map(t=>(
          <a key={t.label} href={t.href} className="bg-surface border border-line rounded-xl p-5 hover:border-blue-300/50 transition-all group">
            <div className={`w-10 h-10 ${t.color} rounded-xl mb-3`}/>
            <div className="text-[13px] font-bold text-t1 mb-1">{t.label}</div>
            <p className="text-[11px] text-t2 mb-3">{t.desc}</p>
            <span className="text-[11px] text-blue-500 font-semibold group-hover:underline">Open →</span>
          </a>
        ))}
      </div>
    </div>
  )
}