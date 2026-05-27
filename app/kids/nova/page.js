'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const SUBJECTS = [
  { id: 'math',    label: 'Math',      emoji: '🔢', color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.25)' },
  { id: 'science', label: 'Science',   emoji: '🔬', color: '#1D9E75', bg: 'rgba(29,158,117,0.08)',  border: 'rgba(29,158,117,0.25)' },
  { id: 'english', label: 'English',   emoji: '📖', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)' },
  { id: 'history', label: 'History',   emoji: '🏛',  color: '#e11d48', bg: 'rgba(225,29,72,0.08)',   border: 'rgba(225,29,72,0.25)'  },
  { id: 'geo',     label: 'Geography', emoji: '🌍', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.25)' },
  { id: 'art',     label: 'Art',       emoji: '🎨', color: '#ec4899', bg: 'rgba(236,72,153,0.08)',  border: 'rgba(236,72,153,0.25)' },
]

// ── Hydration guard ───────────────────────────────────────────────────────────
export default function AskNovaPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return <div style={{ position: 'fixed', inset: 0, background: '#0f0f1a' }} />
  return <AskNovaUI />
}

function AskNovaUI() {
  const router = useRouter()
  const messagesEndRef  = useRef(null)
  const inputRef        = useRef(null)
  const sessionStartRef = useRef(Date.now())

  const [child, setChild]           = useState(null)
  const [screen, setScreen]         = useState('picker')  // 'picker' | 'chat'
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [streaming, setStreaming]   = useState(false)

  // ── Load child session ────────────────────────────────────────────────────
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
    } catch { router.replace('/kids-login') }
  }, [])

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  // ── Start chat from topic picker ──────────────────────────────────────────
  async function startChat(subject) {
    setSelectedSubject(subject)
    setScreen('chat')
    sessionStartRef.current = Date.now()

    const greeting = {
      role: 'assistant',
      text: `Hey ${child?.childName || 'there'}! What are you curious about in ${subject.label} today? I'm here to help you think it through.`,
    }
    setMessages([greeting])
  }

  // ── Stream Nova response ──────────────────────────────────────────────────
  async function streamNova(msgHistory) {
    setStreaming(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const headers = { 'Content-Type': 'application/json', 'x-child-id': child.childId }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/nova-stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: msgHistory.map(m => ({ role: m.role, text: m.text })),
          childName: child.childName,
          gradeLevel: String(child.gradeLevel),
          subject: selectedSubject?.label || 'General',
        }),
      })

      if (!res.ok) throw new Error()

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''

      setMessages(prev => [...prev, { role: 'assistant', text: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', text }
          return updated
        })
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Oops, something went wrong. Try asking again!' }])
    } finally {
      setStreaming(false)
      inputRef.current?.focus()
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage() {
    if (!input.trim() || streaming) return
    const userMsg = { role: 'user', text: input.trim() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    await streamNova(updated)
  }

  // ── End session — log to DB ───────────────────────────────────────────────
  async function endSession() {
    if (!child || messages.length < 2) { router.push('/kids'); return }
    try {
      const duration = Math.round((Date.now() - sessionStartRef.current) / 60000)

      // Generate summary
      const summaryPrompt = [...messages, { role: 'user', text: 'SESSION_END: Generate the parent summary JSON now.' }]
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const headers = { 'Content-Type': 'application/json', 'x-child-id': child.childId }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/nova-stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: summaryPrompt.map(m => ({ role: m.role, text: m.text })),
          childName: child.childName,
          gradeLevel: String(child.gradeLevel),
          subject: selectedSubject?.label || 'General',
        }),
      })

      let summaryText = ''
      if (res.ok) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          summaryText += decoder.decode(value, { stream: true })
        }
      }

      let novaSummary = null
      try {
        novaSummary = JSON.parse(summaryText.replace(/```json|```/g, '').trim())
      } catch { novaSummary = { parent_note: summaryText } }

      await supabase.from('homework_sessions').insert({
        child_id: child.childId,
        parent_id: child.parentId,
        subject: selectedSubject?.label || novaSummary?.subject || 'General',
        topic: novaSummary?.topic || 'Ask Nova session',
        duration_minutes: duration,
        message_count: messages.length,
        engagement: novaSummary?.engagement || 'medium',
        struggled_with: novaSummary?.struggled_with || null,
        ready_for_next: novaSummary?.ready_for_next ?? true,
        nova_summary: novaSummary?.parent_note || summaryText,
        conversation: messages.map(m => ({ role: m.role, text: m.text })),
      })
    } catch { /* silent */ }
    router.push('/kids')
  }

  const s = {
    page: { minHeight: '100vh', background: '#0f0f1a', fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column' },
    topbar: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderBottom: '0.5px solid rgba(255,255,255,0.07)', flexShrink: 0 },
    backBtn: { width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: 'rgba(255,255,255,0.6)', fontFamily: 'system-ui,sans-serif' },
    topTitle: { fontSize: 13, fontWeight: 500, color: '#fff' },
    safeBadge: { marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: 999 },
    body: { padding: '16px 14px', maxWidth: 480, margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },

    // Picker screen
    pickerTitle: { fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 4 },
    pickerSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 18 },
    novaMood: { display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(29,158,117,0.06)', border: '0.5px solid rgba(29,158,117,0.15)', borderRadius: 12, padding: '10px 12px', marginBottom: 18 },
    moodOrb: { width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#0d9488,#1D9E75)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 },
    moodName: { fontSize: 12, fontWeight: 500, color: '#5eead4' },
    moodDesc: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 },
    subjectGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 },
    subjectCard: (s) => ({ borderRadius: 12, padding: '12px', border: `0.5px solid ${s.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: s.bg }),
    subjectEmoji: (s) => ({ width: 32, height: 32, borderRadius: 9, background: s.bg, border: `0.5px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }),
    subjectName: { fontSize: 13, fontWeight: 500, color: '#fff' },
    orRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
    orLine: { flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.07)' },
    orText: { fontSize: 11, color: 'rgba(255,255,255,0.2)' },
    askAnythingBtn: { width: '100%', padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'system-ui,sans-serif' },

    // Chat screen
    chatMessages: { flex: 1, overflowY: 'auto', padding: '14px 0 8px', display: 'flex', flexDirection: 'column', gap: 10 },
    subjectPill: (s) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: s.color, background: s.bg, border: `0.5px solid ${s.border}`, borderRadius: 999, padding: '3px 10px', marginBottom: 8, alignSelf: 'flex-start' }),
    novaRow: { display: 'flex', gap: 8, alignItems: 'flex-start' },
    novaAvatar: { width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,#0d9488,#1D9E75)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, fontSize: 12 },
    novaBubble: { background: 'rgba(29,158,117,0.1)', border: '0.5px solid rgba(29,158,117,0.22)', borderRadius: '0 12px 12px 12px', padding: '10px 12px', maxWidth: '88%' },
    novaText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55 },
    kidRow: { display: 'flex', justifyContent: 'flex-end' },
    kidBubble: { background: 'rgba(99,102,241,0.18)', border: '0.5px solid rgba(99,102,241,0.28)', borderRadius: '12px 0 12px 12px', padding: '9px 12px', maxWidth: '82%' },
    kidText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 },
    typingWrap: { display: 'flex', alignItems: 'center', gap: 4, padding: '9px 13px', background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.18)', borderRadius: '0 10px 10px 10px', width: 'fit-content' },
    dot: { width: 5, height: 5, borderRadius: '50%', background: '#1D9E75' },
    inputArea: { padding: '10px 0 0', borderTop: '0.5px solid rgba(255,255,255,0.07)', flexShrink: 0 },
    inputRow: { display: 'flex', alignItems: 'center', gap: 8 },
    textInput: { flex: 1, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '9px 14px', fontSize: 13, color: '#fff', fontFamily: 'system-ui,sans-serif', outline: 'none' },
    sendBtn: (active) => ({ width: 32, height: 32, borderRadius: '50%', background: active ? '#1D9E75' : 'rgba(255,255,255,0.1)', border: 'none', cursor: active ? 'pointer' : 'default', flexShrink: 0, fontSize: 14, color: '#fff', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif' }),
    endBtn: { display: 'block', margin: '8px auto 0', fontSize: 11, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' },
  }

  if (!child) return <div style={s.page} />

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <button style={s.backBtn} onClick={() => screen === 'chat' ? endSession() : router.push('/kids')}>←</button>
        <span style={s.topTitle}>
          {screen === 'picker' ? 'Ask Nova' : `Nova · ${selectedSubject?.label || 'General'}`}
        </span>
        {screen === 'chat' && <span style={s.safeBadge}>🛡 safe mode</span>}
      </div>

      <div style={s.body}>
        {screen === 'picker' ? (
          <>
            <div style={s.novaMood}>
              <div style={s.moodOrb}>✨</div>
              <div>
                <div style={s.moodName}>Nova is ready</div>
                <div style={s.moodDesc}>Pick a subject or just start typing anything</div>
              </div>
            </div>

            <div style={s.pickerTitle}>What do you want to explore?</div>
            <div style={s.pickerSub}>Pick a subject to get started</div>

            <div style={s.subjectGrid}>
              {SUBJECTS.map(subj => (
                <div key={subj.id} style={s.subjectCard(subj)} onClick={() => startChat(subj)}>
                  <div style={s.subjectEmoji(subj)}>{subj.emoji}</div>
                  <div style={s.subjectName}>{subj.label}</div>
                </div>
              ))}
            </div>

            <div style={s.orRow}>
              <div style={s.orLine} /><div style={s.orText}>or</div><div style={s.orLine} />
            </div>

            <button
              style={s.askAnythingBtn}
              onClick={() => startChat({ id: 'general', label: 'General', emoji: '💬', color: '#a5b4fc', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)' })}
            >
              Ask about anything from school
            </button>
          </>
        ) : (
          <>
            <div style={s.chatMessages}>
              {selectedSubject && (
                <div style={s.subjectPill(selectedSubject)}>
                  {selectedSubject.emoji} {selectedSubject.label}
                </div>
              )}

              {messages.map((msg, i) => (
                msg.role === 'assistant' ? (
                  <div key={i} style={s.novaRow}>
                    <div style={s.novaAvatar}>✨</div>
                    <div style={s.novaBubble}>
                      <div style={s.novaText}>{msg.text}</div>
                    </div>
                  </div>
                ) : (
                  <div key={i} style={s.kidRow}>
                    <div style={s.kidBubble}>
                      <div style={s.kidText}>{msg.text}</div>
                    </div>
                  </div>
                )
              ))}

              {streaming && (
                <div style={s.novaRow}>
                  <div style={s.novaAvatar}>✨</div>
                  <div style={s.typingWrap}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ ...s.dot, animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div style={s.inputArea}>
              <div style={s.inputRow}>
                <input
                  ref={inputRef}
                  style={s.textInput}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Type anything..."
                  disabled={streaming}
                />
                <button
                  style={s.sendBtn(!!input.trim() && !streaming)}
                  onClick={sendMessage}
                  disabled={!input.trim() || streaming}
                >↑</button>
              </div>
              <button style={s.endBtn} onClick={endSession}>End session</button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%,60%,100%{transform:translateY(0);}
          30%{transform:translateY(-4px);}
        }
      `}</style>
    </div>
  )
}
