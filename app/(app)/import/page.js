'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { rpc } from '@/lib/api'
import { saveItem } from '@/lib/savedItems'

const IMPORT_TYPES = [
  { id: 'text', icon: 'M2 3h12v2H2zm0 4h8v2H2zm0 4h10v2H2', label: 'Paste text', desc: 'Paste notes, paragraphs, or any text' },
  { id: 'url', icon: 'M6.5 9.5l3-3m-4.5.5L3.5 8.5a2.83 2.83 0 004 4L9 11m1.5-5.5L12 4a2.83 2.83 0 00-4-4L6.5 1.5', label: 'Website URL', desc: 'Any article, blog post, or web page' },
  { id: 'topic', icon: 'M8 1a4 4 0 00-1.5 7.7V11h3V8.7A4 4 0 008 1zM6.5 13h3m-1.5 2v-2', label: 'Just a topic', desc: 'Type any subject — Nova knows the content' },
]

const Ico = ({ d, s = 14 }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleImport() {
    if (!input.trim()) { setError('Please enter something to import from.'); return }
    if (!user) { setError('Please sign in to generate content.'); return }
    setLoading(true)
    setError('')
    setPreview(null)
    setSaved(false)

    try {
      let result

      if (outputType === 'flashcards') {
        if (importType === 'url') {
          result = await rpc('generateFlashcardsFromUrl', [input.trim(), 10, 'English'])
        } else {
          result = await rpc('generateFlashcardsFromText', [input.trim(), 10, 'English'])
        }
        const cards = result?.result?.cards || []
        if (!cards.length) throw new Error('Could not generate cards. Try adding more detail or a different topic.')
        setPreview({ type: 'flashcards', cards })
      } else {
        const config = { mcq: 5, trueFalse: 2, shortAnswer: 0, difficulty: 'medium' }
        if (importType === 'url') {
          result = await rpc('generateQuizAdvancedFromUrl', [input.trim(), config, 'English'])
        } else {
          result = await rpc('generateQuizAdvancedFromText', [input.trim(), config, 'English'])
        }
        const questions = result?.result?.questions || []
        if (!questions.length) throw new Error('Could not generate quiz. Try adding more detail.')
        setPreview({ type: 'quiz', questions })
      }

      if (!deckName) setDeckName(input.trim().slice(0, 40))
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function saveAndStudy() {
    if (!preview || !user) return
    setSaving(true)
    const name = deckName || 'Imported deck'
    try {
      if (preview.type === 'flashcards') {
        await saveItem(user.id, 'flashcards', name, { cards: preview.cards, topic: name })
        sessionStorage.setItem('flashfo_load_flashcards', JSON.stringify({ cards: preview.cards, topic: name }))
        router.push('/flashcards')
      } else {
        await saveItem(user.id, 'quiz', name, { questions: preview.questions, topic: name })
        sessionStorage.setItem('flashfo_quiz_load', JSON.stringify({ questions: preview.questions, topic: name }))
        router.push('/quiz')
      }
      setSaved(true)
    } catch (err) {
      setError('Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const previewCount = preview?.type === 'flashcards' ? preview.cards?.length : preview?.questions?.length

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--c-t1)', marginBottom: 8 }}>Import from Anywhere</h1>
        <p style={{ fontSize: 15, color: 'var(--c-t2)' }}>Paste text, drop a URL, or name a topic — Nova builds the flashcard deck.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {IMPORT_TYPES.map(t => (
          <button key={t.id} onClick={() => { setImportType(t.id); setInput(''); setPreview(null); setError('') }}
            style={{ padding: '16px', background: importType === t.id ? 'rgba(37,99,235,.1)' : 'var(--c-surface)', border: `1.5px solid ${importType === t.id ? 'rgba(37,99,235,.4)' : 'var(--c-line)'}`, borderRadius: 12, cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ marginBottom: 8 }}><Ico d={t.icon} s={20} /></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: importType === t.id ? '#3b82f6' : 'var(--c-t1)', marginBottom: 2 }}>{t.label}</div>
            <div style={{ fontSize: 12, color: 'var(--c-t3)' }}>{t.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        {importType === 'text' ? (
          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder="Paste your notes, study material, or any text here..."
            style={{ width: '100%', minHeight: 180, padding: '14px 16px', background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 12, fontSize: 14, color: 'var(--c-t1)', resize: 'vertical', outline: 'none', lineHeight: 1.6 }} />
        ) : (
          <input value={input} onChange={e => setInput(e.target.value)}
            placeholder={importType === 'url' ? 'https://example.com/article...' : 'e.g. AP Biology Unit 3 — Cell Processes'}
            style={{ width: '100%', padding: '14px 16px', background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 12, fontSize: 14, color: 'var(--c-t1)', outline: 'none' }} />
        )}
      </div>

      {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(248,113,113,0.08)', borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {['flashcards', 'quiz'].map(t => (
          <button key={t} onClick={() => setOutputType(t)}
            style={{ flex: 1, padding: '10px 0', background: outputType === t ? 'rgba(37,99,235,.15)' : 'var(--c-surface)', border: '1.5px solid ' + (outputType === t ? 'rgba(37,99,235,.4)' : 'var(--c-line)'), borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: outputType === t ? '#3b82f6' : 'var(--c-t2)' }}>
            {t === 'flashcards' ? 'Flashcards' : 'Quiz Questions'}
          </button>
        ))}
      </div>

      <button onClick={handleImport} disabled={loading || !input.trim()}
        style={{ width: '100%', padding: '14px', background: loading ? 'var(--c-surface)' : 'linear-gradient(90deg,#2563eb,#7c3aed)', color: loading ? 'var(--c-t2)' : '#fff', border: '1px solid var(--c-line)', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', marginBottom: 28, opacity: (!input.trim() || loading) ? 0.6 : 1 }}>
        {loading
          ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
              <span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              Nova is generating...
            </span>
          : `Generate ${outputType === 'quiz' ? 'Quiz Questions' : 'Flashcards'}`
        }
      </button>

      {preview && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-t1)', margin: 0 }}>
              Preview — {previewCount} {preview.type === 'quiz' ? 'questions' : 'cards'} generated
            </h3>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input value={deckName} onChange={e => setDeckName(e.target.value)} placeholder="Deck name..."
                style={{ padding: '8px 12px', background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 8, fontSize: 13, color: 'var(--c-t1)', outline: 'none', width: 180 }} />
              <button onClick={saveAndStudy} disabled={saving}
                style={{ padding: '8px 20px', background: 'linear-gradient(90deg,#2563eb,#7c3aed)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : `Save & ${preview.type === 'quiz' ? 'Take Quiz' : 'Study'}`}
              </button>
            </div>
          </div>

          {preview.type === 'flashcards' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {preview.cards.map((c, i) => (
                <div key={i} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 16 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(37,99,235,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#3b82f6', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-t1)', marginBottom: 4 }}>{c.front}</div>
                    <div style={{ fontSize: 13, color: 'var(--c-t2)', borderTop: '1px solid var(--c-line)', paddingTop: 6, marginTop: 4 }}>{c.back}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {preview.type === 'quiz' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {preview.questions.map((q, i) => (
                <div key={i} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-t1)', marginBottom: 8 }}>{i + 1}. {q.question}</div>
                  {q.options && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {q.options.map((opt, oi) => (
                        <div key={oi} style={{ fontSize: 13, color: oi === q.answerIndex ? '#34d399' : 'var(--c-t2)', padding: '4px 8px', borderRadius: 6, background: oi === q.answerIndex ? 'rgba(52,211,153,0.08)' : 'transparent' }}>
                          {String.fromCharCode(65 + oi)}. {opt} {oi === q.answerIndex ? '✓' : ''}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === 'true_false' && <div style={{ fontSize: 13, color: '#34d399' }}>Answer: {q.answer}</div>}
                  {q.type === 'short_answer' && <div style={{ fontSize: 13, color: '#34d399' }}>Answer: {q.answer}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  )
}
