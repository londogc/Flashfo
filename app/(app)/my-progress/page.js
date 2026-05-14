'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

// ── SM-2 helpers (read-only, same hash as flashcards page) ────────────────────

function cardId(front) {
  const s = (front||'').toLowerCase().trim()
  let h = 0
  for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0 }
  return 'fc-' + Math.abs(h).toString(36)
}

function getReviews() {
  try { return JSON.parse(localStorage.getItem('ff-card-reviews')||'{}') } catch { return {} }
}

function difficultyLabel(ef) {
  if (ef < 1.5) return { label:'Very hard', color:'#f87171', bg:'rgba(239,68,68,0.08)', border:'rgba(239,68,68,0.2)' }
  if (ef < 1.8) return { label:'Hard',      color:'#fbbf24', bg:'rgba(245,158,11,0.08)', border:'rgba(245,158,11,0.2)' }
  if (ef < 2.2) return { label:'Developing', color:'#60a5fa', bg:'rgba(59,130,246,0.08)', border:'rgba(59,130,246,0.2)' }
  return               { label:'Strong',     color:'#34d399', bg:'rgba(52,211,153,0.08)', border:'rgba(52,211,153,0.2)' }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyProgress() {
  const { user, profile } = useAuth()
  const router = useRouter()

  const [tab,          setTab]          = useState('quiz')    // 'quiz' | 'flashcards'
  const [quizTopics,   setQuizTopics]   = useState([])
  const [weakCards,    setWeakCards]    = useState([])        // [{front,back,deckName,easeFactor,repetitions}]
  const [neverReviewed,setNeverReviewed]= useState([])        // cards never touched
  const [loadingQuiz,  setLoadingQuiz]  = useState(true)
  const [loadingCards, setLoadingCards] = useState(true)
  const [drillCount,   setDrillCount]   = useState(10)

  // ── Load quiz data ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    loadQuizProgress()
    loadFlashcardWeakSpots()
  }, [user])

  async function loadQuizProgress() {
    setLoadingQuiz(true)
    const { data } = await supabase
      .from('quiz_attempts')
      .select('topic, correct, total, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (!data?.length) { setQuizTopics([{ topic:'No quizzes taken yet', score:0, attempts:0, placeholder:true }]); setLoadingQuiz(false); return }

    const map = {}
    data.forEach(row => {
      if (!map[row.topic]) map[row.topic] = { correct:0, total:0, attempts:0 }
      map[row.topic].correct  += row.correct || 0
      map[row.topic].total    += row.total   || 1
      map[row.topic].attempts++
    })
    const result = Object.entries(map).map(([topic, d]) => ({
      topic,
      score:    Math.round((d.correct / d.total) * 100),
      attempts: d.attempts,
    })).sort((a,b) => a.score - b.score)

    setQuizTopics(result)
    setLoadingQuiz(false)
  }

  // ── Load flashcard weak spots ───────────────────────────────────────────────
  // Loads all saved decks from Supabase, cross-references with SM-2 localStorage

  async function loadFlashcardWeakSpots() {
    setLoadingCards(true)
    try {
      const reviews = getReviews()

      const { data } = await supabase
        .from('saved_items')
        .select('title, data')
        .eq('user_id', user.id)
        .eq('type', 'flashcards')
        .order('updated_at', { ascending: false })

      if (!data?.length) { setLoadingCards(false); return }

      const hard = [], never = []

      for (const deck of data) {
        const cards = deck.data?.cards || []
        const name  = deck.title || deck.data?.topic || 'Deck'
        for (const card of cards) {
          const front = card.front || card.question || ''
          const back  = card.back  || card.answer  || ''
          if (!front) continue
          const r = reviews[cardId(front)]
          if (!r || r.repetitions === 0) {
            never.push({ front, back, deckName:name })
          } else {
            hard.push({ front, back, deckName:name, easeFactor:r.easeFactor, repetitions:r.repetitions, interval:r.interval })
          }
        }
      }

      // Sort by easeFactor ascending (hardest first), deduplicate by front text
      const seen = new Set()
      const dedupedHard = hard
        .sort((a,b) => a.easeFactor - b.easeFactor)
        .filter(c => { if (seen.has(c.front)) return false; seen.add(c.front); return true })
        .filter(c => c.easeFactor < 2.4)   // only surface genuinely hard cards

      const seenNever = new Set()
      const dedupedNever = never
        .filter(c => { if (seenNever.has(c.front)) return false; seenNever.add(c.front); return true })
        .slice(0, 20)  // cap — no need to show hundreds of unseen cards

      setWeakCards(dedupedHard)
      setNeverReviewed(dedupedNever)
    } catch(e) { console.error(e) }
    finally { setLoadingCards(false) }
  }

  function drillWeakCards() {
    const cards = weakCards.slice(0, drillCount).map(c => ({ front:c.front, back:c.back }))
    sessionStorage.setItem('flashfo_study_modes', JSON.stringify({ cards, topic:'Weak spot drill' }))
    router.push('/study-modes')
  }

  function drillNeverReviewed() {
    const cards = neverReviewed.slice(0, drillCount).map(c => ({ front:c.front, back:c.back }))
    sessionStorage.setItem('flashfo_study_modes', JSON.stringify({ cards, topic:'New cards' }))
    router.push('/study-modes')
  }

  function getQuizColor(score) {
    if (score >= 85) return { bg:'rgba(52,211,153,.1)',   border:'rgba(52,211,153,.25)',  text:'#34d399', label:'Strong'     }
    if (score >= 65) return { bg:'rgba(245,158,11,.08)',  border:'rgba(245,158,11,.22)',  text:'#f59e0b', label:'Developing' }
    return                  { bg:'rgba(239,68,68,.08)',   border:'rgba(239,68,68,.22)',   text:'#f87171', label:'Needs work' }
  }

  const totalHard   = weakCards.filter(c=>c.easeFactor<1.8).length
  const totalWeak   = weakCards.length
  const totalNever  = neverReviewed.length
  const quizWeak    = quizTopics.filter(t=>t.score<65&&!t.placeholder).length

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'28px 24px 56px', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:20, padding:'5px 13px', fontSize:10, fontWeight:800, color:'#f87171', marginBottom:14, letterSpacing:'.08em', textTransform:'uppercase' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          My Progress
        </div>
        <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-.03em', color:'var(--c-t1)', marginBottom:6, lineHeight:1.15 }}>Weak spot detector</h1>
        <p style={{ fontSize:13, color:'var(--c-t2)', lineHeight:1.65 }}>Topics and cards ranked by difficulty — weakest first. Only you can see this.</p>
      </div>

      {/* Summary stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:28 }}>
        {[
          { label:'Quiz topics weak',  value:quizWeak,    color:'#f87171', active:quizWeak>0   },
          { label:'Hard flashcards',   value:totalHard,   color:'#fbbf24', active:totalHard>0  },
          { label:'Weak flashcards',   value:totalWeak,   color:'#60a5fa', active:totalWeak>0  },
          { label:'Never reviewed',    value:totalNever,  color:'#a78bfa', active:totalNever>0 },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:12, padding:'16px 18px' }}>
            <div style={{ fontSize:30, fontWeight:800, color:s.active?s.color:'rgba(255,255,255,0.2)', letterSpacing:'-.03em', lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:12, color:'var(--c-t2)', marginTop:5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.04)', borderRadius:10, padding:4, marginBottom:24, width:'fit-content' }}>
        {[['quiz','Quiz performance'],['flashcards','Flashcard weak spots']].map(([id,label]) => (
          <button key={id} onClick={()=>setTab(id)}
            style={{ padding:'7px 18px', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', border:'none', background:tab===id?'rgba(255,255,255,0.09)':'transparent', color:tab===id?'#e2e8f0':'rgba(255,255,255,0.35)', transition:'all .15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── QUIZ TAB ── */}
      {tab === 'quiz' && (
        loadingQuiz ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--c-t3)' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#f87171', animation:'nova-pulse .9s ease-in-out infinite', margin:'0 auto 12px' }}/>
            Analysing your quiz performance…
          </div>
        ) : (
          <>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {quizTopics.map((t,i) => {
                const c = t.placeholder ? { bg:'var(--c-surface)', border:'var(--c-line)', text:'var(--c-t3)', label:'—' } : getQuizColor(t.score)
                return (
                  <div key={t.topic} style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:c.bg, border:`1px solid ${c.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:c.text, flexShrink:0 }}>
                      {t.placeholder ? '—' : i+1}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:'var(--c-t1)', marginBottom:2 }}>{t.topic}</div>
                      {!t.placeholder && <div style={{ fontSize:12, color:'var(--c-t2)' }}>{t.attempts} quiz{t.attempts!==1?'zes':''} taken</div>}
                    </div>
                    {!t.placeholder && (
                      <>
                        <div style={{ width:140, height:6, background:'var(--c-surface2)', borderRadius:3, overflow:'hidden', flexShrink:0 }}>
                          <div style={{ height:'100%', width:`${t.score}%`, background:c.text, borderRadius:3 }}/>
                        </div>
                        <div style={{ minWidth:56, textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:17, fontWeight:700, color:c.text }}>{t.score}%</div>
                          <div style={{ fontSize:10, color:c.text, opacity:.7 }}>{c.label}</div>
                        </div>
                        <button
                          onClick={()=>router.push(`/ai-tutor?topic=${encodeURIComponent(t.topic)}&mode=practice`)}
                          style={{ padding:'6px 14px', background:'var(--c-surface)', border:`1px solid ${c.border}`, borderRadius:8, fontSize:12, fontWeight:600, color:c.text, cursor:'pointer', flexShrink:0, fontFamily:'inherit' }}>
                          Practice with Nova
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            {quizTopics.filter(t=>!t.placeholder).length === 0 && (
              <div style={{ textAlign:'center', padding:'48px 0', color:'var(--c-t3)' }}>
                <div style={{ fontSize:15, fontWeight:600, color:'var(--c-t2)', marginBottom:6 }}>No quiz data yet</div>
                <div style={{ fontSize:13 }}>Complete a quiz and your performance will appear here.</div>
              </div>
            )}
          </>
        )
      )}

      {/* ── FLASHCARD WEAK SPOTS TAB ── */}
      {tab === 'flashcards' && (
        loadingCards ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--c-t3)' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#60a5fa', animation:'nova-pulse .9s ease-in-out infinite', margin:'0 auto 12px' }}/>
            Scanning your saved decks…
          </div>
        ) : (
          <>
            {/* Hard cards section */}
            {weakCards.length > 0 && (
              <div style={{ marginBottom:32 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
                  <div>
                    <h2 style={{ fontSize:16, fontWeight:800, color:'var(--c-t1)', margin:0, letterSpacing:'-.02em' }}>Consistently hard cards</h2>
                    <div style={{ fontSize:12, color:'var(--c-t2)', marginTop:3 }}>Sorted by difficulty — lowest ease factor first</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:11, color:'var(--c-t2)' }}>Drill top</span>
                      <select value={drillCount} onChange={e=>setDrillCount(Number(e.target.value))}
                        style={{ height:30, padding:'0 8px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:7, fontSize:12, color:'var(--c-t1)', outline:'none', fontFamily:'inherit' }}>
                        {[5,10,15,20].map(n=><option key={n} value={n}>{n}</option>)}
                      </select>
                      <span style={{ fontSize:11, color:'var(--c-t2)' }}>cards</span>
                    </div>
                    <button onClick={drillWeakCards}
                      style={{ height:34, padding:'0 16px', background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', border:'none', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                      Drill these →
                    </button>
                  </div>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {weakCards.map((c,i) => {
                    const d = difficultyLabel(c.easeFactor)
                    return (
                      <div key={i} style={{ background:d.bg, border:`1px solid ${d.border}`, borderRadius:11, padding:'12px 16px', display:'flex', alignItems:'center', gap:14 }}>
                        <div style={{ width:28, height:28, borderRadius:7, background:d.bg, border:`1px solid ${d.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:d.color, flexShrink:0 }}>{i+1}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'var(--c-t1)', marginBottom:2 }}>{c.front}</div>
                          <div style={{ fontSize:11, color:'var(--c-t3)', display:'flex', alignItems:'center', gap:8 }}>
                            <span>{c.deckName}</span>
                            <span>·</span>
                            <span>{c.repetitions} review{c.repetitions!==1?'s':''}</span>
                          </div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:d.color }}>{d.label}</div>
                          <div style={{ fontSize:10, color:'var(--c-t3)', marginTop:1 }}>ease {c.easeFactor.toFixed(2)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Never reviewed section */}
            {neverReviewed.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
                  <div>
                    <h2 style={{ fontSize:16, fontWeight:800, color:'var(--c-t1)', margin:0, letterSpacing:'-.02em' }}>Never reviewed</h2>
                    <div style={{ fontSize:12, color:'var(--c-t2)', marginTop:3 }}>Cards in your saved decks you've never studied</div>
                  </div>
                  <button onClick={drillNeverReviewed}
                    style={{ height:34, padding:'0 16px', background:'rgba(167,139,250,0.12)', border:'1px solid rgba(167,139,250,0.3)', color:'#a78bfa', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                    Study new cards →
                  </button>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 }}>
                  {neverReviewed.slice(0,12).map((c,i) => (
                    <div key={i} style={{ background:'rgba(167,139,250,0.05)', border:'1px solid rgba(167,139,250,0.15)', borderRadius:10, padding:'10px 12px' }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--c-t1)', marginBottom:3 }}>{c.front}</div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>{c.deckName}</div>
                    </div>
                  ))}
                  {neverReviewed.length > 12 && (
                    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'10px 12px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span style={{ fontSize:12, color:'var(--c-t3)' }}>+ {neverReviewed.length-12} more</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty state */}
            {weakCards.length === 0 && neverReviewed.length === 0 && (
              <div style={{ textAlign:'center', padding:'48px 24px', background:'rgba(52,211,153,0.05)', border:'1px solid rgba(52,211,153,0.15)', borderRadius:14 }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" style={{ margin:'0 auto 14px', display:'block' }}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--c-t1)', marginBottom:6 }}>No weak spots detected</div>
                <div style={{ fontSize:13, color:'var(--c-t2)', lineHeight:1.6 }}>
                  {weakCards.length === 0 && neverReviewed.length === 0 ? 'Save some flashcard decks and start reviewing them — weak spots will appear here as you study.' : 'Keep reviewing and weak spots will surface here.'}
                </div>
              </div>
            )}

            {/* Note about localStorage */}
            <div style={{ marginTop:20, padding:'10px 14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:9, display:'flex', alignItems:'center', gap:8 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>Review history is stored on this device. Clearing your browser data will reset it.</span>
            </div>
          </>
        )
      )}
    </div>
  )
}
