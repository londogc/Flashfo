'use client'
import { useState, useRef, useEffect } from 'react'

const MODES = [
  { id: 'explain',  label: 'Explain',     icon: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 3v5m0 2.5v.5',  fn: 'explainSimplyFromText',     args: t => [t, 'English'] },
  { id: 'summary',  label: 'Summarize',   icon: 'M2 3h12v2.5H2zm0 4h8v2.5H2zm0 4h10v2H2',         fn: 'summarizeText',             args: t => [t, 'paragraph', 300, 'English'] },
  { id: 'study',    label: 'Study Guide', icon: 'M2 3h4v12H2zm5-2h4v16H7zm5 2h4v12h-4z',           fn: 'generateStudyGuideFromText', args: t => [t, 'English'] },
]

export default function NovaPage() {
  const [mode, setMode]       = useState(MODES[0])
  const [messages, setMessages] = useState([
    { role: 'nova', text: "Hi! I'm Nova, your AI study companion. Ask me anything — I can explain concepts, summarize notes, build study guides, and adapt to your learning style. What are we studying today?" }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text }])
    setLoading(true)
    try {
      const res = await fetch('/api/rpc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: mode.fn, args: mode.args(text) })
      })
      const data = await res.json()
      const result = typeof data.result === 'string' ? data.result : JSON.stringify(data.result)
      setMessages(m => [...m, { role: 'nova', text: result || 'No response. Try again.' }])
    } catch {
      setMessages(m => [...m, { role: 'nova', text: 'Something went wrong. Please try again.' }])
    } finally { setLoading(false) }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* Header */}
      <div style={{ flexShrink: 0, padding: '16px 16px 12px', borderBottom: '1px solid var(--c-line)', background: 'var(--c-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>N</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--c-t1)' }}>Nova</div>
            <div style={{ fontSize: 11, color: 'var(--c-t3)' }}>Your AI study companion · Powered by Flashfo</div>
          </div>
        </div>

        {/* Mode buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m)}
              style={{
                flex: 1, height: 36, borderRadius: 10, border: '1px solid',
                borderColor: mode.id === m.id ? '#3b82f6' : 'var(--c-line)',
                background: mode.id === m.id ? '#2563eb' : 'var(--c-surface2)',
                color: mode.id === m.id ? 'white' : 'var(--c-t2)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                transition: 'all 0.15s'
              }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d={m.icon}/>
              </svg>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            {msg.role === 'nova' && (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: 'white', fontWeight: 800, fontSize: 12 }}>N</span>
              </div>
            )}
            <div style={{
              maxWidth: '80%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user' ? '#2563eb' : 'var(--c-surface)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--c-line)',
              color: msg.role === 'user' ? 'white' : 'var(--c-t1)',
              fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap'
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 12 }}>N</span>
            </div>
            <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: 'var(--c-surface)', border: '1px solid var(--c-line)', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', animation: 'nova-bounce 1.2s ease-in-out infinite', animationDelay: i * 0.2 + 's' }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input — pinned at bottom */}
      <div style={{ flexShrink: 0, padding: '10px 12px', borderTop: '1px solid var(--c-line)', background: 'var(--c-surface)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder={'Ask Nova to ' + (mode.id === 'explain' ? 'break it down simply' : mode.id === 'summary' ? 'summarize it' : 'build a study guide') + '...'}
            rows={1}
            style={{
              flex: 1, resize: 'none', outline: 'none', border: '1.5px solid var(--c-line)', borderRadius: 14,
              padding: '10px 14px', fontSize: 14, background: 'var(--c-surface2)', color: 'var(--c-t1)',
              lineHeight: 1.4, maxHeight: 120, overflowY: 'auto', fontFamily: 'inherit'
            }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
          />
          <button onClick={send} disabled={!input.trim() || loading}
            style={{
              width: 40, height: 40, borderRadius: 12, border: 'none', flexShrink: 0,
              background: input.trim() && !loading ? '#2563eb' : 'var(--c-surface2)',
              color: input.trim() && !loading ? 'white' : 'var(--c-t3)',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
            }}>
            {loading
              ? <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}/>
              : <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 8l13-7-4 7 4 7z"/></svg>}
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--c-t3)', marginTop: 5 }}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>

      <style>{`
        @keyframes nova-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
