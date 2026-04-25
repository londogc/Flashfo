'use client'
import{useState}from 'react'
export default function QuizPage(){
  const[topic,setTopic]=useState('')
  const[questions,setQuestions]=useState([])
  const[loading,setLoading]=useState(false)
  const[answers,setAnswers]=useState({})
  const[submitted,setSubmitted]=useState(false)
  async function generate(){
    if(!topic.trim())return
    setLoading(true);setQuestions([]);setAnswers({});setSubmitted(false)
    try{
      const res=await fetch('/api/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'quiz',topic,text:topic})})
      const d=await res.json()
      const raw=d.result||d.questions||d.output||''
      const lines=typeof raw==='string'?raw.split(/\n/).filter(Boolean):[]
      setQuestions(lines.filter(l=>/^\d+\./.test(l.trim())))
    }catch{setQuestions(['1. Could not generate quiz. Try a different topic.'])}
    finally{setLoading(false)}
  }
  return(
    <div className="p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Quiz</h1>
      <p className="text-sm text-t2 mb-6">Generate a quiz on any topic and test your knowledge.</p>
      {!questions.length?(
        <div className="bg-surface border border-line rounded-2xl p-5">
          <textarea value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Enter a topic to quiz yourself on..." className="w-full h-28 text-sm text-t1 bg-transparent resize-none outline-none placeholder:text-t3 mb-4"/>
          <button onClick={generate} disabled={loading||!topic.trim()} className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 flex items-center gap-2">
            {loading?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Generating...</>:'Generate Quiz'}
          </button>
        </div>
      ):(
        <div>
          <div className="space-y-4 mb-6">
            {questions.map((q,i)=>(
              <div key={i} className="bg-surface border border-line rounded-xl p-4">
                <p className="text-sm font-medium text-t1 mb-3">{q}</p>
                <textarea rows={2} value={answers[i]||''} onChange={e=>setAnswers(a=>({...a,[i]:e.target.value}))} placeholder="Your answer..." className="w-full text-sm text-t1 bg-surface2 border border-line rounded-lg px-3 py-2 outline-none focus:border-blue-400 transition-colors resize-none placeholder:text-t3"/>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setSubmitted(true)} className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors">Submit Answers</button>
            <button onClick={()=>setQuestions([])} className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl hover:bg-surface2 transition-colors">New Quiz</button>
          </div>
          {submitted&&<div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-600">Quiz submitted! Review your answers above.</div>}
        </div>
      )}
    </div>
  )
}