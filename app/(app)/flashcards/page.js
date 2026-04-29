'use client'
import { useState, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { saveItem, updateSavedItem } from '@/lib/savedItems'

function printDeck(cards, topic) {
  const win = window.open('', '_blank')
  const rows = cards.map((c,i) =>
    '<tr><td style="padding:8px 10px;border:1px solid #e5e7eb;font-weight:600;width:50%">' +
    (i+1) + '. ' + (c.front||c.question||'') +
    '</td><td style="padding:8px 10px;border:1px solid #e5e7eb">' +
    (c.back||c.answer||'') + '</td></tr>'
  ).join('')
  win.document.write('<!DOCTYPE html><html><head><title>Flashcards</title>' +
    '<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;color:#111}' +
    'h1{font-size:22px;margin-bottom:4px}.sub{color:#666;font-size:12px;margin-bottom:20px}' +
    'table{width:100%;border-collapse:collapse}th{background:#f3f4f6;padding:8px 10px;border:1px solid #e5e7eb;text-align:left}' +
    '@media print{body{margin:20px}}</style></head><body>' +
    '<h1>' + (topic||'Flashcards') + '</h1>' +
    '<div class="sub">' + cards.length + ' cards</div>' +
    '<table><tr><th>Question</th><th>Answer</th></tr>' + rows + '</table>' +
    '<script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script>' +
    '</body></html>')
  win.document.close()
}

function SpeakerBtn({ text, audioRef }) {
  const [busy, setBusy] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  async function speak() {
    if (!text) return
    // Stop any currently playing audio
    if (audioRef?.current) { audioRef.current.pause(); audioRef.current = null }
    if (busy) { setBusy(false); return }
    setBusy(true)
    try {
      const res = await fetch('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'generateOpenAITtsAudio', args: [text, 'nova', 1] }) })
      const d = await res.json()
      const audio = new Audio('data:' + d.result.mimeType + ';base64,' + d.result.base64)
      if (audioRef) audioRef.current = audio
      audio.onended = () => { setBusy(false); if(audioRef) audioRef.current = null }
      audio.play()
    } catch { setBusy(false) }
  }
  // Voice: read card aloud
  const readAloud = (text) => {
    if (typeof window === 'undefined') return
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.9
    utt.onstart = () => setSpeaking(true)
    utt.onend = () => setSpeaking(false)
    synth.speak(utt)
  }

  // Voice: listen for answer
  const listenForAnswer = () => {
    if (typeof window === 'undefined') return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'en-US'
    rec.onstart = () => setVoiceInput(true)
    rec.onresult = e => { const t = e.results[0][0].transcript; setVoiceInput(false); /* submit answer */ }
    rec.onend = () => setVoiceInput(false)
    rec.start()
  }


  return (
    <button onClick={e => { e.stopPropagation(); speak() }} title="Listen"
      className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-blue-500/10 transition-colors"
      style={{ color: busy ? '#93c5fd' : '#3b82f6', opacity: busy ? 0.6 : 1 }}>
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 6h2.5L8 4v8L5.5 10H3V6z"/>
        {busy ? <path d="M10 6.5a2 2 0 010 3"/> : <><path d="M10 5a4 4 0 010 6"/><path d="M12 3a7 7 0 010 10"/></>}
      </svg>
    </button>
  )
}

function shareLink(data, topic) {
  const payload = btoa(JSON.stringify({ topic, cards: data }))
  const url = window.location.origin + '/flashcards?share=' + payload
  navigator.clipboard.writeText(url).catch(() => {})
  return url
}

export default function FlashcardsPage() {
  const { user } = useAuth()
  const [copied, setCopied2] = useState(false)
  const [topic, setTopic]       = useState('')
  const [count, setCount]       = useState(10)
  const [cards, setCards]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [current, setCurrent]   = useState(0)
  const [flipped, setFlipped]   = useState(false)
  const [done, setDone]         = useState([])
  const [error, setError]       = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [editIdx, setEditIdx]   = useState(null)
  const [editVals, setEditVals] = useState({ front: '', back: '' })
  const [savedId, setSavedId]   = useState(null)
  const [saving, setSaving]     = useState(false)
  const [saveFeedback, setSaveFeedback] = useState('')
  const audioRef = useRef(null)
  const [showSave, setShowSave] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')

  async function generate() {
    if (!topic.trim()) return
    setLoading(true); setCards([]); setDone([]); setCurrent(0); setFlipped(false); setError(''); setSavedId(null)
    try {
      const res = await fetch('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'generateFlashcardsFromText', args: [topic.trim(), count, 'English'] }) })
      const data = await res.json()
      const raw = data.result
      let parsed = []
      if (raw?.cards) parsed = raw.cards
      else if (Array.isArray(raw)) parsed = raw
      if (!parsed.length) setError('Could not generate cards. Try adding more detail.')
      else setCards(parsed)
    } catch { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  async function doSave() {
    if (!user) return
    setSaving(true)
    try {
      const payload = { cards, topic }
      if (savedId) {
        await updateSavedItem(savedId, { title: saveTitle || topic, data: payload })
        setSaveFeedback('Updated!')
      } else {
        const r = await saveItem(user.id, 'flashcards', saveTitle || topic, payload)
        setSavedId(r.id)
        setSaveFeedback('Saved!')
      }
      setShowSave(false)
      setTimeout(() => setSaveFeedback(''), 3000)
    } catch { setSaveFeedback('Save failed') }
    finally { setSaving(false) }
  }

  function stopAudio() { if(audioRef?.current){ audioRef.current.pause(); audioRef.current = null } }
  function startEdit(i) { setEditIdx(i); setEditVals({ front: cards[i].front || cards[i].question || '', back: cards[i].back || cards[i].answer || '' }) }
  function saveEdit() { if (editIdx === null) return; setCards(cs => cs.map((c, i) => i === editIdx ? { front: editVals.front, back: editVals.back } : c)); setEditIdx(null) }
  function addCard() { const n = cards.length; setCards(cs => [...cs, { front: 'New question', back: 'New answer' }]); setTimeout(() => startEdit(n), 0) }
  function deleteCard(i) { setCards(cs => cs.filter((_, ci) => ci !== i)); if (current >= i && current > 0) setCurrent(c => c - 1); setDone(d => d.filter(di => di !== i).map(di => di > i ? di - 1 : di)); if (editIdx === i) setEditIdx(null) }


  // ── Spaced Repetition (SM-2) ──────────────────────────────────────
  const [reviewQueue, setReviewQueue] = useState([])
  const [dueToday, setDueToday] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reviews = JSON.parse(localStorage.getItem('ff-card-reviews') || '{}')
    const now = Date.now()
    const due = Object.entries(reviews).filter(([,v]) => v.nextReview <= now)
    setDueToday(due.length)
    setReviewQueue(due.map(([id]) => id))
  }, [])

  const recordReview = (cardId, quality) => {
    if (typeof window === 'undefined') return
    const reviews = JSON.parse(localStorage.getItem('ff-card-reviews') || '{}')
    const prev = reviews[cardId] || { easeFactor: 2.5, interval: 1, repetitions: 0 }
    let { easeFactor, interval, repetitions } = prev
    if (quality >= 3) {
      if (repetitions === 0) interval = 1
      else if (repetitions === 1) interval = 6
      else interval = Math.round(interval * easeFactor)
      repetitions++
    } else {
      repetitions = 0
      interval = 1
    }
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    reviews[cardId] = { easeFactor, interval, repetitions, nextReview: Date.now() + interval * 86400000 }
    localStorage.setItem('ff-card-reviews', JSON.stringify(reviews))
    setDueToday(d => Math.max(0, d - 1))
    setReviewQueue(q => q.filter(id => id !== cardId))
  }

  // ── Voice Mode ───────────────────────────────────────────────────
  const [voiceOn, setVoiceOn] = useState(false)
  const [listening, setListening] = useState(false)
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  const recognitionRef = useRef(null)

  const speakCard = (text) => {
    if (!synth) return
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.95
    synth.speak(u)
  }

  const startListening = (onResult) => {
    const SpeechRec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
    if (!SpeechRec) return
    const rec = new SpeechRec()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.onresult = (e) => { onResult(e.results[0][0].transcript); setListening(false) }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    setListening(true)
    rec.start()
  }

  // ── Share Link ───────────────────────────────────────────────────
  const [shareMsg, setShareMsg] = useState('')

  const generateShareLink = (deckId) => {
    const uuid = ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16))
    if (typeof window !== 'undefined') {
      const shared = JSON.parse(localStorage.getItem('ff-shared-decks') || '{}')
      shared[uuid] = { deckId, created: Date.now() }
      localStorage.setItem('ff-shared-decks', JSON.stringify(shared))
    }
    const url = window.location.origin + '/shared/' + uuid
    navigator.clipboard?.writeText(url).then(() => {
      setShareMsg('Link copied!')
      setTimeout(() => setShareMsg(''), 2500)
    })
    return url
  }

  return (
    <div className="p-6 max-w-2xl mx-auto w-full">
      {/* ── Review Queue Banner ── */}
      {dueQueue.length > 0 && (
        <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:10, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:20 }}>⏰</span>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontWeight:600, fontSize:14, color:'#f59e0b' }}>{dueQueue.length} card{dueQueue.length>1?'s':''} due for review</p>
            <p style={{ margin:0, fontSize:12, color:'#8b949e' }}>Spaced repetition queue — review these first</p>
          </div>
          <button onClick={() => {}} style={{ background:'#f59e0b', color:'#000', fontSize:12, fontWeight:600, padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer' }}>Review now</button>
        </div>
      )}
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Flashcards</h1>
      <p className="text-sm text-t2 mb-6">Enter any topic and get study cards instantly.</p>
      <div className="bg-surface border border-line rounded-2xl p-5">
        <textarea value={topic} onChange={e => setTopic(e.target.value)}
          placeholder="Enter a topic or paste notes to generate flashcards from..."
          className="w-full h-28 text-sm text-t1 bg-transparent resize-none outline-none placeholder:text-t3 mb-4"/>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-semibold text-t3 uppercase tracking-wider">Number of Cards</div>
            <div className="text-[18px] font-bold text-blue-600">{count}</div>
          </div>
          <input type="range" min={10} max={30} step={1} value={count}
            onChange={e => setCount(Number(e.target.value))} onInput={e => setCount(Number(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer h-2 rounded-full" style={{ display:'block' }}/>
          <div className="flex justify-between text-[10px] text-t3 mt-1.5"><span>10</span><span>15</span><span>20</span><span>30</span></div>
        </div>
        {error && <div className="mb-3 text-sm text-red-500">{error}</div>}
        <button onClick={generate} disabled={loading || !topic.trim()}
          className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 flex items-center gap-2">
          {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Generating...</> : 'Generate ' + count + ' Flashcards'}
        </button>
      </div>
    </div>
  )

  const card = cards[current]
  const progress = Math.round((done.length / cards.length) * 100)

  if (showEdit) return (
    <div className="p-6 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-t1">Edit Deck <span className="text-sm font-normal text-t3">({cards.length} cards)</span></h2>
        <div className="flex gap-2">
          <button onClick={addCard} className="h-8 px-3 bg-blue-700 text-white text-[12px] font-semibold rounded-lg hover:bg-blue-800">+ Add Card</button>
          <button onClick={() => { setShowEdit(false); setEditIdx(null) }} className="h-8 px-3 bg-surface border border-line text-t2 text-[12px] rounded-lg hover:bg-surface2">Done</button>
        </div>
      </div>
      <div className="space-y-3">
        {cards.map((c, i) => (
          <div key={i} className="bg-surface border border-line rounded-xl p-4">
            {editIdx === i ? (
              <div className="space-y-2">
                <div className="text-[10px] font-semibold text-t3 uppercase">Question</div>
                <textarea value={editVals.front} onChange={e => setEditVals(v => ({ ...v, front: e.target.value }))}
                  className="w-full text-sm text-t1 bg-surface2 border border-line rounded-lg p-2 resize-none outline-none focus:border-blue-400" rows={2}/>
                <div className="text-[10px] font-semibold text-t3 uppercase">Answer</div>
                <textarea value={editVals.back} onChange={e => setEditVals(v => ({ ...v, back: e.target.value }))}
                  className="w-full text-sm text-t1 bg-surface2 border border-line rounded-lg p-2 resize-none outline-none focus:border-blue-400" rows={2}/>
                <div className="flex gap-2 pt-1">
                  <button onClick={saveEdit} className="h-7 px-3 bg-blue-700 text-white text-[11px] font-semibold rounded-lg">Save</button>
                  <button onClick={() => setEditIdx(null)} className="h-7 px-3 bg-surface2 text-t2 text-[11px] rounded-lg border border-line">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <span className="text-[11px] font-bold text-t3 mt-0.5 w-5 flex-shrink-0">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-t1 mb-1">{c.front || c.question}</p>
                  <p className="text-[12px] text-t2">{c.back || c.answer}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(i)} className="h-7 px-2 text-[11px] text-t2 border border-line rounded-lg hover:bg-surface2">Edit</button>
                  <button onClick={() => deleteCard(i)} className="h-7 px-2 text-[11px] text-red-500 border border-red-200 dark:border-red-500/30 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10">✕</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto w-full">
      {showSave && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-surface border border-line rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-base font-bold text-t1 mb-4">Save Deck</div>
            <input value={saveTitle} onChange={e => setSaveTitle(e.target.value)} placeholder={topic || 'Deck title...'}
              className="w-full h-9 bg-surface2 border border-line rounded-lg px-3 text-sm text-t1 outline-none focus:border-blue-400 mb-4"/>
            <div className="flex gap-2">
              <button onClick={doSave} disabled={saving}
                className="flex-1 h-9 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40">
                {saving ? 'Saving...' : 'Save to My Stuff'}
              </button>
              <button onClick={() => setShowSave(false)} className="h-9 px-4 bg-surface border border-line text-t2 text-sm rounded-xl hover:bg-surface2">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {!savedId && cards.length > 0 && (
        <div className="mb-4 px-4 py-2.5 bg-amber-500/10 border border-amber-400/30 rounded-xl flex items-center justify-between">
          <span className="text-[12px] text-amber-600 font-medium">💾 Don't forget to save your deck to My Stuff!</span>
          <button onClick={() => { setSaveTitle(topic); setShowSave(true) }} className="h-7 px-3 bg-amber-500 text-white text-[11px] font-bold rounded-lg hover:bg-amber-600">Save Now</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-t1 tracking-tight">Flashcards</h1>
          <p className="text-sm text-t2">{cards.length} cards · {done.length} learned</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {user && <button onClick={() => { setSaveTitle(topic); setShowSave(true) }}
            className="h-8 px-3 bg-emerald-600 text-white text-[12px] font-semibold rounded-lg hover:bg-emerald-700 flex items-center gap-1">
            💾 {savedId ? 'Update' : 'Save'}
          </button>}
          {saveFeedback && <span className="text-[11px] text-emerald-500 font-medium">{saveFeedback}</span>}
          <button onClick={() => printDeck(cards, topic)}
            className="h-8 px-3 text-[12px] text-t2 border border-line rounded-lg hover:bg-surface2 flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6V2h8v4M4 11H2V6h12v5h-2M4 9h8v5H4V9z"/></svg>Print
          </button>
          <button onClick={() => { shareLink(cards, topic); setCopied2(true); setTimeout(() => setCopied2(false), 2000) }}
            className="h-8 px-3 text-[12px] border border-line rounded-lg hover:bg-surface2 flex items-center gap-1"
            style={{ color: copied2 ? '#34d399' : undefined, borderColor: copied2 ? '#34d399' : undefined }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 2h4v4m0-4L6 10M7 4H2v10h10V9"/></svg>
            {copied2 ? 'Link copied!' : 'Share'}
          </button>
          <button onClick={() => { setShowEdit(true); setEditIdx(null) }}
            className="h-8 px-3 text-[12px] text-t2 border border-line rounded-lg hover:bg-surface2">Edit Deck</button>
          <button onClick={() => setCards([])} className="text-sm text-blue-500 font-medium hover:underline">New deck</button>
        </div>
      </div>
      <div className="w-full bg-line rounded-full h-1.5 mb-6">
        <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: progress + '%' }}/>
      </div>
      <div onClick={() => { stopAudio(); setFlipped(f => !f) }}
        className="bg-surface border border-line rounded-2xl p-10 text-center cursor-pointer hover:border-blue-300 transition-all min-h-[220px] flex flex-col items-center justify-center gap-4 relative">
        <div className="text-[10px] font-bold text-t3 uppercase tracking-widest">
          {flipped ? 'Answer' : 'Question'} · {current + 1} of {cards.length}
        </div>
        <div className="text-lg font-semibold text-t1 leading-relaxed max-w-md">
          {flipped ? (card.back || card.answer) : (card.front || card.question)}
        </div>
        <div className="text-[11px] text-t3">Tap to {flipped ? 'see question' : 'reveal answer'}</div>
        <div className="absolute bottom-3 right-3" onClick={e => e.stopPropagation()}>
          <SpeakerBtn text={flipped ? (card.back || card.answer || '') : (card.front || card.question || '')} audioRef={audioRef}/>
        </div>
      </div>
      <div className="flex gap-3 mt-4 justify-center">
        <button onClick={() => { stopAudio(); setCurrent(c => Math.max(0, c - 1)); setFlipped(false) }} disabled={current === 0}
          className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl disabled:opacity-30 hover:bg-surface2">← Prev</button>
        {flipped && (
          <button onClick={() => { stopAudio(); setDone(d => [...new Set([...d, current])]); setCurrent(c => Math.min(cards.length - 1, c + 1)); setFlipped(false) }}
            className="h-9 px-4 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700">✓ Got it</button>
        )}
        <button onClick={() => { stopAudio(); setCurrent(c => Math.min(cards.length - 1, c + 1)); setFlipped(false) }} disabled={current === cards.length - 1}
          className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl disabled:opacity-30 hover:bg-surface2">Next →</button>
      </div>
      {done.length === cards.length && cards.length > 1 && (
        <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
          <div className="text-sm font-bold text-emerald-600 mb-1">Deck complete!</div>
          <button onClick={() => { setDone([]); setCurrent(0); setFlipped(false) }} className="text-xs text-emerald-600 hover:underline">Review again</button>
        </div>
      )}
    </div>
  )
}
