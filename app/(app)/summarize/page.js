'use client'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { useIsMobile } from '@/hooks/useIsMobile'
import { saveItem } from '@/lib/savedItems'
import { saveDraft, loadDraft, clearDraft } from '@/lib/saveDraft'
import { rpc } from '@/lib/api'

const CHIPS = [
  'The water cycle',
  'How the stock market works',
  'The French Revolution',
  'CRISPR gene editing',
  'The causes of inflation',
]

export default function SummarizePage() {
  const { user } = useAuth()
  const isMobile  = useIsMobile()

  const [input,       setInput]       = useState('')
  const [output,      setOutput]      = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [saveFeedback,setSaveFeedback]= useState('')
  const [speaking,    setSpeaking]    = useState(false)
  const [copied,      setCopied]      = useState(false)
  const [draftBanner, setDraftBanner] = useState(false)
  const audioRef = useRef(null)

  // word count derived from input
  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0
  const readTime  = Math.max(1, Math.round(wordCount / 200))
  const barWidth  = Math.min(100, (wordCount / 500) * 100)

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const stored = sessionStorage.getItem('flashfo_load_summary')
    if (stored) {
      try {
        const { input:si, output:so } = JSON.parse(stored)
        sessionStorage.removeItem('flashfo_load_summary')
        if (so) { setInput(si||''); setOutput(so); return }
      } catch(e) {}
    }
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) { setInput(decodeURIComponent(q)); return }
    loadDraft('summarize').then(draft => {
      if (draft?.data?.output) {
        setInput(draft.data.input||''); setOutput(draft.data.output); setDraftBanner(true)
      }
    })
  }, [])

  // ── Run summary ─────────────────────────────────────────────────────────────

  async function run() {
    if (!input.trim()) return
    setLoading(true); setOutput(''); setError(''); setDraftBanner(false)
    try {
      const d = await rpc('summarizeText', [input.trim()])
      const result = typeof d.result==='string' ? d.result : JSON.stringify(d.result)
      setOutput(result)
      if (user) await saveDraft('summarize', input.trim().substring(0,60), { input:input.trim(), output:result })
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  // ── TTS ─────────────────────────────────────────────────────────────────────

  async function speak() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current=null; setSpeaking(false); return }
    setSpeaking(true)
    try {
      const d = await rpc('generateOpenAITtsAudio', [output, 'nova', 1])
      const audio = new Audio('data:'+d.result.mimeType+';base64,'+d.result.base64)
      audioRef.current = audio
      audio.onended = () => { setSpeaking(false); audioRef.current=null }
      audio.play()
    } catch { setSpeaking(false) }
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function doSave() {
    if (!user||!output) return; setSaving(true)
    try {
      await saveItem(user.id, 'summary', input.trim().substring(0,60)+'…', { output, input })
      setSaveFeedback('Saved!'); await clearDraft('summarize')
      setTimeout(()=>setSaveFeedback(''), 3000)
    } catch { setSaveFeedback('Save failed') }
    finally { setSaving(false) }
  }

  function startFresh() { setInput(''); setOutput(''); setDraftBanner(false); clearDraft('summarize') }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding:'28px 24px 48px', maxWidth:1100, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Draft banner */}
      {draftBanner && (
        <div style={{ background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:10, padding:'10px 14px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
          <span style={{ fontSize:12, color:'rgba(241,240,255,0.65)', flex:1 }}>Resuming your last summary</span>
          <button onClick={startFresh} style={{ fontSize:11, color:'rgba(241,240,255,0.35)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Start fresh</button>
        </div>
      )}

      {/* Badge */}
      <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:20, padding:'5px 13px', fontSize:10, fontWeight:800, color:'#fbbf24', marginBottom:16, letterSpacing:'.08em', textTransform:'uppercase' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M4 12h10M4 18h7"/></svg>
        Nova · Summary
      </div>
      <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-.03em', marginBottom:5, color:'var(--c-t1)', lineHeight:1.15 }}>Get to the point instantly</h1>
      <p style={{ fontSize:13, color:'var(--c-t2)', marginBottom:22, lineHeight:1.65, maxWidth:520 }}>Paste an article, chapter, or lecture notes. Nova reads it and gives you exactly what you need to know.</p>

      {/* Quick-start chips — topics Nova can summarise directly */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
        {CHIPS.map(c => (
          <button key={c} onClick={()=>setInput(c)} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
            {c}
          </button>
        ))}
      </div>

      {/* Main input — single column on mobile, two-column on desktop */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:20, alignItems:'start' }}>

        {/* Left col — input */}
        <div>
          <div style={{ position:'relative' }}>

            {/* Animated orb layer — amber palette */}
            <div style={{ position:'absolute', inset:-50, pointerEvents:'none', zIndex:0, overflow:'hidden', borderRadius:60, filter:'blur(35px)', opacity:0.4 }}>
              <div style={{ position:'absolute', width:230, height:230, borderRadius:'50%', background:'radial-gradient(circle,#d97706,transparent 70%)', top:-30, left:-30, animation:'smOrb1 13s ease-in-out infinite' }}/>
              <div style={{ position:'absolute', width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,#b45309,transparent 70%)', bottom:-10, right:-10, animation:'smOrb2 16s ease-in-out infinite' }}/>
              <div style={{ position:'absolute', width:150, height:150, borderRadius:'50%', background:'radial-gradient(circle,#f59e0b,transparent 70%)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', animation:'smOrb3 11s ease-in-out infinite' }}/>
            </div>

            <style>{`
              @keyframes smOrb1{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(26px,18px) scale(1.1)}70%{transform:translate(-12px,28px) scale(0.94)}}
              @keyframes smOrb2{0%,100%{transform:translate(0,0) scale(1)}35%{transform:translate(-22px,-16px) scale(1.08)}65%{transform:translate(18px,-26px) scale(0.93)}}
              @keyframes smOrb3{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.2)}}
              @keyframes smBtnGrad{0%{background-position:0% 50%}100%{background-position:200% 50%}}
              @keyframes smShine{0%,100%{left:-60%}50%{left:120%}}
              .sm-genbtn{width:100%;padding:16px;border:none;border-radius:14px;background:linear-gradient(110deg,#92400e 0%,#d97706 35%,#fbbf24 50%,#d97706 65%,#78350f 100%);background-size:200% 100%;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:-.3px;box-shadow:0 4px 24px rgba(217,119,6,0.35),0 1px 0 rgba(255,255,255,0.15) inset;transition:all .2s cubic-bezier(.2,.8,.2,1);position:relative;overflow:hidden;animation:smBtnGrad 4s linear infinite;display:flex;align-items:center;justify-content:center;gap:9;}
              .sm-genbtn::after{content:'';position:absolute;top:-50%;left:-60%;width:40%;height:200%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);transform:skewX(-20deg);animation:smShine 3.5s ease-in-out infinite;}
              .sm-genbtn:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(217,119,6,0.5),0 1px 0 rgba(255,255,255,0.2) inset;}
              .sm-genbtn:active{transform:translateY(1px);}
              .sm-genbtn:disabled{opacity:0.45;cursor:not-allowed;transform:none;animation:none;}
            `}</style>

            {/* Card */}
            <div style={{ position:'relative', zIndex:1, borderRadius:24, background:'rgba(12,10,22,0.88)', backdropFilter:'blur(40px) saturate(1.5)', WebkitBackdropFilter:'blur(40px) saturate(1.5)', border:'1px solid rgba(255,255,255,0.09)', boxShadow:'0 0 0 1px rgba(255,255,255,0.04) inset, 0 40px 80px rgba(0,0,0,0.6)', overflow:'hidden' }}>

              {/* Top shimmer */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.08) 20%,rgba(255,255,255,0.2) 50%,rgba(255,255,255,0.08) 80%,transparent)', zIndex:10, pointerEvents:'none' }}/>

              {/* Textarea */}
              <div style={{ padding:'24px 24px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <textarea
                  value={input}
                  onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>{ if (e.key==='Enter'&&e.metaKey&&input.trim()) run() }}
                  rows={7}
                  placeholder={`Paste your text, article, or notes here…\n\nNova will extract the key points, main arguments, and anything worth remembering.`}
                  style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'rgba(255,255,255,0.78)', fontFamily:'inherit', fontSize:15, lineHeight:1.65, resize:'none', display:'block', caretColor:'rgba(255,255,255,0.5)' }}
                />
              </div>

              {/* Word count footer */}
              <div style={{ padding:'10px 24px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.2)' }}>
                  {wordCount > 0 ? `${wordCount.toLocaleString()} words · ~${readTime} min read` : 'Paste anything up to ~50,000 words'}
                </span>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.13)' }}>⌘↵ summarise</span>
              </div>
            </div>
          </div>

          {/* Word count bar */}
          <div style={{ height:2, background:'rgba(255,255,255,0.06)', borderRadius:2, margin:'10px 0 8px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:barWidth+'%', background:'linear-gradient(90deg,#d97706,#f59e0b)', borderRadius:2, transition:'width .4s ease' }}/>
          </div>

          {error && <div style={{ fontSize:12, color:'#f87171', marginBottom:8 }}>{error}</div>}

          <button
            className="sm-genbtn"
            onClick={run}
            disabled={loading||!input.trim()}
          >
            {loading ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation:'_fcspin .7s linear infinite', flexShrink:0 }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                Nova is reading…
              </>
            ) : 'Summarise with Nova →'}
          </button>
        </div>

        {/* Right col — before/after preview, hidden on mobile */}
        {!isMobile && <div>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)', marginBottom:12 }}>Before & after</div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 24px 1fr', gap:8, alignItems:'start', marginBottom:14 }}>
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:12 }}>
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.07em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)', marginBottom:7 }}>Original · 680 words</div>
              <div style={{ fontSize:11, lineHeight:1.7, color:'rgba(255,255,255,0.3)' }}>The process by which green plants use sunlight to synthesize nutrients from carbon dioxide and water. Photosynthesis involves the green pigment chlorophyll and generates oxygen as a byproduct. The light-dependent reactions take place in the thylakoid membrane and produce ATP and NADPH, while the Calvin cycle in the stroma converts CO₂ into glucose…</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', paddingTop:28 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
            <div style={{ background:'rgba(245,158,11,0.04)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:10, padding:12 }}>
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.07em', textTransform:'uppercase', color:'#f59e0b', marginBottom:7 }}>Summary · 52 words</div>
              <div style={{ fontSize:11, lineHeight:1.7, color:'rgba(251,191,36,0.75)', fontWeight:500 }}>Photosynthesis converts sunlight, CO₂, and water into glucose using chlorophyll. Two stages: light-dependent reactions (thylakoid) produce ATP and NADPH; the Calvin cycle (stroma) uses those to make glucose. Oxygen is released as a byproduct.</div>
            </div>
          </div>

          <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.22)', fontWeight:600 }}>Also available:</span>
            {['Bullet points','ELI5 version','Listen aloud','Save to My Stuff'].map(label => (
              <div key={label} style={{ padding:'4px 11px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.18)', color:'rgba(251,191,36,0.65)' }}>
                {label}
              </div>
            ))}
          </div>
        </div>}
      </div>

      {/* ── Output ── */}
      {output && !loading && (
        <div style={{ maxWidth:660, marginTop:28 }}>

          {/* Output header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, paddingBottom:14, borderBottom:'1px solid var(--c-line)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#f59e0b' }}/>
              <span style={{ fontSize:13, fontWeight:700, color:'#fbbf24' }}>Summary ready</span>
              {wordCount > 0 && (
                <>
                  <span style={{ fontSize:12, color:'var(--c-t3)' }}>·</span>
                  <span style={{ fontSize:12, color:'var(--c-t3)' }}>{wordCount.toLocaleString()} words → {output.trim().split(/\s+/).length} words</span>
                </>
              )}
            </div>
            <button onClick={startFresh} style={{ height:30, padding:'0 12px', borderRadius:8, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t2)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              New summary
            </button>
          </div>

          {/* Summary card */}
          <div style={{ background:'var(--c-surface)', border:'1px solid rgba(245,158,11,0.18)', borderRadius:14, padding:'20px 22px', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14 }}>
              <div style={{ width:3, height:16, background:'#f59e0b', borderRadius:2 }}/>
              <span style={{ fontSize:10, fontWeight:800, color:'rgba(251,191,36,0.5)', letterSpacing:'.08em', textTransform:'uppercase' }}>Summary</span>
            </div>
            <div style={{ fontSize:14, color:'var(--c-t1)', lineHeight:1.75, whiteSpace:'pre-wrap' }}>{output}</div>

            {/* Action row */}
            <div style={{ marginTop:18, paddingTop:14, borderTop:'1px solid var(--c-line)', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
              <button
                onClick={()=>{ navigator.clipboard?.writeText(output); setCopied(true); setTimeout(()=>setCopied(false),2000) }}
                style={{ height:32, padding:'0 12px', borderRadius:8, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:copied?'#34d399':'var(--c-t2)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, transition:'color .15s' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                {copied ? 'Copied!' : 'Copy'}
              </button>

              <button
                onClick={speak}
                style={{ height:32, padding:'0 12px', borderRadius:8, border:'1px solid '+(speaking?'rgba(245,158,11,0.3)':'var(--c-line)'), background:speaking?'rgba(245,158,11,0.07)':'var(--c-surface2)', color:speaking?'#fbbf24':'var(--c-t2)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, transition:'all .15s' }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 6h2.5L8 4v8L5.5 10H3V6z"/>
                  {speaking ? <path d="M10 6.5a2 2 0 010 3"/> : <><path d="M10 5a4 4 0 010 6"/><path d="M12.5 3a7 7 0 010 10"/></>}
                </svg>
                {speaking ? 'Stop' : 'Listen'}
              </button>

              {user && (
                <button onClick={doSave} disabled={saving} style={{ height:32, padding:'0 12px', borderRadius:8, border:'1px solid rgba(52,211,153,0.22)', background:'rgba(16,185,129,0.06)', color:'#34d399', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, opacity:saving?.6:1 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  {saving ? 'Saving…' : 'Save to My Stuff'}
                </button>
              )}
              {saveFeedback && <span style={{ fontSize:12, color:'#34d399', fontWeight:500 }}>{saveFeedback}</span>}
            </div>
          </div>

          {/* Go deeper prompt */}
          <div style={{ padding:'14px 16px', background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.14)', borderRadius:12, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'rgba(251,191,36,0.65)', marginBottom:3 }}>Want to go deeper?</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.28)', lineHeight:1.5 }}>Turn this into flashcards, generate a quiz, or ask Nova to break it down further.</div>
            </div>
            <button onClick={startFresh} style={{ height:30, padding:'0 12px', borderRadius:8, border:'1px solid rgba(245,158,11,0.22)', background:'rgba(245,158,11,0.08)', color:'#fbbf24', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
              New summary
            </button>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div style={{ maxWidth:660, marginTop:28 }}>
          <div style={{ padding:'18px 20px', background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:12, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#f59e0b', animation:'nova-pulse .9s ease-in-out infinite', flexShrink:0 }}/>
            <span style={{ fontSize:13, color:'rgba(251,191,36,0.65)' }}>Nova is reading and condensing your text…</span>
          </div>
        </div>
      )}

    </div>
  )
}
