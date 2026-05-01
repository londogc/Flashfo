'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { saveItem } from '@/lib/savedItems'

const GRADES = ['Kindergarten','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12','University']
const DURATIONS = ['20 minutes','30 minutes','45 minutes','60 minutes','90 minutes','2 hours']
const SECTIONS = ['Learning objectives','Warm-up activity','Main instruction','Guided practice','Independent activity','Assessment / exit ticket','Homework']

export default function LessonBuilderPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ topic:'', grade:'Grade 8', duration:'45 minutes', subject:'' })
  const [sections, setSections] = useState(['Learning objectives','Warm-up activity','Main instruction','Guided practice','Assessment / exit ticket'])
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState('')

  useEffect(() => {
    const id = 'nova-gen-anim'
    if (document.getElementById(id)) return
    const s = document.createElement('style')
    s.id = id
    s.textContent = '@keyframes nova-pop{0%{opacity:0;transform:translateY(14px) scale(0.97)}60%{opacity:1;transform:translateY(-3px) scale(1.005)}100%{opacity:1;transform:translateY(0) scale(1)}} @keyframes nova-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.85)}} .nova-card{opacity:0;animation:nova-pop .42s cubic-bezier(.22,.68,0,1.2) forwards} .nova-dot-pulse{animation:nova-pulse .9s ease-in-out infinite}'
    document.head.appendChild(s)
  }, [])

  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const toggleSection = (s) => setSections(prev => prev.includes(s) ? prev.filter(x=>x!==s) : [...prev,s])

  async function generate() {
    if (!form.topic.trim()) return
    setLoading(true); setOutput(''); setError('')
    try {
      const prompt = [
        'You are an expert teacher. Create a detailed, practical lesson plan.',
        'Topic: '+form.topic,
        form.subject ? 'Subject: '+form.subject : '',
        'Grade level: '+form.grade,
        'Duration: '+form.duration,
        'Include these sections: '+sections.join(', '),
        'Format each section with a clear heading (e.g. ## Learning Objectives), practical instructions, and specific examples.',
        'Make it ready to use in a real classroom. Be specific and actionable.',
      ].filter(Boolean).join('\n')
      const res = await fetch('/api/rpc', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ fn:'generateText', args:[prompt, 800] })
      })
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||'Error '+res.status) }
      const d = await res.json()
      setOutput(d.result || '')
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handleSave() {
    if (!output || !user) return
    setSaving(true)
    try {
      await saveItem(user.id, { type:'lesson', title:'Lesson: '+form.topic, content:output, meta: form })
      setSaveFeedback('Saved to library!')
      setTimeout(()=>setSaveFeedback(''),3000)
    } catch(e) { setSaveFeedback('Save failed') }
    setSaving(false)
  }

  function handleAutoQuiz() {
    router.push('/quiz?q='+encodeURIComponent(form.topic))
  }

  const parsed = output
    ? output.split(/(?=## )/).filter(Boolean)
    : []

  const SECTION_COLORS = {
    'Learning Objectives': '#3b82f6',
    'Warm-Up':             '#a78bfa',
    'Main Instruction':    '#34d399',
    'Guided Practice':     '#f59e0b',
    'Independent':         '#60a5fa',
    'Assessment':          '#f59e0b',
    'Homework':            '#8b949e',
  }
  const getSectionColor = (text) => {
    for (const [key,col] of Object.entries(SECTION_COLORS)) {
      if (text.toLowerCase().includes(key.toLowerCase())) return col
    }
    return '#a78bfa'
  }

  return (
    <div style={{minHeight:'100vh',background:'#0d1117',padding:'32px 20px',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <div style={{maxWidth:680,margin:'0 auto'}}>

        <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(37,99,235,0.08)',border:'1px solid rgba(37,99,235,0.2)',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700,color:'#3b82f6',marginBottom:20,letterSpacing:'0.04em'}}>
          <svg width="10" height="10" viewBox="0 0 14 14" fill="#3b82f6"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
          NOVA · LESSON BUILDER
        </div>

        <div style={{marginBottom:24}}>
          <div style={{fontSize:24,fontWeight:800,color:'#e6edf3',letterSpacing:'-0.02em',marginBottom:6}}>Build a lesson plan</div>
          <div style={{fontSize:14,color:'#8b949e'}}>Nova generates a complete, classroom-ready lesson plan in seconds.</div>
        </div>

        {/* Topic */}
        <div style={{marginBottom:12}}>
          <label style={{fontSize:10,fontWeight:700,color:'#484f58',letterSpacing:'0.08em',display:'block',marginBottom:5}}>TOPIC</label>
          <input value={form.topic} onChange={e=>set('topic',e.target.value)} onKeyDown={e=>e.key==='Enter'&&!loading&&form.topic.trim()&&generate()}
            placeholder="e.g. The American Civil War, Photosynthesis, Quadratic equations..."
            style={{width:'100%',background:'#161b22',border:'1px solid #30363d',borderRadius:10,padding:'12px 14px',fontSize:14,color:'#e6edf3',outline:'none',display:'block'}}/>
        </div>

        {/* Grade + Duration + Subject */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
          <div>
            <label style={{fontSize:10,fontWeight:700,color:'#484f58',letterSpacing:'0.08em',display:'block',marginBottom:5}}>GRADE LEVEL</label>
            <select value={form.grade} onChange={e=>set('grade',e.target.value)}
              style={{width:'100%',background:'#161b22',border:'1px solid #30363d',borderRadius:9,padding:'9px 12px',fontSize:13,color:'#e6edf3',outline:'none'}}>
              {GRADES.map(g=><option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:700,color:'#484f58',letterSpacing:'0.08em',display:'block',marginBottom:5}}>DURATION</label>
            <select value={form.duration} onChange={e=>set('duration',e.target.value)}
              style={{width:'100%',background:'#161b22',border:'1px solid #30363d',borderRadius:9,padding:'9px 12px',fontSize:13,color:'#e6edf3',outline:'none'}}>
              {DURATIONS.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:700,color:'#484f58',letterSpacing:'0.08em',display:'block',marginBottom:5}}>SUBJECT (optional)</label>
            <input value={form.subject} onChange={e=>set('subject',e.target.value)} placeholder="e.g. History, Science..."
              style={{width:'100%',background:'#161b22',border:'1px solid #30363d',borderRadius:9,padding:'9px 12px',fontSize:13,color:'#e6edf3',outline:'none'}}/>
          </div>
        </div>

        {/* Sections */}
        <div style={{marginBottom:16}}>
          <label style={{fontSize:10,fontWeight:700,color:'#484f58',letterSpacing:'0.08em',display:'block',marginBottom:8}}>INCLUDE SECTIONS</label>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {SECTIONS.map(s=>{
              const active = sections.includes(s)
              return (
                <button key={s} type="button" onClick={()=>toggleSection(s)}
                  style={{padding:'5px 11px',borderRadius:7,border:'1px solid '+(active?'rgba(37,99,235,0.3)':'#21262d'),background:active?'rgba(37,99,235,0.12)':'transparent',color:active?'#3b82f6':'#6b7280',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.15s'}}>
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        {/* Generate button */}
        <button onClick={generate} disabled={loading||!form.topic.trim()}
          style={{width:'100%',padding:'13px 0',borderRadius:10,border:'none',background:'linear-gradient(90deg,#2563eb,#7c3aed)',color:'#fff',fontSize:14,fontWeight:700,cursor:loading||!form.topic.trim()?'not-allowed':'pointer',opacity:loading||!form.topic.trim()?0.6:1,letterSpacing:'-0.01em',marginBottom:16}}>
          {loading ? 'Nova is writing your lesson plan...' : 'Generate lesson plan →'}
        </button>

        {/* Status */}
        <div style={{display:'flex',alignItems:'center',gap:8,minHeight:22,marginBottom:12}}>
          {loading&&<div className="nova-dot-pulse" style={{width:7,height:7,borderRadius:'50%',background:'#a78bfa'}}/>}
          {loading&&<span style={{fontSize:12,color:'#8b949e'}}>Nova is structuring your lesson...</span>}
          {!loading&&output&&<><div style={{width:7,height:7,borderRadius:'50%',background:'#34d399'}}/><span style={{fontSize:12,color:'#34d399'}}>Lesson plan ready</span></>}
        </div>

        {/* Error */}
        {error&&<div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:9,padding:'10px 14px',fontSize:13,color:'#f87171',marginBottom:14}}>{error}</div>}

        {/* Output sections */}
        {parsed.length>0
          ? parsed.map((section,i)=>{
              const col = getSectionColor(section)
              return (
                <div key={i} className="nova-card" style={{animationDelay:i*110+'ms',background:'#161b22',border:'1px solid #21262d',borderRadius:12,padding:'18px 20px',marginBottom:10}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <div style={{width:3,height:14,background:col,borderRadius:2,flexShrink:0}}/>
                    <span style={{fontSize:13,fontWeight:700,color:'#e6edf3'}}>{section.split('\n')[0].replace(/^##\s*/,'')}</span>
                  </div>
                  <div style={{fontSize:13,color:'#8b949e',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{section.split('\n').slice(1).join('\n').trim()}</div>
                </div>
              )
            })
          : output
            ? <div className="nova-card" style={{background:'#161b22',border:'1px solid #21262d',borderRadius:12,padding:'18px 20px',marginBottom:10}}>
                <div style={{fontSize:13,color:'#e6edf3',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{output}</div>
              </div>
            : null
        }

        {/* Actions */}
        {output&&!loading&&(
          <div style={{display:'flex',gap:8,marginTop:4}}>
            <button onClick={handleSave} disabled={saving}
              style={{padding:'8px 16px',borderRadius:8,border:'1px solid #30363d',background:'transparent',color:'#8b949e',fontSize:12,cursor:'pointer',opacity:saving?0.6:1}}>
              {saving?'Saving...':saveFeedback||'Save to library'}
            </button>
            <button onClick={handleAutoQuiz}
              style={{padding:'8px 16px',borderRadius:8,border:'1px solid rgba(37,99,235,0.3)',background:'rgba(37,99,235,0.08)',color:'#3b82f6',fontSize:12,fontWeight:600,cursor:'pointer'}}>
              Auto-generate quiz →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
