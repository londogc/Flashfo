'use client'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

export default function NovaPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([
    { role: 'nova', text: "Hi, I'm Nova — your AI study companion. Ask me anything: explain a concept, work through a topic, summarize your notes, or build a study guide. What are we tackling today?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [grade, setGrade] = useState('')
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('grade_level').eq('id', user.id).single()
      .then(({ data }) => { if (data?.grade_level) setGrade(data.grade_level) })
  }, [user])

  function buildSystemPrompt() {
    const gradeCtx = grade
      ? 'The student is in ' + grade + '. Calibrate your language, depth, and examples to that level — not too simple, not too complex.'
      : 'Calibrate to the complexity of what the student is asking. Match their level.'
    return 'You are Nova, an AI study tutor inside Flashfo. ' + gradeCtx + ' Be direct, knowledgeable, and intellectually honest. Do not oversimplify or be condescending. Explain things clearly with real depth. Use examples when helpful. If asked about history, science, math, literature, or any subject, give a real substantive answer — not a watered-down version. You are a tutor, not a children\'s content filter.'
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
    const newMessages = [...messages, { role: 'user', text }]
    setMessages(newMessages)
    setLoading(true)
    try {
      // Build conversation history for context
      const history = newMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))
      const systemPrompt = buildSystemPrompt()
      const res = await fetch('/api/rpc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fn: 'generateChatResponse',
          args: [history, systemPrompt]
        })
      })
      const data = await res.json()
      const result = data.result?.content || data.result || ''
      if (!result || data.error) {
        // Fallback: use explainSimplyFromText with the last user message
        const res2 = await fetch('/api/rpc', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fn: 'explainSimplyFromText', args: [text, 'English'] })
        })
        const data2 = await res2.json()
        const r2 = typeof data2.result === 'string' ? data2.result : JSON.stringify(data2.result)
        setMessages(m => [...m, { role: 'nova', text: r2 || 'Could not get a response. Try again.' }])
      } else {
        setMessages(m => [...m, { role: 'nova', text: typeof result === 'string' ? result : JSON.stringify(result) }])
      }
    } catch {
      // Final fallback
      try {
        const res2 = await fetch('/api/rpc', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fn: 'explainSimplyFromText', args: [text, 'English'] })
        })
        const data2 = await res2.json()
        setMessages(m => [...m, { role: 'nova', text: typeof data2.result === 'string' ? data2.result : 'Something went wrong.' }])
      } catch { setMessages(m => [...m, { role: 'nova', text: 'Something went wrong. Please try again.' }]) }
    } finally { setLoading(false) }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function clearChat() {
    setMessages([{ role: 'nova', text: "Hi, I'm Nova — your AI study companion. Ask me anything: explain a concept, work through a topic, summarize your notes, or build a study guide. What are we tackling today?" }])
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:0 }}>

      {/* Header */}
      <div style={{ flexShrink:0, padding:'12px 16px 10px', borderBottom:'1px solid var(--c-line)', background:'var(--c-surface)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#3b82f6,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ color:'white', fontWeight:800, fontSize:14 }}>N</span>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--c-t1)', display:'flex', alignItems:'center', gap:6 }}>
              Nova
              {grade && <span style={{ fontSize:10, fontWeight:600, padding:'1px 7px', borderRadius:20, background:'rgba(99,102,241,0.1)', color:'#6366f1' }}>{grade}</span>}
            </div>
            <div style={{ fontSize:11, color:'var(--c-t3)' }}>AI study companion · Powered by Flashfo</div>
          </div>
        </div>
        <button onClick={clearChat} style={{ fontSize:11, color:'var(--c-t3)', background:'none', border:'1px solid var(--c-line)', borderRadius:8, padding:'4px 10px', cursor:'pointer', transition:'color 0.15s' }}
          onMouseEnter={e=>e.target.style.color='var(--c-t1)'} onMouseLeave={e=>e.target.style.color='var(--c-t3)'}>
          Clear
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', flexDirection: msg.role==='user' ? 'row-reverse' : 'row' }}>
            {msg.role==='nova' && (
              <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#3b82f6,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                <span style={{ color:'white', fontWeight:800, fontSize:11 }}>N</span>
              </div>
            )}
            <div style={{
              maxWidth:'80%', padding:'10px 14px',
              borderRadius: msg.role==='user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role==='user' ? '#2563eb' : 'var(--c-surface)',
              border: msg.role==='user' ? 'none' : '1px solid var(--c-line)',
              color: msg.role==='user' ? 'white' : 'var(--c-t1)',
              fontSize:14, lineHeight:1.6, whiteSpace:'pre-wrap', wordBreak:'break-word'
            }}>{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#3b82f6,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ color:'white', fontWeight:800, fontSize:11 }}>N</span>
            </div>
            <div style={{ padding:'10px 14px', borderRadius:'16px 16px 16px 4px', background:'var(--c-surface)', border:'1px solid var(--c-line)', display:'flex', gap:5, alignItems:'center' }}>
              {[0,1,2].map(i=>(
                <span key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#3b82f6', display:'inline-block', animation:'nova-bounce 1.2s ease-in-out infinite', animationDelay:(i*0.2)+'s' }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ flexShrink:0, padding:'10px 12px 12px', borderTop:'1px solid var(--c-line)', background:'var(--c-surface)' }}>
        <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
          <textarea ref={textareaRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Ask Nova anything..."
            rows={1}
            style={{ flex:1, resize:'none', outline:'none', border:'1.5px solid var(--c-line)', borderRadius:14, padding:'10px 14px', fontSize:14, background:'var(--c-surface2)', color:'var(--c-t1)', lineHeight:1.4, maxHeight:140, overflowY:'auto', fontFamily:'inherit', transition:'border-color 0.15s' }}
            onInput={e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,140)+'px'}}
            onFocus={e=>e.target.style.borderColor='#3b82f6'}
            onBlur={e=>e.target.style.borderColor='var(--c-line)'}
          />
          <button onClick={send} disabled={!input.trim()||loading} style={{
            width:40, height:40, borderRadius:12, border:'none', flexShrink:0,
            background: input.trim()&&!loading ? '#2563eb' : 'var(--c-surface2)',
            color: input.trim()&&!loading ? 'white' : 'var(--c-t3)',
            cursor: input.trim()&&!loading ? 'pointer' : 'default',
            display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s'
          }}>
            {loading
              ? <span style={{ width:14, height:14, border:'2px solid currentColor', borderTopColor:'transparent', borderRadius:'50%', display:'inline-block', animation:'nova-spin 0.8s linear infinite' }}/>
              : <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 8L14 1.5 10.5 8 14 14.5z"/></svg>}
          </button>
        </div>
        <div style={{ textAlign:'center', fontSize:10, color:'var(--c-t3)', marginTop:5 }}>Enter to send · Shift+Enter for new line</div>
      </div>

      <style>{`@keyframes nova-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}@keyframes nova-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}