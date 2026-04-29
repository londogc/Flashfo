'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

export default function CollabDecksPage() {
  const { user } = useAuth()
  const [decks, setDecks] = useState([])
  const [activeDeck, setActiveDeck] = useState(null)
  const [cards, setCards] = useState([])
  const [newCard, setNewCard] = useState({ question:'', answer:'' })
  const [newDeck, setNewDeck] = useState({ name:'', subject:'' })
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadDecks()
  }, [user])

  const loadDecks = async () => {
    setLoading(true)
    const { data } = await supabase.from('collaborative_decks').select('*, owner:owner_id(email)').order('created_at', { ascending: false })
    setDecks(data || [])
    setLoading(false)
  }

  const loadCards = async (deck) => {
    setActiveDeck(deck)
    const { data } = await supabase.from('collaborative_deck_cards').select('*, added_by_user:added_by(email)').eq('deck_id', deck.id).order('created_at')
    setCards(data || [])
    // Subscribe to real-time additions
    supabase.channel('deck_'+deck.id)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'collaborative_deck_cards', filter:'deck_id=eq.'+deck.id },
        payload => setCards(prev => [...prev, payload.new]))
      .subscribe()
  }

  const createDeck = async () => {
    if (!newDeck.name.trim()) return
    const { data } = await supabase.from('collaborative_decks').insert({ name:newDeck.name, subject:newDeck.subject, owner_id:user.id }).select().single()
    if (data) { setDecks(prev=>[data,...prev]); setNewDeck({name:'',subject:''}); setShowCreate(false) }
  }

  const addCard = async () => {
    if (!newCard.question.trim() || !newCard.answer.trim() || !activeDeck) return
    await supabase.from('collaborative_deck_cards').insert({ deck_id:activeDeck.id, added_by:user.id, question:newCard.question, answer:newCard.answer })
    setNewCard({ question:'', answer:'' })
  }

  const deleteCard = async (id) => {
    await supabase.from('collaborative_deck_cards').delete().eq('id', id).eq('added_by', user.id)
    setCards(prev=>prev.filter(c=>c.id!==id))
  }

  return (
    <div style={{ maxWidth:800, margin:'0 auto', padding:'0 16px 40px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'var(--c-t1)', margin:'0 0 4px' }}>Collaborative Decks</h1>
          <p style={{ color:'var(--c-t2)', fontSize:13, margin:0 }}>Shared flashcard sets — anyone in the class can add cards in real time.</p>
        </div>
        <button onClick={()=>setShowCreate(v=>!v)} style={{ padding:'8px 16px', borderRadius:8, background:'#2563eb', color:'#fff', border:'none', fontWeight:600, fontSize:13, cursor:'pointer' }}>+ New Deck</button>
      </div>

      {showCreate && (
        <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:12, padding:20, marginBottom:20 }}>
          <input value={newDeck.name} onChange={e=>setNewDeck(d=>({...d,name:e.target.value}))} placeholder="Deck name e.g. Bio Chapter 3"
            style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t1)', fontSize:13, marginBottom:8, boxSizing:'border-box' }}/>
          <input value={newDeck.subject} onChange={e=>setNewDeck(d=>({...d,subject:e.target.value}))} placeholder="Subject (optional)"
            style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t1)', fontSize:13, marginBottom:12, boxSizing:'border-box' }}/>
          <button onClick={createDeck} style={{ padding:'8px 18px', borderRadius:8, background:'#34d399', color:'#0d1117', border:'none', fontWeight:600, fontSize:13, cursor:'pointer' }}>Create Deck</button>
        </div>
      )}

      {activeDeck ? (
        <div>
          <button onClick={()=>setActiveDeck(null)} style={{ background:'none', border:'none', color:'var(--c-t2)', cursor:'pointer', fontSize:13, marginBottom:16, display:'flex', alignItems:'center', gap:4 }}>← Back to decks</button>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div>
              <h2 style={{ margin:'0 0 2px', fontSize:17, fontWeight:700, color:'var(--c-t1)' }}>{activeDeck.name}</h2>
              {activeDeck.subject && <span style={{ fontSize:12, color:'#a78bfa' }}>{activeDeck.subject}</span>}
            </div>
            <span style={{ fontSize:12, color:'var(--c-t3)', background:'var(--c-surface2)', padding:'4px 10px', borderRadius:20, border:'1px solid var(--c-line)' }}>🟢 Live</span>
          </div>

          {/* Add card */}
          <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:10, padding:16, marginBottom:20 }}>
            <p style={{ margin:'0 0 10px', fontSize:12, fontWeight:600, color:'var(--c-t3)', letterSpacing:'0.06em' }}>ADD A CARD</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
              <input value={newCard.question} onChange={e=>setNewCard(c=>({...c,question:e.target.value}))} placeholder="Question"
                style={{ padding:'8px 10px', borderRadius:8, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t1)', fontSize:13 }}/>
              <input value={newCard.answer} onChange={e=>setNewCard(c=>({...c,answer:e.target.value}))} placeholder="Answer"
                onKeyDown={e=>e.key==='Enter'&&addCard()}
                style={{ padding:'8px 10px', borderRadius:8, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t1)', fontSize:13 }}/>
            </div>
            <button onClick={addCard} style={{ padding:'7px 16px', borderRadius:8, background:'#2563eb', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer' }}>Add card</button>
          </div>

          {/* Cards list */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {cards.length === 0 && <p style={{ color:'var(--c-t3)', fontSize:13, textAlign:'center', padding:24 }}>No cards yet — be the first to add one!</p>}
            {cards.map(c=>(
              <div key={c.id} style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:10, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                <div style={{ flex:1 }}>
                  <p style={{ margin:'0 0 4px', fontSize:13, color:'var(--c-t1)', fontWeight:500 }}>{c.question}</p>
                  <p style={{ margin:0, fontSize:13, color:'#34d399' }}>{c.answer}</p>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                  {c.added_by_user?.email && <span style={{ fontSize:10, color:'var(--c-t3)' }}>{c.added_by_user.email.split('@')[0]}</span>}
                  {c.added_by === user?.id && <button onClick={()=>deleteCard(c.id)} style={{ background:'none', border:'none', color:'var(--c-t3)', cursor:'pointer', fontSize:14, padding:2 }}>×</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display:'grid', gap:12 }}>
          {loading && [1,2,3].map(i=><div key={i} style={{ height:72, borderRadius:10, background:'var(--c-surface2)' }} className="skeleton"/>)}
          {!loading && decks.length === 0 && <p style={{ color:'var(--c-t3)', textAlign:'center', padding:32 }}>No shared decks yet. Create one to get started.</p>}
          {decks.map(deck=>(
            <div key={deck.id} onClick={()=>loadCards(deck)}
              style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:10, padding:'14px 18px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', transition:'border-color 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='#2563eb'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--c-line)'}>
              <div>
                <p style={{ margin:'0 0 2px', fontSize:14, fontWeight:600, color:'var(--c-t1)' }}>{deck.name}</p>
                {deck.subject && <span style={{ fontSize:12, color:'var(--c-t3)' }}>{deck.subject}</span>}
              </div>
              <span style={{ fontSize:12, color:'var(--c-t3)' }}>Open →</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
