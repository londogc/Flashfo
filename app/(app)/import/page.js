'use client'
import { useState, useRef } from 'react'

const Ico = ({d, s=14}) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
)
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

const IMPORT_TYPES = [
  { id: 'text',  icon: 'M2 3h12v2H2zm0 4h8v2H2zm0 4h10v2H2', label: 'Paste text',     desc: 'Paste notes, paragraphs, or any text' },
  { id: 'url',   icon: 'M6.5 9.5l3-3m-4.5.5L3.5 8.5a2.83 2.83 0 004 4L9 11m1.5-5.5L12 4a2.83 2.83 0 00-4-4L6.5 1.5', label: 'Website URL',    desc: 'Any article, blog post, or web page' },
  { id: 'topic', icon: 'M8 1a4 4 0 00-1.5 7.7V11h3V8.7A4 4 0 008 1zM6.5 13h3m-1.5 2v-2', label: 'Just a topic',   desc: 'Type any subject — Nova knows the content' },
]

export default function ImportPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [importType, setImportType] = useState('text')
  const [input, setInput] = useState('')
  const [deckName, setDeckName] = useState('')
  const [loading, setLoading] = useState(false)
  const [outputType, setOutputType] = useState('flashcards')
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  async function handleImport() {
    if (!input.trim()) { setError('Please enter something to import from.'); return }
    setLoading(true)
    setError('')
    setPreview(null)

    const payload = { type: importType }
    if (importType === 'url') payload.url = input.trim()
    else if (importType === 'topic') payload.topic = input.trim()
    else payload.content = input.trim()

    const res = await fetch('/api/nova/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({...payload, outputType}) })
    const data = await res.json()
    setLoading(false)

    if (data.error) { setError(data.error); return }
    setPreview(data.cards)
    if (!deckName) setDeckName(input.trim().slice(0, 40))
  }

  async function saveAsDeck() {
    if (!preview || !user) return
    setLoading(true)
    const name = deckName || 'Imported deck'
    // Save to flashcard_decks table
    const { data: deck } = await supabase.from('flashcard_decks').insert({ name, user_id: user.id }).select().single()
    if (deck) {
      const cardRows = preview.map(c => ({ deck_id: deck.id, user_id: user.id, front: c.front, back: c.back }))
      await supabase.from('flashcards').insert(cardRows)
    }
    setLoading(false)
    router.push('/my-stuff')
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--c-t1)', marginBottom: 8 }}>Import from Anywhere</h1>
        <p style={{ fontSize: 15, color: 'var(--c-t2)' }}>Paste text, drop a URL, or name a topic — Nova builds the flashcard deck.</p>
      </div>

      {/* Import type selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {IMPORT_TYPES.map(t => (
          <button key={t.id} onClick={() => { setImportType(t.id); setInput(''); setPreview(null); setError('') }}
            style={{ padding: '16px', background: importType === t.id ? 'rgba(37,99,235,.1)' : 'var(--c-surface)', border: `1.5px solid ${importType === t.id ? 'rgba(37,99,235,.4)' : 'var(--c-line)'}`, borderRadius: 12, cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ marginBottom: 8 }}><Ico d={t.icon} s={20}/></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: importType === t.id ? '#3b82f6' : 'var(--c-t1)', marginBottom: 2 }}>{t.label}</div>
            <div style={{ fontSize: 12, color: 'var(--c-t3)' }}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* Input area */}
      <div style={{ marginBottom: 16 }}>
        {importType === 'text' ? (
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste your notes, study material, or any text here..."
            style={{ width: '100%', minHeight: 180, padding: '14px 16px', background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 12, fontSize: 14, color: 'var(--c-t1)', resize: 'vertical', outline: 'none', lineHeight: 1.6 }}/>
        ) : (
          <input value={input} onChange={e => setInput(e.target.value)}
            placeholder={importType === 'url' ? 'https://example.com/article...' : 'e.g. AP Biology Unit 3 — Cell Processes'}
            style={{ width: '100%', padding: '14px 16px', background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 12, fontSize: 14, color: 'var(--c-t1)', outline: 'none' }}/>
        )}
      </div>

      {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <div style={{ display:'flex', gap:10, marginBottom:16 }}>
        {['flashcards','quiz'].map(t => (
          <button key={t} onClick={() => setOutputType(t)}
            style={{ flex:1, padding:'10px 0', background:outputType===t?'rgba(37,99,235,.15)':'var(--c-surface)', border:'1.5px solid '+(outputType===t?'rgba(37,99,235,.4)':'var(--c-line)'), borderRadius:10, cursor:'pointer', fontSize:14, fontWeight:600, color:outputType===t?'#3b82f6':'var(--c-t2)' }}>
            {t === 'flashcards' ? 'Flashcards' : 'Quiz Questions'}
          </button>
        ))}
      </div>
      <button onClick={handleImport} disabled={loading}
        style={{ width: '100%', padding: '14px', background: loading ? 'var(--c-surface)' : 'linear-gradient(90deg,#2563eb,#7c3aed)', color: loading ? 'var(--c-t2)' : '#fff', border: '1px solid var(--c-line)', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', marginBottom: 28 }}>
        {loading ? 'Nova is generating your deck...' : 'Generate Flashcards'}
      </button>

      {/* Preview */}
      {preview && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-t1)' }}>Preview — {preview.length} cards generated</h3>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input value={deckName} onChange={e => setDeckName(e.target.value)} placeholder="Deck name..."
                style={{ padding: '8px 12px', background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 8, fontSize: 13, color: 'var(--c-t1)', outline: 'none', width: 200 }}/>
              <button onClick={saveAsDeck} disabled={loading}
                style={{ padding: '8px 20px', background: '#34d399', color: '#080c14', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Save Deck
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {preview.map((c, i) => (
              <div key={i} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(37,99,235,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#3b82f6', flexShrink: 0 }}>{i+1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-t1)', marginBottom: 4 }}>{c.front}</div>
                  <div style={{ fontSize: 13, color: 'var(--c-t2)', borderTop: '1px solid var(--c-line)', paddingTop: 6, marginTop: 4 }}>{c.back}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}