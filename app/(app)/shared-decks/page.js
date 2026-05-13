'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { useIsMobile } from '@/hooks/useIsMobile'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7)  return `${d} days ago`
  if (d < 30) return `${Math.floor(d/7)} week${Math.floor(d/7)>1?'s':''} ago`
  return `${Math.floor(d/30)} month${Math.floor(d/30)>1?'s':''} ago`
}

function cardCount(data) {
  return data?.cards?.length || 0
}

// ── Subject chips ─────────────────────────────────────────────────────────────
const SUBJECTS = ['All','Math','Science','History','Languages','Biology','Chemistry','Physics','Literature','Economics','Psychology','Computer Science']

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SharedDecksPage() {
  const { user } = useAuth()
  const isMobile = useIsMobile()

  const [decks,       setDecks]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [query,       setQuery]       = useState('')
  const [subject,     setSubject]     = useState('All')
  const [cloning,     setCloning]     = useState(null)  // deck id being cloned
  const [cloned,      setCloned]      = useState({})    // id → true
  const [error,       setError]       = useState('')

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadDecks = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('saved_items')
        .select('id, title, data, updated_at, user_id, profiles!user_id(full_name)')
        .eq('type', 'flashcards')
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(60)

      const { data, error: err } = await q
      if (err) throw err
      setDecks(data || [])
    } catch(e) {
      setError('Could not load shared decks. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDecks() }, [loadDecks])

  // ── Clone ─────────────────────────────────────────────────────────────────

  async function cloneDeck(deck) {
    if (!user) { setError('Sign in to clone decks.'); return }
    setCloning(deck.id)
    try {
      await supabase.from('saved_items').insert({
        user_id: user.id,
        type:    'flashcards',
        title:   deck.title + ' (copy)',
        data:    deck.data,
        is_public: false,
      })
      setCloned(prev => ({...prev, [deck.id]: true}))
    } catch {
      setError('Clone failed. Please try again.')
    } finally {
      setCloning(null)
    }
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = decks.filter(d => {
    const title = (d.title || '').toLowerCase()
    const topic = (d.data?.topic || '').toLowerCase()
    const matchQ = !query.trim() || title.includes(query.toLowerCase()) || topic.includes(query.toLowerCase())
    const matchS = subject === 'All' || title.includes(subject.toLowerCase()) || topic.includes(subject.toLowerCase())
    return matchQ && matchS
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding:'28px 24px 56px', maxWidth:900, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Header */}
      <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:20, padding:'5px 13px', fontSize:10, fontWeight:800, color:'#a5b4fc', marginBottom:16, letterSpacing:'.08em', textTransform:'uppercase' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2.2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
        Shared Decks
      </div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-.03em', marginBottom:5, color:'var(--c-t1)', lineHeight:1.15 }}>Community decks</h1>
          <p style={{ fontSize:13, color:'var(--c-t2)', lineHeight:1.65 }}>Decks shared by Flashfo users. Clone any deck to your library and start studying.</p>
        </div>
        {user && (
          <a href="/my-stuff" style={{ textDecoration:'none', height:36, padding:'0 16px', borderRadius:10, border:'1px solid rgba(99,102,241,0.3)', background:'rgba(99,102,241,0.08)', color:'#a5b4fc', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6, flexShrink:0, whiteSpace:'nowrap' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
            Share your deck
          </a>
        )}
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:16 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by topic, subject, or deck name…"
          style={{ width:'100%', height:42, paddingLeft:40, paddingRight:16, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:11, fontSize:13, color:'#e2e8f0', outline:'none', fontFamily:'inherit' }}
        />
      </div>

      {/* Subject chips */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:24 }}>
        {SUBJECTS.map(s => (
          <button key={s} onClick={()=>setSubject(s)}
            style={{ padding:'5px 13px', borderRadius:20, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all .15s', border:'1px solid '+(subject===s?'rgba(99,102,241,0.5)':'rgba(255,255,255,0.09)'), background:subject===s?'rgba(99,102,241,0.14)':'rgba(255,255,255,0.04)', color:subject===s?'#a5b4fc':'rgba(255,255,255,0.4)' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ fontSize:12, color:'#f87171', marginBottom:16, padding:'8px 12px', background:'rgba(239,68,68,0.07)', borderRadius:8, border:'1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#a5b4fc', animation:'nova-pulse .9s ease-in-out infinite', margin:'0 auto 12px' }}/>
          <div style={{ fontSize:13, color:'var(--c-t2)' }}>Loading community decks…</div>
        </div>
      )}

      {/* Empty search */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px 24px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--c-t1)', marginBottom:6 }}>
            {decks.length === 0 ? 'No decks shared yet' : 'No results found'}
          </div>
          <div style={{ fontSize:13, color:'var(--c-t2)', lineHeight:1.6 }}>
            {decks.length === 0
              ? 'Be the first to share a deck! Go to My Stuff and toggle a deck public.'
              : `No decks match "${query || subject}". Try a different search term.`}
          </div>
        </div>
      )}

      {/* Deck grid */}
      {!loading && filtered.length > 0 && (
        <>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.28)', fontWeight:600, marginBottom:12 }}>
            {filtered.length} deck{filtered.length!==1?'s':''}{query||subject!=='All'?' found':''}
          </div>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
            {filtered.map(deck => {
              const count   = cardCount(deck.data)
              const topic   = deck.data?.topic || deck.title
              const author  = deck.profiles?.full_name || 'Anonymous'
              const isOwn   = user?.id === deck.user_id
              const hasCloned = cloned[deck.id]
              const isCloning = cloning === deck.id

              return (
                <div key={deck.id} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:14, padding:'18px 18px 14px', display:'flex', flexDirection:'column', gap:0 }}>
                  {/* Deck info */}
                  <div style={{ flex:1, marginBottom:14 }}>
                    <div style={{ fontSize:15, fontWeight:800, color:'var(--c-t1)', marginBottom:5, letterSpacing:'-.02em', lineHeight:1.3 }}>{deck.title}</div>
                    {topic !== deck.title && (
                      <div style={{ fontSize:12, color:'var(--c-t2)', marginBottom:6, lineHeight:1.4 }}>{topic}</div>
                    )}
                    <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', color:'#60a5fa' }}>
                        {count} card{count!==1?'s':''}
                      </span>
                      <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>{timeAgo(deck.updated_at)}</span>
                    </div>
                  </div>

                  {/* Author */}
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
                    <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#a5b4fc', flexShrink:0 }}>
                      {author.slice(0,1).toUpperCase()}
                    </div>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>{isOwn ? 'You' : author}</span>
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', gap:7 }}>
                    {/* Preview */}
                    <button
                      onClick={() => {
                        sessionStorage.setItem('flashfo_load_flashcards', JSON.stringify({ cards: deck.data?.cards || [], topic: deck.title }))
                        window.location.href = '/flashcards'
                      }}
                      style={{ flex:1, height:32, borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'var(--c-t2)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      Study →
                    </button>

                    {/* Clone */}
                    {!isOwn && (
                      <button
                        onClick={() => cloneDeck(deck)}
                        disabled={isCloning || hasCloned}
                        style={{ flex:1, height:32, borderRadius:8, border:'1px solid '+(hasCloned?'rgba(52,211,153,0.3)':'rgba(99,102,241,0.3)'), background:hasCloned?'rgba(52,211,153,0.08)':'rgba(99,102,241,0.1)', color:hasCloned?'#34d399':'#a5b4fc', fontSize:11, fontWeight:700, cursor:isCloning||hasCloned?'default':'pointer', fontFamily:'inherit', opacity:isCloning?.6:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                        {isCloning ? (
                          <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation:'_fcspin .7s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Cloning…</>
                        ) : hasCloned ? '✓ Cloned' : 'Clone →'}
                      </button>
                    )}

                    {isOwn && (
                      <div style={{ flex:1, height:32, borderRadius:8, border:'1px solid rgba(52,211,153,0.25)', background:'rgba(52,211,153,0.07)', color:'#34d399', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        Your deck
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <style>{`@keyframes _fcspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
