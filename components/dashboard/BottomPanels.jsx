'use client'
import { useEffect, useState } from 'react'

const JUMP = [
  { label:'Folders & collections', sub:'Grouped summaries, cards, quizzes, and lessons.', badge:'My Stuff', bc:'rgba(29,78,216,0.1)', bclr:'#3b82f6', href:'/my-stuff', ib:'rgba(245,158,11,0.1)', ic:'#f59e0b', id:'M1 4h5l2 2h7v8H1zm0 2v8' },
  { label:'Saved sources',         sub:'Reuse URLs, notes, files, and research.',         badge:'Sources',  bc:'rgba(16,185,129,0.1)',bc2:'rgba(16,185,129,0.1)', bclr:'#10b981', href:'/source-library', ib:'rgba(16,185,129,0.1)', ic:'#10b981', id:'M7 1a6 6 0 100 12A6 6 0 007 1zm7 14l-3-3' },
  { label:'Missed questions',      sub:'Review weak spots and turn mistakes into practice.',badge:'Study',   bc:'rgba(139,92,246,0.1)', bclr:'#8b5cf6', href:'/study', ib:'rgba(139,92,246,0.1)', ic:'#8b5cf6', id:'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5v.5m0-7c1.1 0 2 .9 2 2s-.9 2-2 2' },
]
const QUICK = [
  { label:'AI Tutor',           sub:'Ask a question about saved material.',  href:'/ai-tutor',       ib:'rgba(29,78,216,0.1)',   ic:'#3b82f6',  id:'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10a3 3 0 100-6 3 3 0 000 6z' },
  { label:'Smart Study Path',   sub:'Get a guided study sequence.',          href:'/study',          ib:'rgba(16,185,129,0.1)', ic:'#10b981', id:'M8 1l1.8 5H15l-4.4 3.2 1.7 5.2L8 11.2 3.7 14.4l1.7-5.2L1 6h5.2z' },
  { label:'Worksheet Generator',sub:'Create a printable worksheet.',         href:'/create',         ib:'rgba(245,158,11,0.1)', ic:'#f59e0b',  id:'M3 1h10a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1zm2 4h6m-6 3h6m-6 3h4' },
  { label:'Rubric Generator',   sub:'Build teacher-ready rubrics.',          href:'/teach',          ib:'rgba(139,92,246,0.1)', ic:'#8b5cf6', id:'M1 3h14v2H1zm0 4h14v2H1zm0 4h10v2H1' },
]
const Svg = ({d,c}) => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>

export default function BottomPanels() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const panelStyle = { background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:14, padding:16 }

  return (
    <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 268px', gap:12, marginBottom:14 }}>
      <div style={panelStyle}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--c-t1)' }}>Jump back in</span>
          <a href="/my-stuff" style={{ fontSize:11, color:'#3b82f6', fontWeight:600, textDecoration:'none' }}>View all history</a>
        </div>
        {JUMP.map((item, i) => (
          <a key={item.label} href={item.href} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom: i<JUMP.length-1?'1px solid var(--c-line)':'none', textDecoration:'none', cursor:'pointer' }}>
            <div style={{ width:32, height:32, background:item.ib, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Svg d={item.id} c={item.ic}/></div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--c-t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</div>
              <div style={{ fontSize:11, color:'var(--c-t3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:2 }}>{item.sub}</div>
            </div>
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:item.bc, color:item.bclr, flexShrink:0 }}>{item.badge}</span>
          </a>
        ))}
      </div>

      <div style={panelStyle}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--c-t1)', marginBottom:12 }}>Quick actions</div>
        {QUICK.map(item => (
          <a key={item.label} href={item.href} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px', margin:'0 -4px', borderRadius:12, textDecoration:'none', marginBottom:4, transition:'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--c-surface2)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <div style={{ width:32, height:32, background:item.ib, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Svg d={item.id} c={item.ic}/></div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--c-t1)' }}>{item.label}</div>
              <div style={{ fontSize:11, color:'var(--c-t3)' }}>{item.sub}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--c-t3)" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink:0 }}><path d="M6 4l5 4-5 4"/></svg>
          </a>
        ))}
      </div>
    </div>
  )
}