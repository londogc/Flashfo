'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { useIsMobile } from '@/hooks/useIsMobile'
import { supabase } from '@/lib/supabase'
import { saveItem, updateSavedItem } from '@/lib/savedItems'
import { logStudySession } from '@/lib/logStudySession'
import { saveDraft, loadDraft, clearDraft } from '@/lib/saveDraft'
import { rpc, novaStream } from '@/lib/api'

// ── Utilities ────────────────────────────────────────────────────────────────

function printDeck(cards, topic) {
  const win = window.open('', '_blank')
  const rows = cards.map((c,i) =>
    '<tr><td style="padding:8px 10px;border:1px solid #e5e7eb;font-weight:600;width:50%">'+(i+1)+'. '+(c.front||c.question||'')+'</td><td style="padding:8px 10px;border:1px solid #e5e7eb">'+(c.back||c.answer||'')+'</td></tr>'
  ).join('')
  win.document.write('<!DOCTYPE html><html><head><title>Flashcards</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;color:#111}h1{font-size:22px;margin-bottom:4px}.sub{color:#666;font-size:12px;margin-bottom:20px}table{width:100%;border-collapse:collapse}th{background:#f3f4f6;padding:8px 10px;border:1px solid #e5e7eb;text-align:left}@media print{body{margin:20px}}</style></head><body><h1>'+(topic||'Flashcards')+'</h1><div class="sub">'+cards.length+' cards</div><table><tr><th>Question</th><th>Answer</th></tr>'+rows+'</table><script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script></body></html>')
  win.document.close()
}

function shareLink(cards, topic) {
  const payload = btoa(JSON.stringify({ topic, cards }))
  const url = window.location.origin + '/flashcards?share=' + payload
  navigator.clipboard.writeText(url).catch(() => {})
  return url
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
      const d = await rpc('generateOpenAITtsAudio', [text, 'nova', 1])
      const audio = new Audio('data:'+d.result.mimeType+';base64,'+d.result.base64)
      if (audioRef) audioRef.current = audio
      audio.onended = () => { setBusy(false); if (audioRef) audioRef.current = null }
      audio.play()
    } catch { setBusy(false) }
  }
  return (
    <button onClick={e=>{e.stopPropagation();speak()}} title="Listen"
      style={{display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:'50%',border:'none',background:'none',cursor:'pointer',color:busy?'#93c5fd':'#3b82f6',opacity:busy?0.6:1,transition:'all .15s'}}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 6h2.5L8 4v8L5.5 10H3V6z"/>
        {busy ? <path d="M10 6.5a2 2 0 010 3"/> : <><path d="M10 5a4 4 0 010 6"/><path d="M12 3a7 7 0 010 10"/></>}
      </svg>
    </button>
  )
}

// ── Session complete screen (unchanged) ──────────────────────────────────────

function SessionComplete({ cards, topic, hardCards, againCards, sessionRatings, onRestart, onNewDeck, cardTheme }) {
  const mastered = cards.length - hardCards.length - againCards.length
  const needsWork = [...new Map([...hardCards,...againCards].map(c=>[c.front||c.question,c])).values()]
  const hasTrouble = needsWork.length > 0
  return (
    <div style={{padding:'28px 24px',maxWidth:620,margin:'0 auto',width:'100%'}}>
      <div style={{textAlign:'center',marginBottom:24,padding:'28px 24px',background:'linear-gradient(135deg,rgba(16,185,129,0.07),rgba(52,211,153,0.03))',border:'1px solid rgba(16,185,129,0.18)',borderRadius:16}}>
        {mastered===cards.length && <div style={{marginBottom:10}}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" style={{margin:'0 auto',display:'block'}}>
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
          </svg>
        </div>}
        <h2 style={{fontSize:21,fontWeight:900,color:'var(--c-t1)',marginBottom:5,letterSpacing:'-.03em'}}>{mastered===cards.length?'Perfect session!':'Session complete'}</h2>
        <p style={{fontSize:13,color:'var(--c-t2)',margin:0}}>You studied all {cards.length} cards in <em>{topic}</em></p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:22}}>
        {[{label:'Mastered',value:mastered,color:'#34d399',bg:'rgba(16,185,129,0.07)',border:'rgba(16,185,129,0.18)'},
          {label:'Hard',value:hardCards.length,color:'#fbbf24',bg:'rgba(245,158,11,0.07)',border:'rgba(245,158,11,0.18)'},
          {label:'Again',value:againCards.length,color:'#f87171',bg:'rgba(239,68,68,0.07)',border:'rgba(239,68,68,0.18)'}
        ].map(s=>(
          <div key={s.label} style={{padding:'14px 10px',borderRadius:12,textAlign:'center',background:s.bg,border:'1px solid '+s.border}}>
            <div style={{fontSize:26,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:11,color:'var(--c-t3)',marginTop:4,fontWeight:600}}>{s.label}</div>
          </div>
        ))}
      </div>
      {hasTrouble && (
        <div style={{padding:'18px 20px',borderRadius:14,marginBottom:18,background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.2)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
            <div style={{width:30,height:30,borderRadius:'50%',flexShrink:0,background:'radial-gradient(circle at 33% 33%,#c4b5fd,#7c3aed 40%,#4c1d95 70%,#08001a)',boxShadow:'0 0 12px rgba(124,58,237,0.5)'}}/>
            <div><div style={{fontSize:13,fontWeight:800,color:'#a5b4fc'}}>Nova</div><div style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>Study assistant</div></div>
          </div>
          <p style={{fontSize:13,color:'var(--c-t1)',lineHeight:1.6,margin:'0 0 14px'}}>You marked <strong style={{color:'#f87171'}}>{needsWork.length} card{needsWork.length>1?'s':''}</strong> as hard or again. Want me to generate a focused deck targeting exactly those weak spots?</p>
          <div style={{marginBottom:14,display:'flex',flexDirection:'column',gap:5}}>
            {needsWork.slice(0,4).map((c,i)=>(
              <div key={i} style={{fontSize:12,color:'var(--c-t2)',padding:'6px 10px',borderRadius:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>{c.front||c.question}</div>
            ))}
            {needsWork.length>4&&<div style={{fontSize:11,color:'var(--c-t3)',padding:'4px 10px'}}>+ {needsWork.length-4} more</div>}
          </div>
          <button onClick={onNewDeck} style={{width:'100%',padding:'12px 0',borderRadius:10,border:'none',background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 16px rgba(99,102,241,0.35)'}}>
            Generate focused deck on weak areas
          </button>
        </div>
      )}
      <div style={{display:'flex',gap:10}}>
        <button onClick={onRestart} style={{flex:1,padding:'12px 0',borderRadius:10,border:'1px solid var(--c-line)',background:'var(--c-surface2)',color:'var(--c-t1)',fontSize:13,fontWeight:700,cursor:'pointer'}}>↺ Study again</button>
      </div>
    </div>
  )
}

// ── Card themes ───────────────────────────────────────────────────────────────

const CARD_THEMES = {
  default:  { accent:'#6366f1', glow:'rgba(99,102,241,0.12)',  tint:'rgba(99,102,241,0.03)'  },
  midnight: { accent:'#3b82f6', glow:'rgba(37,99,235,0.12)',   tint:'rgba(37,99,235,0.03)'   },
  forest:   { accent:'#10b981', glow:'rgba(16,185,129,0.12)',  tint:'rgba(16,185,129,0.03)'  },
  ember:    { accent:'#f97316', glow:'rgba(249,115,22,0.12)',  tint:'rgba(249,115,22,0.03)'  },
}

// ── Quick-start chips ─────────────────────────────────────────────────────────

const CHIPS = [
  'The French Revolution','Calculus derivatives','Python data structures',
  'Cardiovascular anatomy','Spanish irregular verbs','The Cold War',
]

// ── Publish toggle ────────────────────────────────────────────────────────────

function PublishToggle({ deckId }) {
  const [isPublic, setIsPublic] = useState(null)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    if (!deckId) return
    supabase.from('saved_items').select('is_public').eq('id', deckId).single()
      .then(({ data }) => setIsPublic(data?.is_public || false))
      .catch(() => {})
  }, [deckId])

  async function toggle() {
    setSaving(true)
    const next = !isPublic
    try {
      await supabase.from('saved_items').update({ is_public: next }).eq('id', deckId)
      setIsPublic(next)
    } catch {}
    setSaving(false)
  }

  if (isPublic === null) return null

  return (
    <button onClick={toggle} disabled={saving}
      style={{ padding:'7px 10px', borderRadius:7, fontSize:11, fontWeight:600, border:`1px solid ${isPublic?'rgba(99,102,241,0.35)':'rgba(255,255,255,0.09)'}`, background:isPublic?'rgba(99,102,241,0.1)':'rgba(255,255,255,0.03)', color:isPublic?'#a5b4fc':'var(--c-t3)', cursor:'pointer', textAlign:'left', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, opacity:saving?.6:1, transition:'all .15s' }}>
      <div style={{ width:14, height:14, borderRadius:3, border:`1.5px solid ${isPublic?'#6366f1':'rgba(255,255,255,0.2)'}`, background:isPublic?'#6366f1':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {isPublic && <svg width="9" height="9" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>}
      </div>
      {isPublic ? 'Public — in Shared Decks' : 'Share publicly'}
    </button>
  )
}

// ── Nova Explain Differently ──────────────────────────────────────────────────

const EXPLAIN_STYLES = [
  { id:'simpler',  label:'Simpler',  desc:'Plain language' },
  { id:'analogy',  label:'Analogy',  desc:'Compare to something familiar' },
  { id:'example',  label:'Example',  desc:'Real-world scenario' },
  { id:'eli5',     label:'ELI5',     desc:"Like I'm 5" },
]

function NovaExplainPanel({ card, explainStyle, novaExplain, explaining, onExplain }) {
  const [open, setOpen] = useState(false)

  if (!card) return null

  return (
    <div style={{ width:'100%', maxWidth:440 }}>
      {/* Toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{ width:'100%', padding:'7px 0', borderRadius:9, border:'1px solid rgba(167,139,250,0.2)', background:'rgba(167,139,250,0.06)', color:'rgba(167,139,250,0.7)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'all .15s' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>
          Explain differently
        </button>
      )}

      {/* Panel */}
      {open && (
        <div style={{ background:'rgba(10,8,22,0.9)', border:'1px solid rgba(167,139,250,0.25)', borderRadius:12, padding:'14px 16px', backdropFilter:'blur(12px)' }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:22, height:22, borderRadius:'50%', background:'radial-gradient(circle at 33% 33%,#c4b5fd,#7c3aed 40%,#4c1d95 70%,#08001a)', boxShadow:'0 0 8px rgba(124,58,237,0.5)', flexShrink:0 }}/>
              <span style={{ fontSize:12, fontWeight:700, color:'#a78bfa' }}>Nova</span>
            </div>
            <button onClick={() => { setOpen(false) }} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer', fontSize:14, fontFamily:'inherit', lineHeight:1 }}>✕</button>
          </div>

          {/* Style selector */}
          <div style={{ display:'flex', gap:5, marginBottom:12, flexWrap:'wrap' }}>
            {EXPLAIN_STYLES.map(s => (
              <button key={s.id}
                onClick={() => onExplain(s.id)}
                disabled={explaining}
                style={{ padding:'4px 11px', borderRadius:20, fontSize:11, fontWeight:700, cursor:explaining?'not-allowed':'pointer', fontFamily:'inherit', transition:'all .15s', border:'1px solid '+(explainStyle===s.id?'rgba(167,139,250,0.5)':'rgba(255,255,255,0.1)'), background:explainStyle===s.id?'rgba(167,139,250,0.15)':'rgba(255,255,255,0.04)', color:explainStyle===s.id?'#c4b5fd':'rgba(255,255,255,0.4)', opacity:explaining&&explainStyle!==s.id?.4:1 }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Explanation content */}
          {!explainStyle && !explaining && (
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', lineHeight:1.6 }}>
              Pick a style above — Nova will re-explain "<span style={{ color:'rgba(255,255,255,0.5)' }}>{card.front||card.question}</span>" in a different way.
            </div>
          )}

          {explaining && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#a78bfa', animation:'nova-pulse .9s ease-in-out infinite', flexShrink:0 }}/>
              <span style={{ fontSize:12, color:'rgba(167,139,250,0.6)' }}>Nova is thinking…</span>
            </div>
          )}

          {novaExplain && (
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.85)', lineHeight:1.7 }}>{novaExplain}</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main inner component ──────────────────────────────────────────────────────

function FlashcardsPageInner() {
  const { user, profile } = useAuth()
  const isMobile  = useIsMobile()
  const cardTheme = CARD_THEMES[profile?.flashcard_theme] || CARD_THEMES.default
  const searchParams = useSearchParams()
  const audioRef = useRef(null)
  const sessionStartRef = useRef(null)

  const [inputTab,    setInputTab]    = useState('topic') // 'topic' | 'notes' | 'import'
  const [topic,       setTopic]       = useState('')
  const [count,       setCount]       = useState(10)
  const [cards,       setCards]       = useState([])
  const [loading,     setLoading]     = useState(false)
  const [flipped,     setFlipped]     = useState(false)
  const [error,       setError]       = useState('')
  const [showEdit,    setShowEdit]    = useState(false)
  const [editIdx,     setEditIdx]     = useState(null)
  const [editVals,    setEditVals]    = useState({ front:'', back:'' })
  const [savedId,     setSavedId]     = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [saveFeedback,setSaveFeedback]= useState('')
  const [showSave,    setShowSave]    = useState(false)
  const [saveTitle,   setSaveTitle]   = useState('')
  const [copied,      setCopied]      = useState(false)
  const [autoGen,     setAutoGen]     = useState(false)
  const [draftBanner, setDraftBanner] = useState(false)
  const [importText,  setImportText]  = useState('')
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef(null)
  const [studyQueue,  setStudyQueue]  = useState([])
  const [sessionComplete,    setSessionComplete]    = useState(false)
  const [sessionHardCards,   setSessionHardCards]   = useState([])
  const [sessionAgainCards,  setSessionAgainCards]  = useState([])
  const [sessionRatings,     setSessionRatings]     = useState({ again:0, hard:0, easy:0 })
  const [dueToday,    setDueToday]    = useState(0)

  // Nova "explain differently" — inline per-card explanations
  const [novaExplain,   setNovaExplain]   = useState('')    // streamed text
  const [explaining,    setExplaining]    = useState(false)
  const [explainStyle,  setExplainStyle]  = useState(null)  // null | 'simpler' | 'analogy' | 'example' | 'eli5'

  const currentIdx = studyQueue.length > 0 ? studyQueue[0] : 0
  const card       = cards.length > 0 ? cards[currentIdx] : null
  const done       = cards.length - studyQueue.length

  // ── Initialisation ──────────────────────────────────────────────────────────

  useEffect(() => {
    const saved = sessionStorage.getItem('flashfo_load_flashcards') || sessionStorage.getItem('flashfo_fc_load')
    if (saved) {
      try {
        const { cards: sc, topic: st, id: si } = JSON.parse(saved)
        sessionStorage.removeItem('flashfo_load_flashcards')
        sessionStorage.removeItem('flashfo_fc_load')
        if (sc?.length) {
          setCards(sc); setTopic(st||''); setSavedId(si||null)
          setStudyQueue(sc.map((_,i)=>i)); sessionStartRef.current=Date.now(); return
        }
      } catch(e) {}
    }
    const q = searchParams.get('q')
    if (q) {
      setTopic(decodeURIComponent(q))
      if (searchParams.get('autoGenerate')==='1') setAutoGen(true)
      return
    }
    loadDraft('flashcards').then(draft => {
      if (draft?.data?.cards?.length) {
        setTopic(draft.data.topic||''); setCards(draft.data.cards)
        setStudyQueue(draft.data.cards.map((_,i)=>i)); setDraftBanner(true)
      }
    })
  }, [])

  useEffect(() => {
    if (autoGen && topic.trim() && !loading && !cards.length) { setAutoGen(false); generate() }
  }, [autoGen, topic])

  useEffect(() => {
    if (card && !sessionComplete) {
      window._flashfoCurrentCard = { front:card.front||card.question||'', back:flipped?(card.back||card.answer||''):null, topic:topic||'' }
    } else { window._flashfoCurrentCard = null }
    return () => { window._flashfoCurrentCard = null }
  }, [card, flipped, topic, sessionComplete])

  useEffect(() => {
    if (typeof window==='undefined') return
    const reviews = JSON.parse(localStorage.getItem('ff-card-reviews')||'{}')
    const due = Object.entries(reviews).filter(([,v])=>v.nextReview&&v.nextReview<=Date.now()).length
    setDueToday(due)
  }, [])

  useEffect(() => {
    if (studyQueue.length===0 && cards.length>0 && !sessionComplete) {
      setSessionComplete(true)
      const totalRated = sessionRatings.again+sessionRatings.hard+sessionRatings.easy
      const minutesSpent = sessionStartRef.current ? Math.round((Date.now()-sessionStartRef.current)/60000) : 0
      logStudySession({ cardsStudied:totalRated, minutesSpent, source:'flashcards' })
      clearDraft('flashcards')
    }
  }, [studyQueue.length, cards.length])

  useEffect(() => {
    function handler(e) {
      if (!cards.length||showEdit||sessionComplete) return
      if (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return
      if (e.key===' '||e.code==='Space') { e.preventDefault(); stopAudio(); setFlipped(f=>!f) }
      else if (e.key==='1') { stopAudio(); handleAgain() }
      else if (e.key==='2') { stopAudio(); handleHard() }
      else if (e.key==='3') { stopAudio(); handleEasy() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cards.length, studyQueue, showEdit, sessionComplete, flipped])

  // ── Session actions ─────────────────────────────────────────────────────────

  // ── Spaced repetition ──────────────────────────────────────────────────────
  // Card IDs are content-based (hash of front text) not positional, so deck
  // edits and reorders don't wipe a card's review history.
  function cardId(front) {
    const s = (front||'').toLowerCase().trim()
    let h = 0
    for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0 }
    return 'fc-' + Math.abs(h).toString(36)
  }

  function stopAudio() { if (audioRef?.current) { audioRef.current.pause(); audioRef.current=null } }

  function recordSM2(cardId, quality) {
    if (typeof window==='undefined') return
    const reviews = JSON.parse(localStorage.getItem('ff-card-reviews')||'{}')
    const prev = reviews[cardId]||{ easeFactor:2.5, interval:1, repetitions:0 }
    let { easeFactor, interval, repetitions } = prev
    if (quality>=3) { if (repetitions===0) interval=1; else if (repetitions===1) interval=6; else interval=Math.round(interval*easeFactor); repetitions++ }
    else { repetitions=0; interval=1 }
    easeFactor = Math.max(1.3, easeFactor+0.1-(5-quality)*(0.08+(5-quality)*0.02))
    reviews[cardId] = { easeFactor, interval, repetitions, nextReview:Date.now()+interval*86400000 }
    localStorage.setItem('ff-card-reviews', JSON.stringify(reviews))
  }

  function handleAgain() {
    if (!card||studyQueue.length===0) return
    stopAudio(); setFlipped(false); setNovaExplain(''); setExplainStyle(null)
    recordSM2(cardId(card.front||card.question), 1)
    setSessionRatings(r=>({...r,again:r.again+1}))
    setSessionAgainCards(prev=>{ const key=card.front||card.question; if (prev.find(c=>(c.front||c.question)===key)) return prev; return [...prev,card] })
    setStudyQueue(q=>{ if (q.length<=1) return []; return [...q.slice(1),q[0]] })
  }

  function handleHard() {
    if (!card||studyQueue.length===0) return
    stopAudio(); setFlipped(false); setNovaExplain(''); setExplainStyle(null)
    recordSM2(cardId(card.front||card.question), 3)
    setSessionRatings(r=>({...r,hard:r.hard+1}))
    setSessionHardCards(prev=>{ const key=card.front||card.question; if (prev.find(c=>(c.front||c.question)===key)) return prev; return [...prev,card] })
    setStudyQueue(q=>{ if (q.length<=1) return []; const curr=q[0]; const rem=q.slice(1); const at=Math.max(1,Math.ceil(rem.length/2)); return [...rem.slice(0,at),curr,...rem.slice(at)] })
  }

  function handleEasy() {
    if (!card||studyQueue.length===0) return
    stopAudio(); setFlipped(false); setNovaExplain(''); setExplainStyle(null)
    recordSM2(cardId(card.front||card.question), 5)
    setSessionRatings(r=>({...r,easy:r.easy+1}))
    setStudyQueue(q=>q.slice(1))
    setSessionHardCards(prev=>prev.filter(c=>(c.front||c.question)!==(card.front||card.question)))
    setSessionAgainCards(prev=>prev.filter(c=>(c.front||c.question)!==(card.front||card.question)))
  }

  // ── Nova "explain differently" ──────────────────────────────────────────────

  async function explainDifferently(style) {
    if (!card || explaining) return
    setExplainStyle(style)
    setExplaining(true)
    setNovaExplain('')
    const front = card.front || card.question || ''
    const back  = card.back  || card.answer  || ''
    const stylePrompts = {
      simpler:  'Explain this concept in the simplest possible terms, as if teaching it to someone with no background. Avoid jargon.',
      analogy:  'Explain this concept using a creative, memorable analogy or comparison to something from everyday life.',
      example:  'Explain this concept through a concrete, real-world example or scenario that makes it stick.',
      eli5:     'Explain this concept as if the student is 5 years old — extremely simple language, short sentences, maybe a story.',
    }
    try {
      await novaStream(
        [{ role:'user', content:`Concept: "${front}"\nStandard explanation: "${back}"\n\nTask: ${stylePrompts[style]}\n\nKeep it under 4 sentences. Be engaging and memorable.` }],
        chunk => setNovaExplain(prev => prev + chunk),
        { systemOverride:'You are Nova, a friendly and creative study assistant. Give alternative explanations that are vivid and memorable. Never say "Sure!" or "Of course!". Get straight to the explanation.' }
      )
    } catch {
      setNovaExplain('Unable to load explanation right now.')
    } finally {
      setExplaining(false)
    }
  }

  // ── Edit ────────────────────────────────────────────────────────────────────

  function startEdit(i)  { setEditIdx(i); setEditVals({ front:cards[i].front||cards[i].question||'', back:cards[i].back||cards[i].answer||'' }) }
  function saveEdit()    { if (editIdx===null) return; setCards(cs=>cs.map((c,i)=>i===editIdx?{front:editVals.front,back:editVals.back}:c)); setEditIdx(null) }
  function addCard()     { const n=cards.length; setCards(cs=>[...cs,{front:'New question',back:'New answer'}]); setTimeout(()=>startEdit(n),0) }
  function deleteCard(i) { setCards(cs=>cs.filter((_,ci)=>ci!==i)); setStudyQueue(q=>q.filter(qi=>qi!==i).map(qi=>qi>i?qi-1:qi)); if (editIdx===i) setEditIdx(null) }

  // ── CSV / TSV / text import ─────────────────────────────────────────────────
  // Supports:
  //   CSV:  front,back  or  "front","back"
  //   TSV:  front\tback  (Quizlet / Anki export)
  //   Simple separators:  front - back  /  front: back
  //   Unstructured text:  fall through to Nova

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
        if (front.trim() && back) cards.push({ front: front.trim(), back })
        continue
      }

      // CSV — handle quoted fields
      if (trimmed.includes(',')) {
        // Simple quoted CSV: "front","back"
        const quoted = trimmed.match(/^"([^"]+)"\s*,\s*"([^"]+)"$/)
        if (quoted) { cards.push({ front: quoted[1].trim(), back: quoted[2].trim() }); continue }
        // Plain CSV: front,back (split on first comma only)
        const comma = trimmed.indexOf(',')
        const front = trimmed.slice(0, comma).trim()
        const back  = trimmed.slice(comma + 1).trim()
        if (front && back) { cards.push({ front, back }); continue }
      }

      // Dash separator: front - back (but not inside a word)
      const dash = trimmed.match(/^(.+?)\s{1,3}-{1,2}\s{1,3}(.+)$/)
      if (dash) { cards.push({ front: dash[1].trim(), back: dash[2].trim() }); continue }

      // Colon separator: front: back
      const colon = trimmed.match(/^([^:]+):\s+(.+)$/)
      if (colon) { cards.push({ front: colon[1].trim(), back: colon[2].trim() }); continue }
    }

    return cards.length >= 2 ? cards : null
  }

  async function handleImport() {
    const raw = importText.trim()
    if (!raw) { setImportError('Paste some content to import.'); return }
    setImportError('')

    // Try to parse as structured data first (no API cost)
    const parsed = parseImportText(raw)
    if (parsed) {
      setCards(parsed)
      setStudyQueue(parsed.map((_,i) => i))
      sessionStartRef.current = Date.now()
      setTopic(parsed[0]?.front?.slice(0,40) || 'Imported deck')
      if (user) await saveDraft('flashcards', 'Imported deck', { topic:'Imported deck', cards:parsed })
      return
    }

    // Unstructured text — hand to Nova to extract cards
    setTopic(raw.slice(0, 60))
    await generate(raw)
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setImportText(ev.target.result || '')
      setImportError('')
    }
    reader.readAsText(file)
    // reset so same file can be re-selected
    e.target.value = ''
  }

  // ── Generate ────────────────────────────────────────────────────────────────

  async function generate(overrideTopic) {
    const t = (overrideTopic||topic).trim()
    if (!t) return
    if (overrideTopic) setTopic(overrideTopic)
    setLoading(true); setCards([]); setFlipped(false); setError(''); setSavedId(null)
    setStudyQueue([]); setSessionComplete(false); setSessionHardCards([]); setSessionAgainCards([])
    setSessionRatings({again:0,hard:0,easy:0}); setDraftBanner(false)
    try {
      const data  = await rpc('generateFlashcardsFromText', [t, count, 'English'])
      const raw   = data.result
      let parsed  = []
      if (raw?.cards) parsed = raw.cards
      else if (Array.isArray(raw)) parsed = raw
      if (!parsed.length) setError('Could not generate cards. Try adding more detail.')
      else {
        setCards(parsed)
        setStudyQueue(parsed.map((_,i)=>i))
        sessionStartRef.current = Date.now()
        if (user) await saveDraft('flashcards', t, { topic:t, cards:parsed })
      }
    } catch { setError('Something went wrong. Please try again.') }
    finally  { setLoading(false) }
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function doSave() {
    if (!user) return; setSaving(true)
    try {
      const payload = { cards, topic }
      if (savedId) { await updateSavedItem(savedId,{title:saveTitle||topic,data:payload}); setSaveFeedback('Updated!') }
      else { const r=await saveItem(user.id,'flashcards',saveTitle||topic,payload); setSavedId(r.id); setSaveFeedback('Saved!') }
      setShowSave(false); await clearDraft('flashcards')
      setTimeout(()=>setSaveFeedback(''), 3000)
    } catch { setSaveFeedback('Save failed') }
    finally { setSaving(false) }
  }

  function restartSession() {
    setStudyQueue(cards.map((_,i)=>i)); setSessionComplete(false)
    setSessionHardCards([]); setSessionAgainCards([])
    setSessionRatings({again:0,hard:0,easy:0}); setFlipped(false)
    sessionStartRef.current = Date.now()
  }

  function generateFocusedDeck() {
    const weak  = [...new Map([...sessionHardCards,...sessionAgainCards].map(c=>[c.front||c.question,c])).values()]
    const terms = weak.map(c=>c.front||c.question).slice(0,8).join('; ')
    const ft    = `Create flashcards to help me master these specific concepts from "${topic}": ${terms}`
    setSessionComplete(false); setSessionHardCards([]); setSessionAgainCards([])
    setSessionRatings({again:0,hard:0,easy:0}); setFlipped(false); setSavedId(null)
    generate(ft)
  }

  function startFresh() { setCards([]); setStudyQueue([]); setSessionComplete(false); setDraftBanner(false); clearDraft('flashcards') }

  // ── Render: input (no cards yet) ────────────────────────────────────────────

  if (!cards.length) return (
    <div style={{ padding:'28px 24px 48px', maxWidth:1100, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Draft banner */}
      {draftBanner && (
        <div style={{ background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:10, padding:'10px 14px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
          <span style={{ fontSize:12, color:'rgba(241,240,255,0.65)', flex:1 }}>Resuming your last deck — <strong style={{ color:'rgba(241,240,255,0.85)' }}>{topic}</strong></span>
          <button onClick={startFresh} style={{ fontSize:11, color:'rgba(241,240,255,0.35)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Start fresh</button>
        </div>
      )}

      {/* Due today banner */}
      {dueToday > 0 && (
        <a href="/review" style={{ textDecoration:'none', display:'block', marginBottom:20 }}>
          <div style={{ background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.22)', borderRadius:10, padding:'11px 16px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontWeight:700, fontSize:13, color:'#f59e0b' }}>{dueToday} card{dueToday>1?'s':''} ready to review</p>
              <p style={{ margin:0, fontSize:11, color:'rgba(255,255,255,0.3)' }}>Tap to start your review session →</p>
            </div>
          </div>
        </a>
      )}

      {/* Page header */}
      <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:20, padding:'5px 13px', fontSize:10, fontWeight:800, color:'#60a5fa', marginBottom:16, letterSpacing:'.08em', textTransform:'uppercase' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
        Flashcards
      </div>
      <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-.03em', marginBottom:5, color:'var(--c-t1)', lineHeight:1.15 }}>Turn anything into a deck</h1>
      <p style={{ fontSize:13, color:'var(--c-t2)', marginBottom:22, lineHeight:1.65, maxWidth:520 }}>Type a topic, paste your lecture notes, or import an existing set. Nova builds cards that stick using spaced repetition.</p>

      {/* Quick-start chips */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
        {CHIPS.map(c => (
          <button key={c} onClick={()=>setTopic(c)} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
            {c}
          </button>
        ))}
      </div>

      {/* Two-column layout — single column on mobile */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:20, alignItems:'start' }}>

        {/* Left — input */}
        <div>
          <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:14, overflow:'hidden' }}>

            {/* Input mode tabs */}
            <div style={{ display:'flex', gap:2, padding:'8px 10px 0', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              {[['topic','By topic'],['notes','Paste notes'],['import','Import']].map(([id,label])=>(
                <button key={id} onClick={()=>setInputTab(id)} style={{ padding:'5px 12px', borderRadius:'6px 6px 0 0', fontSize:11, fontWeight:700, cursor:'pointer', border:'none', background:inputTab===id?'rgba(255,255,255,0.08)':'none', color:inputTab===id?'#e2e8f0':'rgba(255,255,255,0.28)', fontFamily:'inherit', transition:'all .15s' }}>
                  {label}
                </button>
              ))}
            </div>

            {inputTab === 'import' ? (
              <div>
                {/* File upload zone */}
                <div
                  onClick={()=>fileInputRef.current?.click()}
                  style={{ margin:'12px 14px 0', padding:'14px', border:'1.5px dashed rgba(59,130,246,0.25)', borderRadius:10, display:'flex', alignItems:'center', gap:12, cursor:'pointer', background:'rgba(59,130,246,0.04)', transition:'all .15s' }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:'rgba(59,130,246,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.65)' }}>Upload a file</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.28)', marginTop:1 }}>.csv · .tsv · .txt · .md</div>
                  </div>
                  <div style={{ marginLeft:'auto', fontSize:11, fontWeight:600, color:'rgba(96,165,250,0.6)', padding:'4px 10px', border:'1px solid rgba(59,130,246,0.25)', borderRadius:6 }}>Browse</div>
                </div>
                <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt,.md" onChange={handleFileUpload} style={{ display:'none' }}/>

                {/* Divider */}
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
                  <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.07)' }}/>
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.2)', fontWeight:600 }}>OR PASTE BELOW</span>
                  <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.07)' }}/>
                </div>

                {/* Paste area */}
                <textarea
                  value={importText}
                  onChange={e=>{ setImportText(e.target.value); setImportError('') }}
                  rows={5}
                  placeholder={'front term, back definition\nphotosynthesis, process plants use to make food\nmitosis, cell division producing two identical cells\n\nAlso supports tab-separated (Quizlet export) and plain text.'}
                  style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'#e2e8f0', fontFamily:'inherit', fontSize:12, lineHeight:1.7, padding:'0 16px 12px', resize:'none', display:'block' }}
                />

                {/* Format chips */}
                <div style={{ padding:'8px 14px 10px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:6, flexWrap:'wrap' }}>
                  {[['CSV','front, back'],['Quizlet','front\\tback'],['Anki','.txt export'],['Plain text','Nova extracts']].map(([fmt,hint])=>(
                    <div key={fmt} style={{ padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:600, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.3)' }}>
                      <span style={{ color:'rgba(255,255,255,0.5)' }}>{fmt}</span> · {hint}
                    </div>
                  ))}
                </div>

                {importError && <div style={{ padding:'6px 14px 8px', fontSize:11, color:'#f87171' }}>{importError}</div>}
              </div>
            ) : (
              <textarea
                value={topic}
                onChange={e=>setTopic(e.target.value)}
                onKeyDown={e=>{ if (e.key==='Enter'&&e.metaKey) generate() }}
                rows={5}
                placeholder={inputTab==='notes' ? 'Paste your lecture notes, textbook excerpt, or any text here — Nova will extract the key concepts...' : 'e.g. The causes and key events of World War I...'}
                style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'#e2e8f0', fontFamily:'inherit', fontSize:13, lineHeight:1.7, padding:'14px 16px', resize:'none', display:'block' }}
              />
            )}

            {/* Slider */}
            {inputTab !== 'import' && (
              <div style={{ padding:'10px 14px 12px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.28)', textTransform:'uppercase', letterSpacing:'.05em' }}>Cards to generate</span>
                  <span style={{ fontSize:16, fontWeight:800, color:'#60a5fa' }}>{count}</span>
                </div>
                <input type="range" min={5} max={40} step={1} value={count} onChange={e=>setCount(Number(e.target.value))} style={{ width:'100%', accentColor:'#3b82f6', display:'block' }}/>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,0.2)', marginTop:5 }}>
                  <span>5</span><span>20</span><span>40</span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ padding:'9px 14px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.18)' }}>Includes spaced repetition review</span>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.15)' }}>⌘↵ generate</span>
            </div>
          </div>

          {error && <div style={{ fontSize:12, color:'#f87171', marginTop:8 }}>{error}</div>}

          <button
            onClick={()=> inputTab==='import' ? handleImport() : generate()}
            disabled={loading||(inputTab==='import' ? !importText.trim() : !topic.trim())}
            style={{ width:'100%', padding:'13px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#2563eb,#4f46e5)', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', opacity:loading||(inputTab==='import'?!importText.trim():!topic.trim())?0.55:1, marginTop:11, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:9, letterSpacing:'-.01em', boxShadow:'0 4px 18px rgba(37,99,235,0.28)', transition:'all .15s' }}>
            {loading ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation:'_fcspin .7s linear infinite', flexShrink:0 }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                {inputTab==='import' ? 'Importing…' : 'Generating…'}
              </>
            ) : inputTab==='import' ? 'Import cards →' : 'Generate flashcards →'}
          </button>
        </div>

        {/* Right — preview panel, hidden on mobile */}
        {!isMobile && <div>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)', marginBottom:12 }}>What you'll get</div>

          {/* Card stack visual */}
          <div style={{ position:'relative', height:168, margin:'0 auto 14px', width:210 }}>
            <div style={{ position:'absolute', top:14, left:8, right:-8, height:132, background:'rgba(37,99,235,0.05)', border:'1px solid rgba(59,130,246,0.1)', borderRadius:11, transform:'rotate(3.5deg)' }}/>
            <div style={{ position:'absolute', top:7, left:4, right:-4, height:140, background:'rgba(37,99,235,0.07)', border:'1px solid rgba(59,130,246,0.14)', borderRadius:11, transform:'rotate(1.5deg)' }}/>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:150, background:'rgba(8,16,42,0.9)', border:'1.5px solid rgba(59,130,246,0.36)', borderRadius:11, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:18, gap:9, boxShadow:'0 6px 28px rgba(37,99,235,0.16)' }}>
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.09em', textTransform:'uppercase', padding:'3px 9px', borderRadius:20, background:'rgba(59,130,246,0.1)', color:'#60a5fa', border:'1px solid rgba(59,130,246,0.18)' }}>Question</div>
              <div style={{ fontSize:12, fontWeight:600, color:'#e2e8f0', textAlign:'center', lineHeight:1.5 }}>What was the primary cause of the First World War?</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.22)' }}>click to reveal answer</div>
            </div>
          </div>

          {/* Feature tiles */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7, marginBottom:10 }}>
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:9, padding:'9px 10px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.55)', marginBottom:3 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                Review queue
              </div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', lineHeight:1.5 }}>Cards resurface based on how well you know them</div>
            </div>
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:9, padding:'9px 10px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.55)', marginBottom:3 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit deck
              </div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', lineHeight:1.5 }}>Add, remove or reword any card after generating</div>
            </div>
          </div>

          {/* Nova weak-spot callout */}
          <div style={{ background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.13)', borderRadius:10, padding:'11px 13px' }}>
            <div style={{ fontSize:11, color:'rgba(96,165,250,0.65)', fontWeight:700, marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="#60a5fa"/></svg>
              Nova weak-spot detection
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.27)', lineHeight:1.6 }}>After your session, Nova identifies which cards you struggled with and offers to drill just those concepts.</div>
          </div>
        </div>}
      </div>
    </div>
  )

  // ── Render: session complete ────────────────────────────────────────────────

  if (sessionComplete) return (
    <SessionComplete
      cards={cards} topic={topic} hardCards={sessionHardCards} againCards={sessionAgainCards}
      sessionRatings={sessionRatings} onRestart={restartSession} onNewDeck={generateFocusedDeck}
      cardTheme={cardTheme}
    />
  )

  // ── Render: edit mode ───────────────────────────────────────────────────────

  if (showEdit) return (
    <div style={{ padding:'24px', maxWidth:640, margin:'0 auto', width:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <h2 style={{ fontSize:18, fontWeight:800, color:'var(--c-t1)' }}>Edit Deck <span style={{ fontSize:13, fontWeight:400, color:'var(--c-t3)' }}>({cards.length} cards)</span></h2>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={addCard} style={{ height:32, padding:'0 12px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>+ Add Card</button>
          <button onClick={()=>{setShowEdit(false);setEditIdx(null)}} style={{ height:32, padding:'0 12px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)', borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>Done</button>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {cards.map((c,i)=>(
          <div key={i} style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:12, padding:16 }}>
            {editIdx===i ? (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'.05em' }}>Question</div>
                <textarea value={editVals.front} onChange={e=>setEditVals(v=>({...v,front:e.target.value}))} rows={2} style={{ width:'100%', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:8, padding:'8px 10px', fontSize:13, color:'var(--c-t1)', outline:'none', resize:'none', fontFamily:'inherit' }}/>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'.05em' }}>Answer</div>
                <textarea value={editVals.back} onChange={e=>setEditVals(v=>({...v,back:e.target.value}))} rows={2} style={{ width:'100%', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:8, padding:'8px 10px', fontSize:13, color:'var(--c-t1)', outline:'none', resize:'none', fontFamily:'inherit' }}/>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={saveEdit} style={{ height:28, padding:'0 12px', background:'#2563eb', color:'#fff', border:'none', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Save</button>
                  <button onClick={()=>setEditIdx(null)} style={{ height:28, padding:'0 12px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)', borderRadius:7, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', marginTop:2, width:20, flexShrink:0 }}>{i+1}.</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'var(--c-t1)', marginBottom:3 }}>{c.front||c.question}</p>
                  <p style={{ fontSize:12, color:'var(--c-t2)' }}>{c.back||c.answer}</p>
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  <button onClick={()=>startEdit(i)} style={{ height:28, padding:'0 10px', fontSize:11, color:'var(--c-t2)', border:'1px solid var(--c-line)', borderRadius:7, background:'none', cursor:'pointer', fontFamily:'inherit' }}>Edit</button>
                  <button onClick={()=>deleteCard(i)} style={{ height:28, padding:'0 10px', fontSize:11, color:'#f87171', border:'1px solid rgba(239,68,68,0.25)', borderRadius:7, background:'none', cursor:'pointer', fontFamily:'inherit' }}>✕</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  if (!card) return null

  // ── Render: study session ───────────────────────────────────────────────────

  const progress      = Math.round((done/cards.length)*100)
  const cardFace      = flipped ? (card.back||card.answer) : (card.front||card.question)
  const cardBorder    = flipped ? 'rgba(99,102,241,0.45)' : 'rgba(59,130,246,0.35)'
  const badgeBg       = flipped ? 'rgba(99,102,241,0.1)'  : 'rgba(59,130,246,0.1)'
  const badgeColor    = flipped ? '#818cf8' : '#60a5fa'
  const badgeBorder   = flipped ? 'rgba(99,102,241,0.2)'  : 'rgba(59,130,246,0.18)'
  const remaining     = studyQueue.length

  const ratingBtns = (
    <div style={{ display:'flex', gap:8, marginTop:12, justifyContent:'center' }}>
      <button onClick={handleAgain} style={{ flex:1, maxWidth:110, padding:'10px 4px', borderRadius:10, border:'1px solid rgba(239,68,68,0.25)', background:'rgba(239,68,68,0.06)', color:'#f87171', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
        <div>Again</div><div style={{ fontSize:9, opacity:.7, marginTop:1 }}>→ end</div>
      </button>
      <button onClick={handleHard} style={{ flex:1, maxWidth:110, padding:'10px 4px', borderRadius:10, border:'1px solid rgba(245,158,11,0.25)', background:'rgba(245,158,11,0.06)', color:'#fbbf24', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
        <div>Hard</div><div style={{ fontSize:9, opacity:.7, marginTop:1 }}>→ later</div>
      </button>
      <button onClick={handleEasy} style={{ flex:1, maxWidth:110, padding:'10px 4px', borderRadius:10, border:'1px solid rgba(16,185,129,0.3)', background:'rgba(16,185,129,0.07)', color:'#34d399', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
        <div>Easy</div><div style={{ fontSize:9, opacity:.7, marginTop:1 }}>✓ done</div>
      </button>
    </div>
  )

  return (
    <>
      {/* Save modal */}
      {showSave && (
        <div style={{ position:'fixed', inset:0, zIndex:40, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.45)' }}>
          <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:18, padding:24, width:'100%', maxWidth:360, boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize:15, fontWeight:800, color:'var(--c-t1)', marginBottom:16 }}>Save Deck</div>
            <input value={saveTitle} onChange={e=>setSaveTitle(e.target.value)} placeholder={topic||'Deck title…'} style={{ width:'100%', height:36, background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:9, padding:'0 12px', fontSize:13, color:'var(--c-t1)', outline:'none', fontFamily:'inherit', marginBottom:14 }}/>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={doSave} disabled={saving} style={{ flex:1, height:36, background:'#2563eb', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:saving?.6:1 }}>{saving?'Saving…':'Save to My Stuff'}</button>
              <button onClick={()=>setShowSave(false)} style={{ height:36, padding:'0 16px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)', borderRadius:10, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop study view */}
      <div className="fc-desktop-wrap" style={{ display:'none' }}>
        {/* Left sidebar */}
        <div style={{ padding:'24px 20px', borderRight:'1px solid var(--c-line)', display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--c-t1)', marginBottom:2 }}>{topic||'Flashcards'}</div>
            <div style={{ fontSize:11, color:'var(--c-t3)' }}>{remaining} cards remaining</div>
          </div>
          <div>
            <div style={{ height:3, background:'var(--c-line)', borderRadius:2, overflow:'hidden', marginBottom:5 }}>
              <div style={{ height:'100%', width:progress+'%', background:'#3b82f6', borderRadius:2, transition:'width .3s' }}/>
            </div>
            <div style={{ fontSize:10, color:'var(--c-t3)' }}>{done} of {cards.length} done</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
            {[{label:'Done',val:done,color:'#34d399'},{label:'Left',val:remaining,color:'#60a5fa'},{label:'Again',val:sessionRatings.again,color:'#f87171'},{label:'Hard',val:sessionRatings.hard,color:'#fbbf24'}].map(s=>(
              <div key={s.label} style={{ background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:8, padding:'10px 11px' }}>
                <div style={{ fontSize:20, fontWeight:700, color:s.color, lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:10, color:'var(--c-t3)', marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {!savedId && <div style={{ padding:'8px 10px', background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.18)', borderRadius:8, fontSize:10, color:'#f59e0b', lineHeight:1.4 }}>Deck not saved yet</div>}
          <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', gap:6 }}>
            <button onClick={()=>{setShowEdit(true);setEditIdx(null)}} style={{ width:'100%', padding:'6px 0', borderRadius:7, fontSize:11, fontWeight:600, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t2)', cursor:'pointer', fontFamily:'inherit' }}>Edit Deck</button>
            <button onClick={()=>printDeck(cards,topic)} style={{ width:'100%', padding:'6px 0', borderRadius:7, fontSize:11, fontWeight:600, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t2)', cursor:'pointer', fontFamily:'inherit' }}>Print</button>
            <button onClick={()=>{ sessionStorage.setItem('flashfo_study_modes', JSON.stringify({cards,topic})); window.location.href='/study-modes' }} style={{ width:'100%', padding:'6px 0', borderRadius:7, fontSize:11, fontWeight:600, border:'1px solid rgba(99,102,241,0.3)', background:'rgba(99,102,241,0.08)', color:'#a5b4fc', cursor:'pointer', fontFamily:'inherit' }}>Study Modes</button>
            <button onClick={startFresh} style={{ width:'100%', padding:'6px 0', borderRadius:7, fontSize:11, fontWeight:600, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t2)', cursor:'pointer', fontFamily:'inherit' }}>New Deck</button>
          </div>
        </div>

        {/* Centre card */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'28px 36px' }}>
          {/* Queue dots */}
          <div style={{ display:'flex', gap:4, marginBottom:16, flexWrap:'wrap', justifyContent:'center', maxWidth:320 }}>
            {studyQueue.map((qi,pos)=>{
              const isHard  = sessionHardCards.some(c=>(c.front||c.question)===(cards[qi]?.front||cards[qi]?.question))
              const isAgain = sessionAgainCards.some(c=>(c.front||c.question)===(cards[qi]?.front||cards[qi]?.question))
              const color   = pos===0?'#3b82f6':isAgain?'#f87171':isHard?'#fbbf24':'rgba(255,255,255,0.14)'
              return <div key={pos} style={{ width:8, height:8, borderRadius:'50%', background:color, transform:pos===0?'scale(1.5)':'scale(1)', transition:'all .2s' }}/>
            })}
          </div>

          {/* Card stack */}
          <div style={{ position:'relative', width:'100%', maxWidth:440, height:230, marginBottom:22 }}>
            <div style={{ position:'absolute', top:12, left:12, right:-12, bottom:-12, background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:14 }}/>
            <div style={{ position:'absolute', top:6, left:6, right:-6, bottom:-6, background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:14 }}/>
            <div onClick={()=>{stopAudio();setFlipped(f=>!f)}} style={{ position:'absolute', inset:0, background:'var(--c-surface)', border:'1.5px solid '+cardBorder, borderRadius:14, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:28, cursor:'pointer', transition:'border-color .2s' }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', padding:'3px 10px', borderRadius:20, background:badgeBg, color:badgeColor, border:'1px solid '+badgeBorder, marginBottom:14 }}>{flipped?'Answer':'Question'}</div>
              <div style={{ fontSize:17, fontWeight:600, color:'var(--c-t1)', textAlign:'center', lineHeight:1.45 }}>{cardFace}</div>
              {!flipped && <div style={{ fontSize:11, color:'var(--c-t3)', marginTop:10 }}>Click or press Space to flip</div>}
              <div style={{ position:'absolute', bottom:12, right:14 }} onClick={e=>e.stopPropagation()}><SpeakerBtn text={cardFace} audioRef={audioRef}/></div>
            </div>
          </div>

          {flipped
            ? <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, width:'100%', maxWidth:440 }}>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <button onClick={handleAgain} style={{ padding:'8px 18px', borderRadius:9, fontSize:11, fontWeight:700, border:'1px solid rgba(239,68,68,0.25)', background:'rgba(239,68,68,0.06)', color:'#f87171', cursor:'pointer', fontFamily:'inherit' }}>Again<br/><span style={{fontSize:9,opacity:.7}}>→ end</span></button>
                  <button onClick={handleHard}  style={{ padding:'8px 18px', borderRadius:9, fontSize:11, fontWeight:700, border:'1px solid rgba(245,158,11,0.25)', background:'rgba(245,158,11,0.06)', color:'#fbbf24', cursor:'pointer', fontFamily:'inherit' }}>Hard<br/><span style={{fontSize:9,opacity:.7}}>→ later</span></button>
                  <button onClick={handleEasy}  style={{ padding:'8px 18px', borderRadius:9, fontSize:11, fontWeight:700, border:'1px solid rgba(16,185,129,0.3)', background:'rgba(16,185,129,0.07)', color:'#34d399', cursor:'pointer', fontFamily:'inherit' }}>Easy<br/><span style={{fontSize:9,opacity:.7}}>✓ done</span></button>
                </div>
                {/* Nova explain differently */}
                <NovaExplainPanel card={card} explainStyle={explainStyle} novaExplain={novaExplain} explaining={explaining} onExplain={explainDifferently}/>
              </div>
            : <p style={{ fontSize:12, color:'var(--c-t3)', margin:'0 0 10px' }}>Click or press Space to flip · then rate</p>
          }
        </div>

        {/* Right sidebar — shortcuts + actions */}
        <div style={{ padding:'24px 20px', borderLeft:'1px solid var(--c-line)' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:14 }}>Shortcuts</div>
          <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:24 }}>
            {[['Space','Flip card'],['1','Again → end'],['2','Hard → later'],['3','Easy → done']].map(([k,v])=>(
              <div key={k}>
                <span style={{ background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:5, padding:'2px 8px', fontSize:11, fontWeight:600, color:'var(--c-t2)', display:'inline-block', fontFamily:'monospace' }}>{k}</span>
                <span style={{ fontSize:10, color:'var(--c-t3)', display:'block', marginTop:3 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>Actions</div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {user && <button onClick={()=>{setSaveTitle(topic);setShowSave(true)}} style={{ padding:'7px 10px', borderRadius:7, fontSize:11, fontWeight:600, border:'1px solid rgba(52,211,153,0.22)', background:'rgba(16,185,129,0.06)', color:'#34d399', cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>{savedId?'Update save':'Save to My Stuff'}</button>}
            {saveFeedback && <span style={{ fontSize:10, color:'#34d399', fontWeight:500 }}>{saveFeedback}</span>}
            {savedId && user && <PublishToggle deckId={savedId}/>}
            <button onClick={()=>{shareLink(cards,topic);setCopied(true);setTimeout(()=>setCopied(false),2000)}} style={{ padding:'7px 10px', borderRadius:7, fontSize:11, fontWeight:600, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:copied?'#34d399':'var(--c-t2)', cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>{copied?'Link copied!':'Share deck'}</button>
            <button onClick={restartSession} style={{ padding:'7px 10px', borderRadius:7, fontSize:11, fontWeight:600, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t2)', cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>↺ Restart session</button>
          </div>
        </div>
      </div>

      {/* Mobile study view */}
      <div className="fc-mobile-wrap" style={{ padding:'20px', maxWidth:560, margin:'0 auto' }}>
        {draftBanner && (
          <div style={{ background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:10, padding:'8px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:11, color:'rgba(241,240,255,0.55)', flex:1 }}>Resuming your last deck</span>
            <button onClick={startFresh} style={{ fontSize:10, color:'rgba(241,240,255,0.3)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Start fresh</button>
          </div>
        )}
        {!savedId && (
          <div style={{ marginBottom:14, padding:'10px 14px', background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.22)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:12, color:'#f59e0b', fontWeight:600 }}>Deck not saved yet</span>
            <button onClick={()=>{setSaveTitle(topic);setShowSave(true)}} style={{ height:28, padding:'0 12px', background:'#d97706', color:'#fff', border:'none', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Save</button>
          </div>
        )}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <h1 style={{ fontSize:18, fontWeight:800, color:'var(--c-t1)', letterSpacing:'-.02em' }}>Flashcards</h1>
            <p style={{ fontSize:12, color:'var(--c-t2)' }}>{cards.length} cards · {done} done · {remaining} left</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {user && <button onClick={()=>{setSaveTitle(topic);setShowSave(true)}} style={{ height:30, padding:'0 10px', background:'#059669', color:'#fff', border:'none', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>{savedId?'Update':'Save'}</button>}
            <button onClick={()=>printDeck(cards,topic)} style={{ height:30, padding:'0 10px', fontSize:11, color:'var(--c-t2)', border:'1px solid var(--c-line)', borderRadius:7, background:'none', cursor:'pointer', fontFamily:'inherit' }}>Print</button>
            <button onClick={()=>{setShowEdit(true);setEditIdx(null)}} style={{ height:30, padding:'0 10px', fontSize:11, color:'var(--c-t2)', border:'1px solid var(--c-line)', borderRadius:7, background:'none', cursor:'pointer', fontFamily:'inherit' }}>Edit</button>
            <button onClick={startFresh} style={{ fontSize:12, color:'#60a5fa', fontWeight:600, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>New</button>
          </div>
        </div>
        <div style={{ width:'100%', height:3, background:'var(--c-line)', borderRadius:2, marginBottom:14, overflow:'hidden' }}>
          <div style={{ height:'100%', width:progress+'%', background:'#3b82f6', borderRadius:2, transition:'width .3s' }}/>
        </div>
        <div style={{ display:'flex', gap:4, marginBottom:14, flexWrap:'wrap' }}>
          {studyQueue.map((qi,pos)=>{
            const isHard  = sessionHardCards.some(c=>(c.front||c.question)===(cards[qi]?.front||cards[qi]?.question))
            const isAgain = sessionAgainCards.some(c=>(c.front||c.question)===(cards[qi]?.front||cards[qi]?.question))
            const col     = pos===0?'#3b82f6':isAgain?'#f87171':isHard?'#fbbf24':'rgba(255,255,255,0.14)'
            return <div key={pos} style={{ width:8, height:8, borderRadius:'50%', background:col, transform:pos===0?'scale(1.4)':'scale(1)', transition:'all .2s' }}/>
          })}
        </div>
        <div onClick={()=>{stopAudio();setFlipped(f=>!f)}} style={{ background:'var(--c-surface)', border:'1.5px solid '+cardBorder, borderRadius:16, padding:32, textAlign:'center', cursor:'pointer', minHeight:200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, position:'relative', transition:'border-color .2s' }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', padding:'3px 10px', borderRadius:20, background:badgeBg, color:badgeColor, border:'1px solid '+badgeBorder }}>{flipped?'Answer':'Question'}</div>
          <div style={{ fontSize:16, fontWeight:600, color:'var(--c-t1)', lineHeight:1.5, maxWidth:320 }}>{cardFace}</div>
          {!flipped && <div style={{ fontSize:11, color:'var(--c-t3)' }}>Tap to reveal answer</div>}
          <div style={{ position:'absolute', bottom:12, right:14 }} onClick={e=>e.stopPropagation()}><SpeakerBtn text={cardFace} audioRef={audioRef}/></div>
        </div>
        {flipped ? (
          <>
            {ratingBtns}
            <NovaExplainPanel card={card} explainStyle={explainStyle} novaExplain={novaExplain} explaining={explaining} onExplain={explainDifferently}/>
          </>
        ) : <div style={{ textAlign:'center', padding:'12px 0', fontSize:12, color:'var(--c-t3)' }}>Rate this card after revealing the answer</div>}
      </div>
    </>
  )
}

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh' }}/>}>
      <FlashcardsPageInner/>
    </Suspense>
  )
}
