'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import { saveItem } from '@/lib/savedItems'


function renderStudyGuide(text) {
  // Split into sections by --- or ###
  const lines = text.split('\n')
  const elements = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip mnemonic / memory trick sections entirely
    const lowerTrimmed = trimmed.toLowerCase()
    if (lowerTrimmed.includes('memory trick') || lowerTrimmed.includes('mnemonic') || lowerTrimmed.includes('memory aids')) {
      // Skip this heading AND everything until the next --- or ###
      while (i + 1 < lines.length && !lines[i+1].trim().startsWith('---') && !lines[i+1].trim().startsWith('###')) i++
      continue
    }

    // Skip dividers
    if (trimmed === '---' || trimmed === '') {
      if (trimmed === '' && elements.length > 0) {
        // add spacing
      }
      continue
    }

    // H3 headings: ### or **Title**
    if (trimmed.startsWith('### ')) {
      const heading = trimmed.replace(/^### /, '').replace(/\*\*/g, '')
      elements.push(
        <div key={key++} className="mt-6 mb-2 pb-1.5 border-b border-line">
          <span className="text-[11px] font-bold text-t3 uppercase tracking-wider">{heading}</span>
        </div>
      )
      continue
    }

    // Bold standalone title **text** or **text**:
    if (/^\*\*[^*]+\*\*:?$/.test(trimmed)) {
      const title = trimmed.replace(/\*\*/g, '').replace(/:$/, '')
      elements.push(
        <p key={key++} className="text-sm font-bold text-t1 mt-3 mb-1">{title}</p>
      )
      continue
    }

    // Bullet points: - or * at start
    if (/^[-*] /.test(trimmed)) {
      const content = trimmed.replace(/^[-*] /, '').replace(/\*\*([^*]+)\*\*/g, '$1')
      // Check if it has a bold label: **label**: description
      const colonMatch = content.match(/^([^:]+): (.+)$/)
      if (colonMatch) {
        elements.push(
          <div key={key++} className="flex gap-2 mb-1.5 text-sm">
            <span className="text-blue-500 flex-shrink-0 mt-0.5">•</span>
            <span className="text-t1"><span className="font-semibold">{colonMatch[1]}:</span> {colonMatch[2]}</span>
          </div>
        )
      } else {
        elements.push(
          <div key={key++} className="flex gap-2 mb-1.5 text-sm">
            <span className="text-blue-500 flex-shrink-0 mt-0.5">•</span>
            <span className="text-t2">{content}</span>
          </div>
        )
      }
      continue
    }

    // Checkbox items: - [ ] text
    if (/^- \[[ x]\]/.test(trimmed)) {
      const done = trimmed.includes('[x]')
      const content = trimmed.replace(/^- \[[ x]\] /, '')
      elements.push(
        <div key={key++} className="flex gap-2 mb-1.5 text-sm items-start">
          <span className={'flex-shrink-0 w-4 h-4 mt-0.5 rounded border flex items-center justify-center text-[10px] ' + (done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-line')}>{done ? '✓' : ''}</span>
          <span className="text-t2">{content}</span>
        </div>
      )
      continue
    }

    // Numbered list: 1. 2. etc
    if (/^\d+\./.test(trimmed)) {
      const num = trimmed.match(/^(\d+)\./)
      const content = trimmed.replace(/^\d+\.\s*/, '').replace(/\*\*([^*]+)\*\*/g, '$1')
      elements.push(
        <div key={key++} className="flex gap-2 mb-2 text-sm">
          <span className="text-blue-500 font-bold flex-shrink-0 w-5">{num[1]}.</span>
          <span className="text-t1">{content}</span>
        </div>
      )
      continue
    }

    // Regular paragraph — strip any remaining ** markers
    if (trimmed) {
      const clean = trimmed.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
      elements.push(<p key={key++} className="text-sm text-t1 leading-relaxed mb-2">{clean}</p>)
    }
  }

  return <div>{elements}</div>
}

export default function StudyGuidePage() {
  const { user } = useAuth()
  const [topic, setTopic]     = useState('')
  const [depth, setDepth]     = useState('standard')
  const [output, setOutput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  async function generate() {
    if (!topic.trim()) return
    setLoading(true); setOutput(''); setError(''); setSaved(false)
    try {
      const depthNote = depth === 'quick' ? ' Keep it concise, key points only.' : depth === 'deep' ? ' Be comprehensive and thorough with examples.' : ''
      const res = await fetch('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'generateStudyGuideFromText', args: [topic.trim() + depthNote + ' Write in an engaging, student-friendly tone. Use clear section headings without ### symbols. Write bullet points as plain text without ** markers. Make it feel like a knowledgeable teacher wrote this, not a textbook. Be direct, real, and interesting. Do NOT include a Memory Tricks or Mnemonics section.', 'English'] }) })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      const result = typeof data.result === 'string' ? data.result : JSON.stringify(data.result)
      setOutput(result)
    } catch { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  async function doSave() {
    if (!user || !output) return
    setSaving(true)
    try {
      await saveItem(user.id, 'study_guide', topic, { output, topic, depth })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
    finally { setSaving(false) }
  }

  function printGuide() {
    const win = window.open('', '_blank')
    win.document.write('<!DOCTYPE html><html><head><title>Study Guide</title>' +
      '<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;color:#111;font-size:14px;line-height:1.7}h1{font-size:22px;margin-bottom:4px}.meta{color:#666;font-size:12px;margin-bottom:24px}pre{white-space:pre-wrap;font-family:inherit}@media print{body{margin:20px}}</style>' +
      '</head><body><h1>' + topic + '</h1><div class="meta">Study Guide</div><pre>' + output + '</pre>' +
      '<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>')
    win.document.close()
  }

  const depths = [
    { id: 'quick',    label: 'Quick',     desc: 'Key points only' },
    { id: 'standard', label: 'Standard',  desc: 'Balanced overview' },
    { id: 'deep',     label: 'Deep Dive', desc: 'Comprehensive' },
  ]


  const generateShareLink = async () => {
    if (!output) return
    const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2)+Date.now().toString(36)
    if (typeof window !== 'undefined') {
      const existing = JSON.parse(localStorage.getItem('ff-shared-guides') || '{}')
      existing[uuid] = { topic, content: output, created: Date.now() }
      localStorage.setItem('ff-shared-guides', JSON.stringify(existing))
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://flashfo.org'
    const url = origin + '/shared/' + uuid
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg('Link copied!')
    } catch {
      setShareMsg('Copy failed')
    }
    setTimeout(() => setShareMsg(''), 2500)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Study Guide Creator</h1>
      <p className="text-sm text-t2 mb-6">Enter any topic or paste your notes and get a complete structured study guide.</p>
      <div className="bg-surface border border-line rounded-2xl p-5 mb-4">
        <textarea value={topic} onChange={e => setTopic(e.target.value)}
          placeholder="e.g. The French Revolution, Cell Mitosis, World War II, Quadratic equations..."
          className="w-full h-32 text-sm text-t1 bg-transparent resize-none outline-none placeholder:text-t3 mb-4"/>
        <div className="mb-5">
          <div className="text-[11px] font-semibold text-t3 uppercase tracking-wider mb-2">Depth</div>
          <div className="flex gap-2">
            {depths.map(d => (
              <button key={d.id} onClick={() => setDepth(d.id)}
                className={'flex-1 px-3 py-2.5 rounded-xl border text-left transition-all ' + (depth === d.id ? 'bg-blue-700 border-blue-700 text-white' : 'bg-surface2 border-line text-t2 hover:border-blue-300')}>
                <div className="text-[12px] font-semibold">{d.label}</div>
                <div className={'text-[10px] mt-0.5 ' + (depth === d.id ? 'text-blue-200' : 'text-t3')}>{d.desc}</div>
              </button>
            ))}
          </div>
        </div>
        {error && <div className="mb-3 text-sm text-red-500">{error}</div>}
        <button onClick={generate} disabled={loading || !topic.trim()}
          className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40 flex items-center gap-2">
          {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Building guide...</> : 'Generate Study Guide'}
        </button>
      </div>
      {output && (
        <div className="bg-surface border border-line rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <span className="text-[13px] font-bold text-t1">Study Guide</span>
            <div className="flex gap-2 items-center flex-wrap">
              {saved && <span className="text-[11px] text-emerald-500 font-medium">Saved!</span>}
              {user && <button onClick={doSave} disabled={saving}
                className="h-7 px-3 bg-emerald-600 text-white text-[11px] font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-40">
                {saving ? 'Saving...' : 'Save'}
              </button>}
              <button onClick={printGuide} title="Print study guide" className="h-7 px-3 bg-surface border border-line text-t2 text-[11px] rounded-lg hover:bg-surface2 flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6V2h8v4M4 11H2V6h12v5h-2M4 9h8v5H4V9z"/></svg>Print
              </button>
              <button onClick={generateShareLink} title="Copy share link"
                style={{ height:34, padding:'0 14px', background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.25)', borderRadius:8, color:'#a78bfa', fontSize:13, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="13" cy="3" r="2"/><circle cx="3" cy="8" r="2"/><circle cx="13" cy="13" r="2"/><path d="M5 7l6-3M5 9l6 3"/></svg>
                {shareMsg || 'Share'}
              </button>
              <button onClick={() => navigator.clipboard.writeText(output)} className="h-7 px-3 bg-surface border border-line text-t2 text-[11px] rounded-lg hover:bg-surface2">Copy</button>
            </div>
          </div>
          <div>{renderStudyGuide(output)}</div>
        </div>
      )}
    </div>
  )
}

  function generateShareLink() {
    if (!output) return
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ topic, content: output }))))
    const url = (typeof window !== 'undefined' ? window.location.origin : '') + '/study-guide?share=' + payload
    if (typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(url).then(() => {
        setShareMsg('Link copied!')
        setTimeout(() => setShareMsg(''), 2500)
      }).catch(() => { setShareMsg(url) })
    }
  }