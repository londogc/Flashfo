'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

export default function CollabDecks() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [decks, setDecks] = useState([])
  const [selected, setSelected] = useState(null)
  const [cards, setCards] = useState([])
  const [history, setHistory] = useState([])
  const [newCard, setNewCard] = useState({ front: '', back: '' })
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deckName, setDeckName] = useState('')
  const channelRef = useRef(null)

  useEffect(() => {
    if (!user) { router.push('/auth'); return }
    loadDecks()
  }, [user])

  useEffect(() => {
    if (!selected) return
    loadCards(selected.id)
    loadHistory(selected.id)
    // Subscribe to realtime changes
    const channel = supabase
      .channel('collab-deck-' + selected.id)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'collab_cards',
        filter: 'deck_id=eq.' + selected.id
      }, () => {
        loadCards(selected.id)
        loadHistory(selected.id)
      })
      .subscribe()
    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [selected])

  async function loadDecks() {
    const { data } = await supabase
      .from('collab_decks')
      .select('*')
      .order('created_at', { ascending: false })
    setDecks(data || [])
    if (data?.length > 0) setSelected(data[0])
    setLoading(false)
  }

  async function loadCards(deckId) {
    const { data } = await supabase
      .from('collab_cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: true })
    setCards(data || [])
  }

  async function loadHistory(deckId) {
    const { data } = await supabase
      .from('collab_edit_history')
      .select('*, profiles(full_name, email)')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: false })
      .limit(30)
    setHistory(data || [])
  }

  async function createDeck() {
    if (!deckName.trim()) return
    const { data } = await supabase.from('collab_decks').insert({
      name: deckName.trim(), created_by: user.id, subject: ''
    }).select().single()
    if (data) { setDecks(prev => [data, ...prev]); setSelected(data); setDeckName(''); setCreating(false) }
  }

  async function addCard() {
    if (!newCard.front.trim() || !newCard.back.trim() || !selected) return
    await supabase.from('collab_cards').insert({
      deck_id: selected.id, front: newCard.front.trim(), back: newCard.back.trim(), added_by: user.id
    })
    // Log to edit history
    await supabase.from('collab_edit_history').insert({
      deck_id: selected.id, user_id: user.id,
      action: 'added_card', detail: newCard.front.trim().slice(0, 60)
    })
    setNewCard({ front: '', back: '' })
  }

  async function deleteCard(card) {
    await supabase.from('collab_cards').delete().eq('id', card.id)
    await supabase.from('collab_edit_history').insert({
      deck_id: selected.id, user_id: user.id,
      action: 'deleted_card', detail: card.front.slice(0, 60)
    })
  }

  const actionLabel = { added_card: '+ Added', deleted_card: '✕ Deleted', edited_card: '✎ Edited', created_deck: '✦ Created' }

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* Sidebar — deck list */}
      <div style={{ width: 280, borderRight: '1px solid var(--c-line)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-t2)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Collab Decks</span>
          <button onClick={() => setCreating(true)} style={{ width: 28, height: 28, borderRadius: 7, background: '#2563eb', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
        </div>
        {creating && (
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <input value={deckName} onChange={e => setDeckName(e.target.value)} placeholder="Deck name..." onKeyDown={e => e.key === 'Enter' && createDeck()}
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--c-t1)', marginBottom: 8 }} autoFocus/>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={createDeck} style={{ flex: 1, padding: '6px 0', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Create</button>
              <button onClick={() => setCreating(false)} style={{ flex: 1, padding: '6px 0', background: 'var(--c-surface2)', color: 'var(--c-t2)', border: '1px solid var(--c-line)', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
        {loading ? <div style={{ color: 'var(--c-t3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>Loading...</div>
          : decks.length === 0 ? <div style={{ color: 'var(--c-t3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No decks yet. Create one!</div>
          : decks.map(d => (
            <button key={d.id} onClick={() => setSelected(d)}
              style={{ padding: '10px 14px', borderRadius: 10, background: selected?.id === d.id ? 'rgba(37,99,235,.1)' : 'transparent', border: selected?.id === d.id ? '1px solid rgba(37,99,235,.3)' : '1px solid transparent', textAlign: 'left', cursor: 'pointer', color: selected?.id === d.id ? '#3b82f6' : 'var(--c-t1)', fontSize: 14, fontWeight: selected?.id === d.id ? 600 : 400 }}>
              {d.name}
              <div style={{ fontSize: 11, color: 'var(--c-t3)', marginTop: 2 }}>{d.card_count || 0} cards</div>
            </button>
          ))
        }
      </div>

      {/* Main area */}
      {selected ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Deck header */}
          <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--c-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-t1)', marginBottom: 2 }}>{selected.name}</h2>
              <div style={{ fontSize: 13, color: 'var(--c-t2)' }}>{cards.length} cards</div>
            </div>
            <button onClick={() => setShowHistory(!showHistory)}
              style={{ padding: '8px 16px', background: showHistory ? 'rgba(167,139,250,.1)' : 'var(--c-surface)', border: `1px solid ${showHistory ? 'rgba(167,139,250,.3)' : 'var(--c-line)'}`, borderRadius: 9, fontSize: 13, color: showHistory ? '#a78bfa' : 'var(--c-t2)', cursor: 'pointer', fontWeight: 500 }}>
              Edit History {history.length > 0 && `(${history.length})`}
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Cards list */}
            <div style={{ flex: 1, padding: '20px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Add card form */}
              <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 14, padding: '18px 20px', display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--c-t3)', marginBottom: 4, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>Front</div>
                  <input value={newCard.front} onChange={e => setNewCard(p => ({...p, front: e.target.value}))} placeholder="Question or term..."
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--c-bg)', border: '1px solid var(--c-line)', borderRadius: 8, fontSize: 14, color: 'var(--c-t1)', outline: 'none' }}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--c-t3)', marginBottom: 4, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>Back</div>
                  <input value={newCard.back} onChange={e => setNewCard(p => ({...p, back: e.target.value}))} placeholder="Answer or definition..."
                    onKeyDown={e => e.key === 'Enter' && addCard()}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--c-bg)', border: '1px solid var(--c-line)', borderRadius: 8, fontSize: 14, color: 'var(--c-t1)', outline: 'none' }}/>
                </div>
                <button onClick={addCard} style={{ padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Add Card</button>
              </div>

              {/* Card list */}
              {cards.map((c, i) => (
                <div key={c.id} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(37,99,235,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#3b82f6', flexShrink: 0 }}>{i+1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-t1)', marginBottom: 4 }}>{c.front}</div>
                    <div style={{ fontSize: 13, color: 'var(--c-t2)' }}>{c.back}</div>
                  </div>
                  {c.added_by === user.id && (
                    <button onClick={() => deleteCard(c)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--c-t3)', fontSize: 16, padding: '2px 6px', flexShrink: 0 }}>✕</button>
                  )}
                </div>
              ))}
              {cards.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--c-t3)' }}>No cards yet. Add the first one above!</div>
              )}
            </div>

            {/* Edit history panel */}
            {showHistory && (
              <div style={{ width: 320, borderLeft: '1px solid var(--c-line)', padding: '20px 20px', overflowY: 'auto' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-t2)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 16 }}>Edit History</div>
                {history.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--c-t3)', textAlign: 'center', padding: '30px 0' }}>No edits yet</div>
                ) : history.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(167,139,250,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#a78bfa', flexShrink: 0 }}>
                      {(h.profiles?.full_name || h.profiles?.email || 'U').slice(0,1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--c-t1)', fontWeight: 500 }}>
                        {h.profiles?.full_name || h.profiles?.email || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 12, color: h.action === 'added_card' ? '#34d399' : h.action === 'deleted_card' ? '#f87171' : '#a78bfa' }}>
                        {actionLabel[h.action] || h.action} — {h.detail}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--c-t3)', marginTop: 2 }}>
                        {new Date(h.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-t3)' }}>
          Select a deck or create a new one
        </div>
      )}
    </div>
  )
}