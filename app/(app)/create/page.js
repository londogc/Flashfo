'use client'
import { useState, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { useRouter } from 'next/navigation'
import { rpc } from '@/lib/api'

const TOOL_ICONS = {
  flashcards: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
  quiz:       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>,
  study_guide:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>,
  summary:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
}

// Input mode tab icons — SVG, no emoji
const MODE_ICONS = {
  topic: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  paste: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>,
  pdf:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>,
}

const TOOLS = [
  { id:'flashcards',  label:'Flashcards',  desc:'Generate a full flashcard deck' },
  { id:'quiz',        label:'Quiz',         desc:'Build a custom quiz' },
  { id:'study_guide', label:'Study Guide',  desc:'Detailed study guide' },
  { id:'summary',     label:'Summary',      desc:'Concise topic summary' },
]

const INPUT_MODES = [
  { id:'topic', label:'Topic' },
  { id:'paste', label:'Paste notes' },
  { id:'pdf',   label:'Upload PDF' },
]

export default function CreatePage() {
  const { user }   = useAuth()
  const router     = useRouter()
  const [tool,       setTool]       = useState('flashcards')
  const [inputMode,  setInputMode]  = useState('topic')
  const [topic,      setTopic]      = useState('')
  const [pastedText, setPastedText] = useState('')
  const [pdfText,    setPdfText]    = useState('')
  const [pdfFile,    setPdfFile]    = useState(null)
  const [pdfName,    setPdfName]    = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const fileRef = useRef(null)

  const readPDF = async (file) => {
    setPdfName(file.name); setPdfText(''); setPdfFile(null); setError('')
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1]
      const filePayload = { base64, mimeType: file.type || 'application/pdf', name: file.name }
      setPdfFile(filePayload); setInputMode('pdf')
      setLoading(true)
      try {
        const data = await rpc('summarizeImportedFile', [filePayload, 'paragraph', 'English'])
        setPdfText(data?.result || '')
      } catch {}
      setLoading(false)
    }
    reader.readAsDataURL(file)
  }

  const generate = async () => {
    setError('')
    let content = ''
    if (inputMode === 'topic') content = topic.trim()
    else if (inputMode === 'paste') content = pastedText.trim()
    else if (inputMode === 'pdf') content = pdfText.trim()
    const hasPdfFile = inputMode === 'pdf' && pdfFile
    if (!content && !hasPdfFile) { setError('Add some content first'); return }
    if (typeof window !== 'undefined') {
      const topicLabel = inputMode === 'topic' ? content : pdfName || 'Imported content'
      if (hasPdfFile) sessionStorage.setItem('ff-import-file', JSON.stringify({ file: pdfFile, tool, topic: topicLabel }))
      sessionStorage.setItem('ff-create-content', JSON.stringify({ inputMode, content: content || topicLabel, topic: topicLabel }))
    }
    const routes = { flashcards:'/flashcards', quiz:'/quiz', study_guide:'/study-guide', summary:'/summarize' }
    const dest = routes[tool] || '/flashcards'
    const queryContent = content || pdfName || ''
    router.push(dest + (queryContent ? '?q=' + encodeURIComponent(queryContent) : ''))
  }

  const toolColors = {
    flashcards:  { o1:'#2563eb', o2:'#4f46e5', o3:'#3b82f6', gen:'linear-gradient(110deg,#1d4ed8 0%,#2563eb 35%,#60a5fa 50%,#2563eb 65%,#1e40af 100%)', shadow:'0 4px 24px rgba(37,99,235,0.4),0 1px 0 rgba(255,255,255,0.15) inset', tipColor:'#60a5fa', tipDot:'#3b82f6', foot:'Nova creates flashcards built for spaced repetition', tip:'Pasting your actual class notes gives Nova the most accurate context — she\'ll match your teacher\'s vocabulary and focus on exactly what your class covers.', tileOn:'rgba(37,99,235,0.14)', tileBorder:'rgba(37,99,235,0.4)', tileColor:'#60a5fa', tileShadow:'0 8px 20px rgba(37,99,235,0.18)' },
    quiz:        { o1:'#6366f1', o2:'#4f46e5', o3:'#818cf8', gen:'linear-gradient(110deg,#4338ca 0%,#6366f1 35%,#a5b4fc 50%,#6366f1 65%,#3730a3 100%)', shadow:'0 4px 24px rgba(99,102,241,0.4),0 1px 0 rgba(255,255,255,0.15) inset', tipColor:'#818cf8', tipDot:'#6366f1', foot:'Nova grades answers and explains every wrong one', tip:'The more specific your topic, the better the questions. "Mitosis in plant cells" beats "biology" every time.', tileOn:'rgba(99,102,241,0.14)', tileBorder:'rgba(99,102,241,0.4)', tileColor:'#818cf8', tileShadow:'0 8px 20px rgba(99,102,241,0.18)' },
    study_guide: { o1:'#059669', o2:'#0d9488', o3:'#34d399', gen:'linear-gradient(110deg,#047857 0%,#059669 35%,#34d399 50%,#059669 65%,#065f46 100%)', shadow:'0 4px 24px rgba(5,150,105,0.4),0 1px 0 rgba(255,255,255,0.15) inset', tipColor:'#6ee7b7', tipDot:'#34d399', foot:'Nova writes it like a knowledgeable teacher, not a textbook', tip:'Paste your syllabus or exam spec and Nova will structure the guide around exactly what you need to know.', tileOn:'rgba(52,211,153,0.12)', tileBorder:'rgba(52,211,153,0.4)', tileColor:'#6ee7b7', tileShadow:'0 8px 20px rgba(52,211,153,0.15)' },
    summary:     { o1:'#d97706', o2:'#b45309', o3:'#f59e0b', gen:'linear-gradient(110deg,#92400e 0%,#d97706 35%,#fbbf24 50%,#d97706 65%,#78350f 100%)', shadow:'0 4px 24px rgba(217,119,6,0.4),0 1px 0 rgba(255,255,255,0.15) inset', tipColor:'#fbbf24', tipDot:'#f59e0b', foot:'Paste anything up to ~50,000 words', tip:'Nova works best with dense content — lecture slides, textbook chapters, research papers. The longer, the better.', tileOn:'rgba(245,158,11,0.12)', tileBorder:'rgba(245,158,11,0.4)', tileColor:'#fbbf24', tileShadow:'0 8px 20px rgba(245,158,11,0.15)' },
  }
  const tc = toolColors[tool] || toolColors.flashcards

  return (
    <div style={{ maxWidth:680, margin:'0 auto', padding:'0 16px 40px' }}>
      <h1 style={{ fontSize:22, fontWeight:700, color:'var(--c-t1)', marginBottom:4 }}>Create</h1>
      <p style={{ color:'var(--c-t2)', fontSize:14, marginBottom:22 }}>Drop a topic, paste notes, or upload a PDF — Nova builds your study kit.</p>

      {/* Tool selector — glassmorphism tiles */}
      <style>{`
        @keyframes crBtnGrad{0%{background-position:0% 50%}100%{background-position:200% 50%}}
        @keyframes crShine{0%,100%{left:-60%}50%{left:120%}}
        @keyframes crOrb1{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(24px,16px) scale(1.1)}70%{transform:translate(-10px,24px) scale(0.94)}}
        @keyframes crOrb2{0%,100%{transform:translate(0,0) scale(1)}35%{transform:translate(-20px,-14px) scale(1.08)}65%{transform:translate(16px,-22px) scale(0.93)}}
        @keyframes crOrb3{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.2)}}
        .cr-tile{padding:14px 8px;border-radius:14px;background:rgba(255,255,255,0.035);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.28);cursor:pointer;font-family:inherit;text-align:center;transform:translateY(0) scale(1);box-shadow:0 1px 3px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.04) inset;position:relative;overflow:hidden;transition:all .2s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column;align-items:center;}
        .cr-tile::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:rgba(255,255,255,0.07);}
        .cr-tile:hover{background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.14);color:rgba(255,255,255,0.7);transform:translateY(-3px) scale(1.02);box-shadow:0 8px 20px rgba(0,0,0,0.5);}
        .cr-mode-btn{flex:1;padding:9px 4px;border:none;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;border-bottom:2px solid transparent;background:none;color:rgba(255,255,255,0.25);transition:all .15s;display:flex;align-items:center;justify-content:center;gap:6px;}
        .cr-mode-btn:hover{color:rgba(255,255,255,0.6);}
        .cr-mode-btn.cr-mode-on{color:#fff;border-bottom-color:#fff;}
        .cr-genbtn{width:100%;padding:16px;border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:-.3px;background-size:200% 100%;transition:all .2s cubic-bezier(.2,.8,.2,1);position:relative;overflow:hidden;animation:crBtnGrad 4s linear infinite;display:flex;align-items:center;justify-content:center;gap:9;}
        .cr-genbtn::after{content:'';position:absolute;top:-50%;left:-60%;width:40%;height:200%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);transform:skewX(-20deg);animation:crShine 3.5s ease-in-out infinite;}
        .cr-genbtn:hover{transform:translateY(-2px);}
        .cr-genbtn:active{transform:translateY(1px);}
        .cr-genbtn:disabled{opacity:0.45;cursor:not-allowed;transform:none;animation:none;}
      `}</style>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7, marginBottom:16 }}>
        {TOOLS.map(t=>{
          const isOn = tool === t.id
          const c = toolColors[t.id]
          return (
            <button key={t.id} className="cr-tile" onClick={()=>setTool(t.id)}
              style={ isOn ? { background:c.tileOn, borderColor:c.tileBorder, color:c.tileColor, transform:'translateY(-3px) scale(1.02)', boxShadow:c.tileShadow+',0 0 0 1px '+c.tileBorder.replace('0.4','0.2')+' inset' } : {} }>
              <div style={{ marginBottom:6, opacity: isOn ? 1 : 0.45, transition:'opacity .2s' }}>{TOOL_ICONS[t.id]}</div>
              <div style={{ fontSize:12, fontWeight:700 }}>{t.label}</div>
            </button>
          )
        })}
      </div>

      {/* Card + orbs */}
      <div style={{ position:'relative' }}>
        {/* Orb layer */}
        <div style={{ position:'absolute', inset:-50, pointerEvents:'none', zIndex:0, overflow:'hidden', borderRadius:60, filter:'blur(35px)', opacity:0.45 }}>
          <div style={{ position:'absolute', width:210, height:210, borderRadius:'50%', background:`radial-gradient(circle,${tc.o1},transparent 70%)`, top:-20, left:-20, animation:'crOrb1 13s ease-in-out infinite', transition:'background .7s' }}/>
          <div style={{ position:'absolute', width:170, height:170, borderRadius:'50%', background:`radial-gradient(circle,${tc.o2},transparent 70%)`, bottom:-10, right:-10, animation:'crOrb2 16s ease-in-out infinite', transition:'background .7s' }}/>
          <div style={{ position:'absolute', width:140, height:140, borderRadius:'50%', background:`radial-gradient(circle,${tc.o3},transparent 70%)`, top:'50%', left:'50%', transform:'translate(-50%,-50%)', animation:'crOrb3 11s ease-in-out infinite', transition:'background .7s' }}/>
        </div>

        {/* Card */}
        <div style={{ position:'relative', zIndex:1, borderRadius:22, background:'rgba(12,10,22,0.88)', backdropFilter:'blur(40px) saturate(1.5)', WebkitBackdropFilter:'blur(40px) saturate(1.5)', border:'1px solid rgba(255,255,255,0.09)', boxShadow:'0 0 0 1px rgba(255,255,255,0.04) inset,0 30px 60px rgba(0,0,0,0.5)', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.08) 20%,rgba(255,255,255,0.2) 50%,rgba(255,255,255,0.08) 80%,transparent)', zIndex:10, pointerEvents:'none' }}/>

          {/* Mode switcher */}
          <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(255,255,255,0.03)' }}>
            {INPUT_MODES.map(m=>(
              <button key={m.id} className={'cr-mode-btn'+(inputMode===m.id?' cr-mode-on':'')} onClick={()=>setInputMode(m.id)}>
                {MODE_ICONS[m.id]}{m.label}
              </button>
            ))}
          </div>

          {/* Input area */}
          <div style={{ padding:'20px 22px 18px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
            {inputMode === 'topic' && (
              <textarea value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&e.metaKey) generate() }} rows={4}
                placeholder="e.g. The causes of World War I, Photosynthesis, Quadratic equations..."
                style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'rgba(255,255,255,0.78)', fontFamily:'inherit', fontSize:15, lineHeight:1.65, resize:'none', display:'block', caretColor:'rgba(255,255,255,0.5)' }}/>
            )}
            {inputMode === 'paste' && (
              <textarea value={pastedText} onChange={e=>setPastedText(e.target.value)} rows={6}
                placeholder="Paste your notes, textbook excerpt, or any text here..."
                style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'rgba(255,255,255,0.78)', fontFamily:'inherit', fontSize:14, lineHeight:1.65, resize:'none', display:'block', caretColor:'rgba(255,255,255,0.5)' }}/>
            )}
            {inputMode === 'pdf' && (
              <div>
                <div onClick={()=>fileRef.current?.click()}
                  style={{ border:`1.5px dashed ${pdfFile ? '#34d399' : 'rgba(255,255,255,0.15)'}`, borderRadius:12, padding:'28px 16px', textAlign:'center', cursor:'pointer', background:'rgba(255,255,255,0.02)', transition:'all .2s' }}
                  onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=tc.tileColor}}
                  onDragLeave={e=>e.currentTarget.style.borderColor=pdfFile?'#34d399':'rgba(255,255,255,0.15)'}
                  onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)readPDF(f);}}>
                  <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={pdfFile ? '#34d399' : 'rgba(255,255,255,0.25)'} strokeWidth="1.4" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p style={{ color:'rgba(255,255,255,0.45)', fontSize:13, margin:'0 0 4px' }}>
                    {pdfName ? pdfName : 'Drop your PDF here or click to browse'}
                  </p>
                  {loading && <p style={{ color:'rgba(255,255,255,0.25)', fontSize:12, margin:0 }}>Reading file...</p>}
                  {!loading && pdfFile && <p style={{ color:'#34d399', fontSize:12, margin:0 }}>Ready to generate</p>}
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)readPDF(f);}}/>
              </div>
            )}
          </div>

          <div style={{ padding:'9px 22px 14px', display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.18)' }}>{tc.foot}</span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.13)' }}>⌘↵ generate</span>
          </div>
        </div>
      </div>

      {error && <p style={{ color:'#f87171', fontSize:13, margin:'8px 0 0' }}>{error}</p>}

      <button className="cr-genbtn" onClick={generate} disabled={loading}
        style={{ marginTop:12, background:tc.gen, boxShadow:tc.shadow }}>
        {loading ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation:'_fcspin .7s linear infinite', flexShrink:0 }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
            Reading file...
          </>
        ) : 'Generate with Nova'}
      </button>

      {/* Nova tip */}
      <div style={{ marginTop:14, padding:'16px 18px', background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${tc.tipDot}44 30%,${tc.tipDot}66 50%,${tc.tipDot}44 70%,transparent)` }}/>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:tc.tipDot, flexShrink:0, transition:'background .5s' }}/>
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:tc.tipColor, transition:'color .5s' }}>Nova tip</span>
        </div>
        <p style={{ margin:0, fontSize:13, color:'rgba(255,255,255,0.4)', lineHeight:1.6 }}>{tc.tip}</p>
      </div>
    </div>
  )
}
