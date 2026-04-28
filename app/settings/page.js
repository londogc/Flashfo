'use client'
import { useState, useEffect } from 'react'
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
  const [profile, setProfile] = useState({ full_name:'', grade_level:'', role:'student' })
  const [theme, setTheme] = useState('system')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth')
    if (user) loadProfile()
    // Read current theme from localStorage
    const saved = localStorage.getItem('ff-theme')
    if (saved) setTheme(saved)
    else setTheme('system')
  }, [user, authLoading])

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setProfile({ full_name: data.full_name||'', grade_level: data.grade_level||'', role: data.role||'student' })
    setLoading(false)
  }

  async function saveProfile() {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').upsert({ id: user.id, ...profile })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    setSaving(false)
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

  return (
    <div className="p-6 max-w-2xl mx-auto w-full pb-32">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-6">Settings</h1>

      {/* Profile */}
      <div className="bg-surface border border-line rounded-2xl p-5 mb-4">
        <h2 className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-4">Profile</h2>
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-line">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {(profile.full_name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-t1">{profile.full_name || 'No name set'}</p>
            <p className="text-[12px] text-t3">{user?.email}</p>
          </div>
        </div>
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
        <button className="w-full h-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1l1.8 5H15l-4.4 3.2 1.7 5.2L8 11.2 3.7 14.4l1.7-5.2L1 6h5.2z"/></svg>
          Upgrade to Pro — Coming in v6.0
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
}