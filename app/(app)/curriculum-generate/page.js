'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { US_CURRICULA, CURRICULUM_LIST, getCurriculumPrompt } from '@/lib/curriculum'

export default function CurriculumGenerate() {
  const { user } = useAuth()
  const router = useRouter()
  const [selected, setSelected] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [deckName, setDeckName] = useState('')
  const [error, setError] = useState('')

  const curriculum = US_CURRICULA[selected]

  async function generate() {
    if (!selected) { setError('Please select a curriculum.'); return }
    setLoading(true); setError(''); setCards([])

    const prompt = getCurriculumPrompt(selected, selectedUnit)
    const topic = selectedUnit || selected

    const res = await fetch('/api/nova/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'topic', topic: `${topic}. ${prompt}` })
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setError(data.error); return }
    setCards(data.cards)
    setDeckName(selectedUnit || selected)
  }

  async function saveDeck() {
    if (!cards.length || !user) return
    setLoading(true)
    const { data: deck } = await supabase.from('flashcard_decks').insert({ name: deckName || selected, user_id: user.id }).select().single()
    if (deck) await supabase.from('flashcards').insert(cards.map(c => ({ deck_id: deck.id, user_id: user.id, front: c.front, back: c.back })))
    setLoading(false)
    router.push('/my-stuff')
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--c-t1)', marginBottom: 8 }}>Curriculum-Aligned Generation</h1>
        <p style={{ fontSize: 15, color: 'var(--c-t2)' }}>Pick your AP, SAT, ACT, or Common Core course — Nova generates cards matched to the exact exam content.</p>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--c-t2)', marginBottom: 8, letterSpacing: '.04em', textTransform: 'uppercase' }}>Course / Exam</label>
          <select value={selected} onChange={e => { setSelected(e.target.value); setSelectedUnit('') }}
            style={{ width: '100%', padding: '12px 14px', background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 10, fontSize: 14, color: 'var(--c-t1)', outline: 'none' }}>
            <option value=''>Select a course...</option>
            {CURRICULUM_LIST.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {curriculum && (
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--c-t2)', marginBottom: 8, letterSpacing: '.04em', textTransform: 'uppercase' }}>Unit (optional)</label>
            <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 10, fontSize: 14, color: 'var(--c-t1)', outline: 'none' }}>
              <option value=''>All units</option>
              {curriculum.units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        )}
      </div>

      {selected && (
        <div style={{ background: 'rgba(37,99,235,.06)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#60a5fa' }}>
          Aligned to <strong>{US_CURRICULA[selected]?.exam}</strong> ({US_CURRICULA[selected]?.board}){selectedUnit ? ` — ${selectedUnit}` : ' — All units'}
        </div>
      )}

      {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <button onClick={generate} disabled={loading || !selected}
        style={{ width: '100%', padding: '14px', background: loading || !selected ? 'var(--c-surface)' : 'linear-gradient(90deg,#2563eb,#7c3aed)', color: loading || !selected ? 'var(--c-t3)' : '#fff', border: '1px solid var(--c-line)', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading || !selected ? 'default' : 'pointer', marginBottom: 28 }}>
        {loading ? 'Nova is generating...' : 'Generate Curriculum Deck'}
      </button>

      {cards.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-t1)' }}>{cards.length} cards generated</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={deckName} onChange={e => setDeckName(e.target.value)} placeholder="Deck name..."
                style={{ padding: '8px 12px', background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 8, fontSize: 13, color: 'var(--c-t1)', outline: 'none', width: 200 }}/>
              <button onClick={saveDeck} disabled={loading}
                style={{ padding: '8px 20px', background: '#34d399', color: '#080c14', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Save Deck</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cards.map((c, i) => (
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