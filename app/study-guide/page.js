'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import { saveItem } from '@/lib/savedItems'

export default function StudyGuidePage() {
  const { user } = useAuth()
  const [topic, setTopic]     = useState('')
  const [depth, setDepth]     = useState('standard')
  const [output, setOutput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  async function generate() {
    if (!topic.trim()) return
    setLoading(true); setOutput(''); setError(''); setSaved(false)
    try {
      const depthNote = depth === 'quick' ? ' Keep it concise, key points only.' : depth === 'deep' ? ' Be comprehensive and thorough with examples.' : ''
      const res = await fetch('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'generateStudyGuideFromText', args: [topic.trim() + depthNote, 'English'] }) })
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
              <button onClick={printGuide} className="h-7 px-3 bg-surface border border-line text-t2 text-[11px] rounded-lg hover:bg-surface2 flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6V2h8v4M4 11H2V6h12v5h-2M4 9h8v5H4V9z"/></svg>Print
              </button>
              <button onClick={() => navigator.clipboard.writeText(output)} className="h-7 px-3 bg-surface border border-line text-t2 text-[11px] rounded-lg hover:bg-surface2">Copy</button>
            </div>
          </div>
          <div className="text-sm text-t1 leading-relaxed whitespace-pre-wrap">{output}</div>
        </div>
      )}
    </div>
  )
}