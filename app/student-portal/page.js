'use client'
// v6.0 Student Portal — background scaffold
// This page will become the student's home when logged in as a student account
// Features planned for v6.0:
//   - Class list (enrolled classrooms with teacher, year)
//   - Upcoming homework with due dates
//   - Nova tutor (aware of class content)
//   - Message thread with teacher
//   - Personal grade history
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

export default function StudentPortalPage() {
  const { user } = useAuth()
  const [classrooms, setClassrooms] = useState([])
  const [homework, setHomework] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) init() }, [user])

  async function init() {
    // Load enrolled classrooms via student_enrollments table (v6.0 table)
    try {
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('*, classroom:classrooms(*)')
        .eq('student_id', user.id)
      setClassrooms((enrollments || []).map(e => e.classroom).filter(Boolean))

      // Load open homework for enrolled classrooms
      if (enrollments?.length) {
        const classIds = enrollments.map(e => e.classroom_id)
        const { data: hw } = await supabase
          .from('homework_assignments')
          .select('*')
          .in('classroom_id', classIds)
          .eq('status', 'open')
          .lte('opens_at', new Date().toISOString())
          .order('due_date', { ascending: true })
        setHomework(hw || [])
      }
    } catch(e) {}
    setLoading(false)
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 mb-1">Student Portal</h1>
      <p className="text-sm text-t2 mb-6">Your classes, homework, and study tools in one place.</p>

      {classrooms.length === 0 ? (
        <div className="border-2 border-dashed border-line rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">🏫</div>
          <p className="text-t1 font-semibold mb-1">No classes yet</p>
          <p className="text-sm text-t2 mb-5">Ask your teacher for a class code to join your classroom.</p>
          <a href="/join" className="inline-block h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800">Join a Class</a>
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-3">My Classes</h2>
            <div className="space-y-3">
              {classrooms.map(cls => (
                <div key={cls.id} className="bg-surface border border-line rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-t1">{cls.name}</div>
                    <div className="text-[12px] text-t3 mt-0.5">{cls.subject} · Code: {cls.code}</div>
                  </div>
                  <a href={'/join?code='+cls.code} className="h-8 px-3 bg-blue-700 text-white text-[12px] font-semibold rounded-lg hover:bg-blue-800">Open</a>
                </div>
              ))}
            </div>
          </section>
          {homework.length > 0 && (
            <section>
              <h2 className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-3">Due Soon</h2>
              <div className="space-y-3">
                {homework.map(hw => (
                  <div key={hw.id} className="bg-surface border border-line rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-t1">{hw.title}</div>
                      <div className="text-[12px] text-t3 mt-0.5">
                        Due {new Date(hw.due_date).toLocaleDateString()} · {hw.quiz_data?.questions?.length || 0} questions
                      </div>
                    </div>
                    <span className="h-7 px-3 bg-amber-500/10 text-amber-500 text-[11px] font-semibold rounded-lg flex items-center">Start</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}