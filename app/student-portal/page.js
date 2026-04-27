'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

export default function StudentPortalPage() {
  const { user, loading: authLoading } = useAuth()
  const [classrooms, setClassrooms] = useState([])
  const [homework, setHomework] = useState([])
  const [submissions, setSubmissions] = useState([]) // what student already submitted
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeClass, setActiveClass] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [joinName, setJoinName] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)
  const [tab, setTab] = useState('classes') // classes | homework | messages

  useEffect(() => { if (!authLoading && user) init() }, [authLoading, user])

  async function init() {
    setLoading(true)
    try {
      // Load enrolled classrooms
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('*, classroom:classrooms(*)')
        .eq('student_id', user.id)
        .order('joined_at', { ascending: false })

      const cls = (enrollments || []).map(e => e.classroom).filter(Boolean)
      setClassrooms(cls)

      if (cls.length > 0) {
        setActiveClass(cls[0])
        const classIds = cls.map(c => c.id)

        // Load open homework for enrolled classes
        const { data: hw } = await supabase
          .from('homework_assignments')
          .select('*, classroom:classrooms(name)')
          .in('classroom_id', classIds)
          .eq('status', 'open')
          .lte('opens_at', new Date().toISOString())
          .order('due_date', { ascending: true })
        setHomework(hw || [])

        // Load what this student has already submitted
        if (hw?.length) {
          const { data: subs } = await supabase
            .from('homework_submissions')
            .select('assignment_id')
            .in('assignment_id', hw.map(h => h.id))
            .eq('student_name', user.user_metadata?.full_name || user.email)
          setSubmissions((subs || []).map(s => s.assignment_id))
        }

        // Load class messages (announcements from teacher)
        const { data: threads } = await supabase
          .from('message_threads')
          .select('*, messages(*)')
          .in('classroom_id', classIds)
          .eq('type', 'announcement')
          .order('created_at', { ascending: false })
          .limit(20)
        setMessages(threads || [])
      }
    } catch(e) {}
    setLoading(false)
  }

  async function joinClass() {
    if (!joinCode.trim() || !joinName.trim()) return
    setJoining(true); setJoinError('')
    try {
      const code = joinCode.trim().toUpperCase()
      const { data: cls, error: clsErr } = await supabase
        .from('classrooms')
        .select('*')
        .eq('code', code)
        .single()
      if (clsErr || !cls) { setJoinError('Class code not found. Check with your teacher.'); setJoining(false); return }

      // Check already enrolled
      const { data: existing } = await supabase
        .from('student_enrollments')
        .select('id')
        .eq('student_id', user.id)
        .eq('classroom_id', cls.id)
        .single()
      if (existing) { setJoinError('You are already enrolled in this class.'); setJoining(false); return }

      const { error: enrollErr } = await supabase.from('student_enrollments').insert({
        student_id: user.id,
        classroom_id: cls.id,
        student_name: joinName.trim()
      })
      if (enrollErr) throw enrollErr
      setJoinCode(''); setJoinName('')
      await init()
    } catch(e) { setJoinError(e.message || 'Failed to join. Try again.') }
    setJoining(false)
  }

  async function leaveClass(classroomId) {
    if (!confirm('Leave this class? You can rejoin with the class code.')) return
    await supabase.from('student_enrollments').delete().eq('student_id', user.id).eq('classroom_id', classroomId)
    await init()
  }

  function daysUntil(d) {
    const diff = new Date(d) - new Date()
    const days = Math.ceil(diff / (1000*60*60*24))
    if (days < 0) return 'Past due'
    if (days === 0) return 'Due today'
    return 'Due in ' + days + ' day' + (days !== 1 ? 's' : '')
  }

  const overdueCount = homework.filter(h => new Date(h.due_date) < new Date() && !submissions.includes(h.id)).length
  const pendingCount = homework.filter(h => !submissions.includes(h.id)).length

  if (!authLoading && !user) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-4xl mb-4">🎒</div>
      <h2 className="text-xl font-bold text-t1 mb-2">Student Portal</h2>
      <p className="text-sm text-t2 mb-5">Sign in to access your classes, homework, and Nova tutor.</p>
      <a href="/auth" className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800">Sign In</a>
    </div>
  )

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-t1 tracking-tight">Student Portal</h1>
          <p className="text-sm text-t2 mt-0.5">
            {classrooms.length} class{classrooms.length !== 1 ? 'es' : ''}
            {pendingCount > 0 && <span className="ml-2 text-amber-500 font-semibold">{pendingCount} assignment{pendingCount !== 1 ? 's' : ''} due</span>}
          </p>
        </div>
        <a href="/ai-tutor" className="h-9 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="7"/><circle cx="8" cy="8" r="3"/></svg>
          Ask Nova
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-surface2 rounded-xl w-fit">
        {[['classes','Classes'],['homework','Homework'],['messages','Announcements']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={'px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ' + (tab === id ? 'bg-surface text-t1 shadow-sm' : 'text-t3 hover:text-t2')}>
            {label}
            {id === 'homework' && pendingCount > 0 && <span className={'ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ' + (overdueCount > 0 ? 'bg-red-500 text-white' : 'bg-amber-500 text-white')}>{pendingCount}</span>}
          </button>
        ))}
      </div>

      {/* Classes Tab */}
      {tab === 'classes' && (
        <div className="space-y-4">
          {/* Join new class */}
          <div className="bg-surface border border-line rounded-2xl p-5">
            <h3 className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-3">Join a Class</h3>
            <div className="flex gap-2 flex-wrap">
              <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={8}
                placeholder="Class code" onKeyDown={e => e.key === 'Enter' && joinClass()}
                className="h-9 flex-1 min-w-32 bg-surface2 border border-line rounded-lg px-3 text-sm text-t1 outline-none focus:border-blue-400 uppercase tracking-wider font-bold placeholder:font-normal placeholder:tracking-normal"/>
              <input value={joinName} onChange={e => setJoinName(e.target.value)}
                placeholder="Your name" onKeyDown={e => e.key === 'Enter' && joinClass()}
                className="h-9 flex-1 min-w-32 bg-surface2 border border-line rounded-lg px-3 text-sm text-t1 outline-none focus:border-blue-400"/>
              <button onClick={joinClass} disabled={joining || !joinCode.trim() || !joinName.trim()}
                className="h-9 px-4 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-40 flex items-center gap-1.5">
                {joining ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : null}
                Join
              </button>
            </div>
            {joinError && <p className="text-sm text-red-500 mt-2">{joinError}</p>}
          </div>

          {/* Enrolled classes */}
          {classrooms.length === 0 ? (
            <div className="border-2 border-dashed border-line rounded-2xl p-12 text-center">
              <div className="text-4xl mb-3">🏫</div>
              <p className="text-t1 font-semibold mb-1">No classes yet</p>
              <p className="text-sm text-t2">Enter a class code above to join your first class.</p>
            </div>
          ) : (
            classrooms.map(cls => (
              <div key={cls.id} className="bg-surface border border-line rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-t1">{cls.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {cls.subject && <span className="text-[11px] text-t3">{cls.subject}</span>}
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-surface2 rounded text-t3">{cls.code}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold">Enrolled</span>
                    <button onClick={() => leaveClass(cls.id)} className="text-[11px] text-red-400 hover:text-red-600 hover:underline">Leave</button>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <a href={'/join?code='+cls.code}
                    className="h-8 px-3 bg-blue-700 text-white text-[12px] font-semibold rounded-lg hover:bg-blue-800 flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1v14M1 8h14"/></svg>
                    Join Live Session
                  </a>
                  <button onClick={() => { setActiveClass(cls); setTab('homework') }}
                    className="h-8 px-3 bg-surface2 text-t2 text-[12px] font-medium rounded-lg hover:bg-surface border border-line flex items-center gap-1">
                    View Homework
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Homework Tab */}
      {tab === 'homework' && (
        <div className="space-y-3">
          {homework.length === 0 ? (
            <div className="border-2 border-dashed border-line rounded-2xl p-12 text-center">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-t1 font-semibold mb-1">No assignments right now</p>
              <p className="text-sm text-t2">Your teacher hasn't posted any homework yet.</p>
            </div>
          ) : (
            homework.map(hw => {
              const done = submissions.includes(hw.id)
              const overdue = new Date(hw.due_date) < new Date()
              return (
                <div key={hw.id} className={'bg-surface border rounded-xl p-5 ' + (done ? 'border-emerald-400/30 opacity-70' : overdue ? 'border-red-400/30' : 'border-line')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-t1">{hw.title}</h3>
                        {done && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">✓ Submitted</span>}
                        {!done && overdue && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">Past Due</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[12px] text-t3">
                        <span>{hw.classroom?.name}</span>
                        <span className={overdue && !done ? 'text-red-400 font-semibold' : ''}>{daysUntil(hw.due_date)}</span>
                        <span>{hw.quiz_data?.questions?.length || 0} questions</span>
                      </div>
                    </div>
                    {!done && (
                      <a href={'/join?code='+(classrooms.find(c=>c.id===hw.classroom_id)?.code||'')}
                        className={'h-9 px-4 text-white text-sm font-semibold rounded-xl flex items-center flex-shrink-0 ' + (overdue ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-700 hover:bg-blue-800')}>
                        Start →
                      </a>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Announcements Tab */}
      {tab === 'messages' && (
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="border-2 border-dashed border-line rounded-2xl p-12 text-center">
              <div className="text-4xl mb-3">📢</div>
              <p className="text-t1 font-semibold mb-1">No announcements yet</p>
              <p className="text-sm text-t2">Your teacher's announcements will appear here.</p>
            </div>
          ) : (
            messages.map(thread => (
              <div key={thread.id} className="bg-surface border border-line rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-[11px] font-bold flex-shrink-0">T</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-t1 mb-1">{thread.title}</div>
                    {(thread.messages || []).slice(0,3).map((m, i) => (
                      <p key={i} className="text-[13px] text-t2 mb-1">{m.content}</p>
                    ))}
                    <div className="text-[11px] text-t3 mt-2">{new Date(thread.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}