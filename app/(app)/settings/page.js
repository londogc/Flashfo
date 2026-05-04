'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const THEMES = [
  { id:'light', label:'Light', icon:'M8 1v1M8 14v1M1 8h1M14 8h1M3 3l.7.7M12.3 12.3l.7.7M3 13l.7-.7M12.3 3.7l.7-.7M11 8a3 3 0 11-6 0 3 3 0 016 0z' },
  { id:'dark',  label:'Dark',  icon:'M13 8.5A5.5 5.5 0 016 2a6 6 0 100 12 5.5 5.5 0 007-5.5z' },
  { id:'system',label:'System',icon:'M2 3h12v10H2zm0 10h12M8 13v2' },
]

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState({ full_name:'', grade_level:'', role:'student', plan:'', dashboard_preference:'student' })
  const [theme, setTheme] = useState('system')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [bannerUrl, setBannerUrl] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const avatarRef = useRef(null)
  const bannerRef = useRef(null)

  useEffect(() => {
    if (user) loadProfile()
    // Read current theme from localStorage
    const savedTheme = localStorage.getItem('ff-theme')
    if (savedTheme) setTheme(savedTheme)
    else setTheme('system')
    // Sync dashboard preference from localStorage into state
    // so the toggle shows correct value before DB responds
    const savedPref = localStorage.getItem('ff-dashboard-pref')
    if (savedPref) setProfile(p => ({ ...p, dashboard_preference: savedPref }))
  }, [user, authLoading])

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setProfile({ full_name: data.full_name||'', grade_level: data.grade_level||'', role: data.role||'student', plan: data.plan||'', dashboard_preference: data.dashboard_preference||'student' })
    if (data.avatar_url) setAvatarUrl(data.avatar_url)
    if (data.banner_url) setBannerUrl(data.banner_url)
    setLoading(false)
  }

  async function saveProfile() {
    if (!user) return
    setSaving(true)
    // Always write preference to localStorage so dashboard switches immediately
    // even if the DB column doesn't exist yet
    if (profile.dashboard_preference) {
      localStorage.setItem('ff-dashboard-pref', profile.dashboard_preference)
    }
    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: profile.full_name,
        grade_level: profile.grade_level,
        role: profile.role,
        dashboard_preference: profile.dashboard_preference,
      })
    } catch {}
    setSaved(true)
    setSaving(false)
    // Redirect so dashboard immediately reflects the new preference
    setTimeout(() => router.push('/dashboard'), 700)
  }

  function applyTheme(t) {
    setTheme(t)
    if (t === 'dark') {
      document.documentElement.classList.add('dark')
      localStorage.setItem('ff-theme', 'dark')
    } else if (t === 'light') {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('ff-theme', 'light')
    } else {
      const sys = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', sys)
      localStorage.removeItem('ff-theme')
    }
  }

  async function saveDashboardPreference(pref) {
    if (!user) return
    // Write localStorage immediately — works even before migration is run
    localStorage.setItem('ff-dashboard-pref', pref)
    // Update local state so toggle reflects selection instantly
    setProfile(p => ({ ...p, dashboard_preference: pref }))
    // Attempt DB save — if column doesn't exist yet it fails silently,
    // localStorage keeps it working until migration is run
    try {
      await supabase.from('profiles').upsert({ id: user.id, dashboard_preference: pref })
    } catch {}
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const GRADE_OPTIONS = ['K','1','2','3','4','5','6','7','8','9','10','11','12','College / University','Graduate School','Other']

  if (authLoading || loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  if (!user && !authLoading) return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20v-2a8 8 0 0116 0v2"/></svg>
      </div>
      <h2 className="text-xl font-bold text-t1 mb-2">Settings</h2>
      <p className="text-sm text-t3 mb-6">Sign in to manage your account preferences.</p>
      <a href="/auth" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm">Sign in →</a>
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto w-full pb-32">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-6">Settings</h1>

      {/* Profile */}
      <div className="bg-surface border border-line rounded-2xl p-5 mb-4">
        <h2 className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-4">Profile</h2>
        {/* ── Banner ── */}
        <div
          onClick={() => bannerRef.current?.click()}
          className="relative mb-4 rounded-xl overflow-hidden cursor-pointer"
          style={{ height:120, background: bannerUrl ? 'none' : 'linear-gradient(135deg,rgba(37,99,235,0.25) 0%,rgba(124,58,237,0.25) 100%)', backgroundImage: bannerUrl ? 'url('+bannerUrl+')' : undefined, backgroundSize:'cover', backgroundPosition:'center', border:'1px solid var(--c-line)' }}>
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors">
            <div className="flex flex-col items-center gap-1 opacity-70">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              <span className="text-white text-xs font-medium">{bannerUploading ? 'Uploading...' : bannerUrl ? 'Change banner' : 'Upload banner'}</span>
            </div>
          </div>
          {bannerUrl && (
            <div className="absolute bottom-2 right-2 flex gap-2">
              <button onClick={e=>{e.stopPropagation();bannerRef.current?.click()}}
                className="px-2.5 py-1 rounded-md text-white text-xs font-medium"
                style={{background:'rgba(0,0,0,0.55)',border:'1px solid rgba(255,255,255,0.25)'}}>Change</button>
              <button onClick={e=>{e.stopPropagation();setBannerUrl(null)}}
                className="px-2.5 py-1 rounded-md text-white text-xs font-medium"
                style={{background:'rgba(0,0,0,0.55)',border:'1px solid rgba(255,255,255,0.25)'}}>Remove</button>
            </div>
          )}
        </div>

        {/* ── Avatar + name ── */}
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-line">
          <div
            onClick={() => avatarRef.current?.click()}
            className="w-14 h-14 rounded-full flex-shrink-0 cursor-pointer relative overflow-hidden"
            style={{ background: avatarUrl ? 'none' : '#1d4ed8', backgroundImage: avatarUrl ? 'url('+avatarUrl+')' : undefined, backgroundSize:'cover', backgroundPosition:'center', border:'2px solid var(--c-line)' }}>
            {!avatarUrl && <span className="flex items-center justify-center w-full h-full text-white text-xl font-bold">{(profile.full_name || user?.email || 'U').charAt(0).toUpperCase()}</span>}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" className="opacity-0 hover:opacity-100"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-t1">{profile.full_name || 'No name set'}</p>
            <p className="text-[12px] text-t3">{user?.email}</p>
            <button onClick={()=>avatarRef.current?.click()} disabled={avatarUploading}
              className="text-[11px] text-blue-400 hover:text-blue-300 mt-0.5 disabled:opacity-50">
              {avatarUploading ? 'Uploading...' : avatarUrl ? 'Change photo' : 'Upload photo'}
            </button>
          </div>
        </div>

        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)uploadMedia(f,'banner')}}/>
        <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)uploadMedia(f,'avatar')}}/>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-t3 uppercase tracking-wider mb-1.5">Full Name</label>
            <input value={profile.full_name} onChange={e=>setProfile(p=>({...p,full_name:e.target.value}))}
              placeholder="Your name"
              className="w-full h-9 bg-surface2 border border-line rounded-lg px-3 text-sm text-t1 outline-none focus:border-blue-400"/>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-t3 uppercase tracking-wider mb-1.5">Role</label>
            <div className="flex gap-2">
              {['student','teacher'].map(r => (
                <button key={r} onClick={()=>setProfile(p=>({...p,role:r}))}
                  className={'flex-1 h-9 rounded-lg border text-sm font-medium capitalize transition-all ' + (profile.role===r ? 'bg-blue-700 text-white border-blue-700' : 'bg-surface2 text-t2 border-line hover:border-blue-300')}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-t3 uppercase tracking-wider mb-1.5">Grade / Level</label>
            <select value={profile.grade_level} onChange={e=>setProfile(p=>({...p,grade_level:e.target.value}))}
              className="w-full h-9 bg-surface2 border border-line rounded-lg px-3 text-sm text-t1 outline-none focus:border-blue-400">
              <option value="">Select grade...</option>
              {GRADE_OPTIONS.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button onClick={saveProfile} disabled={saving}
            className="h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-[12px] text-emerald-500 font-medium">Saved!</span>}
        </div>
      </div>

      {/* Theme */}
      <div className="bg-surface border border-line rounded-2xl p-5 mb-4">
        <h2 className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-4">Appearance</h2>
        <div className="flex gap-2">
          {THEMES.map(t => (
            <button key={t.id} onClick={()=>applyTheme(t.id)}
              className={'flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border transition-all ' + (theme===t.id ? 'bg-blue-700 border-blue-700 text-white' : 'bg-surface2 border-line text-t2 hover:border-blue-300')}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d={t.icon}/>
              </svg>
              <span className="text-[11px] font-semibold">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard View — lifetime members only */}
      {(profile.plan && profile.plan !== 'free' && profile.plan !== 'teacher_pro') && (
        <div className="bg-surface border border-line rounded-2xl p-5 mb-4">
          <h2 className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-1">Dashboard View</h2>
          <p className="text-[12px] text-t3 mb-4">You have a lifetime membership — choose which dashboard experience you prefer. You can switch anytime.</p>
          <div className="flex gap-2 mb-3">
            {['student','teacher'].map(opt => (
              <button
                key={opt}
                onClick={() => saveDashboardPreference(opt)}
                className={`flex-1 py-3 rounded-xl border text-sm font-semibold capitalize transition-all ${profile.dashboard_preference === opt || (!profile.dashboard_preference && opt === 'student') ? 'bg-blue-700 text-white border-blue-700' : 'bg-surface2 text-t2 border-line hover:border-blue-300'}`}
              >
                {opt === 'student' ? '🎓 Student' : '📋 Teacher'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-t3">Current view: <span className="text-t2 font-semibold capitalize">{profile.dashboard_preference || 'Student'}</span> · Takes effect immediately.</p>
        </div>
      )}

      {/* Subscription */}
      <div className="bg-surface border border-line rounded-2xl p-5 mb-4">
        <h2 className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-4">Subscription</h2>
        <div className="flex items-center justify-between p-3 bg-surface2 rounded-xl mb-3">
          <div>
            <p className="text-sm font-semibold text-t1">Free Plan</p>
            <p className="text-[12px] text-t3 mt-0.5">Basic access to all study tools</p>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-surface text-t3 border border-line">Free</span>
        </div>
        <button onClick={()=>router.push('/pricing')}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:9, border:'none', background:'linear-gradient(90deg,#2563eb,#7c3aed)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:'-0.01em' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
          Upgrade to Pro →
        </button>
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

  const uploadMedia = async (file, type) => {
    if (!user || !file) return
    const setter = type === 'avatar' ? setAvatarUploading : setBannerUploading
    const urlSetter = type === 'avatar' ? setAvatarUrl : setBannerUrl
    const field = type === 'avatar' ? 'avatar_url' : 'banner_url'
    setter(true)
    try {
      const ext = file.name.split('.').pop()
      const path = user.id + '/' + type + '.' + ext
      const bucket = type === 'avatar' ? 'avatars' : 'banners'
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert:true, contentType: file.type })
      if (upErr) throw upErr
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      const url = data.publicUrl
      urlSetter(url)
      await supabase.from('profiles').upsert({ id: user.id, [field]: url })
    } catch (e) { console.error(e) }
    setter(false)
  }

}