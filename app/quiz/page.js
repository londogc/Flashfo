'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { saveItem, updateSavedItem, deleteItem } from '@/lib/savedItems'

// ── TTS Button ─────────────────────────────────────────────────────────────
function SpeakerBtn({ text }) {
  const [busy, setBusy] = useState(false)
  async function speak() {
    if (busy || !text) return
    setBusy(true)
    try {
      const res = await fetch('/api/rpc', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ fn:'generateOpenAITtsAudio', args:[text,'nova',1] }) })
      const d = await res.json()
      const audio = new Audio('data:' + d.result.mimeType + ';base64,' + d.result.base64)
      audio.onended = () => setBusy(false)
      audio.play()
    } catch { setBusy(false) }
  }
  return (
    <button onClick={e=>{e.stopPropagation();speak()}} title="Listen"
      className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full hover:bg-blue-500/10 transition-colors"
      style={{color:busy?'#93c5fd':'#60a5fa',opacity:busy?0.6:1}}>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 6h2.5L8 4v8L5.5 10H3V6z"/>
        {busy?<path d="M10 6.5a2 2 0 010 3"/>:<><path d="M10 5a4 4 0 010 6"/><path d="M12.5 3a7 7 0 010 10"/></>}
      </svg>
    </button>
  )
}

// ── Answer Key Modal ────────────────────────────────────────────────────────
function AnswerKeyModal({ questions, topic, onClose }) {
  function printKey() {
    const win = window.open('','_blank')
    win.document.write(`<!DOCTYPE html><html><head><title>Answer Key — ${topic}</title>
    <style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;color:#111}h1{font-size:20px;margin-bottom:4px}.sub{font-size:13px;color:#666;margin-bottom:28px}.q{margin-bottom:20px;page-break-inside:avoid}.qt{font-size:14px;font-weight:600;margin-bottom:8px}.opt{font-size:13px;padding:4px 8px;border-radius:6px;margin-bottom:4px}.correct{background:#d1fae5;color:#065f46;font-weight:600}.other{color:#555}.sa-ans{font-size:13px;background:#dbeafe;color:#1e40af;padding:6px 10px;border-radius:6px;margin-top:4px}.exp{font-size:12px;color:#666;margin-top:6px;padding:6px 10px;background:#f9fafb;border-radius:6px}@media print{body{margin:20px}}</style>
    </head><body>
    <h1>Answer Key</h1><div class="sub">${topic} · ${questions.length} questions</div>
    ${questions.map((q,i)=>`<div class="q"><div class="qt">${i+1}. ${q.question}</div>
    ${q.type==='short_answer'
      ? `<div class="sa-ans">✓ ${q.correctAnswer||'(see rubric)'}</div>`
      : (q.options||['True','False']).map((o,j)=>`<div class="opt ${j===q.answerIndex?'correct':'other'}">${['A','B','C','D'][j]}. ${o}${j===q.answerIndex?' ✓':''}</div>`).join('')}
    ${q.explanation?`<div class="exp"><strong>Explanation:</strong> ${q.explanation}</div>`:''}</div>`).join('')}
    </body></html>`)
    win.document.close(); win.focus(); win.print()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center" style={{background:'rgba(0,0,0,0.5)',padding:'24px 16px',overflowY:'auto'}}>
      <div className="bg-surface border border-line rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-line">
          <div><div className="text-base font-bold text-t1">Answer Key</div>
            <div className="text-[12px] text-t3 mt-0.5">{topic} · {questions.length} questions</div></div>
          <div className="flex gap-2">
            <button onClick={printKey} className="h-8 px-3 bg-blue-700 text-white text-[12px] font-semibold rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6V2h8v4M4 11H2V6h12v5h-2M4 9h8v5H4V9z"/></svg>Print</button>
            <button onClick={onClose} className="h-8 w-8 flex items-center justify-center text-t3 hover:text-t1 hover:bg-surface2 rounded-lg transition-colors text-lg">✕</button>
          </div>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {questions.map((q,i)=>(
            <div key={i} className="border border-line rounded-xl p-4">
              <p className="text-sm font-semibold text-t1 mb-3">{i+1}. {q.question}</p>
              {q.type==='short_answer'
                ? <div className="px-3 py-2 rounded-lg bg-blue-500/10 text-blue-600 text-[13px] font-medium">✓ {q.correctAnswer||'Open-ended'}</div>
                : <div className="space-y-1.5">{(q.options||['True','False']).map((o,j)=>(
                    <div key={j} className={`px-3 py-2 rounded-lg text-[13px] flex items-center gap-2 ${j===q.answerIndex?'bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-300/50':'text-t3'}`}>
                      <span className="font-bold w-4">{['A','B','C','D'][j]}.</span>{o}
                      {j===q.answerIndex&&<span className="ml-auto text-emerald-500 text-xs font-bold">✓ Correct</span>}
                    </div>))}
                  </div>}
              {q.explanation&&<div className="mt-3 text-[11px] text-t2 bg-surface2 px-3 py-2 rounded-lg border border-line"><span className="font-semibold text-t1">Explanation: </span>{q.explanation}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Edit / Add Question Panel ───────────────────────────────────────────────
function EditPanel({ questions, onSave, onCancel }) {
  const [qs, setQs] = useState(questions.map(q=>({...q,options:[...(q.options||['True','False'])]})))
  const [addType, setAddType] = useState(null) // null | 'mcq' | 'true_false' | 'short_answer'
  const [newQ, setNewQ] = useState({ question:'', options:['','','',''], answerIndex:0, correctAnswer:'' })

  function updateQ(i, field, val) { setQs(d=>d.map((q,idx)=>idx===i?{...q,[field]:val}:q)) }
  function updateOpt(i,j,val) { setQs(d=>d.map((q,idx)=>idx===i?{...q,options:q.options.map((o,oi)=>oi===j?val:o)}:q)) }
  function deleteQ(i) { setQs(d=>d.filter((_,idx)=>idx!==i)) }

  function commitAdd() {
    if (!newQ.question.trim()) return
    let q
    if (addType==='mcq') q={type:'mcq',question:newQ.question,options:newQ.options.filter(o=>o.trim()),answerIndex:newQ.answerIndex,explanation:''}
    else if (addType==='true_false') q={type:'true_false',question:newQ.question,options:['True','False'],answerIndex:newQ.answerIndex,explanation:''}
    else q={type:'short_answer',question:newQ.question,correctAnswer:newQ.correctAnswer}
    setQs(d=>[...d,q])
    setAddType(null)
    setNewQ({question:'',options:['','','',''],answerIndex:0,correctAnswer:''})
  }

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-t1">Edit Questions <span className="text-sm font-normal text-t3">({qs.length})</span></h2>
        <div className="flex gap-2">
          <button onClick={()=>onSave(qs)} className="h-8 px-3 bg-blue-700 text-white text-[12px] font-semibold rounded-lg hover:bg-blue-800">Save Changes</button>
          <button onClick={onCancel} className="h-8 px-3 bg-surface border border-line text-t2 text-[12px] rounded-lg hover:bg-surface2">Cancel</button>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        {qs.map((q,i)=>(
          <div key={i} className="bg-surface border border-line rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 uppercase">{q.type||'mcq'}</span>
              <span className="text-[11px] text-t3">Q{i+1}</span>
              <button onClick={()=>deleteQ(i)} className="ml-auto text-[11px] text-red-400 hover:text-red-600 px-2 h-6 border border-red-200 dark:border-red-500/30 rounded-lg">✕ Delete</button>
            </div>
            <textarea value={q.question} onChange={e=>updateQ(i,'question',e.target.value)}
              className="w-full text-sm text-t1 bg-surface2 border border-line rounded-lg p-2 resize-none outline-none focus:border-blue-400 mb-2" rows={2}/>
            {q.type==='short_answer'
              ? <input value={q.correctAnswer||''} onChange={e=>updateQ(i,'correctAnswer',e.target.value)}
                  placeholder="Correct answer / rubric..."
                  className="w-full h-8 text-[13px] text-t1 bg-surface2 border border-line rounded-lg px-2 outline-none focus:border-blue-400"/>
              : <div className="space-y-1.5">{(q.options||['True','False']).map((o,j)=>(
                  <div key={j} className="flex items-center gap-2">
                    <button onClick={()=>updateQ(i,'answerIndex',j)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] flex-shrink-0 transition-colors ${q.answerIndex===j?'border-emerald-500 bg-emerald-500 text-white':'border-line text-t3 hover:border-emerald-400'}`}>
                      {q.answerIndex===j?'✓':['A','B','C','D'][j]}</button>
                    {q.type==='true_false'
                      ? <span className="flex-1 h-8 text-[13px] text-t1 px-2 flex items-center">{o}</span>
                      : <input value={o} onChange={e=>updateOpt(i,j,e.target.value)}
                          className="flex-1 h-8 text-[13px] text-t1 bg-surface2 border border-line rounded-lg px-2 outline-none focus:border-blue-400"/>}
                  </div>))}</div>}
          </div>
        ))}
      </div>

      {/* Add Question */}
      {!addType ? (
        <div className="border-2 border-dashed border-line rounded-xl p-4">
          <p className="text-[12px] font-semibold text-t3 uppercase tracking-wider mb-3">Add Question</p>
          <div className="flex gap-2">
            {['mcq','true_false','short_answer'].map(t=>(
              <button key={t} onClick={()=>{setAddType(t);setNewQ({question:'',options:['','','',''],answerIndex:0,correctAnswer:''})}}
                className="h-8 px-3 bg-surface2 border border-line text-t2 text-[12px] font-medium rounded-lg hover:border-blue-400 hover:text-blue-500 transition-colors">
                {t==='mcq'?'+ MCQ':t==='true_false'?'+ True/False':'+ Short Answer'}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="border-2 border-blue-300/40 rounded-xl p-4 bg-blue-500/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-blue-500 uppercase">{addType==='mcq'?'New MCQ':addType==='true_false'?'New True/False':'New Short Answer'}</span>
            <button onClick={()=>setAddType(null)} className="text-t3 hover:text-t1 text-sm">✕</button>
          </div>
          <textarea value={newQ.question} onChange={e=>setNewQ(q=>({...q,question:e.target.value}))}
            placeholder="Question text..." rows={2}
            className="w-full text-sm text-t1 bg-surface border border-line rounded-lg p-2 resize-none outline-none focus:border-blue-400 mb-3"/>
          {addType==='short_answer' && (
            <input value={newQ.correctAnswer} onChange={e=>setNewQ(q=>({...q,correctAnswer:e.target.value}))}
              placeholder="Correct answer / rubric..." className="w-full h-8 text-[13px] text-t1 bg-surface border border-line rounded-lg px-2 outline-none focus:border-blue-400 mb-3"/>
          )}
          {addType==='mcq' && (
            <div className="space-y-1.5 mb-3">
              {newQ.options.map((o,j)=>(
                <div key={j} className="flex items-center gap-2">
                  <button onClick={()=>setNewQ(q=>({...q,answerIndex:j}))}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] flex-shrink-0 ${newQ.answerIndex===j?'border-emerald-500 bg-emerald-500 text-white':'border-line text-t3'}`}>
                    {newQ.answerIndex===j?'✓':['A','B','C','D'][j]}</button>
                  <input value={o} onChange={e=>setNewQ(q=>({...q,options:q.options.map((op,oi)=>oi===j?e.target.value:op)}))}
                    placeholder={`Option ${['A','B','C','D'][j]}`} className="flex-1 h-8 text-[13px] text-t1 bg-surface border border-line rounded-lg px-2 outline-none focus:border-blue-400"/>
                </div>
              ))}
            </div>
          )}
          {addType==='true_false' && (
            <div className="flex gap-3 mb-3">
              {['True','False'].map((o,j)=>(
                <button key={j} onClick={()=>setNewQ(q=>({...q,answerIndex:j}))}
                  className={`flex-1 h-9 rounded-lg border text-[13px] font-medium transition-colors ${newQ.answerIndex===j?'bg-emerald-500 text-white border-emerald-500':'bg-surface border-line text-t2 hover:border-emerald-400'}`}>{o}</button>
              ))}
            </div>
          )}
          <button onClick={commitAdd} disabled={!newQ.question.trim()}
            className="h-8 px-4 bg-blue-700 text-white text-[12px] font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-40">Add Question</button>
        </div>
      )}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────
const BASE_TYPES = [
  { id:'mcq',        label:'Multiple Choice' },
  { id:'true_false', label:'True / False' },
  { id:'short_answer',label:'Short Answer' },
  { id:'mixed',      label:'Mixed' },
]

function buildConfig(typeId, count, breakdown) {
  if (typeId==='mcq')         return { mcq: count }
  if (typeId==='true_false')  return { true_false: count }
  if (typeId==='short_answer')return { short_answer: count }
  // mixed — use breakdown
  const cfg = {}
  if (breakdown.mcq > 0) cfg.mcq = breakdown.mcq
  if (breakdown.tf  > 0) cfg.true_false = breakdown.tf
  if (breakdown.sa  > 0) cfg.short_answer = breakdown.sa
  return cfg
}

export default function QuizPage({ initialQuiz }) {
  const { user } = useAuth()
  const [typeId, setTypeId]   = useState('mcq')
  const [count, setCount]     = useState(5)
  const [breakdown, setBreakdown] = useState({ mcq:2, tf:2, sa:1 })
  const [topic, setTopic]     = useState('')
  const [questions, setQuestions] = useState(initialQuiz?.questions || [])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected]   = useState({})
  const [saInputs, setSaInputs]   = useState({})   // short answer typed answers
  const [saGrades, setSaGrades]   = useState({})   // 'correct'|'wrong'|null
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]     = useState('')
  const [showKey, setShowKey] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [savedId, setSavedId] = useState(initialQuiz?.id || null)
  const [saving, setSaving]   = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState('')

  // Sync breakdown sum with count slider
  function syncBreakdown(newCount) {
    const total = breakdown.mcq + breakdown.tf + breakdown.sa
    if (total === newCount) return
    const ratio = newCount / (total || 1)
    const mcq = Math.max(0, Math.round(breakdown.mcq * ratio))
    const tf  = Math.max(0, Math.round(breakdown.tf  * ratio))
    const sa  = Math.max(0, newCount - mcq - tf)
    setBreakdown({ mcq, tf, sa })
  }

  async function generate() {
    if (!topic.trim()) return
    setLoading(true); setQuestions([]); setSelected({}); setSaInputs({}); setSaGrades({}); setSubmitted(false); setError(''); setSavedId(null)
    try {
      const res = await fetch('/api/rpc', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ fn:'generateQuizAdvancedFromText', args:[topic.trim(), buildConfig(typeId,count,breakdown),'English'] }) })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      const qs = data.result?.questions || []
      if (!qs.length) { setError('Could not generate quiz. Try adding more detail.'); return }
      setQuestions(qs)
    } catch { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  async function doSave() {
    if (!user) return
    setSaving(true)
    try {
      const payload = { questions, topic, type: typeId }
      if (savedId) {
        await updateSavedItem(savedId, { title: saveTitle||topic, data: payload })
        setSaveFeedback('✓ Updated!')
      } else {
        const result = await saveItem(user.id, 'quiz', saveTitle||topic, payload)
        setSavedId(result.id)
        setSaveFeedback('✓ Saved!')
      }
      setShowSaveDialog(false)
      setTimeout(()=>setSaveFeedback(''), 3000)
    } catch(e) { setSaveFeedback('Save failed: '+e.message) }
    finally { setSaving(false) }
  }

  const autoScore = submitted ? questions.filter((q,i)=>q.type!=='short_answer'&&selected[i]===q.answerIndex).length : 0
  const saScore   = submitted ? Object.values(saGrades).filter(g=>g==='correct').length : 0
  const score     = autoScore + saScore
  const total     = questions.length
  const pct       = total ? Math.round((score/total)*100) : 0

  if (editMode) return <EditPanel questions={questions}
    onSave={qs=>{setQuestions(qs);setEditMode(false);setSelected({});setSaInputs({});setSaGrades({});setSubmitted(false)}}
    onCancel={()=>setEditMode(false)}/>

  const breakdownTotal = breakdown.mcq + breakdown.tf + breakdown.sa

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">Quiz</h1>
      <p className="text-sm text-t2 mb-6">Generate a quiz on any topic and test your knowledge.</p>

      {showKey && <AnswerKeyModal questions={questions} topic={topic} onClose={()=>setShowKey(false)}/>}

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}>
          <div className="bg-surface border border-line rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-base font-bold text-t1 mb-4">Save Quiz</div>
            <input value={saveTitle} onChange={e=>setSaveTitle(e.target.value)} placeholder={topic||'Quiz title...'}
              className="w-full h-9 bg-surface2 border border-line rounded-lg px-3 text-sm text-t1 outline-none focus:border-blue-400 mb-4"/>
            <div className="flex gap-2">
              <button onClick={doSave} disabled={saving} className="flex-1 h-9 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40">
                {saving?'Saving...':'Save to My Stuff'}</button>
              <button onClick={()=>setShowSaveDialog(false)} className="h-9 px-4 bg-surface border border-line text-t2 text-sm rounded-xl hover:bg-surface2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {!questions.length ? (
        <div className="bg-surface border border-line rounded-2xl p-5">
          <textarea value={topic} onChange={e=>setTopic(e.target.value)}
            placeholder="Enter a topic or paste notes to generate a quiz from..."
            className="w-full h-28 text-sm text-t1 bg-transparent resize-none outline-none placeholder:text-t3 mb-5"/>

          {/* Type selector */}
          <div className="mb-5">
            <div className="text-[11px] font-semibold text-t3 uppercase tracking-wider mb-2">Question Type</div>
            <div className="flex gap-2 flex-wrap">
              {BASE_TYPES.map(t=>(
                <button key={t.id} onClick={()=>setTypeId(t.id)}
                  className={`h-8 px-3 rounded-lg text-[12px] font-medium border transition-all ${typeId===t.id?'bg-blue-700 text-white border-blue-700':'bg-surface2 text-t2 border-line hover:border-blue-300'}`}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* Mixed breakdown */}
          {typeId==='mixed' && (
            <div className="mb-5 p-4 bg-surface2 rounded-xl border border-line">
              <div className="text-[11px] font-semibold text-t3 uppercase tracking-wider mb-3">Breakdown
                <span className={`ml-2 ${breakdownTotal===count?'text-emerald-500':'text-amber-500'}`}>({breakdownTotal}/{count} questions)</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{k:'mcq',label:'MCQ'},{k:'tf',label:'True/False'},{k:'sa',label:'Short Answer'}].map(({k,label})=>(
                  <div key={k} className="text-center">
                    <div className="text-[11px] text-t3 mb-1">{label}</div>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={()=>setBreakdown(b=>({...b,[k]:Math.max(0,b[k]-1)}))} className="w-6 h-6 rounded border border-line text-t2 hover:bg-surface text-sm">−</button>
                      <span className="text-[18px] font-bold text-blue-600 w-8 text-center">{breakdown[k]}</span>
                      <button onClick={()=>setBreakdown(b=>({...b,[k]:b[k]+1}))} className="w-6 h-6 rounded border border-line text-t2 hover:bg-surface text-sm">+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Count slider */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-semibold text-t3 uppercase tracking-wider">Number of Questions</div>
              <div className="text-[18px] font-bold text-blue-600 leading-none">{typeId==='mixed'?breakdownTotal:count}</div>
            </div>
            {typeId!=='mixed'&&<>
              <input type="range" min={3} max={35} step={1} value={count}
                onChange={e=>{const n=Number(e.target.value);setCount(n);syncBreakdown(n)}}
                className="w-full accent-blue-600 cursor-pointer" style={{height:4}}/>
              <div className="flex justify-between text-[10px] text-t3 mt-1.5"><span>3</span><span>10</span><span>20</span><span>35</span></div>
            </>}
          </div>

          {error && <div className="mb-3 text-sm text-red-500">{error}</div>}
          <button onClick={generate} disabled={loading||!topic.trim()}
            className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 flex items-center gap-2">
            {loading?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Generating...</>:`Generate ${typeId==='mixed'?breakdownTotal:count} Questions`}
          </button>
        </div>
      ) : (
        <div>
          {submitted && (
            <div className={`mb-5 p-4 rounded-xl border text-sm font-semibold ${pct===100?'bg-emerald-500/10 border-emerald-500/20 text-emerald-600':pct>=60?'bg-blue-500/10 border-blue-500/20 text-blue-600':'bg-amber-500/10 border-amber-500/20 text-amber-600'}`}>
              {score}/{total} correct ({pct}%) — {pct===100?'🎉 Perfect!':pct>=60?'Good job! Keep studying.':'Keep practising — review below.'}
            </div>
          )}

          <div className="space-y-4 mb-6">
            {questions.map((q,i)=>{
              const isSA = q.type==='short_answer'
              const isSel = selected[i]
              const isCorr = q.answerIndex
              return (
                <div key={i} className="bg-surface border border-line rounded-xl p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-[10px] font-bold bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full uppercase flex-shrink-0 mt-0.5">{q.type||'mcq'}</span>
                    <p className="text-sm font-semibold text-t1 flex-1">{i+1}. {q.question}</p>
                    <SpeakerBtn text={q.question}/>
                  </div>

                  {isSA ? (
                    <div>
                      <textarea value={saInputs[i]||''} onChange={e=>setSaInputs(s=>({...s,[i]:e.target.value}))}
                        placeholder="Type your answer here..." disabled={submitted} rows={3}
                        className="w-full text-sm text-t1 bg-surface2 border border-line rounded-lg p-3 resize-none outline-none focus:border-blue-400 disabled:opacity-70 mb-2"/>
                      {submitted && (
                        <div className="space-y-2">
                          <div className="text-[12px] text-t2 bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-300/30">
                            <span className="font-semibold text-blue-600">Model answer: </span>{q.correctAnswer||'Open-ended — use your judgment'}
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className="text-[11px] text-t3">Self-grade:</span>
                            {['correct','wrong'].map(g=>(
                              <button key={g} onClick={()=>setSaGrades(s=>({...s,[i]:g}))}
                                className={`h-7 px-3 rounded-lg text-[12px] font-medium border transition-colors ${saGrades[i]===g?(g==='correct'?'bg-emerald-500 text-white border-emerald-500':'bg-red-500 text-white border-red-500'):'border-line text-t2 hover:bg-surface2'}`}>
                                {g==='correct'?'✓ Correct':'✗ Wrong'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(q.options||['True','False']).map((opt,j)=>{
                        const isSel=selected[i]===j,isCorr=q.answerIndex===j
                        let cls='border-line text-t2 hover:border-blue-300 hover:bg-surface2'
                        if(submitted){if(isCorr)cls='border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';else if(isSel)cls='border-red-400 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400';else cls='border-line text-t3 opacity-60'}
                        else if(isSel)cls='border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                        return <button key={j} onClick={()=>!submitted&&setSelected(s=>({...s,[i]:j}))}
                          className={`w-full text-left px-3 py-2.5 rounded-lg border text-[13px] transition-all ${cls}`}>
                          <span className="font-semibold mr-2">{['A','B','C','D'][j]}.</span>{opt}
                        </button>
                      })}
                    </div>
                  )}
                  {submitted&&q.explanation&&<div className="mt-3 text-[11px] text-t2 bg-surface2 px-3 py-2 rounded-lg border border-line"><span className="font-semibold text-t1">Explanation: </span>{q.explanation}</div>}
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {!submitted&&<button onClick={()=>setSubmitted(true)} disabled={Object.keys(selected).length===0&&!Object.keys(saInputs).some(k=>saInputs[k]?.trim())}
              className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40">Submit Answers</button>}
            <button onClick={()=>setShowKey(true)} className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl hover:bg-surface2 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="7"/><path d="M8 5v4m0 2.5v.5"/></svg>Answer Key</button>
            <button onClick={()=>setEditMode(true)} className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl hover:bg-surface2">Edit / Add Questions</button>
            {user&&<button onClick={()=>{setSaveTitle(topic);setShowSaveDialog(true)}} className="h-9 px-4 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 flex items-center gap-1.5">
              💾 {savedId?'Update Save':'Save Quiz'}</button>}
            {saveFeedback&&<span className="text-[12px] text-emerald-500 font-medium">{saveFeedback}</span>}
            <button onClick={()=>{setQuestions([]);setError('');setSavedId(null)}} className="h-9 px-4 bg-surface border border-line text-t2 text-sm font-medium rounded-xl hover:bg-surface2 ml-auto">New Quiz</button>
          </div>
        </div>
      )}
    </div>
  )
}
