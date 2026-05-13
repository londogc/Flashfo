'use client'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { useIsMobile } from '@/hooks/useIsMobile'
import { saveItem } from '@/lib/savedItems'
import { saveDraft, loadDraft, clearDraft } from '@/lib/saveDraft'
import { rpc, novaStream } from '@/lib/api'

// ── Markdown-ish renderer (unchanged) ────────────────────────────────────────

function renderStudyGuide(text) {
  const lines = text.split('\n')
  const elements = []
  let key = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const lowerTrimmed = trimmed.toLowerCase()
    if (lowerTrimmed.includes('memory trick')||lowerTrimmed.includes('mnemonic')||lowerTrimmed.includes('memory aids')) {
      while (i+1<lines.length&&!lines[i+1].trim().startsWith('---')&&!lines[i+1].trim().startsWith('###')) i++
      continue
    }
    if (trimmed==='---'||trimmed==='') continue
    if (trimmed.startsWith('### ')) {
      const heading = trimmed.replace(/^### /,'').replace(/\*\*/g,'')
      elements.push(<div key={key++} style={{marginTop:24,marginBottom:8,paddingBottom:6,borderBottom:'1px solid var(--c-line)'}}><span style={{fontSize:11,fontWeight:700,color:'var(--c-t3)',textTransform:'uppercase',letterSpacing:'.06em'}}>{heading}</span></div>)
      continue
    }
    if (/^\*\*[^*]+\*\*:?$/.test(trimmed)) {
      const title = trimmed.replace(/\*\*/g,'').replace(/:$/,'')
      elements.push(<p key={key++} style={{fontSize:14,fontWeight:700,color:'var(--c-t1)',marginTop:12,marginBottom:4}}>{title}</p>)
      continue
    }
    if (/^[-*] /.test(trimmed)) {
      const content = trimmed.replace(/^[-*] /,'').replace(/\*\*([^*]+)\*\*/g,'$1')
      const colonMatch = content.match(/^([^:]+): (.+)$/)
      if (colonMatch) {
        elements.push(<div key={key++} style={{display:'flex',gap:8,marginBottom:6,fontSize:13}}><span style={{color:'#3b82f6',flexShrink:0,marginTop:2}}>•</span><span style={{color:'var(--c-t1)'}}><span style={{fontWeight:600}}>{colonMatch[1]}:</span> {colonMatch[2]}</span></div>)
      } else {
        elements.push(<div key={key++} style={{display:'flex',gap:8,marginBottom:6,fontSize:13}}><span style={{color:'#3b82f6',flexShrink:0,marginTop:2}}>•</span><span style={{color:'var(--c-t2)'}}>{content}</span></div>)
      }
      continue
    }
    if (/^\d+\./.test(trimmed)) {
      const num = trimmed.match(/^(\d+)\./)
      const content = trimmed.replace(/^\d+\.\s*/,'').replace(/\*\*([^*]+)\*\*/g,'$1')
      elements.push(<div key={key++} style={{display:'flex',gap:8,marginBottom:8,fontSize:13}}><span style={{color:'#3b82f6',fontWeight:700,flexShrink:0,width:20}}>{num[1]}.</span><span style={{color:'var(--c-t1)'}}>{content}</span></div>)
      continue
    }
    if (trimmed) {
      const clean = trimmed.replace(/\*\*([^*]+)\*\*/g,'$1').replace(/\*([^*]+)\*/g,'$1')
      elements.push(<p key={key++} style={{fontSize:13,color:'var(--c-t1)',lineHeight:1.7,marginBottom:8}}>{clean}</p>)
    }
  }
  return <div>{elements}</div>
}

// ── Section icons for outline panel ──────────────────────────────────────────

const OUTLINE_SECTIONS = [
  {
    title:'Overview',
    sub:'The big picture in plain language',
    count:'~100 words',
    iconColor:'rgba(52,211,153,0.12)',
    icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
  },
  {
    title:'Key Concepts',
    sub:'Core terms defined and explained',
    count:'6–10 items',
    iconColor:'rgba(96,165,250,0.12)',
    icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
  },
  {
    title:'Timeline / Key Facts',
    sub:'Dates, events, critical data points',
    count:'varies',
    iconColor:'rgba(251,191,36,0.12)',
    icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
  },
  {
    title:'Deep Dive',
    sub:'Mechanisms, causes, effects, analysis',
    count:'~300 words',
    iconColor:'rgba(167,139,250,0.12)',
    icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>
  },
  {
    title:'Exam Focus',
    sub:"What's most likely to be tested",
    count:'5 items',
    iconColor:'rgba(248,113,113,0.12)',
    icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  },
]

const DEPTH_OPTIONS = [
  { id:'brief',    label:'Quick overview',  sub:'Key points · ~2 min' },
  { id:'standard', label:'Full breakdown',  sub:'Standard · ~6 min'  },
  { id:'deep',     label:'Deep dive',       sub:'Comprehensive · ~12 min' },
]

const CHIPS = [
  'Photosynthesis','The Renaissance','Organic chemistry',
  'Supply and demand','The US Civil War','DNA replication',
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudyGuidePage() {
  const { user } = useAuth()
  const isMobile  = useIsMobile()

  const [topic,    setTopic]    = useState('')
  const [depth,    setDepth]    = useState('standard')
  const [output,   setOutput]   = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [draftBanner,  setDraftBanner]  = useState(false)
  const [autoGenTopic, setAutoGenTopic] = useState('')

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const stored = sessionStorage.getItem('flashfo_load_study_guide')
    if (stored) {
      try {
        const { topic:st, output:so, depth:sd } = JSON.parse(stored)
        sessionStorage.removeItem('flashfo_load_study_guide')
        if (so) { setTopic(st||''); setDepth(sd||'standard'); setOutput(so); return }
      } catch(e) {}
    }
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) {
      const decoded = decodeURIComponent(q)
      setTopic(decoded)
      if (params.get('autoGenerate')==='1') setAutoGenTopic(decoded)
      return
    }
    loadDraft('study-guide').then(draft => {
      if (draft?.data?.output) {
        setTopic(draft.data.topic||''); setDepth(draft.data.depth||'standard')
        setOutput(draft.data.output); setDraftBanner(true)
      }
    })
  }, [])

  useEffect(() => {
    if (autoGenTopic.trim() && topic===autoGenTopic && !loading && !output) {
      generate(); setAutoGenTopic('')
    }
  }, [autoGenTopic, topic])

  // ── Generate ────────────────────────────────────────────────────────────────

  async function generate() {
    if (!topic.trim()) return
    setLoading(true); setOutput(''); setError(''); setSaved(false); setDraftBanner(false)
    try {
      const depthNote = depth==='brief'
        ? ' Keep it concise, key points only.'
        : depth==='deep'
          ? ' Be comprehensive and thorough with examples.'
          : ''
      const data = await rpc(
        'generateStudyGuideFromText',
        [topic.trim() + depthNote + ' Write in an engaging, student-friendly tone. Use clear section headings without ### symbols. Write bullet points as plain text without ** markers. Make it feel like a knowledgeable teacher wrote this, not a textbook. Be direct, real, and interesting. Do NOT include a Memory Tricks or Mnemonics section.', 'English']
      )
      if (data.error) { setError(data.error); return }
      const result = typeof data.result==='string' ? data.result : JSON.stringify(data.result)
      setOutput(result)
      if (user) await saveDraft('study-guide', topic.trim(), { topic:topic.trim(), depth, output:result })
    } catch { setError('Something went wrong. Please try again.') }
    finally  { setLoading(false) }
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function doSave() {
    if (!user||!output) return; setSaving(true)
    try {
      await saveItem(user.id, 'study_guide', topic, { output, topic, depth })
      setSaved(true); await clearDraft('study-guide')
      setTimeout(()=>setSaved(false), 3000)
    } catch {}
    finally { setSaving(false) }
  }

  function startFresh() { setTopic(''); setOutput(''); setDraftBanner(false); clearDraft('study-guide') }

  const sections = output ? output.split(/(?=## )/).filter(Boolean) : []

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding:'28px 24px 48px', maxWidth:860, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Draft banner */}
      {draftBanner && (
        <div style={{ background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:10, padding:'10px 14px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
          <span style={{ fontSize:12, color:'rgba(241,240,255,0.65)', flex:1 }}>Resuming your last guide — <strong style={{ color:'rgba(241,240,255,0.85)' }}>{topic}</strong></span>
          <button onClick={startFresh} style={{ fontSize:11, color:'rgba(241,240,255,0.35)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Start fresh</button>
        </div>
      )}

      {/* Badge */}
      <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(52,211,153,0.07)', border:'1px solid rgba(52,211,153,0.18)', borderRadius:20, padding:'5px 13px', fontSize:10, fontWeight:800, color:'#34d399', marginBottom:16, letterSpacing:'.08em', textTransform:'uppercase' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
        Nova · Study Guide
      </div>
      <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-.03em', marginBottom:5, color:'var(--c-t1)', lineHeight:1.15 }}>Build a complete study guide</h1>
      <p style={{ fontSize:13, color:'var(--c-t2)', marginBottom:22, lineHeight:1.65, maxWidth:520 }}>Nova writes a structured, teacher-quality breakdown of any topic — sections, key concepts, exam focus, and more.</p>

      {/* Quick-start chips */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
        {CHIPS.map(c => (
          <button key={c} onClick={()=>setTopic(c)} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
            {c}
          </button>
        ))}
      </div>

      {/* Two-column layout — shown only on input state */}
      {!output && !loading && (
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:20, alignItems:'start' }}>

          {/* Left — input */}
          <div>
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:14, overflow:'hidden' }}>
              <textarea
                value={topic}
                onChange={e=>setTopic(e.target.value)}
                onKeyDown={e=>{ if (e.key==='Enter'&&e.metaKey&&topic.trim()) generate() }}
                rows={4}
                placeholder="Enter a topic, paste your syllabus, or describe what you need to cover…"
                style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'#e2e8f0', fontFamily:'inherit', fontSize:13, lineHeight:1.7, padding:'14px 16px', resize:'none', display:'block' }}
              />

              {/* Depth selector */}
              <div style={{ display:'flex', gap:5, padding:'9px 11px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
                {DEPTH_OPTIONS.map(d => (
                  <button key={d.id} onClick={()=>setDepth(d.id)}
                    style={{ flex:1, padding:'7px 5px', borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textAlign:'center', border:'1px solid '+(depth===d.id?'rgba(52,211,153,0.28)':'rgba(255,255,255,0.08)'), background:depth===d.id?'rgba(52,211,153,0.09)':'rgba(255,255,255,0.03)', color:depth===d.id?'#34d399':'rgba(255,255,255,0.3)', transition:'all .15s' }}>
                    {d.label}
                    <span style={{ display:'block', fontSize:9, fontWeight:400, marginTop:2, color:depth===d.id?'rgba(52,211,153,0.5)':'rgba(255,255,255,0.18)' }}>{d.sub}</span>
                  </button>
                ))}
              </div>

              <div style={{ padding:'9px 14px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.18)' }}>Written in plain, student-friendly language</span>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.15)' }}>⌘↵ generate</span>
              </div>
            </div>

            {error && <div style={{ fontSize:12, color:'#f87171', marginTop:8 }}>{error}</div>}

            <button
              onClick={generate}
              disabled={!topic.trim()}
              style={{ width:'100%', padding:'13px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#059669,#0d9488)', color:'#fff', fontSize:13, fontWeight:800, cursor:!topic.trim()?'not-allowed':'pointer', marginTop:11, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:9, letterSpacing:'-.01em', boxShadow:'0 4px 18px rgba(5,150,105,0.25)', transition:'all .15s', opacity:!topic.trim()?.55:1 }}>
              Generate study guide →
            </button>
          </div>

          {/* Right — guide structure, hidden on mobile */}
          {!isMobile && <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)', marginBottom:12 }}>Guide structure</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {OUTLINE_SECTIONS.map((s,i) => (
                <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:9, padding:'9px 12px', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:26, height:26, borderRadius:6, background:s.iconColor, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {s.icon}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.65)' }}>{s.title}</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:1 }}>{s.sub}</div>
                  </div>
                  <div style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.18)', flexShrink:0 }}>{s.count}</div>
                </div>
              ))}
            </div>
          </div>}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:20, alignItems:'start' }}>
          <div>
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:14, padding:'14px 16px' }}>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', lineHeight:1.7 }}>{topic}</div>
              <div style={{ display:'flex', gap:5, marginTop:10 }}>
                {DEPTH_OPTIONS.map(d => (
                  <div key={d.id} style={{ flex:1, padding:'7px 5px', borderRadius:8, fontSize:11, fontWeight:700, textAlign:'center', border:'1px solid '+(depth===d.id?'rgba(52,211,153,0.28)':'rgba(255,255,255,0.08)'), background:depth===d.id?'rgba(52,211,153,0.09)':'rgba(255,255,255,0.03)', color:depth===d.id?'#34d399':'rgba(255,255,255,0.3)' }}>
                    {d.label}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop:16, display:'flex', alignItems:'center', gap:10, padding:'14px 16px', background:'rgba(52,211,153,0.05)', border:'1px solid rgba(52,211,153,0.15)', borderRadius:12 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#34d399', animation:'nova-pulse .9s ease-in-out infinite', flexShrink:0 }}/>
              <span style={{ fontSize:13, color:'rgba(52,211,153,0.7)' }}>Nova is writing your study guide…</span>
            </div>
          </div>
          {!isMobile && <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)', marginBottom:12 }}>Guide structure</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {OUTLINE_SECTIONS.map((s,i) => (
                <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:9, padding:'9px 12px', display:'flex', alignItems:'center', gap:10, opacity:0.5 }}>
                  <div style={{ width:26, height:26, borderRadius:6, background:s.iconColor, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{s.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.65)' }}>{s.title}</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:1 }}>{s.sub}</div>
                  </div>
                  <div style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.18)', flexShrink:0 }}>{s.count}</div>
                </div>
              ))}
            </div>
          </div>}
        </div>
      )}

      {/* Output */}
      {output && !loading && (
        <div style={{ maxWidth:660 }}>
          {/* Output header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, paddingBottom:14, borderBottom:'1px solid var(--c-line)' }}>
            <div>
              <h2 style={{ fontSize:18, fontWeight:800, color:'var(--c-t1)', letterSpacing:'-.02em', marginBottom:2 }}>{topic}</h2>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#34d399' }}/>
                <span style={{ fontSize:12, color:'#34d399' }}>Study guide ready</span>
                <span style={{ fontSize:12, color:'var(--c-t3)' }}>·</span>
                <span style={{ fontSize:12, color:'var(--c-t3)', textTransform:'capitalize' }}>{DEPTH_OPTIONS.find(d=>d.id===depth)?.label}</span>
              </div>
            </div>
            <div style={{ display:'flex', gap:7 }}>
              <button onClick={()=>navigator.clipboard?.writeText(output)} style={{ height:32, padding:'0 12px', borderRadius:8, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t2)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Copy
              </button>
              {user && (
                <button onClick={doSave} disabled={saving} style={{ height:32, padding:'0 12px', borderRadius:8, border:'1px solid rgba(52,211,153,0.25)', background:'rgba(16,185,129,0.07)', color:'#34d399', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, opacity:saving?.6:1 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  {saving?'Saving…':saved?'Saved!':'Save to My Stuff'}
                </button>
              )}
              <button onClick={startFresh} style={{ height:32, padding:'0 12px', borderRadius:8, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t2)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                New guide
              </button>
            </div>
          </div>

          {/* Guide sections */}
          {sections.length > 0
            ? sections.map((section, i) => (
                <div key={i} style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:12, padding:'18px 20px', marginBottom:10, animation:'nova-pop .42s cubic-bezier(.22,.68,0,1.2) forwards', animationDelay:i*80+'ms', opacity:0 }}>
                  <div style={{ fontSize:13, color:'var(--c-t1)', lineHeight:1.7 }}>
                    {renderStudyGuide(section)}
                  </div>
                </div>
              ))
            : (
                <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:12, padding:'18px 20px' }}>
                  <div style={{ fontSize:13, color:'var(--c-t1)', lineHeight:1.7 }}>
                    {renderStudyGuide(output)}
                  </div>
                </div>
              )
          }

          {/* New topic prompt */}
          <div style={{ marginTop:20, padding:'14px 16px', background:'rgba(52,211,153,0.05)', border:'1px solid rgba(52,211,153,0.15)', borderRadius:12, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'rgba(52,211,153,0.7)', marginBottom:4 }}>Want to go deeper?</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', lineHeight:1.5 }}>Generate a quiz on {topic}, create flashcards, or ask Nova to explain any section further.</div>
            </div>
            <button onClick={startFresh} style={{ height:32, padding:'0 14px', borderRadius:8, border:'1px solid rgba(52,211,153,0.25)', background:'rgba(52,211,153,0.09)', color:'#34d399', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
              New guide
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
