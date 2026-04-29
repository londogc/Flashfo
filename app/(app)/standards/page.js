'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STANDARDS = {
  'Math': {
    'K-2': ['Counting & Cardinality','Operations & Algebraic Thinking','Number & Operations in Base Ten','Measurement & Data','Geometry'],
    '3-5': ['Operations & Algebraic Thinking','Number & Operations in Base Ten','Number & Operations - Fractions','Measurement & Data','Geometry'],
    '6-8': ['Ratios & Proportional Relationships','The Number System','Expressions & Equations','Functions','Statistics & Probability','Geometry'],
    '9-12': ['Number & Quantity','Algebra','Functions','Modeling','Geometry','Statistics & Probability']
  },
  'Science': {
    'K-2': ['Physical Science: Matter & Energy','Life Science: Organisms','Earth Science: Weather & Climate'],
    '3-5': ['Physical Science: Motion & Forces','Life Science: Ecosystems','Earth Science: Earth Systems'],
    '6-8': ['Physical Science: Energy Transfer','Life Science: Heredity & Evolution','Earth Science: Space Systems'],
    '9-12': ['Physics: Forces & Motion','Chemistry: Atomic Structure','Biology: Cell Biology & Genetics','Environmental Science']
  },
  'ELA': {
    'K-2': ['Reading: Literature Foundations','Reading: Informational Text','Writing Fundamentals','Language & Vocabulary'],
    '3-5': ['Reading: Literature Analysis','Reading: Informational Text','Writing: Opinion & Narrative','Language Conventions'],
    '6-8': ['Reading: Literary Analysis','Argument Writing','Research & Evidence','Language & Vocabulary'],
    '9-12': ['Literary Criticism','Argumentative Writing','Research Writing','Language & Rhetorical Analysis']
  },
  'History': {
    'K-5': ['American History: Foundations','World Cultures','Geography & Map Skills','Civic Participation'],
    '6-8': ['World History: Ancient Civilizations','US History: Colonial - Civil War','Government & Civics','Economics Basics'],
    '9-12': ['US History: Reconstruction - Present','World History: Modern Era','AP Government','AP Economics']
  },
}

const TOOLS = ['Flashcards','Quiz','Study Guide']

export default function StandardsPage() {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [standard, setStandard] = useState('')
  const [tool, setTool] = useState('Flashcards')
  const [generating, setGenerating] = useState(false)

  const gradeOptions = subject ? Object.keys(STANDARDS[subject] || {}) : []
  const standardOptions = subject && grade ? (STANDARDS[subject]?.[grade] || []) : []

  const generate = () => {
    if (!standard) return
    const prompt = standard + ' (' + subject + ', Grade ' + grade + ')'
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ff-create-content', JSON.stringify({ inputMode:'topic', content:prompt, topic:prompt }))
    }
    const routes = { Flashcards:'/flashcards', Quiz:'/quiz', 'Study Guide':'/study-guide' }
    router.push(routes[tool] || '/flashcards')
  }

  return (
    <div style={{ maxWidth:620, margin:'0 auto', padding:'0 16px 40px' }}>
      <h1 style={{ fontSize:22, fontWeight:700, color:'var(--c-t1)', margin:'0 0 4px' }}>Curriculum Standards</h1>
      <p style={{ color:'var(--c-t2)', fontSize:14, marginBottom:28 }}>Pick a grade, subject, and standard — Nova builds a study kit aligned to it.</p>

      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        {/* Subject */}
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--c-t3)', letterSpacing:'0.06em', display:'block', marginBottom:8 }}>SUBJECT</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            {Object.keys(STANDARDS).map(s=>(
              <button key={s} onClick={()=>{ setSubject(s); setGrade(''); setStandard('') }}
                style={{ padding:'10px 8px', borderRadius:9, border:'1px solid', cursor:'pointer', transition:'all 0.15s', textAlign:'center',
                  borderColor: subject===s ? '#2563eb' : 'var(--c-line)',
                  background: subject===s ? 'rgba(37,99,235,0.08)' : 'var(--c-surface)',
                  color: subject===s ? '#2563eb' : 'var(--c-t2)', fontSize:13, fontWeight:500 }}>
                {s === 'Math' ? '📐' : s === 'Science' ? '🔬' : s === 'ELA' ? '📚' : '🌍'} {s}
              </button>
            ))}
          </div>
        </div>

        {/* Grade band */}
        {gradeOptions.length > 0 && (
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--c-t3)', letterSpacing:'0.06em', display:'block', marginBottom:8 }}>GRADE BAND</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {gradeOptions.map(g=>(
                <button key={g} onClick={()=>{ setGrade(g); setStandard('') }}
                  style={{ padding:'7px 14px', borderRadius:20, border:'1px solid', cursor:'pointer', transition:'all 0.15s', fontSize:13, fontWeight:500,
                    borderColor: grade===g ? '#a78bfa' : 'var(--c-line)',
                    background: grade===g ? 'rgba(167,139,250,0.1)' : 'var(--c-surface)',
                    color: grade===g ? '#a78bfa' : 'var(--c-t2)' }}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Standard */}
        {standardOptions.length > 0 && (
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--c-t3)', letterSpacing:'0.06em', display:'block', marginBottom:8 }}>STANDARD / TOPIC</label>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {standardOptions.map(s=>(
                <button key={s} onClick={()=>setStandard(s)}
                  style={{ padding:'11px 16px', borderRadius:9, border:'1px solid', cursor:'pointer', textAlign:'left', transition:'all 0.15s', fontSize:13,
                    borderColor: standard===s ? '#34d399' : 'var(--c-line)',
                    background: standard===s ? 'rgba(52,211,153,0.07)' : 'var(--c-surface)',
                    color: standard===s ? '#34d399' : 'var(--c-t1)' }}>
                  {standard===s && '✓ '}{s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tool + generate */}
        {standard && (
          <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:12, padding:20 }}>
            <p style={{ margin:'0 0 12px', fontSize:13, color:'var(--c-t2)' }}>Generate <strong style={{ color:'var(--c-t1)' }}>{standard}</strong> as a:</p>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              {TOOLS.map(t=>(
                <button key={t} onClick={()=>setTool(t)}
                  style={{ padding:'7px 14px', borderRadius:8, border:'1px solid', cursor:'pointer', fontSize:13, fontWeight:500, transition:'all 0.15s',
                    borderColor: tool===t ? '#2563eb' : 'var(--c-line)',
                    background: tool===t ? '#2563eb' : 'var(--c-surface2)',
                    color: tool===t ? '#fff' : 'var(--c-t2)' }}>
                  {t}
                </button>
              ))}
            </div>
            <button onClick={generate}
              style={{ padding:'10px 24px', borderRadius:9, background:'#2563eb', color:'#fff', border:'none', fontWeight:700, fontSize:14, cursor:'pointer' }}>
              ✦ Build with Nova
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
