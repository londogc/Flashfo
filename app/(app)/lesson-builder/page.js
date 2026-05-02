'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/useAuth'

const LESSON_TYPES = ['Lecture', 'Discussion', 'Lab / Hands-on', 'Review', 'Assessment']
const GRADE_LEVELS = ['Middle School (6-8)', 'High School (9-12)', 'AP / College-level']
const DURATIONS = ['30 minutes', '45 minutes', '60 minutes', '90 minutes']

export default function LessonBuilder() {
  const { user } = useAuth()
  const [form, setForm] = useState({ topic:'', subject:'', grade:'High School (9-12)', type:'Lecture', duration:'45 minutes', objectives:'' })
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  async function generate() {
    if (!form.topic.trim()) { setError('Please enter a topic.'); return }
    setLoading(true); setError(''); setPlan(null)

    const res = await fetch('/api/nova-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: 'You are Nova, an expert curriculum designer for Flashfo. Generate detailed, practical lesson plans for US educators. Format with clear sections.',
        messages: [{
          role: 'user',
          content: `Create a detailed ${form.duration} ${form.type.toLowerCase()} lesson plan for ${form.grade} students on the topic: "${form.topic}" (Subject: ${form.subject || 'General'}).
${form.objectives ? 'Learning objectives: ' + form.objectives : ''}

Include:
1. Learning Objectives (3-4 specific, measurable goals)
2. Materials Needed
3. Warm-Up / Hook (5 min)
4. Main Instruction (step-by-step with timing)
5. Student Activity
6. Assessment / Exit Ticket
7. Differentiation (support for struggling students + extension for advanced)
8. Homework (optional)

Make it practical and immediately usable in a real classroom.`
        }]
      })
    })

    if (!res.ok) { setLoading(false); setError('Failed to generate. Please try again.'); return }
    
    // Handle streaming response
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''
    setPlan('')
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      // Parse SSE chunks
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.content) { full += data.content; setPlan(full) }
          } catch {}
        }
      }
    }
    if (!full) setPlan('Lesson plan generated. Please try again if the content appears empty.')
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--c-t1)', marginBottom: 8 }}>Lesson Plan Builder</h1>
        <p style={{ fontSize: 15, color: 'var(--c-t2)' }}>Describe your lesson and Nova builds a complete, classroom-ready plan in seconds.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
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

      <button onClick={generate} disabled={loading}
        style={{ width:'100%', padding:'14px', background:loading?'var(--c-surface)':'linear-gradient(90deg,#2563eb,#7c3aed)', color:loading?'var(--c-t3)':'#fff', border:'1px solid var(--c-line)', borderRadius:12, fontSize:15, fontWeight:700, cursor:loading?'default':'pointer', marginBottom:32 }}>
        {loading ? 'Nova is building your lesson plan...' : 'Generate Lesson Plan'}
      </button>

      {plan !== null && (
        <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:16, padding:'28px 32px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div style={{ fontSize:17, fontWeight:700, color:'var(--c-t1)' }}>Your Lesson Plan</div>
            <button onClick={()=>navigator.clipboard?.writeText(plan)}
              style={{ padding:'7px 16px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:8, fontSize:12, fontWeight:600, color:'var(--c-t2)', cursor:'pointer' }}>
              Copy
            </button>
          </div>
          <div style={{ fontSize:14, color:'var(--c-t1)', lineHeight:1.75, whiteSpace:'pre-wrap', fontFamily:'inherit' }}>{plan}</div>
        </div>
      )}
    </div>
  )
}