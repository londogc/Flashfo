'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { logStudySession } from '@/lib/logStudySession'

// ── SM-2 helpers (same algorithm as flashcards page) ─────────────────────────

function cardId(front) {
  const s = (front||'').toLowerCase().trim()
  let h = 0
  for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0 }
  return 'fc-' + Math.abs(h).toString(36)
}

function getReviews() {
  try { return JSON.parse(localStorage.getItem('ff-card-reviews')||'{}') } catch { return {} }
}

function saveReviews(r) {
  try { localStorage.setItem('ff-card-reviews', JSON.stringify(r)) } catch {}
}

function recordSM2(cid, quality) {
  const reviews = getReviews()
  const prev    = reviews[cid] || { easeFactor:2.5, interval:1, repetitions:0 }
  let { easeFactor, interval, repetitions } = prev
  if (quality >= 3) {
    if      (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else                        interval = Math.round(interval * easeFactor)
    repetitions++
  } else {
    repetitions = 0; interval = 1
  }
  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  reviews[cid] = { easeFactor, interval, repetitions, nextReview: Date.now() + interval * 86400000 }
  saveReviews(reviews)
  return reviews[cid]
}

function isDue(front) {
  const reviews = getReviews()
  const r = reviews[cardId(front)]
  if (!r) return true   // never reviewed = due
  return r.nextReview <= Date.now()
}

function getNextReviewLabel(front) {
  const reviews = getReviews()
  const r = reviews[cardId(front)]
  if (!r || !r.nextReview) return 'New'
  const days = Math.round((r.nextReview - Date.now()) / 86400000)
  if (days <= 0)  return 'Due now'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

// ── Speaker button ────────────────────────────────────────────────────────────

function SpeakerBtn({ text, audioRef }) {
  const [busy, setBusy] = useState(false)
  async function speak() {
    if (!text) return
    if (audioRef?.current) { audioRef.current.pause(); audioRef.current = null }
    if (busy) { setBusy(false); return }
    setBusy(true)
    try {
      const { rpc } = await import('@/lib/api')
      const d = await rpc('generateOpenAITtsAudio', [text, 'nova', 1])
      const audio = new Audio('data:'+d.result.mimeType+';base64,'+d.result.base64)
      if (audioRef) audioRef.current = audio
      audio.onended = () => { setBusy(false); if (audioRef) audioRef.current = null }
      audio.play()
    } catch { setBusy(false) }
  }
  return (
    <button onClick={e=>{e.stopPropagation();speak()}} title="Listen"
      style={{ display:'flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:'50%', border:'none', background:'none', cursor:'pointer', color:busy?'#93c5fd':'#3b82f6', opacity:busy?.6:1 }}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 6h2.5L8 4v8L5.5 10H3V6z"/>
        {busy ? <path d="M10 6.5a2 2 0 010 3"/> : <><path d="M10 5a4 4 0 010 6"/><path d="M12 3a7 7 0 010 10"/></>}
      </svg>
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const { user } = useAuth()
  const audioRef      = useRef(null)
  const sessionStart  = useRef(null)

  const [loadingDecks, setLoadingDecks] = useState(true)
  const [dueCards,     setDueCards]     = useState([])   // [{front,back,deckName}]
  const [queue,        setQueue]        = useState([])   // indices into dueCards
  const [flipped,      setFlipped]      = useState(false)
  const [done,         setDone]         = useState(0)
  const [ratings,      setRatings]      = useState({ again:0, hard:0, easy:0 })
  const [sessionEnd,   setSessionEnd]   = useState(false)
  const [hardCards,    setHardCards]    = useState([])
  const [againCards,   setAgainCards]   = useState([])

  // ── Load all saved decks and filter to due cards ────────────────────────────

  useEffect(() => {
    if (!user) return
    loadDueCards()
  }, [user])

  async function loadDueCards() {
    setLoadingDecks(true)
    try {
      const { data, error } = await supabase
        .from('saved_items')
        .select('title, data')
        .eq('user_id', user.id)
        .eq('type', 'flashcards')
        .order('updated_at', { ascending: false })

      if (error || !data?.length) { setLoadingDecks(false); return }

      const due = []
      for (const deck of data) {
        const cards = deck.data?.cards || []
        for (const card of cards) {
          const front = card.front || card.question || ''
          const back  = card.back  || card.answer  || ''
          if (front && back && isDue(front)) {
            due.push({ front, back, deckName: deck.title || deck.data?.topic || 'Deck' })
          }
        }
      }

      // Shuffle due cards for variety
      for (let i = due.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [due[i], due[j]] = [due[j], due[i]]
      }

      setDueCards(due)
      setQueue(due.map((_,i) => i))
      if (due.length > 0) sessionStart.current = Date.now()
    } catch(e) {
      console.error('Error loading decks:', e)
    } finally {
      setLoadingDecks(false)
    }
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────

  useEffect(() => {
    function handler(e) {
      if (sessionEnd || loadingDecks || !queue.length) return
      if (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return
      if (e.key===' '||e.code==='Space') { e.preventDefault(); setFlipped(f=>!f) }
      else if (e.key==='1') handleAgain()
      else if (e.key==='2') handleHard()
      else if (e.key==='3') handleEasy()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [sessionEnd, loadingDecks, queue, flipped])

  // ── Check session end ───────────────────────────────────────────────────────

  useEffect(() => {
    if (queue.length === 0 && dueCards.length > 0 && !sessionEnd) {
      setSessionEnd(true)
      const totalRated = ratings.again + ratings.hard + ratings.easy
      const mins = sessionStart.current ? Math.round((Date.now() - sessionStart.current) / 60000) : 0
      logStudySession({ cardsStudied: totalRated, minutesSpent: mins, source: 'review' }).catch(()=>{})
    }
  }, [queue.length, dueCards.length])

  // ── Session actions ─────────────────────────────────────────────────────────

  const currentIdx = queue[0] ?? 0
  const card       = dueCards[currentIdx]

  function stopAudio() { if (audioRef?.current) { audioRef.current.pause(); audioRef.current = null } }

  function handleAgain() {
    if (!card || !queue.length) return
    stopAudio(); setFlipped(false)
    recordSM2(cardId(card.front), 1)
    setRatings(r => ({...r, again: r.again+1}))
    setAgainCards(prev => prev.find(c=>c.front===card.front) ? prev : [...prev, card])
    setQueue(q => q.length <= 1 ? [] : [...q.slice(1), q[0]])
    setDone(d => d+1)
  }

  function handleHard() {
    if (!card || !queue.length) return
    stopAudio(); setFlipped(false)
    recordSM2(cardId(card.front), 3)
    setRatings(r => ({...r, hard: r.hard+1}))
    setHardCards(prev => prev.find(c=>c.front===card.front) ? prev : [...prev, card])
    setQueue(q => {
      if (q.length <= 1) return []
      const curr = q[0]; const rem = q.slice(1)
      const at   = Math.max(1, Math.ceil(rem.length / 2))
      return [...rem.slice(0, at), curr, ...rem.slice(at)]
    })
    setDone(d => d+1)
  }

  function handleEasy() {
    if (!card || !queue.length) return
    stopAudio(); setFlipped(false)
    recordSM2(cardId(card.front), 5)
    setRatings(r => ({...r, easy: r.easy+1}))
    setHardCards(prev => prev.filter(c => c.front !== card.front))
    setAgainCards(prev => prev.filter(c => c.front !== card.front))
    setQueue(q => q.slice(1))
    setDone(d => d+1)
  }

  const progress = dueCards.length > 0 ? Math.round((done / (done + queue.length)) * 100) : 0
  const cardFace = flipped ? card?.back : card?.front
  const cardBorder = flipped ? 'rgba(99,102,241,0.45)' : 'rgba(59,130,246,0.35)'
  const badgeBg    = flipped ? 'rgba(99,102,241,0.1)' : 'rgba(59,130,246,0.1)'
  const badgeColor = flipped ? '#818cf8' : '#60a5fa'

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loadingDecks) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#f59e0b', animation:'nova-pulse .9s ease-in-out infinite', margin:'0 auto 16px' }}/>
        <div style={{ fontSize:14, color:'var(--c-t2)' }}>Loading your review queue…</div>
      </div>
    </div>
  )

  // ── All caught up ───────────────────────────────────────────────────────────

  if (!loadingDecks && dueCards.length === 0) return (
    <div style={{ padding:'40px 24px', maxWidth:560, margin:'0 auto', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ textAlign:'center', padding:'40px 24px', background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.18)', borderRadius:18 }}>
        <div style={{ marginBottom:16 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" style={{ margin:'0 auto', display:'block' }}>
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
          </svg>
        </div>
        <h2 style={{ fontSize:22, fontWeight:800, color:'var(--c-t1)', marginBottom:8, letterSpacing:'-.03em' }}>You're all caught up!</h2>
        <p style={{ fontSize:13, color:'var(--c-t2)', lineHeight:1.6, marginBottom:24 }}>No cards are due for review right now. Keep studying to build your queue, or come back tomorrow.</p>
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          <a href="/flashcards" style={{ textDecoration:'none', padding:'10px 20px', background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:10, fontSize:13, fontWeight:700, color:'#60a5fa' }}>Study new cards</a>
          <a href="/my-stuff"   style={{ textDecoration:'none', padding:'10px 20px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.5)' }}>Browse My Stuff</a>
        </div>
      </div>
    </div>
  )

  // ── Session complete ────────────────────────────────────────────────────────

  if (sessionEnd) {
    const mastered    = dueCards.length - hardCards.length - againCards.length
    const needsWork   = [...new Map([...hardCards,...againCards].map(c=>[c.front,c])).values()]
    return (
      <div style={{ padding:'28px 24px', maxWidth:780, margin:'0 auto', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
        <div style={{ textAlign:'center', marginBottom:24, padding:'28px 24px', background:'linear-gradient(135deg,rgba(16,185,129,0.07),rgba(52,211,153,0.03))', border:'1px solid rgba(16,185,129,0.18)', borderRadius:16 }}>
          {mastered === dueCards.length && (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" style={{ margin:'0 auto 12px', display:'block' }}>
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
            </svg>
          )}
          <h2 style={{ fontSize:21, fontWeight:900, color:'var(--c-t1)', marginBottom:5, letterSpacing:'-.03em' }}>
            {mastered === dueCards.length ? 'Perfect review!' : 'Review complete'}
          </h2>
          <p style={{ fontSize:13, color:'var(--c-t2)', margin:0 }}>You reviewed {dueCards.length} due card{dueCards.length!==1?'s':''}</p>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
          {[
            { label:'Mastered', value:mastered,           color:'#34d399', bg:'rgba(16,185,129,0.07)',  border:'rgba(16,185,129,0.18)'  },
            { label:'Hard',     value:hardCards.length,   color:'#fbbf24', bg:'rgba(245,158,11,0.07)',  border:'rgba(245,158,11,0.18)'  },
            { label:'Again',    value:againCards.length,  color:'#f87171', bg:'rgba(239,68,68,0.07)',   border:'rgba(239,68,68,0.18)'   },
          ].map(s => (
            <div key={s.label} style={{ padding:'14px 10px', borderRadius:12, textAlign:'center', background:s.bg, border:'1px solid '+s.border }}>
              <div style={{ fontSize:26, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:11, color:'var(--c-t3)', marginTop:4, fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Next review times for hard/again cards */}
        {needsWork.length > 0 && (
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'14px 16px', marginBottom:18 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>Coming back up for review</div>
            {needsWork.slice(0,5).map((c,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', borderBottom: i < needsWork.slice(0,5).length-1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <span style={{ fontSize:12, color:'var(--c-t2)', flex:1, marginRight:12 }}>{c.front}</span>
                <span style={{ fontSize:11, fontWeight:600, color:'rgba(245,158,11,0.7)', flexShrink:0 }}>{getNextReviewLabel(c.front)}</span>
              </div>
            ))}
            {needsWork.length > 5 && <div style={{ fontSize:11, color:'var(--c-t3)', marginTop:8 }}>+ {needsWork.length-5} more</div>}
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <a href="/flashcards" style={{ flex:1, textDecoration:'none', padding:'12px 0', borderRadius:10, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t1)', fontSize:13, fontWeight:700, textAlign:'center', display:'block' }}>Study new cards</a>
          <a href="/dashboard"  style={{ flex:1, textDecoration:'none', padding:'12px 0', borderRadius:10, border:'1px solid rgba(59,130,246,0.25)', background:'rgba(59,130,246,0.08)', color:'#60a5fa', fontSize:13, fontWeight:700, textAlign:'center', display:'block' }}>Back to dashboard</a>
        </div>
      </div>
    )
  }

  // ── Study session ───────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Desktop layout */}
      <div className="fc-desktop-wrap" style={{ display:'none' }}>

        {/* Left sidebar */}
        <div style={{ padding:'24px 20px', borderRight:'1px solid var(--c-line)', display:'flex', flexDirection:'column', gap:14, minWidth:180 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Review Queue</div>
            <div style={{ fontSize:22, fontWeight:800, color:'#f59e0b' }}>{queue.length}</div>
            <div style={{ fontSize:11, color:'var(--c-t3)' }}>cards remaining</div>
          </div>
          <div>
            <div style={{ height:3, background:'var(--c-line)', borderRadius:2, overflow:'hidden', marginBottom:5 }}>
              <div style={{ height:'100%', width:progress+'%', background:'#f59e0b', borderRadius:2, transition:'width .3s' }}/>
            </div>
            <div style={{ fontSize:10, color:'var(--c-t3)' }}>{done} reviewed today</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {[{label:'Easy',val:ratings.easy,color:'#34d399'},{label:'Hard',val:ratings.hard,color:'#fbbf24'},{label:'Again',val:ratings.again,color:'#f87171'},{label:'Left',val:queue.length,color:'#60a5fa'}].map(s=>(
              <div key={s.label} style={{ background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:8, padding:'8px 10px' }}>
                <div style={{ fontSize:18, fontWeight:700, color:s.color, lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:10, color:'var(--c-t3)', marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {card && (
            <div style={{ marginTop:4, padding:'8px 10px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8 }}>
              <div style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.28)', marginBottom:2 }}>From deck</div>
              <div style={{ fontSize:11, color:'var(--c-t2)', lineHeight:1.4 }}>{card.deckName}</div>
            </div>
          )}
        </div>

        {/* Centre card */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'28px 36px' }}>
          {/* Queue dots */}
          <div style={{ display:'flex', gap:4, marginBottom:16, flexWrap:'wrap', justifyContent:'center', maxWidth:320 }}>
            {queue.slice(0,30).map((qi,pos) => (
              <div key={pos} style={{ width:8, height:8, borderRadius:'50%', background: pos===0?'#f59e0b':'rgba(255,255,255,0.14)', transform:pos===0?'scale(1.5)':'scale(1)', transition:'all .2s' }}/>
            ))}
          </div>

          {/* Card */}
          <div style={{ position:'relative', width:'100%', maxWidth:440, height:230, marginBottom:22 }}>
            <div style={{ position:'absolute', top:12, left:12, right:-12, bottom:-12, background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:14 }}/>
            <div style={{ position:'absolute', top:6, left:6, right:-6, bottom:-6, background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:14 }}/>
            <div onClick={()=>{stopAudio();setFlipped(f=>!f)}} style={{ position:'absolute', inset:0, background:'var(--c-surface)', border:'1.5px solid '+cardBorder, borderRadius:14, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:28, cursor:'pointer', transition:'border-color .2s' }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', padding:'3px 10px', borderRadius:20, background:badgeBg, color:badgeColor, marginBottom:14 }}>{flipped?'Answer':'Question'}</div>
              <div style={{ fontSize:17, fontWeight:600, color:'var(--c-t1)', textAlign:'center', lineHeight:1.45 }}>{cardFace}</div>
              {!flipped && <div style={{ fontSize:11, color:'var(--c-t3)', marginTop:10 }}>Click or press Space to flip</div>}
              <div style={{ position:'absolute', bottom:12, right:14 }} onClick={e=>e.stopPropagation()}><SpeakerBtn text={cardFace} audioRef={audioRef}/></div>
            </div>
          </div>

          {flipped ? (
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={handleAgain} style={{ padding:'8px 18px', borderRadius:9, fontSize:11, fontWeight:700, border:'1px solid rgba(239,68,68,0.25)', background:'rgba(239,68,68,0.06)', color:'#f87171', cursor:'pointer', fontFamily:'inherit' }}>Again<br/><span style={{fontSize:9,opacity:.7}}>→ end</span></button>
              <button onClick={handleHard}  style={{ padding:'8px 18px', borderRadius:9, fontSize:11, fontWeight:700, border:'1px solid rgba(245,158,11,0.25)', background:'rgba(245,158,11,0.06)', color:'#fbbf24', cursor:'pointer', fontFamily:'inherit' }}>Hard<br/><span style={{fontSize:9,opacity:.7}}>→ later</span></button>
              <button onClick={handleEasy}  style={{ padding:'8px 18px', borderRadius:9, fontSize:11, fontWeight:700, border:'1px solid rgba(16,185,129,0.3)', background:'rgba(16,185,129,0.07)', color:'#34d399', cursor:'pointer', fontFamily:'inherit' }}>Easy<br/><span style={{fontSize:9,opacity:.7}}>✓ done</span></button>
            </div>
          ) : (
            <p style={{ fontSize:12, color:'var(--c-t3)', margin:0 }}>Click or press Space · then rate</p>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ padding:'24px 20px', borderLeft:'1px solid var(--c-line)' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:14 }}>Shortcuts</div>
          {[['Space','Flip card'],['1','Again → end'],['2','Hard → later'],['3','Easy → done']].map(([k,v])=>(
            <div key={k} style={{ marginBottom:12 }}>
              <span style={{ background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:5, padding:'2px 8px', fontSize:11, fontWeight:600, color:'var(--c-t2)', display:'inline-block', fontFamily:'monospace' }}>{k}</span>
              <span style={{ fontSize:10, color:'var(--c-t3)', display:'block', marginTop:3 }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop:20, fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>About SR</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', lineHeight:1.6 }}>Easy cards come back in days. Hard ones come back sooner. Again resets the card to tomorrow.</div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="fc-mobile-wrap" style={{ padding:'20px', maxWidth:560, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <h1 style={{ fontSize:18, fontWeight:800, color:'var(--c-t1)', letterSpacing:'-.02em' }}>Review</h1>
            <p style={{ fontSize:12, color:'var(--c-t2)' }}>{queue.length} cards remaining · {done} done</p>
          </div>
          {card && <div style={{ fontSize:11, color:'var(--c-t3)', textAlign:'right', maxWidth:120, lineHeight:1.4 }}>{card.deckName}</div>}
        </div>

        <div style={{ width:'100%', height:3, background:'var(--c-line)', borderRadius:2, marginBottom:14, overflow:'hidden' }}>
          <div style={{ height:'100%', width:progress+'%', background:'#f59e0b', borderRadius:2, transition:'width .3s' }}/>
        </div>

        <div onClick={()=>{stopAudio();setFlipped(f=>!f)}} style={{ background:'var(--c-surface)', border:'1.5px solid '+cardBorder, borderRadius:16, padding:32, textAlign:'center', cursor:'pointer', minHeight:200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, position:'relative', transition:'border-color .2s', marginBottom:12 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', padding:'3px 10px', borderRadius:20, background:badgeBg, color:badgeColor }}>{flipped?'Answer':'Question'}</div>
          <div style={{ fontSize:16, fontWeight:600, color:'var(--c-t1)', lineHeight:1.5, maxWidth:320 }}>{cardFace}</div>
          {!flipped && <div style={{ fontSize:11, color:'var(--c-t3)' }}>Tap to reveal answer</div>}
          <div style={{ position:'absolute', bottom:12, right:14 }} onClick={e=>e.stopPropagation()}><SpeakerBtn text={cardFace} audioRef={audioRef}/></div>
        </div>

        {flipped ? (
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleAgain} style={{ flex:1, padding:'11px 4px', borderRadius:10, border:'1px solid rgba(239,68,68,0.25)', background:'rgba(239,68,68,0.06)', color:'#f87171', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Again<div style={{fontSize:9,opacity:.7,marginTop:2}}>→ end</div></button>
            <button onClick={handleHard}  style={{ flex:1, padding:'11px 4px', borderRadius:10, border:'1px solid rgba(245,158,11,0.25)', background:'rgba(245,158,11,0.06)', color:'#fbbf24', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Hard<div style={{fontSize:9,opacity:.7,marginTop:2}}>→ later</div></button>
            <button onClick={handleEasy}  style={{ flex:1, padding:'11px 4px', borderRadius:10, border:'1px solid rgba(16,185,129,0.3)', background:'rgba(16,185,129,0.07)', color:'#34d399', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Easy<div style={{fontSize:9,opacity:.7,marginTop:2}}>✓ done</div></button>
          </div>
        ) : (
          <div style={{ textAlign:'center', padding:'10px 0', fontSize:12, color:'var(--c-t3)' }}>Rate this card after revealing the answer</div>
        )}
      </div>
    </div>
  )
}
