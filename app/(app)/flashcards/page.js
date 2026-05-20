'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { useIsMobile } from '@/hooks/useIsMobile'
import { saveItem, updateSavedItem } from '@/lib/savedItems'
import { saveDraft, loadDraft, clearDraft } from '@/lib/saveDraft'
import { rpc, novaStream } from '@/lib/api'
import { supabase } from '@/lib/supabase'

// - Print helpers -

function printQuizBlank(questions, topic) {
  const win = window.open('', '_blank')
  const labels = ['A','B','C','D']
  const qHtml = questions.map((q,i) => {
    let body = ''
    if (q.type==='fill_blank')    body = '<div style="margin:8px 0;border-bottom:1px solid #999;width:200px;display:inline-block"></div>'
    else if (q.type==='short_answer') body = '<div style="border:1px solid #ddd;border-radius:6px;height:60px;margin-top:6px"></div>'
    else if (q.type==='matching') body = (q.pairs||[]).map((p,j)=>'<div style="display:fhlex;gap:16px;margin:4px 0"><div style="flex:1;padding:4px 8px;border:1px solid #ddd;border-radius:4px">'+(j+1)+'. '+p.left+'</div><div style="flex:1;padding:4px 8px;border:1px solid #ddd;border-radius:4px">___________</div></div>').join('')
    else body = (q.options||(q.type==='true_false'?['True','False']:[])).map((o,j)=>'<div style="padding:4px 8px;border:1px solid #ddd;border-radius:4px;margin:3px 0;font-size:12px">'+labels[j]+'. '+o+'</div>').join('')
    return '<div style="margin-bottom:18px;page-break-inside:avoid"><div style="font-weight:600;margin-bottom:6px">'+(i+1)+'. '+q.question+'</div>'+body+'</div>'
  }).join('')
  win.document.write('<!DOCTYPE html><html><head><title>Quiz</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;color:#111;font-size:13px}h1{font-size:20px}.sub{color:#666;font-size:12px;margin-bottom:24px}@media print{body{margin:20px}}</style></head><body><h1>'+(topic||'Quiz')+'</h1><div class="sub">'+questions.length+' questions</div>'+qHtml+'<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>')
  win.document.close()
}

function printQuizKey(questions, topic) {
  const win = window.open('', '_blank')
  const labels = ['A','B','C','D']
  const qHtml = questions.map((q,i) => {
    let body = ''
    if (q.type==='fill_blank')    body = '<div style="padding:4px 8px;background:#d1fae5;border-radius:4px;font-size:12px;display:inline-block">Answer: '+(q.correctAnswer||'')+'</div>'
    else if (q.type==='short_answer') body = '<div style="padding:4px 8px;background:#dbeafe;border-radius:4px;font-size:12px">Model: '+(q.correctAnswer||'Open-ended')+'</div>'
    else if (q.type==='matching') body = (q.pairs||[]).map((p,j)=>'<div style="font-size:12px;margin:2px 0"><strong>'+(j+1)+'. '+p.left+'</strong> - '+p.right+'</div>').join('')
    else body = (q.options||(q.type==='true_false'?['True','False']:[])).map((o,j)=>{ const cor=j===q.answerIndex; return '<div style="padding:4px 8px;border:1px solid '+(cor?'#6ee7b7':'#e5e7eb')+';background:'+(cor?'#d1fae5':'transparent')+';border-radius:4px;margin:3px 0;font-size:12px;font-weight:'+(cor?'600':'normal')+'">'+labels[j]+'. '+o+(cor?' -':'')+'</div>' }).join('')
    const exp = q.explanation ? '<div style="margin-top:6px;font-size:11px;color:#555;background:#f9fafb;padding:5px 8px;border-radius:4px;border-left:3px solid #3b82f6"><strong>Explanation:</strong> '+q.explanation+'</div>' : ''
    return '<div style="margin-bottom:18px;page-break-inside:avoid"><div style="font-weight:600;margin-bottom:6px">'+(i+1)+'. '+q.question+'</div>'+body+exp+'</div>'
  }).join('')
  win.document.write('<!DOCTYPE html><html><head><title>Answer Key</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;color:#111;font-size:13px}h1{font-size:20px}.sub{color:#666;font-size:12px;margin-bottom:24px}@media print{body{margin:20px}}</style></head><body><h1>'+(topic||'Quiz')+' - Answer Key</h1><div class="sub">'+questions.length+' questions</div>'+qHtml+'<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>')
  win.document.close()
}

// - Speaker button -

function SpeakerBtn({ text }) {
  const [busy, setBusy] = useState(false)
  async function speak() {
    if (busy||!text) return
    setBusy(true)
    try {
      const d = await rpc('generateOpenAITtsAudio', [text, 'nova', 1])
      const audio = new Audio('data:'+d.result.mimeType+';base64,'+d.result.base64)
      audio.onended = () => setBusy(false)
      audio.play()
    } catch { setBusy(false) }
  }
  return (
    <button onClick={e=>{e.stopPropagation();speak()}} title="Listen"
      style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:'50%', border:'none', background:'none', cursor:'pointer', color:busy?'#93c5fd':'#60a5fa', opacity:busy?.6:1, transition:'all .15s' }}>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 6h2.5L8 4v8L5.5 10H3V6z"/>
        {busy ? <path d="M10 6.5a2 2 0 010 3"/> : <><path d="M10 5a4 4 0 010 6"/><path d="M12.5 3a7 7 0 010 10"/></>}
      </svg>
    </button>
  )
}

// - Answer key modal -

function AnswerKeyModal({ questions, topic, onClose, selected, novaExplanations, explanationLoading, explainWrongAnswer }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'flex-start', justifyContent:'center', background:'rgba(0,0,0,0.5)', padding:'24px 16px', overflowY:'auto' }}>
      <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:18, width:'100%', maxWidth:620, boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px', borderBottom:'1px solid var(--c-line)' }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:'var(--c-t1)' }}>Answer Key</div>
            <div style={{ fontSize:12, color:'var(--c-t3)', marginTop:2 }}>{topic} - {questions.length} questions</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>printQuizKey(questions,topic)} style={{ height:32, padding:'0 12px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6V2h8v4M4 11H2V6h12v5h-2M4 9h8v5H4V9z"/></svg>
              Print
            </button>
            <button onClick={onClose} style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--c-t3)', background:'none', border:'none', cursor:'pointer', fontSize:18, borderRadius:8 }}>-</button>
          </div>
        </div>
        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14, maxHeight:'70vh', overflowY:'auto' }}>
          {questions.map((q,i) => (
            <div key={i} style={{ background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:12, padding:16 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--c-t1)', marginBottom:12 }}>{i+1}. {q.question}</p>
              {q.type==='fill_blank' && <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(16,185,129,0.08)', color:'#34d399', fontSize:13, fontWeight:600 }}>- {q.correctAnswer||'See rubric'}</div>}
              {q.type==='short_answer' && <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(59,130,246,0.08)', color:'#60a5fa', fontSize:13 }}>Model: {q.correctAnswer||'Open-ended'}</div>}
              {q.type==='matching' && <div style={{ display:'flex', flexDirection:'column', gap:4 }}>{(q.pairs||[]).map((p,j)=><div key={j} style={{ fontSize:12, color:'var(--c-t2)' }}><strong>{p.left}</strong> - {p.right}</div>)}</div>}
              {(q.type==='mcq'||q.type==='true_false'||!q.type) && (
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {(q.options||['True','False']).map((o,j)=>(
                    <div key={j} style={{ padding:'7px 12px', borderRadius:8, fontSize:13, display:'flex', alignItems:'center', gap:8, background:j===(q.correct??q.answerIndex)?'rgba(16,185,129,0.08)':'transparent', border:'1px solid '+(j===q.answerIndex?'rgba(16,185,129,0.25)':'transparent'), color:j===q.answerIndex?'#34d399':'var(--c-t3)' }}>
                      <span style={{ fontWeight:800, width:16 }}>{['A','B','C','D'][j]}.</span>{o}
                      {j===q.answerIndex && <span style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color:'#34d399' }}>- Correct</span>}
                    </div>
                  ))}
                  {q.type==='mcq' && selected && selected[i]!==undefined && selected[i]!==q.answerIndex && (
                    <div style={{ marginTop:10 }}>
                      {novaExplanations?.[i] ? (
                        <div style={{ background:'rgba(167,139,250,0.06)', border:'1px solid rgba(167,139,250,0.18)', borderRadius:10, padding:'12px 14px', marginTop:6 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="#a78bfa"/></svg>
                            <span style={{ fontSize:11, fontWeight:700, color:'#a78bfa', letterSpacing:'.05em', textTransform:'uppercase' }}>Nova explains</span>
                          </div>
                          <p style={{ fontSize:13, color:'var(--c-t1)', lineHeight:1.6, margin:0 }}>{novaExplanations[i]}</p>
                        </div>
                      ) : (
                        <button onClick={()=>explainWrongAnswer&&explainWrongAnswer(i,q,q.options?.[selected[i]]||'Your answer',q.options?.[q.answerIndex]||'Correct answer')} disabled={explanationLoading?.[i]}
                          style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 14px', background:'rgba(167,139,250,0.07)', border:'1px solid rgba(167,139,250,0.18)', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, color:'#a78bfa', fontFamily:'inherit' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="#a78bfa"/></svg>
                          {explanationLoading?.[i] ? 'Nova is thinking-' : 'Why was I wrong?'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {q.explanation && <div style={{ marginTop:10, fontSize:11, color:'var(--c-t2)', background:'var(--c-surface)', padding:'8px 12px', borderRadius:8, border:'1px solid var(--c-line)', lineHeight:1.6 }}><span style={{ fontWeight:700, color:'var(--c-t1)' }}>Explanation: </span>{q.explanation}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// - Edit panel -

function EditPanel({ questions, onSave, onCancel }) {
  const [qs, setQs] = useState(questions.map(q=>({...q,options:[...(q.options||['True','False'])]})))
  const [addType, setAddType] = useState(null)
  const [newQ, setNewQ] = useState({ question:'', options:['','','',''], answerIndex:0, correctAnswer:'', pairs:[{left:'',right:''},{left:'',right:''}] })

  function updateQ(i,f,v) { setQs(d=>d.map((q,idx)=>idx===i?{...q,[f]:v}:q)) }
  function updateOpt(i,j,v) { setQs(d=>d.map((q,idx)=>idx===i?{...q,options:q.options.map((o,oi)=>oi===j?v:o)}:q)) }
  function deleteQ(i) { setQs(d=>d.filter((_,idx)=>idx!==i)) }

  function commitAdd() {
    if (!newQ.question.trim()) return
    let q
    if (addType==='mcq')          q={type:'mcq',question:newQ.question,options:newQ.options.filter(o=>o.trim()),answerIndex:newQ.answerIndex,explanation:''}
    else if (addType==='true_false') q={type:'true_false',question:newQ.question,options:['True','False'],answerIndex:newQ.answerIndex,explanation:''}
    else if (addType==='short_answer') q={type:'short_answer',question:newQ.question,correctAnswer:newQ.correctAnswer}
    else if (addType==='fill_blank')   q={type:'fill_blank',question:newQ.question,correctAnswer:newQ.correctAnswer}
    else q={type:'matching',question:newQ.question,pairs:newQ.pairs.filter(p=>p.left.trim())}
    setQs(d=>[...d,q])
    setAddType(null)
    setNewQ({question:'',options:['','','',''],answerIndex:0,correctAnswer:'',pairs:[{left:'',right:''},{left:'',right:''}]})
  }

  return (
    <div style={{ padding:24, maxWidth:680, margin:'0 auto', width:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <h2 style={{ fontSize:18, fontWeight:800, color:'var(--c-t1)' }}>Edit Questions <span style={{ fontSize:13, fontWeight:400, color:'var(--c-t3)' }}>({qs.length})</span></h2>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>onSave(qs)} style={{ height:32, padding:'0 14px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Save Changes</button>
          <button onClick={onCancel}       style={{ height:32, padding:'0 14px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)', borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
        {qs.map((q,i)=>(
          <div key={i} style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:12, padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:20, background:'rgba(59,130,246,0.1)', color:'#60a5fa', textTransform:'uppercase', letterSpacing:'.04em' }}>{(q.type||'mcq').replace(/_/g,' ')}</span>
              <button onClick={()=>deleteQ(i)} style={{ marginLeft:'auto', fontSize:11, color:'#f87171', background:'none', border:'1px solid rgba(239,68,68,0.22)', borderRadius:7, height:26, padding:'0 10px', cursor:'pointer', fontFamily:'inherit' }}>- Delete</button>
            </div>
            <textarea value={q.question} onChange={e=>updateQ(i,'question',e.target.value)} rows={2} style={{ width:'100%', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:8, padding:'8px 10px', fontSize:13, color:'var(--c-t1)', outline:'none', resize:'none', fontFamily:'inherit', marginBottom:8 }}/>
            {(q.type==='short_answer'||q.type==='fill_blank') && <input value={q.correctAnswer||''} onChange={e=>updateQ(i,'correctAnswer',e.target.value)} placeholder="Correct answer-" style={{ width:'100%', height:32, background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:8, padding:'0 10px', fontSize:13, color:'var(--c-t1)', outline:'none', fontFamily:'inherit' }}/>}
            {(q.type==='mcq'||q.type==='true_false'||!q.type) && (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {(q.options||['True','False']).map((o,j)=>(
                  <div key={j} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <button onClick={()=>updateQ(i,'answerIndex',j)} style={{ width:24, height:24, borderRadius:'50%', border:'2px solid '+(q.answerIndex===j?'#10b981':'var(--c-line)'), background:q.answerIndex===j?'#10b981':'transparent', color:q.answerIndex===j?'#fff':'var(--c-t3)', fontSize:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:'inherit' }}>{q.answerIndex===j?'-':['A','B','C','D'][j]}</button>
                    {q.type==='true_false' ? <span style={{ flex:1, fontSize:13, color:'var(--c-t1)', padding:'0 8px' }}>{o}</span> : <input value={o} onChange={e=>updateOpt(i,j,e.target.value)} style={{ flex:1, height:32, background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:8, padding:'0 10px', fontSize:13, color:'var(--c-t1)', outline:'none', fontFamily:'inherit' }}/>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {!addType ? (
        <div style={{ border:'2px dashed rgba(255,255,255,0.09)', borderRadius:12, padding:16 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>Add Question</p>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {['mcq','true_false','short_answer','fill_blank','matching'].map(t=>(
              <button key={t} onClick={()=>setAddType(t)} style={{ height:32, padding:'0 12px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)', fontSize:12, fontWeight:600, borderRadius:8, cursor:'pointer', fontFamily:'inherit' }}>
                + {t==='mcq'?'MCQ':t==='true_false'?'True/False':t==='short_answer'?'Short Answer':t==='fill_blank'?'Fill Blank':'Matching'}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ border:'1.5px solid rgba(59,130,246,0.3)', borderRadius:12, padding:16, background:'rgba(59,130,246,0.04)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <span style={{ fontSize:12, fontWeight:800, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'.04em' }}>New {addType.replace('_',' ')}</span>
            <button onClick={()=>setAddType(null)} style={{ color:'var(--c-t3)', background:'none', border:'none', cursor:'pointer', fontSize:16, fontFamily:'inherit' }}>-</button>
          </div>
          <textarea value={newQ.question} onChange={e=>setNewQ(q=>({...q,question:e.target.value}))} placeholder="Question text-" rows={2} style={{ width:'100%', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:8, padding:'8px 10px', fontSize:13, color:'var(--c-t1)', outline:'none', resize:'none', fontFamily:'inherit', marginBottom:10 }}/>
          {(addType==='short_answer'||addType==='fill_blank') && <input value={newQ.correctAnswer} onChange={e=>setNewQ(q=>({...q,correctAnswer:e.target.value}))} placeholder="Correct answer-" style={{ width:'100%', height:32, background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:8, padding:'0 10px', fontSize:13, color:'var(--c-t1)', outline:'none', fontFamily:'inherit', marginBottom:10 }}/>}
          {addType==='mcq' && (
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
              {newQ.options.map((o,j)=>(
                <div key={j} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={()=>setNewQ(q=>({...q,answerIndex:j}))} style={{ width:24, height:24, borderRadius:'50%', border:'2px solid '+(newQ.answerIndex===j?'#10b981':'var(--c-line)'), background:newQ.answerIndex===j?'#10b981':'transparent', color:newQ.answerIndex===j?'#fff':'var(--c-t3)', fontSize:10, cursor:'pointer', flexShrink:0, fontFamily:'inherit' }}>{newQ.answerIndex===j?'-':['A','B','C','D'][j]}</button>
                  <input value={o} onChange={e=>setNewQ(q=>({...q,options:q.options.map((op,oi)=>oi===j?e.target.value:op)}))} placeholder={'Option '+['A','B','C','D'][j]} style={{ flex:1, height:32, background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:8, padding:'0 10px', fontSize:13, color:'var(--c-t1)', outline:'none', fontFamily:'inherit' }}/>
                </div>
              ))}
            </div>
          )}
          {addType==='true_false' && (
            <div style={{ display:'flex', gap:8, marginBottom:10 }}>
              {['True','False'].map((o,j)=>(
                <button key={j} onClick={()=>setNewQ(q=>({...q,answerIndex:j}))} style={{ flex:1, height:36, borderRadius:8, border:'1px solid '+(newQ.answerIndex===j?'#10b981':'var(--c-line)'), background:newQ.answerIndex===j?'#10b981':'var(--c-surface)', color:newQ.answerIndex===j?'#fff':'var(--c-t2)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>{o}</button>
              ))}
            </div>
          )}
          <button onClick={commitAdd} disabled={!newQ.question.trim()} style={{ height:32, padding:'0 16px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:newQ.question.trim()?1:.4 }}>Add Question</button>
        </div>
      )}
    </div>
  )
}

// - Constants -

const BASE_TYPES = [
  { id:'mcq',          label:'Multiple Choice' },
  { id:'true_false',   label:'True / False'    },
  { id:'short_answer', label:'Short Answer'    },
  { id:'fill_blank',   label:'Fill in the Blank' },
  { id:'matching',     label:'Matching'        },
  { id:'mixed',        label:'Mixed'           },
]

const CHIPS = [
  'The Cold War','Cell biology','The US Constitution',
  'Shakespeare tragedies','Macroeconomics','The French Revolution',
]

const TYPE_LABELS = { mcq:'Multiple Choice', true_false:'True / False', short_answer:'Short Answer', fill_blank:'Fill in the Blank', matching:'Matching' }
function prettifyType(t) { return TYPE_LABELS[t]||(t||'mcq').replace(/_/g,' ') }

function buildConfig(typeId, count, breakdown) {
  if (typeId==='mcq')          return { mcq:count }
  if (typeId==='true_false')   return { true_false:count }
  if (typeId==='short_answer') return { short_answer:count }
  if (typeId==='fill_blank')   return { fill_blank:count }
  if (typeId==='matching')     return { matching:count }
  const cfg = {}
  if ((breakdown.mcq||0)>0)   cfg.mcq         = breakdown.mcq
  if ((breakdown.tf||0)>0)    cfg.true_false   = breakdown.tf
  if ((breakdown.sa||0)>0)    cfg.short_answer = breakdown.sa
  if ((breakdown.fitb||0)>0)  cfg.fill_blank   = breakdown.fitb
  if ((breakdown.match||0)>0) cfg.matching     = breakdown.match
  return cfg
}

function checkFitbAnswer(userAns, correctAns) {
  if (!userAns||!correctAns) return false
  const u = userAns.toLowerCase().trim()
  const correct = correctAns.toLowerCase().trim()
  if (u===correct) return true
  const variants = correct.split(/[|/,]/).map(v=>v.trim()).filter(Boolean)
  if (variants.some(v=>u===v)) return true
  if (variants.some(v=>v.includes(u)||u.includes(v))) return true
  return false
}

// - Page component -


// - QuizResultsScreen -
// Full post-quiz results screen: score ring, topic breakdown, missed questions,
// streaming Nova feedback, print, and action buttons.
function QuizResultsScreen({
  questions, topic, score, pct,
  selected, fitbInputs, saGrades,
  user, isMobile,
  savedId, saveFeedback,
  onShowAnswerKey, onSave, onRetake, onNewQuiz,
}) {
  const [novaFeedback, setNovaFeedback] = useState('')
  const [novaLoading,  setNovaLoading]  = useState(false)

  const topicBreakdown = (() => {
    const map = {}
    questions.forEach((q, i) => {
      const t = q.topic || prettifyType(q.type)
      if (!map[t]) map[t] = { correct:0, total:0 }
      map[t].total++
      let ok = false
      if      (q.type === 'fill_blank')   ok = checkFitbAnswer(fitbInputs[i], q.correctAnswer)
      else if (q.type === 'short_answer') ok = saGrades[i] === 'correct'
      else if (q.type === 'matching')     ok = false
      else                                ok = selected[i] === q.answerIndex
      if (ok) map[t].correct++
    })
    return Object.entries(map)
      .map(([name,d]) => ({ name, pct: d.total ? Math.round(d.correct/d.total*100) : 0, correct:d.correct, total:d.total }))
      .sort((a,b) => a.pct - b.pct)
  })()

  const missed = questions.map((q,i) => {
    if (q.type === 'short_answer' || q.type === 'matching') return null
    const ok = q.type === 'fill_blank'
      ? checkFitbAnswer(fitbInputs[i], q.correctAnswer)
      : selected[i] === q.answerIndex
    if (ok) return null
    return {
      question:      q.question,
      yourAnswer:    q.type === 'fill_blank' ? (fitbInputs[i]||'(blank)') : (q.options?.[selected[i]]||'(no answer)'),
      correctAnswer: q.type === 'fill_blank' ? q.correctAnswer : q.options?.[q.correct ?? q.answerIndex],
    }
  }).filter(Boolean)

  useEffect(() => {
    if (!questions.length) return
    let cancelled = false
    setNovaLoading(true)
    setNovaFeedback('')
    const prompt = [
      'Student completed a quiz on "' + (topic||'this topic') + '".',
      'Score: ' + score + '/' + questions.length + ' (' + pct + '%).',
      topicBreakdown.length > 1
        ? 'Topic breakdown: ' + topicBreakdown.map(t => t.name+' '+t.pct+'%').join(', ') + '.'
        : '',
      missed.length > 0
        ? 'Missed: ' + missed.slice(0,3).map(m => '"'+m.question+'"').join('; ') + '.'
        : 'All answered correctly.',
      'Write 2-3 sentences: what they did well, where the gaps are, one specific next step.',
      'Direct and warm. No filler. Never start with "You scored" or "Great job!".',
    ].filter(Boolean).join(' ')
    novaStream(
      [{ role:'user', content:prompt }],
      chunk => { if (!cancelled) setNovaFeedback(prev => prev + chunk) },
      { systemOverride: 'You are Nova, a study assistant. Give concise personalised quiz feedback in 2-3 sentences. Never start with "You" or use filler. Get straight to the insight.' }
    )
      .catch(() => { if (!cancelled) setNovaFeedback('Unable to load feedback right now.') })
      .finally(() => { if (!cancelled) setNovaLoading(false) })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function printResults() {
    const win = window.open('', '_blank')
    const topicRows = topicBreakdown.map(t =>
      '<tr><td>'+t.name+'</td><td style="text-align:center">'+t.correct+'/'+t.total+'</td><td style="text-align:center;font-weight:600;color:'+(t.pct>=75?'#059669':t.pct>=50?'#d97706':'#dc2626')+'">'+t.pct+'%</td></tr>'
    ).join('')
    const missedItems = missed.map(m =>
      '<li style="margin-bottom:12px"><strong>'+m.question+'</strong><br>Your answer: <span style="color:#dc2626">'+m.yourAnswer+'</span> &middot; Correct: <span style="color:#059669">'+m.correctAnswer+'</span></li>'
    ).join('')
    win.document.write('<!DOCTYPE html><html><head><title>'+(topic||'Quiz')+' Results<\/title><style>body{font-family:system-ui,sans-serif;max-width:680px;margin:40px auto;color:#111;font-size:13px}h1{font-size:20px}h2{font-size:15px;margin:20px 0 8px}table{width:100%;border-collapse:collapse}td,th{padding:8px 10px;border:1px solid #e5e7eb}th{background:#f9fafb}ol{padding-left:20px}@media print{body{margin:20px}}<\/style><\/head><body><h1>'+(topic||'Quiz')+' - Results<\/h1><p>Score: '+score+'/'+questions.length+' ('+pct+'%) - '+new Date().toLocaleDateString()+'<\/p>'+(topicBreakdown.length>0?'<h2>Topic Breakdown<\/h2><table><tr><th>Topic<\/th><th>Correct<\/th><th>Score<\/th><\/tr>'+topicRows+'<\/table>':'')+(missed.length>0?'<h2>Missed Questions<\/h2><ol>'+missedItems+'<\/ol>':'')+'<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script><\/body><\/html>')
    win.document.close()
  }

  function bar(p) { return p>=75?'#10b981':p>=50?'#f59e0b':'#ef4444' }
  const C=276.5, off=C-(pct/100)*C, rc=pct>=75?'#10b981':pct>=50?'#f59e0b':'#ef4444'
  const verdict=pct===100?'Perfect score':pct>=80?'Strong result':pct>=60?'Good - room to grow':pct>=40?'Keep practising':"Let-s drill those gaps"
  const weakNames=topicBreakdown.filter(t=>t.pct<70).map(t=>t.name).join(', ')
  const card={background:'var(--c-surface)',border:'1px solid var(--c-line)',borderRadius:14,padding:'18px 20px'}
  const lbl={fontSize:10,fontWeight:700,color:'var(--c-t3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:14,display:'flex',alignItems:'center',gap:6}
  const btn={padding:'11px 0',borderRadius:9,border:'1px solid var(--c-line)',background:'var(--c-surface)',color:'var(--c-t1)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}

  const topicPanel=(
    <div style={card}>
      <div style={lbl}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        Topic breakdown
      </div>
      {topicBreakdown.length===0
        ?<p style={{fontSize:12,color:'var(--c-t3)',margin:0}}>No topic data yet - try a new quiz to see breakdown.</p>
        :topicBreakdown.map(t=>(
          <div key={t.name} style={{marginBottom:13}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:5}}>
              <span style={{fontSize:13,color:'var(--c-t1)'}}>{t.name}</span>
              <span style={{fontSize:12,fontWeight:700,color:bar(t.pct)}}>{t.pct}%</span>
            </div>
            <div style={{height:5,borderRadius:3,background:'var(--c-surface2)',overflow:'hidden'}}>
              <div style={{height:'100%',width:t.pct+'%',background:bar(t.pct),borderRadius:3,transition:'width .5s ease'}}/>
            </div>
            <div style={{fontSize:10,color:'var(--c-t3)',marginTop:3}}>{t.correct}/{t.total} correct</div>
          </div>
        ))
      }
    </div>
  )

  const missedPanel=(
    <div style={card}>
      <div style={lbl}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        Missed questions
      </div>
      {missed.length===0?(
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'16px 0',gap:8}}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
          <span style={{fontSize:12,color:'var(--c-t3)'}}>All answered correctly!</span>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {missed.map((m,i)=>(
            <div key={i} style={{padding:'10px 12px',borderLeft:'2.5px solid #ef4444',borderRadius:'0 8px 8px 0',background:'rgba(239,68,68,0.04)'}}>
              <p style={{fontSize:12,color:'var(--c-t1)',margin:'0 0 5px',lineHeight:1.45}}>{m.question}</p>
              <p style={{fontSize:11,color:'var(--c-t3)',margin:0}}>
                Your answer: <strong style={{color:'rgba(239,68,68,0.75)'}}>{m.yourAnswer}</strong>
                {' - '}
                Correct: <strong style={{color:'#10b981'}}>{m.correctAnswer}</strong>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div style={{padding:'24px',maxWidth:680,margin:'0 auto',width:'100%',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <div style={{...card,display:'flex',alignItems:'center',gap:isMobile?18:28,marginBottom:14,padding:'20px 22px'}}>
        <div style={{position:'relative',width:100,height:100,flexShrink:0}}>
          <svg width="100" height="100" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r="44" fill="none" stroke="var(--c-surface2)" strokeWidth="9"/>
            <circle cx="55" cy="55" r="44" fill="none" stroke={rc} strokeWidth="9"
              strokeDasharray={C} strokeDashoffset={off}
              strokeLinecap="round" transform="rotate(-90 55 55)"
              style={{transition:'stroke-dashoffset .7s ease'}}/>
          </svg>
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontSize:22,fontWeight:700,color:'var(--c-t1)',lineHeight:1}}>{pct}%</span>
            <span style={{fontSize:10,color:'var(--c-t3)',marginTop:2}}>score</span>
          </div>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <p style={{fontSize:isMobile?15:17,fontWeight:700,color:'var(--c-t1)',margin:'0 0 3px',letterSpacing:'-.02em'}}>{verdict}</p>
          <p style={{fontSize:12,color:'var(--c-t3)',margin:'0 0 12px'}}>{topic} - {questions.length} questions</p>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {[
              {label:'Correct',val:score,               color:'#10b981',bg:'rgba(16,185,129,0.07)', border:'rgba(16,185,129,0.2)'},
              {label:'Wrong',  val:questions.length-score,color:'#ef4444',bg:'rgba(239,68,68,0.07)',  border:'rgba(239,68,68,0.2)'},
            ].map(s=>(
              <div key={s.label} style={{padding:'7px 14px',borderRadius:9,background:s.bg,border:'1px solid '+s.border,textAlign:'center'}}>
                <div style={{fontSize:17,fontWeight:700,color:s.color,lineHeight:1}}>{s.val}</div>
                <div style={{fontSize:10,color:'var(--c-t3)',marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isMobile?(
        <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:12}}>
          {missedPanel}
          {topicPanel}
        </div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
          {topicPanel}
          {missedPanel}
        </div>
      )}

      <div style={{...card,marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          <div style={{width:28,height:28,borderRadius:'50%',background:'radial-gradient(circle at 33% 33%,#c4b5fd,#7c3aed 40%,#4c1d95 70%,#08001a)',boxShadow:'0 0 10px rgba(124,58,237,0.4)',flexShrink:0}}/>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'#a5b4fc'}}>Nova</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>Study assistant</div>
          </div>
          {novaLoading&&(
            <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:5}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:'#a78bfa',animation:'nova-pulse .9s ease-in-out infinite'}}/>
              <span style={{fontSize:11,color:'rgba(167,139,250,0.55)'}}>Thinking-</span>
            </div>
          )}
        </div>
        {novaFeedback
          ?<p style={{fontSize:13,color:'var(--c-t1)',lineHeight:1.7,margin:0}}>{novaFeedback}</p>
          :novaLoading
            ?<div style={{height:38}}/>
            :<p style={{fontSize:13,color:'var(--c-t3)',margin:0}}>Preparing personalised feedback-</p>
        }
        {novaFeedback&&weakNames&&(
          <div style={{display:'flex',gap:8,marginTop:14,flexWrap:'wrap'}}>
            <a href={'/flashcards?q='+encodeURIComponent('Drill weak areas from '+topic+': '+weakNames)+'&autoGenerate=1'}
              style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 13px',borderRadius:8,border:'1px solid var(--c-line)',background:'var(--c-surface2)',color:'var(--c-t2)',fontSize:12,fontWeight:600,textDecoration:'none'}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
              Drill weak areas
            </a>
            <a href={'/quiz?q='+encodeURIComponent(topic+' - focused on: '+weakNames)+'&autoGenerate=1'}
              style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 13px',borderRadius:8,border:'1px solid var(--c-line)',background:'var(--c-surface2)',color:'var(--c-t2)',fontSize:12,fontWeight:600,textDecoration:'none'}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>
              Retake on weak topics
            </a>
          </div>
        )}
      </div>

      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button onClick={onRetake}        style={{...btn,flex:1,minWidth:90}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
          Retake
        </button>
        <button onClick={onNewQuiz}       style={{...btn,flex:1,minWidth:90}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New quiz
        </button>
        <button onClick={onShowAnswerKey} style={{...btn,flex:1,minWidth:90}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
          Answer key
        </button>
        {user&&(
          <button onClick={onSave} style={{...btn,flex:1,minWidth:90,border:'1px solid rgba(16,185,129,0.3)',background:'rgba(16,185,129,0.07)',color:'#34d399'}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            {savedId?'Saved -':saveFeedback||'Save results'}
          </button>
        )}
        <button onClick={printResults} style={{...btn,minWidth:44}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"/></svg>
          {isMobile?'':'Print'}
        </button>
      </div>
    </div>
  )
}


export default function QuizPage() {
  const { user } = useAuth()
  const isMobile  = useIsMobile()

  const [typeId,    setTypeId]    = useState('mcq')
  const [count,     setCount]     = useState(10)
  const [breakdown, setBreakdown] = useState({ mcq:0, tf:0, sa:0, fitb:0, match:0 })
  const [topic,     setTopic]     = useState('')
  const [autoGenTopic, setAutoGenTopic] = useState('')
  const [questions, setQuestions] = useState([])
  const [loading,   setLoading]   = useState(false)

  const [selected,      setSelected]      = useState({})
  const [saInputs,      setSaInputs]      = useState({})
  const [fitbInputs,    setFitbInputs]    = useState({})
  const [matchAnswers,  setMatchAnswers]  = useState({})
  const [shuffledRights,setShuffledRights]= useState({})
  const [saGrades,      setSaGrades]      = useState({})
  const [submitted,     setSubmitted]     = useState(false)
  const [error,         setError]         = useState('')

  const [showKey,   setShowKey]   = useState(false)
  const [editMode,  setEditMode]  = useState(false)
  const [savedId,   setSavedId]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [saveFeedback, setSaveFeedback] = useState('')
  const [showSave,  setShowSave]  = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [novaExplanations,  setNovaExplanations]  = useState({})
  const [explanationLoading,setExplanationLoading]= useState({})
  const [draftBanner, setDraftBanner] = useState(false)

  // - Init -

  useEffect(() => {
    const saved = sessionStorage.getItem('flashfo_load_quiz') || sessionStorage.getItem('flashfo_quiz_load')
    if (saved) {
      try {
        const { questions:sq, topic:st, type:stype, id:si } = JSON.parse(saved)
        sessionStorage.removeItem('flashfo_load_quiz'); sessionStorage.removeItem('flashfo_quiz_load')
        if (sq?.length) { setQuestions(sq); setTopic(st||''); if (stype) setTypeId(stype); setSavedId(si||null); initMatching(sq); return }
      } catch(e) {}
    }
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q && !topic) {
      const decoded = decodeURIComponent(q)
      setTopic(decoded)
      if (params.get('autoGenerate')==='1') setAutoGenTopic(decoded)
      return
    }
    loadDraft('quiz').then(draft => {
      if (draft?.data?.questions?.length) {
        setTopic(draft.data.topic||''); setTypeId(draft.data.typeId||'mcq')
        setCount(draft.data.count||10); setQuestions(draft.data.questions)
        initMatching(draft.data.questions); setDraftBanner(true)
      }
    })
  }, [])

  useEffect(() => {
    if (autoGenTopic.trim() && topic===autoGenTopic && !loading && !questions.length) { generate(); setAutoGenTopic('') }
  }, [autoGenTopic, topic])

  function initMatching(qs) {
    const s = {}
    qs.forEach((q,i) => { if (q.type==='matching'&&q.pairs) s[i]=[...q.pairs.map(p=>p.right)].sort(()=>Math.random()-.5) })
    setShuffledRights(s)
  }

  // - Generate -

  async function generate() {
    if (!topic.trim()) return
    setLoading(true); setQuestions([]); setSelected({}); setSaInputs({}); setFitbInputs({})
    setMatchAnswers({}); setSaGrades({}); setSubmitted(false); setError(''); setSavedId(null); setDraftBanner(false)
    try {
      const cfg  = buildConfig(typeId, count, breakdown)
      const data = await rpc('generateQuizFromTopic', [topic.trim(), cfg])
      if (data.error) throw new Error(data.error)
      const qs = data.result?.questions||[]
      if (!qs.length) { setError('Could not generate quiz. Try a more specific topic.'); return }
      setQuestions(qs); initMatching(qs)
      if (user) await saveDraft('quiz', topic.trim(), { topic:topic.trim(), typeId, count, questions:qs })
    } catch(e) { setError(e?.message||'Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  // - Save -

  async function doSave() {
    if (!user) return; setSaving(true)
    try {
      const payload = { questions, topic, type:typeId }
      if (savedId) { await updateSavedItem(savedId,{title:saveTitle||topic,data:payload}); setSaveFeedback('Updated!') }
      else { const r=await saveItem(user.id,'quiz',saveTitle||topic,payload); setSavedId(r.id); setSaveFeedback('Saved!') }
      setShowSave(false); await clearDraft('quiz')
      setTimeout(()=>setSaveFeedback(''), 3000)
    } catch { setSaveFeedback('Save failed') }
    finally { setSaving(false) }
  }

  async function explainWrongAnswer(questionIndex, question, studentAnswerText, correctAnswerText) {
    setExplanationLoading(prev=>({...prev,[questionIndex]:true}))
    try {
      const res  = await fetch('/api/nova/explain-answer', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ question:question.question, studentAnswer:studentAnswerText, correctAnswer:correctAnswerText, topic:topic||'' }) })
      const data = await res.json()
      setNovaExplanations(prev=>({...prev,[questionIndex]:data.explanation}))
    } catch { setNovaExplanations(prev=>({...prev,[questionIndex]:'Unable to load explanation right now.'})) }
    finally { setExplanationLoading(prev=>({...prev,[questionIndex]:false})) }
  }

  function startFresh() { setQuestions([]); setError(''); setSavedId(null); setDraftBanner(false); clearDraft('quiz') }

  function resetAnswers() {
    setSelected({}); setSaInputs({}); setFitbInputs({})
    setMatchAnswers({}); setSaGrades({}); setSubmitted(false)
    setNovaExplanations({}); setExplanationLoading({})
    initMatching(questions)
  }

  // - Scoring -

  const autoScore = submitted ? questions.filter((q,i) => {
    if (q.type==='short_answer'||q.type==='matching') return false
    if (q.type==='fill_blank') return checkFitbAnswer(fitbInputs[i], q.correctAnswer)
    return selected[i]===q.correct
  }).length : 0
  const saScore   = submitted ? Object.values(saGrades).filter(g=>g==='correct').length : 0
  const score     = autoScore + saScore
  const pct       = questions.length ? Math.round(score/questions.length*100) : 0
  const breakdownTotal = (breakdown.mcq||0)+(breakdown.tf||0)+(breakdown.sa||0)+(breakdown.fitb||0)+(breakdown.match||0)

  // - Edit mode -

  if (editMode) return (
    <EditPanel
      questions={questions}
      onSave={qs=>{ setQuestions(qs); setEditMode(false); setSelected({}); setSaInputs({}); setFitbInputs({}); setMatchAnswers({}); setSaGrades({}); setSubmitted(false); initMatching(qs) }}
      onCancel={()=>setEditMode(false)}
    />
  )

  // - Input state -

  if (!questions.length) return (
    <div style={{ padding:'28px 24px 48px', maxWidth:1100, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {draftBanner && (
        <div style={{ background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:10, padding:'10px 14px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
          <span style={{ fontSize:12, color:'rgba(241,240,255,0.65)', flex:1 }}>Resuming your last quiz - <strong style={{ color:'rgba(241,240,255,0.85)' }}>{topic}</strong></span>
          <button onClick={startFresh} style={{ fontSize:11, color:'rgba(241,240,255,0.35)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Start fresh</button>
        </div>
      )}

      <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:20, padding:'5px 13px', fontSize:10, fontWeight:800, color:'#a5b4fc', marginBottom:16, letterSpacing:'.08em', textTransform:'uppercase' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="#a5b4fc"/></svg>
        Quiz
      </div>
      <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-.03em', marginBottom:5, color:'var(--c-t1)', lineHeight:1.15 }}>Test what you actually know</h1>
      <p style={{ fontSize:13, color:'var(--c-t2)', marginBottom:22, lineHeight:1.65, maxWidth:520 }}>Generate a full quiz on any topic. Nova grades your answers and explains exactly why you got something wrong.</p>

      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
        {CHIPS.map(c => (
          <button key={c} onClick={()=>setTopic(c)} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:600, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
            {c}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:20, alignItems:'start' }}>

        <div>
          <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:14, overflow:'hidden' }}>
            <textarea
              value={topic}
              onChange={e=>setTopic(e.target.value)}
              onKeyDown={e=>{ if (e.key==='Enter'&&e.metaKey) generate() }}
              rows={4}
              placeholder="Enter a topic or paste your notes to generate quiz questions from-"
              style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'#e2e8f0', fontFamily:'inherit', fontSize:13, lineHeight:1.7, padding:'14px 16px', resize:'none', display:'block' }}
            />

            <div style={{ padding:'0 12px 8px' }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)', marginBottom:7, paddingTop:2 }}>Question type</div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {BASE_TYPES.map(t => (
                  <button key={t.id} onClick={()=>{ setTypeId(t.id); if (t.id==='mixed') setBreakdown({mcq:0,tf:0,sa:0,fitb:0,match:0}) }}
                    style={{ padding:'5px 11px', borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all .15s', border:'1px solid '+(typeId===t.id?'rgba(99,102,241,0.4)':'rgba(255,255,255,0.09)'), background:typeId===t.id?'rgba(99,102,241,0.13)':'rgba(255,255,255,0.03)', color:typeId===t.id?'#a5b4fc':'rgba(255,255,255,0.4)' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {typeId==='mixed' && (
              <div style={{ margin:'4px 12px 8px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'10px 12px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'.05em' }}>Breakdown</span>
                  <span style={{ fontSize:13, fontWeight:700, color:breakdownTotal>0?'#a5b4fc':'rgba(255,255,255,0.25)' }}>{breakdownTotal} question{breakdownTotal!==1?'s':''}</span>
                </div>
                {[{k:'mcq',label:'Multiple Choice'},{k:'tf',label:'True / False'},{k:'sa',label:'Short Answer'},{k:'fitb',label:'Fill in the Blank'},{k:'match',label:'Matching'}].map(({k,label})=>{
                  const val = breakdown[k]||0; const active = val>0
                  return (
                    <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:active?'rgba(99,102,241,0.07)':'rgba(255,255,255,0.02)', border:'1px solid '+(active?'rgba(99,102,241,0.25)':'rgba(255,255,255,0.06)'), borderRadius:9, padding:'0 8px 0 12px', height:44, marginBottom:5, transition:'all .15s' }}>
                      <span style={{ fontSize:13, fontWeight:500, color:active?'#a5b4fc':'var(--c-t1)', flex:1 }}>{label}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:2, flexShrink:0 }}>
                        <button onClick={()=>setBreakdown(b=>({...b,[k]:Math.max(0,(b[k]||0)-1)}))} style={{ width:36,height:36,borderRadius:8,border:'none',background:'none',color:active?'#6366f1':'var(--c-t3)',fontSize:20,cursor:'pointer',fontFamily:'inherit' }}>-</button>
                        <span style={{ fontSize:16,fontWeight:700,color:active?'#6366f1':'rgba(255,255,255,0.2)',minWidth:24,textAlign:'center' }}>{val}</span>
                        <button onClick={()=>setBreakdown(b=>({...b,[k]:(b[k]||0)+1}))} style={{ width:36,height:36,borderRadius:8,border:'none',background:'none',color:active?'#6366f1':'var(--c-t3)',fontSize:20,cursor:'pointer',fontFamily:'inherit' }}>+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* - Slider - PERMANENT FIX: CSS-variable fill, always in sync with counter - */}
            {typeId!=='mixed' && (
              <div style={{ padding:'10px 14px 12px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.28)', textTransform:'uppercase', letterSpacing:'.05em' }}>Questions</span>
                  <span style={{ fontSize:16, fontWeight:800, color:'#a5b4fc' }}>{count}</span>
                </div>
                <>
                  <style>{`
                    .qz-slider{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;outline:none;cursor:pointer;display:block}
                    .qz-slider::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.5);cursor:pointer;border:none}
                    .qz-slider::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.5);cursor:pointer;border:none}
                    .qz-slider::-moz-range-track{height:4px;border-radius:2px;background:transparent}
                  `}</style>
                  <input
                    type="range"
                    className="qz-slider"
                    min={5} max={35} step={1}
                    value={count}
                    onChange={e=>setCount(Number(e.target.value))}
                    style={{ background:`linear-gradient(to right,#6366f1 ${((count-5)/30*100).toFixed(1)}%,rgba(255,255,255,0.15) ${((count-5)/30*100).toFixed(1)}%)` }}
                  />
                </>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,0.2)', marginTop:5 }}>
                  <span>5</span><span>20</span><span>35</span>
                </div>
              </div>
            )}

            <div style={{ padding:'9px 14px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.18)' }}>Nova explains every wrong answer</span>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.15)' }}>- generate</span>
            </div>
          </div>

          {error && <div style={{ fontSize:12, color:'#f87171', marginTop:8 }}>{error}</div>}

          <button
            onClick={generate}
            disabled={loading||!topic.trim()||(typeId==='mixed'&&breakdownTotal===0)}
            style={{ width:'100%', padding:'13px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', marginTop:11, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:9, letterSpacing:'-.01em', boxShadow:'0 4px 18px rgba(99,102,241,0.28)', transition:'all .15s', opacity:loading||!topic.trim()||(typeId==='mixed'&&breakdownTotal===0)?0.55:1 }}>
            {loading ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation:'_fcspin .7s linear infinite', flexShrink:0 }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                Generating-
              </>
            ) : `Generate ${typeId==='mixed'?breakdownTotal:count} question${(typeId==='mixed'?breakdownTotal:count)!==1?'s':''} -`}
          </button>
        </div>

        {!isMobile && <div>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)', marginBottom:12 }}>Live preview</div>
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:16 }}>
            <div style={{ marginBottom:10 }}>
              <span style={{ fontSize:9, fontWeight:800, background:'rgba(99,102,241,0.1)', color:'#a5b4fc', padding:'3px 8px', borderRadius:20, textTransform:'uppercase', letterSpacing:'.05em' }}>Multiple Choice</span>
            </div>
            <p style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', marginBottom:12, lineHeight:1.5 }}>Which event directly triggered the start of World War I in 1914?</p>
            {[
              { label:'A', text:'The sinking of the Lusitania', state:'wrong'  },
              { label:'B', text:'The Treaty of Versailles',     state:'plain'  },
              { label:'C', text:'Assassination of Archduke Franz Ferdinand', state:'correct' },
              { label:'D', text:'Germany invading Poland',      state:'plain'  },
            ].map(o => (
              <div key={o.label} style={{ padding:'7px 11px', borderRadius:7, fontSize:12, marginBottom:5, border:'1px solid '+(o.state==='correct'?'rgba(16,185,129,0.28)':o.state==='wrong'?'rgba(239,68,68,0.18)':'rgba(255,255,255,0.06)'), background:o.state==='correct'?'rgba(16,185,129,0.07)':o.state==='wrong'?'rgba(239,68,68,0.05)':'transparent', color:o.state==='correct'?'#34d399':o.state==='wrong'?'rgba(239,68,68,0.55)':'rgba(255,255,255,0.38)', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:9, fontWeight:800, width:16 }}>{o.label}</span>{o.text}
              </div>
            ))}
            <div style={{ marginTop:10, background:'rgba(167,139,250,0.05)', border:'1px solid rgba(167,139,250,0.15)', borderRadius:8, padding:'9px 11px', fontSize:11, color:'rgba(167,139,250,0.75)', lineHeight:1.6 }}>
              <span style={{ fontWeight:700, color:'#a78bfa' }}>Nova explains:</span> The Lusitania sinking was 1915 - WWI already underway. Franz Ferdinand's assassination on June 28, 1914 triggered the chain of alliances that started the war.
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7, marginTop:10 }}>
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:9, padding:'9px 11px', textAlign:'center' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#a5b4fc', marginBottom:2 }}>Auto-graded</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.22)' }}>All 5 question types</div>
            </div>
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:9, padding:'9px 11px', textAlign:'center' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#a5b4fc', marginBottom:2 }}>Print ready</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.22)' }}>Answer key included</div>
            </div>
          </div>
        </div>}
      </div>
    </div>
  )


  if (submitted) return (
    <>
      {showKey && <AnswerKeyModal questions={questions} topic={topic} onClose={()=>setShowKey(false)} selected={selected} novaExplanations={novaExplanations} explanationLoading={explanationLoading} explainWrongAnswer={explainWrongAnswer}/>}
      {showSave && (
        <div style={{ position:'fixed', inset:0, zIndex:40, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.45)' }}>
          <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:18, padding:24, width:'100%', maxWidth:360, boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize:15, fontWeight:800, color:'var(--c-t1)', marginBottom:16 }}>Save Quiz Results</div>
            <input value={saveTitle} onChange={e=>setSaveTitle(e.target.value)} placeholder={topic||'Quiz title-'} style={{ width:'100%', height:36, background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:9, padding:'0 12px', fontSize:13, color:'var(--c-t1)', outline:'none', fontFamily:'inherit', marginBottom:14, boxSizing:'border-box' }}/>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={doSave} disabled={saving} style={{ flex:1, height:36, background:'#2563eb', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:saving?0.6:1 }}>{saving?'Saving-':'Save to My Stuff'}</button>
              <button onClick={()=>setShowSave(false)} style={{ height:36, padding:'0 16px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)', borderRadius:10, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <QuizResultsScreen
        questions={questions} topic={topic} score={score} pct={pct}
        selected={selected} fitbInputs={fitbInputs} saGrades={saGrades}
        user={user} isMobile={isMobile} savedId={savedId} saveFeedback={saveFeedback}
        onShowAnswerKey={() => setShowKey(true)}
        onSave={() => { setSaveTitle(topic); setShowSave(true) }}
        onRetake={resetAnswers}
        onNewQuiz={startFresh}
      />
    </>
  )

  // - Quiz in progress / submitted -

  return (
    <div style={{ padding:'24px', maxWidth:680, margin:'0 auto', width:'100%', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {showKey && <AnswerKeyModal questions={questions} topic={topic} onClose={()=>setShowKey(false)} selected={selected} novaExplanations={novaExplanations} explanationLoading={explanationLoading} explainWrongAnswer={explainWrongAnswer}/>}

      {showSave && (
        <div style={{ position:'fixed', inset:0, zIndex:40, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.45)' }}>
          <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:18, padding:24, width:'100%', maxWidth:360, boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize:15, fontWeight:800, color:'var(--c-t1)', marginBottom:16 }}>Save Quiz</div>
            <input value={saveTitle} onChange={e=>setSaveTitle(e.target.value)} placeholder={topic||'Quiz title-'} style={{ width:'100%', height:36, background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:9, padding:'0 12px', fontSize:13, color:'var(--c-t1)', outline:'none', fontFamily:'inherit', marginBottom:14 }}/>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={doSave} disabled={saving} style={{ flex:1, height:36, background:'#2563eb', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:saving?.6:1 }}>{saving?'Saving-':'Save to My Stuff'}</button>
              <button onClick={()=>setShowSave(false)} style={{ height:36, padding:'0 16px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)', borderRadius:10, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}



      <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:20 }}>
        {questions.map((q,i) => {
          const isSA    = q.type==='short_answer'
          const isFITB  = q.type==='fill_blank'
          const isMatch = q.type==='matching'
          return (
            <div key={i} style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:14, padding:16 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:12 }}>
                <span style={{ fontSize:9, fontWeight:800, background:'rgba(59,130,246,0.1)', color:'#60a5fa', padding:'3px 8px', borderRadius:20, flexShrink:0, marginTop:1, textTransform:'uppercase', letterSpacing:'.04em', whiteSpace:'nowrap' }}>{prettifyType(q.type)}</span>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--c-t1)', flex:1, lineHeight:1.5 }}>{i+1}. {q.question}</p>
                <SpeakerBtn text={q.question}/>
              </div>

              {isFITB && (
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <span style={{ fontSize:13, color:'var(--c-t2)' }}>Answer:</span>
                    <input value={fitbInputs[i]||''} onChange={e=>setFitbInputs(s=>({...s,[i]:e.target.value}))} disabled={submitted} placeholder="Fill in the blank-" style={{ flex:1, height:36, background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:9, padding:'0 12px', fontSize:13, color:'var(--c-t1)', outline:'none', fontFamily:'inherit', opacity:submitted?.7:1 }}/>
                  </div>
                  {submitted && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, background:checkFitbAnswer(fitbInputs[i],q.correctAnswer)?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.07)', color:checkFitbAnswer(fitbInputs[i],q.correctAnswer)?'#34d399':'#f87171', fontWeight:600 }}>{checkFitbAnswer(fitbInputs[i],q.correctAnswer)?'- Correct!':'- Answer: '+q.correctAnswer}</div>}
                </div>
              )}

              {isMatch && (
                <div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'.04em' }}>Term</span>
                    <span style={{ fontSize:10, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'.04em' }}>Match</span>
                  </div>
                  {(q.pairs||[]).map((pair,j)=>(
                    <div key={j} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6, alignItems:'center' }}>
                      <div style={{ padding:'8px 12px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:8, fontSize:13, color:'var(--c-t1)' }}>{pair.left}</div>
                      <select value={matchAnswers[i]?.[j]||''} onChange={e=>setMatchAnswers(s=>({...s,[i]:{...(s[i]||{}),[j]:e.target.value}}))} disabled={submitted} style={{ height:36, background:'var(--c-surface2)', border:'1px solid '+(submitted?(matchAnswers[i]?.[j]===pair.right?'#10b981':'#ef4444'):'var(--c-line)'), borderRadius:8, padding:'0 10px', fontSize:13, color:'var(--c-t1)', outline:'none', fontFamily:'inherit' }}>
                        <option value="">Select-</option>
                        {(shuffledRights[i]||[]).map((r,ri)=><option key={ri} value={r}>{r}</option>)}
                      </select>
                    </div>
                  ))}
                  {submitted && <div style={{ fontSize:11, color:'var(--c-t3)', marginTop:4 }}>{(q.pairs||[]).map(p=>p.left+' - '+p.right).join(' - ')}</div>}
                </div>
              )}

              {isSA && (
                <div>
                  <textarea value={saInputs[i]||''} onChange={e=>setSaInputs(s=>({...s,[i]:e.target.value}))} placeholder="Type your answer here-" disabled={submitted} rows={3} style={{ width:'100%', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:10, padding:'10px 12px', fontSize:13, color:'var(--c-t1)', outline:'none', resize:'none', fontFamily:'inherit', marginBottom:8, opacity:submitted?.7:1 }}/>
                  {submitted && (
                    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                      <div style={{ fontSize:12, color:'var(--c-t2)', background:'rgba(59,130,246,0.08)', padding:'8px 12px', borderRadius:8, border:'1px solid rgba(59,130,246,0.2)' }}><span style={{ fontWeight:700, color:'#60a5fa' }}>Model answer: </span>{q.correctAnswer||'Open-ended'}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:11, color:'var(--c-t3)' }}>Self-grade:</span>
                        {['correct','wrong'].map(g=>(
                          <button key={g} onClick={()=>setSaGrades(s=>({...s,[i]:g}))} style={{ height:28, padding:'0 12px', borderRadius:8, fontSize:12, fontWeight:600, border:'1px solid '+(saGrades[i]===g?(g==='correct'?'#10b981':'#ef4444'):'var(--c-line)'), background:saGrades[i]===g?(g==='correct'?'#10b981':'#ef4444'):'transparent', color:saGrades[i]===g?'#fff':'var(--c-t2)', cursor:'pointer', fontFamily:'inherit' }}>
                            {g==='correct'?'- Correct':'- Wrong'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isSA&&!isFITB&&!isMatch && (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {(q.options||['True','False']).map((opt,j)=>{
                    const isSel  = selected[i]===j
                    const isCorr = q.answerIndex===j
                    let bg='transparent', border='rgba(255,255,255,0.07)', color='rgba(255,255,255,0.5)'
                    if (submitted) {
                      if (isCorr)      { bg='rgba(16,185,129,0.08)'; border='rgba(16,185,129,0.3)'; color='#34d399' }
                      else if (isSel)  { bg='rgba(239,68,68,0.07)'; border='rgba(239,68,68,0.25)'; color='rgba(239,68,68,0.7)' }
                      else             { color='rgba(255,255,255,0.2)' }
                    } else if (isSel)  { bg='rgba(99,102,241,0.1)'; border='rgba(99,102,241,0.4)'; color='#a5b4fc' }
                    return (
                      <button key={j} onClick={()=>!submitted&&setSelected(s=>({...s,[i]:j}))} style={{ width:'100%', textAlign:'left', padding:'9px 13px', borderRadius:9, border:'1px solid '+border, background:bg, color, fontSize:13, cursor:submitted?'default':'pointer', transition:'all .15s', fontFamily:'inherit', display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontWeight:700, width:18 }}>{['A','B','C','D'][j]}.</span>{opt}
                      </button>
                    )
                  })}
                </div>
              )}

              {submitted&&q.explanation && <div style={{ marginTop:10, fontSize:11, color:'var(--c-t2)', background:'var(--c-surface2)', padding:'8px 12px', borderRadius:8, border:'1px solid var(--c-line)', lineHeight:1.6 }}><span style={{ fontWeight:700, color:'var(--c-t1)' }}>Explanation: </span>{q.explanation}</div>}
            </div>
          )
        })}
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:10, alignItems:'center' }}>
        {!submitted && (
          <button
            onClick={async()=>{
              setSubmitted(true)
              if (user&&topic) {
                try {
                  const autoC = questions.filter((q,i)=>{ if (q.type==='short_answer'||q.type==='matching') return false; if (q.type==='fill_blank') return checkFitbAnswer(fitbInputs[i],q.correctAnswer); return selected[i]===q.answerIndex }).length
                  await supabase.from('quiz_attempts').insert({ user_id:user.id, topic, subject:null, correct:autoC, total:questions.length })
                } catch(e) {}
              }
            }}
            disabled={Object.keys(selected).length===0&&!Object.keys(saInputs).some(k=>saInputs[k]?.trim())}
            style={{ height:36, padding:'0 20px', background:'#4f46e5', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:Object.keys(selected).length===0&&!Object.keys(saInputs).some(k=>saInputs[k]?.trim())?.45:1 }}>
            Submit Answers
          </button>
        )}
        <button onClick={()=>setShowKey(true)} style={{ height:36, padding:'0 16px', background:'var(--c-surface)', border:'1px solid var(--c-line)', color:'var(--c-t2)', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:7 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="7"/><path d="M8 5v4m0 2.5v.5"/></svg>
          Answer Key
        </button>
        <button onClick={()=>printQuizBlank(questions,topic)} style={{ height:36, padding:'0 16px', background:'var(--c-surface)', border:'1px solid var(--c-line)', color:'var(--c-t2)', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:7 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6V2h8v4M4 11H2V6h12v5h-2M4 9h8v5H4V9z"/></svg>
          Print
        </button>
        <button onClick={()=>setEditMode(true)} style={{ height:36, padding:'0 16px', background:'var(--c-surface)', border:'1px solid var(--c-line)', color:'var(--c-t2)', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          Edit Questions
        </button>
        {user && (
          <button onClick={()=>{setSaveTitle(topic);setShowSave(true)}} style={{ height:36, padding:'0 16px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', color:'#34d399', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            {savedId?'Update Save':'Save Quiz'}
          </button>
        )}
        {saveFeedback && <span style={{ fontSize:12, color:'#34d399', fontWeight:500 }}>{saveFeedback}</span>}
        <button onClick={startFresh} style={{ height:36, padding:'0 16px', background:'var(--c-surface)', border:'1px solid var(--c-line)', color:'var(--c-t2)', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginLeft:'auto' }}>
          New Quiz
        </button>
      </div>
    </div>
  )
}  // ── Keyboard shortcuts (flashcard study) ─────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (!card || sessionComplete) return
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.code === 'Space') { e.preventDefault(); setFlipped(f => !f) }
      if (e.key === '1' && flipped) handleAgain()
      if (e.key === '2' && flipped) handleHard()
      if (e.key === '3' && flipped) handleEasy()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, flipped, sessionComplete])

  // ── Swipe / drag to rate ─────────────────────────────────────────────────
  useEffect(() => {
    const el = cardDragRef.current
    if (!el) return
    let ds = { active:false, sx:0, sy:0, dx:0, dy:0 }
    const onStart = (x,y) => { if(!flipped) return; ds={active:true,sx:x,sy:y,dx:0,dy:0}; el.style.transition='none' }
    const onMove  = (x,y) => { if(!ds.active) return; ds.dx=x-ds.sx; ds.dy=y-ds.sy; el.style.transform=`translateX(${ds.dx}px) translateY(${Math.min(ds.dy,0)*.35}px) rotate(${ds.dx*.07}deg)` }
    const onEnd   = ()    => {
      if(!ds.active) return; ds.active=false
      el.style.transition='transform .3s ease'
      const ax=Math.abs(ds.dx), ay=-ds.dy
      const reset = () => { el.style.transform=''; el.style.opacity='1' }
      if(ds.dx<-85){ el.style.transform='translateX(-150%) rotate(-14deg)'; el.style.opacity='0'; setTimeout(()=>{ reset(); handleAgain() },300); return }
      if(ds.dx>85) { el.style.transform='translateX(150%) rotate(14deg)';  el.style.opacity='0'; setTimeout(()=>{ reset(); handleEasy()  },300); return }
      if(ay>75&&ax<65){ el.style.transform='translateY(-130%) rotate(-5deg)'; el.style.opacity='0'; setTimeout(()=>{ reset(); handleHard() },300); return }
      el.style.transform=''
    }
    const mDown=(e)=>{ e.preventDefault(); onStart(e.clientX,e.clientY) }
    const mMove=(e)=>{ if(ds.active) onMove(e.clientX,e.clientY) }
    const tStart=(e)=>{ const t=e.touches[0]; onStart(t.clientX,t.clientY) }
    const tMove =(e)=>{ if(ds.active){ const t=e.touches[0]; onMove(t.clientX,t.clientY) } }
    el.addEventListener('mousedown', mDown)
    window.addEventListener('mousemove', mMove)
    window.addEventListener('mouseup', onEnd)
    el.addEventListener('touchstart', tStart, {passive:true})
    window.addEventListener('touchmove', tMove, {passive:true})
    window.addEventListener('touchend', onEnd)
    return () => {
      el.removeEventListener('mousedown', mDown); window.removeEventListener('mousemove', mMove); window.removeEventListener('mouseup', onEnd)
      el.removeEventListener('touchstart', tStart); window.removeEventListener('touchmove', tMove); window.removeEventListener('touchend', onEnd)
    }
  }, [flipped, card])

  // ── Render: study session ──────────────────────────────────────────────────

  const totalCards   = cards.length
  const done         = totalCards - studyQueue.length
  const ratingCounts = sessionRatings

  // Colour-coded dots — completed cards get colour based on cumulative ratings
  const easyCount  = sessionRatings.easy
  const hardCount  = sessionRatings.hard
  const againCount = sessionRatings.again
  const doneCount  = easyCount + hardCount + againCount

  const dots = cards.map((_, i) => {
    if (i >= doneCount) return null
    if (i < easyCount) return '#34d399'
    if (i < easyCount + hardCount) return '#f59e0b'
    return '#ef4444'
  })

  if (sessionComplete) return (
    <SessionComplete
      cards={cards}
      topic={topic}
      hardCards={sessionHardCards}
      againCards={sessionAgainCards}
      sessionRatings={sessionRatings}
      onRestart={()=>{ setStudyQueue(cards.map((_,i)=>i)); setSessionRatings({again:0,hard:0,easy:0}); setSessionHardCards([]); setSessionAgainCards([]); setFlipped(false); setSessionComplete(false) }}
      onNewDeck={()=>{ setCards([]); setStudyQueue([]); setFlipped(false); setSessionComplete(false); setTopic('') }}
      cardTheme={cardTheme}
    />
  )

  return (
    <>
      {showSave && (
        <div style={{position:'fixed',inset:0,zIndex:40,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowSave(false)}>
          <div style={{background:'var(--c-b2)',borderRadius:16,padding:28,width:340}} onClick={e=>e.stopPropagation()}>
            <p style={{fontWeight:500,marginBottom:12}}>Save deck</p>
            <input value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="Deck name…"
              style={{width:'100%',padding:'9px 13px',borderRadius:9,border:'1px solid var(--c-b4)',background:'var(--c-b1)',color:'var(--c-t1)',fontSize:14,marginBottom:12}}/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setShowSave(false)} style={{flex:1,padding:'9px 0',borderRadius:9,border:'1px solid var(--c-b4)',background:'transparent',color:'var(--c-t2)',cursor:'pointer'}}>Cancel</button>
              <button onClick={doSave} style={{flex:1,padding:'9px 0',borderRadius:9,border:'none',background:cardTheme.accent,color:'#fff',fontWeight:500,cursor:'pointer'}}>{saveLoading?'Saving…':'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{background:'rgba(99,102,241,0.15)',color:'#818cf8',fontSize:11,fontWeight:500,padding:'3px 10px',borderRadius:20,letterSpacing:'.04em'}}>FLASHCARDS</span>
          <span style={{color:'var(--c-t1)',fontSize:14,fontWeight:500}}>{topic}</span>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>printDeck(cards,topic)} style={{background:'var(--c-b2)',border:'1px solid var(--c-b4)',color:'var(--c-t2)',fontSize:12,padding:'5px 12px',borderRadius:8,cursor:'pointer'}}>Print</button>
          <button onClick={()=>{ setCards([]); setStudyQueue([]); setFlipped(false) }} style={{background:'var(--c-b2)',border:'1px solid var(--c-b4)',color:'var(--c-t2)',fontSize:12,padding:'5px 12px',borderRadius:8,cursor:'pointer'}}>New</button>
          <button onClick={()=>{ setShowSave(true); setSaveName(topic) }} style={{background:cardTheme.accent,border:'none',color:'#fff',fontSize:12,padding:'5px 12px',borderRadius:8,cursor:'pointer',fontWeight:500}}>Save</button>
        </div>
      </div>

      {/* Progress dots */}
      <div style={{display:'flex',gap:5,marginBottom:16,flexWrap:'wrap'}}>
        {cards.map((_,i) => (
          <div key={i} style={{
            width:20, height:6, borderRadius:3,
            background: dots[i] || (i===currentIdx ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.1)'),
            transform: i===currentIdx && !dots[i] ? 'scaleX(1.2)' : 'none',
            transition: 'background .35s, transform .2s'
          }}/>
        ))}
      </div>

      {/* Counter + keyboard hints */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <span style={{fontSize:12,color:'var(--c-t3)'}}>Card {done+1} of {totalCards}</span>
        {!isMobile && (
          <div style={{display:'flex',gap:10}}>
            {[['Space','flip'],['1','again'],['2','hard'],['3','easy']].map(([k,l]) => (
              <span key={k} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--c-t3)'}}>
                <span style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.38)',fontSize:10,padding:'1px 5px',borderRadius:3,fontFamily:'monospace'}}>{k}</span>{l}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card stack */}
      <div style={{position:'relative',width:'100%',maxWidth:560,margin:'0 auto',height:isMobile?220:250}}>
        <div style={{position:'absolute',inset:0,borderRadius:16,border:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.03)',transform:'rotate(2.5deg) translateY(7px)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',inset:0,borderRadius:16,border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.05)',transform:'rotate(1.2deg) translateY(3.5px)',pointerEvents:'none'}}/>
        <div ref={cardDragRef} style={{position:'absolute',inset:0,cursor:flipped?'grab':'pointer',willChange:'transform'}}>
          <div style={{width:'100%',height:'100%',transformStyle:'preserve-3d',transition:'transform .52s cubic-bezier(.4,0,.2,1)',transform:flipped?'rotateY(180deg)':'none'}}>
            {/* Question face */}
            <div onClick={()=>{ if(!flipped) setFlipped(true) }} style={{position:'absolute',inset:0,borderRadius:16,border:`1.5px solid ${cardTheme.border}`,background:cardTheme.cardBg,backfaceVisibility:'hidden',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:28}}>
              <span style={{fontSize:11,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(99,102,241,0.75)'}}>Question</span>
              <p style={{fontSize:isMobile?15:17,color:'var(--c-t1)',textAlign:'center',lineHeight:1.55,margin:0}}>{card.front||card.question}</p>
              <p style={{fontSize:12,color:'var(--c-t3)',margin:0}}>Tap to reveal · {isMobile?'or swipe':'or press Space'}</p>
            </div>
            {/* Answer face */}
            <div style={{position:'absolute',inset:0,borderRadius:16,border:'1.5px solid rgba(52,211,153,0.3)',background:cardTheme.cardBg,backfaceVisibility:'hidden',transform:'rotateY(180deg)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,padding:28}}>
              <span style={{fontSize:11,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(52,211,153,0.75)'}}>Answer</span>
              <p style={{fontSize:isMobile?14:16,color:'var(--c-t1)',textAlign:'center',lineHeight:1.55,margin:0}}>{card.back||card.answer}</p>
              <p onClick={()=>setFlipped(false)} style={{fontSize:12,color:'var(--c-t3)',cursor:'pointer',margin:0}}>↩ Back to question</p>
              <div style={{position:'absolute',bottom:14,right:14}} onClick={e=>e.stopPropagation()}><SpeakerBtn text={card.back||card.answer} audioRef={audioRef}/></div>
            </div>
          </div>
        </div>
      </div>

      {/* Rating buttons */}
      <div style={{display:'flex',gap:10,width:'100%',maxWidth:560,margin:'14px auto 0',opacity:flipped?1:0,transform:flipped?'translateY(0)':'translateY(6px)',transition:'opacity .25s,transform .25s',pointerEvents:flipped?'all':'none'}}>
        {[
          {fn:handleAgain,label:'Again',sub:'→ end', bg:'rgba(239,68,68,0.1)', color:'#f87171',border:'rgba(239,68,68,0.2)'},
          {fn:handleHard, label:'Hard', sub:'→ later',bg:'rgba(245,158,11,0.1)',color:'#fbbf24',border:'rgba(245,158,11,0.2)'},
          {fn:handleEasy, label:'Easy', sub:'✓ done', bg:'rgba(52,211,153,0.1)',color:'#34d399',border:'rgba(52,211,153,0.2)'},
        ].map(({fn,label,sub,bg,color,border}) => (
          <button key={label} onClick={fn} style={{flex:1,padding:'11px 8px',borderRadius:12,border:`1px solid ${border}`,background:bg,color,fontSize:13,fontWeight:500,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
            {label}<span style={{fontSize:10,opacity:.55,fontWeight:400}}>{sub}</span>
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div style={{display:'flex',gap:14,marginTop:12,width:'100%',maxWidth:560,margin:'12px auto 0'}}>
        {[{color:'#ef4444',label:'again',count:againCount},{color:'#f59e0b',label:'hard',count:hardCount},{color:'#34d399',label:'easy',count:easyCount}].map(({color,label,count}) => (
          <div key={label} style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'var(--c-t3)'}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:color}}/>{count} {label}
          </div>
        ))}
      </div>
    </>
  )
}

