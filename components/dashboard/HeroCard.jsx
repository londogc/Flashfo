'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const Opt = ({ icon, label, sub, href }) => (
  <a href={href} style={{
    display:'flex', alignItems:'center', gap:12, padding:'10px 12px',
    background:'rgba(255,255,255,0.1)', borderRadius:12, textDecoration:'none',
    transition:'background 0.1s', cursor:'pointer',
  }}
  onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.16)'}
  onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}>
    <div style={{ width:28, height:28, background:'rgba(255,255,255,0.15)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</div>
    <div style={{ minWidth:0 }}>
      <div style={{ fontSize:12, fontWeight:600, color:'white', lineHeight:1.3 }}>{label}</div>
      <div style={{ fontSize:10, color:'rgba(255,255,255,0.55)', marginTop:2 }}>{sub}</div>
    </div>
    <svg style={{ marginLeft:'auto', flexShrink:0, opacity:0.3 }} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="1.5"><path d="M4 2l4 4-4 4"/></svg>
  </a>
)

export default function HeroCard() {
  const [query, setQuery] = useState('')
  const [mobile, setMobile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  function handleSearch(e) {
    e.preventDefault()
    if (query.trim()) router.push('/search?q=' + encodeURIComponent(query.trim()))
  }

  return (
    <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:18, padding: mobile ? 18 : 24, marginBottom:14 }}>
      <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 290px', gap:20, alignItems:'start' }}>
        <div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(29,78,216,0.1)', color:'#3b82f6', fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:99, marginBottom:14 }}>
            <span style={{ width:6, height:6, background:'#3b82f6', borderRadius:'50%', display:'inline-block' }}/>
            Your study workspace
          </div>
          <h1 style={{ fontSize: mobile ? 24 : 30, fontWeight:800, color:'var(--c-t1)', lineHeight:1.2, letterSpacing:'-0.5px', marginBottom:12 }}>
            Learn <span style={{ color:'#2563eb' }}>faster</span> without juggling a dozen tools.
          </h1>
          <p style={{ fontSize:13, color:'var(--c-t2)', lineHeight:1.7, marginBottom:20, maxWidth:420 }}>
            Flashfo organizes your prompts, sources, saved work, and classroom tools in one calm workspace.
          </p>

          <form onSubmit={handleSearch} style={{ display:'flex', gap:8, marginBottom:16, maxWidth: mobile ? '100%' : 480 }}>
            <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:12, padding:'0 14px', height:44 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color:'var(--c-t3)', flexShrink:0 }}>
                <path d="M7 1a6 6 0 100 12A6 6 0 007 1zm7 14l-3-3"/>
              </svg>
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search any topic, question, or keyword..."
                style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:13, color:'var(--c-t1)' }}/>
            </div>
            <button type="submit"
              style={{ height:44, padding:'0 18px', background:'#1d4ed8', color:'white', fontSize:13, fontWeight:700, borderRadius:12, border:'none', cursor:'pointer', flexShrink:0 }}>
              Search
            </button>
          </form>

          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <a href="/create" style={{ height:36, padding:'0 18px', background:'#1d4ed8', color:'white', fontSize:13, fontWeight:600, borderRadius:12, display:'inline-flex', alignItems:'center', textDecoration:'none' }}>Start creating</a>
            <a href="/study"  style={{ height:36, padding:'0 14px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)', fontSize:13, fontWeight:500, borderRadius:12, display:'inline-flex', alignItems:'center', textDecoration:'none' }}>Study something</a>
            <a href="/teach"  style={{ height:36, padding:'0 14px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)', fontSize:13, fontWeight:500, borderRadius:12, display:'inline-flex', alignItems:'center', textDecoration:'none' }}>Build for class</a>
          </div>
        </div>

        {!mobile && (
          <div style={{ background:'#1e3a8a', borderRadius:18, padding:16, display:'flex', flexDirection:'column', gap:8 }}>
            <p style={{ fontSize:12, fontWeight:600, color:'white', marginBottom:4, lineHeight:1.4 }}>Choose the path that fits<br/>what you need.</p>
            <Opt href="/create" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M8 1l1.8 5H15l-4.4 3.2 1.7 5.2L8 11.2 3.7 14.4l1.7-5.2L1 6h5.2z"/></svg>} label="Create learning material" sub="Summaries, cards, quizzes, lessons"/>
            <Opt href="/study"  icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4h12M2 8h8M2 12h10"/></svg>} label="Continue learning" sub="Nova AI tutor, missed questions, guides"/>
            <Opt href="/my-stuff" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/></svg>} label="Open saved work" sub="Folders, decks, quizzes, history"/>
          </div>
        )}
      </div>
    </div>
  )
}