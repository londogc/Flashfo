'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

// ─── CSS orb exactly from landing page ───────────────────────────────────────
const ORB_CSS = `
.nv-orb{border-radius:50%;background:radial-gradient(circle at 33% 33%,#c4b5fd,#7c3aed 40%,#4c1d95 70%,#08001a);position:relative;flex-shrink:0}
.nv-orb-breathe{animation:nv-breathe 3.5s ease-in-out infinite}
.nv-orb-think{animation:nv-think 0.8s ease-in-out infinite}
.nv-orb-gen{animation:nv-gen 0.4s ease-in-out infinite}
@keyframes nv-breathe{0%,100%{box-shadow:0 0 55px rgba(124,58,237,.7),0 0 120px rgba(109,40,217,.4),inset 0 0 45px rgba(196,181,253,.2);transform:scale(1)}50%{box-shadow:0 0 80px rgba(124,58,237,.9),0 0 170px rgba(109,40,217,.55),inset 0 0 65px rgba(196,181,253,.32);transform:scale(1.05)}}
@keyframes nv-think{0%,100%{box-shadow:0 0 80px rgba(124,58,237,1),0 0 160px rgba(109,40,217,.7),inset 0 0 70px rgba(196,181,253,.35);transform:scale(1)}50%{box-shadow:0 0 110px rgba(167,139,250,1),0 0 220px rgba(124,58,237,.85),inset 0 0 95px rgba(196,181,253,.5);transform:scale(1.08)}}
@keyframes nv-gen{0%,100%{box-shadow:0 0 110px rgba(196,181,253,1),0 0 240px rgba(139,92,246,.9),inset 0 0 90px rgba(255,255,255,.35);transform:scale(1.03)}50%{box-shadow:0 0 150px rgba(255,255,255,.85),0 0 320px rgba(167,139,250,1),inset 0 0 120px rgba(255,255,255,.5);transform:scale(1.1)}}
.nv-gloss{position:absolute;top:18%;left:23%;width:52%;height:37%;background:radial-gradient(ellipse at 42% 42%,rgba(255,255,255,.26),transparent 70%);border-radius:50%;pointer-events:none}
.nv-ring{position:absolute;top:50%;left:50%;border-radius:50%;border-style:solid;animation:nv-orbit linear infinite;transform-origin:center}
@keyframes nv-orbit{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}
.nv-ring::before{content:'';position:absolute;top:0;left:50%;transform:translate(-50%,-50%);border-radius:50%}
.nv-r1{border-width:1px;border-color:rgba(129,140,248,.22);animation-duration:9s}
.nv-r1::before{width:8px;height:8px;background:#818cf8;box-shadow:0 0 12px #818cf8,0 0 24px rgba(129,140,248,.5)}
.nv-r2{border-width:1px;border-color:rgba(167,139,250,.14);animation-duration:14s;animation-direction:reverse}
.nv-r2::before{width:6px;height:6px;background:#a78bfa;box-shadow:0 0 10px #a78bfa}
.nv-r2::after{content:'';position:absolute;bottom:0;left:50%;transform:translate(-50%,50%);width:4px;height:4px;border-radius:50%;background:#6366f1;box-shadow:0 0 8px #6366f1}
.nv-r3{border-width:1px;border-color:rgba(99,102,241,.08);animation-duration:21s}
.nv-r3::before{width:5px;height:5px;background:#c4b5fd;box-shadow:0 0 8px #c4b5fd}
.nv-sm-wrap{animation:nv-breathe-sm 3.5s ease-in-out infinite}
@keyframes nv-breathe-sm{0%,100%{box-shadow:0 0 8px rgba(124,58,237,.9),0 0 18px rgba(109,40,217,.6),inset 0 0 8px rgba(196,181,253,.3);transform:scale(1)}50%{box-shadow:0 0 12px rgba(124,58,237,1),0 0 28px rgba(109,40,217,.8),inset 0 0 12px rgba(196,181,253,.45);transform:scale(1.06)}}
`

function Orb({ size = 36, state = 'idle', rings = false, ringScale = 1 }) {
  const cls = state === 'thinking' ? 'nv-orb nv-orb-think'
            : state === 'generating' ? 'nv-orb nv-orb-gen'
            : 'nv-orb nv-orb-breathe'
  const r1 = Math.round(size * 1.55 * ringScale)
  const r2 = Math.round(size * 2.05 * ringScale)
  const r3 = Math.round(size * 2.45 * ringScale)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div className={cls} style={{ width: size, height: size }}>
        <div className="nv-gloss" />
      </div>
      {rings && <>
        <div className="nv-ring nv-r1" style={{ width: r1, height: r1 }} />
        <div className="nv-ring nv-r2" style={{ width: r2, height: r2 }} />
        <div className="nv-ring nv-r3" style={{ width: r3, height: r3 }} />
      </>}
    </div>
  )
}

export default function NovaPage() {
  const [novaState, setNovaState] = useState('idle')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [greeting, setGreeting] = useState(true)
  const msgsRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'nova-orb-css'
    style.textContent = ORB_CSS
    document.head.appendChild(style)
    return () => document.getElementById('nova-orb-css')?.remove()
  }, [])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [messages, loading])

  const send = useCallback(async (text) => {
    if (!text?.trim() || loading) return
    const userMsg = text.trim()
    setInput('')
    setGreeting(false)
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)
    setNovaState('thinking')

    try {
      const history = messages.map(m => ({ role: m.role, text: m.content }))
      const res = await fetch('/api/nova-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...history, { role: 'user', text: userMsg }] }),
      })

      if (!res.ok) throw new Error('Stream failed')
      setNovaState('generating')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: full }
          return updated
        })
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I ran into an issue. Please try again." }])
    } finally {
      setLoading(false)
      setNovaState('idle')
      inputRef.current?.focus()
    }
  }, [loading, messages])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'transparent',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* ── TOPBAR ── */}
      <div style={{
        flexShrink: 0,
        padding: '14px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(5,7,9,0.6)',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Header orb with 2 small rings */}
        <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
          <Orb size={32} state={novaState} />
          <div className="nv-ring nv-r1" style={{ width: 48, height: 48, top: '50%', left: '50%' }} />
          <div className="nv-ring nv-r2" style={{ width: 54, height: 54, top: '50%', left: '50%' }} />
          {/* Status dot */}
          <div style={{
            position: 'absolute', bottom: 8, right: 6, width: 9, height: 9,
            borderRadius: '50%', border: '2px solid var(--c-bg, #050709)',
            background: novaState === 'idle' ? '#10b981' : novaState === 'thinking' ? '#fbbf24' : '#818cf8',
            boxShadow: `0 0 8px ${novaState === 'idle' ? 'rgba(16,185,129,.8)' : novaState === 'thinking' ? 'rgba(251,191,36,.8)' : 'rgba(129,140,248,.8)'}`,
            zIndex: 10,
          }} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-.02em' }}>Nova</div>
          <div style={{
            fontSize: 11, fontWeight: 500,
            color: novaState === 'idle' ? '#10b981' : novaState === 'thinking' ? '#fbbf24' : '#818cf8',
          }}>
            {novaState === 'idle' ? 'Online · ready to help' : novaState === 'thinking' ? 'Thinking...' : 'Generating...'}
          </div>
        </div>
      </div>

      {/* ── MESSAGES ── */}
      <div ref={msgsRef} style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 16px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {/* Greeting */}
        {greeting && (
          <div style={{ textAlign: 'center', padding: '20px 16px 8px', flexShrink: 0 }}>
            <div style={{
              fontSize: 20, fontWeight: 900, letterSpacing: '-.04em', marginBottom: 6,
              background: 'linear-gradient(135deg,#fff,#a5b4fc)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>What are we working on?</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.32)', lineHeight: 1.6 }}>
              Ask me anything — I'll explain, build flashcards, or quiz you on it.
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
            gap: 8,
            alignItems: 'flex-start',
          }}>
            <div style={{
              maxWidth: '82%',
              padding: '11px 14px',
              borderRadius: m.role === 'user' ? '18px 18px 5px 18px' : '18px 18px 18px 5px',
              background: m.role === 'user'
                ? 'linear-gradient(135deg,rgba(79,70,229,.28),rgba(109,40,217,.22))'
                : 'rgba(8,12,22,.92)',
              border: `1px solid ${m.role === 'user' ? 'rgba(99,102,241,.3)' : 'rgba(255,255,255,.09)'}`,
              color: 'rgba(255,255,255,.88)',
              fontSize: 14,
              lineHeight: 1.6,
              backdropFilter: 'blur(12px)',
              whiteSpace: 'pre-wrap',
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && novaState === 'thinking' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: '18px 18px 18px 5px',
              background: 'rgba(8,12,22,.92)',
              border: '1px solid rgba(255,255,255,.09)',
              display: 'flex', gap: 5, alignItems: 'center',
            }}>
              {[0,1,2].map(j => (
                <div key={j} style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'rgba(129,140,248,.7)',
                  animation: 'nv-bounce .9s ease-in-out infinite',
                  animationDelay: `${j * .15}s`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── INPUT BAR ── */}
      <div style={{
        flexShrink: 0,
        padding: '10px 14px 14px',
        borderTop: '1px solid rgba(255,255,255,.07)',
        background: 'rgba(5,7,9,.85)',
        backdropFilter: 'blur(24px)',
      }}>
        <div style={{ display: 'flex', gap: 9, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask Nova anything..."
            rows={1}
            disabled={loading}
            style={{
              flex: 1, minHeight: 42, maxHeight: 110,
              borderRadius: 21,
              background: 'rgba(255,255,255,.06)',
              border: '1.5px solid rgba(255,255,255,.1)',
              padding: '11px 16px',
              fontSize: 14, color: '#e2e8f0',
              fontFamily: 'inherit', outline: 'none', resize: 'none', lineHeight: 1.4,
              transition: 'border-color .2s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(129,140,248,.4)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,.1)'}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px' }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            style={{
              width: 42, height: 42, borderRadius: '50%', border: 'none', flexShrink: 0,
              background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? .5 : 1,
              boxShadow: '0 4px 16px rgba(99,102,241,.4)',
              transition: 'all .15s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes nv-bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}
        textarea::placeholder{color:rgba(255,255,255,.2)}
        textarea:disabled{opacity:.6}
      `}</style>
    </div>
  )
}
