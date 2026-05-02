'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

export default function StudyTogether() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sessionCode, setSessionCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [session, setSession] = useState(null)
  const [cards, setCards] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [scores, setScores] = useState({})
  const [partner, setPartner] = useState(null)
  const [phase, setPhase] = useState('lobby') // lobby | playing | done
  const channelRef = useRef(null)

  useEffect(() => {
    if (!user) { router.push('/auth'); return }
    const code = searchParams.get('code')
    if (code) joinSession(code)
  }, [user])

  async function createSession() {
    const code = Math.random().toString(36).slice(2,8).toUpperCase()
    const { data } = await supabase.from('study_sessions').insert({
      code, host_id: user.id, status: 'waiting'
    }).select().single()
    if (data) {
      setSession(data)
      setSessionCode(code)
      subscribeToSession(code)
      setPhase('lobby')
    }
  }

  async function joinSession(code) {
    const upperCode = (code || joinCode).toUpperCase()
    const { data } = await supabase.from('study_sessions')
      .select('*').eq('code', upperCode).single()
    if (!data) { alert('Session not found. Check the code and try again.'); return }
    await supabase.from('study_sessions').update({ guest_id: user.id, status: 'active' }).eq('id', data.id)
    setSession(data)
    setSessionCode(upperCode)
    subscribeToSession(upperCode)
    setPhase('lobby')
    // Load cards if deck is attached
    if (data.deck_id) loadCards(data.deck_id)
  }

  function subscribeToSession(code) {
    const channel = supabase.channel('study-' + code)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_sessions', filter: 'code=eq.' + code }, payload => {
        setSession(payload.new)
        if (payload.new.status === 'active') setPhase('playing')
        if (payload.new.current_card_idx !== undefined) {
          setCurrentIdx(payload.new.current_card_idx)
          setFlipped(false)
        }
      })
      .on('broadcast', { event: 'score' }, payload => {
        setScores(prev => ({ ...prev, [payload.payload.userId]: payload.payload.score }))
      })
      .subscribe()
    channelRef.current = channel
  }

  async function loadCards(deckId) {
    const { data } = await supabase.from('collab_cards').select('*').eq('deck_id', deckId).order('created_at')
    setCards(data || [])
    if (data?.length > 0) setPhase('playing')
  }

  async function nextCard() {
    const next = currentIdx + 1
    if (next >= cards.length) { setPhase('done'); return }
    await supabase.from('study_sessions').update({ current_card_idx: next }).eq('code', sessionCode)
    setCurrentIdx(next)
    setFlipped(false)
  }

  async function markCorrect() {
    const newScore = (scores[user.id] || 0) + 1
    setScores(prev => ({ ...prev, [user.id]: newScore }))
    channelRef.current?.send({ type: 'broadcast', event: 'score', payload: { userId: user.id, score: newScore } })
    nextCard()
  }

  const myName = profile?.full_name || user?.email?.split('@')[0] || 'You'
  const myScore = scores[user.id] || 0
  const partnerScore = Object.entries(scores).filter(([k]) => k !== user.id)[0]?.[1] || 0

  if (phase === 'lobby') return (
    <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--c-t1)', marginBottom: 8 }}>Study With a Friend</h1>
      <p style={{ fontSize: 15, color: 'var(--c-t2)', marginBottom: 40 }}>Quiz each other on any deck. Live scores, real competition.</p>
      {!session ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button onClick={createSession}
            style={{ padding: '14px 0', background: 'linear-gradient(90deg,#2563eb,#7c3aed)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            Create a session
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--c-line)' }}/>
            <span style={{ fontSize: 13, color: 'var(--c-t3)' }}>or join one</span>
            <div style={{ flex: 1, height: 1, background: 'var(--c-line)' }}/>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="Enter 6-letter code"
              style={{ flex: 1, padding: '12px 16px', background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 10, fontSize: 16, color: 'var(--c-t1)', textAlign: 'center', letterSpacing: '.15em', fontWeight: 700, outline: 'none' }}
              maxLength={6}/>
            <button onClick={() => joinSession(joinCode)}
              style={{ padding: '12px 24px', background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 10, fontSize: 15, fontWeight: 600, color: 'var(--c-t1)', cursor: 'pointer' }}>
              Join
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 16, padding: '32px', marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: 'var(--c-t3)', marginBottom: 8 }}>Share this code with your friend</div>
            <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: '.2em', color: '#3b82f6' }}>{sessionCode}</div>
          </div>
          <div style={{ fontSize: 14, color: 'var(--c-t2)' }}>Waiting for your friend to join...</div>
        </div>
      )}
    </div>
  )

  if (phase === 'done') return (
    <div style={{ maxWidth: 500, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--c-t1)', marginBottom: 24 }}>Session complete!</h2>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 32 }}>
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 14, padding: '20px 32px' }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#3b82f6' }}>{myScore}</div>
          <div style={{ fontSize: 13, color: 'var(--c-t2)' }}>{myName}</div>
        </div>
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 14, padding: '20px 32px' }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#a78bfa' }}>{partnerScore}</div>
          <div style={{ fontSize: 13, color: 'var(--c-t2)' }}>Friend</div>
        </div>
      </div>
      <button onClick={() => router.push('/study')}
        style={{ padding: '12px 32px', background: 'linear-gradient(90deg,#2563eb,#7c3aed)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
        Back to Study
      </button>
    </div>
  )

  const card = cards[currentIdx]
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>
      {/* Scoreboard */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, justifyContent: 'center' }}>
        <div style={{ flex: 1, background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 12, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#3b82f6' }}>{myName}</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#3b82f6' }}>{myScore}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 13, color: 'var(--c-t3)' }}>{currentIdx + 1}/{cards.length}</div>
        <div style={{ flex: 1, background: 'rgba(167,139,250,.08)', border: '1px solid rgba(167,139,250,.2)', borderRadius: 12, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#a78bfa' }}>Friend</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#a78bfa' }}>{partnerScore}</span>
        </div>
      </div>

      {/* Flashcard */}
      {card && (
        <div onClick={() => setFlipped(!flipped)} style={{ background: flipped ? 'rgba(52,211,153,.06)' : 'var(--c-surface)', border: `1.5px solid ${flipped ? 'rgba(52,211,153,.3)' : 'var(--c-line)'}`, borderRadius: 20, padding: '52px 48px', textAlign: 'center', cursor: 'pointer', minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: flipped ? '#34d399' : 'var(--c-t3)', letterSpacing: '.1em', textTransform: 'uppercase' }}>{flipped ? 'ANSWER' : 'QUESTION — tap to flip'}</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--c-t1)', lineHeight: 1.4 }}>{flipped ? card.back : card.front}</div>
        </div>
      )}

      {flipped && (
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={nextCard} style={{ flex: 1, padding: '13px 0', background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 10, fontSize: 14, fontWeight: 600, color: 'var(--c-t2)', cursor: 'pointer' }}>
            ✕ Incorrect
          </button>
          <button onClick={markCorrect} style={{ flex: 1, padding: '13px 0', background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.3)', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#34d399', cursor: 'pointer' }}>
            ✓ Got it! +1
          </button>
        </div>
      )}
    </div>
  )
}