'use client'
import { useState, useRef } from 'react'

export default function UploadInput({ onText, placeholder = 'Enter a topic or paste content...' }) {
  const [mode, setMode] = useState('topic')
  const [url, setUrl]   = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [pasteVal, setPasteVal] = useState('')
  const fileRef = useRef()

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setStatus('Reading...')
    try {
      const text = await file.text()
      onText(text)
      setStatus('✓ ' + file.name + ' (' + Math.round(text.length/1000) + 'k chars)')
    } catch { setStatus('Error reading file.') }
    finally { setLoading(false) }
  }

  async function handleUrl() {
    if (!url.trim()) return
    setLoading(true); setStatus('Fetching...')
    try {
      const r = await fetch('/api/fetch-url', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({url:url.trim()}) })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      onText(d.text)
      setStatus('✓ Content loaded (' + Math.round(d.text.length/1000) + 'k chars)')
    } catch(e) { setStatus('Error: ' + e.message) }
    finally { setLoading(false) }
  }

  const MODES = [{id:'topic',label:'Topic'},{id:'paste',label:'Paste Text'},{id:'file',label:'Upload File'},{id:'url',label:'From URL'}]

  return (
    <div>
      <div className="flex gap-1 mb-3 p-1 bg-surface2 rounded-xl w-fit">
        {MODES.map(m=>(
          <button key={m.id} onClick={()=>setMode(m.id)}
            className={'h-7 px-3 rounded-lg text-[12px] font-medium transition-all '+(mode===m.id?'bg-surface text-t1 shadow-sm':'text-t3 hover:text-t2')}>
            {m.label}
          </button>
        ))}
      </div>
      {mode==='topic' && (
        <textarea onChange={e=>onText(e.target.value)} placeholder={placeholder}
          className="w-full h-28 text-sm text-t1 bg-transparent resize-none outline-none placeholder:text-t3"/>
      )}
      {mode==='paste' && (
        <textarea value={pasteVal} onChange={e=>{setPasteVal(e.target.value);onText(e.target.value)}}
          placeholder="Paste your notes, textbook content, or any text here..."
          className="w-full h-36 text-sm text-t1 bg-transparent resize-none outline-none placeholder:text-t3"/>
      )}
      {mode==='file' && (
        <div>
          <input ref={fileRef} type="file" accept=".txt,.md,.csv" className="hidden" onChange={handleFile}/>
          <div onClick={()=>fileRef.current?.click()}
            className="border-2 border-dashed border-line rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors">
            <div className="text-2xl mb-2">📄</div>
            <p className="text-sm font-semibold text-t1 mb-1">Click to upload a text file</p>
            <p className="text-[12px] text-t3">Supports .txt, .md, .csv — for PDFs, copy and paste the text</p>
          </div>
          {status && <p className={'text-[12px] mt-2 '+(status.startsWith('Error')?'text-red-500':'text-emerald-500')}>{status}</p>}
        </div>
      )}
      {mode==='url' && (
        <div>
          <div className="flex gap-2">
            <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://en.wikipedia.org/wiki/..."
              onKeyDown={e=>e.key==='Enter'&&handleUrl()}
              className="flex-1 h-10 bg-surface2 border border-line rounded-xl px-3 text-sm text-t1 outline-none focus:border-blue-400 placeholder:text-t3"/>
            <button onClick={handleUrl} disabled={loading||!url.trim()}
              className="h-10 px-4 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40">
              {loading?'Fetching...':'Fetch'}
            </button>
          </div>
          {status && <p className={'text-[12px] mt-2 '+(status.startsWith('Error')?'text-red-500':'text-emerald-500')}>{status}</p>}
        </div>
      )}
    </div>
  )
}
