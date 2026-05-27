'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const MODES = [
  { id: 'addition',       label: 'Addition',       symbol: '+', color: '#a5b4fc', bg: 'rgba(99,102,241,0.06)',  border: 'rgba(99,102,241,0.3)'  },
  { id: 'subtraction',    label: 'Subtraction',     symbol: '−', color: '#fda4af', bg: 'rgba(225,29,72,0.06)',   border: 'rgba(225,29,72,0.3)'   },
  { id: 'multiplication', label: 'Multiplication',  symbol: '×', color: '#fcd34d', bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.3)'  },
  { id: 'division',       label: 'Division',        symbol: '÷', color: '#5eead4', bg: 'rgba(29,158,117,0.06)', border: 'rgba(29,158,117,0.3)'  },
]

const GRID_SIZE = 8  // 8 problems visible at once (2 cols × 4 rows)
const TIMER_SECONDS = 60

// ── Problem generator ─────────────────────────────────────────────────────────
function generateProblem(mode, grade) {
  const g = parseInt(grade, 10) || 5
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

  if (mode === 'addition') {
    const max = g <= 2 ? 9 : g <= 4 ? 20 : 50
    const a = rand(1, max), b = rand(1, max)
    return { question: `${a} + ${b}`, answer: a + b }
  }
  if (mode === 'subtraction') {
    const max = g <= 2 ? 9 : g <= 4 ? 20 : 50
    const a = rand(2, max), b = rand(1, a)
    return { question: `${a} − ${b}`, answer: a - b }
  }
  if (mode === 'multiplication') {
    const max = g <= 4 ? 9 : g <= 6 ? 12 : 15
    const a = rand(2, max), b = rand(2, max)
    return { question: `${a} × ${b}`, answer: a * b }
  }
  if (mode === 'division') {
    const max = g <= 4 ? 9 : 12
    const b = rand(2, max), a = b * rand(2, max)
    return { question: `${a} ÷ ${b}`, answer: a / b }
  }
  // Mixed
  const modes = ['addition', 'subtraction', 'multiplication', 'division']
  return generateProblem(modes[rand(0, 3)], grade)
}

function generateGrid(mode, grade) {
  return Array.from({ length: GRID_SIZE }, () => generateProblem(mode, grade))
}

// ── Hydration guard ───────────────────────────────────────────────────────────
export default function MinuteMathPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return <div style={{ position: 'fixed', inset: 0, background: '#0f0f1a' }} />
  return <MinuteMathUI />
}

function MinuteMathUI() {
  const router = useRouter()

  const [child, setChild]         = useState(null)
  const [screen, setScreen]       = useState('picker')   // 'picker' | 'game' | 'results'
  const [mode, setMode]           = useState(null)
  const [problems, setProblems]   = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [answers, setAnswers]     = useState([])         // { value, correct, submitted } per cell
  const [currentInput, setCurrentInput] = useState('')
  const [timeLeft, setTimeLeft]   = useState(TIMER_SECONDS)
  const [score, setScore]         = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [recentDots, setRecentDots] = useState([])       // 'correct' | 'wrong'
  const [personalBests, setPersonalBests] = useState({})
  const [isNewBest, setIsNewBest] = useState(false)
  const [wrongProblems, setWrongProblems] = useState([]) // track which problems were wrong

  const timerRef = useRef(null)

  // ── Load child + personal bests ───────────────────────────────────────────
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
      const bests = JSON.parse(localStorage.getItem(`flashfo_math_bests_${session.childId}`) || '{}')
      setPersonalBests(bests)
    } catch { router.replace('/kids-login') }
  }, [])

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'game') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); endGame(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [screen])

  // ── Keyboard input ────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'game') return
    const handler = (e) => {
      if (e.key >= '0' && e.key <= '9') appendDigit(e.key)
      else if (e.key === 'Backspace') deleteDigit()
      else if (e.key === 'Enter') submitAnswer()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [screen, currentInput, activeIdx, problems, score])

  // ── Start game ────────────────────────────────────────────────────────────
  function startGame(selectedMode) {
    const grade = child?.gradeLevel || 5
    const grid = generateGrid(selectedMode.id, grade)
    setMode(selectedMode)
    setProblems(grid)
    setAnswers(Array(GRID_SIZE).fill(null))
    setActiveIdx(0)
    setCurrentInput('')
    setScore(0)
    setWrongCount(0)
    setRecentDots([])
    setWrongProblems([])
    setTimeLeft(TIMER_SECONDS)
    setScreen('game')
  }

  // ── Input handlers ────────────────────────────────────────────────────────
  function appendDigit(digit) {
    setCurrentInput(prev => prev.length < 4 ? prev + digit : prev)
  }

  function deleteDigit() {
    setCurrentInput(prev => prev.slice(0, -1))
  }

  function submitAnswer() {
    if (!currentInput || activeIdx >= problems.length) return
    const problem = problems[activeIdx]
    const userAnswer = parseInt(currentInput, 10)
    const correct = userAnswer === problem.answer

    // Update answers array
    setAnswers(prev => {
      const updated = [...prev]
      updated[activeIdx] = { value: currentInput, correct, submitted: true }
      return updated
    })

    // Update score and dots
    if (correct) {
      setScore(s => s + 1)
    } else {
      setWrongCount(w => w + 1)
      setWrongProblems(prev => [...prev, { question: problem.question, correct: problem.answer }])
    }
    setRecentDots(prev => [...prev.slice(-5), correct ? 'correct' : 'wrong'])
    setCurrentInput('')

    // Advance to next cell or refresh grid
    const nextIdx = activeIdx + 1
    if (nextIdx >= GRID_SIZE) {
      // Refresh grid with new problems
      const grade = child?.gradeLevel || 5
      const newGrid = generateGrid(mode.id, grade)
      setProblems(newGrid)
      setAnswers(Array(GRID_SIZE).fill(null))
      setActiveIdx(0)
    } else {
      setActiveIdx(nextIdx)
    }
  }

  // ── End game ──────────────────────────────────────────────────────────────
  function endGame() {
    clearInterval(timerRef.current)

    // Check personal best
    const modeId = mode?.id || 'mixed'
    const prevBest = personalBests[modeId] || 0
    const newBest = score > prevBest

    if (newBest && child) {
      const updated = { ...personalBests, [modeId]: score }
      setPersonalBests(updated)
      localStorage.setItem(`flashfo_math_bests_${child.childId}`, JSON.stringify(updated))
    }

    setIsNewBest(newBest)
    setScreen('results')
  }

  // Manual end (back button during game)
  function handleBack() {
    if (screen === 'game') {
      clearInterval(timerRef.current)
      endGame()
    } else if (screen === 'results') {
      setScreen('picker')
    } else {
      router.push('/kids')
    }
  }

  // Timer ring progress
  const timerPct  = timeLeft / TIMER_SECONDS
  const timerCirc = 119.4
  const timerOffset = timerCirc * (1 - timerPct)
  const timerColor = timeLeft > 20 ? '#fcd34d' : timeLeft > 10 ? '#f97316' : '#e11d48'

  const accuracy = (score + wrongCount) > 0 ? Math.round((score / (score + wrongCount)) * 100) : 0
  const pb = mode ? (personalBests[mode.id] || 0) : 0

  // Most wrong problem
  const mostWrong = wrongProblems.length > 0 ? wrongProblems[0] : null

  const s = {
    page: { minHeight: '100vh', background: '#0f0f1a', fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column' },
    topbar: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderBottom: '0.5px solid rgba(255,255,255,0.07)', flexShrink: 0 },
    backBtn: { width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', flexShrink: 0, fontSize: 14, color: 'rgba(255,255,255,0.6)', fontFamily: 'system-ui,sans-serif' },
    topTitle: { fontSize: 13, fontWeight: 500, color: '#fff' },
    body: { padding: '14px 12px', maxWidth: 480, margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },

    // Picker
    pickerHeader: { textAlign: 'center', marginBottom: 16 },
    pickerTitle: { fontSize: 16, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em', marginBottom: 4 },
    pickerSub: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
    modeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 },
    modeCard: (m) => ({ borderRadius: 14, padding: '14px 12px', border: `0.5px solid ${m.border}`, cursor: 'pointer', textAlign: 'center', background: m.bg }),
    modeSymbol: (m) => ({ fontSize: 26, fontWeight: 300, marginBottom: 6, color: m.color }),
    modeName: { fontSize: 12, fontWeight: 500, color: '#fff', marginBottom: 2 },
    modePb: { fontSize: 10, color: 'rgba(255,255,255,0.3)' },
    mixedBtn: { width: '100%', padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'system-ui,sans-serif' },

    // Game
    gameHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    timerRing: { position: 'relative', width: 46, height: 46, flexShrink: 0 },
    timerNum: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 500, color: timerColor },
    scoreCenter: { textAlign: 'center' },
    scoreBig: { fontSize: 20, fontWeight: 500, color: '#fff', lineHeight: 1 },
    scoreSub: { fontSize: 10, color: 'rgba(255,255,255,0.3)' },
    scorePb: { fontSize: 10, color: 'rgba(245,158,11,0.55)' },
    recentRow: { display: 'flex', gap: 4, alignItems: 'center' },
    recentDot: (type) => ({ width: 8, height: 8, borderRadius: '50%', background: type === 'correct' ? '#1D9E75' : type === 'wrong' ? '#e11d48' : 'rgba(255,255,255,0.15)' }),
    qGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 },
    qCell: (state) => {
      if (state === 'active') return { borderRadius: 10, padding: '10px 8px', border: '0.5px solid rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.08)', position: 'relative' }
      if (state === 'correct') return { borderRadius: 10, padding: '10px 8px', border: '0.5px solid rgba(29,158,117,0.4)', background: 'rgba(29,158,117,0.07)', position: 'relative' }
      if (state === 'wrong') return { borderRadius: 10, padding: '10px 8px', border: '0.5px solid rgba(225,29,72,0.35)', background: 'rgba(225,29,72,0.06)', position: 'relative' }
      return { borderRadius: 10, padding: '10px 8px', border: '0.5px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', position: 'relative' }
    },
    qEq: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 5, fontWeight: 500 },
    qAnswer: (state) => {
      const base = { height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', padding: '0 7px', fontSize: 12 }
      if (state === 'active') return { ...base, background: 'rgba(99,102,241,0.12)', border: '0.5px solid rgba(99,102,241,0.4)', color: '#a5b4fc' }
      if (state === 'correct') return { ...base, background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.3)', color: '#5eead4' }
      if (state === 'wrong') return { ...base, background: 'rgba(225,29,72,0.08)', border: '0.5px solid rgba(225,29,72,0.3)', color: '#fda4af' }
      return { ...base, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'transparent' }
    },
    cursor: { width: 1.5, height: 13, background: '#a5b4fc', borderRadius: 999, marginLeft: 1, animation: 'blink 1s infinite' },
    cellBadge: (type) => ({ position: 'absolute', top: 6, right: 6, width: 14, height: 14, borderRadius: '50%', background: type === 'correct' ? '#1D9E75' : '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff' }),
    correctVal: { fontSize: 10, color: 'rgba(29,158,117,0.6)', marginTop: 2 },
    numpad: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 },
    nmBtn: (wide, del) => ({ padding: '8px 4px', borderRadius: 8, background: del ? 'rgba(225,29,72,0.08)' : 'rgba(255,255,255,0.06)', border: `0.5px solid ${del ? 'rgba(225,29,72,0.18)' : 'rgba(255,255,255,0.08)'}`, fontSize: 14, fontWeight: 500, color: del ? '#fda4af' : '#fff', cursor: 'pointer', textAlign: 'center', fontFamily: 'system-ui,sans-serif', ...(wide ? { gridColumn: 'span 2' } : {}) }),

    // Results
    resultIcon: { width: 52, height: 52, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '0.5px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px auto 12px', fontSize: 22 },
    resultScore: { textAlign: 'center', marginBottom: 14 },
    resultNum: { fontSize: 48, fontWeight: 500, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em' },
    resultLbl: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
    pbBanner: { background: 'rgba(245,158,11,0.08)', border: '0.5px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '8px 10px', textAlign: 'center', marginBottom: 10 },
    pbText: { fontSize: 12, color: '#fcd34d', fontWeight: 500 },
    pbSub: { fontSize: 10, color: 'rgba(245,158,11,0.5)', marginTop: 2 },
    statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 },
    statCard: { background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '8px 6px', textAlign: 'center' },
    statVal: (color) => ({ fontSize: 18, fontWeight: 500, color, lineHeight: 1 }),
    statLbl: { fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
    novaResult: { display: 'flex', gap: 8, background: 'rgba(29,158,117,0.07)', border: '0.5px solid rgba(29,158,117,0.18)', borderRadius: 12, padding: '9px 10px', marginBottom: 12, alignItems: 'flex-start' },
    novaOrb: { width: 22, height: 22, borderRadius: 7, background: 'linear-gradient(135deg,#0d9488,#1D9E75)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11 },
    novaText: { fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 },
    novaSpan: { color: '#5eead4' },
    tryBtn: { width: '100%', padding: 11, borderRadius: 12, background: '#6366f1', border: 'none', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'system-ui,sans-serif', marginBottom: 6 },
    homeBtn: { width: '100%', padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui,sans-serif' },
  }

  if (!child) return <div style={s.page} />

  // ── Nova feedback message ─────────────────────────────────────────────────
  function novaFeedback() {
    if (score === 0) return `${score} correct. Let's try again. Take your time with each one.`
    if (isNewBest && mostWrong) return `New best! You did get ${mostWrong.question} wrong though. That one is worth drilling.`
    if (isNewBest) return `New best! Great work. Can you beat it again?`
    if (mostWrong) return `${score} correct. You got ${mostWrong.question} wrong. The answer is ${mostWrong.correct}. Worth practising that one.`
    return `${score} correct. Your best is ${pb}. ${score >= pb ? 'Keep it up!' : 'You can beat your best!'}`
  }

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <button style={s.backBtn} onClick={handleBack}>←</button>
        <span style={s.topTitle}>
          {screen === 'picker' ? 'Minute Math' : screen === 'results' ? "Time's up!" : mode?.label || 'Minute Math'}
        </span>
      </div>

      <div style={s.body}>

        {/* ── PICKER ── */}
        {screen === 'picker' && (
          <>
            <div style={s.pickerHeader}>
              <div style={s.pickerTitle}>60 seconds. How many can you get?</div>
              <div style={s.pickerSub}>Grade {child?.gradeLevel || 5} · difficulty auto-set</div>
            </div>
            <div style={s.modeGrid}>
              {MODES.map(m => (
                <div key={m.id} style={s.modeCard(m)} onClick={() => startGame(m)}>
                  <div style={s.modeSymbol(m)}>{m.symbol}</div>
                  <div style={s.modeName}>{m.label}</div>
                  <div style={s.modePb}>Best: {personalBests[m.id] || 0}</div>
                </div>
              ))}
            </div>
            <button
              style={s.mixedBtn}
              onClick={() => startGame({ id: 'mixed', label: 'Mixed', symbol: '?', color: '#fff', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' })}
            >
              <span style={{ color: '#fff' }}>Mixed</span> · all four combined · Best: {personalBests['mixed'] || 0}
            </button>
          </>
        )}

        {/* ── GAME ── */}
        {screen === 'game' && (
          <>
            <div style={s.gameHeader}>
              <div style={s.timerRing}>
                <svg width="46" height="46" viewBox="0 0 46 46" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="23" cy="23" r="19" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3.5" />
                  <circle cx="23" cy="23" r="19" fill="none" stroke={timerColor} strokeWidth="3.5"
                    strokeDasharray={timerCirc} strokeDashoffset={timerOffset} strokeLinecap="round" />
                </svg>
                <div style={s.timerNum}>{timeLeft}</div>
              </div>

              <div style={s.scoreCenter}>
                <div style={s.scoreBig}>{score}</div>
                <div style={s.scoreSub}>correct</div>
                <div style={s.scorePb}>Best: {pb}</div>
              </div>

              <div style={s.recentRow}>
                {Array.from({ length: 6 }).map((_, i) => {
                  const dot = recentDots[recentDots.length - 6 + i]
                  return <div key={i} style={s.recentDot(dot)} />
                })}
              </div>
            </div>

            <div style={s.qGrid}>
              {problems.map((problem, i) => {
                const ans = answers[i]
                const isActive = i === activeIdx
                const state = isActive ? 'active' : ans?.submitted ? (ans.correct ? 'correct' : 'wrong') : 'empty'

                return (
                  <div key={i} style={s.qCell(state)}>
                    {ans?.submitted && (
                      <div style={s.cellBadge(ans.correct ? 'correct' : 'wrong')}>
                        {ans.correct ? '✓' : '✗'}
                      </div>
                    )}
                    <div style={s.qEq}>{problem.question}</div>
                    <div style={s.qAnswer(state)}>
                      {isActive ? (
                        <span style={{ color: '#a5b4fc', display: 'flex', alignItems: 'center' }}>
                          {currentInput}
                          <span style={s.cursor} />
                        </span>
                      ) : ans?.submitted ? (
                        <span>{ans.value}</span>
                      ) : null}
                    </div>
                    {ans?.submitted && !ans.correct && (
                      <div style={s.correctVal}>answer: {problem.answer}</div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={s.numpad}>
              {['1','2','3','4','5','6','7','8','9'].map(d => (
                <button key={d} style={s.nmBtn(false, false)} onClick={() => appendDigit(d)}>{d}</button>
              ))}
              <button style={s.nmBtn(true, false)} onClick={() => { appendDigit('0'); }}>0</button>
              <button style={s.nmBtn(false, true)} onClick={deleteDigit}>⌫</button>
            </div>

            <style>{`@keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}`}</style>
          </>
        )}

        {/* ── RESULTS ── */}
        {screen === 'results' && (
          <>
            <div style={s.resultIcon}>🏆</div>
            <div style={s.resultScore}>
              <div style={s.resultNum}>{score}</div>
              <div style={s.resultLbl}>correct · {mode?.label}</div>
            </div>

            {isNewBest && (
              <div style={s.pbBanner}>
                <div style={s.pbText}>New personal best!</div>
                <div style={s.pbSub}>Previous best was {pb === score ? 0 : pb}</div>
              </div>
            )}

            <div style={s.statsGrid}>
              <div style={s.statCard}>
                <div style={s.statVal('#5eead4')}>{score}</div>
                <div style={s.statLbl}>correct</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statVal('#fda4af')}>{wrongCount}</div>
                <div style={s.statLbl}>wrong</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statVal('#fff')}>{accuracy}%</div>
                <div style={s.statLbl}>accuracy</div>
              </div>
            </div>

            <div style={s.novaResult}>
              <div style={s.novaOrb}>✨</div>
              <div style={s.novaText}>
                <span style={s.novaSpan}>Nova: </span>{novaFeedback()}
              </div>
            </div>

            <button style={s.tryBtn} onClick={() => startGame(mode)}>Try again</button>
            <button style={s.homeBtn} onClick={() => router.push('/kids')}>Back to home</button>
          </>
        )}

      </div>
    </div>
  )
}
