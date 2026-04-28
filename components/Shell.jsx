'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

const I = ({ d, s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)
const ICONS = {
  dashboard:  'M1 1h6v6H1zm8 0h6v6H9zM1 9h6v6H1zm8 0h6v6H9z',
  create:     'M8 1l1.8 5H15l-4.4 3.2 1.7 5.2L8 11.2 3.7 14.4l1.7-5.2L1 6h5.2z',
  study:      'M2 4h12M2 8h8M2 12h10',
  teach:      'M8 1a4 4 0 100 8 4 4 0 000-8zm-6 14c0-3.3 2.7-6 6-6s6 2.7 6 6',
  mystuff:    'M1 4h5l2 2h7v8H1zm0 2v8',
  summarize:  'M2 3h12v2.5H2zm0 4h8v2.5H2zm0 4h10v2H2',
  flashcards: 'M4 3h9a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zM2 5H1v7a1 1 0 001 1h9',
  quiz:       'M6 5.5a2.5 2.5 0 014.5 1.5c0 1.5-1.5 2-2 3V11m0 2.5v.5',
  lesson:     'M13 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V2a1 1 0 00-1-1zM5 5h6m-6 3h6m-6 3h4',
  search:     'M7 1a6 6 0 100 12A6 6 0 007 1zm7 14l-3-3',
  settings:   'M6.5 1h3l.5 2a5 5 0 011.2.7l2-.7 1.5 2.6-1.5 1.5a5 5 0 010 1.8l1.5 1.5L13.2 13l-2-.7A5 5 0 0110 13l-.5 2h-3L6 13a5 5 0 01-1.2-.7l-2 .7L1.3 10.4l1.5-1.5a5 5 0 010-1.8L1.3 5.6 2.8 3l2 .7A5 5 0 016 3l.5-2zM8 6a2 2 0 100 4 2 2 0 000-4z',
  tutor:      'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10a3 3 0 100-6 3 3 0 000 6z',
  guide:      'M1 3h6.5L9 4.5h6V13H9l-1.5-1.5H1zm0 0v10m6.5-10v10',
  studentp:   'M8 1l7 3.5-7 3.5-7-3.5zm-5 5.5v4c0 2 2.2 3 5 3s5-1 5-3V10',
  suite:      'M8 1l1.5 4H14l-3.7 2.7 1.4 4.3L8 9.5 4.3 12 5.7 7.7 2 5h4.5z',
  sources:    'M1 5h3v9H1zm4-3h4v12H5zm5 2h4v10h-4z',
  sun:        'M8 1v2m0 10v2M1 8h2m10 0h2M3.5 3.5l1.5 1.5m6 6l1.5 1.5M3.5 12.5l1.5-1.5m6-6l1.5-1.5M8 5a3 3 0 100 6 3 3 0 000-6z',
  moon:       'M12 3A6 6 0 006 15a7 7 0 006-12z',
  cL:         'M10 3L5 8l5 5',
  cR:         'M6 3l5 5-5 5',
}
const NAV = [
  { href:'/',               label:'Dashboard',     icon:'dashboard'  },
  { href:'/create',         label:'Create',        icon:'create'     },
  { href:'/study',          label:'Study',         icon:'study'      },
  { href:'/teach',          label:'Teacher Portal', icon:'teach'      },
  { href:'/student-portal', label:'Student Portal', icon:'studentp'   },
  { href:'/my-stuff',       label:'My Stuff',      icon:'mystuff'    },
]
const TOOLS = [
  { href:'/summarize',      label:'Summarize',     icon:'summarize'  },
  { href:'/study-guide',    label:'Study Guide',   icon:'guide'      },
  { href:'/flashcards',     label:'Flashcards',    icon:'flashcards' },
  { href:'/quiz',           label:'Quiz',          icon:'quiz'       },
  { href:'/lesson-builder', label:'Lesson Builder',icon:'lesson'     },
  { href:'/search',         label:'Search',        icon:'search'     },
]
const ADV = [
  { href:'/ai-tutor',       label:'Nova',          icon:'tutor'      },
  { href:'/resource-hub',   label:'Resource Hub',  icon:'mystuff'   },
  { href:'/ai-suite',       label:'AI Suite',      icon:'suite'      },
  { href:'/source-library', label:'Source Library',icon:'sources'    },
]

function NavItem({ item, collapsed, active }) {
  return (
    <Link href={item.href} title={collapsed ? item.label : undefined}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 8px', borderRadius:10, fontSize:13, fontWeight:500, textDecoration:'none', transition:'all 0.1s', background: active?'rgba(29,78,216,0.1)':'transparent', color: active?'#3b82f6':'var(--c-t2)' }}>
      <span style={{ flexShrink:0 }}><I d={ICONS[item.icon]}/></span>
      {!collapsed && <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</span>}
    </Link>
  )
}

function Avatar({ user, profile, size = 28 }) {
  const initials = (profile?.full_name || user?.email || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  const avatarUrl = profile?.avatar_url
  return avatarUrl
    ? <img src={avatarUrl} alt="" style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover' }}/>
    : <div style={{ width:size, height:size, borderRadius:'50%', background:'#1d4ed8', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:size*0.38, fontWeight:700, userSelect:'none', flexShrink:0 }}>{initials}</div>
}

export default function Shell({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, loading: authLoading, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('ff-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved === 'dark' || (!saved && prefersDark)
    if (isDark) document.documentElement.classList.add('dark')
    return isDark
  })
  const [mounted, setMounted] = useState(false)
  const [plusOpen, setPlusOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : true)
  const [isMidScreen, setIsMidScreen] = useState(typeof window !== 'undefined' ? (window.innerWidth >= 768 && window.innerWidth < 1100) : false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    setMounted(true)
    const check = () => {
      const w = window.innerWidth
      setIsMobile(w < 768)
      setIsMidScreen(w >= 768 && w < 1100)
      if (w >= 768 && w < 1100) setCollapsed(true)
      else if (w >= 1100) setCollapsed(c => c === true && w >= 1100 ? false : c)
    }
    check(); window.addEventListener('resize', check)
    const saved = localStorage.getItem('ff-theme')
    if (saved === 'dark') { setDark(true); document.documentElement.classList.add('dark') }
    // Sync from Supabase user_metadata if logged in and no local preference
    if (!saved) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const pref = session?.user?.user_metadata?.dark_mode
        if (pref === true) { setDark(true); document.documentElement.classList.add('dark'); localStorage.setItem('ff-theme','dark') }
        else if (pref === false) { setDark(false); document.documentElement.classList.remove('dark'); localStorage.setItem('ff-theme','light') }
      })
    }
    return () => window.removeEventListener('resize', check)
  }, [])

  const toggleDark = () => {
    const next = !dark; setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('ff-theme', next ? 'dark' : 'light')
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) supabase.auth.updateUser({ data: { dark_mode: next } })
    })
  }

  const handleSignOut = async () => {
    await signOut()
    setShowUserMenu(false)
    router.push('/auth')
  }

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || null
  const sidebarW = collapsed ? 56 : 210

  return (
    <div style={{ display:'flex', height:'100dvh', overflow:'hidden', background:'var(--c-bg)' }}>

      {/* Desktop Sidebar — hidden on mobile via both JSX condition AND CSS */}
      {!isMobile && (
        <aside style={{ width:sidebarW, transition:'width 0.2s', flexShrink:0, background:'var(--c-surface)', borderRight:'1px solid var(--c-line)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 14px', height:52, borderBottom:'1px solid var(--c-line)', flexShrink:0 }}>
            <div style={{ width:28, height:28, background:'#1d4ed8', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
            </div>
            {!collapsed && (
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--c-t1)', lineHeight:1.2 }}>Flashfo</div>
                <div style={{ fontSize:10, color:'var(--c-t3)' }}>Study workspace</div>
              </div>
            )}
            <button onClick={() => !isMobile && setCollapsed(c => !c)} style={{ background:'none', border:'none', padding:2, color:'var(--c-t3)', cursor:'pointer', flexShrink:0 }}>
              <I d={collapsed ? ICONS.cR : ICONS.cL} s={13}/>
            </button>
          </div>

          <nav style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:8, display:'flex', flexDirection:'column', gap:2 }}>
            {NAV.map(item => <NavItem key={item.href} item={item} collapsed={collapsed} active={pathname===item.href}/>)}
            {!collapsed ? <div style={{ fontSize:10, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.06em', padding:'16px 8px 4px' }}>Tools</div> : <div style={{ borderTop:'1px solid var(--c-line)', margin:'8px 0' }}/>}
            {TOOLS.map(item => <NavItem key={item.href} item={item} collapsed={collapsed} active={pathname===item.href}/>)}
            {!collapsed ? <div style={{ fontSize:10, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.06em', padding:'16px 8px 4px' }}>Advanced</div> : <div style={{ borderTop:'1px solid var(--c-line)', margin:'8px 0' }}/>}
            {ADV.map(item => <NavItem key={item.href} item={item} collapsed={collapsed} active={pathname===item.href}/>)}
          </nav>

          <div style={{ padding:12, borderTop:'1px solid var(--c-line)', flexShrink:0 }}>
            {!isMidScreen && <button onClick={toggleDark} style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:10, background:'none', border:'none', cursor:'pointer' }}>
              {!collapsed && <span style={{ fontSize:12, fontWeight:500, color:'var(--c-t2)' }}>{dark ? 'Dark' : 'Light'}</span>}
              <div style={{ marginLeft:'auto', width:36, height:20, background:dark?'#1d4ed8':'#e2e8f0', borderRadius:10, position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left:dark?19:3, width:14, height:14, background:'#fff', borderRadius:'50%', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
              </div>
            </button>}
          </div>
        </aside>
      )}

      <div style={{ display:'flex', flexDirection:'column', flex:1, minWidth:0, overflow:'hidden' }}>
        {/* Topbar */}
        <header style={{ height:52, background:'var(--c-surface)', borderBottom:'1px solid var(--c-line)', display:'flex', alignItems:'center', padding:'0 16px', gap:12, flexShrink:0, position:'relative' }}>
          {isMobile && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, background:'#1d4ed8', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
              </div>
              <span style={{ fontSize:14, fontWeight:700, color:'var(--c-t1)' }}>Flashfo</span>
            </div>
          )}
          {/* Welcome message — desktop only, reserved space */}
          {!isMobile && !authLoading && user && firstName && (
            <span style={{ fontSize:13, color:'var(--c-t2)', fontWeight:500 }}>
              Welcome back, <span style={{ color:'var(--c-t1)', fontWeight:700 }}>{firstName}</span> 👋
            </span>
          )}
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, minWidth:0, flexShrink:0 }}>
            {(isMobile || isMidScreen) && mounted && (
              <button onClick={toggleDark} style={{ height:32, padding:'0 10px', borderRadius:20, border:'1px solid var(--c-line)', background:'var(--c-surface2)', cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'var(--c-t2)', flexShrink:0, fontSize:12, fontWeight:500 }}>
                <svg width="14" height="14" viewBox="-1 -1 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink:0, overflow:'visible' }}>
                  {dark
                    ? <path d="M8 1v1M8 14v1M1 8h1M14 8h1M3 3l.7.7M12.3 12.3l.7.7M3 13l.7-.7M12.3 3.7l.7-.7M11 8a3 3 0 11-6 0 3 3 0 016 0z"/>
                    : <path d="M13 8.5A5.5 5.5 0 016 2a6 6 0 100 12 5.5 5.5 0 007-5.5z"/>}
                </svg>
                <span>{dark ? 'Light' : 'Dark'}</span>
              </button>
            )}
            {!authLoading && !user && (
              <a href="/auth" style={{ height:32, padding:'0 14px', fontSize:12, fontWeight:600, background:'#1d4ed8', color:'white', borderRadius:8, display:'inline-flex', alignItems:'center', textDecoration:'none' }}>
                Sign in
              </a>
            )}
            {!authLoading && user && (
              <div style={{ position:'relative' }}>
                <button onClick={() => setShowUserMenu(m => !m)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, padding:'2px 4px', borderRadius:8 }}>
                  <Avatar user={user} profile={profile}/>
                  {!isMobile && <span style={{ fontSize:12, fontWeight:600, color:'var(--c-t1)', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {profile?.full_name || user.email}
                  </span>}
                </button>
                {showUserMenu && (
                  <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:14, padding:8, minWidth:180, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:200 }}>
                    <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--c-line)', marginBottom:4 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--c-t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile?.full_name || 'Account'}</div>
                      <div style={{ fontSize:11, color:'var(--c-t3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</div>
                    </div>
                    <a href="/profile" onClick={() => setShowUserMenu(false)} style={{ display:'block', padding:'8px 12px', fontSize:13, color:'var(--c-t1)', textDecoration:'none', borderRadius:8, fontWeight:500 }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--c-surface2)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      Edit Profile
                    </a>
                    <button onClick={handleSignOut} style={{ width:'100%', textAlign:'left', padding:'8px 12px', fontSize:13, color:'#ef4444', background:'none', border:'none', cursor:'pointer', borderRadius:8, fontWeight:500 }}
                      onMouseEnter={e=>e.currentTarget.style.background='#fef2f2'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
            {authLoading && <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--c-line)', animation:'pulse 1.5s infinite' }}/>}
          </div>
        </header>

        <main style={{ flex:1, overflowY:'auto', paddingBottom: isMobile ? 72 : 0 }}>
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <>
          {/* Wheel overlay — covers content above nav only */}
          {plusOpen && (
            <div onClick={()=>setPlusOpen(false)}
              style={{ position:'fixed', top:0, left:0, right:0, bottom:64, zIndex:98,
                background:'rgba(0,0,0,0.55)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
                display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'0 16px 16px' }}>
              <div onClick={e=>e.stopPropagation()}
                style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {[
                  { href:'/quiz',           label:'Quiz',           icon:'M6 5.5a2.5 2.5 0 014.5 1.5c0 1.5-1.5 2-2 3V11m0 2.5v.5' },
                  { href:'/flashcards',     label:'Flashcards',     icon:'M4 3h9a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zM2 5H1v7a1 1 0 001 1h9' },
                  { href:'/summarize',      label:'Summarize',      icon:'M2 3h12v2.5H2zm0 4h8v2.5H2zm0 4h10v2H2' },
                  { href:'/study-guide',    label:'Study Guide',    icon:'M1 3h6.5L9 4.5h6V13H9l-1.5-1.5H1zm0 0v10' },
                  { href:'/teach',          label:'Teacher Portal', icon:'M8 1a4 4 0 100 8 4 4 0 000-8zm-6 14c0-3.3 2.7-6 6-6s6 2.7 6 6' },
                  { href:'/student-portal', label:'Student Portal', icon:'M8 1l7 3.5-7 3.5-7-3.5zm-5 5.5v4c0 2 2.2 3 5 3s5-1 5-3V10' },
                ].map(item => (
                  <Link key={item.label} href={item.href} onClick={()=>setPlusOpen(false)}
                    style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                      padding:'14px 8px', borderRadius:16,
                      background:'var(--c-surface)', border:'1px solid var(--c-line)',
                      textDecoration:'none' }}>
                    <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round">
                      <path d={item.icon}/>
                    </svg>
                    <span style={{ fontSize:10, fontWeight:600, color:'var(--c-t1)', textAlign:'center', lineHeight:1.2 }}>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* + button — separate fixed element, top edge flush with nav top */}
          <button onClick={()=>setPlusOpen(o=>!o)}
            style={{ position:'fixed',
              bottom:'calc(12px + env(safe-area-inset-bottom, 0px))',
              left:'50%',
              transform: 'translateX(-50%) rotate(' + (plusOpen ? '45deg' : '0deg') + ')',
              width:52, height:52,
              background:'#2563eb', border:'none', borderRadius:16,
              cursor:'pointer', zIndex:101, transition:'transform 0.2s',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M8 2v12M2 8h12"/>
            </svg>
          </button>

          {/* Bottom nav bar — 4 items + invisible center spacer for + button */}
          <nav style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100,
            background:'var(--c-surface)', borderTop:'1px solid var(--c-line)',
            height:64, paddingBottom:'env(safe-area-inset-bottom, 0px)',
            display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', alignItems:'center' }}>

            <Link href="/" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3,
              padding:'6px 4px', borderRadius:12, textDecoration:'none', justifyContent:'center',
              color: pathname==='/'?'#3b82f6':'var(--c-t3)' }}>
              <I d={ICONS['dashboard']} s={20}/>
              <span style={{ fontSize:9, fontWeight:600 }}>Dashboard</span>
            </Link>

            <Link href="/my-stuff" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3,
              padding:'6px 4px', borderRadius:12, textDecoration:'none', justifyContent:'center',
              color: pathname==='/my-stuff'?'#3b82f6':'var(--c-t3)' }}>
              <I d={ICONS['mystuff']} s={20}/>
              <span style={{ fontSize:9, fontWeight:600 }}>My Stuff</span>
            </Link>

            {/* Spacer so the + button doesn't overlap text */}
            <div style={{ width:60, flexShrink:0 }}/>

            <Link href="/ai-tutor" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3,
              padding:'6px 4px', borderRadius:12, textDecoration:'none', justifyContent:'center',
              color: pathname==='/ai-tutor'?'#6366f1':'var(--c-t3)' }}>
              <I d={ICONS['tutor']} s={20}/>
              <span style={{ fontSize:9, fontWeight:600 }}>Nova</span>
            </Link>

            <Link href="/settings" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3,
              padding:'6px 4px', borderRadius:12, textDecoration:'none', justifyContent:'center',
              color: pathname==='/settings'?'#3b82f6':'var(--c-t3)' }}>
              <I d={ICONS['settings']} s={20}/>
              <span style={{ fontSize:9, fontWeight:600 }}>Settings</span>
            </Link>

          </nav>
        </>
      )}
    </div>
  )
}