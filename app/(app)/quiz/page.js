'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { saveItem, updateSavedItem } from '@/lib/savedItems'

// ── Print helpers (no template literals) ──────────────────────────────────
function printQuizBlank(questions, topic) {
  const win = window.open('', '_blank')
  const qHtml = questions.map(function(q, i) {
    var labels = ['A','B','C','D']
    var body = ''
    if (q.type === 'fill_blank') {
      body = '<div style="margin:8px 0;border-bottom:1px solid #999;width:200px;display:inline-block"></div>'
    } else if (q.type === 'short_answer') {
      body = '<div style="border:1px solid #ddd;border-radius:6px;height:60px;margin-top:6px"></div>'
    } else if (q.type === 'matching') {
      body = (q.pairs||[]).map(function(p,j){ return '<div style="display:flex;gap:16px;margin:4px 0"><div style="flex:1;padding:4px 8px;border:1px solid #ddd;border-radius:4px">'+(j+1)+'. '+p.left+'</div><div style="flex:1;padding:4px 8px;border:1px solid #ddd;border-radius:4px">___________</div></div>' }).join('')
    } else {
      body = (q.options||(q.type==='true_false'?['True','False']:[])).map(function(o,j){ return '<div style="padding:4px 8px;border:1px solid #ddd;border-radius:4px;margin:3px 0;font-size:12px">'+labels[j]+'. '+o+'</div>' }).join('')
    }
    return '<div style="margin-bottom:18px;page-break-inside:avoid"><div style="font-weight:600;margin-bottom:6px">'+(i+1)+'. '+q.question+'</div>'+body+'</div>'
  }).join('')
  win.document.write('<!DOCTYPE html><html><head><title>Quiz</title>' +
    '<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;color:#111;font-size:13px}h1{font-size:20px}' +
    '.sub{color:#666;font-size:12px;margin-bottom:24px}@media print{body{margin:20px}}</style></head><body>' +
    '<h1>'+(topic||'Quiz')+'</h1><div class="sub">'+questions.length+' questions</div>'+qHtml+
    '<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>')
  win.document.close()
}

function printQuizKey(questions, topic) {
  const win = window.open('', '_blank')
  const labels = ['A','B','C','D']
  const qHtml = questions.map(function(q, i) {
    var body = ''
    if (q.type === 'fill_blank') {
      body = '<div style="padding:4px 8px;background:#d1fae5;border-radius:4px;font-size:12px;display:inline-block">Answer: '+(q.correctAnswer||'')+'</div>'
    } else if (q.type === 'short_answer') {
      body = '<div style="padding:4px 8px;background:#dbeafe;border-radius:4px;font-size:12px">Model: '+(q.correctAnswer||'Open-ended')+'</div>'
    } else if (q.type === 'matching') {
      body = (q.pairs||[]).map(function(p,j){ return '<div style="font-size:12px;margin:2px 0"><strong>'+(j+1)+'. '+p.left+'</strong> → '+p.right+'</div>' }).join('')
    } else {
      body = (q.options||(q.type==='true_false'?['True','False']:[])).map(function(o,j){
        var correct = j === q.answerIndex
        return '<div style="padding:4px 8px;border:1px solid '+(correct?'#6ee7b7':'#e5e7eb')+';background:'+(correct?'#d1fae5':'transparent')+';border-radius:4px;margin:3px 0;font-size:12px;font-weight:'+(correct?'600':'normal')+'">'+labels[j]+'. '+o+(correct?' ✓':'')+'</div>'
      }).join('')
    }
    var exp = q.explanation ? '<div style="margin-top:6px;font-size:11px;color:#555;background:#f9fafb;padding:5px 8px;border-radius:4px;border-left:3px solid #3b82f6"><strong>Explanation:</strong> '+q.explanation+'</div>' : ''
    return '<div style="margin-bottom:18px;page-break-inside:avoid"><div style="font-weight:600;margin-bottom:6px">'+(i+1)+'. '+q.question+'</div>'+body+exp+'</div>'
  }).join('')
  win.document.write('<!DOCTYPE html><html><head><title>Answer Key</title>' +
    '<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;color:#111;font-size:13px}h1{font-size:20px}' +
    '.sub{color:#666;font-size:12px;margin-bottom:24px}@media print{body{margin:20px}}</style></head><body>' +
    '<h1>'+(topic||'Quiz')+' — Answer Key</h1><div class="sub">'+questions.length+' questions</div>'+qHtml+
    '<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>')
  win.document.close()
}

// ── TTS Button ────────────────────────────────────────────────────────────
function SpeakerBtn({ text }) {
  const [busy, setBusy] = useState(false)
  async function speak() {
    if (busy || !text) return
    setBusy(true)
    try {
      const res = await fetch('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'generateOpenAITtsAudio', args: [text, 'nova', 1] }) })
      const d = await res.json()
      const audio = new Audio('data:' + d.result.mimeType + ';base64,' + d.result.base64)
      audio.onended = () => setBusy(false)
      audio.play()
    } catch { setBusy(false) }
  }
  return (
    <button onClick={e => { e.stopPropagation(); speak() }} title="Listen"
      className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full hover:bg-blue-500/10 transition-colors"
      style={{ color: busy ? '#93c5fd' : '#60a5fa', opacity: busy ? 0.6 : 1 }}>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 6h2.5L8 4v8L5.5 10H3V6z"/>
        {busy ? <path d="M10 6.5a2 2 0 010 3"/> : <><path d="M10 5a4 4 0 010 6"/><path d="M12.5 3a7 7 0 010 10"/></>}
      </svg>
    </button>
  )
}

// ── Answer Key Modal ──────────────────────────────────────────────────────
function AnswerKeyModal({ questions, topic, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center" style={{ background: 'rgba(0,0,0,0.5)', padding: '24px 16px', overflowY: 'auto' }}>
      <div className="bg-surface border border-line rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-line">
          <div>
            <div className="text-base font-bold text-t1">Answer Key</div>
            <div className="text-[12px] text-t3 mt-0.5">{topic} · {questions.length} questions</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => printQuizKey(questions, topic)}
              className="h-8 px-3 bg-blue-700 text-white text-[12px] font-semibold rounded-lg hover:bg-blue-800 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6V2h8v4M4 11H2V6h12v5h-2M4 9h8v5H4V9z"/></svg>Print
            </button>
            <button onClick={onClose} className="h-8 w-8 flex items-center justify-center text-t3 hover:text-t1 hover:bg-surface2 rounded-lg text-lg">✕</button>
          </div>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {questions.map((q, i) => (
            <div key={i} className="nova-card" style={{animationDelay:i*120+'ms'}} className="border border-line rounded-xl p-4">
              <p className="text-sm font-semibold text-t1 mb-3">{i + 1}. {q.question}</p>
              {q.type === 'fill_blank' && <div className="px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-600 text-[13px] font-medium">✓ {q.correctAnswer || 'See rubric'}</div>}
              {q.type === 'short_answer' && <div className="px-3 py-2 rounded-lg bg-blue-500/10 text-blue-600 text-[13px]">Model: {q.correctAnswer || 'Open-ended'}</div>}
              {q.type === 'matching' && <div className="space-y-1">{(q.pairs||[]).map((p,j)=><div key={j} className="text-[12px] text-t2"><strong>{p.left}</strong> → {p.right}</div>)}</div>}
              {(q.type === 'mcq' || q.type === 'true_false' || !q.type) && (
                <div className="space-y-1.5">{(q.options || ['True','False']).map((o, j) => (
                  <div key={j} className={'px-3 py-2 rounded-lg text-[13px] flex items-center gap-2 ' + (j === q.answerIndex ? 'bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-300/50' : 'text-t3')}>
                    <span className="font-bold w-4">{['A','B','C','D'][j]}.</span>{o}
                    {j === q.answerIndex && <span className="ml-auto text-emerald-500 text-xs font-bold">✓ Correct</span>}
                  </div>
                ))}</div>
              )}
              {q.explanation && <div className="mt-3 text-[11px] text-t2 bg-surface2 px-3 py-2 rounded-lg border border-line"><span className="font-semibold text-t1">Explanation: </span>{q.explanation}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Edit Panel ────────────────────────────────────────────────────────────
function EditPanel({ questions, onSave, onCancel }) {
  const [qs, setQs] = useState(questions.map(q => ({ ...q, options: [...(q.options || ['True','False'])] })))
  const [addType, setAddType] = useState(null)
  const [newQ, setNewQ] = useState({ question: '', options: ['','','',''], answerIndex: 0, correctAnswer: '', pairs: [{left:'',right:''},{left:'',right:''}] })

  function updateQ(i, field, val) { setQs(d => d.map((q, idx) => idx === i ? { ...q, [field]: val } : q)) }
  function updateOpt(i, j, val) { setQs(d => d.map((q, idx) => idx === i ? { ...q, options: q.options.map((o, oi) => oi === j ? val : o) } : q)) }
  function deleteQ(i) { setQs(d => d.filter((_, idx) => idx !== i)) }

  function commitAdd() {
    if (!newQ.question.trim()) return
    let q
    if (addType === 'mcq') q = { type: 'mcq', question: newQ.question, options: newQ.options.filter(o => o.trim()), answerIndex: newQ.answerIndex, explanation: '' }
    else if (addType === 'true_false') q = { type: 'true_false', question: newQ.question, options: ['True','False'], answerIndex: newQ.answerIndex, explanation: '' }
    else if (addType === 'short_answer') q = { type: 'short_answer', question: newQ.question, correctAnswer: newQ.correctAnswer }
    else if (addType === 'fill_blank') q = { type: 'fill_blank', question: newQ.question, correctAnswer: newQ.correctAnswer }
    else q = { type: 'matching', question: newQ.question, pairs: newQ.pairs.filter(p => p.left.trim()) }
    setQs(d => [...d, q])
    setAddType(null)
    setNewQ({ question: '', options: ['','','',''], answerIndex: 0, correctAnswer: '', pairs: [{left:'',right:''},{left:'',right:''}] })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-t1">Edit Questions <span className="text-sm font-normal text-t3">({qs.length})</span></h2>
        <div className="flex gap-2">
          <button onClick={() => onSave(qs)} className="h-8 px-3 bg-blue-700 text-white text-[12px] font-semibold rounded-lg hover:bg-blue-800">Save Changes</button>
          <button onClick={onCancel} className="h-8 px-3 bg-surface border border-line text-t2 text-[12px] rounded-lg hover:bg-surface2">Cancel</button>
        </div>
      </div>
      <div className="space-y-3 mb-5">
        {qs.map((q, i) => (
          <div key={i} className="bg-surface border border-line rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 uppercase">{q.type || 'mcq'}</span>
              <button onClick={() => deleteQ(i)} className="ml-auto text-[11px] text-red-400 hover:text-red-600 px-2 h-6 border border-red-200 dark:border-red-500/30 rounded-lg">✕ Delete</button>
            </div>
            <textarea value={q.question} onChange={e => updateQ(i, 'question', e.target.value)}
              className="w-full text-sm text-t1 bg-surface2 border border-line rounded-lg p-2 resize-none outline-none focus:border-blue-400 mb-2" rows={2}/>
            {(q.type === 'short_answer' || q.type === 'fill_blank') && (
              <input value={q.correctAnswer || ''} onChange={e => updateQ(i, 'correctAnswer', e.target.value)}
                placeholder="Correct answer..." className="w-full h-8 text-[13px] text-t1 bg-surface2 border border-line rounded-lg px-2 outline-none focus:border-blue-400"/>
            )}
            {(q.type === 'mcq' || q.type === 'true_false' || !q.type) && (
              <div className="space-y-1.5">{(q.options || ['True','False']).map((o, j) => (
                <div key={j} className="flex items-center gap-2">
                  <button onClick={() => updateQ(i, 'answerIndex', j)}
                    className={'w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] flex-shrink-0 transition-colors ' + (q.answerIndex === j ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-line text-t3 hover:border-emerald-400')}>
                    {q.answerIndex === j ? '✓' : ['A','B','C','D'][j]}
                  </button>
                  {q.type === 'true_false' ? <span className="flex-1 text-[13px] text-t1 px-2">{o}</span>
                    : <input value={o} onChange={e => updateOpt(i, j, e.target.value)}
                        className="flex-1 h-8 text-[13px] text-t1 bg-surface2 border border-line rounded-lg px-2 outline-none focus:border-blue-400"/>}
                </div>
              ))}</div>
            )}
          </div>
        ))}
      </div>
      {!addType ? (
        <div className="border-2 border-dashed border-line rounded-xl p-4">
          <p className="text-[12px] font-semibold text-t3 uppercase tracking-wider mb-3">Add Question</p>
          <div className="flex gap-2 flex-wrap">
            {['mcq','true_false','short_answer','fill_blank','matching'].map(t => (
              <button key={t} onClick={() => setAddType(t)}
                className="h-8 px-3 bg-surface2 border border-line text-t2 text-[12px] font-medium rounded-lg hover:border-blue-400 hover:text-blue-500 transition-colors">
                + {t === 'mcq' ? 'MCQ' : t === 'true_false' ? 'True/False' : t === 'short_answer' ? 'Short Answer' : t === 'fill_blank' ? 'Fill Blank' : 'Matching'}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="border-2 border-blue-300/40 rounded-xl p-4 bg-blue-500/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-blue-500 uppercase">New {addType.replace('_',' ')}</span>
            <button onClick={() => setAddType(null)} className="text-t3 hover:text-t1 text-sm">✕</button>
          </div>
          <textarea value={newQ.question} onChange={e => setNewQ(q => ({ ...q, question: e.target.value }))}
            placeholder="Question text..." rows={2}
            className="w-full text-sm text-t1 bg-surface border border-line rounded-lg p-2 resize-none outline-none focus:border-blue-400 mb-3"/>
          {(addType === 'short_answer' || addType === 'fill_blank') && (
            <input value={newQ.correctAnswer} onChange={e => setNewQ(q => ({ ...q, correctAnswer: e.target.value }))}
              placeholder="Correct answer..." className="w-full h-8 text-[13px] text-t1 bg-surface border border-line rounded-lg px-2 outline-none focus:border-blue-400 mb-3"/>
          )}
          {addType === 'mcq' && (
            <div className="space-y-1.5 mb-3">{newQ.options.map((o, j) => (
              <div key={j} className="flex items-center gap-2">
                <button onClick={() => setNewQ(q => ({ ...q, answerIndex: j }))}
                  className={'w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] flex-shrink-0 ' + (newQ.answerIndex === j ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-line text-t3')}>
                  {newQ.answerIndex === j ? '✓' : ['A','B','C','D'][j]}
                </button>
                <input value={o} onChange={e => setNewQ(q => ({ ...q, options: q.options.map((op, oi) => oi === j ? e.target.value : op) }))}
                  placeholder={'Option ' + ['A','B','C','D'][j]}
                  className="flex-1 h-8 text-[13px] text-t1 bg-surface border border-line rounded-lg px-2 outline-none focus:border-blue-400"/>
              </div>
            ))}</div>
          )}
          {addType === 'true_false' && (
            <div className="flex gap-3 mb-3">{['True','False'].map((o, j) => (
              <button key={j} onClick={() => setNewQ(q => ({ ...q, answerIndex: j }))}
                className={'flex-1 h-9 rounded-lg border text-[13px] font-medium transition-colors ' + (newQ.answerIndex === j ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-surface border-line text-t2 hover:border-emerald-400')}>
                {o}
              </button>
            ))}</div>
          )}
          {addType === 'matching' && (
            <div className="space-y-2 mb-3">
              {newQ.pairs.map((p, j) => (
                <div key={j} className="grid grid-cols-2 gap-2">
                  <input value={p.left} onChange={e => setNewQ(q => ({ ...q, pairs: q.pairs.map((pp,pi)=>pi===j?{...pp,left:e.target.value}:pp) }))}
                    placeholder={'Term ' + (j+1)} className="h-8 text-[13px] text-t1 bg-surface border border-line rounded-lg px-2 outline-none focus:border-blue-400"/>
                  <input value={p.right} onChange={e => setNewQ(q => ({ ...q, pairs: q.pairs.map((pp,pi)=>pi===j?{...pp,right:e.target.value}:pp) }))}
                    placeholder={'Match ' + (j+1)} className="h-8 text-[13px] text-t1 bg-surface border border-line rounded-lg px-2 outline-none focus:border-blue-400"/>
                </div>
              ))}
              <button onClick={() => setNewQ(q => ({ ...q, pairs: [...q.pairs, {left:'',right:''}] }))}
                className="text-[11px] text-blue-500 hover:underline">+ Add pair</button>
            </div>
          )}
          <button onClick={commitAdd} disabled={!newQ.question.trim()}
            className="h-8 px-4 bg-blue-700 text-white text-[12px] font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-40">Add Question</button>
        </div>
      )}
    </div>
  )
}

// ── Main Quiz Component ───────────────────────────────────────────────────
const BASE_TYPES = [
  { id: 'mcq', label: 'Multiple Choice' },
  { id: 'true_false', label: 'True / False' },
  { id: 'short_answer', label: 'Short Answer' },
  { id: 'fill_blank', label: 'Fill in the Blank' },
  { id: 'matching', label: 'Matching' },
  { id: 'mixed', label: 'Mixed' },
]

function buildConfig(typeId, count, breakdown) {
  if (typeId === 'mcq') return { mcq: count }
  if (typeId === 'true_false') return { true_false: count }
  if (typeId === 'short_answer') return { short_answer: count }
  if (typeId === 'fill_blank') return { fill_blank: count }
  if (typeId === 'matching') return { matching: count }
  const cfg = {}
  if ((breakdown.mcq || 0) > 0) cfg.mcq = breakdown.mcq
  if ((breakdown.tf || 0) > 0) cfg.true_false = breakdown.tf
  if ((breakdown.sa || 0) > 0) cfg.short_answer = breakdown.sa
  if ((breakdown.fitb || 0) > 0) cfg.fill_blank = breakdown.fitb
  if ((breakdown.match || 0) > 0) cfg.matching = breakdown.match
  return cfg
}

export default function QuizPage() {
  const { user } = useAuth()
  const [typeId, setTypeId] = useState('mcq')
  const [count, setCount] = useState(5)
  const [breakdown, setBreakdown] = useState({ mcq: 0, tf: 0, sa: 0, fitb: 0, match: 0 })
  const [topic, setTopic] = useState('')
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState({})
  const [saInputs, setSaInputs] = useState({})
  const [fitbInputs, setFitbInputs] = useState({})
  const [matchAnswers, setMatchAnswers] = useState({})
  const [shuffledRights, setShuffledRights] = useState({})
  const [saGrades, setSaGrades] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [savedId, setSavedId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState('')
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const [pendingNav, setPendingNav] = useState(null)

  // Warn before leaving with unsaved generated quiz
  useEffect(() => {
    if (!questions.length || savedId) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [questions.length, savedId])
  const [showSave, setShowSave] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')

  const breakdownTotal = (breakdown.mcq||0) + (breakdown.tf||0) + (breakdown.sa||0) + (breakdown.fitb||0) + (breakdown.match||0)

  function initMatching(qs) {
    const s = {}
    qs.forEach((q, i) => {
      if (q.type === 'matching' && q.pairs) s[i] = [...q.pairs.map(p => p.right)].sort(() => Math.random() - 0.5)
    })
    setShuffledRights(s)
  }

  async function generate() {
    if (!topic.trim()) return
    setLoading(true); setQuestions([]); setSelected({}); setSaInputs({}); setFitbInputs({}); setMatchAnswers({}); setSaGrades({}); setSubmitted(false); setError(''); setSavedId(null)
    try {
      const cfg = buildConfig(typeId, count, breakdown)
      const typeInstructions = Object.entries(cfg).map(([t, n]) => {
        if (t === 'mcq') return n + ' multiple choice questions (4 options A-D, one correct)'
        if (t === 'true_false') return n + ' true/false questions'
        if (t === 'short_answer') return n + ' short answer questions'
        if (t === 'fill_blank') return n + ' fill-in-the-blank questions (single word or short phrase answer)'
        if (t === 'matching') return n + ' matching questions (4-5 pairs, term to definition)'
        return ''
      }).filter(Boolean).join(', ')
      const prompt = 'Generate a quiz about: ' + topic.trim() + '\n\nCreate exactly: ' + typeInstructions + '\n\nReturn ONLY valid JSON in this exact format, no other text:\n{\n  "questions": [\n    {\n      "type": "mcq",\n      "question": "Question text",\n      "options": ["A","B","C","D"],\n      "answerIndex": 0,\n      "explanation": "Why this is correct"\n    },\n    {\n      "type": "true_false",\n      "question": "Statement",\n      "options": ["True","False"],\n      "answerIndex": 0,\n      "explanation": "Explanation"\n    },\n    {\n      "type": "short_answer",\n      "question": "Question",\n      "correctAnswer": "Expected answer",\n      "explanation": "Explanation"\n    },\n    {\n      "type": "fill_blank",\n      "question": "The ___ is ...",\n      "correctAnswer": "word",\n      "explanation": "Explanation"\n    },\n    {\n      "type": "matching",\n      "question": "Match each term to its definition",\n      "pairs": [{"left":"Term","right":"Definition"}]\n    }\n  ]\n}'
      const res = await fetch('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'generateChatResponse', args: [[{role:'user',content:prompt}], 'You are a quiz generator. Return ONLY valid JSON. No markdown, no backticks, no explanation. Just the raw JSON object.'] }) })
      const data = await res.json()
      const raw = data.result?.content || data.result || ''
      const text = typeof raw === 'string' ? raw : JSON.stringify(raw)
      const clean = text.replace(/```json|```/g,'').trim()
      let parsed
      try { parsed = JSON.parse(clean) } catch(e) {
        // Try to extract JSON from response
        const match = clean.match(/\{[\s\S]*\}/)
        if (match) parsed = JSON.parse(match[0])
        else { setError('Could not parse quiz response. Try again.'); return }
      }
      const qs = parsed?.questions || []
      if (!qs.length) { setError('Could not generate quiz. Try a more specific topic.'); return }
      setQuestions(qs); initMatching(qs)
    } catch(e) { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  async function doSave() {
    if (!user) return
    setSaving(true)
    try {
      const payload = { questions, topic, type: typeId }
      if (savedId) {
        await updateSavedItem(savedId, { title: saveTitle || topic, data: payload })
        setSaveFeedback('Updated!')
      } else {
        const r = await saveItem(user.id, 'quiz', saveTitle || topic, payload)
        setSavedId(r.id)
        setSaveFeedback('Saved!')
      }
      setShowSave(false)
      setTimeout(() => setSaveFeedback(''), 3000)
    } catch { setSaveFeedback('Save failed') }
    finally { setSaving(false) }
  }

  const autoScore = submitted ? questions.filter((q, i) => {
    if (q.type === 'short_answer' || q.type === 'matching') return false
    if (q.type === 'fill_blank') return (fitbInputs[i]||'').toLowerCase().trim() === (q.correctAnswer||'').toLowerCase().trim()
    return selected[i] === q.answerIndex
  }).length : 0
  const saScore = submitted ? Object.values(saGrades).filter(g => g === 'correct').length : 0
  const score = autoScore + saScore
  const pct = questions.length ? Math.round(score / questions.length * 100) : 0

  if (editMode) return <EditPanel questions={questions}
    onSave={qs => { setQuestions(qs); setEditMode(false); setSelected({}); setSaInputs({}); setFitbInputs({}); setMatchAnswers({}); setSaGrades({}); setSubmitted(false); initMatching(qs) }}
    onCancel={() => setEditMode(false)}/>

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Quiz</h1>
      <p className="text-sm text-t2 mb-6">Generate a quiz on any topic and test your knowledge.</p>

      {showUnsavedModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)'}}>
          <div className="bg-surface border border-line rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div className="text-3xl mb-3">⚠️</div>
            <h3 className="text-base font-bold text-t1 mb-2">Unsaved Progress</h3>
            <p className="text-sm text-t2 mb-5">You have a generated quiz that hasn't been saved. Save it to My Stuff before leaving?</p>
            <div className="flex gap-2">
              <button onClick={() => { setShowUnsavedModal(false); setShowSave(true) }}
                className="flex-1 h-9 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800">Save Quiz</button>
              <button onClick={() => { setShowUnsavedModal(false); setQuestions([]); setSavedId(null) }}
                className="h-9 px-4 bg-surface border border-line text-t2 text-sm rounded-xl hover:bg-surface2">Discard</button>
            </div>
          </div>
        </div>
      )}
      {showKey && <AnswerKeyModal questions={questions} topic={topic} onClose={() => setShowKey(false)}/>}

      {showSave && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-surface border border-line rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-base font-bold text-t1 mb-4">Save Quiz</div>
            <input value={saveTitle} onChange={e => setSaveTitle(e.target.value)} placeholder={topic || 'Quiz title...'}
              className="w-full h-9 bg-surface2 border border-line rounded-lg px-3 text-sm text-t1 outline-none focus:border-blue-400 mb-4"/>
            <div className="flex gap-2">
              <button onClick={doSave} disabled={saving}
                className="flex-1 h-9 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40">
                {saving ? 'Saving...' : 'Save to My Stuff'}
              </button>
              <button onClick={() => setShowSave(false)} className="h-9 px-4 bg-surface border border-line text-t2 text-sm rounded-xl hover:bg-surface2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {!questions.length ? (
        <div className="bg-surface border border-line rounded-2xl p-5">
          <textarea value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="Enter a topic or paste notes to generate a quiz from..."
            className="w-full h-28 text-sm text-t1 bg-transparent resize-none outline-none placeholder:text-t3 mb-5"/>

          <div className="mb-5">
            <div className="text-[11px] font-semibold text-t3 uppercase tracking-wider mb-2">Question Type</div>
            <div className="flex gap-2 flex-wrap">
              {BASE_TYPES.map(t => (
                <button key={t.id} onClick={() => { setTypeId(t.id); if(t.id==='mixed') setBreakdown({mcq:0,tf:0,sa:0,fitb:0,match:0}) }}
                  className={'h-8 px-3 rounded-lg text-[12px] font-medium border transition-all ' + (typeId === t.id ? 'bg-blue-700 text-white border-blue-700' : 'bg-surface2 text-t2 border-line hover:border-blue-300')}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {typeId === 'mixed' && (
            <div className="mb-5 p-4 bg-surface2 rounded-xl border border-line">
              <div className="text-[11px] font-semibold text-t3 uppercase tracking-wider mb-3">
                Breakdown <span className="text-emerald-500">({breakdownTotal} QUESTIONS)</span>
              </div>
              <style>{`
                .bd-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
                @media(max-width:640px){.bd-grid{grid-template-columns:1fr 1fr;gap:10px}}
                @media(max-width:480px){.bd-grid{grid-template-columns:1fr;gap:8px}}
              `}</style>
              <div className="bd-grid">
                {[{k:'mcq',label:'Multiple Choice'},{k:'tf',label:'True / False'},{k:'sa',label:'Short Answer'},{k:'fitb',label:'Fill in Blank'},{k:'match',label:'Matching'}].map(({k,label}) => (
                  <div key={k} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--c-surface)',border:'1px solid var(--c-line)',borderRadius:10,padding:'8px 12px'}}>
                    <span style={{fontSize:12,fontWeight:600,color:'var(--c-t2)',flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingRight:6}}>{label}</span>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                      <button onClick={() => setBreakdown(b => ({ ...b, [k]: Math.max(0, (b[k]||0) - 1) }))}
                        style={{width:30,height:30,borderRadius:8,border:'1px solid var(--c-line)',background:'none',color:'var(--c-t2)',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>−</button>
                      <span style={{fontSize:15,fontWeight:700,color:'#3b82f6',width:22,textAlign:'center'}}>{breakdown[k]||0}</span>
                      <button onClick={() => setBreakdown(b => ({ ...b, [k]: (b[k]||0) + 1 }))}
                        style={{width:30,height:30,borderRadius:8,border:'1px solid var(--c-line)',background:'none',color:'var(--c-t2)',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-semibold text-t3 uppercase tracking-wider">Number of Questions</div>
              <div className="text-[18px] font-bold text-blue-600">{typeId === 'mixed' ? breakdownTotal : count}</div>
            </div>
            {typeId !== 'mixed' && (
              <>
                <input type="range" min={5} max={35} step={1} value={count}
                  onChange={e => setCount(Number(e.target.value))} onInput={e => setCount(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer" style={{ height: 4 }}/>
                <div className="flex justify-between text-[10px] text-t3 mt-1.5"><span>5</span><span>10</span><span>20</span><span>35</span></div>
              </>
            )}
          </div>

          {error && <div className="mb-3 text-sm text-red-500">{error}</div>}
          <button onClick={generate} disabled={loading} style={{width:'100%',padding:'13px 0',borderRadius:10,border:'none',background:'linear-gradient(90deg,#2563eb,#7c3aed)',color:'#fff',fontSize:14,fontWeight:700,cursor:loading?'not-allowed':'pointer',opacity:loading?0.6:1,letterSpacing:'-0.01em'}}>
            className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 flex items-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Generating...</> : 'Generate ' + (typeId === 'mixed' ? breakdownTotal : count) + ' Questions'}
          </button>
        </div>
      ) : (
        <div>
          {submitted && (
            <div className={'mb-5 p-4 rounded-xl border text-sm font-semibold ' + (pct === 100 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : pct >= 60 ? 'bg-blue-500/10 border-blue-500/20 text-blue-600' : 'bg-amber-500/10 border-amber-500/20 text-amber-600')}>
              {score}/{questions.length} correct ({pct}%) — {pct === 100 ? 'Perfect!' : pct >= 60 ? 'Good job!' : 'Keep practising.'}
            </div>
          )}

          <div className="space-y-4 mb-6">
            {questions.map((q, i) => {
              const isSA = q.type === 'short_answer'
              const isFITB = q.type === 'fill_blank'
              const isMatch = q.type === 'matching'
              return (
                <div key={i} className="bg-surface border border-line rounded-xl p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-[10px] font-bold bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full uppercase flex-shrink-0 mt-0.5">{q.type || 'mcq'}</span>
                    <p className="text-sm font-semibold text-t1 flex-1">{i + 1}. {q.question}</p>
                    <SpeakerBtn text={q.question}/>
                  </div>

                  {isFITB && (
                    <div>
                      <div className="flex items-center gap-2 text-sm text-t1 mb-2">
                        <span>Answer:</span>
                        <input value={fitbInputs[i]||''} onChange={e => setFitbInputs(s => ({ ...s, [i]: e.target.value }))}
                          disabled={submitted} placeholder="Fill in the blank..."
                          className="flex-1 h-9 bg-surface2 border border-line rounded-lg px-3 text-sm text-t1 outline-none focus:border-blue-400 disabled:opacity-70"/>
                      </div>
                      {submitted && (
                        <div className={'text-[12px] px-3 py-2 rounded-lg ' + ((fitbInputs[i]||'').toLowerCase().trim() === (q.correctAnswer||'').toLowerCase().trim() ? 'bg-emerald-500/10 text-emerald-600 font-semibold' : 'bg-red-500/10 text-red-500')}>
                          {(fitbInputs[i]||'').toLowerCase().trim() === (q.correctAnswer||'').toLowerCase().trim() ? '✓ Correct!' : '✗ Answer: ' + q.correctAnswer}
                        </div>
                      )}
                    </div>
                  )}

                  {isMatch && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-t3 uppercase px-1 mb-1"><span>Term</span><span>Match</span></div>
                      {(q.pairs||[]).map((pair, j) => (
                        <div key={j} className="grid grid-cols-2 gap-2 items-center">
                          <div className="px-3 py-2 bg-surface2 border border-line rounded-lg text-[13px] text-t1">{pair.left}</div>
                          <select value={matchAnswers[i]?.[j]||''} onChange={e => setMatchAnswers(s => ({ ...s, [i]: { ...(s[i]||{}), [j]: e.target.value } }))}
                            disabled={submitted}
                            className="h-9 bg-surface2 border border-line rounded-lg px-2 text-[13px] text-t1 outline-none focus:border-blue-400 disabled:opacity-70"
                            style={{ borderColor: submitted ? (matchAnswers[i]?.[j] === pair.right ? '#10b981' : '#ef4444') : 'var(--c-line)' }}>
                            <option value="">Select...</option>
                            {(shuffledRights[i]||[]).map((r, ri) => <option key={ri} value={r}>{r}</option>)}
                          </select>
                        </div>
                      ))}
                      {submitted && <div className="text-[11px] text-t3 mt-1">{(q.pairs||[]).map(p => p.left + ' → ' + p.right).join(' · ')}</div>}
                    </div>
                  )}

                  {isSA && (
                    <div>
                      <textarea value={saInputs[i]||''} onChange={e => setSaInputs(s => ({ ...s, [i]: e.target.value }))}
                        placeholder="Type your answer here..." disabled={submitted} rows={3}
                        className="w-full text-sm text-t1 bg-surface2 border border-line rounded-lg p-3 resize-none outline-none focus:border-blue-400 disabled:opacity-70 mb-2"/>
                      {submitted && (
                        <div className="space-y-2">
                          <div className="text-[12px] text-t2 bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-300/30">
                            <span className="font-semibold text-blue-600">Model answer: </span>{q.correctAnswer || 'Open-ended'}
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className="text-[11px] text-t3">Self-grade:</span>
                            {['correct','wrong'].map(g => (
                              <button key={g} onClick={() => setSaGrades(s => ({ ...s, [i]: g }))}
                                className={'h-7 px-3 rounded-lg text-[12px] font-medium border transition-colors ' + (saGrades[i] === g ? (g === 'correct' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-red-500 text-white border-red-500') : 'border-line text-t2 hover:bg-surface2')}>
                                {g === 'correct' ? '✓ Correct' : '✗ Wrong'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!isSA && !isFITB && !isMatch && (
                    <div className="space-y-2">
                      {(q.options || ['True','False']).map((opt, j) => {
                        const isSel = selected[i] === j
                        const isCorr = q.answerIndex === j
                        let cls = 'border-line text-t2 hover:border-blue-300 hover:bg-surface2'
                        if (submitted) {
                          if (isCorr) cls = 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                          else if (isSel) cls = 'border-red-400 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                          else cls = 'border-line text-t3 opacity-60'
                        } else if (isSel) cls = 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'

  useEffect(() => {
    const id = 'nova-gen-anim'
    if (document.getElementById(id)) return
    const s = document.createElement('style')
    s.id = id
    s.textContent = '@keyframes nova-pop{0%{opacity:0;transform:translateY(14px) scale(0.97)}60%{opacity:1;transform:translateY(-3px) scale(1.005)}100%{opacity:1;transform:translateY(0) scale(1)}} @keyframes nova-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.85)}} .nova-card{opacity:0;animation:nova-pop .42s cubic-bezier(.22,.68,0,1.2) forwards} .nova-dot-pulse{animation:nova-pulse .9s ease-in-out infinite}'
    document.head.appendChild(s)
  }, [])

                        return (
                          <button key={j} onClick={() => !submitted && setSelected(s => ({ ...s, [i]: j }))}
                            className={'w-full text-left px-3 py-2.5 rounded-lg border text-[13px] transition-all ' + cls}>
                            <span className="font-semibold mr-2">{['A','B','C','D'][j]}.</span>{opt}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {submitted && q.explanation && (
                    <div className="mt-3 text-[11px] text-t2 bg-surface2 px-3 py-2 rounded-lg border border-line">
                      <span className="font-semibold text-t1">Explanation: </span>{q.explanation}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {!submitted && (
              <button onClick={() => setSubmitted(true)}
                disabled={Object.keys(selected).length === 0 && !Object.keys(saInputs).some(k => saInputs[k]?.trim())}
                className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40">
                Submit Answers
              </button>
            )}
            <button onClick={() => setShowKey(true)}
              className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl hover:bg-surface2 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="7"/><path d="M8 5v4m0 2.5v.5"/></svg>Answer Key
            </button>
            <button onClick={() => printQuizBlank(questions, topic)}
              className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl hover:bg-surface2 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6V2h8v4M4 11H2V6h12v5h-2M4 9h8v5H4V9z"/></svg>Print Quiz
            </button>
            <button onClick={() => setEditMode(true)}
              className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl hover:bg-surface2">
              Edit / Add Questions
            </button>
            {user && (
              <button onClick={() => { setSaveTitle(topic); setShowSave(true) }}
                className="h-9 px-4 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 flex items-center gap-1.5">
                💾 {savedId ? 'Update Save' : 'Save Quiz'}
              </button>
            )}
            {saveFeedback && <span className="text-[12px] text-emerald-500 font-medium">{saveFeedback}</span>}
            <button onClick={() => { if (questions.length && !savedId) { setShowUnsavedModal(true) } else { setQuestions([]); setError(''); setSavedId(null) } }}
              className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl hover:bg-surface2 ml-auto">
              New Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
