'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'

// ─── Crop Modal ────────────────────────────────────────────────────────────────
function CropModal({ file, cropW, cropH, title, onApply, onCancel }) {
  const canvasRef = useRef(null)
  const imgRef    = useRef(null)
  const posRef    = useRef({ x: 0, y: 0 })
  const scaleRef  = useRef(1)
  const dragging  = useRef(false)
  const lastPt    = useRef({ x: 0, y: 0 })
  const [ready, setReady]         = useState(false)
  const [preview, setPreview]     = useState(null)  // data URL shown after crop
  const [cropBlob, setCropBlob]   = useState(null)  // blob ready to upload

  function clamp(nx, ny, s) {
    const img = imgRef.current
    if (!img) return { x: 0, y: 0 }
    const iw = img.width * s
    const ih = img.height * s
    return {
      x: iw >= cropW ? Math.min(0, Math.max(cropW - iw, nx)) : (cropW - iw) / 2,
      y: ih >= cropH ? Math.min(0, Math.max(cropH - ih, ny)) : (cropH - ih) / 2,
    }
  }

  function draw() {
    const canvas = canvasRef.current
    const img    = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, cropW, cropH)
    ctx.drawImage(img, posRef.current.x, posRef.current.y, img.width * scaleRef.current, img.height * scaleRef.current)
  }

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      const s = Math.max(cropW / img.width, cropH / img.height)
      scaleRef.current = s
      posRef.current = clamp((cropW - img.width * s) / 2, (cropH - img.height * s) / 2, s)
      setReady(true)
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => { if (ready) draw() }, [ready])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handler = e => {
      e.preventDefault()
      const img = imgRef.current
      if (!img) return
      const minS   = Math.max(cropW / img.width, cropH / img.height)
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      const newS   = Math.min(5, Math.max(minS, scaleRef.current * factor))
      const rect   = canvas.getBoundingClientRect()
      const rx     = cropW / rect.width
      const ry     = cropH / rect.height
      const mx     = (e.clientX - rect.left) * rx
      const my     = (e.clientY - rect.top)  * ry
      const newX   = mx - (mx - posRef.current.x) * (newS / scaleRef.current)
      const newY   = my - (my - posRef.current.y) * (newS / scaleRef.current)
      scaleRef.current = newS
      posRef.current   = clamp(newX, newY, newS)
      draw()
    }
    canvas.addEventListener('wheel', handler, { passive: false })
    return () => canvas.removeEventListener('wheel', handler)
  }, [])

  function toCanvas(cx, cy) {
    const canvas = canvasRef.current
    const rect   = canvas.getBoundingClientRect()
    return {
      x: (cx - rect.left) * (cropW / rect.width),
      y: (cy - rect.top)  * (cropH / rect.height),
    }
  }

  function onStart(cx, cy) { dragging.current = true; lastPt.current = toCanvas(cx, cy) }
  function onMove(cx, cy) {
    if (!dragging.current) return
    const pt = toCanvas(cx, cy)
    posRef.current = clamp(posRef.current.x + pt.x - lastPt.current.x, posRef.current.y + pt.y - lastPt.current.y, scaleRef.current)
    lastPt.current = pt
    draw()
  }

  function applyCrop() {
    const img = imgRef.current
    if (!img) return
    const s  = scaleRef.current
    const px = posRef.current.x
    const py = posRef.current.y
    // Source region in original image coords
    const sx = -px / s
    const sy = -py / s
    const sw = cropW / s
    const sh = cropH / s
    const out = document.createElement('canvas')
    out.width  = cropW
    out.height = cropH
    out.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, cropW, cropH)
    // Show preview BEFORE uploading
    setPreview(out.toDataURL('image/jpeg', 0.92))
    out.toBlob(blob => { setCropBlob(blob) }, 'image/jpeg', 0.92)
  }

  function confirmUpload() {
    if (!cropBlob) return
    onApply(new File([cropBlob], 'cropped.jpg', { type: 'image/jpeg' }))
  }

  const btnBase = { height:38, padding:'0 18px', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' }

  // ── Preview / Confirm screen ──
  if (preview) return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.82)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'var(--c-surface)', borderRadius:20, padding:24, width:'100%', maxWidth: Math.min(cropW, 800) + 48 }}>
        <div style={{ fontSize:15, fontWeight:700, color:'var(--c-t1)', marginBottom:4 }}>Confirm crop</div>
        <div style={{ fontSize:12, color:'var(--c-t3)', marginBottom:14 }}>This is exactly what will be uploaded. Happy with it?</div>
        <img src={preview} alt="Crop preview" style={{ width:'100%', borderRadius:12, display:'block' }}/>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 }}>
          <button onClick={() => { setPreview(null); setCropBlob(null) }}
            style={{ ...btnBase, background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)' }}>
            ← Back to crop
          </button>
          <button onClick={confirmUpload}
            style={{ ...btnBase, background:'#1d4ed8', color:'white' }}>
            Upload
          </button>
        </div>
      </div>
    </div>
  )

  // ── Crop screen ──
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.82)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'var(--c-surface)', borderRadius:20, padding:24, width:'100%', maxWidth: Math.min(cropW, 800) + 48 }}>
        <div style={{ fontSize:15, fontWeight:700, color:'var(--c-t1)', marginBottom:4 }}>{title}</div>
        <div style={{ fontSize:12, color:'var(--c-t3)', marginBottom:14 }}>Drag to reposition · Scroll to zoom</div>
        <div
          style={{ position:'relative', borderRadius:12, overflow:'hidden', lineHeight:0, cursor:'grab', userSelect:'none', touchAction:'none' }}
          onMouseDown={e => onStart(e.clientX, e.clientY)}
          onMouseMove={e => onMove(e.clientX, e.clientY)}
          onMouseUp={() => { dragging.current = false }}
          onMouseLeave={() => { dragging.current = false }}
          onTouchStart={e => { e.preventDefault(); onStart(e.touches[0].clientX, e.touches[0].clientY) }}
          onTouchMove={e => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY) }}
          onTouchEnd={() => { dragging.current = false }}
        >
          <canvas ref={canvasRef} width={cropW} height={cropH} style={{ display:'block', width:'100%', height:'auto' }}/>
          <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
            <div style={{ position:'absolute', left:'33.33%', top:0, bottom:0, width:1, background:'rgba(255,255,255,0.25)' }}/>
            <div style={{ position:'absolute', left:'66.66%', top:0, bottom:0, width:1, background:'rgba(255,255,255,0.25)' }}/>
            <div style={{ position:'absolute', top:'33.33%', left:0, right:0, height:1, background:'rgba(255,255,255,0.25)' }}/>
            <div style={{ position:'absolute', top:'66.66%', left:0, right:0, height:1, background:'rgba(255,255,255,0.25)' }}/>
            <div style={{ position:'absolute', inset:0, border:'2px solid rgba(255,255,255,0.7)', borderRadius:12 }}/>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 }}>
          <button onClick={onCancel}
            style={{ ...btnBase, background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)' }}>
            Cancel
          </button>
          <button onClick={applyCrop}
            style={{ ...btnBase, background:'#1d4ed8', color:'white' }}>
            Apply crop →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Profile Page ──────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, profile, loading } = useAuth()
  const [form, setForm]           = useState({ full_name: '', username: '', bio: '' })
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [bannerUrl, setBannerUrl] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [cropFile, setCropFile]   = useState(null)
  const [cropType, setCropType]   = useState(null)
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

  async function uploadFile(file, bucket, setUrl, setUploading) {
    const maxMb = bucket === 'banners' ? 5 : 3
    if (file.size > maxMb * 1024 * 1024) { setError('File too large (max ' + maxMb + 'MB)'); return }
    setUploading(true); setError('')
    try {
      const path = user.id + '.jpg'
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: 'image/jpeg' })
      if (upErr) throw upErr
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      const url = data.publicUrl + '?t=' + Date.now()
      setUrl(url)
      const field = bucket === 'avatars' ? 'avatar_url' : 'banner_url'
      await supabase.from('profiles').update({ [field]: data.publicUrl }).eq('id', user.id)
    } catch (e) { setError(e.message || 'Upload failed') }
    finally { setUploading(false) }
  }

  async function removePhoto(type) {
    const field = type === 'avatar' ? 'avatar_url' : 'banner_url'
    const { error: e } = await supabase.from('profiles').update({ [field]: null }).eq('id', user.id)
    if (e) { setError(e.message); return }
    if (type === 'avatar') setAvatarUrl(null)
    else setBannerUrl(null)
  }

  function onFileSelected(e, type) {
    const file = e.target.files[0]; e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    setCropType(type); setCropFile(file)
  }

  async function onCropApply(croppedFile) {
    const type = cropType
    setCropFile(null); setCropType(null)
    if (type === 'avatar') await uploadFile(croppedFile, 'avatars', setAvatarUrl, setAvatarUploading)
    else await uploadFile(croppedFile, 'banners', setBannerUrl, setBannerUploading)
  }

  async function save(e) {
    e.preventDefault(); setSaving(true); setError('')
    const { error: err } = await supabase.rpc('upsert_own_profile', {
      p_full_name: form.full_name, p_username: form.username || null, p_bio: form.bio || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    window.location.href = '/'
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh', color:'var(--c-t3)', fontSize:14 }}>Loading...</div>

  const inp = { width:'100%', height:44, padding:'0 14px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:12, fontSize:14, color:'var(--c-t1)', outline:'none', fontFamily:'inherit', transition:'border-color 0.2s', boxSizing:'border-box' }
  const initials = (form.full_name || user?.email || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()

  return (
    <div style={{ maxWidth:660, margin:'0 auto', paddingBottom:40 }}>
      {cropFile && (
        <CropModal
          file={cropFile}
          cropW={cropType === 'avatar' ? 400 : 1200}
          cropH={cropType === 'avatar' ? 400 :  400}
          title={cropType === 'avatar' ? 'Crop profile photo' : 'Crop banner photo'}
          onApply={onCropApply}
          onCancel={() => { setCropFile(null); setCropType(null) }}
        />
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'24px 20px 20px' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--c-t1)', marginBottom:4, letterSpacing:'-0.3px' }}>Profile</h1>
          <p style={{ fontSize:13, color:'var(--c-t2)' }}>Manage your Flashfo account.</p>
        </div>
        <a href="/" style={{ height:36, padding:'0 14px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)', borderRadius:10, fontSize:13, fontWeight:500, display:'inline-flex', alignItems:'center', textDecoration:'none' }}>
          ← Dashboard
        </a>
      </div>

      {/* Banner */}
      <div style={{ margin:'0 20px 12px' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Banner Photo</div>
        <div style={{ position:'relative', paddingBottom:'33.33%', borderRadius:16, overflow:'hidden', border:'1px solid var(--c-line)' }}>
          <div style={{ position:'absolute', inset:0, background: bannerUrl ? 'none' : 'var(--c-surface2)', backgroundImage: bannerUrl ? 'url(' + bannerUrl + ')' : undefined, backgroundSize:'cover', backgroundPosition:'center center' }}>
            {!bannerUrl && !bannerUploading && (
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
                <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="var(--c-t2)" strokeWidth="1.5" strokeLinecap="round"><path d="M8 11V1m-4 4l4-4 4 4M1 14h14"/></svg>
                <span style={{ fontSize:13, color:'var(--c-t1)', fontWeight:600 }}>Upload banner photo</span>
                <span style={{ fontSize:11, color:'var(--c-t3)' }}>Recommended: 1200×400px · Max 5MB</span>
              </div>
            )}
            {bannerUploading && (
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.3)' }}>
                <span style={{ fontSize:13, color:'white', fontWeight:600 }}>Uploading...</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:10 }}>
          <button onClick={() => bannerRef.current?.click()} disabled={bannerUploading}
            style={{ height:32, padding:'0 14px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 11V1m-4 4l4-4 4 4M1 14h14"/></svg>
            {bannerUploading ? 'Uploading...' : bannerUrl ? 'Change banner' : 'Upload banner'}
          </button>
          {bannerUrl && (
            <button onClick={() => removePhoto('banner')}
              style={{ height:32, padding:'0 14px', background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer' }}>
              Remove banner
            </button>
          )}
        </div>
        <input ref={bannerRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => onFileSelected(e, 'banner')} />
      </div>

      {/* Avatar */}
      <div style={{ margin:'0 20px 20px' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Profile Photo</div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:80, height:80, borderRadius:'50%', flexShrink:0, background: avatarUrl ? 'none' : '#1d4ed8', backgroundImage: avatarUrl ? 'url(' + avatarUrl + ')' : undefined, backgroundSize:'cover', backgroundPosition:'center', border:'3px solid var(--c-line)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:24, fontWeight:800 }}>
            {!avatarUrl && initials}
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--c-t1)' }}>{form.full_name || 'Your Name'}</div>
            <div style={{ fontSize:12, color:'var(--c-t3)', marginTop:2 }}>{user?.email}</div>
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <button onClick={() => avatarRef.current?.click()} disabled={avatarUploading}
                style={{ height:30, padding:'0 12px', background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer' }}>
                {avatarUploading ? 'Uploading...' : avatarUrl ? 'Change photo' : 'Upload photo'}
              </button>
              {avatarUrl && (
                <button onClick={() => removePhoto('avatar')}
                  style={{ height:30, padding:'0 12px', background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer' }}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
        <input ref={avatarRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => onFileSelected(e, 'avatar')} />
      </div>

      {/* Form */}
      <form onSubmit={save} style={{ margin:'0 20px 16px', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:18, padding:20 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {[{k:'full_name',label:'Full Name',ph:'Your full name'},{k:'username',label:'Username',ph:'e.g. glen123'}].map(({k,label,ph}) => (
            <div key={k}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{label}</label>
              <input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph} style={inp}
                onFocus={e => e.target.style.borderColor='#3b82f6'} onBlur={e => e.target.style.borderColor='var(--c-line)'}/>
            </div>
          ))}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Bio</label>
            <textarea value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Tell us about yourself..." rows={3}
              style={{ ...inp, height:'auto', padding:'10px 14px', resize:'none', lineHeight:1.6 }}
              onFocus={e => e.target.style.borderColor='#3b82f6'} onBlur={e => e.target.style.borderColor='var(--c-line)'}/>
          </div>
        </div>
        {error && <div style={{ marginTop:14, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, fontSize:13, color:'#dc2626' }}>{error}</div>}
        <div style={{ marginTop:20, display:'flex', gap:10, alignItems:'center' }}>
          <button type="submit" disabled={saving}
            style={{ height:40, padding:'0 20px', background:'#1d4ed8', color:'white', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', opacity:saving?0.7:1 }}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <a href="/" style={{ fontSize:13, color:'var(--c-t3)', textDecoration:'none' }}>Cancel</a>
        </div>
      </form>

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