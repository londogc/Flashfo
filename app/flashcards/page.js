'use client'
import { useState } from 'react'

export default function FlashcardsPage() {
  const [topic, setTopic] = useState('')
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState([])

  async function generate() {
    if (!topic.trim()) return
    setLoading(true); setCards([]); setDone([]); setCurrent(0); setFlipped(false)
    try {
      const res = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'generateFlashcardsFromText', args: [topic.trim(), 10, 'English'] })
      })
      const data = await res.json()
      const raw = data.result
      let parsed = []
      if (raw?.cards) parsed = raw.cards
      else if (Array.isArray(raw)) parsed = raw
      setCards(parsed.length ? parsed : [{ front: 'Could not generate cards', back: 'Try a more specific topic' }])
    } catch { setCards([{ front: 'Error', back: 'Please try again' }]) }
    finally { setLoading(false) }
  }

  if (!cards.length) return (
    <div className="p-6 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Flashcards</h1>
      <p className="text-sm text-t2 mb-6">Enter any topic and get AI-generated study cards instantly.</p>
      <div className="bg-surface border border-line rounded-2xl p-5">
        <textarea value={topic} onChange={e => setTopic(e.target.value)}
          placeholder="Enter a topic or paste notes to generate flashcards from..."
          className="w-full h-28 text-sm text-t1 bg-transparent resize-none outline-none placeholder:text-t3 mb-4" />
        <button onClick={generate} disabled={loading || !topic.trim()}
          className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 flex items-center gap-2">
          {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</> : 'Generate Flashcards'}
        </button>
      </div>
    </div>
  )

  const card = cards[current]
  const progress = Math.round((done.length / cards.length) * 100)

  return (
    <div className="p-6 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-t1 tracking-tight">Flashcards</h1>
          <p className="text-sm text-t2">{cards.length} cards · {done.length} learned</p>
        </div>
        <button onClick={() => setCards([])} className="text-sm text-blue-500 font-medium hover:underline">New deck</button>
      </div>

      <div className="w-full bg-line rounded-full h-1.5 mb-6">
        <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: progress + '%' }} />
      </div>

      <div onClick={() => setFlipped(f => !f)}
        className="bg-surface border border-line rounded-2xl p-10 text-center cursor-pointer hover:border-blue-300 transition-all min-h-[240px] flex flex-col items-center justify-center gap-4">
        <div className="text-[10px] font-bold text-t3 uppercase tracking-widest">
          {flipped ? 'Answer' : 'Question'} · {current + 1} of {cards.length}
        </div>
        <div className="text-lg font-semibold text-t1 leading-relaxed max-w-md">
          {flipped ? (card.back || card.answer) : (card.front || card.question)}
        </div>
        <div className="text-[11px] text-t3">Tap to {flipped ? 'see question' : 'reveal answer'}</div>
      </div>

      <div className="flex gap-3 mt-4 justify-center">
        <button onClick={() => { setCurrent(c => Math.max(0, c - 1)); setFlipped(false) }} disabled={current === 0}
          className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl disabled:opacity-30 hover:bg-surface2 transition-colors">← Prev</button>
        {flipped && (
          <button onClick={() => { setDone(d => [...new Set([...d, current])]); setCurrent(c => Math.min(cards.length - 1, c + 1)); setFlipped(false) }}
            className="h-9 px-4 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors">✓ Got it</button>
        )}
        <button onClick={() => { setCurrent(c => Math.min(cards.length - 1, c + 1)); setFlipped(false) }} disabled={current === cards.length - 1}
          className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl disabled:opacity-30 hover:bg-surface2 transition-colors">Next →</button>
      </div>

      {done.length === cards.length && cards.length > 1 && (
        <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
          <div className="text-sm font-bold text-emerald-600 mb-1">🎉 Deck complete!</div>
          <button onClick={() => { setDone([]); setCurrent(0); setFlipped(false) }} className="text-xs text-emerald-600 hover:underline">Review again</button>
        </div>
      )}
    </div>
  )
}