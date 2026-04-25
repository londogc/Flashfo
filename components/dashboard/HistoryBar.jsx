'use client'
import { useEffect, useState } from 'react'

export default function HistoryBar() {
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/history')
      .then(r => r.json())
      .then(d => { if (!d.error) setEvent(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="rounded-2xl bg-slate-900 px-5 py-4 flex items-center gap-3 animate-pulse">
      <div className="h-3 w-24 bg-slate-700 rounded"/>
      <div className="w-px h-8 bg-slate-700"/>
      <div className="h-3 flex-1 bg-slate-700 rounded"/>
    </div>
  )

  if (!event) return null

  return (
    <div className="rounded-2xl bg-slate-900 px-5 py-4 flex items-center gap-4">
      <div className="flex-shrink-0">
        <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] mb-1">This Day in History</div>
        <div className="text-[13px] font-bold text-white">{event.fullDate}</div>
      </div>
      <div className="w-px h-9 bg-slate-700 flex-shrink-0"/>
      <p className="text-[12px] text-slate-300 leading-relaxed flex-1">
        <span className="font-bold text-white">{event.year} — </span>{event.text}
      </p>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] bg-slate-800 text-slate-500 px-2.5 py-1 rounded-full font-medium">History</span>
        <a href="#" className="text-[11px] text-blue-400 font-semibold hover:text-blue-300 transition-colors">Learn more →</a>
      </div>
    </div>
  )
}