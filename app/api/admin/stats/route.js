import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req) {
  try {
    const { adminId } = await req.json()
    if (!adminId) return Response.json({ error: 'Missing adminId' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get all teachers under this admin
    const { data: teachers, error: tErr } = await supabase
      .from('profiles')
      .select('id, full_name, role, plan, created_at, school_admin_id')
      .eq('school_admin_id', adminId)
      .order('created_at', { ascending: false })

    if (tErr) throw tErr

    // Get their emails from auth.users
    const teacherIds = (teachers || []).map(t => t.id)
    let teachersWithEmail = teachers || []

    if (teacherIds.length > 0) {
      const emailMap = {}
      await Promise.all(teacherIds.map(async (id) => {
        const { data } = await supabase.auth.admin.getUserById(id)
        if (data?.user?.email) emailMap[id] = data.user.email
      }))
      teachersWithEmail = (teachers || []).map(t => ({
        ...t,
        email: emailMap[t.id] || null
      }))
    }

    return Response.json({
      teachers: teachersWithEmail,
      teacherCount: teachersWithEmail.length,
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
