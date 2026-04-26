'use client'
import { useEffect, useState } from 'react'

const CARDS = [
  { label:'Create',   href:'/create',   bg:'rgba(29,78,216,0.08)',   clr:'#3b82f6',  icon:'M8 1l1.8 5H15l-4.4 3.2 1.7 5.2L8 11.2 3.7 14.4l1.7-5.2L1 6h5.2z',   lclr:'#2563eb', desc:'Turn any topic, file, or URL into study material.' },
  { label:'Study',    href:'/study',    bg:'rgba(16,185,129,0.08)',  clr:'#10b981',  icon:'M2 4h12M2 8h8M2 12h10',                                               lclr:'#059669', desc:'AI tutor, study guides, and learning at home.' },
  { label:'Teach',    href:'/teach',    bg:'rgba(139,92,246,0.08)',  clr:'#8b5cf6',  icon:'M8 1a4 4 0 100 8 4 4 0 000-8zm-6 14c0-3.3 2.7-6 6-6s6 2.7 6 6',      lclr:'#7c3aed', desc:'Lesson plans, rubrics, handouts, and review plans.' },
  { label:'My Stuff', href:'/my-stuff', bg:'rgba(245,158,11,0.08)',  clr:'#f59e0b',  icon:'M1 4h5l2 2h7v8H1zm0 2v8',                                             lclr:'#d97706', desc:'Saved folders, decks, quizzes, and recent work.' },
]

export default function FeatureCards() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:10, marginBottom:14 }}>
      {CARDS.map(c => (
        <a key={c.label} href={c.href} style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:14, padding:'16px', textDecoration:'none', display:'block', transition:'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(59,130,246,0.4)'; e.currentTarget.style.boxShadow='0 2px 12px rgba(59,130,246,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='var(--c-line)'; e.currentTarget.style.boxShadow='none' }}>
          <div style={{ width:36, height:36, background:c.bg, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke={c.clr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={c.icon}/></svg>
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--c-t1)', marginBottom:6 }}>{c.label}</div>
          {!mobile && <p style={{ fontSize:11, color:'var(--c-t2)', lineHeight:1.6, marginBottom:10 }}>{c.desc}</p>}
          <span style={{ fontSize:11, fontWeight:600, color:c.lclr }}>Open {c.label} →</span>
        </a>
      ))}
    </div>
  )
}