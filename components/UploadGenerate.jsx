'use client'
import { useState } from 'react'

export default function UploadGenerate({ onTextExtracted, label = 'Generate from file or URL' }) {
  const [mode, setMode]       = useState(null) // 'file' | 'url'
  const [url, setUrl]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setError('')
    try {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        // Use PDF.js via CDN to extract text
        const arrayBuffer = await file.arrayBuffer()
        const uint8 = new Uint8Array(arrayBuffer)
        // Load PDF.js dynamically
        if (!window.pdfjsLib) {
          await new Promise((res, rej) => {
            const s = document.createElement('script')
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
            s.onload = res; s.onerror = rej
            document.head.appendChild(s)
          })
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        }
        const pdf = await window.pdfjsLib.getDocument({ data: uint8 }).promise
        let text = ''
        for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          text += content.items.map(item => item.str).join(' ') + '\n'
        }
        if (!text.trim()) throw new Error('Could not extract text from this PDF.')
        onTextExtracted(text.trim().substring(0, 8000))
      } else {
        // Plain text / txt file
        const text = await file.text()
        if (!text.trim()) throw new Error('File appears to be empty.')
        onTextExtracted(text.trim().substring(0, 8000))
      }
      setMode(null)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handleUrl() {
    if (!url.trim()) return
    setLoading(true); setError('')
    try {
      // Use a CORS proxy / Wikipedia API for wikipedia links
      const u = url.trim()
      let text = ''
      if (u.includes('wikipedia.org/wiki/')) {
        const title = u.split('/wiki/')[1].split('#')[0]
        const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=false&explaintext=true&titles=${encodeURIComponent(title)}&format=json&origin=*`
        const r = await fetch(apiUrl)
        const data = await r.json()
        const pages = data.query?.pages || {}
        const page = Object.values(pages)[0]
        text = page?.extract || ''
        if (!text) throw new Error('Could not fetch Wikipedia article.')
      } else {
        // Try allorigins proxy for other URLs
        const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(u)
        const r = await fetch(proxyUrl)
        const data = await r.json()
        // Strip HTML tags
        const div = document.createElement('div')
        div.innerHTML = data.contents || ''
        text = div.innerText || div.textContent || ''
        if (!text.trim()) throw new Error('Could not extract text from this URL.')
      }
      onTextExtracted(text.trim().substring(0, 8000))
      setMode(null); setUrl('')
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (!mode) return (
    <div className="flex gap-2 flex-wrap">
      <button onClick={()=>setMode('file')}
        className="h-8 px-3 bg-surface border border-line text-t2 text-[12px] font-medium rounded-lg hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V6L9 1z"/><path d="M9 1v5h5"/>
        </svg>
        Upload File
      </button>
      <button onClick={()=>setMode('url')}
        className="h-8 px-3 bg-surface border border-line text-t2 text-[12px] font-medium rounded-lg hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6.5 9.5a4 4 0 005.6 0l2-2a4 4 0 00-5.6-5.6l-1 1"/><path d="M9.5 6.5a4 4 0 00-5.6 0l-2 2a4 4 0 005.6 5.6l1-1"/>
        </svg>
        From URL
      </button>
    </div>
  )

  return (
    <div className="bg-surface2 border border-line rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-t3 uppercase tracking-wider">{mode==='file'?'Upload File':'Paste URL'}</span>
        <button onClick={()=>{setMode(null);setError('');setUrl('')}} className="text-t3 hover:text-t1 text-sm">✕</button>
      </div>
      {mode==='file' && (
        <div>
          <label className={`flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${loading?'border-blue-300 bg-blue-500/5':'border-line hover:border-blue-400'}`}>
            <input type="file" accept=".pdf,.txt,.md" onChange={handleFile} className="hidden" disabled={loading}/>
            {loading
              ? <><span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-1"/><span className="text-[12px] text-t3">Extracting text...</span></>
              : <><svg width="20" height="20" className="mb-1" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" style={{color:'var(--c-t3)'}}><path d="M8 1v9M5 7l3 3 3-3"/><path d="M2 12v2a1 1 0 001 1h10a1 1 0 001-1v-2"/></svg><span className="text-[12px] text-t3">PDF or .txt file · Max ~8,000 words</span></>}
          </label>
        </div>
      )}
      {mode==='url' && (
        <div className="flex gap-2">
          <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://en.wikipedia.org/wiki/..."
            onKeyDown={e=>e.key==='Enter'&&handleUrl()}
            className="flex-1 h-9 bg-surface border border-line rounded-lg px-3 text-sm text-t1 outline-none focus:border-blue-400 placeholder:text-t3"/>
          <button onClick={handleUrl} disabled={loading||!url.trim()}
            className="h-9 px-3 bg-blue-700 text-white text-[12px] font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-40 flex items-center gap-1">
            {loading?<span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:'Fetch'}
          </button>
        </div>
      )}
      {error && <p className="text-red-500 text-[12px] mt-2">{error}</p>}
    </div>
  )
}
