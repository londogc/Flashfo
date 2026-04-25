'use client'
import{useState}from 'react'
export default function SummarizePage(){
  const[input,setInput]=useState('')
  const[output,setOutput]=useState('')
  const[loading,setLoading]=useState(false)
  async function run(){
    if(!input.trim())return
    setLoading(true);setOutput('')
    try{
      const res=await fetch('/api/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'summarize',text:input})})
      const d=await res.json()
      setOutput(d.result||d.output||d.content||'Could not summarize.')
    }catch{setOutput('Something went wrong.')}
    finally{setLoading(false)}
  }
  return(
    <div className="p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Summarize</h1>
      <p className="text-sm text-t2 mb-6">Paste any text, article, or notes and get a clean concise summary.</p>
      <div className="bg-surface border border-line rounded-2xl p-5 mb-4">
        <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Paste text, article content, or notes here..." className="w-full h-40 text-sm text-t1 bg-transparent resize-none outline-none placeholder:text-t3"/>
      </div>
      <button onClick={run} disabled={loading||!input.trim()} className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 flex items-center gap-2">
        {loading?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Summarizing...</>:'Summarize'}
      </button>
      {output&&<div className="mt-5 bg-surface border border-line rounded-2xl p-5"><p className="text-sm text-t1 leading-relaxed whitespace-pre-wrap">{output}</p></div>}
    </div>
  )
}