'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const THEMES = [
  { id:'dark',   label:'Dark',   icon:'M13 8.5A5.5 5.5 0 016 2a6 6 0 100 12 5.5 5.5 0 007-5.5z' },
  { id:'system', label:'System', icon:'M2 3h12v10H2zm0 10h12M8 13v2' },
]

const GRADE_OPTIONS = ['K','1','2','3','4','5','6','7','8','9','10','11','12','College / University','Graduate School','Other']

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [profile,    setProfile]    = useState({ full_name:'', grade_level:'', role:'student', plan:'free' })
  const [theme,      setTheme]      = useState('system')
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [saveError,  setSaveError]  = useState('')
  const [loading,    setLoading]    = useState(true)
  const [avatarUrl,  setAvatarUrl]  = useState(null)
  const [bannerUrl,  setBannerUrl]  = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [linkCodeVal,     setLinkCodeVal]     = useState('')
  const [generatingCode,  setGeneratingCode]  = useState(false)
  const [linkCopied,      setLinkCopied]      = useState(false)
  const [regen,           setRegen]           = useState(false)

  const avatarRef    = useRef(null)
  const bannerRef    = useRef(null)
  // Track original role so we know if it changed and need a page reload
  const originalRole = useRef('student')

  useEffect(() => {
    if (user) loadProfile()
    const saved = localStorage.getItem('flashfo-theme') || 'system'
    setTheme(saved)
    applyTheme(saved, false)
  }, [user])

  async function loadProfile() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile({ full_name: data.full_name || '', grade_level: data.grade_level || '', role: data.role || 'student', plan: data.plan || 'free' })
      setAvatarUrl(data.avatar_url || null)
      setBannerUrl(data.banner_url || null)
      if (data.link_code) setLinkCodeVal(data.link_code)
      originalRole.current = data.role || 'student'
    }
    setLoading(false)
  }

  function makeCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return Array.from({length:8}, () => chars[Math.floor(Math.random()*chars.length)]).join('')
  }

  async function generateLinkCode() {
    setGeneratingCode(true)
    const code = makeCode()
    await supabase.from('profiles').update({ link_code: code }).eq('id', user.id)
    setLinkCodeVal(code)
    setGeneratingCode(false)
  }

  async function regenerateLinkCode() {
    setRegen(true)
    const code = makeCode()
    await supabase.from('profiles').update({ link_code: code }).eq('id', user.id)
    setLinkCodeVal(code)
    setRegen(false)
  }

  function applyTheme(t, store = true) {
    const root = document.documentElement
    if (t === 'dark')        root.classList.add('dark')
    else if (t === 'light')  root.classList.remove('dark')
    else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark')
      else root.classList.remove('dark')
    }
    if (store) { localStorage.setItem('flashfo-theme', t); setTheme(t) }
  }

  async function save() {
    if (!user) return
    setSaving(true)
    setSaveError('')

    // Use update() not upsert() — profile row always exists after sign-up
    // upsert can silently fail if RLS only permits UPDATE and not INSERT
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:   profile.full_name,
        grade_level: profile.grade_level,
        role:        profile.role,
      })
      .eq('id', user.id)

    setSaving(false)

    if (error) {
      // Surface the actual Supabase error so we know what's wrong
      setSaveError(error.message || 'Save failed. Check your Supabase RLS policies allow profile updates.')
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)

    // Role changed — must do a hard reload so Shell re-reads the updated profile
    // and shows the correct nav (student vs teacher).
    // router.push() alone won't do it because useAuth caches the profile in memory.
    if (profile.role !== originalRole.current) {
      originalRole.current = profile.role
      setTimeout(() => { window.location.href = '/dashboard' }, 700)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const uploadMedia = async (file, type) => {
    if (!user || !file) return
    const setter    = type === 'avatar' ? setAvatarUploading : setBannerUploading
    const urlSetter = type === 'avatar' ? setAvatarUrl       : setBannerUrl
    const field     = type === 'avatar' ? 'avatar_url'       : 'banner_url'
    setter(true)
    try {
      const ext    = file.name.split('.').pop()
      const path   = user.id + '/' + type + '.' + ext
      const bucket = type === 'avatar' ? 'avatars' : 'banners'
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert:true, contentType: file.type })
      if (upErr) throw upErr
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      urlSetter(data.publicUrl)
      await supabase.from('profiles').update({ [field]: data.publicUrl }).eq('id', user.id)
    } catch(e) { console.error(e) }
    setter(false)
  }

  if (authLoading || loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  if (!user && !authLoading) return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <p className="text-t2 mb-4">Please sign in to access settings.</p>
      <button onClick={() => router.push('/auth')} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold">Sign in</button>
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto w-full" style={{ paddingBottom:100 }}>
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-6">Settings</h1>

      {/* Profile */}
      <div className="bg-surface border border-line rounded-2xl p-5 mb-4">
        <h2 className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-4">Profile</h2>

        {/* Banner */}
        <div className="relative mb-4 cursor-pointer rounded-xl overflow-hidden" style={{ height:100 }} onClick={() => bannerRef.current?.click()}>
          {bannerUrl
            ? <img src={bannerUrl} alt="banner" className="w-full h-full object-cover"/>
            : <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-surface2 border border-dashed border-line">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-t3"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                <span className="text-[12px] text-t3">{bannerUploading ? 'Uploading…' : 'Upload banner'}</span>
              </div>
          }
        </div>
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files[0]) uploadMedia(e.target.files[0], 'banner') }}/>

        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative cursor-pointer flex-shrink-0" onClick={() => avatarRef.current?.click()}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-line"/>
              : <div className="w-16 h-16 rounded-full bg-blue-700 flex items-center justify-center text-white text-xl font-bold border-2 border-line">
                  {(profile.full_name || user?.email || 'U')[0].toUpperCase()}
                </div>
            }
            <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-t1">{profile.full_name || 'Your Name'}</p>
            <p className="text-[12px] text-t3">{user?.email}</p>
            <button onClick={() => avatarRef.current?.click()} className="text-[12px] text-blue-400 hover:text-blue-300 mt-0.5">
              {avatarUploading ? 'Uploading…' : 'Upload photo'}
            </button>
          </div>
        </div>
        <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files[0]) uploadMedia(e.target.files[0], 'avatar') }}/>

        {/* Form fields */}
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-t3 uppercase tracking-wider block mb-1.5">Full Name</label>
            <input value={profile.full_name} onChange={e => setProfile(p => ({...p, full_name: e.target.value}))} placeholder="Your full name"
              className="w-full h-10 px-3 rounded-xl bg-surface2 border border-line text-sm text-t1 outline-none focus:border-blue-500 transition-colors"/>
          </div>

          <div>
            <label className="text-[11px] font-bold text-t3 uppercase tracking-wider block mb-1.5">Role</label>
            <div className="flex gap-2">
              {['student','teacher','parent'].map(r => (
                <button key={r} onClick={() => setProfile(p => ({...p, role: r}))}
                  className={'flex-1 h-10 rounded-xl text-sm font-semibold border transition-colors ' + (profile.role === r ? 'bg-blue-600 border-blue-600 text-white' : 'bg-surface2 border-line text-t2 hover:border-blue-500')}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            {profile.role !== originalRole.current && (
              <p className="text-[11px] text-amber-500 mt-2">
                Changing role will reload the page to apply the new navigation.
              </p>
            )}
          </div>

          <div>
            <label className="text-[11px] font-bold text-t3 uppercase tracking-wider block mb-1.5">Grade / Level</label>
            <select value={profile.grade_level} onChange={e => setProfile(p => ({...p, grade_level: e.target.value}))}
              className="w-full h-10 px-3 rounded-xl bg-surface2 border border-line text-sm text-t1 outline-none focus:border-blue-500 transition-colors appearance-none">
              <option value="">Select grade...</option>
              {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 mt-5 flex-wrap">
          <button onClick={save} disabled={saving}
            className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved     && <span className="text-[12px] text-emerald-500 font-medium">Saved! {profile.role !== originalRole.current ? 'Redirecting…' : ''}</span>}
          {saveError && (
            <div style={{ flex:1, padding:'6px 10px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:8, fontSize:11, color:'#f87171', lineHeight:1.5 }}>
              <strong>Save failed:</strong> {saveError}
              {saveError.includes('policy') || saveError.includes('permission') || saveError.includes('42501') ? (
                <span> — Run this in Supabase SQL: <code style={{ background:'rgba(255,255,255,0.1)', padding:'1px 4px', borderRadius:3 }}>CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);</code></span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-surface border border-line rounded-2xl p-5 mb-4">
        <h2 className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-4">Appearance</h2>
        <div className="flex gap-2">
          {THEMES.map(t => (
            <button key={t.id} onClick={() => applyTheme(t.id)}
              className={'flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border transition-all ' + (theme===t.id ? 'bg-blue-700 border-blue-700 text-white' : 'bg-surface2 border-line text-t2 hover:border-blue-500')}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d={t.icon}/></svg>
              <span className="text-[11px] font-semibold">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Profile & Avatar */}
      <div className="bg-surface border border-line rounded-2xl p-5 mb-4">
        <h2 className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-3">Profile &amp; Avatar</h2>
        <p style={{ fontSize:13, color:'var(--c-t2)', marginBottom:14, lineHeight:1.5 }}>
          Set a creature avatar, add a tagline, and pick a flashcard colour theme from your profile page.
        </p>
        <a href="/profile" style={{ display:'inline-flex', alignItems:'center', gap:8, height:38, padding:'0 16px', background:'rgba(124,58,237,0.12)', border:'1px solid rgba(124,58,237,0.3)', color:'#a78bfa', borderRadius:10, fontSize:13, fontWeight:600, textDecoration:'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          Customise profile
        </a>
      </div>

      {/* Subscription */}
      <div className="bg-surface border border-line rounded-2xl p-5 mb-4">
        <h2 className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-4">Subscription</h2>
        {(() => {
          const plan = profile.plan || 'free'
          const isLifetime = plan === 'lifetime'
          const isPro      = plan === 'pro' || plan === 'student_pro'
          const isTeacher  = plan === 'teacher' || plan === 'school'
          if (isLifetime) return (
            <div className="flex items-center justify-between p-3 bg-surface2 rounded-xl mb-3" style={{ background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color:'#fbbf24' }}>Lifetime ✦</p>
                <p className="text-[12px] text-t3 mt-0.5">Unlimited access to everything, forever</p>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full" style={{ background:'rgba(251,191,36,0.12)', color:'#fbbf24', border:'1px solid rgba(251,191,36,0.25)' }}>Lifetime</span>
            </div>
          )
          if (isPro) return (
            <div className="flex items-center justify-between p-3 bg-surface2 rounded-xl mb-3" style={{ background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.2)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color:'#818cf8' }}>Student Pro ✦</p>
                <p className="text-[12px] text-t3 mt-0.5">Unlimited flashcards, quizzes, and Nova sessions</p>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full" style={{ background:'rgba(99,102,241,0.12)', color:'#818cf8', border:'1px solid rgba(99,102,241,0.25)' }}>Pro</span>
            </div>
          )
          if (isTeacher) return (
            <div className="flex items-center justify-between p-3 bg-surface2 rounded-xl mb-3" style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color:'#f59e0b' }}>Teacher Pro ★</p>
                <p className="text-[12px] text-t3 mt-0.5">Live classroom tools, assignments, and analytics</p>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full" style={{ background:'rgba(245,158,11,0.1)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.25)' }}>Teacher</span>
            </div>
          )
          // Free plan
          return (
            <>
              <div className="flex items-center justify-between p-3 bg-surface2 rounded-xl mb-3">
                <div>
                  <p className="text-sm font-semibold text-t1">Free Plan</p>
                  <p className="text-[12px] text-t3 mt-0.5">Basic access to all study tools</p>
                </div>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-surface text-t3 border border-line">Free</span>
              </div>
              <button onClick={() => router.push('/pricing')} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:9, border:'none', background:'linear-gradient(90deg,#4f46e5,#7c3aed)', color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
                Upgrade to Pro →
              </button>
            </>
          )
        })()}
      </div>

      {/* Share with Parent */}
      <div className="bg-surface border border-line rounded-2xl p-5 mb-4">
        <h2 className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-1">Share with Parent</h2>
        <p className="text-[12px] text-t3 mb-4">Give a parent or guardian visibility into your study activity.</p>
        {linkCodeVal ? (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-10 bg-surface2 border border-line rounded-xl px-4 flex items-center font-mono text-sm text-t1 tracking-widest select-all">{linkCodeVal}</div>
              <button onClick={() => { navigator.clipboard?.writeText(linkCodeVal); setLinkCopied(true); setTimeout(()=>setLinkCopied(false),2000) }}
                className="h-10 px-4 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 shrink-0">
                {linkCopied ? 'Copied!' : 'Copy code'}
              </button>
            </div>
            <p className="text-[12px] text-t3">Share this code with your parent. They enter it at flashfo.org/parent to link your account.</p>
            <button onClick={regenerateLinkCode} disabled={regen} className="mt-3 text-[12px] text-t3 hover:text-t2 underline">
              {regen ? 'Regenerating…' : 'Generate new code'}
            </button>
          </div>
        ) : (
          <button onClick={generateLinkCode} disabled={generatingCode} className="h-9 px-4 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-60">
            {generatingCode ? 'Generating…' : 'Generate parent link code'}
          </button>
        )}
      </div>

      {/* Account */}
      <div className="bg-surface border border-line rounded-2xl p-5">
        <h2 className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-4">Account</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-t2">Email</span>
            <span className="text-sm text-t3">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-line">
            <span className="text-sm text-t2">Member since</span>
            <span className="text-sm text-t3">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span>
          </div>
        </div>
        <button onClick={signOut} className="mt-4 w-full h-9 bg-red-500/10 text-red-500 border border-red-400/20 text-sm font-semibold rounded-xl hover:bg-red-500/20 transition-colors">
          Sign Out
        </button>
      </div>
    </div>
  )
}
