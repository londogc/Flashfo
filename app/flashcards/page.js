'use client'
import{useState}from 'react'
export default function FlashcardsPage(){
  const[topic,setTopic]=useState('')
  const[cards,setCards]=useState([])
  const[loading,setLoading]=useState(false)
  const[current,setCurrent]=useState(0)
  const[flipped,setFlipped]=useState(false)
  const[done,setDone]=useState([])

  async function generate(){
    if(!topic.trim())return
    setLoading(true);setCards([]);setDone([]);setCurrent(0)
    try{
      const res=await fetch('/api/rpc',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'flashcards',topic,text:topic})})
      const data=await res.json()
      const raw=data.result||data.cards||data.output||''
      const parsed=typeof raw==='string'
        ?raw.split(/\n+/).filter(l=>l.includes('|')).map(l=>{const[q,a]=l.split('|');return{q:q?.replace(/^Q:/i,'').trim(),a:a?.replace(/^A:/i,'').trim()}}).filter(c=>c.q&&c.a)
        :Array.isArray(raw)?raw:[]
      setCards(parsed.length?parsed:[{q:'Could not parse cards — try a different topic',a:'Try: "Photosynthesis" or "World War 2 causes"'}])
    }catch{setCards([{q:'Error generating cards',a:'Please try again'}])}
    finally{setLoading(false)}
  }

  if(!cards.length)return(
    <div className="p-6 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Flashcards</h1>
      <p className="text-sm text-t2 mb-6">Enter a topic and get AI-generated study cards instantly.</p>
      <div className="bg-surface border border-line rounded-2xl p-5">
        <textarea value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Enter a topic, paste notes, or describe what to study..."
          className="w-full h-28 text-sm text-t1 bg-transparent resize-none outline-none placeholder:text-t3 mb-4"/>
        <button onClick={generate} disabled={loading||!topic.trim()} className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 flex items-center gap-2">
          {loading?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Generating...</>:'Generate Flashcards'}
        </button>
      </div>
    </div>
  )

  const card=cards[current]
  const progress=Math.round((done.length/cards.length)*100)
  return(
    <div className="p-6 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-t1 tracking-tight">Flashcards</h1>
          <p className="text-sm text-t2">{cards.length} cards · {done.length} learned</p>
        </div>
        <button onClick={()=>setCards([])} className="text-sm text-blue-500 font-medium hover:underline">New deck</button>
      </div>
      <div className="w-full bg-line rounded-full h-1.5 mb-6"><div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{width:progress+'%'}}/></div>
      <div onClick={()=>setFlipped(f=>!f)} className="bg-surface border border-line rounded-2xl p-10 text-center cursor-pointer hover:border-blue-300 transition-all min-h-[240px] flex flex-col items-center justify-center gap-4" style={{perspective:'1000px'}}>
        <div className="text-[10px] font-bold text-t3 uppercase tracking-widest">{flipped?'Answer':'Question'} · {current+1} of {cards.length}</div>
        <div className="text-lg font-semibold text-t1 leading-relaxed">{flipped?card.a:card.q}</div>
        <div className="text-[11px] text-t3 mt-2">Tap to {flipped?'see question':'reveal answer'}</div>
      </div>
      <div className="flex gap-3 mt-4 justify-center">
        <button onClick={()=>{setCurrent(c=>Math.max(0,c-1));setFlipped(false)}} disabled={current===0} className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl disabled:opacity-30 hover:bg-surface2 transition-colors">← Prev</button>
        {flipped&&<button onClick={()=>{setDone(d=>[...new Set([...d,current])]);setCurrent(c=>Math.min(cards.length-1,c+1));setFlipped(false)}} className="h-9 px-4 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors">✓ Got it</button>}
        <button onClick={()=>{setCurrent(c=>Math.min(cards.length-1,c+1));setFlipped(false)}} disabled={current===cards.length-1} className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl disabled:opacity-30 hover:bg-surface2 transition-colors">Next →</button>
      </div>
    </div>
  )
}