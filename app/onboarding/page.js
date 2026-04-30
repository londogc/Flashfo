'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

const GRADES = ['6th grade','7th grade','8th grade','9th grade','10th grade','11th grade','12th grade','College freshman','College sophomore','College junior','College senior','Graduate student','Teacher','Other']
const SUBJECTS = ['Math','Science','English / ELA','History','Biology','Chemistry','Physics','Computer Science','Foreign Language','Other']

export default function OnboardingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [role, setRole] = useState('')
  const [grade, setGrade] = useState('')
  const [subjects, setSubjects] = useState([])
  const [saving, setSaving] = useState(false)

  const steps = [
    { title: "Welcome to Flashfo", sub: "Let's set you up in 3 quick steps." },
    { title: "What's your role?", sub: "This helps Nova personalize everything for you." },
    { title: "What grade are you in?", sub: "Nova calibrates difficulty to your level." },
    { title: "What subjects do you study?", sub: "Pick as many as you like — you can always change these." },
  ]

  const finish = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').upsert({ id: user.id, role, grade_level: grade, subjects, onboarded: true })
    if (subjects.length) {
      await supabase.from('nova_user_classes').insert(subjects.map(s => ({ user_id: user.id, name: s, subject: s }))).select()
    }
    router.replace('/dashboard')
  }

  const toggleSubject = (s) => setSubjects(prev => prev.includes(s) ? prev.filter(x=>x!==s) : [...prev, s])

  return (
    <div style={{ minHeight:'100vh', background:'#0d1117', display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ width:'100%', maxWidth:480 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
            <div style={{ width:36, height:36, background:'#2563eb', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <span style={{ fontSize:20, fontWeight:700, color:'#e6edf3', letterSpacing:'-0.03em' }}>Flashfo</span>
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom:28 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width: i===step ? 20 : 6, height:6, borderRadius:3, background: i<=step ? '#a78bfa' : '#21262d', transition:'all 0.3s' }}/>
          ))}
        </div>

        {/* Card */}
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:16, padding:32 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#e6edf3', marginBottom:6, letterSpacing:'-0.02em' }}>{steps[step].title}</h1>
          <p style={{ fontSize:14, color:'#8b949e', marginBottom:28 }}>{steps[step].sub}</p>

          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ padding:'16px', background:'rgba(167,139,250,0.06)', border:'1px solid rgba(167,139,250,0.15)', borderRadius:10 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#a78bfa', marginBottom:4 }}>✦ Nova is your AI study partner</div>
                <div style={{ fontSize:13, color:'#8b949e', lineHeight:1.6 }}>She builds flashcards, quizzes, and study guides — tailored to exactly what you're studying.</div>
              </div>
              <div style={{ padding:'16px', background:'rgba(52,211,153,0.05)', border:'1px solid rgba(52,211,153,0.15)', borderRadius:10 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#34d399', marginBottom:4 }}>Spaced repetition built in</div>
                <div style={{ fontSize:13, color:'#8b949e', lineHeight:1.6 }}>Cards you miss come back sooner. Cards you know get spaced out. Science-backed studying.</div>
              </div>
              <div style={{ padding:'16px', background:'rgba(37,99,235,0.05)', border:'1px solid rgba(37,99,235,0.15)', borderRadius:10 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#3b82f6', marginBottom:4 }}>Live quizzes for classrooms</div>
                <div style={{ fontSize:13, color:'#8b949e', lineHeight:1.6 }}>Teachers run live sessions. Students see questions on their phone. Results appear in real time.</div>
              </div>
            </div>
          )}

          {/* Step 1 — Role */}
          {step === 1 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { id:'Student', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> },
                { id:'Teacher', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8h10M7 12h6"/></svg> },
                { id:'Parent',  icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
                { id:'Self-learner', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg> },
              ].map(r => (
                <button key={r.id} onClick={() => setRole(r.id)}
                  style={{ padding:'16px 12px', borderRadius:10, border:'1px solid', cursor:'pointer', textAlign:'center',
                    borderColor: role===r.id ? '#a78bfa' : '#30363d',
                    background: role===r.id ? 'rgba(167,139,250,0.08)' : '#0d1117',
                    color: role===r.id ? '#a78bfa' : '#8b949e', fontSize:14, fontWeight:500,
                    display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                  {r.icon}{r.id}
                </button>
              ))}
            </div>
          )}

          {/* Step 2 — Grade */}
          {step === 2 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {GRADES.map(g => (
                <button key={g} onClick={() => setGrade(g)}
                  style={{ padding:'7px 14px', borderRadius:20, border:'1px solid', cursor:'pointer', fontSize:13,
                    borderColor: grade===g ? '#a78bfa' : '#30363d',
                    background: grade===g ? 'rgba(167,139,250,0.1)' : '#0d1117',
                    color: grade===g ? '#a78bfa' : '#8b949e' }}>
                  {g}
                </button>
              ))}
            </div>
          )}

          {/* Step 3 — Subjects */}
          {step === 3 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {SUBJECTS.map(s => (
                <button key={s} onClick={() => toggleSubject(s)}
                  style={{ padding:'7px 14px', borderRadius:20, border:'1px solid', cursor:'pointer', fontSize:13,
                    borderColor: subjects.includes(s) ? '#34d399' : '#30363d',
                    background: subjects.includes(s) ? 'rgba(52,211,153,0.08)' : '#0d1117',
                    color: subjects.includes(s) ? '#34d399' : '#8b949e' }}>
                  {subjects.includes(s) ? '✓ ' : ''}{s}
                </button>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display:'flex', gap:10, marginTop:28 }}>
            {step > 0 && (
              <button onClick={() => setStep(s=>s-1)}
                style={{ padding:'10px 20px', borderRadius:9, border:'1px solid #30363d', background:'none', color:'#8b949e', fontSize:14, cursor:'pointer' }}>
                Back
              </button>
            )}
            <button
              onClick={() => step < 3 ? setStep(s=>s+1) : finish()}
              disabled={saving || (step===1 && !role)}
              style={{ flex:1, padding:'11px', borderRadius:9, border:'none', background:'#7c3aed', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', opacity: saving||(step===1&&!role) ? 0.5 : 1 }}>
              {saving ? 'Setting up...' : step === 3 ? 'Get started →' : step === 0 ? "Let's go →" : 'Continue →'}
            </button>
          </div>
          {step > 0 && step < 3 && (
            <button onClick={() => step < 3 ? setStep(s=>s+1) : finish()}
              style={{ display:'block', width:'100%', marginTop:10, background:'none', border:'none', color:'#484f58', fontSize:12, cursor:'pointer' }}>
              Skip this step
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
