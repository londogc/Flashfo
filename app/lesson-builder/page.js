'use client'
import{useState}from 'react'
export default function LessonBuilderPage(){
  const[form,setForm]=useState({topic:'',grade:'',duration:'',objectives:''})
  const[output,setOutput]=useState('')
  const[loading,setLoading]=useState(false)
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))
  async function generate(){
    setLoading(true);setOutput('')
    try{
      const res=await fetch('/api/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'lesson',items:[form.objectives],educationLevel:form.grade,...form})})
      const d=await res.json()
      setOutput(d.result||d.lessonPlan||d.output||'Could not generate lesson plan.')
    }catch{setOutput('Something went wrong.')}
    finally{setLoading(false)}
  }
  return(
    <div className="p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Lesson Builder</h1>
      <p className="text-sm text-t2 mb-6">Fill in the details and get a complete, structured lesson plan instantly.</p>
      <div className="bg-surface border border-line rounded-2xl p-5 space-y-4 mb-4">
        {[
          {k:'topic',label:'Topic',ph:'e.g. The American Civil War'},
          {k:'grade',label:'Grade / Level',ph:'e.g. Grade 8, High School, University'},
          {k:'duration',label:'Duration',ph:'e.g. 45 minutes, 1 hour'},
        ].map(({k,label,ph})=>(
          <div key={k}>
            <label className="block text-[11px] font-semibold text-t2 uppercase tracking-wider mb-1.5">{label}</label>
            <input value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph} className="w-full h-9 bg-surface2 border border-line rounded-lg px-3 text-sm text-t1 outline-none focus:border-blue-400 transition-colors placeholder:text-t3"/>
          </div>
        ))}
        <div>
          <label className="block text-[11px] font-semibold text-t2 uppercase tracking-wider mb-1.5">Learning Objectives (optional)</label>
          <textarea value={form.objectives} onChange={e=>set('objectives',e.target.value)} placeholder="Students will be able to..." rows={3} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-t1 outline-none focus:border-blue-400 transition-colors resize-none placeholder:text-t3"/>
        </div>
      </div>
      <button onClick={generate} disabled={loading||!form.topic.trim()} className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 flex items-center gap-2">
        {loading?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Building plan...</>:'Generate Lesson Plan'}
      </button>
      {output&&<div className="mt-5 bg-surface border border-line rounded-2xl p-5"><div className="flex justify-between items-center mb-4"><span className="text-[13px] font-bold text-t1">Lesson Plan</span><button onClick={()=>navigator.clipboard.writeText(output)} className="text-[11px] text-blue-500 font-medium hover:underline">Copy</button></div><p className="text-sm text-t1 leading-relaxed whitespace-pre-wrap">{output}</p></div>}
    </div>
  )
}