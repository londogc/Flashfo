'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import { saveItem } from '@/lib/savedItems'

export default function LessonBuilderPage() {
  const { user } = useAuth()
  const [form, setForm] = useState({ topic: '', grade: '', duration: '', objectives: '' })
  const [output, setOutput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [saveFeedback, setSaveFeedback] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function generate() {
    if (!form.topic.trim()) return
    setLoading(true); setOutput(''); setError('')
    try {
      const topicText = [form.topic, form.grade && 'Grade/Level: ' + form.grade, form.duration && 'Duration: ' + form.duration, form.objectives && 'Objectives: ' + form.objectives].filter(Boolean).join(' | ')
      const res = await fetch('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'generateLessonPlanFromItems', args: [[{ type: 'topic', value: topicText }], form.grade || 'General', 'English'] }) })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setOutput(typeof data.result === 'string' ? data.result : JSON.stringify(data.result))
    } catch { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  async function doSave() {
    if (!user || !output) return
    setSaving(true)
    try {
      await saveItem(user.id, 'lesson', form.topic || 'Lesson Plan', { output, form })
      setSaveFeedback('Saved to My Stuff!')
      setTimeout(() => setSaveFeedback(''), 3000)
    } catch { setSaveFeedback('Save failed') }
    finally { setSaving(false) }
  }

  function printLesson() {
    const win = window.open('', '_blank')
    win.document.write('<!DOCTYPE html><html><head><title>Lesson Plan</title>' +
      '<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;color:#111;font-size:13px;line-height:1.6}h1{font-size:20px}pre{white-space:pre-wrap;font-family:inherit}@media print{body{margin:20px}}</style>' +
      '</head><body><h1>' + (form.topic || 'Lesson Plan') + '</h1><pre>' + output + '</pre>' +
      '<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>')
    win.document.close()
  }

  const fields = [
    { k: 'topic', label: 'Topic', ph: 'e.g. The Holocaust, Photosynthesis', required: true },
    { k: 'grade', label: 'Grade / Level', ph: 'e.g. Grade 8, High School, University' },
    { k: 'duration', label: 'Duration', ph: 'e.g. 45 minutes, 1 hour' },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Lesson Builder</h1>
      <p className="text-sm text-t2 mb-6">Fill in the details and get a complete, structured lesson plan instantly.</p>
      <div className="bg-surface border border-line rounded-2xl p-5 space-y-4 mb-4">
        {fields.map(({ k, label, ph, required }) => (
          <div key={k}>
            <label className="block text-[11px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
              {label}{required ? <span className="text-red-400 ml-0.5">*</span> : <span className="text-t3 font-normal normal-case ml-1">(optional)</span>}
            </label>
            <input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
              className="w-full h-9 bg-surface2 border border-line rounded-lg px-3 text-sm text-t1 outline-none focus:border-blue-400 placeholder:text-t3"/>
          </div>
        ))}
        <div>
          <label className="block text-[11px] font-semibold text-t3 uppercase tracking-wider mb-1.5">Learning Objectives <span className="text-t3 font-normal normal-case">(optional)</span></label>
          <textarea value={form.objectives} onChange={e => set('objectives', e.target.value)} placeholder="Students will be able to..." rows={3}
            className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-t1 outline-none focus:border-blue-400 resize-none placeholder:text-t3"/>
        </div>
      </div>
      <button onClick={generate} disabled={loading || !form.topic.trim()}
        className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40 flex items-center gap-2">
        {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Building plan...</> : 'Generate Lesson Plan'}
      </button>
      {error && <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-500">{error}</div>}
      {output && (
        <div className="mt-5 bg-surface border border-line rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[13px] font-bold text-t1">Lesson Plan</span>
            <div className="flex gap-2 items-center">
              {saveFeedback && <span className="text-[11px] text-emerald-500 font-medium">{saveFeedback}</span>}
              {user && <button onClick={doSave} disabled={saving}
                className="h-7 px-3 bg-emerald-600 text-white text-[11px] font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-40">
                {saving ? 'Saving...' : '💾 Save'}
              </button>}
              <button onClick={printLesson} className="h-7 px-3 bg-surface border border-line text-t2 text-[11px] rounded-lg hover:bg-surface2">Print</button>
              <button onClick={() => navigator.clipboard.writeText(output)} className="text-[11px] text-blue-500 font-medium hover:underline">Copy</button>
            </div>
          </div>
          <div className="text-sm text-t1 leading-relaxed whitespace-pre-wrap">{output}</div>
        </div>
      )}
    </div>
  )
}
