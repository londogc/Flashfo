'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'

export default function ProfilePage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ full_name: '', username: '', bio: '' })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!loading && !user) router.push('/auth')
    if (profile) setForm({
      full_name: profile.full_name || '',
      username: profile.username || '',
      bio: profile.bio || ''
    })
  }, [user, profile, loading])

  async function save(e) {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess(false)

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name,
        username: form.username || null,
        bio: form.bio || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateErr) {
      const { error: insertErr } = await supabase
        .from('profiles')
        .insert({ id: user.id, full_name: form.full_name, username: form.username || null, bio: form.bio || null })
      if (insertErr) { setError(insertErr.message); setSaving(false); return }
    }

    setSaving(false)
    setSuccess(true)
    // Redirect to dashboard after 1 second
    setTimeout(() => { router.push('/') }, 1000)
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh', color:'var(--c-t3)', fontSize:14 }}>Loading...</div>
  )

  const inputStyle = { width:'100%', height:44, padding:'0 14px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:12, fontSize:14, color:'var(--c-t1)', outline:'none', fontFamily:'inherit', transition:'border-color 0.2s', boxSizing:'border-box' }
  const initials = (form.full_name || user?.email || 'U').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()

  return (
    <div style={{ padding:'24px 20px', maxWidth:600, margin:'0 auto' }}>
      <h1 style={{ fontSize:22, fontWeight:800, color:'var(--c-t1)', marginBottom:4, letterSpacing:'-0.3px' }}>Profile</h1>
      <p style={{ fontSize:13, color:'var(--c-t2)', marginBottom:24 }}>Manage your Flashfo account details.</p>

      <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:18, padding:20, marginBottom:16, display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'#1d4ed8', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:22, fontWeight:800, flexShrink:0 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--c-t1)' }}>{form.full_name || 'Your Name'}</div>
          <div style={{ fontSize:12, color:'var(--c-t3)', marginTop:2 }}>{user?.email}</div>
        </div>
      </div>

      <form onSubmit={save} style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:18, padding:20 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {[
            { k:'full_name', label:'Full Name', ph:'Your full name' },
            { k:'username',  label:'Username',  ph:'e.g. glen123' },
          ].map(({ k, label, ph }) => (
            <div key={k}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{label}</label>
              <input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph} style={inputStyle}
                onFocus={e => e.target.style.borderColor='#3b82f6'}
                onBlur={e => e.target.style.borderColor='var(--c-line)'}/>
            </div>
          ))}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Bio</label>
            <textarea value={form.bio} onChange={e => set('bio', e.target.value)}
              placeholder="Tell us about yourself..." rows={3}
              style={{ ...inputStyle, height:'auto', padding:'10px 14px', resize:'none', lineHeight:1.6 }}
              onFocus={e => e.target.style.borderColor='#3b82f6'}
              onBlur={e => e.target.style.borderColor='var(--c-line)'}/>
          </div>
        </div>

        {error && <div style={{ marginTop:14, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, fontSize:13, color:'#dc2626' }}>{error}</div>}
        {success && <div style={{ marginTop:14, padding:'10px 14px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, fontSize:13, color:'#16a34a' }}>✓ Saved! Returning to dashboard...</div>}

        <div style={{ marginTop:20, display:'flex', gap:10 }}>
          <button type="submit" disabled={saving || success}
            style={{ height:40, padding:'0 20px', background: success ? '#16a34a' : '#1d4ed8', color:'white', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : success ? 'Saved ✓' : 'Save changes'}
          </button>
          <a href="/" style={{ height:40, padding:'0 16px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)', borderRadius:10, fontSize:13, fontWeight:500, display:'inline-flex', alignItems:'center', textDecoration:'none' }}>
            ← Dashboard
          </a>
        </div>
      </form>

      <div style={{ background:'var(--c-surface)', border:'1px solid #fecaca', borderRadius:18, padding:20, marginTop:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#dc2626', marginBottom:4 }}>Sign out</div>
        <p style={{ fontSize:12, color:'var(--c-t2)', marginBottom:12 }}>You will be signed out on this device.</p>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth') }}
          style={{ height:36, padding:'0 16px', background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer' }}>
          Sign out
        </button>
      </div>
    </div>
  )
}