'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const SUBJECT_COLORS = {
  Math: '#6366f1', Science: '#1D9E75', English: '#f59e0b',
  History: '#e11d48', Geography: '#8b5cf6', Art: '#ec4899',
  Reading: '#1D9E75', Writing: '#f59e0b', default: '#6366f1',
}

// ── Hydration guard ───────────────────────────────────────────────────────────
export default function FlashcardsPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return <div style={{ position: 'fixed', inset: 0, background: '#0f0f1a' }} />
  return <FlashcardsUI />
}

function FlashcardsUI() {
  const router = useRouter()

  const [child, setChild]         = useState(null)
  const [screen, setScreen]       = useState('picker')   // 'picker' | 'study' | 'done'
  const [sets, setSets]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeSet, setActiveSet] = useState(null)
  const [cards, setCards]         = useState([])
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped]     = useState(false)
  const [results, setResults]     = useState([])        // 'got' | 'hard' | 'skip' per card
  const [hardQueue, setHardQueue] = useState([])        // indices of hard cards to resurface

  // ── Load child + sets ─────────────────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('flashfo_child_session')
    if (!raw) { router.replace('/kids-login'); return }
    try {
      const session = JSON.parse(raw)
      if (Date.now() - session.loginAt > 12 * 60 * 60 * 1000) {
        localStorage.removeItem('flashfo_child_session')
        router.replace('/kids-login')
        return
      }
      setChild(session)
      loadSets(session)
    } catch { router.replace('/kids-login') }
  }, [])

  async function loadSets(session) {
    setLoading(true)
    try {
      // Load saved_items that belong to this child's parent and are flashcard sets
      const { data: parentSets } = await supabase
        .from('saved_items')
        .select('id, title, data, type, created_at')
        .eq('user_id', session.parentId)
        .eq('type', 'flashcards')
        .order('created_at', { ascending: false })
        .limit(20)

      setSets(parentSets || [])
    } catch { setSets([]) }
    finally { setLoading(false) }
  }

  // ── Start studying a set ──────────────────────────────────────────────────
  function startSet(set) {
    let cardData = []
    try {
      cardData = Array.isArray(set.data) ? set.data : JSON.parse(set.data)
    } catch { cardData = [] }

    if (!cardData.length) return

    setActiveSet(set)
    setCards(cardData)
    setCardIndex(0)
    setFlipped(false)
    setResults([])
    setHardQueue([])
    setScreen('study')
  }

  // ── Card actions ──────────────────────────────────────────────────────────
  const currentCard = cards[cardIndex]

  function handleGot() {
    const newResults = [...results, { index: cardIndex, result: 'got' }]
    setResults(newResults)
    advance(newResults)
  }

  function handleHard() {
    const newResults = [...results, { index: cardIndex, result: 'hard' }]
    setResults(newResults)
    setHardQueue(prev => [...prev, cardIndex])
    advance(newResults)
  }

  function handleSkip() {
    const newResults = [...results, { index: cardIndex, result: 'skip' }]
    setResults(newResults)
    advance(newResults)
  }

  function advance(currentResults) {
    setFlipped(false)
    const nextIndex = cardIndex + 1

    if (nextIndex < cards.length) {
      setCardIndex(nextIndex)
    } else if (hardQueue.length > 0) {
      // Resurface hard cards
      const nextHardIndex = hardQueue[0]
      setHardQueue(prev => prev.slice(1))
      setCardIndex(nextHardIndex)
    } else {
      setScreen('done')
    }
  }

  // ── Stats for done screen ─────────────────────────────────────────────────
  const gotCount  = results.filter(r => r.result === 'got').length
  const hardCount = results.filter(r => r.result === 'hard').length
  const skipCount = results.filter(r => r.result === 'skip').length
  const accuracy  = results.length > 0 ? Math.round((gotCount / results.length) * 100) : 0

  // ── Progress ──────────────────────────────────────────────────────────────
  const progress = cards.length > 0 ? ((cardIndex) / cards.length) * 100 : 0

  const s = {
    page: { minHeight: '100vh', background: '#0f0f1a', fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column' },
    topbar: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderBottom: '0.5px solid rgba(255,255,255,0.07)', flexShrink: 0 },
    backBtn: { width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: 'rgba(255,255,255,0.6)', fontFamily: 'system-ui,sans-serif' },
    topTitle: { fontSize: 13, fontWeight: 500, color: '#fff' },
    topRight: { marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.35)' },
    body: { padding: '16px 14px', maxWidth: 480, margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },

    // Picker
    sectionLbl: { fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 },
    setCard: { background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 },
    setIcon: (color) => ({ width: 34, height: 34, borderRadius: 10, background: `rgba(${hexToRgb(color)},0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }),
    setName: { fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 2 },
    setMeta: { fontSize: 10, color: 'rgba(255,255,255,0.35)' },
    setBadge: (color) => ({ marginLeft: 'auto', fontSize: 10, padding: '3px 8px', borderRadius: 999, background: `rgba(${hexToRgb(color)},0.12)`, color, border: `0.5px solid rgba(${hexToRgb(color)},0.25)`, whiteSpace: 'nowrap' }),
    emptyState: { textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13, padding: '40px 0', lineHeight: 1.6 },

    // Study
    progressWrap: { marginBottom: 12 },
    progressTrack: { height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden', marginBottom: 5 },
    progressFill: (pct, color) => ({ height: '100%', width: `${pct}%`, background: color || '#6366f1', borderRadius: 999, transition: 'width 0.3s' }),
    progressLabels: { display: 'flex', justifyContent: 'space-between' },
    progLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)' },
    dotTrail: { display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' },
    dot: (result) => {
      if (result === 'got')  return { width: 8, height: 8, borderRadius: '50%', background: '#1D9E75' }
      if (result === 'hard') return { width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }
      if (result === 'skip') return { width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }
      if (result === 'current') return { width: 8, height: 8, borderRadius: '50%', background: '#a5b4fc', boxShadow: '0 0 6px rgba(165,180,252,0.6)' }
      return { width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.12)' }
    },
    hintText: { fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginBottom: 12 },
    cardWrap: { borderRadius: 16, padding: '24px 16px', textAlign: 'center', marginBottom: 14, cursor: 'pointer', minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'background 0.2s' },
    cardSubject: { fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 },
    cardQuestion: { fontSize: 18, fontWeight: 500, color: '#fff', lineHeight: 1.45, letterSpacing: '-0.01em' },
    cardAnswer: { fontSize: 16, color: '#5eead4', lineHeight: 1.5 },
    cardCorner: { position: 'absolute', top: 10, right: 10, width: 24, height: 24, borderRadius: 7, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 },
    actionRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 },
    actionBtn: (bg, color, border) => ({ padding: '10px 6px', borderRadius: 12, border: `0.5px solid ${border}`, cursor: 'pointer', fontSize: 11, fontWeight: 500, fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: bg, color }),
    actionEmoji: { fontSize: 16 },

    // Done
    doneIcon: { width: 52, height: 52, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '0.5px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px auto 12px', fontSize: 22 },
    doneScore: { textAlign: 'center', marginBottom: 14 },
    doneNum: { fontSize: 48, fontWeight: 500, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em' },
    doneLbl: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
    statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 },
    statCard: (color) => ({ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '8px 6px', textAlign: 'center' }),
    statVal: (color) => ({ fontSize: 18, fontWeight: 500, color, lineHeight: 1 }),
    statLbl: { fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
    tryAgainBtn: { width: '100%', padding: 11, borderRadius: 12, background: '#6366f1', border: 'none', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'system-ui,sans-serif', marginBottom: 6 },
    backHomeBtn: { width: '100%', padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui,sans-serif' },
  }

  const subjectColor = (set) => {
    const title = set.title || ''
    for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
      if (title.toLowerCase().includes(key.toLowerCase())) return color
    }
    return SUBJECT_COLORS.default
  }

  const cardColor = activeSet ? subjectColor(activeSet) : '#6366f1'

  if (!child) return <div style={s.page} />

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <button style={s.backBtn} onClick={() => {
          if (screen === 'study' || screen === 'done') setScreen('picker')
          else router.push('/kids')
        }}>←</button>
        <span style={s.topTitle}>
          {screen === 'picker' ? 'Practice' : screen === 'done' ? 'Done!' : activeSet?.title || 'Flashcards'}
        </span>
        {screen === 'study' && (
          <span style={s.topRight}>{cardIndex + 1} of {cards.length}</span>
        )}
      </div>

      <div style={s.body}>

        {/* ── PICKER ── */}
        {screen === 'picker' && (
          <>
            {loading ? (
              <div style={s.emptyState}>Loading your sets...</div>
            ) : sets.length === 0 ? (
              <div style={s.emptyState}>
                No flashcard sets yet.<br />
                Ask your parent to assign some, or create your own!
              </div>
            ) : (
              <>
                <div style={s.sectionLbl}>Your sets</div>
                {sets.map(set => {
                  const color = subjectColor(set)
                  let cardCount = 0
                  try { cardCount = (Array.isArray(set.data) ? set.data : JSON.parse(set.data)).length } catch {}
                  return (
                    <div key={set.id} style={s.setCard} onClick={() => startSet(set)}>
                      <div style={s.setIcon(color)}>🃏</div>
                      <div>
                        <div style={s.setName}>{set.title}</div>
                        <div style={s.setMeta}>{cardCount} cards</div>
                      </div>
                      <div style={s.setBadge(color)}>{cardCount} cards</div>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}

        {/* ── STUDY ── */}
        {screen === 'study' && currentCard && (
          <>
            <div style={s.progressWrap}>
              <div style={s.progressTrack}>
                <div style={s.progressFill(progress, cardColor)} />
              </div>
              <div style={s.progressLabels}>
                <span style={s.progLabel}>{cardIndex} done</span>
                <span style={s.progLabel}>{gotCount} got it · {hardCount} hard</span>
              </div>
            </div>

            <div style={s.dotTrail}>
              {cards.map((_, i) => {
                const res = results.find(r => r.index === i)
                const state = res ? res.result : i === cardIndex ? 'current' : 'todo'
                return <div key={i} style={s.dot(state)} />
              })}
            </div>

            <div style={s.hintText}>Tap the card to flip it</div>

            <div
              style={{
                ...s.cardWrap,
                background: flipped
                  ? `rgba(${hexToRgb(cardColor)},0.08)`
                  : 'rgba(255,255,255,0.04)',
                border: `0.5px solid rgba(${hexToRgb(cardColor)},${flipped ? '0.3' : '0.15'})`,
              }}
              onClick={() => setFlipped(f => !f)}
            >
              <div style={s.cardCorner}>{flipped ? '↩' : '↻'}</div>
              <div style={s.cardSubject}>{activeSet?.title}</div>
              {!flipped ? (
                <div style={s.cardQuestion}>{currentCard.front || currentCard.question || currentCard.term}</div>
              ) : (
                <div style={s.cardAnswer}>{currentCard.back || currentCard.answer || currentCard.definition}</div>
              )}
            </div>

            <div style={s.actionRow}>
              <button style={s.actionBtn('rgba(255,255,255,0.05)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.08)')} onClick={handleSkip}>
                <span style={s.actionEmoji}>⏭</span>
                Skip
              </button>
              <button style={s.actionBtn('rgba(245,158,11,0.1)', '#fcd34d', 'rgba(245,158,11,0.2)')} onClick={handleHard}>
                <span style={s.actionEmoji}>😅</span>
                Hard
              </button>
              <button style={s.actionBtn('rgba(29,158,117,0.1)', '#5eead4', 'rgba(29,158,117,0.2)')} onClick={handleGot}>
                <span style={s.actionEmoji}>✓</span>
                Got it
              </button>
            </div>
          </>
        )}

        {/* ── DONE ── */}
        {screen === 'done' && (
          <>
            <div style={s.doneIcon}>🏆</div>
            <div style={s.doneScore}>
              <div style={s.doneNum}>{gotCount}</div>
              <div style={s.doneLbl}>correct · {activeSet?.title}</div>
            </div>

            <div style={s.statsGrid}>
              <div style={s.statCard()}>
                <div style={s.statVal('#5eead4')}>{gotCount}</div>
                <div style={s.statLbl}>got it</div>
              </div>
              <div style={s.statCard()}>
                <div style={s.statVal('#fda4af')}>{hardCount}</div>
                <div style={s.statLbl}>hard</div>
              </div>
              <div style={s.statCard()}>
                <div style={s.statVal('#fff')}>{accuracy}%</div>
                <div style={s.statLbl}>accuracy</div>
              </div>
            </div>

            <button style={s.tryAgainBtn} onClick={() => startSet(activeSet)}>Try again</button>
            <button style={s.backHomeBtn} onClick={() => router.push('/kids')}>Back to home</button>
          </>
        )}

      </div>
    </div>
  )
}

function hexToRgb(hex) {
  if (!hex || !hex.startsWith('#')) return '99,102,241'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
