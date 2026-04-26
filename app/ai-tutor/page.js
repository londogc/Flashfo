'use client'
import { useState, useRef, useEffect } from 'react'

const MODES = [
  { id: 'explain',  label: '💡 Explain',  desc: 'Break it down simply',     fn: 'explainSimplyFromText' },
  { id: 'summary',  label: '📋 Summarize', desc: 'Key points fast',          fn: 'summarizeText' },
  { id: 'study',    label: '📚 Study Guide', desc: 'Deep study overview',    fn: 'generateStudyGuideFromText' },
]

function SpeakerBtn({ text }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  async function speak() {
    if (playing) { audioRef.current?.pause(); setPlaying(false); return }
    setPlaying(true)
    try {
      const res = await fetch('/api/rpc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'generateOpenAITtsAudio', args: [text, 'nova', 1.0] })
      })
      const data = await res.json()
      if (data.result?.audio) {
        const audio = new Audio('data:audio/mp3;base64,' + data.result.audio)
        audioRef.current = audio
        audio.onended = () => setPlaying(false)
        audio.play()
      }
    } catch { setPlaying(false) }
  }

  return (
    <button onClick={speak} title={playing ? 'Stop' : 'Listen'}
      style={{ background:'none', border:'none', cursor:'pointer', padding:'2px 4px', opacity:0.6, flexShrink:0 }}
      className="hover:opacity-100 transition-opacity">
      {playing
        ? <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-blue-500"><rect x="3" y="2" width="4" height="12" rx="1"/><rect x="9" y="2" width="4" height="12" rx="1"/></svg>
        : <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-t2"><path d="M3 5l5-3v12L3 11H1V5h2zm8 .5a4 4 0 010 5M13 3a7 7 0 010 10"/></svg>
      }
    </button>
  )
}

export default function NovaPage() {
  const [msgs, setMsgs]     = useState([{
    role: 'assistant',
    content: "Hi! I'm Nova, your AI study companion. Ask me anything — I can explain concepts, summarize notes, build study guides, and adapt to your learning style. What are we studying today?"
  }])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode]     = useState(MODES[0])
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setMsgs(m => [...m, { role: 'user', content: text }])
    setInput(''); setLoading(true)
    try {
      const res = await fetch('/api/rpc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fn: mode.fn,
          args: mode.fn === 'summarizeText'
            ? [text, 'paragraph', 200, 'English']
            : [text, 'English']
        })
      })
      const data = await res.json()
      const reply = typeof data.result === 'string'
        ? data.result
        : data.error || "I couldn't process that. Try rephrasing."
      setMsgs(m => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-line bg-surface flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">N</div>
          <div>
            <h1 className="text-base font-bold text-t1 leading-tight">Nova</h1>
            <p className="text-xs text-t2">Your AI study companion · Powered by Flashfo</p>
          </div>
          {/* Mode switcher */}
          <div className="ml-auto flex gap-1.5">
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m)} title={m.desc}
                className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-all ${mode.id === m.id ? 'bg-blue-700 text-white border-blue-700' : 'bg-surface2 text-t2 border-line hover:border-blue-300'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'gap-3'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-0.5">N</div>
            )}
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-blue-700 text-white rounded-tr-sm'
                : 'bg-surface border border-line text-t1 rounded-tl-sm'
            }`}>
              {m.content}
              {m.role === 'assistant' && i > 0 && (
                <div className="mt-2 flex justify-end">
                  <SpeakerBtn text={m.content}/>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">N</div>
            <div className="bg-surface border border-line px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
              {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-t3 animate-bounce" style={{ animationDelay: i*0.15+'s' }}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-line bg-surface flex-shrink-0">
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={`Ask Nova to ${mode.desc.toLowerCase()}...`}
            rows={1} className="flex-1 bg-surface2 border border-line rounded-xl px-4 py-2.5 text-sm text-t1 resize-none outline-none focus:border-blue-400 transition-colors placeholder:text-t3"
            style={{ minHeight:'42px', maxHeight:'120px' }}/>
          <button onClick={send} disabled={loading || !input.trim()}
            className="h-[42px] w-10 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2L2 8l5 2 2 4 5-12z"/></svg>
          </button>
        </div>
        <p className="text-center text-[10px] text-t3 mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}