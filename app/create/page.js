'use client'
import{useState}from 'react'
const TYPES=[
  {id:'summarize',label:'Summary',desc:'Key points and concepts'},
  {id:'flashcards',label:'Flashcards',desc:'Study cards with Q&A'},
  {id:'quiz',label:'Quiz',desc:'Test questions with answers'},
  {id:'lesson',label:'Lesson Plan',desc:'Full structured lesson'},
  {id:'studyguide',label:'Study Guide',desc:'Comprehensive overview'},
]
export default function CreatePage(){
  const[input,setInput]=useState('')
  const[type,setType]=useState('summarize')
  const[loading,setLoading]=useState(false)
  const[output,setOutput]=useState('')
  const[error,setError]=useState('')

  async function generate(){
    if(!input.trim())return
    setLoading(true); setOutput(''); setError('')
    try{
      const res=await fetch('/api/rpc',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:type,text:input,topic:input})
      })
      const data=await res.json()
      if(data.error)setError(data.error)
      else setOutput(data.result||data.output||data.content||JSON.stringify(data))
    }catch(e){setError('Something went wrong. Please try again.')}
    finally{setLoading(false)}
  }

  return(
    <div className="p-6 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-t1 tracking-tight">Create</h1>
        <p className="text-sm text-t2 mt-1">Paste a topic, text, or URL and turn it into study material instantly.</p>
      </div>

      <div className="bg-surface border border-line rounded-2xl p-5 mb-4">
        <textarea
          value={input} onChange={e=>setInput(e.target.value)}
          placeholder="Paste your topic, notes, article, or URL here..."
          className="w-full h-40 text-sm text-t1 bg-transparent resize-none outline-none placeholder:text-t3"
        />
        <div className="border-t border-line pt-4 mt-2">
          <div className="text-[11px] font-semibold text-t3 uppercase tracking-wider mb-3">What to create</div>
          <div className="flex gap-2 flex-wrap">
            {TYPES.map(t=>(
              <button key={t.id} onClick={()=>setType(t.id)}
                className={`px-3 py-2 rounded-xl text-[12px] font-medium border transition-all ${type===t.id?'bg-blue-700 text-white border-blue-700':'bg-surface2 text-t2 border-line hover:border-blue-300'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={generate} disabled={loading||!input.trim()}
        className="h-10 px-6 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
        {loading?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Generating...</>:<>Generate {TYPES.find(t=>t.id===type)?.label}</>}
      </button>

      {error&&<div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-500">{error}</div>}

      {output&&(
        <div className="mt-5 bg-surface border border-line rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-bold text-t1">Result</span>
            <button onClick={()=>navigator.clipboard.writeText(output)} className="text-[11px] text-blue-500 font-medium hover:underline">Copy</button>
          </div>
          <div className="text-sm text-t1 leading-relaxed whitespace-pre-wrap">{output}</div>
        </div>
      )}
    </div>
  )
}