export default function TeachPage(){
  return(
    <div className="p-6 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Teach</h1>
      <p className="text-sm text-t2 mb-6">Build lesson plans, rubrics, handouts, and classroom materials with AI.</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          {label:'Lesson Builder',desc:'Generate a full structured lesson plan from a topic',href:'/lesson-builder'},
          {label:'Rubric Generator',desc:'Create teacher-ready rubrics for any assignment',href:'/lesson-builder'},
          {label:'Worksheet Maker',desc:'Build printable worksheets and handouts',href:'/create'},
          {label:'Quiz Builder',desc:'Create assessments with answer keys',href:'/quiz'},
        ].map(item=>(
          <a key={item.label} href={item.href} className="bg-surface border border-line rounded-xl p-5 hover:border-blue-300/50 transition-all group">
            <div className="text-[13px] font-bold text-t1 mb-1.5">{item.label}</div>
            <p className="text-[12px] text-t2 mb-3">{item.desc}</p>
            <span className="text-[11px] text-blue-500 font-semibold group-hover:underline">Open →</span>
          </a>
        ))}
      </div>
    </div>
  )
}