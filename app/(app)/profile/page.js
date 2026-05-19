'use client'
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'

// ── Creature avatars ──────────────────────────────────────────────────────────
const CREATURES = [
  { id: 'cat',     label: 'Cat'     },
  { id: 'alien',   label: 'Alien'   },
  { id: 'fox',     label: 'Fox'     },
  { id: 'dolphin', label: 'Dolphin' },
  { id: 'wizard',  label: 'Wizard'  },
]
function CreatureSVG({ id, size = 40 }) {
  const s = { width:size, height:size, viewBox:'0 0 60 60', xmlns:'http://www.w3.org/2000/svg', display:'block' }
  if (id==='cat') return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#1a2e1a"/><circle cx="30" cy="32" r="15" fill="#4ade80"/><ellipse cx="22" cy="18" rx="5" ry="8" fill="#86efac"/><ellipse cx="38" cy="18" rx="5" ry="8" fill="#86efac"/><ellipse cx="22" cy="20" rx="3.5" ry="5.5" fill="#4ade80"/><ellipse cx="38" cy="20" rx="3.5" ry="5.5" fill="#4ade80"/><circle cx="25" cy="30" r="5" fill="#fff"/><circle cx="35" cy="30" r="5" fill="#fff"/><circle cx="25" cy="30" r="3" fill="#166534"/><circle cx="35" cy="30" r="3" fill="#166534"/><circle cx="24" cy="29" r="1" fill="#fff"/><circle cx="34" cy="29" r="1" fill="#fff"/><ellipse cx="30" cy="36" rx="5" ry="2" fill="#86efac"/><path d="M27 38 Q30 41 33 38" stroke="#166534" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>)
  if (id==='alien') return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#0f172a"/><ellipse cx="30" cy="35" rx="16" ry="13" fill="#818cf8"/><circle cx="30" cy="22" r="12" fill="#a5b4fc"/><circle cx="30" cy="13" r="5" fill="#c7d2fe"/><ellipse cx="22" cy="22" rx="4" ry="7" fill="#6366f1"/><ellipse cx="38" cy="22" rx="4" ry="7" fill="#6366f1"/><circle cx="26" cy="22" r="4.5" fill="#fff"/><circle cx="34" cy="22" r="4.5" fill="#fff"/><circle cx="26" cy="22" r="2.8" fill="#312e81"/><circle cx="34" cy="22" r="2.8" fill="#312e81"/><circle cx="25" cy="21" r="1" fill="#fff"/><circle cx="33" cy="21" r="1" fill="#fff"/><ellipse cx="30" cy="29" rx="4" ry="1.5" fill="#c7d2fe"/><path d="M27 31 Q30 34 33 31" stroke="#312e81" strokeWidth="1.4" fill="none" strokeLinecap="round"/></svg>)
  if (id==='fox') return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#2d1a00"/><ellipse cx="30" cy="38" rx="14" ry="11" fill="#f97316"/><circle cx="30" cy="24" r="12" fill="#f97316"/><ellipse cx="30" cy="13" rx="7" ry="4.5" fill="#fb923c"/><rect x="27.5" y="9" width="5" height="7" rx="2.5" fill="#fb923c"/><circle cx="25" cy="23" r="4.5" fill="#fff"/><circle cx="35" cy="23" r="4.5" fill="#fff"/><circle cx="25" cy="23" r="2.8" fill="#431407"/><circle cx="35" cy="23" r="2.8" fill="#431407"/><circle cx="24" cy="22" r="1" fill="#fff"/><circle cx="34" cy="22" r="1" fill="#fff"/><ellipse cx="24" cy="28" rx="3.5" ry="1.8" fill="#fed7aa" opacity="0.65"/><ellipse cx="36" cy="28" rx="3.5" ry="1.8" fill="#fed7aa" opacity="0.65"/><path d="M27 30 Q30 33 33 30" stroke="#431407" strokeWidth="1.4" fill="none" strokeLinecap="round"/><circle cx="19" cy="22" r="3" fill="#fb923c"/><circle cx="41" cy="22" r="3" fill="#fb923c"/></svg>)
  if (id==='dolphin') return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#001a2d"/><circle cx="30" cy="26" r="14" fill="#38bdf8"/><ellipse cx="18" cy="24" rx="5" ry="9" fill="#7dd3fc"/><ellipse cx="42" cy="24" rx="5" ry="9" fill="#7dd3fc"/><circle cx="25" cy="24" r="5" fill="#fff"/><circle cx="35" cy="24" r="5" fill="#fff"/><circle cx="25" cy="24" r="3" fill="#0c4a6e"/><circle cx="35" cy="24" r="3" fill="#0c4a6e"/><circle cx="24" cy="23" r="1.1" fill="#fff"/><circle cx="34" cy="23" r="1.1" fill="#fff"/><ellipse cx="30" cy="31" rx="4" ry="1.5" fill="#bae6fd"/><path d="M27 33 Q30 36 33 33" stroke="#0c4a6e" strokeWidth="1.4" fill="none" strokeLinecap="round"/><ellipse cx="30" cy="47" rx="12" ry="6" fill="#0ea5e9"/><path d="M14 43 Q8 35 14 28" stroke="#38bdf8" strokeWidth="4" fill="none" strokeLinecap="round"/><path d="M46 43 Q52 35 46 28" stroke="#38bdf8" strokeWidth="4" fill="none" strokeLinecap="round"/></svg>)
  if (id==='wizard') return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#1a0a2e"/><ellipse cx="30" cy="42" rx="16" ry="12" fill="#a855f7"/><circle cx="30" cy="24" r="13" fill="#c084fc"/><path d="M17 20 Q30 7 43 20 L42 16 Q30 5 18 16Z" fill="#7e22ce"/><circle cx="25" cy="24" r="4" fill="#fff"/><circle cx="35" cy="24" r="4" fill="#fff"/><circle cx="25" cy="24" r="2.5" fill="#581c87"/><circle cx="35" cy="24" r="2.5" fill="#581c87"/><circle cx="24" cy="23" r="0.9" fill="#fff"/><circle cx="34" cy="23" r="0.9" fill="#fff"/><ellipse cx="24" cy="29" rx="3.5" ry="1.5" fill="#e9d5ff" opacity="0.65"/><ellipse cx="36" cy="29" rx="3.5" ry="1.5" fill="#e9d5ff" opacity="0.65"/><path d="M27 31 Q30 34 33 31" stroke="#581c87" strokeWidth="1.4" fill="none" strokeLinecap="round"/><circle cx="17" cy="30" r="4" fill="#a855f7"/><circle cx="43" cy="30" r="4" fill="#a855f7"/></svg>)
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// CropModal — fully fixed for mobile
//
// Root cause of mobile bugs:
// 1. dispW=600 hardcoded, but mobile container is ~343px. Coordinates computed
//    in a 600px space don't match what the user actually sees → drag feels stuck.
// 2. onMouseMove/onTouchMove used stale closure values for imgX/imgY.
// 3. Separate mouse+touch handlers missed cases (e.g. touch-cancel).
//
// Fixes:
// 1. containerRef + ResizeObserver measures actual rendered size → all calcs
//    use real px, not the 600px assumption.
// 2. Refs (posRef, scaleRef, natRef, sizeRef) replace closed-over state in
//    all event handlers → no more stale values.
// 3. Pointer Events API (onPointerDown/Move/Up) handles both mouse and touch
//    with setPointerCapture for reliable capture even when pointer leaves element.
// ─────────────────────────────────────────────────────────────────────────────
function CropModal({ file, dispW, dispH, outW, outH, title, onApply, onCancel }) {
  const [imgSrc,  setImgSrc]  = useState(null)
  const [pos,     setPos]     = useState({ x: 0, y: 0 })
  const [scale,   setScale]   = useState(1)
  const [nat,     setNat]     = useState({ w: 0, h: 0 })
  const [preview, setPreview] = useState(null)
  const [blob,    setBlob]    = useState(null)

  // Refs — always current values used inside event handlers
  const posRef       = useRef({ x: 0, y: 0 })
  const scaleRef     = useRef(1)
  const natRef       = useRef({ w: 0, h: 0 })
  const sizeRef      = useRef({ w: dispW, h: dispH }) // actual rendered container size
  const dragging     = useRef(false)
  const containerRef = useRef(null)

  // Helpers: update ref AND trigger re-render
  function setPos2(p)   { posRef.current = p;   setPos({ ...p }) }
  function setScale2(s) { scaleRef.current = s; setScale(s) }

  // Measure actual container size on mount + on resize
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    function measure() {
      const r = el.getBoundingClientRect()
      if (r.width > 0) sizeRef.current = { w: r.width, h: r.height }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Load file → object URL
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Clamp so image always covers the container
  function clampPos(x, y, s, nw, nh) {
    const { w, h } = sizeRef.current
    const iw = nw * s, ih = nh * s
    return {
      x: Math.min(0, Math.max(w - iw, x)),
      y: Math.min(0, Math.max(h - ih, y)),
    }
  }

  // Image loaded — compute initial scale and centred position
  function onImgLoad(e) {
    const nw = e.target.naturalWidth
    const nh = e.target.naturalHeight
    natRef.current = { w: nw, h: nh }
    setNat({ w: nw, h: nh })
    const { w, h } = sizeRef.current
    const s = Math.max(w / nw, h / nh)
    setScale2(s)
    const p = clampPos((w - nw * s) / 2, (h - nh * s) / 2, s, nw, nh)
    setPos2(p)
  }

  // Pointer Events — handles mouse AND touch uniformly
  function onPointerDown(e) {
    e.preventDefault()
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId) // ensures move/up fire even outside element
    e.currentTarget._lastX = e.clientX
    e.currentTarget._lastY = e.clientY
  }
  function onPointerMove(e) {
    if (!dragging.current || !natRef.current.w) return
    const dx = e.clientX - e.currentTarget._lastX
    const dy = e.clientY - e.currentTarget._lastY
    e.currentTarget._lastX = e.clientX
    e.currentTarget._lastY = e.clientY
    const p = clampPos(posRef.current.x + dx, posRef.current.y + dy, scaleRef.current, natRef.current.w, natRef.current.h)
    setPos2(p)
  }
  function onPointerUp() { dragging.current = false }

  // Scroll / wheel to zoom
  function onWheel(e) {
    e.preventDefault()
    if (!natRef.current.w) return
    const { w, h } = sizeRef.current
    const minS = Math.max(w / natRef.current.w, h / natRef.current.h)
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    const newS = Math.min(10, Math.max(minS, scaleRef.current * factor))
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const newX = mx - (mx - posRef.current.x) * (newS / scaleRef.current)
    const newY = my - (my - posRef.current.y) * (newS / scaleRef.current)
    const p = clampPos(newX, newY, newS, natRef.current.w, natRef.current.h)
    setScale2(newS)
    setPos2(p)
  }

  // Export crop using actual container size for correct source mapping
  function applyCrop() {
    if (!natRef.current.w || !imgSrc) return
    const { w, h } = sizeRef.current
    const s = scaleRef.current
    const srcX = -posRef.current.x / s
    const srcY = -posRef.current.y / s
    const srcW = w / s
    const srcH = h / s
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = outW
      canvas.height = outH
      canvas.getContext('2d').drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      setPreview(dataUrl)
      canvas.toBlob(b => setBlob(b), 'image/jpeg', 0.92)
    }
    img.src = imgSrc
  }

  function confirmUpload() {
    if (blob) onApply(new File([blob], 'cropped.jpg', { type: 'image/jpeg' }))
  }

  const btn = (extra) => ({
    height: 38, padding: '0 18px', border: 'none', borderRadius: 10,
    fontSize: 13, fontWeight: 700, cursor: 'pointer', ...extra,
  })

  // ── Preview / Confirm ──
  if (preview) return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16, touchAction:'none' }}>
      <div style={{ background:'var(--c-surface)', borderRadius:20, padding:24, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ fontSize:15, fontWeight:700, color:'var(--c-t1)', marginBottom:4 }}>Looks good?</div>
        <div style={{ fontSize:12, color:'var(--c-t3)', marginBottom:14 }}>This is exactly what will be uploaded.</div>
        <img src={preview} alt="Crop preview" style={{ width:'100%', borderRadius:12, display:'block' }}/>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 }}>
          <button onClick={() => { setPreview(null); setBlob(null) }} style={btn({ background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)' })}>← Edit crop</button>
          <button onClick={confirmUpload} style={btn({ background:'#1d4ed8', color:'white' })}>Upload</button>
        </div>
      </div>
    </div>
  )

  // ── Crop ──
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16, touchAction:'none' }}>
      <div style={{ background:'var(--c-surface)', borderRadius:20, padding:20, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ fontSize:15, fontWeight:700, color:'var(--c-t1)', marginBottom:4 }}>{title}</div>
        <div style={{ fontSize:12, color:'var(--c-t3)', marginBottom:14 }}>Drag to reposition · Pinch or scroll to zoom</div>

        {/* Crop window — aspect ratio maintained via paddingBottom trick */}
        {/* containerRef measures actual rendered px so coordinates are correct on all screen sizes */}
        <div
          ref={containerRef}
          style={{
            width: '100%',
            paddingBottom: `${(dispH / dispW) * 100}%`,
            position: 'relative',
            borderRadius: 12,
            overflow: 'hidden',
            cursor: 'grab',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none', // let JS handle all touch
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          <div style={{ position:'absolute', inset:0 }}>
            {imgSrc && (
              <img
                src={imgSrc}
                onLoad={onImgLoad}
                draggable={false}
                style={{
                  position: 'absolute',
                  left:   pos.x + 'px',
                  top:    pos.y + 'px',
                  width:  nat.w ? nat.w * scale + 'px' : 'auto',
                  height: nat.h ? nat.h * scale + 'px' : 'auto',
                  maxWidth: 'none',
                  userSelect: 'none',
                  pointerEvents: 'none',
                  WebkitUserSelect: 'none',
                }}
              />
            )}
            {/* Rule-of-thirds grid overlay */}
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
  const { user, profile, loading, refreshProfile } = useAuth()
  const [form,    setForm]    = useState({ full_name: '', username: '', bio: '' })
  const [mounted, setMounted] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const [avatarUrl,       setAvatarUrl]       = useState(null)
  const [bannerUrl,       setBannerUrl]       = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)

  const [cropFile, setCropFile] = useState(null)
  const [cropType, setCropType] = useState(null)

  // Customisation
  const [avatarId,     setAvatarId]     = useState(null)
  const [tagline,      setTagline]      = useState('')
  const [theme,        setTheme]        = useState('default')
  const [savingPrefs,  setSavingPrefs]  = useState(false)

  // Role — teacher | student
  const [role,        setRole]        = useState('student')
  const [roleSaving,  setRoleSaving]  = useState(false)

  const avatarRef = useRef()
  const bannerRef = useRef()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (mounted && !loading && !user) window.location.href = '/auth'
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        username:  profile.username  || '',
        bio:       profile.bio       || '',
      })
      setAvatarUrl(profile.avatar_url    || null)
      setBannerUrl(profile.banner_url    || null)
      setAvatarId(profile.avatar_id      || null)
      setTagline(profile.tagline         || '')
      setTheme(profile.flashcard_theme   || 'default')
      setRole(profile.role               || 'student')
    }
  }, [user, profile, loading, mounted])

  // ── Upload helpers ────────────────────────────────────────────────────────
  async function uploadFile(file, bucket, setUrl, setUploading) {
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
      if (bucket === 'avatars') await refreshProfile()
    } catch(e) {
      setError(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // Fix: Remove now clears DB too (not just local state)
  async function removeImage(type) {
    const field = type === 'avatar' ? 'avatar_url' : 'banner_url'
    if (type === 'avatar') setAvatarUrl(null)
    else setBannerUrl(null)
    await supabase.from('profiles').update({ [field]: null }).eq('id', user.id)
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
    else                   await uploadFile(croppedFile, 'banners', setBannerUrl, setBannerUploading)
  }

  async function savePrefs() {
    setSavingPrefs(true)
    await supabase.from('profiles').update({ avatar_id: avatarId, tagline, flashcard_theme: theme }).eq('id', user.id)
    await refreshProfile()
    setSavingPrefs(false)
  }

  // Fix: save role to DB and refresh so MobileShell picks it up immediately
  async function saveRole(newRole) {
    setRoleSaving(true)
    setRole(newRole)
    await supabase.from('profiles').update({ role: newRole }).eq('id', user.id)
    await refreshProfile()
    setRoleSaving(false)
  }

  async function save(e) {
    e.preventDefault(); setSaving(true); setError('')
    const { error: err } = await supabase.rpc('upsert_own_profile', {
      p_full_name: form.full_name,
      p_username:  form.username || null,
      p_bio:       form.bio      || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    window.location.href = '/dashboard'
  }

  if (!mounted || loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh', color:'var(--c-t3)', fontSize:14 }}>
      Loading...
    </div>
  )

  const inp = {
    width: '100%', height: 44, padding: '0 14px',
    background: 'var(--c-surface2)', border: '1px solid var(--c-line)',
    borderRadius: 12, fontSize: 14, color: 'var(--c-t1)',
    outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.2s', boxSizing: 'border-box',
  }
  const btn = (extra) => ({
    height: 36, padding: '0 14px', borderRadius: 10,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', ...extra,
  })

  return (
    <div style={{ maxWidth: 660, margin: '0 auto', paddingBottom: 40 }}>

      {/* Crop modal */}
      {cropFile && (
        <CropModal
          file={cropFile}
          dispW={600}
          dispH={cropType === 'avatar' ? 600 : 200}
          outW={cropType === 'avatar' ? 400  : 1200}
          outH={cropType === 'avatar' ? 400  : 400}
          title={cropType === 'avatar' ? 'Crop profile photo' : 'Crop banner photo'}
          onApply={onCropApply}
          onCancel={() => { setCropFile(null); setCropType(null) }}
        />
      )}

      {/* Hidden file inputs — outside buttons so mobile doesn't block .click() */}
      <input ref={bannerRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => onFileSelected(e, 'banner')}/>
      <input ref={avatarRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => onFileSelected(e, 'avatar')}/>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'24px 20px 20px' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--c-t1)', marginBottom:4, letterSpacing:'-0.3px' }}>Profile</h1>
          <p style={{ fontSize:13, color:'var(--c-t2)' }}>Manage your Flashfo account.</p>
        </div>
        <a href="/dashboard" style={btn({ background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)', textDecoration:'none', display:'inline-flex', alignItems:'center' })}>← Dashboard</a>
      </div>

      {/* Banner + Avatar */}
      <div style={{ margin:'0 0 4px', position:'relative' }}>
        {/* Banner */}
        <div
          style={{
            height: 160, borderRadius:'12px 12px 0 0',
            background: bannerUrl ? 'none' : 'linear-gradient(135deg,rgba(37,99,235,0.3) 0%,rgba(124,58,237,0.3) 100%)',
            backgroundImage:    bannerUrl ? `url(${bannerUrl})` : undefined,
            backgroundSize:     'cover',
            backgroundPosition: 'center',
            position:  'relative',
            border:    '1px solid var(--c-line)',
            borderBottom: 'none',
            overflow:  'hidden',
            cursor: 'pointer',
          }}
          onClick={() => bannerRef.current?.click()}
        >
          {/* Hover overlay with upload prompt */}
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, opacity: bannerUrl ? 0 : 1 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.8)', fontWeight:500 }}>
                {bannerUploading ? 'Uploading...' : 'Upload banner'}
              </span>
            </div>
          </div>

          {/* Change / Remove buttons — fix: Remove now updates DB */}
          {bannerUrl && (
            <div style={{ position:'absolute', bottom:10, right:10, display:'flex', gap:6 }}>
              <button
                onClick={e => { e.stopPropagation(); bannerRef.current?.click() }}
                style={{ padding:'5px 10px', borderRadius:7, border:'1px solid rgba(255,255,255,0.3)', background:'rgba(0,0,0,0.55)', color:'#fff', fontSize:11, fontWeight:500, cursor:'pointer', backdropFilter:'blur(4px)' }}
              >
                Change
              </button>
              <button
                onClick={async e => { e.stopPropagation(); await removeImage('banner') }}
                style={{ padding:'5px 10px', borderRadius:7, border:'1px solid rgba(255,255,255,0.3)', background:'rgba(0,0,0,0.55)', color:'#fff', fontSize:11, fontWeight:500, cursor:'pointer', backdropFilter:'blur(4px)' }}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Avatar row */}
        <div style={{ padding:'0 20px', marginTop:-40, marginBottom:12, display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
          <div
            onClick={() => avatarRef.current?.click()}
            style={{
              width:80, height:80, borderRadius:'50%', flexShrink:0,
              background:         avatarUrl ? 'none' : '#1d4ed8',
              backgroundImage:    avatarUrl ? `url(${avatarUrl})` : undefined,
              backgroundSize:     'cover',
              backgroundPosition: 'center',
              border:    '3px solid var(--c-surface)',
              cursor:    'pointer',
              overflow:  'hidden',
              display:   'flex',
              alignItems:'center', justifyContent:'center',
            }}
          >
            {!avatarUrl && (
              <span style={{ fontSize:22, fontWeight:700, color:'#fff' }}>
                {(form.full_name || user?.email || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
              </span>
            )}
          </div>

          <div style={{ display:'flex', gap:8, paddingBottom:4 }}>
            <button type="button" onClick={() => avatarRef.current?.click()} disabled={avatarUploading}
              style={btn({ background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)' })}>
              {avatarUploading ? 'Uploading...' : 'Change photo'}
            </button>
            {/* Fix: Remove now updates DB */}
            {avatarUrl && (
              <button type="button" onClick={() => removeImage('avatar')}
                style={btn({ background:'none', border:'1px solid var(--c-line)', color:'var(--c-t3)' })}>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Account type (teacher / student) ── */}
      <div style={{ margin:'0 20px 4px', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:18, padding:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>
          I am a…
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {[
            { value:'student', label:'Student', desc:'Study tools, join classes, track progress' },
            { value:'teacher', label:'Teacher', desc:'Create classes, run live quizzes, manage students' },
          ].map(r => (
            <button
              key={r.value}
              disabled={roleSaving}
              onClick={() => saveRole(r.value)}
              style={{
                flex:1, padding:'12px 14px', borderRadius:12, cursor:'pointer', textAlign:'left',
                border:       role === r.value ? '2px solid #7c3aed' : '1px solid var(--c-line)',
                background:   role === r.value ? 'rgba(124,58,237,0.08)' : 'var(--c-surface2)',
                transition:   'all 0.15s',
                fontFamily:   'inherit',
                opacity:      roleSaving ? 0.6 : 1,
              }}
            >
              <div style={{ fontSize:13, fontWeight:700, color: role === r.value ? '#a78bfa' : 'var(--c-t1)', marginBottom:4 }}>
                {r.label} {role === r.value && '✓'}
              </div>
              <div style={{ fontSize:11, color:'var(--c-t3)', lineHeight:1.4 }}>{r.desc}</div>
            </button>
          ))}
        </div>
        <p style={{ fontSize:11, color:'var(--c-t3)', marginTop:10, marginBottom:0 }}>
          This updates your navigation and available features immediately.
        </p>
      </div>

      {/* Creature, Tagline, Theme */}
      <div style={{ margin:'0 20px 4px', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:18, padding:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>Creature Avatar</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:8 }}>
          {CREATURES.map(cr => (
            <div key={cr.id} onClick={() => setAvatarId(avatarId === cr.id ? null : cr.id)}
              style={{ width:52, height:52, borderRadius:'50%', cursor:'pointer', border: avatarId === cr.id ? '2.5px solid #7c3aed' : '2.5px solid transparent', overflow:'hidden', flexShrink:0 }}>
              <CreatureSVG id={cr.id} size={52}/>
            </div>
          ))}
          {avatarId && (
            <div onClick={() => setAvatarId(null)}
              style={{ width:52, height:52, borderRadius:'50%', cursor:'pointer', border:'1px dashed var(--c-line)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'var(--c-t3)' }}>
              Clear
            </div>
          )}
        </div>
        <p style={{ fontSize:11, color:'var(--c-t3)', marginBottom:20 }}>Pick a creature. Uploading a profile photo overrides it.</p>

        <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Tagline</div>
        <input value={tagline} onChange={e => setTagline(e.target.value)} maxLength={60}
          placeholder="e.g. Pre-med 2027 · UCD"
          style={{ ...inp, height:40, marginBottom:20 }}/>

        <div style={{ fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Flashcard Theme</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {[
            { id:'default',  label:'Purple',   color:'#2d1b69' },
            { id:'midnight', label:'Midnight',  color:'#0f1f3d' },
            { id:'forest',   label:'Forest',    color:'#0d2b1d' },
            { id:'ember',    label:'Ember',     color:'#2b1200' },
          ].map(t => (
            <div key={t.id} onClick={() => setTheme(t.id)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10, border: theme === t.id ? '2px solid #7c3aed' : '1px solid var(--c-line)', background:'var(--c-surface2)', cursor:'pointer' }}>
              <div style={{ width:18, height:18, borderRadius:4, background:t.color }}/>
              <span style={{ fontSize:12, color:'var(--c-t1)' }}>{t.label}</span>
            </div>
          ))}
        </div>
        <button type="button" onClick={savePrefs} disabled={savingPrefs}
          style={{ marginTop:16, height:36, padding:'0 18px', background:'#7c3aed', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', opacity: savingPrefs ? 0.6 : 1 }}>
          {savingPrefs ? 'Saving...' : 'Save preferences'}
        </button>
      </div>

      {/* Form */}
      <form onSubmit={save} style={{ margin:'0 20px 4px', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:18, padding:20 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {[
            { k:'full_name', label:'Full Name', ph:'Your full name' },
            { k:'username',  label:'Username',  ph:'e.g. glen123'   },
          ].map(({ k, label, ph }) => (
            <div key={k}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{label}</label>
              <input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph} style={inp}
                onFocus={e  => e.target.style.borderColor = '#3b82f6'}
                onBlur={e   => e.target.style.borderColor = 'var(--c-line)'}/>
            </div>
          ))}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Bio</label>
            <textarea value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Tell us about yourself..." rows={3}
              style={{ ...inp, height:'auto', padding:'10px 14px', resize:'none', lineHeight:1.6 }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e  => e.target.style.borderColor = 'var(--c-line)'}/>
          </div>
        </div>
        {error && <div style={{ marginTop:14, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, fontSize:13, color:'#dc2626' }}>{error}</div>}
        <div style={{ marginTop:20, display:'flex', gap:10, alignItems:'center' }}>
          <button type="submit" disabled={saving}
            style={{ height:40, padding:'0 20px', background:'#1d4ed8', color:'white', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <a href="/dashboard" style={{ fontSize:13, color:'var(--c-t3)', textDecoration:'none' }}>Cancel</a>
        </div>
      </form>

      {/* Plan */}
      <div style={{ margin:'0 20px 4px', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:18, padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--c-t1)', marginBottom:2 }}>Current plan</div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:4 }}>
              {(profile?.plan === 'pro' || profile?.plan === 'teacher' || profile?.plan === 'school') ? (
                <span style={{ background:'linear-gradient(90deg,#6366f1,#a78bfa)', color:'#fff', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>
                  {profile.plan === 'teacher' ? 'Teacher' : profile.plan === 'school' ? 'School' : 'Pro'} ✦
                </span>
              ) : (
                <span style={{ background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)', color:'#818cf8', fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20 }}>
                  Free
                </span>
              )}
            </div>
          </div>
          {(!profile?.plan || profile?.plan === 'free') && (
            <a href="/pricing" style={{ display:'inline-flex', alignItems:'center', gap:5, height:36, padding:'0 14px', background:'linear-gradient(90deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:10, fontSize:12, fontWeight:700, textDecoration:'none' }}>
              Upgrade →
            </a>
          )}
        </div>
        {(!profile?.plan || profile?.plan === 'free') && (
          <div style={{ fontSize:12, color:'var(--c-t2)', lineHeight:1.5 }}>
            Upgrade to Pro for unlimited AI generation, priority access, and advanced features.
          </div>
        )}
        {(profile?.plan === 'pro' || profile?.plan === 'teacher' || profile?.plan === 'school') && (
          <div style={{ fontSize:12, color:'var(--c-t2)' }}>
            You're on the {profile.plan} plan. Thank you for supporting Flashfo! 🎉
          </div>
        )}
      </div>

      {/* Sign out */}
      <div style={{ margin:'0 20px', background:'var(--c-surface)', border:'1px solid #fecaca', borderRadius:18, padding:20 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#dc2626', marginBottom:4 }}>Sign out</div>
        <p style={{ fontSize:12, color:'var(--c-t2)', marginBottom:12 }}>You will be signed out on this device.</p>
        <button
          onClick={async () => { await supabase.auth.signOut(); window.location.href = '/auth' }}
          style={{ height:36, padding:'0 16px', background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer' }}
        >
          Sign out
        </button>
      </div>

    </div>
  )
}
