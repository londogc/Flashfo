'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { useIsMobile } from '@/hooks/useIsMobile'

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(ts) {
  if (!ts) return ''
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60)  return 'just now'
  if (s < 3600) return Math.floor(s/60) + 'm ago'
  if (s < 86400) return Math.floor(s/3600) + 'h ago'
  return Math.floor(s/86400) + 'd ago'
}

const ACTION_META = {
  added_card:   { label:'Added',   color:'#34d399' },
  deleted_card: { label:'Deleted', color:'#f87171' },
  edited_card:  { label:'Edited',  color:'#60a5fa' },
  created_deck: { label:'Created', color:'#a78bfa' },
}

// ── Card component ──────────────────────────────────────────────────────────────

function CollabCard({ card, userId, onDelete, flipped, onFlip }) {
  return (
    <div
      onClick={onFlip}
      style={{
        background: flipped ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${flipped ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.09)'}`,
        borderRadius:14,
        padding:'18px 20px',
        cursor:'pointer',
        transition:'all .15s',
        position:'relative',
        minHeight:100,
        display:'flex',
        flexDirection:'column',
        gap:8,
      }}>

      {/* Card number badge */}
      <div style={{ position:'absolute', top:12, left:14, fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.18)', letterSpacing:'.06em', textTransform:'uppercase' }}>
        {flipped ? 'Answer' : 'Question'}
      </div>

      {/* Delete button — own cards only */}
      {card.added_by === userId && (
        <button
          onClick={e=>{ e.stopPropagation(); onDelete(card) }}
          style={{ position:'absolute', top:10, right:12, width:22, height:22, borderRadius:6, border:'none', background:'transparent', color:'rgba(255,255,255,0.2)', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}
          onMouseEnter={e=>e.currentTarget.style.color='#f87171'}
          onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.2)'}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      )}

      {/* Card content */}
      <div style={{ marginTop:16, fontSize:14, fontWeight:600, color:'var(--c-t1)', lineHeight:1.5 }}>
        {flipped ? card.back : card.front}
      </div>

      {/* Flip hint */}
      <div style={{ marginTop:'auto', fontSize:10, color:'rgba(255,255,255,0.2)' }}>
        {flipped ? 'Click to see question' : 'Click to flip'}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CollabDecksPage() {
  const { user, profile } = useAuth()
  const isMobile = useIsMobile()

  const [decks,        setDecks]        = useState([])
  const [selected,     setSelected]     = useState(null)
  const [cards,        setCards]        = useState([])
  const [history,      setHistory]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showHistory,  setShowHistory]  = useState(false)
  const [flippedCards, setFlippedCards] = useState({})   // cardId → bool

  // Add card form
  const [front,     setFront]     = useState('')
  const [back,      setBack]      = useState('')
  const [adding,    setAdding]    = useState(false)

  // New deck creation
  const [creating,  setCreating]  = useState(false)
  const [deckName,  setDeckName]  = useState('')
  const [deckSubj,  setDeckSubj]  = useState('')

  // Study mode
  const [studying,  setStudying]  = useState(false)
  const [studyIdx,  setStudyIdx]  = useState(0)
  const [studyFlip, setStudyFlip] = useState(false)

  const channelRef = useRef(null)
  const addFrontRef = useRef(null)
  const tabsRef = useRef(null)

  // ── Load ──────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (user) loadDecks()
  }, [user])

  useEffect(() => {
    if (!selected) return
    loadCards(selected.id)
    loadHistory(selected.id)
    setFlippedCards({})

    // Realtime subscription
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const ch = supabase
      .channel('collab-' + selected.id)
      .on('postgres_changes', { event:'*', schema:'public', table:'collab_cards', filter:'deck_id=eq.'+selected.id },
        () => { loadCards(selected.id); loadHistory(selected.id) })
      .subscribe()
    channelRef.current = ch
    return () => supabase.removeChannel(ch)
  }, [selected])

  async function loadDecks() {
    setLoading(true)
    const { data } = await supabase.from('collab_decks').select('*').order('created_at', { ascending:false })
    setDecks(data || [])
    if (data?.length > 0 && !selected) setSelected(data[0])
    setLoading(false)
  }

  async function loadCards(deckId) {
    const { data } = await supabase.from('collab_cards').select('*').eq('deck_id', deckId).order('created_at', { ascending:true })
    setCards(data || [])
  }

  async function loadHistory(deckId) {
    const { data } = await supabase.from('collab_edit_history').select('*, profiles(full_name, email)').eq('deck_id', deckId).order('created_at', { ascending:false }).limit(40)
    setHistory(data || [])
  }

  // ── Actions ───────────────────────────────────────────────────────────────────

  async function createDeck() {
    if (!deckName.trim()) return
    const { data } = await supabase.from('collab_decks').insert({ name:deckName.trim(), created_by:user.id, subject:deckSubj.trim() }).select().single()
    if (data) {
      setDecks(prev => [data, ...prev])
      setSelected(data)
      setDeckName(''); setDeckSubj(''); setCreating(false)
      await supabase.from('collab_edit_history').insert({ deck_id:data.id, user_id:user.id, action:'created_deck', detail:data.name })
    }
  }

  async function addCard() {
    if (!front.trim() || !back.trim() || !selected) return
    setAdding(true)
    await supabase.from('collab_cards').insert({ deck_id:selected.id, front:front.trim(), back:back.trim(), added_by:user.id })
    await supabase.from('collab_edit_history').insert({ deck_id:selected.id, user_id:user.id, action:'added_card', detail:front.trim().slice(0,60) })
    setFront(''); setBack('')
    addFrontRef.current?.focus()
    setAdding(false)
  }

  async function deleteCard(card) {
    await supabase.from('collab_cards').delete().eq('id', card.id)
    await supabase.from('collab_edit_history').insert({ deck_id:selected.id, user_id:user.id, action:'deleted_card', detail:card.front.slice(0,60) })
  }

  function toggleFlip(cardId) {
    setFlippedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }))
  }

  // ── Study mode ────────────────────────────────────────────────────────────────

  function startStudy() {
    if (!cards.length) return
    setStudying(true); setStudyIdx(0); setStudyFlip(false)
  }

  function studyNext() {
    if (studyIdx + 1 >= cards.length) { setStudying(false); return }
    setStudyIdx(i => i+1); setStudyFlip(false)
  }

  function studyPrev() {
    if (studyIdx === 0) return
    setStudyIdx(i => i-1); setStudyFlip(false)
  }

  if (!user) return null

  // ── Study mode overlay ────────────────────────────────────────────────────────

  if (studying && cards.length > 0) {
    const sc = cards[studyIdx]
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(4,3,12,0.97)', zIndex:50, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
        <div style={{ position:'absolute', top:20, left:20, fontSize:13, color:'rgba(255,255,255,0.4)', fontWeight:600 }}>{studyIdx+1} / {cards.length}</div>
        <button onClick={()=>setStudying(false)} style={{ position:'absolute', top:20, right:20, background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:20, cursor:'pointer' }}>✕</button>

        <div style={{ width:'100%', maxWidth:500, marginBottom:24 }}>
          <div style={{ height:3, background:'rgba(255,255,255,0.1)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${((studyIdx+1)/cards.length)*100}%`, background:'#6366f1', borderRadius:2, transition:'width .3s' }}/>
          </div>
        </div>

        <div onClick={()=>setStudyFlip(f=>!f)} style={{ width:'100%', maxWidth:500, minHeight:200, background:studyFlip?'rgba(99,102,241,0.12)':'rgba(255,255,255,0.05)', border:`1.5px solid ${studyFlip?'rgba(99,102,241,0.4)':'rgba(255,255,255,0.1)'}`, borderRadius:18, padding:'40px 32px', cursor:'pointer', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, transition:'all .2s', marginBottom:28 }}>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:'.08em', textTransform:'uppercase', color:studyFlip?'#818cf8':'rgba(255,255,255,0.3)', marginBottom:8 }}>{studyFlip?'Answer':'Question'}</div>
          <div style={{ fontSize:20, fontWeight:700, color:'var(--c-t1)', lineHeight:1.4 }}>{studyFlip ? sc.back : sc.front}</div>
          {!studyFlip && <div style={{ fontSize:12, color:'rgba(255,255,255,0.25)', marginTop:8 }}>Click to reveal answer</div>}
        </div>

        <div style={{ display:'flex', gap:12 }}>
          <button onClick={studyPrev} disabled={studyIdx===0} style={{ height:40, padding:'0 20px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.5)', fontSize:13, fontWeight:600, cursor:studyIdx===0?'not-allowed':'pointer', opacity:studyIdx===0?.3:1, fontFamily:'inherit' }}>← Prev</button>
          <button onClick={studyNext} style={{ height:40, padding:'0 24px', borderRadius:10, border:'none', background:'#6366f1', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>{studyIdx+1>=cards.length?'Finish':'Next →'}</button>
        </div>
      </div>
    )
  }

  const colCount = isMobile ? 1 : 3

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", overflow:'hidden' }}>

      {/* ── Tab bar ── */}
      <div style={{ flexShrink:0, borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.015)' }}>

        {/* Tabs scroll row */}
        <div ref={tabsRef} style={{ display:'flex', alignItems:'stretch', overflowX:'auto', scrollbarWidth:'none', gap:0, paddingLeft:16 }}>

          {loading ? (
            <div style={{ display:'flex', alignItems:'center', height:44, padding:'0 16px', fontSize:13, color:'rgba(255,255,255,0.3)' }}>Loading…</div>
          ) : (
            decks.map(d => (
              <button key={d.id} onClick={()=>{ setSelected(d); setStudying(false) }}
                style={{ height:44, padding:'0 18px', border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight: selected?.id===d.id ? 700 : 400, color: selected?.id===d.id ? '#e2e8f0' : 'rgba(255,255,255,0.38)', borderBottom: selected?.id===d.id ? '2px solid #6366f1' : '2px solid transparent', transition:'all .15s', whiteSpace:'nowrap', flexShrink:0 }}>
                {d.name}
                {d.subject && <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)', marginLeft:6 }}>{d.subject}</span>}
              </button>
            ))
          )}

          {/* New deck tab */}
          {!creating && (
            <button onClick={()=>setCreating(true)}
              style={{ height:44, padding:'0 16px', border:'none', background:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', fontSize:18, fontFamily:'inherit', flexShrink:0, display:'flex', alignItems:'center', transition:'color .15s' }}
              onMouseEnter={e=>e.currentTarget.style.color='#6366f1'}
              onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.3)'}>
              +
            </button>
          )}
        </div>

        {/* New deck form — appears below tabs */}
        {creating && (
          <div style={{ padding:'12px 16px 14px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <input value={deckName} onChange={e=>setDeckName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createDeck()} placeholder="Deck name…" autoFocus
              style={{ height:34, padding:'0 12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, fontSize:13, color:'#e2e8f0', outline:'none', fontFamily:'inherit', width:200 }}/>
            <input value={deckSubj} onChange={e=>setDeckSubj(e.target.value)} placeholder="Subject (optional)"
              style={{ height:34, padding:'0 12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, fontSize:13, color:'#e2e8f0', outline:'none', fontFamily:'inherit', width:160 }}/>
            <button onClick={createDeck} disabled={!deckName.trim()} style={{ height:34, padding:'0 16px', background:'#6366f1', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:deckName.trim()?1:.4 }}>Create deck</button>
            <button onClick={()=>{ setCreating(false); setDeckName(''); setDeckSubj('') }} style={{ height:34, padding:'0 12px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'rgba(255,255,255,0.4)', borderRadius:8, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          </div>
        )}
      </div>

      {/* ── Content area ── */}
      {!selected ? (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14, color:'rgba(255,255,255,0.25)' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
          <div style={{ fontSize:14 }}>Create your first deck using the + tab above</div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Deck toolbar */}
          <div style={{ flexShrink:0, padding:'14px 20px 12px', display:'flex', alignItems:'center', gap:12, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <span style={{ fontSize:15, fontWeight:700, color:'var(--c-t1)' }}>{selected.name}</span>
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginLeft:10 }}>{cards.length} card{cards.length!==1?'s':''}</span>
            </div>
            <div style={{ display:'flex', gap:8, flexShrink:0 }}>
              {cards.length > 0 && (
                <button onClick={startStudy}
                  style={{ height:32, padding:'0 14px', borderRadius:8, border:'1px solid rgba(99,102,241,0.35)', background:'rgba(99,102,241,0.1)', color:'#a5b4fc', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                  Study
                </button>
              )}
              <button onClick={()=>setShowHistory(h=>!h)}
                style={{ height:32, padding:'0 14px', borderRadius:8, border:`1px solid ${showHistory?'rgba(167,139,250,0.35)':'rgba(255,255,255,0.09)'}`, background:showHistory?'rgba(167,139,250,0.1)':'rgba(255,255,255,0.04)', color:showHistory?'#a78bfa':'rgba(255,255,255,0.5)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Activity {history.length>0?`(${history.length})`:''}
              </button>
            </div>
          </div>

          {/* Main scrollable area */}
          <div style={{ flex:1, overflowY:'auto', padding:'20px 20px 0' }}>

            {/* Add card form */}
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:12 }}>Add a card</div>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12, marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5 }}>Question / Term</div>
                  <textarea ref={addFrontRef} value={front} onChange={e=>setFront(e.target.value)} placeholder="e.g. What is photosynthesis?" rows={2}
                    style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'9px 12px', fontSize:13, color:'#e2e8f0', outline:'none', resize:'none', fontFamily:'inherit', lineHeight:1.5 }}/>
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5 }}>Answer / Definition</div>
                  <textarea value={back} onChange={e=>setBack(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&e.metaKey) addCard() }} placeholder="e.g. The process by which plants convert sunlight into energy…" rows={2}
                    style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'9px 12px', fontSize:13, color:'#e2e8f0', outline:'none', resize:'none', fontFamily:'inherit', lineHeight:1.5 }}/>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.2)' }}>⌘↵ to add</span>
                <button onClick={addCard} disabled={adding||!front.trim()||!back.trim()}
                  style={{ height:32, padding:'0 18px', background:'linear-gradient(135deg,#4f46e5,#6366f1)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:adding||!front.trim()||!back.trim()?.4:1, display:'flex', alignItems:'center', gap:6 }}>
                  {adding ? (
                    <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation:'_fcspin .7s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Adding…</>
                  ) : '+ Add card'}
                </button>
              </div>
            </div>

            {/* Cards grid */}
            {cards.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 0 40px', color:'rgba(255,255,255,0.2)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" style={{ margin:'0 auto 12px', display:'block' }}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                <div style={{ fontSize:14 }}>No cards yet — add the first one above</div>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:`repeat(${colCount},1fr)`, gap:12, marginBottom:20 }}>
                {cards.map(c => (
                  <CollabCard key={c.id} card={c} userId={user.id} onDelete={deleteCard} flipped={!!flippedCards[c.id]} onFlip={()=>toggleFlip(c.id)}/>
                ))}
              </div>
            )}

            {/* Activity feed — expandable at bottom */}
            {showHistory && (
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'18px 20px', marginBottom:24 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Activity
                </div>
                {history.length === 0 ? (
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.25)', textAlign:'center', padding:'20px 0' }}>No activity yet</div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {history.map((h,i) => {
                      const meta = ACTION_META[h.action] || { label:h.action, color:'#a78bfa' }
                      const name = h.profiles?.full_name || h.profiles?.email || 'Someone'
                      const initial = name[0].toUpperCase()
                      return (
                        <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                          <div style={{ width:28, height:28, borderRadius:'50%', background:`${meta.color}18`, border:`1px solid ${meta.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:meta.color, flexShrink:0 }}>{initial}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                              <span style={{ fontSize:12, fontWeight:600, color:'var(--c-t1)' }}>{name}</span>
                              <span style={{ fontSize:11, fontWeight:700, color:meta.color }}>{meta.label}</span>
                              {h.detail && <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>"{h.detail}"</span>}
                            </div>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,0.2)', marginTop:2 }}>{timeAgo(h.created_at)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes _fcspin { to { transform: rotate(360deg); } }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
