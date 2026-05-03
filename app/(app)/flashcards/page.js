'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
    '@media print{body{margin:20px}}<\/style><\/head><body>' +
    '<h1>' + (topic||'Flashcards') + '<\/h1>' +
    '<div class="sub">' + cards.length + ' cards<\/div>' +
    '<table><tr><th>Question<\/th><th>Answer<\/th><\/tr>' + rows + '<\/table>' +
    '<script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script>' +
    '<\/body><\/html>')
  win.document.close()
}

function SpeakerBtn({ text, audioRef }) {
  const [busy, setBusy] = useState(false)
  async function speak() {
    if (!text) return
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

function FlashcardsPageInner() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const audioRef = useRef(null)

  // ─── ALL STATE ────────────────────────────────────────────────────────────
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(10)
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState([])
  const [error, setError] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [editIdx, setEditIdx] = useState(null)
  const [editVals, setEditVals] = useState({ front: '', back: '' })
  const [savedId, setSavedId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState('')
  const [showSave, setShowSave] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [copied, setCopied] = useState(false)
  const [reviewQueue, setReviewQueue] = useState([])
  const [dueToday, setDueToday] = useState(0)
  const [sessionRatings, setSessionRatings] = useState({ again: 0, hard: 0, easy: 0 })

  // ─── ALL EFFECTS (must be before any conditional returns) ─────────────────
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setTopic(decodeURIComponent(q))
  }, [searchParams.get('q')])

  useEffect(() => {
    const id = 'fc-anims'
    if (document.getElementById(id)) return
    const s = document.createElement('style')
    s.id = id
    s.textContent = [
      '@keyframes nova-pop{0%{opacity:0;transform:translateY(14px) scale(0.97)}60%{opacity:1;transform:translateY(-3px) scale(1.005)}100%{opacity:1;transform:none}}',
      '@keyframes _fcspin{to{transform:rotate(360deg)}}',
      '@media(min-width:900px){.fc-mobile-wrap{display:none!important}.fc-desktop-wrap{display:grid!important;grid-template-columns:200px 1fr 200px;min-height:calc(100dvh - 130px)}}'
    ].join(' ')
    document.head.appendChild(s)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reviews = JSON.parse(localStorage.getItem('ff-card-reviews') || '{}')
    const now = Date.now()
    const due = Object.entries(reviews).filter(([,v]) => v.nextReview <= now)
    setDueToday(due.length)
    setReviewQueue(due.map(([id]) => id))
  }, [])

  // Keyboard shortcuts — always registered, safe because cards.length is checked inside
  useEffect(() => {
    function handler(e) {
      if (!cards.length || showEdit) return
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); stopAudio(); setFlipped(f => !f) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stopAudio(); setCurrent(c => Math.max(0, c - 1)); setFlipped(false) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stopAudio(); setCurrent(c => Math.min(cards.length - 1, c + 1)); setFlipped(false) }
      else if (e.key === '1') { stopAudio(); recordReview('card-' + current, 1); setSessionRatings(r => ({ ...r, again: r.again + 1 })) }
      else if (e.key === '2') { stopAudio(); recordReview('card-' + current, 3); setSessionRatings(r => ({ ...r, hard: r.hard + 1 })); setDone(d => [...new Set([...d, current])]); setCurrent(c => Math.min(cards.length - 1, c + 1)); setFlipped(false) }
      else if (e.key === '3') { stopAudio(); recordReview('card-' + current, 5); setSessionRatings(r => ({ ...r, easy: r.easy + 1 })); setDone(d => [...new Set([...d, current])]); setCurrent(c => Math.min(cards.length - 1, c + 1)); setFlipped(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cards.length, current, showEdit])

  // ─── HANDLERS ─────────────────────────────────────────────────────────────
  function stopAudio() { if (audioRef?.current) { audioRef.current.pause(); audioRef.current = null } }
  function startEdit(i) { setEditIdx(i); setEditVals({ front: cards[i].front || cards[i].question || '', back: cards[i].back || cards[i].answer || '' }) }
  function saveEdit() { if (editIdx === null) return; setCards(cs => cs.map((c, i) => i === editIdx ? { front: editVals.front, back: editVals.back } : c)); setEditIdx(null) }
  function addCard() { const n = cards.length; setCards(cs => [...cs, { front: 'New question', back: 'New answer' }]); setTimeout(() => startEdit(n), 0) }
  function deleteCard(i) { setCards(cs => cs.filter((_, ci) => ci !== i)); if (current >= i && current > 0) setCurrent(c => c - 1); setDone(d => d.filter(di => di !== i).map(di => di > i ? di - 1 : di)); if (editIdx === i) setEditIdx(null) }

  function recordReview(cardId, quality) {
    if (typeof window === 'undefined') return
    const reviews = JSON.parse(localStorage.getItem('ff-card-reviews') || '{}')
    const prev = reviews[cardId] || { easeFactor: 2.5, interval: 1, repetitions: 0 }
    let { easeFactor, interval, repetitions } = prev
    if (quality >= 3) {
      if (repetitions === 0) interval = 1
      else if (repetitions === 1) interval = 6
      else interval = Math.round(interval * easeFactor)
      repetitions++
    } else { repetitions = 0; interval = 1 }
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    reviews[cardId] = { easeFactor, interval, repetitions, nextReview: Date.now() + interval * 86400000 }
    localStorage.setItem('ff-card-reviews', JSON.stringify(reviews))
    setDueToday(d => Math.max(0, d - 1))
    setReviewQueue(q => q.filter(id => id !== cardId))
  }

  async function generate() {
    if (!topic.trim()) return
    setLoading(true); setCards([]); setDone([]); setCurrent(0); setFlipped(false); setError(''); setSavedId(null)
    try {
      const res = await fetch('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'generateFlashcardsFromText', args: [topic.trim(), count, 'English'] }) })
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error || 'Server error ' + res.status) }
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

  // ─── RENDER: input form ───────────────────────────────────────────────────
  if (!cards.length) return (
    <div className="p-6 max-w-2xl mx-auto w-full">
      {reviewQueue.length > 0 && (
        <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:10, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:20 }}>&#9200;</span>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontWeight:600, fontSize:14, color:'#f59e0b' }}>{reviewQueue.length} card{reviewQueue.length>1?'s':''} due for review</p>
            <p style={{ margin:0, fontSize:12, color:'#8b949e' }}>Spaced repetition queue</p>
          </div>
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
          <div style={{position:'relative',height:14,marginTop:6}}>
            <span style={{position:'absolute',left:0,fontSize:10,color:'var(--c-t3)'}}>10</span>
            <span style={{position:'absolute',left:'50%',transform:'translateX(-50%)',fontSize:10,color:'var(--c-t3)'}}>20</span>
            <span style={{position:'absolute',right:0,fontSize:10,color:'var(--c-t3)'}}>30</span>
          </div>
        </div>
        {error && <div className="mb-3 text-sm text-red-500">{error}</div>}
        <button onClick={generate} disabled={loading} style={{width:'100%',padding:'13px 0',borderRadius:10,border:'none',background:'linear-gradient(90deg,#2563eb,#7c3aed)',color:'#fff',fontSize:14,fontWeight:700,cursor:loading?'not-allowed':'pointer',opacity:loading?0.6:1,letterSpacing:'-0.01em'}}>
          {loading
            ? <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:9}}><span style={{width:15,height:15,border:'2px solid rgba(255,255,255,0.25)',borderTopColor:'#fff',borderRadius:'50%',flexShrink:0,display:'inline-block',animation:'_fcspin 0.7s linear infinite'}}/> Generating...</span>
            : 'Generate ' + count + ' Flashcards'}
        </button>
      </div>
    </div>
  )

  // ─── RENDER: edit view ────────────────────────────────────────────────────
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
                  <button onClick={() => deleteCard(i)} className="h-7 px-2 text-[11px] text-red-500 border border-red-200 dark:border-red-500/30 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10">&#x2715;</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  // ─── RENDER: card viewer ──────────────────────────────────────────────────
  const card = cards[current]
  const progress = Math.round((done.length / cards.length) * 100)
  const cardFace = flipped ? (card.back || card.answer) : (card.front || card.question)
  const cardBorderColor = flipped ? 'rgba(99,102,241,0.45)' : 'rgba(59,130,246,0.35)'
  const badgeBg = flipped ? 'rgba(99,102,241,0.1)' : 'rgba(59,130,246,0.1)'
  const badgeColor = flipped ? '#818cf8' : '#60a5fa'
  const badgeBorder = flipped ? 'rgba(99,102,241,0.2)' : 'rgba(59,130,246,0.18)'

  const ratingRow = (
    <div style={{display:'flex',gap:8}}>
      <button onClick={()=>{stopAudio();recordReview('card-'+current,1);setSessionRatings(r=>({...r,again:r.again+1}));}} style={{padding:'8px 18px',borderRadius:9,fontSize:11,fontWeight:700,border:'1px solid rgba(239,68,68,0.25)',background:'rgba(239,68,68,0.06)',color:'#f87171',cursor:'pointer'}}>Again</button>
      <button onClick={()=>{stopAudio();recordReview('card-'+current,3);setSessionRatings(r=>({...r,hard:r.hard+1}));setDone(d=>[...new Set([...d,current])]);setCurrent(c=>Math.min(cards.length-1,c+1));setFlipped(false);}} style={{padding:'8px 18px',borderRadius:9,fontSize:11,fontWeight:700,border:'1px solid rgba(245,158,11,0.25)',background:'rgba(245,158,11,0.06)',color:'#fbbf24',cursor:'pointer'}}>Hard</button>
      <button onClick={()=>{stopAudio();recordReview('card-'+current,5);setSessionRatings(r=>({...r,easy:r.easy+1}));setDone(d=>[...new Set([...d,current])]);setCurrent(c=>Math.min(cards.length-1,c+1));setFlipped(false);}} style={{padding:'8px 18px',borderRadius:9,fontSize:11,fontWeight:700,border:'1px solid rgba(16,185,129,0.3)',background:'rgba(16,185,129,0.08)',color:'#34d399',cursor:'pointer'}}>Easy</button>
    </div>
  )

  const deckComplete = done.length === cards.length && cards.length > 1 && (
    <div style={{padding:'12px 24px',background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:10,textAlign:'center',marginTop:8}}>
      <div style={{fontSize:13,fontWeight:700,color:'#34d399',marginBottom:4}}>Deck complete!</div>
      <button onClick={()=>{setDone([]);setCurrent(0);setFlipped(false);setSessionRatings({again:0,hard:0,easy:0});}} style={{fontSize:11,color:'#34d399',cursor:'pointer',background:'none',border:'none',textDecoration:'underline'}}>Review again</button>
    </div>
  )

  return (
    <>
      {showSave && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}>
          <div className="bg-surface border border-line rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-base font-bold text-t1 mb-4">Save Deck</div>
            <input value={saveTitle} onChange={e=>setSaveTitle(e.target.value)} placeholder={topic||'Deck title...'} className="w-full h-9 bg-surface2 border border-line rounded-lg px-3 text-sm text-t1 outline-none focus:border-blue-400 mb-4"/>
            <div className="flex gap-2">
              <button onClick={doSave} disabled={saving} className="flex-1 h-9 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40">{saving?'Saving...':'Save to My Stuff'}</button>
              <button onClick={()=>setShowSave(false)} className="h-9 px-4 bg-surface border border-line text-t2 text-sm rounded-xl hover:bg-surface2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile — visible by default, hidden on desktop via CSS */}
      <div className="fc-mobile-wrap p-6 max-w-2xl mx-auto w-full">
        {!savedId && (
          <div className="mb-4 px-4 py-2.5 bg-amber-500/10 border border-amber-400/30 rounded-xl flex items-center justify-between">
            <span className="text-[12px] text-amber-600 font-medium">&#128190; Don't forget to save your deck!</span>
            <button onClick={()=>{setSaveTitle(topic);setShowSave(true)}} className="h-7 px-3 bg-amber-500 text-white text-[11px] font-bold rounded-lg hover:bg-amber-600">Save Now</button>
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-t1 tracking-tight">Flashcards</h1>
            <p className="text-sm text-t2">{cards.length} cards &middot; {done.length} learned</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {user && <button onClick={()=>{setSaveTitle(topic);setShowSave(true)}} className="h-8 px-3 bg-emerald-600 text-white text-[12px] font-semibold rounded-lg hover:bg-emerald-700">&#128190; {savedId?'Update':'Save'}</button>}
            {saveFeedback && <span className="text-[11px] text-emerald-500 font-medium">{saveFeedback}</span>}
            <button onClick={()=>printDeck(cards,topic)} className="h-8 px-3 text-[12px] text-t2 border border-line rounded-lg hover:bg-surface2">Print</button>
            <button onClick={()=>{shareLink(cards,topic);setCopied(true);setTimeout(()=>setCopied(false),2000)}} className="h-8 px-3 text-[12px] border border-line rounded-lg hover:bg-surface2" style={{color:copied?'#34d399':undefined}}>{copied?'Copied!':'Share'}</button>
            <button onClick={()=>{setShowEdit(true);setEditIdx(null)}} className="h-8 px-3 text-[12px] text-t2 border border-line rounded-lg hover:bg-surface2">Edit</button>
            <button onClick={()=>{setCards([]);setDone([]);setCurrent(0);setFlipped(false);}} className="text-sm text-blue-500 font-medium hover:underline">New</button>
          </div>
        </div>
        <div className="w-full bg-line rounded-full h-1.5 mb-6"><div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{width:progress+'%'}}/></div>
        <div onClick={()=>{stopAudio();setFlipped(f=>!f)}} className="bg-surface border border-line rounded-2xl p-10 text-center cursor-pointer hover:border-blue-300 transition-all min-h-[220px] flex flex-col items-center justify-center gap-4 relative" style={{borderColor:cardBorderColor}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',padding:'3px 10px',borderRadius:20,background:badgeBg,color:badgeColor,marginBottom:4}}>{flipped?'Answer':'Question'}</div>
          <div className="text-lg font-semibold text-t1 leading-relaxed max-w-md">{cardFace}</div>
          {!flipped && <div className="text-[11px] text-t3">Tap to reveal answer</div>}
          <div className="absolute bottom-3 right-3" onClick={e=>e.stopPropagation()}><SpeakerBtn text={cardFace} audioRef={audioRef}/></div>
        </div>
        {flipped ? (
          <div style={{display:'flex',gap:8,marginTop:12,justifyContent:'center'}}>
            <button onClick={()=>{stopAudio();recordReview('card-'+current,1);setSessionRatings(r=>({...r,again:r.again+1}));}} style={{flex:1,maxWidth:120,padding:'10px 4px',borderRadius:10,border:'1px solid rgba(239,68,68,0.25)',background:'rgba(239,68,68,0.06)',color:'#f87171',fontSize:11,fontWeight:700,cursor:'pointer'}}>Again</button>
            <button onClick={()=>{stopAudio();recordReview('card-'+current,3);setSessionRatings(r=>({...r,hard:r.hard+1}));setDone(d=>[...new Set([...d,current])]);setCurrent(c=>Math.min(cards.length-1,c+1));setFlipped(false);}} style={{flex:1,maxWidth:120,padding:'10px 4px',borderRadius:10,border:'1px solid rgba(245,158,11,0.25)',background:'rgba(245,158,11,0.06)',color:'#fbbf24',fontSize:11,fontWeight:700,cursor:'pointer'}}>Hard</button>
            <button onClick={()=>{stopAudio();recordReview('card-'+current,5);setSessionRatings(r=>({...r,easy:r.easy+1}));setDone(d=>[...new Set([...d,current])]);setCurrent(c=>Math.min(cards.length-1,c+1));setFlipped(false);}} style={{flex:1,maxWidth:120,padding:'10px 4px',borderRadius:10,border:'1px solid rgba(16,185,129,0.3)',background:'rgba(16,185,129,0.08)',color:'#34d399',fontSize:11,fontWeight:700,cursor:'pointer'}}>Easy</button>
          </div>
        ) : (
          <div className="flex gap-3 mt-4 justify-center">
            <button onClick={()=>{stopAudio();setCurrent(c=>Math.max(0,c-1));setFlipped(false)}} disabled={current===0} className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl disabled:opacity-30 hover:bg-surface2">&#8592; Prev</button>
            <button onClick={()=>{stopAudio();setCurrent(c=>Math.min(cards.length-1,c+1));setFlipped(false)}} disabled={current===cards.length-1} className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl disabled:opacity-30 hover:bg-surface2">Next &#8594;</button>
          </div>
        )}
        {deckComplete}
      </div>

      {/* Desktop 3-panel — hidden by default, shown on >=900px via CSS */}
      <div className="fc-desktop-wrap" style={{display:'none'}}>

        {/* Left panel */}
        <div style={{padding:'24px 20px',borderRight:'1px solid var(--c-line)',display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:'var(--c-t1)',marginBottom:2}}>{topic||'Flashcards'}</div>
            <div style={{fontSize:11,color:'var(--c-t3)'}}>{cards.length} cards in deck</div>
          </div>
          <div>
            <div style={{height:3,background:'var(--c-line)',borderRadius:2,overflow:'hidden',marginBottom:5}}>
              <div style={{height:'100%',width:progress+'%',background:'#3b82f6',borderRadius:2,transition:'width 0.3s'}}/>
            </div>
            <div style={{fontSize:10,color:'var(--c-t3)'}}>Card {current+1} of {cards.length}</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
            <div style={{background:'var(--c-surface2)',border:'1px solid var(--c-line)',borderRadius:8,padding:'10px 11px'}}><div style={{fontSize:20,fontWeight:700,color:'#34d399',lineHeight:1}}>{done.length}</div><div style={{fontSize:10,color:'var(--c-t3)',marginTop:3}}>Mastered</div></div>
            <div style={{background:'var(--c-surface2)',border:'1px solid var(--c-line)',borderRadius:8,padding:'10px 11px'}}><div style={{fontSize:20,fontWeight:700,color:'#f87171',lineHeight:1}}>{cards.length-done.length}</div><div style={{fontSize:10,color:'var(--c-t3)',marginTop:3}}>To review</div></div>
            <div style={{background:'var(--c-surface2)',border:'1px solid var(--c-line)',borderRadius:8,padding:'10px 11px'}}><div style={{fontSize:20,fontWeight:700,color:'#fbbf24',lineHeight:1}}>{sessionRatings.again}</div><div style={{fontSize:10,color:'var(--c-t3)',marginTop:3}}>Again</div></div>
            <div style={{background:'var(--c-surface2)',border:'1px solid var(--c-line)',borderRadius:8,padding:'10px 11px'}}><div style={{fontSize:20,fontWeight:700,color:'#34d399',lineHeight:1}}>{sessionRatings.easy}</div><div style={{fontSize:10,color:'var(--c-t3)',marginTop:3}}>Easy</div></div>
          </div>
          {!savedId && <div style={{padding:'8px 10px',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:8,fontSize:10,color:'#f59e0b',lineHeight:1.4}}>Deck not saved yet</div>}
          <div style={{marginTop:'auto',display:'flex',flexDirection:'column',gap:6}}>
            <button onClick={()=>{setShowEdit(true);setEditIdx(null)}} style={{width:'100%',padding:'6px 0',borderRadius:7,fontSize:11,fontWeight:600,border:'1px solid var(--c-line)',background:'var(--c-surface2)',color:'var(--c-t2)',cursor:'pointer'}}>Edit Deck</button>
            <button onClick={()=>printDeck(cards,topic)} style={{width:'100%',padding:'6px 0',borderRadius:7,fontSize:11,fontWeight:600,border:'1px solid var(--c-line)',background:'var(--c-surface2)',color:'var(--c-t2)',cursor:'pointer'}}>Print</button>
          </div>
        </div>

        {/* Center panel */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'28px 36px'}}>
          <div style={{display:'flex',gap:5,marginBottom:20,flexWrap:'wrap',justifyContent:'center',maxWidth:380}}>
            {cards.map((_,i)=>(
              <div key={i} onClick={()=>{setCurrent(i);setFlipped(false)}} style={{width:8,height:8,borderRadius:'50%',cursor:'pointer',transition:'all 0.2s',background:i===current?'#3b82f6':done.includes(i)?'#34d399':'rgba(255,255,255,0.12)',transform:i===current?'scale(1.4)':'scale(1)'}}/>
            ))}
          </div>
          <div style={{position:'relative',width:'100%',maxWidth:440,height:230,marginBottom:22}}>
            <div style={{position:'absolute',top:12,left:12,right:-12,bottom:-12,background:'var(--c-surface2)',border:'1px solid var(--c-line)',borderRadius:14}}/>
            <div style={{position:'absolute',top:6,left:6,right:-6,bottom:-6,background:'var(--c-surface)',border:'1px solid var(--c-line)',borderRadius:14}}/>
            <div onClick={()=>{stopAudio();setFlipped(f=>!f)}} style={{position:'absolute',inset:0,background:'var(--c-surface)',border:'1.5px solid '+cardBorderColor,borderRadius:14,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:28,cursor:'pointer',transition:'border-color 0.2s'}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',padding:'3px 10px',borderRadius:20,background:badgeBg,color:badgeColor,border:'1px solid '+badgeBorder,marginBottom:14}}>{flipped?'Answer':'Question'}</div>
              <div style={{fontSize:17,fontWeight:600,color:'var(--c-t1)',textAlign:'center',lineHeight:1.45}}>{cardFace}</div>
              {!flipped && <div style={{fontSize:11,color:'var(--c-t3)',marginTop:10}}>Click or press Space to flip</div>}
              <div style={{position:'absolute',bottom:12,right:14}} onClick={e=>e.stopPropagation()}><SpeakerBtn text={cardFace} audioRef={audioRef}/></div>
            </div>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:10}}>
            <button onClick={()=>{stopAudio();setCurrent(c=>Math.max(0,c-1));setFlipped(false)}} disabled={current===0} style={{padding:'8px 20px',borderRadius:9,fontSize:12,fontWeight:600,border:'1px solid var(--c-line)',background:'var(--c-surface2)',color:'var(--c-t2)',cursor:'pointer',opacity:current===0?0.3:1}}>&#8592; Prev</button>
            {ratingRow}
            <button onClick={()=>{stopAudio();setCurrent(c=>Math.min(cards.length-1,c+1));setFlipped(false)}} disabled={current===cards.length-1} style={{padding:'8px 20px',borderRadius:9,fontSize:12,fontWeight:600,border:'1px solid var(--c-line)',background:'var(--c-surface2)',color:'var(--c-t2)',cursor:'pointer',opacity:current===cards.length-1?0.3:1}}>Next &#8594;</button>
          </div>
          {deckComplete}
        </div>

        {/* Right panel */}
        <div style={{padding:'24px 20px',borderLeft:'1px solid var(--c-line)'}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--c-t3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:14}}>Shortcuts</div>
          <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:24}}>
            {[['Space','Flip card'],['\u2190 \u2192','Prev / Next'],['1','Again'],['2','Hard'],['3','Easy']].map(([k,v])=>(
              <div key={k}><span style={{background:'var(--c-surface2)',border:'1px solid var(--c-line)',borderRadius:5,padding:'2px 8px',fontSize:11,fontWeight:600,color:'var(--c-t2)',display:'inline-block',fontFamily:'monospace'}}>{k}</span><span style={{fontSize:10,color:'var(--c-t3)',display:'block',marginTop:3}}>{v}</span></div>
            ))}
          </div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--c-t3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:12}}>Actions</div>
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            {user && <button onClick={()=>{setSaveTitle(topic);setShowSave(true)}} style={{padding:'7px 10px',borderRadius:7,fontSize:11,fontWeight:600,border:'1px solid rgba(52,211,153,0.25)',background:'rgba(16,185,129,0.07)',color:'#34d399',cursor:'pointer',textAlign:'left'}}>{savedId?'Update save':'Save to My Stuff'}</button>}
            {saveFeedback && <span style={{fontSize:10,color:'#34d399',fontWeight:500}}>{saveFeedback}</span>}
            <button onClick={()=>{shareLink(cards,topic);setCopied(true);setTimeout(()=>setCopied(false),2000)}} style={{padding:'7px 10px',borderRadius:7,fontSize:11,fontWeight:600,border:'1px solid var(--c-line)',background:'var(--c-surface2)',color:copied?'#34d399':'var(--c-t2)',cursor:'pointer',textAlign:'left'}}>{copied?'Link copied!':'Share deck'}</button>
            <button onClick={()=>{setCards([]);setDone([]);setCurrent(0);setFlipped(false);setSessionRatings({again:0,hard:0,easy:0});}} style={{padding:'7px 10px',borderRadius:7,fontSize:11,fontWeight:600,border:'1px solid var(--c-line)',background:'var(--c-surface2)',color:'var(--c-t2)',cursor:'pointer',textAlign:'left'}}>New deck</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default function FlashcardsPage() {
  return (<Suspense fallback={<div style={{minHeight:'100vh'}}/>}><FlashcardsPageInner/></Suspense>)
}
