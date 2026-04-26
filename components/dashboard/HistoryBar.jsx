'use client'
import { useEffect, useState } from 'react'

export default function HistoryBar() {
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetch('/api/history')
      .then(r => r.json())
      .then(d => { if (!d.error) setEvent(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ borderRadius:18, background:'#0f172a', padding:'16px 20px', marginBottom:14, height:72, opacity:0.6 }}/>
  )
  if (!event) return null

  return (
    <div style={{
      borderRadius:18, background:'#0f172a',
      padding: mobile ? '16px' : '16px 24px',
      marginBottom:14,
      display: mobile ? 'block' : 'flex',
      alignItems:'center', gap:20,
    }}>
      <div style={{ flexShrink:0, marginBottom: mobile ? 10 : 0 }}>
        <div style={{ fontSize:9, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:3 }}>
          This Day in History
        </div>
        <div style={{ fontSize:14, fontWeight:700, color:'white' }}>{event.fullDate}</div>
      </div>
      {!mobile && <div style={{ width:1, height:36, background:'rgba(255,255,255,0.1)', flexShrink:0 }}/>}
      <p style={{ fontSize:13, color:'#cbd5e1', lineHeight:1.6, flex:1, margin: mobile ? '0 0 10px' : 0 }}>
        <span style={{ fontWeight:700, color:'white' }}>{event.year} — </span>{event.text}
      </p>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <span style={{ fontSize:10, background:'rgba(255,255,255,0.06)', color:'#64748b', padding:'4px 10px', borderRadius:99, fontWeight:500 }}>
          History
        </span>
        {event.wikiUrl ? (
          <a href={event.wikiUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontSize:11, color:'#60a5fa', fontWeight:600, textDecoration:'none' }}>
            Learn more →
          </a>
        ) : (
          <span style={{ fontSize:11, color:'#374151', fontWeight:500 }}>Learn more →</span>
        )}
      </div>
    </div>
  )
}