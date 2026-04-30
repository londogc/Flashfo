'use client'
import { useState, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { useRouter } from 'next/navigation'

const TOOL_ICONS = {
  flashcards: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
  quiz:       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>,
  study_guide:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>,
  summary:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
}
const TOOLS = [
  { id:'flashcards', label:'Flashcards', desc:'Generate a full flashcard deck' },
  { id:'quiz',       label:'Quiz',       desc:'Build a custom quiz' },
  { id:'study_guide',label:'Study Guide',desc:'Detailed study guide' },
  { id:'summary',    label:'Summary',    desc:'Concise topic summary' },
]

export default function CreatePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [tool, setTool] = useState('flashcards')
  const [inputMode, setInputMode] = useState('topic') // 'topic' | 'paste' | 'pdf'
  const [topic, setTopic] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [pdfText, setPdfText] = useState('')
  const [pdfName, setPdfName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const readPDF = async (file) => {
    // Use FileReader to get base64, send to rpc for text extraction
    setPdfName(file.name)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1]
      setLoading(true)
      try {
        const res = await fetch('/api/rpc', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ fn:'summarizeImportedFile', args:[{ base64, mimeType: file.type, filename: file.name }, 'Extract all text content verbatim, preserving structure.'] }) })
        const data = await res.json()
        setPdfText(data.result || data.text || '')
        setInputMode('pdf')
      } catch { setError('Could not read PDF') }
      setLoading(false)
    }
    reader.readAsDataURL(file)
  }

  const generate = async () => {
    const content = inputMode === 'topic' ? topic : inputMode === 'paste' ? pastedText : pdfText
    if (!content.trim()) { setError('Add some content first'); return }
    setError('')
    // Route to the right page with content pre-filled via sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ff-create-content', JSON.stringify({ inputMode, content, topic: inputMode==='topic'?content:pdfName||'Imported content' }))
    }
    const routes = { flashcards:'/flashcards', quiz:'/quiz', study_guide:'/study-guide', summary:'/study-guide' }
    router.push(routes[tool] || '/flashcards')
  }

  return (
    <div style={{ maxWidth:680, margin:'0 auto', padding:'0 16px 40px' }}>
      <h1 style={{ fontSize:22, fontWeight:700, color:'var(--c-t1)', marginBottom:4 }}>Create</h1>
      <p style={{ color:'var(--c-t2)', fontSize:14, marginBottom:24 }}>Drop a topic, paste notes, or upload a PDF — Nova builds your study kit.</p>

      {/* Tool selector */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:24 }}>
        {TOOLS.map(t=>(
          <button key={t.id} onClick={()=>setTool(t.id)}
            style={{ padding:'12px 8px', borderRadius:10, border:'1px solid', textAlign:'center', cursor:'pointer', transition:'all 0.15s',
              borderColor: tool===t.id ? '#2563eb' : 'var(--c-line)',
              background: tool===t.id ? 'rgba(37,99,235,0.08)' : 'var(--c-surface)',
              color: tool===t.id ? '#2563eb' : 'var(--c-t2)' }}>
            <div style={{ fontSize:20, marginBottom:4 }}>{TOOL_ICONS[t.id]}</div>
            <div style={{ fontSize:12, fontWeight:600 }}>{t.label}</div>
          </button>
        ))}
      </div>

      {/* Input mode tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:12, background:'var(--c-surface2)', borderRadius:8, padding:3 }}>
        {[['topic','💬 Topic'],['paste','📋 Paste notes'],['pdf','📄 Upload PDF']].map(([mode,label])=>(
          <button key={mode} onClick={()=>setInputMode(mode)}
            style={{ flex:1, padding:'7px 4px', borderRadius:6, border:'none', fontSize:12, fontWeight:500, cursor:'pointer', transition:'all 0.15s',
              background: inputMode===mode ? 'var(--c-surface)' : 'transparent',
              color: inputMode===mode ? 'var(--c-t1)' : 'var(--c-t3)',
              boxShadow: inputMode===mode ? '0 1px 4px rgba(0,0,0,0.15)' : 'none' }}>
            {label}
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
            <div onClick={()=>fileRef.current?.click()} style={{ border:'2px dashed var(--c-line)', borderRadius:10, padding:'32px 16px', textAlign:'center', cursor:'pointer', background:'var(--c-surface)', transition:'border-color 0.2s' }}
              onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor='#2563eb'}}
              onDragLeave={e=>e.currentTarget.style.borderColor='var(--c-line)'}
              onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)readPDF(f);}}>
              <div style={{ fontSize:32, marginBottom:8 }}>📄</div>
              <p style={{ color:'var(--c-t2)', fontSize:13, margin:'0 0 4px' }}>{pdfName ? pdfName : 'Drop your PDF here or click to browse'}</p>
              {pdfText && <p style={{ color:'#34d399', fontSize:12, margin:0 }}>✓ Text extracted — ready to generate</p>}
              {loading && <p style={{ color:'var(--c-t3)', fontSize:12, margin:0 }}>Reading file...</p>}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)readPDF(f);}}/>
          </div>
        )}
      </div>

      {error && <p style={{ color:'#ef4444', fontSize:13, marginBottom:12 }}>{error}</p>}

      <button onClick={generate} disabled={loading}
        style={{ padding:'11px 28px', borderRadius:10, background:'#2563eb', color:'#fff', border:'none', fontWeight:600, fontSize:14, cursor:'pointer', opacity:loading?0.6:1 }}>
        {loading ? 'Working...' : '✦ Generate with Nova'}
      </button>

      <div style={{ marginTop:32, padding:'16px 20px', background:'rgba(167,139,250,0.06)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:10 }}>
        <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:600, color:'#a78bfa' }}>✦ Nova tip</p>
        <p style={{ margin:0, fontSize:13, color:'var(--c-t2)' }}>Pasting your actual class notes gives Nova the most accurate context — she'll match your teacher's vocabulary and focus on exactly what your class covers.</p>
      </div>
    </div>
  )
}
