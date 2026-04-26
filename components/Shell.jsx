'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
  tutor:      'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10a3 3 0 100-6 3 3 0 000 6z',
  suite:      'M8 1l1.5 4H14l-3.7 2.7 1.4 4.3L8 9.5 4.3 12 5.7 7.7 2 5h4.5z',
  sources:    'M3 1h2v14H3zm4 0h2v14H7zm4 0h2v14h-2z',
  sun:        'M8 1v2m0 10v2M1 8h2m10 0h2M3.5 3.5l1.5 1.5m6 6l1.5 1.5M3.5 12.5l1.5-1.5m6-6l1.5-1.5M8 5a3 3 0 100 6 3 3 0 000-6z',
  moon:       'M12 3A6 6 0 006 15a7 7 0 006-12z',
  cL:         'M10 3L5 8l5 5',
  cR:         'M6 3l5 5-5 5',
}

const NAV = [
  { href: '/',               label: 'Dashboard',     icon: 'dashboard'  },
  { href: '/create',         label: 'Create',        icon: 'create'     },
  { href: '/study',          label: 'Study',         icon: 'study'      },
  { href: '/teach',          label: 'Teach',         icon: 'teach'      },
  { href: '/my-stuff',       label: 'My Stuff',      icon: 'mystuff'    },
]
const TOOLS = [
  { href: '/summarize',      label: 'Summarize',     icon: 'summarize'  },
  { href: '/flashcards',     label: 'Flashcards',    icon: 'flashcards' },
  { href: '/quiz',           label: 'Quiz',          icon: 'quiz'       },
  { href: '/lesson-builder', label: 'Lesson Builder',icon: 'lesson'     },
  { href: '/search',         label: 'Search',        icon: 'search'     },
]
const ADV = [
  { href: '/ai-tutor',       label: 'AI Tutor',      icon: 'tutor'      },
  { href: '/ai-suite',       label: 'AI Suite',      icon: 'suite'      },
  { href: '/source-library', label: 'Source Library',icon: 'sources'    },
]

function NavItem({ item, collapsed, active }) {
  return (
    <Link href={item.href} title={collapsed ? item.label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 8px', borderRadius: 10,
        fontSize: 13, fontWeight: 500,
        textDecoration: 'none', transition: 'all 0.1s',
        background: active ? 'rgba(29,78,216,0.1)' : 'transparent',
        color: active ? '#3b82f6' : 'var(--c-t2)',
      }}>
      <span style={{ flexShrink: 0 }}><I d={ICONS[item.icon]} /></span>
      {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>}
    </Link>
  )
}

export default function Shell({ children }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check screen width
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Restore theme
    const saved = localStorage.getItem('ff-theme')
    if (saved === 'dark') {
      setDark(true)
      document.documentElement.classList.add('dark')
    }
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('ff-theme', next ? 'dark' : 'light')
  }

  const sidebarW = collapsed ? 56 : 210

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--c-bg)' }}>

      {/* ── Desktop Sidebar — hidden on mobile ── */}
      {!isMobile && (
        <aside style={{
          width: sidebarW, transition: 'width 0.2s', flexShrink: 0,
          background: 'var(--c-surface)', borderRight: '1px solid var(--c-line)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Logo */}
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
            <button onClick={() => setCollapsed(c => !c)} style={{ background:'none', border:'none', padding:2, color:'var(--c-t3)', cursor:'pointer', flexShrink:0 }}>
              <I d={collapsed ? ICONS.cR : ICONS.cL} s={13} />
            </button>
          </div>

          {/* Nav */}
          <nav style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:8, display:'flex', flexDirection:'column', gap:2 }}>
            {NAV.map(item => <NavItem key={item.href} item={item} collapsed={collapsed} active={pathname === item.href} />)}
            {!collapsed
              ? <div style={{ fontSize:10, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.06em', padding:'16px 8px 4px' }}>Tools</div>
              : <div style={{ borderTop:'1px solid var(--c-line)', margin:'8px 0' }}/>}
            {TOOLS.map(item => <NavItem key={item.href} item={item} collapsed={collapsed} active={pathname === item.href} />)}
            {!collapsed
              ? <div style={{ fontSize:10, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.06em', padding:'16px 8px 4px' }}>Advanced</div>
              : <div style={{ borderTop:'1px solid var(--c-line)', margin:'8px 0' }}/>}
            {ADV.map(item => <NavItem key={item.href} item={item} collapsed={collapsed} active={pathname === item.href} />)}
          </nav>

          {/* Theme toggle */}
          <div style={{ padding:12, borderTop:'1px solid var(--c-line)', flexShrink:0 }}>
            <button onClick={toggleDark} style={{
              width:'100%', display:'flex', alignItems:'center', gap:8, padding:'6px 8px',
              borderRadius:10, background:'none', border:'none', cursor:'pointer',
            }}>
              {!collapsed && <span style={{ fontSize:12, fontWeight:500, color:'var(--c-t2)' }}>{dark ? 'Dark' : 'Light'}</span>}
              <div style={{ marginLeft:'auto', width:36, height:20, background: dark?'#1d4ed8':'#e2e8f0', borderRadius:10, position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left: dark?19:3, width:14, height:14, background:'#fff', borderRadius:'50%', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
              </div>
            </button>
          </div>
        </aside>
      )}

      {/* ── Main ── */}
      <div style={{ display:'flex', flexDirection:'column', flex:1, minWidth:0, overflow:'hidden' }}>

        {/* Topbar */}
        <header style={{
          height:52, background:'var(--c-surface)', borderBottom:'1px solid var(--c-line)',
          display:'flex', alignItems:'center', padding:'0 16px', gap:12, flexShrink:0,
        }}>
          {/* Mobile: logo */}
          {isMobile && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, background:'#1d4ed8', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
              </div>
              <span style={{ fontSize:14, fontWeight:700, color:'var(--c-t1)' }}>Flashfo</span>
            </div>
          )}
          {/* Desktop: placeholder for future welcome message */}
          {!isMobile && <div style={{ flex:1 }}/>}
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
            <button style={{ height:32, padding:'0 12px', fontSize:12, fontWeight:500, background:'var(--c-surface2)', border:'1px solid var(--c-line)', color:'var(--c-t2)', borderRadius:8, cursor:'pointer' }}>
              Upgrade
            </button>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'#1d4ed8', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:11, fontWeight:700, userSelect:'none' }}>
              GL
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex:1, overflowY:'auto', paddingBottom: isMobile ? 72 : 0 }}>
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      {isMobile && (
        <nav style={{
          position:'fixed', bottom:0, left:0, right:0, zIndex:100,
          background:'var(--c-surface)', borderTop:'1px solid var(--c-line)',
          display:'flex', alignItems:'center', justifyContent:'space-around',
          padding:'6px 4px', paddingBottom:'calc(6px + env(safe-area-inset-bottom, 0px))',
        }}>
          {NAV.map(item => (
            <Link key={item.href} href={item.href} style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:3,
              padding:'6px 12px', borderRadius:12, textDecoration:'none',
              background: pathname === item.href ? 'rgba(29,78,216,0.1)' : 'transparent',
              color: pathname === item.href ? '#3b82f6' : 'var(--c-t3)',
              transition:'all 0.1s',
            }}>
              <I d={ICONS[item.icon]} s={18} />
              <span style={{ fontSize:9, fontWeight:600 }}>{item.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}