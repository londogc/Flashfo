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
      </div>)
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
  const [currentIdx,   setCurrentIdx]   = useState(0)
  const [autoAdvance,  setAutoAdvance]   = useState(false)
  const [quizRevealed, setQuizRevealed]  = useState(false)
  const [matchSel,     setMatchSel]      = useState(null)

  // reset quiz when questions change
  useEffect(() => { setCurrentIdx(0); setQuizRevealed(false); setMatchSel(null) }, [questions.length])

  function wasCorrect(i) {
    const q = questions[i]; if (!q) return false
    if (q.type==='short_answer') return !!saGrades[i]?.correct
    if (q.type==='fill_blank')   return checkFitbAnswer(fitbInputs[i]||'', q.correctAnswer||q.answer||'')
    if (q.type==='matching')     return (q.pairs||[]).length>0 && Object.keys(matchAnswers[i]||{}).length>=(q.pairs||[]).length
    return selected[i] === (q.correct ?? q.answerIndex)
  }
  function advanceQ() { setCurrentIdx(c=>c+1); setQuizRevealed(false); setMatchSel(null) }
  function handleReveal(doAuto) { setQuizRevealed(true); if(doAuto&&autoAdvance) setTimeout(advanceQ, 2200) }

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
          {/* ── Premium quiz input card ── */}
          <div style={{ position:'relative' }}>

            {/* Animated orb layer behind card */}
            <div style={{ position:'absolute', inset:-50, pointerEvents:'none', zIndex:0, overflow:'hidden', borderRadius:60, filter:'blur(35px)', opacity:0.5 }}>
              <div style={{ position:'absolute', width:240, height:240, borderRadius:'50%', background:'radial-gradient(circle,#6366f1,transparent 70%)', top:-30, left:-30, animation:'qzOrb1 12s ease-in-out infinite' }}/>
              <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,#a855f7,transparent 70%)', bottom:-10, right:-10, animation:'qzOrb2 15s ease-in-out infinite' }}/>
              <div id="qz-orb3" style={{ position:'absolute', width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle,#6366f1,transparent 70%)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', animation:'qzOrb3 10s ease-in-out infinite', transition:'background 0.8s ease' }}/>
            </div>

            <style>{`
              @keyframes qzOrb1{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(28px,18px) scale(1.1)}70%{transform:translate(-12px,30px) scale(0.95)}}
              @keyframes qzOrb2{0%,100%{transform:translate(0,0) scale(1)}35%{transform:translate(-22px,-18px) scale(1.08)}65%{transform:translate(18px,-30px) scale(0.92)}}
              @keyframes qzOrb3{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.2)}}
              @keyframes qzBtnGrad{0%{background-position:0% 50%}100%{background-position:200% 50%}}
              @keyframes qzShine{0%,100%{left:-60%}50%{left:120%}}
              .qz-tile{padding:12px 8px;border-radius:12px;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.3);font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit;text-align:center;transform:translateY(0) scale(1);box-shadow:0 1px 3px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.04) inset;position:relative;overflow:hidden;transition:all .2s cubic-bezier(.2,.8,.2,1);}
              .qz-tile::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:rgba(255,255,255,0.07);}
              .qz-tile:hover{background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.14);color:rgba(255,255,255,0.7);transform:translateY(-3px) scale(1.02);box-shadow:0 8px 20px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.08) inset;}
              .qz-tile.qz-tile-on{background:rgba(99,102,241,0.15);border-color:rgba(99,102,241,0.45);color:#fff;transform:translateY(-3px) scale(1.02);box-shadow:0 8px 24px rgba(99,102,241,0.25),0 0 0 1px rgba(99,102,241,0.2) inset,0 0 20px rgba(99,102,241,0.1) inset;}
              .qz-tile.qz-tile-on::before{background:rgba(139,142,255,0.25);}
              .qz-arrow{width:40px;height:40px;border-radius:11px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);color:rgba(255,255,255,0.35);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .18s cubic-bezier(.2,.8,.2,1);box-shadow:0 2px 6px rgba(0,0,0,0.4);}
              .qz-arrow:hover{background:rgba(255,255,255,0.09);color:#fff;border-color:rgba(255,255,255,0.16);transform:translateY(-2px);box-shadow:0 6px 14px rgba(0,0,0,0.5);}
              .qz-arrow:active{transform:translateY(1px);}
              .qz-pre{font-size:12px;font-weight:600;color:rgba(255,255,255,0.2);background:none;border:none;border-bottom:1px solid transparent;padding:2px 0;cursor:pointer;font-family:inherit;transition:all .12s;}
              .qz-pre:hover{color:rgba(255,255,255,0.55);}
              .qz-pre.qz-pre-on{color:rgba(255,255,255,0.85);border-bottom-color:rgba(255,255,255,0.4);}
              .qz-genbtn{width:100%;padding:16px;border:none;border-radius:14px;background:linear-gradient(110deg,#4f46e5 0%,#6366f1 35%,#818cf8 50%,#6366f1 65%,#4338ca 100%);background-size:200% 100%;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:-.3px;box-shadow:0 4px 24px rgba(99,102,241,0.4),0 1px 0 rgba(255,255,255,0.15) inset;transition:all .2s cubic-bezier(.2,.8,.2,1);position:relative;overflow:hidden;animation:qzBtnGrad 4s linear infinite;}
              .qz-genbtn::after{content:'';position:absolute;top:-50%;left:-60%;width:40%;height:200%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);transform:skewX(-20deg);animation:qzShine 3.5s ease-in-out infinite;}
              .qz-genbtn:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(99,102,241,0.55),0 1px 0 rgba(255,255,255,0.2) inset;}
              .qz-genbtn:active{transform:translateY(1px);}
              .qz-genbtn:disabled{opacity:0.45;cursor:not-allowed;transform:none;}
            `}</style>

            {/* Card */}
            <div style={{ position:'relative', zIndex:1, borderRadius:24, background:'rgba(12,10,22,0.85)', backdropFilter:'blur(40px) saturate(1.5)', WebkitBackdropFilter:'blur(40px) saturate(1.5)', border:'1px solid rgba(255,255,255,0.09)', boxShadow:'0 0 0 1px rgba(255,255,255,0.04) inset, 0 40px 80px rgba(0,0,0,0.6)', overflow:'hidden' }}>

              {/* Top shimmer */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.08) 20%,rgba(255,255,255,0.2) 50%,rgba(255,255,255,0.08) 80%,transparent)', zIndex:10, pointerEvents:'none' }}/>

              {/* Textarea */}
              <div style={{ padding:'24px 24px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <textarea
                  value={topic}
                  onChange={e=>setTopic(e.target.value)}
                  onKeyDown={e=>{ if (e.key==='Enter'&&e.metaKey) generate() }}
                  rows={3}
                  placeholder="Enter a topic or paste your notes…"
                  style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'rgba(255,255,255,0.78)', fontFamily:'inherit', fontSize:15, lineHeight:1.65, resize:'none', display:'block', caretColor:'rgba(255,255,255,0.5)' }}
                />
              </div>

              {/* Question type tiles */}
              <div style={{ padding:'18px 24px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize:10, fontWeight:600, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)', marginBottom:12 }}>Question type</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
                  {BASE_TYPES.map(t => (
                    <button
                      key={t.id}
                      className={'qz-tile' + (typeId===t.id ? ' qz-tile-on' : '')}
                      onClick={()=>{
                        setTypeId(t.id)
                        if (t.id==='mixed') setBreakdown({mcq:0,tf:0,sa:0,fitb:0,match:0})
                        const orb = document.getElementById('qz-orb3')
                        const cols = { mcq:'#6366f1', true_false:'#06b6d4', short_answer:'#10b981', fill_blank:'#f59e0b', matching:'#ec4899', mixed:'#a855f7' }
                        if (orb) orb.style.background = `radial-gradient(circle,${cols[t.id]||'#6366f1'},transparent 70%)`
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mixed breakdown */}
              {typeId==='mixed' && (
                <div style={{ margin:'4px 24px 0', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'12px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'.05em' }}>Breakdown</span>
                    <span style={{ fontSize:13, fontWeight:700, color:breakdownTotal>0?'#a5b4fc':'rgba(255,255,255,0.25)' }}>{breakdownTotal} question{breakdownTotal!==1?'s':''}</span>
                  </div>
                  {[{k:'mcq',label:'Multiple Choice'},{k:'tf',label:'True / False'},{k:'sa',label:'Short Answer'},{k:'fitb',label:'Fill in the Blank'},{k:'match',label:'Matching'}].map(({k,label})=>{
                    const val=breakdown[k]||0; const active=val>0
                    return (
                      <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:active?'rgba(99,102,241,0.07)':'rgba(255,255,255,0.02)', border:'1px solid '+(active?'rgba(99,102,241,0.25)':'rgba(255,255,255,0.06)'), borderRadius:9, padding:'0 8px 0 12px', height:44, marginBottom:5, transition:'all .15s' }}>
                        <span style={{ fontSize:13, fontWeight:500, color:active?'#a5b4fc':'var(--c-t1)', flex:1 }}>{label}</span>
                        <div style={{ display:'flex', alignItems:'center', gap:2 }}>
                          <button onClick={()=>setBreakdown(b=>({...b,[k]:Math.max(0,(b[k]||0)-1)}))} style={{ width:36,height:36,borderRadius:8,border:'none',background:'none',color:active?'#6366f1':'var(--c-t3)',fontSize:20,cursor:'pointer',fontFamily:'inherit' }}>-</button>
                          <span style={{ fontSize:16,fontWeight:700,color:active?'#6366f1':'rgba(255,255,255,0.2)',minWidth:24,textAlign:'center' }}>{val}</span>
                          <button onClick={()=>setBreakdown(b=>({...b,[k]:(b[k]||0)+1}))} style={{ width:36,height:36,borderRadius:8,border:'none',background:'none',color:active?'#6366f1':'var(--c-t3)',fontSize:20,cursor:'pointer',fontFamily:'inherit' }}>+</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Count selector — replaces slider */}
              {typeId!=='mixed' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto', alignItems:'center', padding:'20px 24px', gap:16 }}>
                  <div>
                    <div style={{ fontSize:10, fontWeight:600, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)', marginBottom:8 }}>Questions</div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        inputMode="numeric"
                        role="spinbutton"
                        aria-label="Number of questions"
                        aria-valuenow={count}
                        aria-valuemin={1}
                        aria-valuemax={100}
                        onBlur={e=>{
                          const v=Math.max(1,Math.min(100,parseInt(e.currentTarget.textContent)||1))
                          setCount(v)
                          e.currentTarget.textContent=v
                        }}
                        onKeyDown={e=>{
                          if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur()}
                          if(e.key==='ArrowUp'){e.preventDefault();setCount(c=>Math.min(100,c+1));e.currentTarget.textContent=Math.min(100,count+1)}
                          if(e.key==='ArrowDown'){e.preventDefault();setCount(c=>Math.max(1,c-1));e.currentTarget.textContent=Math.max(1,count-1)}
                        }}
                        style={{ fontSize:68, fontWeight:900, letterSpacing:-4, lineHeight:1, background:'linear-gradient(160deg,#fff 0%,rgba(255,255,255,0.55) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', cursor:'text', outline:'none', minWidth:84, display:'inline-block', transition:'opacity .1s' }}
                      >{count}</div>
                      <div style={{ fontSize:13, fontWeight:400, color:'rgba(255,255,255,0.22)', paddingBottom:8, WebkitTextFillColor:'rgba(255,255,255,0.22)' }}>questions</div>
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
                      {[5,10,15,20,30,40].map(n=>(
                        <button key={n} className={'qz-pre'+(count===n?' qz-pre-on':'')} onClick={()=>setCount(n)}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <button className="qz-arrow" onClick={()=>setCount(c=>Math.min(100,c+1))}>↑</button>
                    <button className="qz-arrow" onClick={()=>setCount(c=>Math.max(1,c-1))}>↓</button>
                  </div>
                </div>
              )}

              <div style={{ padding:'10px 24px 16px', borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.18)' }}>Nova explains every wrong answer</span>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.13)' }}>⌘↵ generate</span>
              </div>
            </div>
          </div>

          {error && <div style={{ fontSize:12, color:'#f87171', marginTop:8 }}>{error}</div>}

          <button
            className="qz-genbtn"
            onClick={generate}
            disabled={loading||!topic.trim()||(typeId==='mixed'&&breakdownTotal===0)}
            style={{ marginTop:12 }}
          >
            {loading ? (
              <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:9 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation:'_fcspin .7s linear infinite', flexShrink:0 }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                Generating…
              </span>
            ) : `Generate ${typeId==='mixed'?breakdownTotal:count} question${(typeId==='mixed'?breakdownTotal:count)!==1?'s':''}`}
          </button>
        </div>

        {!isMobile && <div>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)', marginBottom:12 }}>{loading ? 'Generating questions…' : 'Live preview'}</div>

          {/* Skeleton */}
          {loading && (
            <div>
              <style>{`.qz-skel{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.09) 50%,rgba(255,255,255,0.04) 75%);background-size:1200px 100%;animation:qzSkelShimmer 1.8s ease-in-out infinite;border-radius:8px;}@keyframes qzSkelShimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}`}</style>
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:16 }}>
                <div className="qz-skel" style={{ height:8, width:'35%', marginBottom:14 }}/>
                <div className="qz-skel" style={{ height:11, width:'95%', marginBottom:6 }}/>
                <div className="qz-skel" style={{ height:11, width:'75%', marginBottom:16 }}/>
                {[0,1,2,3].map(i => (
                  <div key={i} className="qz-skel" style={{ height:32, borderRadius:7, marginBottom:6, animationDelay:`${i*0.1}s` }}/>
                ))}
                <div className="qz-skel" style={{ height:52, borderRadius:8, marginTop:10 }}/>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(99,102,241,0.05)', border:'1px solid rgba(99,102,241,0.14)', borderRadius:10, marginTop:10 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, animation:'_fcspin .9s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.32)', lineHeight:1.5 }}>Nova is generating your questions and preparing explanations…</span>
              </div>
            </div>
          )}

          {!loading && <div>
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
          </div>}
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



      {/* ── Progress bar ── */}
      {questions.length > 0 && (
        <div style={{ display:'flex', gap:5, marginBottom:16 }}>
          {questions.map((_,i) => (
            <div key={i} style={{ flex:1, height:4, borderRadius:2, transition:'background .3s',
              background: i===currentIdx ? '#6366f1' : i<currentIdx ? (wasCorrect(i)?'#10b981':'#ef4444') : 'rgba(255,255,255,0.08)' }} />
          ))}
        </div>
      )}

      {/* ── One-at-a-time question ── */}
      {currentIdx < questions.length && (() => {
        const q = questions[currentIdx]
        const isTF    = q.type==='true_false'
        const isSA    = q.type==='short_answer'
        const isFITB  = q.type==='fill_blank'
        const isMatch = q.type==='matching'
        const opts    = q.options||q.choices||[]
        const correctAns = q.correct??q.answerIndex
        const myAns   = selected[currentIdx]
        const matched = matchAnswers[currentIdx]||{}
        const rights  = shuffledRights[currentIdx]||(q.pairs||[]).map(p=>p.right)
        const isAnswered = isSA ? !!saGrades[currentIdx]&&!saGrades[currentIdx].grading
                         : isFITB ? quizRevealed
                         : isMatch ? (q.pairs||[]).length>0&&Object.keys(matched).length>=(q.pairs||[]).length
                         : myAns!==undefined
        const qExplain = novaExplanations[currentIdx]||q.explanation||''
        function pickAns(val) {
          if (myAns!==undefined) return
          setSelected(s=>({...s,[currentIdx]:val}))
          setQuizRevealed(true)
          if (autoAdvance) setTimeout(advanceQ, 2200)
        }
        return (
          <div key={currentIdx} style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:'#818cf8', fontWeight:600 }}>
                {prettifyType(q.type)} &#xb7; {currentIdx+1} / {questions.length}
              </span>
              <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                <span style={{ fontSize:11, color:'var(--c-t3)' }}>Auto</span>
                <div onClick={()=>setAutoAdvance(a=>!a)} style={{ width:34,height:18,borderRadius:9,background:autoAdvance?'#6366f1':'rgba(255,255,255,0.12)',position:'relative',cursor:'pointer',transition:'background .2s' }}>
                  <div style={{ width:12,height:12,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:autoAdvance?19:3,transition:'left .2s' }} />
                </div>
              </label>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:isAnswered?'14px 14px 0 0':14, overflow:'hidden' }}>
              <div style={{ padding:isMobile?'18px 16px':'26px 26px', borderRight:isMobile?'none':'1px solid var(--c-line)', borderBottom:isMobile?'1px solid var(--c-line)':'none', display:'flex', flexDirection:'column', justifyContent:'center' }}>
                <div style={{ fontSize:isMobile?15:17, fontWeight:500, lineHeight:1.55, color:'var(--c-t1)' }}>
                  {q.question}
                </div>
              </div>
              <div style={{ padding:isMobile?16:'18px 22px', display:'flex', flexDirection:'column', gap:isTF?0:8, justifyContent:'center' }}>
                {!isTF&&!isSA&&!isFITB&&!isMatch && opts.map((opt,j) => {
                  const isC=j===correctAns, isSel=myAns===j, rev=myAns!==undefined
                  return (<button key={j} disabled={rev} onClick={()=>pickAns(j)} style={{ display:'flex',alignItems:'center',gap:10,padding:'11px 13px',background:!rev?'rgba(255,255,255,.03)':isSel&&isC?'rgba(16,185,129,.1)':isSel&&!isC?'rgba(239,68,68,.08)':isC?'rgba(16,185,129,.07)':'transparent',border:'0.5px solid '+(!rev?'var(--c-line)':isSel&&isC?'rgba(16,185,129,.4)':isSel&&!isC?'rgba(239,68,68,.35)':isC?'rgba(16,185,129,.28)':'rgba(255,255,255,.06)'),borderRadius:10,cursor:rev?'default':'pointer',color:'var(--c-t1)',fontSize:13,textAlign:'left',width:'100%',transition:'all .15s' }}>
                    <span style={{ width:22,height:22,borderRadius:6,background:'rgba(255,255,255,.06)',border:'0.5px solid rgba(255,255,255,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'rgba(255,255,255,.4)',flexShrink:0 }}>{String.fromCharCode(65+j)}</span>
                    {opt}
                  </button>)
                })}
                {isTF && (
                  <div style={{ display:'flex', gap:10 }}>
                    {[true,false].map((val,j) => {
                      const isC=val===(q.correct??q.answer), isSel=myAns===val, rev=myAns!==undefined
                      return (<button key={j} disabled={rev} onClick={()=>pickAns(val)} style={{ flex:1,padding:'22px 8px',background:!rev?'rgba(255,255,255,.03)':isSel&&isC?'rgba(16,185,129,.12)':isSel&&!isC?'rgba(239,68,68,.1)':isC?'rgba(16,185,129,.07)':'transparent',border:'0.5px solid '+(!rev?'var(--c-line)':isSel&&isC?'rgba(16,185,129,.4)':isSel&&!isC?'rgba(239,68,68,.35)':isC?'rgba(16,185,129,.28)':'rgba(255,255,255,.05)'),borderRadius:12,cursor:rev?'default':'pointer',color:'var(--c-t1)',fontSize:14,fontWeight:500,display:'flex',flexDirection:'column',alignItems:'center',gap:7,transition:'all .15s' }}>
                        <span style={{ fontSize:20 }}>{val?'✓':'✗'}</span>{val?'True':'False'}
                      </button>)
                    })}
                  </div>
                )}
                {isSA && (
                  <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                    <textarea rows={3} disabled={!!saGrades[currentIdx]&&!saGrades[currentIdx].grading} value={saInputs[currentIdx]||''} onChange={e=>setSaInputs(s=>({...s,[currentIdx]:e.target.value}))} placeholder="Type your answer here…"
                      style={{ width:'100%',padding:'10px 12px',background:'rgba(255,255,255,.04)',border:'0.5px solid rgba(255,255,255,.15)',borderRadius:9,color:'var(--c-t1)',fontSize:13,fontFamily:'inherit',resize:'none',outline:'none' }} />
                    {!saGrades[currentIdx] && (
                      <button onClick={async()=>{
                        const val=(saInputs[currentIdx]||'').trim(); if(!val) return
                        setSaGrades(g=>({...g,[currentIdx]:{grading:true}}))
                        try {
                          const resp=await fetch('/api/grade-sa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q.question,answer:val,correctAnswer:q.correctAnswer||q.answer||''})})
                          const data=await resp.json()
                          setSaGrades(g=>({...g,[currentIdx]:data}))
                          if(data.explanation) setNovaExplanations(e=>({...e,[currentIdx]:data.explanation}))
                          setQuizRevealed(true)
                          if(autoAdvance) setTimeout(advanceQ,2500)
                        } catch(err){ setSaGrades(g=>({...g,[currentIdx]:{correct:false,explanation:'Unable to grade'}})); setQuizRevealed(true) }
                      }} style={{ padding:'9px 18px',background:'#6366f1',border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer',alignSelf:'flex-end' }}>Submit answer</button>
                    )}
                    {saGrades[currentIdx]&&!saGrades[currentIdx].grading && (
                      <div style={{ padding:'9px 12px',borderRadius:8,background:saGrades[currentIdx].correct?'rgba(16,185,129,.1)':'rgba(239,68,68,.08)',border:'0.5px solid '+(saGrades[currentIdx].correct?'rgba(16,185,129,.3)':'rgba(239,68,68,.25)') }}>
                        <span style={{ fontWeight:600,fontSize:12,color:saGrades[currentIdx].correct?'#34d399':'#f87171' }}>{saGrades[currentIdx].correct?'✓ Correct':'✗ Needs review'}</span>
                      </div>
                    )}
                  </div>
                )}
                {isFITB && (
                  <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                    <div style={{ fontSize:15,lineHeight:2.3,color:'var(--c-t1)' }}>
                      {(q.question||'').split('___').reduce((acc,part,pi,arr)=>{
                        acc.push(<span key={'p'+pi}>{part}</span>)
                        if(pi<arr.length-1){const fc=checkFitbAnswer(fitbInputs[currentIdx]||'',q.correctAnswer||q.answer||'');acc.push(<input key={'i'+pi} disabled={quizRevealed} value={fitbInputs[currentIdx]||''} onChange={e=>setFitbInputs(f=>({...f,[currentIdx]:e.target.value}))} style={{ display:'inline-block',minWidth:90,padding:'2px 8px',background:!quizRevealed?'rgba(99,102,241,.1)':fc?'rgba(16,185,129,.15)':'rgba(239,68,68,.12)',border:'none',borderBottom:'1.5px solid '+(quizRevealed?fc?'#34d399':'#f87171':'#6366f1'),color:quizRevealed?fc?'#34d399':'#f87171':'#a5b4fc',fontSize:14,fontFamily:'inherit',outline:'none',borderRadius:'3px 3px 0 0',textAlign:'center' }} />)}
                        return acc
                      },[])}
                    </div>
                    {!quizRevealed && (<button onClick={()=>{ setQuizRevealed(true); if(autoAdvance) setTimeout(advanceQ,2200) }} style={{ padding:'9px 18px',background:'#6366f1',border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer',alignSelf:'flex-end' }}>Check</button>)}
                  </div>
                )}
                {isMatch && (
                  <div>
                    <div style={{ fontSize:10,color:'rgba(255,255,255,.25)',marginBottom:8 }}>Tap a term, then tap its match</div>
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6 }}>
                      {(q.pairs||[]).map((pair,pi)=>{
                        const left=pair.left,rightShuf=rights[pi]||pair.right
                        const isLM=matched[left]!==undefined,isRM=Object.values(matched).includes(rightShuf),lSel=matchSel===left
                        return (<React.Fragment key={pi}>
                          <div onClick={()=>{ if(!isLM) setMatchSel(s=>s===left?null:left) }} style={{ padding:'9px 10px',borderRadius:8,border:'0.5px solid '+(isLM?'rgba(16,185,129,.4)':lSel?'#6366f1':'rgba(255,255,255,.12)'),background:isLM?'rgba(16,185,129,.1)':lSel?'rgba(99,102,241,.15)':'rgba(255,255,255,.03)',cursor:isLM?'default':'pointer',fontSize:11,color:isLM?'#34d399':'var(--c-t1)',textAlign:'center',transition:'all .15s',userSelect:'none' }}>{left}</div>
                          <div onClick={()=>{
                            if(!matchSel||isRM) return
                            const nm={...matched,[matchSel]:rightShuf}
                            setMatchAnswers(a=>({...a,[currentIdx]:nm}))
                            setMatchSel(null)
                            if(Object.keys(nm).length>=(q.pairs||[]).length){ setQuizRevealed(true); if(autoAdvance) setTimeout(advanceQ,2200) }
                          }} style={{ padding:'9px 10px',borderRadius:8,border:'0.5px solid '+(isRM?'rgba(16,185,129,.4)':matchSel?'rgba(99,102,241,.3)':'rgba(255,255,255,.12)'),background:isRM?'rgba(16,185,129,.1)':matchSel?'rgba(99,102,241,.06)':'rgba(255,255,255,.03)',cursor:isRM||!matchSel?'default':'pointer',fontSize:11,color:isRM?'#34d399':'var(--c-t1)',textAlign:'center',transition:'all .15s',userSelect:'none' }}>{rightShuf}</div>
                        </React.Fragment>)
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {isAnswered && (
              <div style={{ padding:'13px 20px',background:'var(--c-surface)',border:'1px solid var(--c-line)',borderRadius:'0 0 14px 14px',borderTop:'none',display:'flex',alignItems:'flex-start',gap:12 }}>
                {!isMatch && (<div style={{ width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0,marginTop:1,background:wasCorrect(currentIdx)?'rgba(16,185,129,.15)':'rgba(239,68,68,.12)',color:wasCorrect(currentIdx)?'#34d399':'#f87171' }}>{wasCorrect(currentIdx)?'✓':'✗'}</div>)}
                <div style={{ flex:1 }}>
                  {!isMatch && <div style={{ fontSize:9,color:'#818cf8',fontWeight:600,letterSpacing:'.05em',marginBottom:3 }}>NOVA EXPLAINS</div>}
                  <div style={{ fontSize:12,color:'rgba(255,255,255,.5)',lineHeight:1.55 }}>{isMatch?'All pairs matched!':(qExplain||(wasCorrect(currentIdx)?'Correct!':'Check the highlighted answer.'))}</div>
                </div>
                <button onClick={()=>{ if(currentIdx>=questions.length-1){document.getElementById('quiz-submit-btn')?.click()} else advanceQ() }} style={{ padding:'8px 16px',background:'#6366f1',border:'none',borderRadius:8,color:'#fff',fontSize:12,fontWeight:500,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap' }}>
                  {currentIdx>=questions.length-1?'Finish →':'Next →'}
                </button>
              </div>
            )}
          </div>
        )
      })()}

      {currentIdx >= questions.length && (<div style={{ display:'flex', flexWrap:'wrap', gap:10, alignItems:'center' }}>
        {!submitted && (
          <button id="quiz-submit-btn"
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
      </div>)}

    </div>
  )
}
