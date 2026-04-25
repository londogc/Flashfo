const JUMP=[
  {label:'Folders & collections',sub:'Grouped summaries, cards, quizzes, and lessons.',badge:'My Stuff',bc:'bg-blue-500/10 text-blue-500',href:'/my-stuff',ib:'bg-amber-500/10',ic:'text-amber-500',id:'M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm2 3h6m-6 3h4'},
  {label:'Saved sources',sub:'Reuse URLs, notes, files, and research without starting over.',badge:'Sources',bc:'bg-emerald-500/10 text-emerald-500',href:'/source-library',ib:'bg-emerald-500/10',ic:'text-emerald-500',id:'M7 1a6 6 0 100 12A6 6 0 007 1zm7 14l-3-3'},
  {label:'Missed questions',sub:'Review weak spots and turn mistakes into practice.',badge:'Study',bc:'bg-violet-500/10 text-violet-500',href:'/study',ib:'bg-violet-500/10',ic:'text-violet-500',id:'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5v.5m0-7c1.1 0 2 .9 2 2s-.9 2-2 2'},
]
const QUICK=[
  {label:'AI Tutor',sub:'Ask a question about saved material.',href:'/ai-tutor',ib:'bg-blue-500/10',ic:'text-blue-500',id:'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10a3 3 0 100-6 3 3 0 000 6z'},
  {label:'Smart Study Path',sub:'Get a guided study sequence.',href:'/study',ib:'bg-emerald-500/10',ic:'text-emerald-500',id:'M8 1l1.8 5H15l-4.4 3.2 1.7 5.2L8 11.2 3.7 14.4l1.7-5.2L1 6h5.2z'},
  {label:'Worksheet Generator',sub:'Create a printable worksheet.',href:'/create',ib:'bg-amber-500/10',ic:'text-amber-500',id:'M3 1h10a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1zm2 4h6m-6 3h6m-6 3h4'},
  {label:'Rubric Generator',sub:'Build teacher-ready rubrics.',href:'/teach',ib:'bg-violet-500/10',ic:'text-violet-500',id:'M1 3h14v2H1zm0 4h14v2H1zm0 4h10v2H1'},
]
const Svg=({d,c})=>(<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={c}><path d={d}/></svg>)
export default function BottomPanels(){
  return(
    <div className="grid gap-3 mb-3.5" style={{gridTemplateColumns:'1fr 268px'}}>
      <div className="bg-surface border border-line rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-bold text-t1">Jump back in</span>
          <a href="/my-stuff" className="text-[11px] text-blue-500 font-semibold hover:underline">View all history</a>
        </div>
        {JUMP.map((item,i)=>(
          <a key={item.label} href={item.href} className={`flex items-center gap-3 py-2.5 hover:bg-surface2 -mx-2 px-2 rounded-lg transition-colors ${i<JUMP.length-1?'border-b border-line':''}`}>
            <div className={`w-8 h-8 ${item.ib} rounded-lg flex items-center justify-center flex-shrink-0`}><Svg d={item.id} c={item.ic}/></div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-t1 truncate">{item.label}</div>
              <div className="text-[11px] text-t3 truncate mt-0.5">{item.sub}</div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.bc} flex-shrink-0`}>{item.badge}</span>
          </a>
        ))}
      </div>
      <div className="bg-surface border border-line rounded-xl p-4">
        <div className="text-[13px] font-bold text-t1 mb-3">Quick actions</div>
        {QUICK.map(item=>(
          <a key={item.label} href={item.href} className="flex items-center gap-3 p-2 -mx-1 rounded-xl hover:bg-surface2 transition-colors mb-1 group">
            <div className={`w-8 h-8 ${item.ib} rounded-lg flex items-center justify-center flex-shrink-0`}><Svg d={item.id} c={item.ic}/></div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-t1">{item.label}</div>
              <div className="text-[11px] text-t3">{item.sub}</div>
            </div>
            <svg className="w-3.5 h-3.5 text-t3 flex-shrink-0 group-hover:text-t2 transition-colors" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 4l5 4-5 4"/></svg>
          </a>
        ))}
      </div>
    </div>
  )
}