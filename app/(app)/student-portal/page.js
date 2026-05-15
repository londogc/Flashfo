'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function StudentPortalPage() {
  const { user } = useAuth()
  const [mounted,     setMounted]     = useState(false)
  const [classroom,   setClassroom]   = useState(null)
  const [assignments, setAssignments] = useState([])
  const [scores,      setScores]      = useState([])
  const [classmates,  setClassmates]  = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [joinCode,    setJoinCode]    = useState('')
  const [joining,     setJoining]     = useState(false)
  const [joinError,   setJoinError]   = useState('')

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    if (user) loadData()
    else setLoading(false)
  }, [user, mounted])

  const loadData = async () => {
    setLoading(true)
    const [enrollmentRes, scoresRes] = await Promise.all([
      supabase.from('student_enrollments').select('*, classroom:classrooms(*)').eq('student_id', user.id).order('joined_at', { ascending: false }).limit(1).single(),
      supabase.from('saved_items').select('title, metadata, created_at').eq('user_id', user.id).eq('type', 'quiz_result').order('created_at', { ascending: false }).limit(5),
    ])
    setScores(scoresRes.data || [])
    const enrollment = enrollmentRes.data
    if (enrollment?.classroom) {
      setClassroom(enrollment.classroom)
      const [hwRes, countRes] = await Promise.all([
        supabase.from('homework_assignments').select('*').eq('classroom_id', enrollment.classroom.id).order('due_date'),
        supabase.from('student_enrollments').select('id', { count: 'exact', head: true }).eq('classroom_id', enrollment.classroom.id),
      ])
      setAssignments(hwRes.data || [])
      setClassmates(countRes.count || 0)
    }
    setLoading(false)
  }

  const joinClass = async () => {
    if (!joinCode.trim()) return
    setJoining(true); setJoinError('')
    const { data: cls } = await supabase.from('classrooms').select('*').eq('code', joinCode.trim().toUpperCase()).single()
    if (!cls) { setJoinError('Class not found — check the code and try again'); setJoining(false); return }
    const { error } = await supabase.from('student_enrollments').insert({ student_id: user.id, classroom_id: cls.id })
    if (error && error.code !== '23505') { setJoinError('Could not join — try again'); setJoining(false); return }
    setJoinCode(''); await loadData(); setJoining(false)
  }

  const dueToday = assignments.filter(a => { if (!a.due_date) return false; const d=new Date(a.due_date); return d.toDateString()===new Date().toDateString() })
  const upcoming = assignments.filter(a => !a.due_date || new Date(a.due_date) > new Date())
  const avgScore = scores.length ? Math.round(scores.reduce((acc,s)=>acc+(s.metadata?.score||0),0)/scores.length) : null

  if (!mounted || loading) return (
    <div style={{ maxWidth:700, margin:'0 auto', padding:'40px 16px' }}>
      {[1,2,3].map(i => <div key={i} style={{ height:80, borderRadius:12, background:'rgba(255,255,255,0.05)', marginBottom:12, animation:'shimmer 1.6s infinite linear' }}/>)}
    </div>
  )

  if (!user) return (
    <div style={{ maxWidth:700, margin:'0 auto', padding:'80px 16px', textAlign:'center', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ width:56, height:56, borderRadius:14, background:'rgba(37,99,235,0.1)', border:'1px solid rgba(37,99,235,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
      </div>
      <h2 style={{ fontSize:20, fontWeight:700, color:'rgba(255,255,255,0.88)', marginBottom:8 }}>Student Portal</h2>
      <p style={{ fontSize:14, color:'rgba(255,255,255,0.45)', marginBottom:24 }}>Sign in to join a class, view assignments, and track your progress.</p>
      <a href="/auth" style={{ display:'inline-block', padding:'10px 24px', background:'#2563eb', color:'#fff', borderRadius:9, fontWeight:600, fontSize:14, textDecoration:'none' }}>Sign in →</a>
    </div>
  )

  return (
    <div style={{ maxWidth:700, margin:'0 auto', padding:'0 16px 48px', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <h1 style={{ fontSize:22, fontWeight:700, color:'rgba(255,255,255,0.88)', margin:'0 0 4px' }}>Student Portal</h1>
      <p style={{ color:'rgba(255,255,255,0.45)', fontSize:14, marginBottom:24 }}>Your classes, assignments, and progress in one place.</p>

      {!classroom && (
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:24, marginBottom:20 }}>
          <h2 style={{ fontSize:16, fontWeight:600, color:'rgba(255,255,255,0.88)', marginBottom:4 }}>Join a class</h2>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', marginBottom:16 }}>Enter the code your teacher gave you.</p>
          <div style={{ display:'flex', gap:8 }}>
            <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="e.g. BIO3X7" maxLength={10} onKeyDown={e=>e.key==='Enter'&&joinClass()}
              style={{ flex:1, padding:'10px 14px', borderRadius:9, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(0,0,0,0.3)', color:'rgba(255,255,255,0.88)', fontSize:14, letterSpacing:'0.1em', fontFamily:'monospace', outline:'none' }}/>
            <button onClick={joinClass} disabled={joining||!joinCode.trim()}
              style={{ padding:'10px 20px', borderRadius:9, background:'#2563eb', color:'#fff', border:'none', fontWeight:600, fontSize:14, cursor:'pointer', opacity:joining?0.6:1 }}>
              {joining ? 'Joining…' : 'Join'}
            </button>
          </div>
          {joinError && <p style={{ fontSize:12, color:'#ef4444', marginTop:8 }}>{joinError}</p>}
        </div>
      )}

      {classroom && (
        <>
          <div style={{ background:'linear-gradient(135deg,rgba(37,99,235,0.12),rgba(37,99,235,0.04))', border:'1px solid rgba(37,99,235,0.2)', borderRadius:12, padding:20, marginBottom:20, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
            <div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', letterSpacing:'0.07em', marginBottom:4 }}>CLASS</div>
              <div style={{ fontSize:16, fontWeight:700, color:'rgba(255,255,255,0.88)' }}>{classroom.name}</div>
              {classroom.subject && <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginTop:2 }}>{classroom.subject}</div>}
            </div>
            <div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', letterSpacing:'0.07em', marginBottom:4 }}>CLASSMATES</div>
              <div style={{ fontSize:22, fontWeight:700, color:'#3b82f6' }}>{classmates}</div>
            </div>
            <div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', letterSpacing:'0.07em', marginBottom:4 }}>AVG SCORE</div>
              <div style={{ fontSize:22, fontWeight:700, color:avgScore>=80?'#34d399':avgScore>=60?'#f59e0b':'#ef4444' }}>
                {avgScore !== null ? avgScore+'%' : '—'}
              </div>
            </div>
          </div>

          {dueToday.length > 0 && (
            <div style={{ background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:12, padding:16, marginBottom:16 }}>
              <div style={{ fontSize:11, color:'#f59e0b', fontWeight:600, letterSpacing:'0.07em', marginBottom:10 }}>DUE TODAY</div>
              {dueToday.map(a => (
                <div key={a.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:13, color:'rgba(255,255,255,0.88)' }}>{a.title}</span>
                  <Link href="/assignments" style={{ padding:'4px 10px', borderRadius:6, background:'#f59e0b', color:'#0d1117', fontSize:11, fontWeight:600, textDecoration:'none' }}>Start →</Link>
                </div>
              ))}
            </div>
          )}

          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:20, marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.88)', marginBottom:14 }}>Assignments</div>
            {upcoming.length === 0 && <p style={{ fontSize:13, color:'rgba(255,255,255,0.3)', textAlign:'center', padding:16, margin:0 }}>No assignments yet</p>}
            {upcoming.map(a => (
              <div key={a.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'rgba(37,99,235,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.88)' }}>{a.title}</div>
                  {a.due_date && <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:2 }}>Due {new Date(a.due_date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>}
                </div>
                <Link href="/assignments" style={{ padding:'5px 12px', borderRadius:7, background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.55)', fontSize:12, textDecoration:'none', border:'1px solid rgba(255,255,255,0.1)' }}>Open</Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
