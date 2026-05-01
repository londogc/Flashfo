import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req) {
  try {
    const { email, adminId } = await req.json()
    if (!email || !adminId) return Response.json({ error: 'Missing email or adminId' }, { status: 400 })

    // Use service role to invite — bypasses RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Check seat limit — max 10 teachers per school admin
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_admin_id', adminId)

    if ((count || 0) >= 10) {
      return Response.json({ error: 'Teacher seat limit reached (10/10). Contact support to upgrade.' }, { status: 403 })
    }

    // Invite user via Supabase Auth — sends a magic link email
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        role: 'teacher',
        plan: 'teacher_pro',
        school_admin_id: adminId,
      },
      redirectTo: process.env.NEXT_PUBLIC_SITE_URL + '/dashboard',
    })

    if (error) throw error

    return Response.json({ success: true, user: data.user?.id })
  } catch (err) {
    console.error('Invite error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
