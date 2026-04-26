'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'

// ─────────────────────────────────────────────────────────────────────────────
// CropModal — CSS/img approach, no canvas display scaling issues
// DISP_W x DISP_H = the visible crop window in CSS pixels
// OUT_W x OUT_H   = the exported image size
// ─────────────────────────────────────────────────────────────────────────────
function CropModal({ file, dispW, dispH, outW, outH, title, onApply, onCancel }) {
  const [imgSrc,  setImgSrc]  = useState(null)
  const [nat,     setNat]     = useState({ w: 0, h: 0 })  // natural image size
  const [imgX,    setImgX]    = useState(0)   // top-left of image in container px
  const [imgY,    setImgY]    = useState(0)
  const [scale,   setScale]   = useState(1)
  const [preview, setPreview] = useState(null)
  const [blob,    setBlob]    = useState(null)
  const dragging = useRef(false)
  const last     = useRef({ x: 0, y: 0 })

  // Load blob → object URL
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Clamp so image always covers the crop window
  const clamp = useCallback((x, y, s, nw, nh) => {
    const iw = nw * s
    const ih = nh * s
    return {
      x: Math.min(0, Math.max(dispW - iw, x)),
      y: Math.min(0, Math.max(dispH - ih, y)),
    }
  }, [dispW, dispH])

  // Once image natural size is known, set initial scale + position
  function onImgLoad(e) {
    const nw = e.target.naturalWidth
    const nh = e.target.naturalHeight
    setNat({ w: nw, h: nh })
    const s = Math.max(dispW / nw, dispH / nh)
    setScale(s)
    const c = clamp((dispW - nw * s) / 2, (dispH - nh * s) / 2, s, nw, nh)
    setImgX(c.x); setImgY(c.y)
  }

  // Mouse drag
  function onMouseDown(e) { e.preventDefault(); dragging.current = true; last.current = { x: e.clientX, y: e.clientY } }
  function onMouseMove(e) {
    if (!dragging.current || !nat.w) return
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y
    last.current = { x: e.clientX, y: e.clientY }
    setImgX(x => { const c = clamp(x + dx, imgY, scale, nat.w, nat.h); return c.x })
    setImgY(y => { const c = clamp(imgX, y + dy, scale, nat.w, nat.h); return c.y })
  }
  function onMouseUp() { dragging.current = false }

  // Touch drag
  function onTouchStart(e) { e.preventDefault(); last.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  function onTouchMove(e) {
    e.preventDefault()
    if (!nat.w) return
    const dx = e.touches[0].clientX - last.current.x
    const dy = e.touches[0].clientY - last.current.y
    last.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    setImgX(x => { const c = clamp(x + dx, imgY, scale, nat.w, nat.h); return c.x })
    setImgY(y => { const c = clamp(imgX, y + dy, scale, nat.w, nat.h); return c.y })
  }

  // Scroll to zoom
  function onWheel(e) {
    e.preventDefault()
    if (!nat.w) return
    const minS   = Math.max(dispW / nat.w, dispH / nat.h)
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    const newS   = Math.min(10, Math.max(minS, scale * factor))
    // zoom toward mouse position relative to container
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left   // mouse in container px
    const my = e.clientY - rect.top
    // image point under mouse stays fixed: (mx - imgX) / scale = (mx - newX) / newS
    const newX = mx - (mx - imgX) * (newS / scale)
    const newY = my - (my - imgY) * (newS / scale)
    const c = clamp(newX, newY, newS, nat.w, nat.h)
    setScale(newS); setImgX(c.x); setImgY(c.y)
  }

  // Export crop
  function applyCrop() {
    if (!nat.w || !imgSrc) return
    // Source region: what portion of the original image is inside the crop window?
    // Container [0,0]→[dispW,dispH] maps to image source:
    //   srcX = (0 - imgX) / scale
    //   srcY = (0 - imgY) / scale
    //   srcW = dispW / scale
    //   srcH = dispH / scale
    const srcX = -imgX / scale
    const srcY = -imgY / scale
    const srcW = dispW / scale
    const srcH = dispH / scale

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = outW
      canvas.height = outH
      // 9-arg drawImage: read srcX,srcY,srcW,srcH from source → fill outW,outH on canvas
      canvas.getContext('2d').drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      setPreview(dataUrl)
      canvas.toBlob(b => setBlob(b), 'image/jpeg', 0.92)
    }
    // Load from the same object URL — same image data, no network
    img.src = imgSrc
  }

  function confirmUpload() {
    if (blob) onApply(new File([blob], 'cropped.jpg', { type: 'image/jpeg' }))
  }

  const btn = (extra) => ({
    height:38, padding:'0 18px', border:'none', borderRadius:10,
    fontSize:13, fontWeight:700, cursor:'pointer', ...extra
  })

  // ── Preview / Confirm ──
  if (preview) return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'var(--c-surface)', borderRadius:20, padding:24, width:'100%', maxWidth: dispW + 48 }}>
        <div style={{ fontSize:15, fontWeight:700, color:'var(--c-t1)', marginBottom:4 }}>Looks good?</div>
        <div style={{ fontSize:12, color:'var(--c-t3)', marginBottom:14 }}>This is exactly what will be uploaded.</div>
        <img src={preview} alt="Crop preview" style={{ width:'100%', borderRadius:12, display:'block' }}/>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 }}>
          <button onClick={() => { setPreview(null); setBlob(null) }}
            style={btn({ background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)' })}>
            ← Edit crop
          </button>
          <button onClick={confirmUpload}
            style={btn({ background:'#1d4ed8', color:'white' })}>
            Upload
          </button>
        </div>
      </div>
    </div>
  )

  // ── Crop ──
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'var(--c-surface)', borderRadius:20, padding:24, width:'100%', maxWidth: dispW + 48 }}>
        <div style={{ fontSize:15, fontWeight:700, color:'var(--c-t1)', marginBottom:4 }}>{title}</div>
        <div style={{ fontSize:12, color:'var(--c-t3)', marginBottom:14 }}>Drag to reposition · Scroll / pinch to zoom</div>

        {/* Crop window — fixed size, overflow hidden = the crop frame */}
        <div
          style={{ width:'100%', paddingBottom: (dispH/dispW*100)+'%', position:'relative', borderRadius:12, overflow:'hidden', cursor:'grab', userSelect:'none', touchAction:'none' }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onMouseUp}
          onWheel={onWheel}
        >
          <div style={{ position:'absolute', inset:0 }}>
            {/* The image positioned absolutely with our tracked imgX/imgY/scale */}
            {imgSrc && (
              <img
                src={imgSrc}
                onLoad={onImgLoad}
                draggable={false}
                style={{
                  position:'absolute',
                  left: imgX + 'px',
                  top:  imgY + 'px',
                  width:  nat.w ? nat.w * scale + 'px' : 'auto',
                  height: nat.h ? nat.h * scale + 'px' : 'auto',
                  maxWidth:'none',
                  userSelect:'none',
                  pointerEvents:'none',
                }}
              />
            )}
            {/* Rule-of-thirds grid + border */}
            <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
              <div style={{ position:'absolute', left:'33.33%', top:0, bottom:0, width:1, background:'rgba(255,255,255,0.3)' }}/>
              <div style={{ position:'absolute', left:'66.66%', top:0, bottom:0, width:1, background:'rgba(255,255,255,0.3)' }}/>
              <div style={{ position:'absolute', top:'33.33%', left:0, right:0, height:1, background:'rgba(255,255,255,0.3)' }}/>
              <div style={{ position:'absolute', top:'66.66%', left:0, right:0, height:1, background:'rgba(255,255,255,0.3)' }}/>
              <div style={{ position:'absolute', inset:0, border:'2px solid rgba(255,255,255,0.8)', borderRadius:12 }}/>
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 }}>
          <button onClick={onCancel} style={btn({ background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)' })}>Cancel</button>
          <button onClick={applyCrop} style={btn({ background:'#1d4ed8', color:'white' })}>Apply crop →</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Page
// ─────────────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, profile, loading } = useAuth()
  const [form, setForm]           = useState({ full_name: '', username: '', bio: '' })
  const [saving, setSaving]       = useState(false)
  const [error,  setError]        = useState('')
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
      setForm({ full_name: profile.full_name||'', username: profile.username||'', bio: profile.bio||'' })
      setAvatarUrl(profile.avatar_url||null)
      setBannerUrl(profile.banner_url||null)
    }
  }, [user, profile, loading])

  async function uploadFile(file, bucket, setUrl, setUploading) {
    setUploading(true); setError('')
    try {
      const path = user.id + '.jpg'
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert:true, contentType:'image/jpeg' })
      if (upErr) throw upErr
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      setUrl(data.publicUrl + '?t=' + Date.now())
      const field = bucket==='avatars' ? 'avatar_url' : 'banner_url'
      await supabase.from('profiles').update({ [field]: data.publicUrl }).eq('id', user.id)
    } catch(e) { setError(e.message||'Upload failed') }
    finally { setUploading(false) }
  }

  async function removePhoto(type) {
    const field = type==='avatar' ? 'avatar_url' : 'banner_url'
    const { error: e } = await supabase.from('profiles').update({ [field]:null }).eq('id', user.id)
    if (e) { setError(e.message); return }
    if (type==='avatar') setAvatarUrl(null); else setBannerUrl(null)
  }

  function onFileSelected(e, type) {
    const file = e.target.files[0]; e.target.value=''
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    setCropType(type); setCropFile(file)
  }

  async function onCropApply(croppedFile) {
    const type = cropType
    setCropFile(null); setCropType(null)
    if (type==='avatar') await uploadFile(croppedFile, 'avatars', setAvatarUrl, setAvatarUploading)
    else await uploadFile(croppedFile, 'banners', setBannerUrl, setBannerUploading)
  }

  async function save(e) {
    e.preventDefault(); setSaving(true); setError('')
    const { error: err } = await supabase.rpc('upsert_own_profile', {
      p_full_name: form.full_name, p_username: form.username||null, p_bio: form.bio||null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    window.location.href = '/'
  }

  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'50vh',color:'var(--c-t3)',fontSize:14 }}>Loading...</div>

  const inp = { width:'100%',height:44,padding:'0 14px',background:'var(--c-surface2)',border:'1px solid var(--c-line)',borderRadius:12,fontSize:14,color:'var(--c-t1)',outline:'none',fontFamily:'inherit',transition:'border-color 0.2s',boxSizing:'border-box' }
  const initials = (form.full_name||user?.email||'U').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()

  return (
    <div style={{ maxWidth:660, margin:'0 auto', paddingBottom:40 }}>

      {cropFile && (
        <CropModal
          file={cropFile}
          dispW={600} dispH={cropType==='avatar' ? 600 : 200}
          outW={cropType==='avatar' ? 400 : 1200}
          outH={cropType==='avatar' ? 400 : 400}
          title={cropType==='avatar' ? 'Crop profile photo' : 'Crop banner photo'}
          onApply={onCropApply}
          onCancel={() => { setCropFile(null); setCropType(null) }}
        />
      )}

      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'24px 20px 20px' }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:800,color:'var(--c-t1)',marginBottom:4,letterSpacing:'-0.3px' }}>Profile</h1>
          <p style={{ fontSize:13,color:'var(--c-t2)' }}>Manage your Flashfo account.</p>
        </div>
        <a href="/" style={{ height:36,padding:'0 14px',background:'var(--c-surface2)',border:'1px solid var(--c-line)',color:'var(--c-t2)',borderRadius:10,fontSize:13,fontWeight:500,display:'inline-flex',alignItems:'center',textDecoration:'none' }}>← Dashboard</a>
      </div>

      {/* Banner */}
      <div style={{ margin:'0 20px 12px' }}>
        <div style={{ fontSize:11,fontWeight:700,color:'var(--c-t3)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8 }}>Banner Photo</div>
        {/* Display ratio = outW:outH = 1200:400 = 3:1 → paddingBottom 33.33% */}
        <div style={{ position:'relative',paddingBottom:'33.33%',borderRadius:16,overflow:'hidden',border:'1px solid var(--c-line)' }}>
          <div style={{ position:'absolute',inset:0,background:bannerUrl?'none':'var(--c-surface2)',backgroundImage:bannerUrl?'url('+bannerUrl+')':undefined,backgroundSize:'cover', backgroundPosition:'center center' }}>
            {!bannerUrl&&!bannerUploading&&(
              <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8 }}>
                <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="var(--c-t2)" strokeWidth="1.5" strokeLinecap="round"><path d="M8 11V1m-4 4l4-4 4 4M1 14h14"/></svg>
                <span style={{ fontSize:13,color:'var(--c-t1)',fontWeight:600 }}>Upload banner photo</span>
                <span style={{ fontSize:11,color:'var(--c-t3)' }}>Click below to upload · Max 5MB</span>
              </div>
            )}
            {bannerUploading&&(<div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.3)' }}><span style={{ fontSize:13,color:'white',fontWeight:600 }}>Uploading...</span></div>)}
          </div>
        </div>
        <div style={{ display:'flex',gap:8,marginTop:10 }}>
          <button onClick={()=>bannerRef.current?.click()} disabled={bannerUploading}
            style={{ height:32,padding:'0 14px',background:'var(--c-surface2)',border:'1px solid var(--c-line)',color:'var(--c-t2)',borderRadius:8,fontSize:12,fontWeight:500,cursor:'pointer' }}>
            {bannerUploading?'Uploading...':bannerUrl?'Change banner':'Upload banner'}
          </button>
          {bannerUrl&&(<button onClick={()=>removePhoto('banner')} style={{ height:32,padding:'0 14px',background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',borderRadius:8,fontSize:12,fontWeight:500,cursor:'pointer' }}>Remove banner</button>)}
        </div>
        <input ref={bannerRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>onFileSelected(e,'banner')}/>
      </div>

      {/* Avatar */}
      <div style={{ margin:'0 20px 20px' }}>
        <div style={{ fontSize:11,fontWeight:700,color:'var(--c-t3)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8 }}>Profile Photo</div>
        <div style={{ display:'flex',alignItems:'center',gap:16 }}>
          <div style={{ width:80,height:80,borderRadius:'50%',flexShrink:0,background:avatarUrl?'none':'#1d4ed8',backgroundImage:avatarUrl?'url('+avatarUrl+')':undefined,backgroundSize:'cover', backgroundPosition:'center center',border:'3px solid var(--c-line)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:24,fontWeight:800 }}>
            {!avatarUrl&&initials}
          </div>
          <div>
            <div style={{ fontSize:15,fontWeight:700,color:'var(--c-t1)' }}>{form.full_name||'Your Name'}</div>
            <div style={{ fontSize:12,color:'var(--c-t3)',marginTop:2 }}>{user?.email}</div>
            <div style={{ display:'flex',gap:8,marginTop:8 }}>
              <button onClick={()=>avatarRef.current?.click()} disabled={avatarUploading}
                style={{ height:30,padding:'0 12px',background:'var(--c-surface2)',border:'1px solid var(--c-line)',color:'var(--c-t2)',borderRadius:8,fontSize:12,fontWeight:500,cursor:'pointer' }}>
                {avatarUploading?'Uploading...':avatarUrl?'Change photo':'Upload photo'}
              </button>
              {avatarUrl&&(<button onClick={()=>removePhoto('avatar')} style={{ height:30,padding:'0 12px',background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',borderRadius:8,fontSize:12,fontWeight:500,cursor:'pointer' }}>Remove</button>)}
            </div>
          </div>
        </div>
        <input ref={avatarRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>onFileSelected(e,'avatar')}/>
      </div>

      {/* Form */}
      <form onSubmit={save} style={{ margin:'0 20px 16px',background:'var(--c-surface)',border:'1px solid var(--c-line)',borderRadius:18,padding:20 }}>
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
          {[{k:'full_name',label:'Full Name',ph:'Your full name'},{k:'username',label:'Username',ph:'e.g. glen123'}].map(({k,label,ph})=>(
            <div key={k}>
              <label style={{ display:'block',fontSize:11,fontWeight:700,color:'var(--c-t3)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6 }}>{label}</label>
              <input value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph} style={inp}
                onFocus={e=>e.target.style.borderColor='#3b82f6'} onBlur={e=>e.target.style.borderColor='var(--c-line)'}/>
            </div>
          ))}
          <div>
            <label style={{ display:'block',fontSize:11,fontWeight:700,color:'var(--c-t3)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6 }}>Bio</label>
            <textarea value={form.bio} onChange={e=>set('bio',e.target.value)} placeholder="Tell us about yourself..." rows={3}
              style={{ ...inp,height:'auto',padding:'10px 14px',resize:'none',lineHeight:1.6 }}
              onFocus={e=>e.target.style.borderColor='#3b82f6'} onBlur={e=>e.target.style.borderColor='var(--c-line)'}/>
          </div>
        </div>
        {error&&<div style={{ marginTop:14,padding:'10px 14px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,fontSize:13,color:'#dc2626' }}>{error}</div>}
        <div style={{ marginTop:20,display:'flex',gap:10,alignItems:'center' }}>
          <button type="submit" disabled={saving}
            style={{ height:40,padding:'0 20px',background:'#1d4ed8',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',opacity:saving?0.7:1 }}>
            {saving?'Saving...':'Save changes'}
          </button>
          <a href="/" style={{ fontSize:13,color:'var(--c-t3)',textDecoration:'none' }}>Cancel</a>
        </div>
      </form>

      {/* Sign out */}
      <div style={{ margin:'0 20px',background:'var(--c-surface)',border:'1px solid #fecaca',borderRadius:18,padding:20 }}>
        <div style={{ fontSize:13,fontWeight:700,color:'#dc2626',marginBottom:4 }}>Sign out</div>
        <p style={{ fontSize:12,color:'var(--c-t2)',marginBottom:12 }}>You will be signed out on this device.</p>
        <button onClick={async()=>{ await supabase.auth.signOut(); window.location.href='/auth' }}
          style={{ height:36,padding:'0 16px',background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer' }}>
          Sign out
        </button>
      </div>
    </div>
  )
}