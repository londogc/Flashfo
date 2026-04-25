'use client'
import { useEffect, useState } from 'react'

export default function HistoryBar() {
  const [event, setEvent] = useState(null)

  useEffect(() => {
    fetch('/api/history')
      .then(r => r.json())
      .then(d => { if (!d.error) setEvent(d) })
      .catch(() => {})
  }, [])

  if (!event) return null

  return (
    <div className="bg-ff-navy rounded-xl px-5 py-4 flex items-center gap-4 mt-1">
      <div className="flex-shrink-0">
        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">This Day in History</div>
        <div className="text-sm font-bold text-white">{event.fullDate}</div>
      </div>
      <div className="w-px h-9 bg-slate-700 flex-shrink-0"/>
      <p className="text-xs text-slate-300 leading-relaxed flex-1">
        <span className="font-semibold text-white">{event.year} — </span>{event.text}
      </p>
      <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full flex-shrink-0">History</span>
      <span className="text-[10px] text-ff-blue font-medium flex-shrink-0 cursor-pointer hover:underline">Learn more →</span>
    </div>
  )
}