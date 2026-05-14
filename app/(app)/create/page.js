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

  return (
    <div style={{ maxWidth:680, margin:'0 auto', padding:'0 16px 40px' }}>
      <h1 style={{ fontSize:22, fontWeight:700, color:'var(--c-t1)', marginBottom:4 }}>Create</h1>
      <p style={{ color:'var(--c-t2)', fontSize:14, marginBottom:24 }}>Drop a topic, paste notes, or upload a PDF — Nova builds your study kit.</p>

      {/* Tool selector */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:24 }}>
        {TOOLS.map(t=>(
          <button key={t.id} onClick={()=>setTool(t.id)}
            style={{ padding:'12px 8px', borderRadius:10, border:'1px solid', display:'flex', flexDirection:'column', alignItems:'center', cursor:'pointer', transition:'all 0.15s', borderColor: tool===t.id ? '#2563eb' : 'var(--c-line)', background: tool===t.id ? 'rgba(37,99,235,0.08)' : 'var(--c-surface)', color: tool===t.id ? '#2563eb' : 'var(--c-t2)' }}>
            <div style={{ fontSize:20, marginBottom:4 }}>{TOOL_ICONS[t.id]}</div>
            <div style={{ fontSize:12, fontWeight:600 }}>{t.label}</div>
          </button>
        ))}
      </div>

      {/* Input mode tabs — SVG icons instead of emoji */}
      <div style={{ display:'flex', gap:4, marginBottom:12, background:'var(--c-surface2)', borderRadius:8, padding:3 }}>
        {INPUT_MODES.map(m=>(
          <button key={m.id} onClick={()=>setInputMode(m.id)}
            style={{ flex:1, padding:'7px 4px', borderRadius:6, border:'none', fontSize:12, fontWeight:500, cursor:'pointer', transition:'all 0.15s', background: inputMode===m.id ? 'var(--c-surface)' : 'transparent', color: inputMode===m.id ? 'var(--c-t1)' : 'var(--c-t3)', boxShadow: inputMode===m.id ? '0 1px 4px rgba(0,0,0,0.15)' : 'none', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            {MODE_ICONS[m.id]}
            {m.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div style={{ marginBottom:16 }}>
        {inputMode === 'topic' && (
          <textarea value={topic} onChange={e=>setTopic(e.target.value)} rows={3}
            placeholder="e.g. The causes of World War I, Photosynthesis, Quadratic equations..."
            style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:'1px solid var(--c-line)', background:'var(--c-surface)', color:'var(--c-t1)', fontSize:14, resize:'vertical', boxSizing:'border-box', lineHeight:1.5 }}/>
        )}
        {inputMode === 'paste' && (
          <textarea value={pastedText} onChange={e=>setPastedText(e.target.value)} rows={8}
            placeholder="Paste your notes, textbook excerpt, or any text here..."
            style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:'1px solid var(--c-line)', background:'var(--c-surface)', color:'var(--c-t1)', fontSize:13, resize:'vertical', boxSizing:'border-box', lineHeight:1.6, fontFamily:'inherit' }}/>
        )}
        {inputMode === 'pdf' && (
          <div>
            <div onClick={()=>fileRef.current?.click()}
              style={{ border:`2px dashed ${pdfFile ? '#34d399' : 'var(--c-line)'}`, borderRadius:10, padding:'32px 16px', textAlign:'center', cursor:'pointer', background:'var(--c-surface)', transition:'border-color 0.2s' }}
              onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor='#2563eb'}}
              onDragLeave={e=>e.currentTarget.style.borderColor=pdfFile?'#34d399':'var(--c-line)'}
              onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)readPDF(f);}}>
              {/* Upload SVG icon — replaces 📄 emoji */}
              <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={pdfFile ? '#34d399' : 'rgba(255,255,255,0.25)'} strokeWidth="1.4" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p style={{ color:'var(--c-t2)', fontSize:13, margin:'0 0 4px' }}>
                {pdfName ? pdfName : 'Drop your PDF here or click to browse'}
              </p>
              {loading && <p style={{ color:'var(--c-t3)', fontSize:12, margin:0 }}>Reading file...</p>}
              {!loading && pdfFile && <p style={{ color:'#34d399', fontSize:12, margin:0 }}>Ready to generate</p>}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx" style={{ display:'none' }}
              onChange={e=>{const f=e.target.files?.[0];if(f)readPDF(f);}}/>
          </div>
        )}
      </div>

      {error && <p style={{ color:'#ef4444', fontSize:13, marginBottom:12 }}>{error}</p>}

      <button onClick={generate} disabled={loading}
        style={{ width:'100%', padding:'13px 0', borderRadius:10, background:'linear-gradient(90deg,#2563eb,#7c3aed)', color:'#fff', border:'none', fontWeight:700, fontSize:14, cursor:loading?'not-allowed':'pointer', opacity:loading?0.6:1, letterSpacing:'-0.01em' }}>
        {loading ? 'Reading file...' : 'Generate with Nova'}
      </button>

      <div style={{ marginTop:32, padding:'16px 20px', background:'rgba(167,139,250,0.06)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:10 }}>
        <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:600, color:'#a78bfa' }}>Nova tip</p>
        <p style={{ margin:0, fontSize:13, color:'var(--c-t2)' }}>Pasting your actual class notes gives Nova the most accurate context — she'll match your teacher's vocabulary and focus on exactly what your class covers.</p>
      </div>
    </div>
  )
}
