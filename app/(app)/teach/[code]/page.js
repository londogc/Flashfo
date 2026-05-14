'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts) {
  if (!ts) return 'Never'
  const s = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (s < 60)   return 'Just now'
  if (s < 3600) return Math.floor(s/60) + 'm ago'
  if (s < 86400) return Math.floor(s/3600) + 'h ago'
  return Math.floor(s/86400) + 'd ago'
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

const TABS = ['Overview', 'Students', 'Assignments', 'Activity']

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ClassroomDetailPage() {
  const { code }  = useParams()
  const router    = useRouter()
  const { user, profile } = useAuth()

  const [tab,         setTab]         = useState('Overview')
  const [classroom,   setClassroom]   = useState(null)
  const [students,    setStudents]    = useState([])   // [{ id, full_name, email, avatar_url, enrolled_at, submissions }]
  const [assignments, setAssignments] = useState([])
  const [submissions, setSubmissions] = useState([])  // all submissions for this class
  const [loading,     setLoading]     = useState(true)
  const [copied,      setCopied]      = useState(false)
  const [removing,    setRemoving]    = useState(null) // student id being removed

  useEffect(() => {
    if (user && profile?.role === 'teacher') load()
  }, [user, code])

  async function load() {
    setLoading(true)
    try {
      // Get classroom
      const { data: cls } = await supabase
        .from('classrooms')
        .select('*')
        .eq('code', code)
        .eq('teacher_id', user.id)
        .single()

      if (!cls) { router.push('/teach'); return }
      setClassroom(cls)

      // Get enrolled students with their profiles
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('student_id, created_at, profiles(id, full_name, email, avatar_url)')
        .eq('classroom_id', cls.id)
        .order('created_at', { ascending: true })

      // Get assignments for this class
      const { data: hw } = await supabase
        .from('homework_assignments')
        .select('*')
        .eq('classroom_id', cls.id)
        .order('created_at', { ascending: false })

      setAssignments(hw || [])

      // Get all submissions for this class's assignments
      const hwIds = (hw || []).map(a => a.id)
      let subs = []
      if (hwIds.length) {
        const { data: s } = await supabase
          .from('assignment_submissions')
          .select('*')
          .in('assignment_id', hwIds)
        subs = s || []
      }
      setSubmissions(subs)

      // Build student rows
      const studentRows = (enrollments || []).map(e => {
        const p = e.profiles
        const studentSubs = subs.filter(s => s.student_id === e.student_id)
        const submitted   = studentSubs.filter(s => s.status === 'submitted' || s.status === 'graded').length
        const avgScore    = studentSubs
          .filter(s => s.nova_score != null)
          .reduce((acc, s, _, arr) => acc + s.nova_score / arr.length, 0)
        return {
          id:          e.student_id,
          full_name:   p?.full_name || p?.email?.split('@')[0] || 'Student',
          email:       p?.email || '',
          avatar_url:  p?.avatar_url || null,
          enrolled_at: e.created_at,
          submissions: studentSubs.length,
          submitted,
          avgScore:    studentSubs.filter(s=>s.nova_score!=null).length > 0 ? Math.round(avgScore) : null,
          lastActivity: studentSubs.sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))[0]?.updated_at || null,
        }
      })
      setStudents(studentRows)

    } catch(e) { console.error(e) }
    setLoading(false)
  }

  async function removeStudent(studentId) {
    if (!confirm('Remove this student from the class? They can rejoin with the class code.')) return
    setRemoving(studentId)
    await supabase.from('student_enrollments').delete().eq('student_id', studentId).eq('classroom_id', classroom.id)
    setStudents(s => s.filter(x => x.id !== studentId))
    setRemoving(null)
  }

  function copyCode() {
    navigator.clipboard.writeText(classroom.code)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div style={{ padding:40, textAlign:'center', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ width:7, height:7, borderRadius:'50%', background:'#6366f1', animation:'nova-pulse .9s ease-in-out infinite', margin:'0 auto 12px' }}/>
      <div style={{ fontSize:13, color:'rgba(255,255,255,0.3)' }}>Loading classroom…</div>
    </div>
  )

  if (!classroom) return null

  const completionRate = assignments.length && students.length
    ? Math.round((submissions.filter(s=>s.status==='submitted'||s.status==='graded').length / (assignments.length * students.length)) * 100)
    : 0

  const card = { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:14 }

  return (
    <div style={{ padding:'24px 24px 80px', maxWidth:1000, margin:'0 auto', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Back + header */}
      <div style={{ marginBottom:20 }}>
        <Link href="/teach" style={{ fontSize:12, color:'rgba(255,255,255,0.35)', textDecoration:'none', fontWeight:600, display:'inline-flex', alignItems:'center', gap:5, marginBottom:12 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          All classrooms
        </Link>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:24, fontWeight:800, color:'rgba(255,255,255,0.9)', letterSpacing:'-.03em', margin:'0 0 4px' }}>{classroom.name}</h1>
            {classroom.subject && <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)' }}>{classroom.subject}</div>}
          </div>
          {/* Class code badge */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ padding:'6px 14px', borderRadius:10, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.3)' }}>
              <div style={{ fontSize:9, fontWeight:700, color:'rgba(165,180,252,0.6)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:2 }}>Class code</div>
              <div style={{ fontSize:20, fontWeight:900, color:'#a5b4fc', letterSpacing:'.1em', fontFamily:'monospace' }}>{classroom.code}</div>
            </div>
            <button onClick={copyCode} style={{ height:36, padding:'0 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color: copied?'#34d399':'rgba(255,255,255,0.5)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              {copied ? '✓ Copied' : 'Copy code'}
            </button>
            <Link href="/teach" style={{ height:36, padding:'0 14px', borderRadius:10, border:'none', background:'#6366f1', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', textDecoration:'none', display:'flex', alignItems:'center' }}>
              Go live →
            </Link>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:2, borderBottom:'1px solid rgba(255,255,255,0.07)', marginBottom:24 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ height:38, padding:'0 16px', border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:tab===t?700:400, color:tab===t?'rgba(255,255,255,0.9)':'rgba(255,255,255,0.35)', borderBottom:`2px solid ${tab===t?'#6366f1':'transparent'}`, transition:'all .15s' }}>
            {t}
            {t==='Students'    && <span style={{ marginLeft:6, fontSize:11, color:'rgba(255,255,255,0.3)' }}>{students.length}</span>}
            {t==='Assignments' && <span style={{ marginLeft:6, fontSize:11, color:'rgba(255,255,255,0.3)' }}>{assignments.length}</span>}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'Overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {[
              { label:'Students',       value: students.length,   color:'#60a5fa' },
              { label:'Assignments',    value: assignments.length, color:'#fbbf24' },
              { label:'Completion',     value: completionRate+'%', color:'#34d399' },
              { label:'Avg score',      value: (() => { const scored = students.filter(s=>s.avgScore!=null); return scored.length ? Math.round(scored.reduce((a,s)=>a+s.avgScore,0)/scored.length)+'%' : '—' })(), color:'#a78bfa' },
            ].map(s => (
              <div key={s.label} style={{ ...card, padding:'16px 18px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>{s.label}</div>
                <div style={{ fontSize:26, fontWeight:800, color:s.color, letterSpacing:'-.03em', lineHeight:1 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Recent submissions */}
          <div style={{ ...card, padding:'18px 20px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:14 }}>Recent activity</div>
            {submissions.length === 0 ? (
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.25)', padding:'16px 0', textAlign:'center' }}>No submissions yet</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {submissions
                  .filter(s => s.status === 'submitted' || s.status === 'graded')
                  .sort((a,b) => new Date(b.submitted_at) - new Date(a.submitted_at))
                  .slice(0,8)
                  .map((s,i) => {
                    const hw = assignments.find(a => a.id === s.assignment_id)
                    const st = students.find(x => x.id === s.student_id)
                    return (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:9, background:'rgba(255,255,255,0.03)' }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#a5b4fc', flexShrink:0 }}>
                          {(st?.full_name||'S')[0].toUpperCase()}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <span style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.7)' }}>{st?.full_name||'Student'}</span>
                          <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}> submitted </span>
                          <span style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.6)' }}>{hw?.title||'assignment'}</span>
                        </div>
                        {s.nova_score != null && (
                          <div style={{ fontSize:11, fontWeight:700, color: s.nova_score>=70?'#34d399':s.nova_score>=50?'#fbbf24':'#f87171', flexShrink:0 }}>{s.nova_score}/100</div>
                        )}
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.2)', flexShrink:0 }}>{timeAgo(s.submitted_at)}</div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ ...card, padding:'18px 20px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:14 }}>Quick actions</div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {[
                { label:'Create assignment', href:'/assignments', color:'#6366f1', bg:'rgba(99,102,241,0.1)', border:'rgba(99,102,241,0.3)' },
                { label:'Start live quiz',   href:'/live-quiz',   color:'#f97316', bg:'rgba(249,115,22,0.1)', border:'rgba(249,115,22,0.3)' },
                { label:'Build lesson plan', href:'/lesson-builder', color:'#34d399', bg:'rgba(52,211,153,0.1)', border:'rgba(52,211,153,0.3)' },
                { label:'Curriculum',        href:'/curriculum',  color:'#a78bfa', bg:'rgba(167,139,250,0.1)', border:'rgba(167,139,250,0.3)' },
              ].map(a => (
                <Link key={a.label} href={a.href} style={{ height:34, padding:'0 14px', borderRadius:9, background:a.bg, border:`1px solid ${a.border}`, color:a.color, fontSize:12, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center' }}>{a.label}</Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STUDENTS ── */}
      {tab === 'Students' && (
        <div>
          {students.length === 0 ? (
            <div style={{ ...card, padding:'48px 24px', textAlign:'center' }}>
              <div style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.5)', marginBottom:8 }}>No students enrolled yet</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.25)', marginBottom:16 }}>Share the class code <strong style={{ color:'#a5b4fc', fontFamily:'monospace' }}>{classroom.code}</strong> with your students</div>
              <button onClick={copyCode} style={{ height:34, padding:'0 16px', borderRadius:9, background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.3)', color:'#a5b4fc', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                {copied ? '✓ Copied!' : 'Copy class code'}
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {students.map(s => (
                <div key={s.id} style={{ ...card, padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
                  {/* Avatar */}
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#a5b4fc', flexShrink:0, overflow:'hidden' }}>
                    {s.avatar_url ? <img src={s.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : s.full_name[0].toUpperCase()}
                  </div>

                  {/* Name + email */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.85)' }}>{s.full_name}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>{s.email} · Joined {formatDate(s.enrolled_at)}</div>
                  </div>

                  {/* Assignments submitted */}
                  <div style={{ textAlign:'center', flexShrink:0 }}>
                    <div style={{ fontSize:15, fontWeight:700, color: s.submitted>0?'#34d399':'rgba(255,255,255,0.3)' }}>{s.submitted}<span style={{ fontSize:11, color:'rgba(255,255,255,0.25)', fontWeight:400 }}>/{assignments.length}</span></div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>submitted</div>
                  </div>

                  {/* Avg score */}
                  <div style={{ textAlign:'center', flexShrink:0, minWidth:48 }}>
                    {s.avgScore != null ? (
                      <>
                        <div style={{ fontSize:15, fontWeight:700, color: s.avgScore>=70?'#34d399':s.avgScore>=50?'#fbbf24':'#f87171' }}>{s.avgScore}%</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>avg score</div>
                      </>
                    ) : (
                      <div style={{ fontSize:12, color:'rgba(255,255,255,0.2)' }}>No scores</div>
                    )}
                  </div>

                  {/* Last active */}
                  <div style={{ textAlign:'right', flexShrink:0, minWidth:72 }}>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>{timeAgo(s.lastActivity)}</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.2)' }}>last active</div>
                  </div>

                  {/* Remove */}
                  <button onClick={() => removeStudent(s.id)} disabled={removing===s.id}
                    style={{ width:28, height:28, borderRadius:7, border:'none', background:'transparent', color:'rgba(255,255,255,0.2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.color='#f87171'}
                    onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.2)'}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ASSIGNMENTS ── */}
      {tab === 'Assignments' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
            <Link href="/assignments" style={{ height:34, padding:'0 16px', borderRadius:9, background:'#6366f1', border:'none', color:'#fff', fontSize:12, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Create assignment
            </Link>
          </div>

          {assignments.length === 0 ? (
            <div style={{ ...card, padding:'48px 24px', textAlign:'center' }}>
              <div style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.5)', marginBottom:8 }}>No assignments yet</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.25)' }}>Create an assignment to send to this class</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {assignments.map(a => {
                const classSubs = submissions.filter(s => s.assignment_id === a.id)
                const submitted = classSubs.filter(s => s.status==='submitted'||s.status==='graded').length
                const pct = students.length ? Math.round((submitted/students.length)*100) : 0
                const avgScore = (() => {
                  const scored = classSubs.filter(s => s.nova_score != null)
                  return scored.length ? Math.round(scored.reduce((acc,s)=>acc+s.nova_score,0)/scored.length) : null
                })()
                const overdue = a.due_date && new Date(a.due_date) < new Date()
                return (
                  <div key={a.id} style={{ ...card, padding:'16px 20px' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                          <span style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.85)' }}>{a.title}</span>
                          {a.due_date && (
                            <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20, background: overdue?'rgba(239,68,68,0.1)':'rgba(245,158,11,0.1)', border:`1px solid ${overdue?'rgba(239,68,68,0.25)':'rgba(245,158,11,0.25)'}`, color: overdue?'#f87171':'#fbbf24' }}>
                              {overdue ? 'Overdue' : `Due ${formatDate(a.due_date)}`}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginBottom:12 }}>
                          {a.content?.questions?.length||0} questions · {a.grader==='nova'?'Nova grades':'Teacher grades'}
                          {avgScore!=null && ` · Class avg: ${avgScore}%`}
                        </div>
                        {/* Completion bar */}
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ flex:1, height:5, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:pct+'%', background: pct===100?'#34d399':'#6366f1', borderRadius:3, transition:'width .4s' }}/>
                          </div>
                          <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)', fontWeight:600, flexShrink:0 }}>{submitted}/{students.length} submitted</span>
                        </div>
                      </div>
                      <Link href="/assignments" style={{ height:32, padding:'0 14px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'rgba(255,255,255,0.5)', fontSize:12, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', flexShrink:0 }}>
                        View →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ACTIVITY ── */}
      {tab === 'Activity' && (
        <div style={{ ...card, padding:'18px 20px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:14 }}>All submissions</div>
          {submissions.length === 0 ? (
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.25)', padding:'24px 0', textAlign:'center' }}>No activity yet</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {submissions
                .sort((a,b) => new Date(b.updated_at||b.created_at) - new Date(a.updated_at||a.created_at))
                .map((s,i) => {
                  const hw = assignments.find(a => a.id === s.assignment_id)
                  const st = students.find(x => x.id === s.student_id)
                  const statusColors = { not_started:'rgba(255,255,255,0.2)', in_progress:'#fbbf24', submitted:'#60a5fa', graded:'#34d399' }
                  const statusLabels = { not_started:'Not started', in_progress:'In progress', submitted:'Submitted', graded:'Graded' }
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 12px', borderRadius:9, background:'rgba(255,255,255,0.03)' }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(99,102,241,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#a5b4fc', flexShrink:0 }}>
                        {(st?.full_name||'S')[0].toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.7)' }}>{st?.full_name||'Student'}</span>
                        <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}> · {hw?.title||'assignment'}</span>
                      </div>
                      <div style={{ fontSize:11, fontWeight:700, color: statusColors[s.status]||'rgba(255,255,255,0.3)', flexShrink:0 }}>
                        {statusLabels[s.status]||s.status}
                      </div>
                      {s.nova_score != null && (
                        <div style={{ fontSize:11, fontWeight:700, color: s.nova_score>=70?'#34d399':s.nova_score>=50?'#fbbf24':'#f87171', flexShrink:0 }}>
                          {s.nova_score}/100
                        </div>
                      )}
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.2)', flexShrink:0 }}>
                        {timeAgo(s.updated_at||s.created_at)}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
