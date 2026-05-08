'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { saveItem } from '@/lib/savedItems'
import { saveDraft, loadDraft, clearDraft } from '@/lib/saveDraft'

const LESSON_TYPES = ['Lecture', 'Discussion', 'Lab / Hands-on', 'Review', 'Assessment']
const GRADE_LEVELS = ['Elementary (K-2)', 'Elementary (3-5)', 'Middle School (6-8)', 'High School (9-12)', 'AP / College-level']
const DURATIONS = ['30 minutes', '45 minutes', '60 minutes', '90 minutes']

export default function LessonBuilder() {
  const { user } = useAuth()
  const [form, setForm] = useState({ topic:'', subject:'', grade:'High School (9-12)', type:'Lecture', duration:'45 minutes', objectives:'' })
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [draftBanner, setDraftBanner] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState('')

  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  useEffect(() => {
    const saved = sessionStorage.getItem('flashfo_load_lesson_plan')
    if (saved) {
      try {
        const { form: savedForm, plan: savedPlan } = JSON.parse(saved)
        sessionStorage.removeItem('flashfo_load_lesson_plan')
        if (savedPlan) { if (savedForm) setForm(savedForm); setPlan(savedPlan); return }
      } catch(e) {}
    }
  }, [])
      if (draft?.data?.plan) {
        setForm(draft.data.form || form)
        setPlan(draft.data.plan)
        setDraftBanner(true)
      }
    })
  }, [])

  async function generate() {
    if (!form.topic.trim()) { setError('Please enter a topic.'); return }
    setLoading(true); setError(''); setPlan(null); setDraftBanner(false)
    try {
      const res = await fetch('/api/nova-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: 'You are Nova, an expert curriculum designer for Flashfo. Generate detailed, practical US lesson plans. CRITICAL: Write in plain text only — no markdown whatsoever. No #, ##, ###, **, *, -, or backticks. Use plain numbered sections like "1. Learning Objectives" and write in normal prose sentences as a professional teacher would.',
          messages: [{ role: 'user', content: `Create a detailed ${form.duration} ${form.type.toLowerCase()} lesson plan for ${form.grade} students on the topic: "${form.topic}" (Subject: ${form.subject || 'General'}). ${form.objectives ? 'Learning objectives: ' + form.objectives : ''} Include: 1. Learning Objectives (3-4 specific, measurable goals) 2. Materials Needed 3. Warm-Up / Hook (5 min) 4. Main Instruction (step-by-step with timing) 5. Student Activity 6. Assessment / Exit Ticket 7. Differentiation (support for struggling students + extension for advanced) 8. Homework (optional) Make it practical and immediately usable in a real classroom.` }]
        })
      })
      if (!res.ok) { setLoading(false); setError('Failed to generate. Please try again.'); return }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      setPlan('')
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setPlan(full.replace(/^#{1,6}\s*/gm,'').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/\*([^*]+)\*/g,'$1').replace(/^\*\s+/gm,'• ').replace(/^-\s+/gm,'• ').trim())
      }
      if (!full) { setPlan('Could not generate. Please try again.'); return }
      const cleaned = full.replace(/^#{1,6}\s*/gm,'').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/\*([^*]+)\*/g,'$1').replace(/^\*\s+/gm,'• ').replace(/^-\s+/gm,'• ').trim()
      if (user) await saveDraft('lesson-builder', form.topic, { form, plan: cleaned })
    } finally { setLoading(false) }
  }

  async function doSave() {
    if (!user || !plan) return
    setSaving(true)
    try {
      await saveItem(user.id, 'lesson_plan', form.topic, { form, plan })
      setSaveFeedback('Saved!')
      await clearDraft('lesson-builder')
      setTimeout(() => setSaveFeedback(''), 3000)
    } catch { setSaveFeedback('Save failed') }
    finally { setSaving(false) }
  }

  function startFresh() {
    setForm({ topic:'', subject:'', grade:'High School (9-12)', type:'Lecture', duration:'45 minutes', objectives:'' })
    setPlan(null); setDraftBanner(false)
    clearDraft('lesson-builder')
  }

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'40px 24px' }}>

      {draftBanner && (
        <div style={{background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.22)',borderRadius:10,padding:'10px 14px',marginBottom:20,display:'flex',alignItems:'center',gap:10}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
          <span style={{fontSize:12,color:'rgba(241,240,255,0.7)',flex:1}}>Resuming your last lesson plan — <strong style={{color:'rgba(241,240,255,0.9)'}}>{form.topic}</strong></span>
          <button onClick={startFresh} style={{fontSize:11,color:'rgba(241,240,255,0.4)',background:'none',border:'none',cursor:'pointer'}}>Start fresh</button>
        </div>
      )}

      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:32, fontWeight:800, letterSpacing:'-.03em', color:'var(--c-t1)', marginBottom:8 }}>Lesson Plan Builder</h1>
        <p style={{ fontSize:15, color:'var(--c-t2)' }}>Describe your lesson and Nova builds a complete, classroom-ready plan in seconds.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div>
          <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--c-t2)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.04em' }}>Topic *</label>
          <input value={form.topic} onChange={e=>set('topic',e.target.value)} placeholder="e.g. The Civil War, Photosynthesis, Quadratic Equations"
            style={{ width:'100%', padding:'11px 14px', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:10, fontSize:14, color:'var(--c-t1)', outline:'none' }}/>
        </div>
        <div>
          <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--c-t2)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.04em' }}>Subject</label>
          <input value={form.subject} onChange={e=>set('subject',e.target.value)} placeholder="e.g. AP US History, Biology, Algebra II"
            style={{ width:'100%', padding:'11px 14px', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:10, fontSize:14, color:'var(--c-t1)', outline:'none' }}/>
        </div>
        <div>
          <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--c-t2)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.04em' }}>Grade Level</label>
          <select value={form.grade} onChange={e=>set('grade',e.target.value)}
            style={{ width:'100%', padding:'11px 14px', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:10, fontSize:14, color:'var(--c-t1)', outline:'none' }}>
            {GRADE_LEVELS.map(g=><option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--c-t2)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.04em' }}>Lesson Type</label>
          <select value={form.type} onChange={e=>set('type',e.target.value)}
            style={{ width:'100%', padding:'11px 14px', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:10, fontSize:14, color:'var(--c-t1)', outline:'none' }}>
            {LESSON_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--c-t2)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.04em' }}>Duration</label>
          <select value={form.duration} onChange={e=>set('duration',e.target.value)}
            style={{ width:'100%', padding:'11px 14px', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:10, fontSize:14, color:'var(--c-t1)', outline:'none' }}>
            {DURATIONS.map(d=><option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--c-t2)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.04em' }}>Learning Objectives (optional)</label>
          <input value={form.objectives} onChange={e=>set('objectives',e.target.value)} placeholder="e.g. Students will be able to..."
            style={{ width:'100%', padding:'11px 14px', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:10, fontSize:14, color:'var(--c-t1)', outline:'none' }}/>
        </div>
      </div>

      {error && <div style={{ color:'#f87171', fontSize:13, marginBottom:12 }}>{error}</div>}

      <button onClick={generate} disabled={loading||!form.topic.trim()}
        style={{ width:'100%', padding:'14px', background:loading?'var(--c-surface)':'linear-gradient(90deg,#2563eb,#7c3aed)', color:loading?'var(--c-t3)':'#fff', border:'1px solid var(--c-line)', borderRadius:12, fontSize:15, fontWeight:700, cursor:loading?'default':'pointer', marginBottom:32, opacity:(loading||!form.topic.trim())?0.6:1 }}>
        {loading ? 'Nova is building your lesson plan...' : 'Generate Lesson Plan'}
      </button>

      {plan !== null && (
        <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:16, padding:'28px 32px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
            <div style={{ fontSize:17, fontWeight:700, color:'var(--c-t1)' }}>Your Lesson Plan</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
              <button onClick={()=>navigator.clipboard?.writeText(plan)} style={{ padding:'7px 16px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:8, fontSize:12, fontWeight:600, color:'var(--c-t2)', cursor:'pointer' }}>Copy</button>
              {user && <button onClick={doSave} disabled={saving} style={{ padding:'7px 16px', background:'rgba(16,185,129,0.07)', border:'1px solid rgba(52,211,153,0.25)', borderRadius:8, fontSize:12, fontWeight:600, color:'#34d399', cursor:'pointer' }}>{saving?'Saving...':'Save to My Stuff'}</button>}
              {saveFeedback && <span style={{ fontSize:12, color:'#34d399', fontWeight:500 }}>{saveFeedback}</span>}
              <button onClick={startFresh} style={{ padding:'7px 16px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:8, fontSize:12, fontWeight:600, color:'var(--c-t2)', cursor:'pointer' }}>New Plan</button>
            </div>
          </div>
          <div style={{ fontSize:14, color:'var(--c-t1)', lineHeight:1.75, whiteSpace:'pre-wrap', fontFamily:'inherit' }}>{plan}</div>
        </div>
      )}
    </div>
  )
}
