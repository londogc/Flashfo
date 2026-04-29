'use client'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'

const STEM_TOPICS = ['Solve a math problem','Explain code','Debug my code','Physics problem','Chemistry equation','Statistics help']

export default function StemPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([{ role:'assistant', text:'Hi! I am Nova STEM — specialized in math, science, and code. I solve equations step by step, explain concepts deeply, and debug code. What are you working on?' }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  const send = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    const userMsg = { role:'user', text: msg }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const history = [...messages, userMsg]
      const systemPrompt = 'You are Nova STEM, an expert AI tutor for STEM subjects — math, physics, chemistry, biology, CS, engineering. Show all work step by step for math problems. Use code blocks for code. Be thorough and precise. Always verify your calculations.'
      const res = await fetch('/api/rpc', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ fn:'generateChatResponse', args:[history, systemPrompt] }) })
      const data = await res.json()
      setMessages(prev => [...prev, { role:'assistant', text: data.reply || 'Error — try again.' }])
    } catch { setMessages(prev => [...prev, { role:'assistant', text:'Connection error.' }]) }
    setLoading(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 56px)', maxWidth:760, margin:'0 auto' }}>
      <div style={{ padding:'16px 20px 12px', borderBottom:'1px solid var(--c-line)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#2563eb,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚡</div>
          <div>
            <h1 style={{ margin:0, fontSize:16, fontWeight:700, color:'var(--c-t1)' }}>Flashfo STEM</h1>
            <p style={{ margin:0, fontSize:12, color:'var(--c-t2)' }}>Math · Science · Code — deep problem solving</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2 }}>
          {STEM_TOPICS.map(t=>(
            <button key={t} onClick={()=>setInput(t)} style={{ padding:'4px 10px', borderRadius:20, border:'1px solid var(--c-line)', background:'var(--c-surface2)', color:'var(--c-t2)', fontSize:11, whiteSpace:'nowrap', cursor:'pointer', flexShrink:0 }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:'flex', gap:10, marginBottom:16, flexDirection: m.role==='user'?'row-reverse':'row' }}>
            {m.role === 'assistant' && <div style={{ width:28, height:28, borderRadius:7, background:'linear-gradient(135deg,#2563eb,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0, marginTop:2 }}>⚡</div>}
            <div style={{ maxWidth:'82%', padding:'10px 14px', borderRadius: m.role==='user'?'12px 12px 2px 12px':'12px 12px 12px 2px', background: m.role==='user'?'#2563eb':'var(--c-surface)', border: m.role==='user'?'none':'1px solid var(--c-line)', color: m.role==='user'?'#fff':'var(--c-t1)', fontSize:13, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{m.text}</div>
          </div>
        ))}
        {loading && <div style={{ display:'flex', gap:10, marginBottom:16 }}><div style={{ width:28, height:28, borderRadius:7, background:'linear-gradient(135deg,#2563eb,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center' }}>⚡</div><div style={{ padding:'12px 14px', borderRadius:'12px 12px 12px 2px', background:'var(--c-surface)', border:'1px solid var(--c-line)' }}><div style={{ display:'flex', gap:4 }}>{[0,1,2].map(i=><div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#a78bfa' }} className="nova-thinking"/>)}</div></div></div>}
        <div ref={bottomRef}/>
      </div>
      <div style={{ padding:'12px 16px', borderTop:'1px solid var(--c-line)', flexShrink:0 }}>
        <div style={{ display:'flex', gap:8, alignItems:'flex-end', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:12, padding:'8px 8px 8px 14px' }}>
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()} }} placeholder="Ask anything — equations, code, proofs..." rows={1} style={{ flex:1, background:'none', border:'none', resize:'none', color:'var(--c-t1)', fontSize:13, lineHeight:1.5, outline:'none', maxHeight:120, fontFamily:'inherit' }}/>
          <button onClick={send} disabled={loading||!input.trim()} style={{ width:34, height:34, borderRadius:8, background:input.trim()?'#2563eb':'var(--c-surface2)', color:input.trim()?'#fff':'var(--c-t3)', border:'none', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>↑</button>
        </div>
        <p style={{ margin:'6px 0 0', fontSize:11, color:'var(--c-t3)', textAlign:'center' }}>Shift+Enter for new line</p>
      </div>
    </div>
  )
}
