'use client'
import{useEffect,useState}from 'react'
export default function HistoryBar(){
  const[event,setEvent]=useState(null)
  const[loading,setLoading]=useState(true)
  useEffect(()=>{
    fetch('/api/history').then(r=>r.json()).then(d=>{if(!d.error)setEvent(d)}).catch(()=>{}).finally(()=>setLoading(false))
  },[])
  if(loading)return(
    <div className="rounded-2xl px-5 py-4 flex items-center gap-4 animate-pulse" style={{background:'#0d1117'}}>
      <div className="h-3 w-32 bg-white/10 rounded"/><div className="w-px h-8 bg-white/10"/><div className="h-3 flex-1 bg-white/10 rounded"/>
    </div>
  )
  if(!event)return null
  return(
    <div className="rounded-2xl px-5 py-4 flex items-center gap-4" style={{background:'var(--c-surface)' === '#161b22' ? '#0d1117' : '#0f172a', backgroundColor:'#0f172a'}}>
      <div className="flex-shrink-0">
        <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] mb-1">This Day in History</div>
        <div className="text-[13px] font-bold text-white">{event.fullDate}</div>
      </div>
      <div className="w-px h-9 bg-white/10 flex-shrink-0"/>
      <p className="text-[12px] text-slate-300 leading-relaxed flex-1">
        <span className="font-bold text-white">{event.year} — </span>{event.text}
      </p>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] bg-white/5 text-slate-500 px-2.5 py-1 rounded-full font-medium">History</span>
        <a href="#" className="text-[11px] text-blue-400 font-semibold hover:text-blue-300 transition-colors">Learn more →</a>
      </div>
    </div>
  )
}