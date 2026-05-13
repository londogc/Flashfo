'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { rpc, novaStream } from '@/lib/api'

// ── Fuzzy answer checker (same as FITB in quiz) ───────────────────────────────

function fuzzyMatch(input, correct) {
  if (!input || !correct) return false
  const u = input.toLowerCase().trim()
  const c = correct.toLowerCase().trim()
  if (u === c) return true
  // allow for minor typos: within 20% edit distance
  const variants = c.split(/[|/,]/).map(v => v.trim()).filter(Boolean)
  if (variants.some(v => u === v)) return true
  if (variants.some(v => v.includes(u) && u.length > 3)) return true
  return false
}

// ── Shuffle helper ────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Mode selector ─────────────────────────────────────────────────────────────

function ModeSelector({ topic, cardCount, onSelect }) {
  const MODES = [
    {
      id: 'write',
      label: 'Write',
      color: '#60a5fa',
      bg: 'rgba(59,130,246,0.08)',
      border: 'rgba(59,130,246,0.25)',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
      desc: 'Type the answer from memory',
      best: 'Active recall · builds long-term retention',
    },
    {
      id: 'match',
      label: 'Match',
      color: '#34d399',
      bg: 'rgba(52,211,153,0.08)',
      border: 'rgba(52,211,153,0.25)',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
      desc: 'Click terms and definitions to pair them',
      best: 'Recognition · great for warming up',
    },
    {
      id: 'blurt',
      label: 'Blurt',
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.08)',
      border: 'rgba(167,139,250,0.25)',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
      desc: 'Write everything you remember, Nova scores it',
      best: 'Free recall · simulates exam conditions',
    },
  ]

  return (
    <div style={{ padding:'28px 24px 48px', maxWidth:780, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:20, padding:'5px 13px', fontSize:10, fontWeight:800, color:'#a5b4fc', marginBottom:16, letterSpacing:'.08em', textTransform:'uppercase' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2.2" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
        Study Modes
      </div>
      <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-.03em', marginBottom:5, color:'var(--c-t1)', lineHeight:1.15 }}>How do you want to study?</h1>
      <p style={{ fontSize:13, color:'var(--c-t2)', marginBottom:28, lineHeight:1.65 }}>
        <strong style={{ color:'var(--c-t1)' }}>{topic}</strong> · {cardCount} cards
      </p>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => onSelect(m.id)}
            style={{ padding:'22px 18px', borderRadius:14, border:`1px solid ${m.border}`, background:m.bg, cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .15s' }}>
            <div style={{ marginBottom:14 }}>{m.icon}</div>
            <div style={{ fontSize:17, fontWeight:800, color:m.color, marginBottom:5, letterSpacing:'-.02em' }}>{m.label}</div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--c-t1)', marginBottom:6 }}>{m.desc}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', lineHeight:1.5 }}>{m.best}</div>
          </button>
        ))}
      </div>

      <div style={{ marginTop:20, display:'flex', alignItems:'center', gap:10 }}>
        <a href="/flashcards" style={{ fontSize:12, color:'rgba(255,255,255,0.3)', textDecoration:'none', fontWeight:600 }}>← Back to flashcards</a>
      </div>
    </div>
  )
}

// ── WRITE MODE ────────────────────────────────────────────────────────────────

function WriteMode({ cards, topic, onBack }) {
  const [idx,        setIdx]        = useState(0)
  const [answer,     setAnswer]     = useState('')
  const [result,     setResult]     = useState(null)  // null | 'correct' | 'close' | 'wrong'
  const [novaGrade,  setNovaGrade]  = useState('')
  const [grading,    setGrading]    = useState(false)
  const [scores,     setScores]     = useState([])    // 'correct'|'close'|'wrong' per card
  const [done,       setDone]       = useState(false)
  const inputRef = useRef(null)

  const card = cards[idx]

  useEffect(() => {
    if (!result) inputRef.current?.focus()
  }, [idx, result])

  async function checkAnswer() {
    if (!answer.trim()) return
    const correct = card.back || card.answer || ''
    const match = fuzzyMatch(answer, correct)

    if (match) {
      setResult('correct')
      setScores(s => [...s, 'correct'])
      return
    }

    // Not an exact match — ask Nova to semantically grade it
    setGrading(true)
    try {
      let feedback = ''
      await novaStream(
        [{ role:'user', content:`The question is: "${card.front || card.question}"\nCorrect answer: "${correct}"\nStudent's answer: "${answer}"\n\nIs the student's answer correct, partially correct, or wrong? Reply with ONLY one of: CORRECT, CLOSE, WRONG. Then on the next line add a single sentence of feedback.` }],
        chunk => { feedback += chunk },
        { systemOverride: 'You are a strict but fair exam grader. Evaluate semantic correctness, not exact wording.' }
      )
      const lines = feedback.trim().split('\n')
      const verdict = lines[0].trim().toUpperCase()
      const fb = lines.slice(1).join(' ').trim()
      setNovaGrade(fb)
      if (verdict === 'CORRECT') { setResult('correct'); setScores(s=>[...s,'correct']) }
      else if (verdict === 'CLOSE') { setResult('close'); setScores(s=>[...s,'close']) }
      else { setResult('wrong'); setScores(s=>[...s,'wrong']) }
    } catch {
      // Fallback: mark wrong
      setResult('wrong'); setScores(s=>[...s,'wrong'])
    } finally { setGrading(false) }
  }

  function next() {
    if (idx + 1 >= cards.length) { setDone(true); return }
    setIdx(i => i+1); setAnswer(''); setResult(null); setNovaGrade('')
  }

  if (done) {
    const correct = scores.filter(s=>s==='correct').length
    const close   = scores.filter(s=>s==='close').length
    const wrong   = scores.filter(s=>s==='wrong').length
    const pct     = Math.round(((correct + close * 0.5) / cards.length) * 100)
    return (
      <div style={{ padding:'28px 24px', maxWidth:560, margin:'0 auto', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
        <div style={{ textAlign:'center', padding:'28px 24px', background:'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:16, marginBottom:20 }}>
          <div style={{ fontSize:48, fontWeight:900, color:'#60a5fa', lineHeight:1, marginBottom:6 }}>{pct}%</div>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--c-t1)', marginBottom:4 }}>Write session complete</div>
          <div style={{ fontSize:13, color:'var(--c-t2)' }}>{cards.length} cards · {topic}</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
          {[{l:'Correct',v:correct,c:'#34d399'},{l:'Close',v:close,c:'#fbbf24'},{l:'Wrong',v:wrong,c:'#f87171'}].map(s=>(
            <div key={s.l} style={{ padding:'14px 10px', borderRadius:12, textAlign:'center', background:s.v>0?`${s.c}14`:'rgba(255,255,255,0.03)', border:`1px solid ${s.v>0?s.c+'44':'rgba(255,255,255,0.07)'}` }}>
              <div style={{ fontSize:24, fontWeight:800, color:s.v>0?s.c:'var(--c-t3)', lineHeight:1 }}>{s.v}</div>
              <div style={{ fontSize:11, color:'var(--c-t3)', marginTop:3 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={()=>{ setIdx(0);setAnswer('');setResult(null);setNovaGrade('');setScores([]);setDone(false) }} style={{ flex:1, padding:'11px 0', borderRadius:10, border:'1px solid rgba(59,130,246,0.3)', background:'rgba(59,130,246,0.08)', color:'#60a5fa', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>↺ Try again</button>
          <button onClick={onBack} style={{ flex:1, padding:'11px 0', borderRadius:10, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t2)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Switch mode</button>
        </div>
      </div>
    )
  }

  const resultColors = { correct:{ color:'#34d399', bg:'rgba(52,211,153,0.08)', border:'rgba(52,211,153,0.25)', label:'Correct!' }, close:{ color:'#fbbf24', bg:'rgba(245,158,11,0.08)', border:'rgba(245,158,11,0.25)', label:'Close — ' }, wrong:{ color:'#f87171', bg:'rgba(239,68,68,0.08)', border:'rgba(239,68,68,0.25)', label:'Not quite' } }
  const rc = result ? resultColors[result] : null

  return (
    <div style={{ padding:'28px 24px', maxWidth:640, margin:'0 auto', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>Write mode</div>
          <div style={{ fontSize:13, color:'var(--c-t2)' }}>{idx+1} of {cards.length} · {topic}</div>
        </div>
        <button onClick={onBack} style={{ fontSize:12, color:'rgba(255,255,255,0.3)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>← Change mode</button>
      </div>

      {/* Progress */}
      <div style={{ height:3, background:'var(--c-line)', borderRadius:2, overflow:'hidden', marginBottom:20 }}>
        <div style={{ height:'100%', width:`${((idx)/cards.length)*100}%`, background:'#3b82f6', borderRadius:2, transition:'width .3s' }}/>
      </div>

      {/* Card front */}
      <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:14, padding:'24px 28px', marginBottom:16, textAlign:'center', minHeight:100, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontSize:18, fontWeight:700, color:'var(--c-t1)', lineHeight:1.45 }}>{card?.front || card?.question}</div>
      </div>

      {/* Answer input */}
      <textarea
        ref={inputRef}
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        onKeyDown={e => { if (e.key==='Enter' && e.metaKey && !result) checkAnswer() }}
        disabled={!!result || grading}
        placeholder="Type your answer…"
        rows={3}
        style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'12px 16px', fontSize:14, color:'#e2e8f0', outline:'none', resize:'none', fontFamily:'inherit', lineHeight:1.6, marginBottom:10, opacity:result?.6:1 }}
      />

      {/* Result */}
      {result && rc && (
        <div style={{ background:rc.bg, border:`1px solid ${rc.border}`, borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:rc.color, marginBottom: (result!=='correct'||novaGrade)?6:0 }}>
            {rc.label}{result==='close' && novaGrade ? novaGrade : ''}
          </div>
          {(result==='wrong'||result==='close') && (
            <div style={{ fontSize:13, color:'var(--c-t1)' }}>
              <span style={{ color:'var(--c-t3)', fontWeight:600 }}>Answer: </span>{card?.back||card?.answer}
            </div>
          )}
          {result==='wrong' && novaGrade && !novaGrade.startsWith(rc.label) && (
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', marginTop:6, lineHeight:1.5 }}>{novaGrade}</div>
          )}
        </div>
      )}

      {grading && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, padding:'10px 14px', background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:10 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#a5b4fc', animation:'nova-pulse .9s ease-in-out infinite' }}/>
          <span style={{ fontSize:12, color:'rgba(165,180,252,0.7)' }}>Nova is grading your answer…</span>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display:'flex', gap:10 }}>
        {!result && !grading && (
          <button onClick={checkAnswer} disabled={!answer.trim()} style={{ flex:1, padding:'13px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#2563eb,#4f46e5)', color:'#fff', fontSize:13, fontWeight:800, cursor:!answer.trim()?'not-allowed':'pointer', fontFamily:'inherit', opacity:!answer.trim()?.55:1 }}>
            Check answer →
          </button>
        )}
        {result && (
          <button onClick={next} style={{ flex:1, padding:'13px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#2563eb,#4f46e5)', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
            {idx+1 >= cards.length ? 'See results →' : 'Next card →'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── MATCH MODE ────────────────────────────────────────────────────────────────

function MatchMode({ cards, topic, onBack }) {
  const BATCH = 6
  const [batchIdx,  setBatchIdx]  = useState(0)
  const [tiles,     setTiles]     = useState([])
  const [selected,  setSelected]  = useState(null)   // { id, type:'term'|'def' }
  const [matched,   setMatched]   = useState([])     // card indices that are matched
  const [wrong,     setWrong]     = useState(null)   // id that was a wrong match (flash red)
  const [done,      setDone]      = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [elapsed,   setElapsed]   = useState(0)
  const [batchesDone, setBatchesDone] = useState(0)

  useEffect(() => { loadBatch(0) }, [])

  // Timer
  useEffect(() => {
    if (done || !startTime) return
    const t = setInterval(() => setElapsed(Math.floor((Date.now()-startTime)/1000)), 500)
    return () => clearInterval(t)
  }, [done, startTime])

  function loadBatch(bIdx) {
    const start  = bIdx * BATCH
    const batch  = cards.slice(start, start + BATCH)
    const terms  = batch.map((c,i) => ({ id:start+i, type:'term', text:c.front||c.question, cardIdx:start+i }))
    const defs   = shuffle(batch.map((c,i) => ({ id:start+i, type:'def',  text:c.back||c.answer,    cardIdx:start+i })))
    setTiles([...terms, ...defs])
    setMatched([])
    setSelected(null)
    setBatchIdx(bIdx)
    if (!startTime) setStartTime(Date.now())
  }

  function handleTile(tile) {
    if (matched.includes(tile.cardIdx)) return
    if (wrong === tile.id) return

    if (!selected) {
      setSelected(tile)
      return
    }

    // Can't select two of same type
    if (selected.type === tile.type) {
      setSelected(tile)
      return
    }

    // Check if they match
    if (selected.cardIdx === tile.cardIdx) {
      // Correct match
      const newMatched = [...matched, tile.cardIdx]
      setMatched(newMatched)
      setSelected(null)

      // Check if batch complete
      const batchStart = batchIdx * BATCH
      const batchCards = cards.slice(batchStart, batchStart + BATCH)
      if (newMatched.length === batchCards.length) {
        setTimeout(() => {
          const nextBatch = batchIdx + 1
          const nextStart = nextBatch * BATCH
          setBatchesDone(b => b+1)
          if (nextStart >= cards.length) { setDone(true); return }
          loadBatch(nextBatch)
        }, 600)
      }
    } else {
      // Wrong — flash both red briefly
      setWrong(tile.id)
      setTimeout(() => { setWrong(null); setSelected(null) }, 700)
    }
  }

  const formatTime = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

  if (done) {
    return (
      <div style={{ padding:'28px 24px', maxWidth:500, margin:'0 auto', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
        <div style={{ textAlign:'center', padding:'32px 24px', background:'rgba(52,211,153,0.07)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:16, marginBottom:20 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" style={{ margin:'0 auto 14px', display:'block' }}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
          <div style={{ fontSize:21, fontWeight:900, color:'var(--c-t1)', marginBottom:5, letterSpacing:'-.03em' }}>All matched!</div>
          <div style={{ fontSize:14, color:'var(--c-t2)', marginBottom:8 }}>{cards.length} cards · {topic}</div>
          <div style={{ fontSize:24, fontWeight:800, color:'#34d399' }}>{formatTime(elapsed)}</div>
          <div style={{ fontSize:11, color:'var(--c-t3)', marginTop:2 }}>Total time</div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={()=>{ setBatchIdx(0);setMatched([]);setSelected(null);setDone(false);setElapsed(0);setStartTime(null);setBatchesDone(0);loadBatch(0) }} style={{ flex:1, padding:'11px 0', borderRadius:10, border:'1px solid rgba(52,211,153,0.3)', background:'rgba(52,211,153,0.08)', color:'#34d399', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>↺ Play again</button>
          <button onClick={onBack} style={{ flex:1, padding:'11px 0', borderRadius:10, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t2)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Switch mode</button>
        </div>
      </div>
    )
  }

  const batchStart = batchIdx * BATCH
  const batchTotal = Math.min(BATCH, cards.length - batchStart)
  const overallProgress = ((batchesDone * BATCH) + matched.length) / cards.length

  return (
    <div style={{ padding:'28px 24px', maxWidth:780, margin:'0 auto', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'#34d399', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>Match mode</div>
          <div style={{ fontSize:13, color:'var(--c-t2)' }}>{topic} · {matched.length}/{batchTotal} matched this round</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--c-t2)', fontVariantNumeric:'tabular-nums' }}>{formatTime(elapsed)}</div>
          <button onClick={onBack} style={{ fontSize:12, color:'rgba(255,255,255,0.3)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>← Change mode</button>
        </div>
      </div>

      {/* Overall progress */}
      <div style={{ height:3, background:'var(--c-line)', borderRadius:2, overflow:'hidden', marginBottom:20 }}>
        <div style={{ height:'100%', width:`${overallProgress*100}%`, background:'#10b981', borderRadius:2, transition:'width .4s' }}/>
      </div>

      {/* Match grid — terms left, definitions right */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {/* Terms column */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>Terms</div>
          {tiles.filter(t=>t.type==='term').map(tile => {
            const isMatched  = matched.includes(tile.cardIdx)
            const isSelected = selected?.id === tile.id
            const isWrong    = wrong === tile.id
            return (
              <button key={tile.id} onClick={() => handleTile(tile)} disabled={isMatched}
                style={{ padding:'14px 16px', borderRadius:11, fontSize:13, fontWeight:600, textAlign:'left', cursor:isMatched?'default':'pointer', fontFamily:'inherit', lineHeight:1.5, transition:'all .15s',
                  background: isMatched?'rgba(52,211,153,0.07)': isWrong?'rgba(239,68,68,0.1)': isSelected?'rgba(52,211,153,0.12)':'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${isMatched?'rgba(52,211,153,0.3)': isWrong?'rgba(239,68,68,0.35)': isSelected?'rgba(52,211,153,0.5)':'rgba(255,255,255,0.09)'}`,
                  color: isMatched?'rgba(52,211,153,0.5)': isWrong?'#f87171': isSelected?'#34d399':'var(--c-t1)',
                  opacity: isMatched ? 0.5 : 1,
                  textDecoration: isMatched ? 'line-through' : 'none',
                }}>
                {tile.text}
              </button>
            )
          })}
        </div>

        {/* Definitions column */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>Definitions</div>
          {tiles.filter(t=>t.type==='def').map(tile => {
            const isMatched  = matched.includes(tile.cardIdx)
            const isSelected = selected?.id === tile.id
            const isWrong    = wrong === tile.id
            return (
              <button key={tile.id} onClick={() => handleTile(tile)} disabled={isMatched}
                style={{ padding:'14px 16px', borderRadius:11, fontSize:13, fontWeight:500, textAlign:'left', cursor:isMatched?'default':'pointer', fontFamily:'inherit', lineHeight:1.5, transition:'all .15s',
                  background: isMatched?'rgba(52,211,153,0.07)': isWrong?'rgba(239,68,68,0.1)': isSelected?'rgba(59,130,246,0.12)':'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${isMatched?'rgba(52,211,153,0.3)': isWrong?'rgba(239,68,68,0.35)': isSelected?'rgba(59,130,246,0.5)':'rgba(255,255,255,0.07)'}`,
                  color: isMatched?'rgba(52,211,153,0.5)': isWrong?'#f87171': isSelected?'#60a5fa':'var(--c-t2)',
                  opacity: isMatched ? 0.5 : 1,
                  textDecoration: isMatched ? 'line-through' : 'none',
                }}>
                {tile.text}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ marginTop:16, fontSize:12, color:'rgba(255,255,255,0.22)', textAlign:'center' }}>
        Click a term, then its matching definition
      </div>
    </div>
  )
}

// ── BLURT MODE ────────────────────────────────────────────────────────────────

function BlurtMode({ cards, topic, onBack }) {
  const [phase,     setPhase]     = useState('write')  // 'write' | 'grading' | 'results'
  const [blurtText, setBlurtText] = useState('')
  const [feedback,  setFeedback]  = useState(null)    // { covered, missed, score }
  const [elapsed,   setElapsed]   = useState(0)
  const [timerOn,   setTimerOn]   = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (timerOn) {
      timerRef.current = setInterval(() => setElapsed(e => e+1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [timerOn])

  function startTimer() { if (!timerOn) setTimerOn(true) }

  async function submit() {
    if (!blurtText.trim()) return
    setTimerOn(false)
    setPhase('grading')

    const allFronts = cards.map(c => c.front||c.question).join('\n')
    const allBacks  = cards.map(c => c.back||c.answer).join('\n')

    try {
      let raw = ''
      await novaStream(
        [{ role:'user', content:`The student is reviewing: "${topic}"\n\nAll key terms and definitions:\n${cards.map(c=>`- ${c.front||c.question}: ${c.back||c.answer}`).join('\n')}\n\nStudent wrote from memory:\n"${blurtText}"\n\nFor each key concept, determine if the student covered it (COVERED), partially covered it (PARTIAL), or missed it (MISSED).\n\nRespond ONLY as JSON like this (no backticks, no preamble):\n{"score":75,"covered":["concept1","concept2"],"partial":["concept3"],"missed":["concept4","concept5"],"feedback":"One sentence of overall feedback."}` }],
        chunk => { raw += chunk },
        { systemOverride: 'You are a study assistant evaluating free recall. Be fair but accurate. Respond only with JSON.' }
      )
      // Strip any accidental markdown fences
      const cleaned = raw.replace(/```json|```/g, '').trim()
      const parsed  = JSON.parse(cleaned)
      setFeedback(parsed)
      setPhase('results')
    } catch(e) {
      // Fallback: simple keyword matching
      const covered = [], missed = []
      cards.forEach(c => {
        const front = (c.front||c.question||'').toLowerCase()
        if (blurtText.toLowerCase().includes(front.slice(0,10))) covered.push(c.front||c.question)
        else missed.push(c.front||c.question)
      })
      setFeedback({ score: Math.round((covered.length/cards.length)*100), covered, partial:[], missed, feedback:'Based on keyword matching.' })
      setPhase('results')
    }
  }

  const formatTime = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

  if (phase === 'grading') return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#a78bfa', animation:'nova-pulse .9s ease-in-out infinite', margin:'0 auto 16px' }}/>
        <div style={{ fontSize:15, fontWeight:600, color:'var(--c-t1)', marginBottom:4 }}>Nova is reviewing your blurt…</div>
        <div style={{ fontSize:13, color:'var(--c-t2)' }}>Comparing against {cards.length} concepts</div>
      </div>
    </div>
  )

  if (phase === 'results' && feedback) {
    return (
      <div style={{ padding:'28px 24px', maxWidth:660, margin:'0 auto', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
        {/* Score */}
        <div style={{ textAlign:'center', padding:'24px', background:'rgba(167,139,250,0.07)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:16, marginBottom:20 }}>
          <div style={{ fontSize:56, fontWeight:900, color:'#a78bfa', lineHeight:1, marginBottom:4 }}>{feedback.score}%</div>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--c-t1)', marginBottom:3 }}>Blurt score</div>
          <div style={{ fontSize:12, color:'var(--c-t2)' }}>{topic} · {formatTime(elapsed)} · {blurtText.trim().split(/\s+/).length} words written</div>
          {feedback.feedback && <div style={{ fontSize:13, color:'rgba(167,139,250,0.7)', marginTop:10, lineHeight:1.5 }}>{feedback.feedback}</div>}
        </div>

        {/* Results breakdown */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
          {[
            { label:'Covered', items:feedback.covered||[], color:'#34d399', bg:'rgba(52,211,153,0.07)', border:'rgba(52,211,153,0.2)' },
            { label:'Missed',  items:feedback.missed||[],  color:'#f87171', bg:'rgba(239,68,68,0.07)',  border:'rgba(239,68,68,0.2)'  },
          ].map(col => (
            <div key={col.label} style={{ background:col.bg, border:`1px solid ${col.border}`, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:11, fontWeight:800, color:col.color, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>{col.label} ({col.items.length})</div>
              {col.items.length === 0 ? (
                <div style={{ fontSize:12, color:'var(--c-t3)' }}>None</div>
              ) : (
                col.items.map((item,i) => (
                  <div key={i} style={{ fontSize:12, color:col.color, opacity:.8, marginBottom:4, display:'flex', alignItems:'flex-start', gap:6 }}>
                    <span style={{ flexShrink:0, marginTop:1 }}>{col.label==='Covered'?'✓':'✗'}</span>{item}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>

        {/* Partial */}
        {(feedback.partial||[]).length > 0 && (
          <div style={{ background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:12, padding:'14px 16px', marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'#fbbf24', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Partial ({feedback.partial.length})</div>
            {feedback.partial.map((item,i) => (
              <div key={i} style={{ fontSize:12, color:'#fbbf24', opacity:.8, marginBottom:4 }}>~ {item}</div>
            ))}
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={()=>{ setBlurtText(''); setPhase('write'); setElapsed(0); setFeedback(null); setTimerOn(false) }} style={{ flex:1, padding:'11px 0', borderRadius:10, border:'1px solid rgba(167,139,250,0.3)', background:'rgba(167,139,250,0.08)', color:'#a78bfa', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>↺ Try again</button>
          <button onClick={onBack} style={{ flex:1, padding:'11px 0', borderRadius:10, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t2)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Switch mode</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding:'28px 24px', maxWidth:660, margin:'0 auto', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'#a78bfa', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>Blurt mode</div>
          <div style={{ fontSize:13, color:'var(--c-t2)' }}>{topic} · {cards.length} concepts</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:timerOn?'#a78bfa':'var(--c-t3)', fontVariantNumeric:'tabular-nums' }}>{formatTime(elapsed)}</div>
          <button onClick={onBack} style={{ fontSize:12, color:'rgba(255,255,255,0.3)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>← Change mode</button>
        </div>
      </div>

      {/* Instructions */}
      <div style={{ background:'rgba(167,139,250,0.06)', border:'1px solid rgba(167,139,250,0.18)', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#c4b5fd', marginBottom:4 }}>The challenge</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', lineHeight:1.6 }}>Close your notes. In the text box below, write down everything you remember about <strong style={{ color:'rgba(255,255,255,0.6)' }}>{topic}</strong>. Don't peek — Nova will tell you what you covered and what you missed.</div>
      </div>

      {/* Blurt textarea */}
      <textarea
        value={blurtText}
        onChange={e => { setBlurtText(e.target.value); startTimer() }}
        placeholder={`Start typing everything you know about ${topic}…\n\nDon't worry about structure — just write. You have as much time as you need.`}
        rows={12}
        style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:12, padding:'14px 16px', fontSize:14, color:'#e2e8f0', outline:'none', resize:'vertical', fontFamily:'inherit', lineHeight:1.7, marginBottom:10 }}
      />

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.2)' }}>{blurtText.trim().split(/\s+/).filter(Boolean).length} words written</span>
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.15)' }}>Nova will score against {cards.length} concepts</span>
      </div>

      <button onClick={submit} disabled={!blurtText.trim()}
        style={{ width:'100%', padding:'13px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', fontSize:13, fontWeight:800, cursor:!blurtText.trim()?'not-allowed':'pointer', fontFamily:'inherit', opacity:!blurtText.trim()?.55:1, boxShadow:'0 4px 18px rgba(124,58,237,0.25)' }}>
        I'm done — grade my blurt →
      </button>
    </div>
  )
}

// ── Page wrapper ──────────────────────────────────────────────────────────────

export default function StudyModesPage() {
  const [deck,   setDeck]   = useState(null)  // { cards, topic }
  const [mode,   setMode]   = useState(null)  // null | 'write' | 'match' | 'blurt'
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('flashfo_study_modes')
    if (stored) {
      try {
        const { cards, topic } = JSON.parse(stored)
        if (cards?.length) { setDeck({ cards, topic: topic||'Deck' }); setLoaded(true); return }
      } catch(e) {}
    }
    setLoaded(true)
  }, [])

  if (!loaded) return null

  if (!deck) return (
    <div style={{ padding:'40px 24px', maxWidth:560, margin:'0 auto', textAlign:'center', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ fontSize:16, fontWeight:700, color:'var(--c-t1)', marginBottom:8 }}>No deck loaded</div>
      <div style={{ fontSize:13, color:'var(--c-t2)', marginBottom:20 }}>Go to Flashcards, generate or open a deck, then click "Study Modes".</div>
      <a href="/flashcards" style={{ textDecoration:'none', display:'inline-block', padding:'10px 20px', background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:10, fontSize:13, fontWeight:700, color:'#60a5fa' }}>Go to Flashcards</a>
    </div>
  )

  if (!mode) return <ModeSelector topic={deck.topic} cardCount={deck.cards.length} onSelect={setMode}/>
  if (mode === 'write') return <WriteMode  cards={deck.cards} topic={deck.topic} onBack={()=>setMode(null)}/>
  if (mode === 'match') return <MatchMode  cards={deck.cards} topic={deck.topic} onBack={()=>setMode(null)}/>
  if (mode === 'blurt') return <BlurtMode  cards={deck.cards} topic={deck.topic} onBack={()=>setMode(null)}/>
  return null
}
