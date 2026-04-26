'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'

export default function ProfilePage() {
  const { user, profile, loading } = useAuth()
  const [form, setForm] = useState({ full_name: '', username: '', bio: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [bannerUrl, setBannerUrl] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const avatarRef = useRef()
  const bannerRef = useRef()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!loading && !user) window.location.href = '/auth'
    if (profile) {
      setForm({ full_name: profile.full_name || '', username: profile.username || '', bio: profile.bio || '' })
      setAvatarUrl(profile.avatar_url || null)
      setBannerUrl(profile.banner_url || null)
    }
  }, [user, profile, loading])

  async function uploadFile(file, bucket, onUrl, setUploading) {
    if (!file) return
    const maxMb = bucket === 'banners' ? 5 : 2
    if (file.size > maxMb * 1024 * 1024) { setError('File too large (max ' + maxMb + 'MB)'); return }
    if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return }
    setUploading(true); setError('')
    try {
      const ext = file.name.split('.').pop()
      const path = user.id + '.' + ext
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      const url = data.publicUrl + '?t=' + Date.now()
      onUrl(url)
      const field = bucket === 'avatars' ? 'avatar_url' : 'banner_url'
      await supabase.from('profiles').update({ [field]: data.publicUrl }).eq('id', user.id)
    } catch (e) { setError(e.message || 'Upload failed') }
    finally { setUploading(false) }
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true); setError('')
    const { error: updateErr } = await supabase.from('profiles')
      .update({ full_name: form.full_name, username: form.username || null, bio: form.bio || null, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (updateErr) {
      const { error: insertErr } = await supabase.from('profiles')
        .insert({ id: user.id, full_name: form.full_name, username: form.username || null, bio: form.bio || null })
      if (insertErr) { setError(insertErr.message); setSaving(false); return }
    }
    setSaving(false)
    window.location.href = '/'
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh', color:'var(--c-t3)', fontSize:14 }}>Loading...</div>

  const inp = { width:'100%', height:44, padding:'0 14px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:12, fontSize:14, color:'var(--c-t1)', outline:'none', fontFamily:'inherit', transition:'border-color 0.2s', boxSizing:'border-box' }
  const initials = (form.full_name || user?.email || 'U').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()

  const UploadOverlay = ({ uploading, label }) => (
    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, opacity:0, transition:'opacity 0.2s', borderRadius:'inherit' }}
      className="upload-overlay">
      {uploading
        ? <span style={{ fontSize:12, color:'white', fontWeight:600 }}>Uploading...</span>
        : <>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M8 11V1m-4 4l4-4 4 4M1 14h14"/></svg>
            <span style={{ fontSize:11, color:'white', fontWeight:600 }}>{label}</span>
          </>
      }
    </div>
  )

  return (
    <div style={{ maxWidth:660, margin:'0 auto', paddingBottom:40 }}>
      <style>{`
        .upload-hover:hover .upload-overlay { opacity: 1 !important; }
      `}</style>

      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'24px 20px 20px' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--c-t1)', marginBottom:4, letterSpacing:'-0.3px' }}>Profile</h1>
          <p style={{ fontSize:13, color:'var(--c-t2)' }}>Manage your Flashfo account.</p>
        </div>
        <a href="/" style={{ height:36, padding:'0 14px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)', borderRadius:10, fontSize:13, fontWeight:500, display:'inline-flex', alignItems:'center', textDecoration:'none' }}>
          ← Dashboard
        </a>
      </div>

      {/* ── Banner ── */}
      <div style={{ margin:'0 20px 12px' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Banner Photo</div>
        <div
          className="upload-hover"
          onClick={() => !bannerUploading && bannerRef.current?.click()}
          style={{
            position:'relative', height:160, borderRadius:16, overflow:'hidden', cursor:'pointer',
            background: bannerUrl ? 'none' : 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #3b82f6 100%)',
            backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined,
            backgroundSize:'cover', backgroundPosition:'center',
            border:'1px solid var(--c-line)',
          }}>
          {!bannerUrl && !bannerUploading && (
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
              <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"><path d="M8 11V1m-4 4l4-4 4 4M1 14h14"/></svg>
              <span style={{ fontSize:13, color:'rgba(255,255,255,0.8)', fontWeight:600 }}>Upload banner photo</span>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>Recommended: 1500×500px · Max 5MB</span>
            </div>
          )}
          {bannerUploading && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.4)' }}>
              <span style={{ fontSize:13, color:'white', fontWeight:600 }}>Uploading...</span>
            </div>
          )}
          {bannerUrl && <UploadOverlay uploading={bannerUploading} label="Change banner" />}
        </div>
        <input ref={bannerRef} type="file" accept="image/*" style={{ display:'none' }}
          onChange={e => { uploadFile(e.target.files[0], 'banners', setBannerUrl, setBannerUploading); e.target.value = '' }} />
      </div>

      {/* ── Avatar ── */}
      <div style={{ margin:'0 20px 20px' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Profile Photo</div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div
            className="upload-hover"
            onClick={() => !avatarUploading && avatarRef.current?.click()}
            style={{
              position:'relative', width:88, height:88, borderRadius:'50%', overflow:'hidden',
              cursor:'pointer', flexShrink:0,
              background: avatarUrl ? 'none' : '#1d4ed8',
              backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
              backgroundSize:'cover', backgroundPosition:'center',
              border:'3px solid var(--c-line)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'white', fontSize:28, fontWeight:800,
            }}>
            {!avatarUrl && initials}
            <UploadOverlay uploading={avatarUploading} label="Change" />
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--c-t1)' }}>{form.full_name || 'Your Name'}</div>
            <div style={{ fontSize:12, color:'var(--c-t3)', marginTop:2 }}>{user?.email}</div>
            <button
              onClick={() => !avatarUploading && avatarRef.current?.click()}
              style={{ marginTop:8, height:30, padding:'0 12px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer' }}>
              {avatarUploading ? 'Uploading...' : avatarUrl ? 'Change photo' : 'Upload photo'}
            </button>
          </div>
        </div>
        <input ref={avatarRef} type="file" accept="image/*" style={{ display:'none' }}
          onChange={e => { uploadFile(e.target.files[0], 'avatars', setAvatarUrl, setAvatarUploading); e.target.value = '' }} />
      </div>

      {/* ── Form ── */}
      <form onSubmit={save} style={{ margin:'0 20px 16px', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:18, padding:20 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {[
            { k:'full_name', label:'Full Name', ph:'Your full name' },
            { k:'username',  label:'Username',  ph:'e.g. glen123' },
          ].map(({ k, label, ph }) => (
            <div key={k}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{label}</label>
              <input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph} style={inp}
                onFocus={e => e.target.style.borderColor='#3b82f6'}
                onBlur={e => e.target.style.borderColor='var(--c-line)'}/>
            </div>
          ))}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Bio</label>
            <textarea value={form.bio} onChange={e => set('bio', e.target.value)}
              placeholder="Tell us about yourself..." rows={3}
              style={{ ...inp, height:'auto', padding:'10px 14px', resize:'none', lineHeight:1.6 }}
              onFocus={e => e.target.style.borderColor='#3b82f6'}
              onBlur={e => e.target.style.borderColor='var(--c-line)'}/>
          </div>
        </div>

        {error && <div style={{ marginTop:14, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, fontSize:13, color:'#dc2626' }}>{error}</div>}

        <div style={{ marginTop:20, display:'flex', gap:10, alignItems:'center' }}>
          <button type="submit" disabled={saving}
            style={{ height:40, padding:'0 20px', background:'#1d4ed8', color:'white', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:saving?'not-allowed':'pointer', opacity:saving?0.7:1 }}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <a href="/" style={{ fontSize:13, color:'var(--c-t3)', textDecoration:'none', fontWeight:500 }}>Cancel</a>
        </div>
      </form>

      {/* ── Sign out ── */}
      <div style={{ margin:'0 20px', background:'var(--c-surface)', border:'1px solid #fecaca', borderRadius:18, padding:20 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#dc2626', marginBottom:4 }}>Sign out</div>
        <p style={{ fontSize:12, color:'var(--c-t2)', marginBottom:12 }}>You will be signed out on this device.</p>
        <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/auth' }}
          style={{ height:36, padding:'0 16px', background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer' }}>
          Sign out
        </button>
      </div>
    </div>
  )
}