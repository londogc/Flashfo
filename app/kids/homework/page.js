'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Hydration guard ───────────────────────────────────────────────────────────
export default function HomeworkPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return <div style={{ position: 'fixed', inset: 0, background: '#0f0f1a' }} />
  return <HomeworkUI />
}

function HomeworkUI() {
  const router = useRouter()
  const fileInputRef  = useRef(null)
  const cameraInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const sessionStartRef = useRef(Date.now())

  const [child, setChild]         = useState(null)
  const [screen, setScreen]       = useState('upload') // 'upload' | 'chat'
  const [photo, setPhoto]         = useState(null)     // { base64, mimeType, name, previewUrl }
  const [dragging, setDragging]   = useState(false)
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [streaming, setStreaming] = useState(false)
  const [sessionId, setSessionId] = useState(null)

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

  // ── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  // ── File processing ───────────────────────────────────────────────────────
  function processFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Please upload an image or PDF.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File must be under 10MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      const base64 = dataUrl.split(',')[1]
      setPhoto({
        base64,
        mimeType: file.type,
        name: file.name,
        previewUrl: file.type.startsWith('image/') ? dataUrl : null,
      })
    }
    reader.readAsDataURL(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  // ── Start Nova session with photo ─────────────────────────────────────────
  async function startSession() {
    if (!photo || !child) return
    setScreen('chat')

    const firstMsg = {
      role: 'user',
      text: 'I need help with this homework.',
      images: [{ base64: photo.base64, mimeType: photo.mimeType }],
      isPhoto: true,
    }

    setMessages([firstMsg])
    await streamNova([firstMsg])
  }

  // ── Stream Nova response ──────────────────────────────────────────────────
  async function streamNova(msgHistory) {
    if (!child) return
    setStreaming(true)

    const payload = msgHistory.map(m => ({
      role: m.role,
      text: m.text || '',
      ...(m.images ? { images: m.images } : {}),
    }))

    try {
      // Get parent's auth token to authenticate the request
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      // If no parent session, use a child-specific header instead
      const headers = {
        'Content-Type': 'application/json',
        'x-child-id': child.childId,
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/nova-stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: payload,
          childName: child.childName,
          gradeLevel: String(child.gradeLevel),
          subject: 'Homework Help',
        }),
      })

      if (!res.ok) throw new Error('Nova is unavailable right now.')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''

      // Add placeholder assistant message
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
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Oops, something went wrong. Try asking again!' }])
    } finally {
      setStreaming(false)
    }
  }

  // ── Send a text message ───────────────────────────────────────────────────
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
      const msgCount = messages.length

      // Request Nova summary
      const summaryPrompt = [...messages, {
        role: 'user',
        text: 'SESSION_END: Generate the parent summary JSON now.',
      }]

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const headers = { 'Content-Type': 'application/json', 'x-child-id': child.childId }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/nova-stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: summaryPrompt.map(m => ({ role: m.role, text: m.text || '' })),
          childName: child.childName,
          gradeLevel: String(child.gradeLevel),
          subject: 'Homework Help',
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

      // Parse JSON summary
      let novaSummary = null
      try {
        const clean = summaryText.replace(/```json|```/g, '').trim()
        novaSummary = JSON.parse(clean)
      } catch { novaSummary = { parent_note: summaryText } }

      // Log session to Supabase
      await supabase.from('homework_sessions').insert({
        child_id: child.childId,
        parent_id: child.parentId,
        subject: novaSummary?.subject || 'Homework Help',
        topic: novaSummary?.topic || photo?.name || 'Photo homework',
        duration_minutes: duration,
        message_count: msgCount,
        engagement: novaSummary?.engagement || 'medium',
        struggled_with: novaSummary?.struggled_with || null,
        ready_for_next: novaSummary?.ready_for_next ?? true,
        nova_summary: novaSummary?.parent_note || summaryText,
        conversation: messages.map(m => ({ role: m.role, text: m.text })),
      })
    } catch (e) { /* silent — don't block navigation */ }

    router.push('/kids')
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const s = {
    page: { minHeight: '100vh', background: '#0f0f1a', fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column' },
    topbar: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderBottom: '0.5px solid rgba(255,255,255,0.07)', flexShrink: 0 },
    backBtn: { width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: 'rgba(255,255,255,0.6)' },
    topTitle: { fontSize: 13, fontWeight: 500, color: '#fff' },
    topSub: { marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.3)' },
    safeBadge: { fontSize: 10, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: 999 },
    body: { padding: '16px 14px', maxWidth: 480, margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' },

    // Upload screen
    dropZone: (drag) => ({ border: `1.5px dashed ${drag ? 'rgba(99,102,241,0.7)' : 'rgba(99,102,241,0.4)'}`, borderRadius: 16, padding: '28px 16px', textAlign: 'center', background: drag ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)', marginBottom: 14, cursor: 'pointer', transition: 'all 0.15s' }),
    dropIcon: { width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: 20 },
    dropTitle: { fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 4 },
    dropSub: { fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 },
    orRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
    orLine: { flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' },
    orText: { fontSize: 11, color: 'rgba(255,255,255,0.25)' },
    camBtn: { width: '100%', padding: 13, borderRadius: 12, background: 'rgba(99,102,241,0.12)', border: '0.5px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'system-ui,sans-serif', marginBottom: 12 },
    previewBox: { borderRadius: 12, overflow: 'hidden', border: '0.5px solid rgba(255,255,255,0.1)', marginBottom: 12, position: 'relative' },
    previewImg: { width: '100%', height: 130, objectFit: 'cover', display: 'block' },
    previewPlaceholder: { width: '100%', height: 130, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 },
    previewLabel: { position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: '#5eead4', fontSize: 10, padding: '3px 8px', borderRadius: 999 },
    previewName: { padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.3)' },
    analyzeBtn: { width: '100%', padding: 13, borderRadius: 12, background: '#6366f1', border: 'none', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'system-ui,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 },

    // Chat screen
    chatMessages: { flex: 1, overflowY: 'auto', padding: '14px 0 8px', display: 'flex', flexDirection: 'column', gap: 10 },
    photoThumb: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 10px', marginBottom: 2 },
    thumbIcon: { width: 28, height: 28, borderRadius: 6, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 },
    thumbName: { fontSize: 12, color: '#fff' },
    thumbSub: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
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
    endBtn: { display: 'block', margin: '8px auto 0', fontSize: 11, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'system-ui,sans-serif' },
    inputRow: { display: 'flex', alignItems: 'center', gap: 8 },
    textInput: { flex: 1, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '9px 14px', fontSize: 13, color: '#fff', fontFamily: 'system-ui,sans-serif', outline: 'none' },
    sendBtn: (active) => ({ width: 32, height: 32, borderRadius: '50%', background: active ? '#1D9E75' : 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: active ? 'pointer' : 'default', flexShrink: 0, fontSize: 14, color: '#fff', transition: 'background 0.15s' }),
  }

  if (!child) return <div style={s.page} />

  return (
    <div style={s.page}>
      {/* Topbar */}
      <div style={s.topbar}>
        <button style={s.backBtn} onClick={() => screen === 'chat' ? endSession() : router.push('/kids')}>←</button>
        <span style={s.topTitle}>{screen === 'upload' ? 'Homework help' : 'Nova'}</span>
        {screen === 'chat' && (
          <>
            <span style={s.topSub}>
              {photo?.name?.replace(/\.[^/.]+$/, '').slice(0, 20) || 'Homework'}
            </span>
            <span style={s.safeBadge}>🛡 safe mode</span>
          </>
        )}
        {screen === 'upload' && (
          <span style={s.topSub}>Nova will guide you</span>
        )}
      </div>

      <div style={s.body}>
        {screen === 'upload' ? (
          // ── Upload screen ───────────────────────────────────────────────
          <>
            <div
              style={s.dropZone(dragging)}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={s.dropIcon}>📁</div>
              <div style={s.dropTitle}>Drop your homework here</div>
              <div style={s.dropSub}>PNG, JPG, or PDF · Max 10MB</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={e => processFile(e.target.files[0])}
              />
            </div>

            <div style={s.orRow}>
              <div style={s.orLine} />
              <div style={s.orText}>or</div>
              <div style={s.orLine} />
            </div>

            <button style={s.camBtn} onClick={() => cameraInputRef.current?.click()}>
              📸 Take a photo with your camera
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={e => processFile(e.target.files[0])}
              />
            </button>

            {photo && (
              <>
                <div style={s.previewBox}>
                  {photo.previewUrl ? (
                    <img src={photo.previewUrl} alt="Homework" style={s.previewImg} />
                  ) : (
                    <div style={s.previewPlaceholder}>📄</div>
                  )}
                  <div style={s.previewLabel}>✓ Photo ready</div>
                  {!photo.previewUrl && <div style={s.previewName}>{photo.name}</div>}
                </div>

                <button style={s.analyzeBtn} onClick={startSession}>
                  ✨ Ask Nova about this
                </button>
              </>
            )}
          </>
        ) : (
          // ── Chat screen ─────────────────────────────────────────────────
          <>
            <div style={s.chatMessages}>
              {/* Photo thumbnail */}
              <div style={s.photoThumb}>
                <div style={s.thumbIcon}>📎</div>
                <div>
                  <div style={s.thumbName}>{photo?.name || 'Homework photo'}</div>
                  <div style={s.thumbSub}>Uploaded · Nova is looking at this</div>
                </div>
              </div>

              {/* Messages */}
              {messages.slice(1).map((msg, i) => (
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

              {/* Typing indicator */}
              {streaming && (
                <div style={s.novaRow}>
                  <div style={s.novaAvatar}>✨</div>
                  <div style={s.typingWrap}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ ...s.dot, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div style={s.inputArea}>
              <div style={s.inputRow}>
                <input
                  style={s.textInput}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your answer..."
                  disabled={streaming}
                />
                <button
                  style={s.sendBtn(!!input.trim() && !streaming)}
                  onClick={sendMessage}
                  disabled={!input.trim() || streaming}
                >
                  ↑
                </button>
              </div>
              <button style={s.endBtn} onClick={endSession}>
                End session
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}
