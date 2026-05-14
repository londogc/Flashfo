'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { rpc } from '@/lib/api'
import { saveItem } from '@/lib/savedItems'

// ── CSV / TSV / text parser ───────────────────────────────────────────────────

function parseImportText(raw) {
  const lines = raw.trim().split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return null
  const cards = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    // Tab-separated (Quizlet / Anki)
    if (trimmed.includes('\t')) {
      const [front, ...rest] = trimmed.split('\t')
      const back = rest.join('\t').trim()
      if (front.trim() && back) { cards.push({ front: front.trim(), back }); continue }
    }
    // Quoted CSV: "front","back"
    const quoted = trimmed.match(/^"([^"]+)"\s*,\s*"([^"]+)"$/)
    if (quoted) { cards.push({ front: quoted[1].trim(), back: quoted[2].trim() }); continue }
    // Plain CSV: front,back
    if (trimmed.includes(',')) {
      const comma = trimmed.indexOf(',')
      const front = trimmed.slice(0, comma).trim()
      const back  = trimmed.slice(comma + 1).trim()
      if (front && back) { cards.push({ front, back }); continue }
    }
    // Dash: front - back
    const dash = trimmed.match(/^(.+?)\s{1,3}-{1,2}\s{1,3}(.+)$/)
    if (dash) { cards.push({ front: dash[1].trim(), back: dash[2].trim() }); continue }
    // Colon: front: back
    const colon = trimmed.match(/^([^:]+):\s+(.+)$/)
    if (colon) { cards.push({ front: colon[1].trim(), back: colon[2].trim() }); continue }
  }
  return cards.length >= 2 ? cards : null
}

// ── Format guide rows ─────────────────────────────────────────────────────────

const FORMATS = [
  { name:'CSV',         example:'photosynthesis, process plants use to make food',      note:'Comma separated'      },
  { name:'Quizlet',     example:'photosynthesis\u0009process plants use to make food',  note:'Tab separated export' },
  { name:'Anki',        example:'photosynthesis\u0009process plants use to make food',  note:'.txt deck export'     },
  { name:'Dash',        example:'photosynthesis - process plants use to make food',     note:'Term dash definition' },
  { name:'Colon',       example:'photosynthesis: process plants use to make food',      note:'Term: definition'     },
  { name:'Plain text',  example:'Paste any notes, article, or textbook excerpt',        note:'Nova extracts cards'  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const { user } = useAuth()
  const router   = useRouter()
  const fileRef  = useRef(null)

  const [input,      setInput]      = useState('')
  const [deckName,   setDeckName]   = useState('')
  const [outputType, setOutputType] = useState('flashcards')
  const [cardCount,  setCardCount]  = useState(10)
  const [loading,    setLoading]    = useState(false)
  const [preview,    setPreview]    = useState(null)  // { type, cards|questions, parsed }
  const [error,      setError]      = useState('')
  const [saving,     setSaving]     = useState(false)
  const [showFormats,setShowFormats]= useState(false)

  // detected format label
  const detectedFormat = (() => {
    if (!input.trim()) return null
    if (input.includes('\t'))  return 'Quizlet / Anki (tab-separated)'
    const firstLine = input.trim().split('\n')[0]
    if (firstLine.match(/^"[^"]+",/))  return 'Quoted CSV'
    if (firstLine.includes(','))        return 'CSV'
    if (firstLine.match(/^.+\s-{1,2}\s.+/)) return 'Dash-separated'
    if (firstLine.match(/^[^:]+:\s+.+/))    return 'Colon-separated'
    return 'Plain text — Nova will extract cards'
  })()

  function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setInput(ev.target.result||''); setError(''); setPreview(null) }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleGenerate() {
    if (!input.trim()) { setError('Paste some content or upload a file first.'); return }
    if (!user) { setError('Please sign in to generate content.'); return }
    setLoading(true); setError(''); setPreview(null)

    try {
      if (outputType === 'flashcards') {
        // Try client-side parse first (instant, no API)
        const parsed = parseImportText(input)
        if (parsed) {
          setPreview({ type:'flashcards', cards:parsed, parsed:true })
          if (!deckName) setDeckName(parsed[0]?.front?.slice(0,40)||'Imported deck')
          setLoading(false); return
        }
        // Fall back to Nova
        const data = await rpc('generateFlashcardsFromText', [input.trim(), cardCount, 'English'])
        const cards = data?.result?.cards || []
        if (!cards.length) throw new Error('Could not extract cards. Try a different format or add more content.')
        setPreview({ type:'flashcards', cards, parsed:false })
        if (!deckName) setDeckName(input.trim().slice(0,40))
      } else {
        // Quiz — always use Nova
        const cfg  = { mcq: Math.ceil(cardCount * 0.6), true_false: Math.floor(cardCount * 0.4) }
        const data = await rpc('generateQuizFromTopic', [input.trim(), cfg])
        const questions = data?.result?.questions || []
        if (!questions.length) throw new Error('Could not generate quiz questions. Try adding more content.')
        setPreview({ type:'quiz', questions, parsed:false })
        if (!deckName) setDeckName(input.trim().slice(0,40))
      }
    } catch(e) { setError(e?.message||'Something went wrong. Please try again.') }
    finally    { setLoading(false) }
  }

  async function handleSaveAndStudy() {
    if (!preview||!user) return
    setSaving(true)
    const name = deckName.trim() || 'Imported deck'
    try {
      if (preview.type==='flashcards') {
        await saveItem(user.id, 'flashcards', name, { cards:preview.cards, topic:name })
        sessionStorage.setItem('flashfo_load_flashcards', JSON.stringify({ cards:preview.cards, topic:name }))
        router.push('/flashcards')
      } else {
        await saveItem(user.id, 'quiz', name, { questions:preview.questions, topic:name })
        sessionStorage.setItem('flashfo_quiz_load', JSON.stringify({ questions:preview.questions, topic:name }))
        router.push('/quiz')
      }
    } catch { setError('Save failed. Please try again.') }
    finally { setSaving(false) }
  }

  const previewCount = preview?.type==='flashcards' ? preview.cards?.length : preview?.questions?.length

  return (
    <div style={{ padding:'28px 24px 56px', maxWidth:1000, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Header */}
      <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:20, padding:'5px 13px', fontSize:10, fontWeight:800, color:'#60a5fa', marginBottom:16, letterSpacing:'.08em', textTransform:'uppercase' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Import
      </div>
      <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-.03em', marginBottom:5, color:'var(--c-t1)', lineHeight:1.15 }}>Import from anywhere</h1>
      <p style={{ fontSize:13, color:'var(--c-t2)', marginBottom:24, lineHeight:1.65 }}>Paste CSV, tab-separated text, Quizlet exports, Anki decks, or any notes. Nova turns it into a study deck instantly.</p>

      {/* File upload */}
      <div
        onClick={()=>fileRef.current?.click()}
        style={{ padding:'16px 20px', border:'1.5px dashed rgba(59,130,246,0.22)', borderRadius:12, display:'flex', alignItems:'center', gap:14, cursor:'pointer', background:'rgba(59,130,246,0.03)', marginBottom:14, transition:'all .15s' }}>
        <div style={{ width:38, height:38, borderRadius:10, background:'rgba(59,130,246,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.65)', marginBottom:2 }}>Upload a file</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.28)' }}>.csv · .tsv · .txt · .md — any format works</div>
        </div>
        <div style={{ fontSize:12, fontWeight:700, color:'rgba(96,165,250,0.7)', padding:'6px 14px', border:'1px solid rgba(59,130,246,0.25)', borderRadius:8, flexShrink:0 }}>Browse files</div>
      </div>
      <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.md" onChange={handleFileUpload} style={{ display:'none' }}/>

      {/* Divider */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.07)' }}/>
        <span style={{ fontSize:10, color:'rgba(255,255,255,0.2)', fontWeight:600 }}>OR PASTE BELOW</span>
        <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.07)' }}/>
      </div>

      {/* Paste input */}
      <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:14, overflow:'hidden', marginBottom:14 }}>
        <textarea
          value={input}
          onChange={e=>{ setInput(e.target.value); setError(''); setPreview(null) }}
          rows={8}
          placeholder={'Paste your content here...\n\nSupported formats:\nfront, back  (CSV)\nfront\tback  (Quizlet / Anki tab-separated)\nfront: back  (colon-separated)\nfront - back  (dash-separated)\n\nOr paste any notes or text — Nova will extract the cards.'}
          style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'#e2e8f0', fontFamily:"'Menlo','Consolas',monospace", fontSize:12, lineHeight:1.7, padding:'14px 16px', resize:'none', display:'block' }}
        />
        <div style={{ padding:'9px 14px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          {detectedFormat ? (
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#34d399' }}/>
              <span style={{ fontSize:11, color:'rgba(52,211,153,0.7)', fontWeight:600 }}>Detected: {detectedFormat}</span>
            </div>
          ) : (
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.18)' }}>Paste content above</span>
          )}
          <button onClick={()=>setShowFormats(f=>!f)} style={{ fontSize:11, color:'rgba(255,255,255,0.28)', fontWeight:600, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Format guide
          </button>
        </div>
      </div>

      {/* Format guide (expandable) */}
      {showFormats && (
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:12 }}>Supported formats</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {FORMATS.map(f => (
              <div key={f.name} style={{ display:'grid', gridTemplateColumns:'80px 1fr auto', gap:12, alignItems:'start' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', paddingTop:1 }}>{f.name}</div>
                <div style={{ fontFamily:"'Menlo','Consolas',monospace", fontSize:11, color:'rgba(255,255,255,0.35)', background:'rgba(255,255,255,0.04)', padding:'4px 8px', borderRadius:6, wordBreak:'break-all' }}>{f.example}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.22)', paddingTop:5, whiteSpace:'nowrap' }}>{f.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Output type + card count */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.28)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Generate</div>
          <div style={{ display:'flex', gap:6 }}>
            {[['flashcards','Flashcard deck'],['quiz','Quiz questions']].map(([id,label])=>(
              <button key={id} onClick={()=>setOutputType(id)}
                style={{ flex:1, padding:'9px 6px', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textAlign:'center', border:'1px solid '+(outputType===id?'rgba(59,130,246,0.38)':'rgba(255,255,255,0.09)'), background:outputType===id?'rgba(59,130,246,0.12)':'rgba(255,255,255,0.03)', color:outputType===id?'#60a5fa':'rgba(255,255,255,0.4)', transition:'all .15s' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.28)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>
            {outputType==='flashcards' ? 'Max cards' : 'Questions'} <span style={{ color:'#60a5fa', marginLeft:6 }}>{cardCount}</span>
          </div>
          <input type="range" min={5} max={40} step={1} value={cardCount} onChange={e=>setCardCount(Number(e.target.value))} style={{ width:'100%', accentColor:'#3b82f6' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,0.2)', marginTop:3 }}>
            <span>5</span><span>20</span><span>40</span>
          </div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.2)', marginTop:3 }}>
            {parseImportText(input) ? 'Parsed directly — no API used' : 'Nova generates from your content'}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ fontSize:12, color:'#f87171', marginBottom:14, padding:'8px 12px', background:'rgba(239,68,68,0.07)', borderRadius:8, border:'1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading||!input.trim()}
        style={{ width:'100%', padding:'13px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#2563eb,#4f46e5)', color:'#fff', fontSize:13, fontWeight:800, cursor:loading||!input.trim()?'not-allowed':'pointer', opacity:loading||!input.trim()?0.55:1, marginBottom:28, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:9, letterSpacing:'-.01em', boxShadow:'0 4px 18px rgba(37,99,235,0.25)', transition:'all .15s' }}>
        {loading ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation:'_fcspin .7s linear infinite', flexShrink:0 }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
            {outputType==='flashcards' ? 'Extracting cards…' : 'Generating questions…'}
          </>
        ) : (
          <>
            {parseImportText(input) && input.trim() ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                Import {outputType==='flashcards'?'as flashcards':'as quiz'} →
              </>
            ) : `Generate ${outputType==='flashcards'?'flashcard deck':'quiz'} →`}
          </>
        )}
      </button>

      {/* Preview */}
      {preview && (
        <div>
          {/* Preview header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10, paddingBottom:14, borderBottom:'1px solid var(--c-line)' }}>
            <div>
              <h3 style={{ fontSize:17, fontWeight:800, color:'var(--c-t1)', margin:0, letterSpacing:'-.02em' }}>
                {previewCount} {preview.type==='quiz'?'questions':'cards'} ready
              </h3>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background: preview.parsed?'#34d399':'#f59e0b' }}/>
                <span style={{ fontSize:11, color:preview.parsed?'rgba(52,211,153,0.7)':'rgba(251,191,36,0.7)' }}>
                  {preview.parsed ? 'Parsed directly from your file' : 'Generated by Nova'}
                </span>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input
                value={deckName}
                onChange={e=>setDeckName(e.target.value)}
                placeholder="Deck name…"
                style={{ height:34, padding:'0 12px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:9, fontSize:13, color:'var(--c-t1)', outline:'none', fontFamily:'inherit', width:180 }}
              />
              <button
                onClick={handleSaveAndStudy}
                disabled={saving}
                style={{ height:34, padding:'0 18px', background:'linear-gradient(135deg,#2563eb,#4f46e5)', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:saving?0.6:1, whiteSpace:'nowrap' }}>
                {saving ? 'Saving…' : `Save & ${preview.type==='quiz'?'take quiz':'study'} →`}
              </button>
            </div>
          </div>

          {/* Flashcard preview */}
          {preview.type==='flashcards' && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {preview.cards.map((c,i) => (
                <div key={i} style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:11, padding:'13px 16px', display:'flex', gap:14 }}>
                  <div style={{ width:24, height:24, borderRadius:6, background:'rgba(37,99,235,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#60a5fa', flexShrink:0, marginTop:1 }}>{i+1}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--c-t1)', marginBottom:5 }}>{c.front}</div>
                    <div style={{ fontSize:12, color:'var(--c-t2)', borderTop:'1px solid var(--c-line)', paddingTop:5 }}>{c.back}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quiz preview */}
          {preview.type==='quiz' && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {preview.questions.map((q,i) => (
                <div key={i} style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:11, padding:'13px 16px' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--c-t1)', marginBottom:8 }}>{i+1}. {q.question}</div>
                  {q.options && (
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      {q.options.map((opt,oi)=>(
                        <div key={oi} style={{ fontSize:12, color:oi===q.answerIndex?'#34d399':'var(--c-t3)', padding:'4px 8px', borderRadius:6, background:oi===q.answerIndex?'rgba(52,211,153,0.07)':'transparent', display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontWeight:700, width:16 }}>{String.fromCharCode(65+oi)}.</span>{opt}
                          {oi===q.answerIndex && <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, color:'#34d399' }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {(q.type==='true_false'||q.type==='short_answer') && (
                    <div style={{ fontSize:12, color:'#34d399', marginTop:6, padding:'4px 8px', background:'rgba(52,211,153,0.07)', borderRadius:6, display:'inline-block' }}>Answer: {q.correctAnswer||q.answer}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes _fcspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
