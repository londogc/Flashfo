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
    <div style={{ padding:'28px 24px 48px', maxWidth:1100, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

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
            <div style={{ position:'relative' }}>

              {/* Animated orb layer */}
              <div style={{ position:'absolute', inset:-50, pointerEvents:'none', zIndex:0, overflow:'hidden', borderRadius:60, filter:'blur(35px)', opacity:0.45 }}>
                <div style={{ position:'absolute', width:230, height:230, borderRadius:'50%', background:'radial-gradient(circle,#059669,transparent 70%)', top:-30, left:-30, animation:'sgOrb1 13s ease-in-out infinite' }}/>
                <div style={{ position:'absolute', width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,#0d9488,transparent 70%)', bottom:-10, right:-10, animation:'sgOrb2 16s ease-in-out infinite' }}/>
                <div style={{ position:'absolute', width:150, height:150, borderRadius:'50%', background:'radial-gradient(circle,#34d399,transparent 70%)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', animation:'sgOrb3 11s ease-in-out infinite' }}/>
              </div>

              <style>{`
                @keyframes sgOrb1{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(26px,18px) scale(1.1)}70%{transform:translate(-12px,28px) scale(0.94)}}
                @keyframes sgOrb2{0%,100%{transform:translate(0,0) scale(1)}35%{transform:translate(-22px,-16px) scale(1.08)}65%{transform:translate(18px,-26px) scale(0.93)}}
                @keyframes sgOrb3{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.2)}}
                @keyframes sgBtnGrad{0%{background-position:0% 50%}100%{background-position:200% 50%}}
                @keyframes sgShine{0%,100%{left:-60%}50%{left:120%}}
                .sg-tile{padding:14px 8px;border-radius:12px;background:rgba(255,255,255,0.035);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.3);cursor:pointer;font-family:inherit;text-align:center;transform:translateY(0) scale(1);box-shadow:0 1px 3px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.04) inset;position:relative;overflow:hidden;transition:all .2s cubic-bezier(.2,.8,.2,1);}
                .sg-tile::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:rgba(255,255,255,0.07);}
                .sg-tile:hover{background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.14);color:rgba(255,255,255,0.7);transform:translateY(-3px) scale(1.02);box-shadow:0 8px 20px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.08) inset;}
                .sg-tile.sg-tile-on{background:rgba(52,211,153,0.12);border-color:rgba(52,211,153,0.4);color:#6ee7b7;transform:translateY(-3px) scale(1.02);box-shadow:0 8px 24px rgba(52,211,153,0.18),0 0 0 1px rgba(52,211,153,0.18) inset;}
                .sg-tile.sg-tile-on::before{background:rgba(52,211,153,0.2);}
                .sg-genbtn{width:100%;padding:16px;border:none;border-radius:14px;background:linear-gradient(110deg,#047857 0%,#059669 35%,#34d399 50%,#059669 65%,#065f46 100%);background-size:200% 100%;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:-.3px;box-shadow:0 4px 24px rgba(5,150,105,0.35),0 1px 0 rgba(255,255,255,0.15) inset;transition:all .2s cubic-bezier(.2,.8,.2,1);position:relative;overflow:hidden;animation:sgBtnGrad 4s linear infinite;display:flex;align-items:center;justify-content:center;gap:9;}
                .sg-genbtn::after{content:'';position:absolute;top:-50%;left:-60%;width:40%;height:200%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);transform:skewX(-20deg);animation:sgShine 3.5s ease-in-out infinite;}
                .sg-genbtn:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(5,150,105,0.5),0 1px 0 rgba(255,255,255,0.2) inset;}
                .sg-genbtn:active{transform:translateY(1px);}
                .sg-genbtn:disabled{opacity:0.45;cursor:not-allowed;transform:none;animation:none;}
              `}</style>

              {/* Card */}
              <div style={{ position:'relative', zIndex:1, borderRadius:24, background:'rgba(12,10,22,0.88)', backdropFilter:'blur(40px) saturate(1.5)', WebkitBackdropFilter:'blur(40px) saturate(1.5)', border:'1px solid rgba(255,255,255,0.09)', boxShadow:'0 0 0 1px rgba(255,255,255,0.04) inset, 0 40px 80px rgba(0,0,0,0.6)', overflow:'hidden' }}>

                {/* Top shimmer */}
                <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.08) 20%,rgba(255,255,255,0.2) 50%,rgba(255,255,255,0.08) 80%,transparent)', zIndex:10, pointerEvents:'none' }}/>

                {/* Textarea */}
                <div style={{ padding:'24px 24px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <textarea
                    value={topic}
                    onChange={e=>setTopic(e.target.value)}
                    onKeyDown={e=>{ if (e.key==='Enter'&&e.metaKey&&topic.trim()) generate() }}
                    rows={3}
                    placeholder="Enter a topic, paste your syllabus, or describe what you need to cover…"
                    style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'rgba(255,255,255,0.78)', fontFamily:'inherit', fontSize:15, lineHeight:1.65, resize:'none', display:'block', caretColor:'rgba(255,255,255,0.5)' }}
                  />
                </div>

                {/* Depth tiles */}
                <div style={{ padding:'18px 24px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize:10, fontWeight:600, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)', marginBottom:12 }}>Depth</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
                    {DEPTH_OPTIONS.map(d => (
                      <button
                        key={d.id}
                        className={'sg-tile'+(depth===d.id?' sg-tile-on':'')}
                        onClick={()=>setDepth(d.id)}
                      >
                        <span style={{ fontSize:12, fontWeight:700, display:'block', marginBottom:4 }}>{d.label}</span>
                        <span style={{ fontSize:10, fontWeight:400, display:'block', opacity:0.65 }}>{d.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ padding:'10px 24px 16px', borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.18)' }}>Written in plain, student-friendly language</span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.13)' }}>⌘↵ generate</span>
                </div>
              </div>
            </div>

            {error && <div style={{ fontSize:12, color:'#f87171', marginTop:8 }}>{error}</div>}

            <button
              className="sg-genbtn"
              onClick={generate}
              disabled={!topic.trim()}
              style={{ marginTop:12 }}
            >
              {loading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation:'_fcspin .7s linear infinite', flexShrink:0 }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                  Generating…
                </>
              ) : 'Generate study guide →'}
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
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)', marginBottom:12 }}>Writing your guide…</div>
            <style>{`.sg-skel{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.09) 50%,rgba(255,255,255,0.04) 75%);background-size:1200px 100%;animation:sgSkelShimmer 1.8s ease-in-out infinite;border-radius:8px;}@keyframes sgSkelShimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}`}</style>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {OUTLINE_SECTIONS.map((s,i) => (
                <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:9, padding:'9px 12px', display:'flex', alignItems:'center', gap:10, animationDelay:`${i*0.1}s` }}>
                  <div style={{ width:26, height:26, borderRadius:6, background:s.iconColor, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, opacity:0.5 }}>{s.icon}</div>
                  <div style={{ flex:1 }}>
                    <div className="sg-skel" style={{ height:9, width:'55%', marginBottom:6, animationDelay:`${i*0.12}s` }}/>
                    <div className="sg-skel" style={{ height:7, width:'35%', animationDelay:`${i*0.12+0.06}s` }}/>
                  </div>
                  <div className="sg-skel" style={{ height:7, width:28, animationDelay:`${i*0.12+0.1}s` }}/>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(52,211,153,0.05)', border:'1px solid rgba(52,211,153,0.14)', borderRadius:10, marginTop:10 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, animation:'_fcspin .9s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.32)', lineHeight:1.5 }}>Nova is writing your study guide…</span>
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
