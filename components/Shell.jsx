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
      className={`flex items-center gap-2.5 px-2 py-[7px] rounded-lg text-[13px] font-medium transition-colors ${
        active ? 'bg-blue-700/10 text-blue-500' : 'text-t2 hover:bg-surface2 hover:text-t1'
      }`}>
      <span className="flex-shrink-0"><I d={ICONS[item.icon]} /></span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

function MobileNavItem({ item, active }) {
  return (
    <Link href={item.href}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
        active ? 'text-blue-500 bg-blue-500/10' : 'text-t3'
      }`}>
      <I d={ICONS[item.icon]} s={18} />
      <span className="text-[9px] font-semibold">{item.label}</span>
    </Link>
  )
}

export default function Shell({ children }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('ff-theme')
    if (saved === 'dark') {
      setDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('ff-theme', next ? 'dark' : 'light')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">

      {/* ── Desktop Sidebar ── */}
      <aside style={{ width: collapsed ? 56 : 210, transition: 'width 0.2s' }}
        className="hidden md:flex bg-surface border-r border-line flex-col flex-shrink-0 overflow-hidden">
        <div className="flex items-center gap-2.5 px-3.5 h-[52px] border-b border-line flex-shrink-0">
          <div className="w-7 h-7 bg-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6" /></svg>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-t1 leading-tight tracking-tight">Flashfo</div>
              <div className="text-[10px] text-t3">Study workspace</div>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)}
            className="text-t3 hover:text-t2 flex-shrink-0 transition-colors p-0.5 rounded">
            <I d={collapsed ? ICONS.cR : ICONS.cL} s={13} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-0.5">
          {NAV.map(item => <NavItem key={item.href} item={item} collapsed={collapsed} active={pathname === item.href} />)}
          {!collapsed ? <div className="text-[10px] font-semibold text-t3 uppercase tracking-wider px-2 pt-4 pb-1">Tools</div> : <div className="my-2 border-t border-line" />}
          {TOOLS.map(item => <NavItem key={item.href} item={item} collapsed={collapsed} active={pathname === item.href} />)}
          {!collapsed ? <div className="text-[10px] font-semibold text-t3 uppercase tracking-wider px-2 pt-4 pb-1">Advanced</div> : <div className="my-2 border-t border-line" />}
          {ADV.map(item => <NavItem key={item.href} item={item} collapsed={collapsed} active={pathname === item.href} />)}
        </nav>
        <div className="p-3 border-t border-line flex-shrink-0">
          <button onClick={toggleDark}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface2 transition-colors group">
            {!collapsed && <span className="text-[12px] font-medium text-t2 group-hover:text-t1 transition-colors">{dark ? 'Dark' : 'Light'}</span>}
            <div className="ml-auto flex-shrink-0" style={{ width:36, height:20, background: dark?'#1d4ed8':'#e2e8f0', borderRadius:10, position:'relative', transition:'background 0.2s' }}>
              <div style={{ position:'absolute', top:3, left: dark?19:3, width:14, height:14, background:'#fff', borderRadius:'50%', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
            </div>
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Topbar — left side reserved for future welcome message */}
        <header className="h-[52px] bg-surface border-b border-line flex items-center px-4 md:px-5 gap-3 flex-shrink-0">
          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 bg-blue-700 rounded-lg flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6" /></svg>
            </div>
            <span className="text-[13px] font-bold text-t1">Flashfo</span>
          </div>
          {/* Left side — placeholder for future welcome message */}
          <div className="hidden md:block flex-1" />
          <div className="ml-auto flex items-center gap-2">
            <button className="h-8 px-3 text-[12px] font-medium bg-surface2 border border-line text-t2 rounded-lg hover:bg-bg transition-colors">Upgrade</button>
            <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white text-[11px] font-bold select-none">GL</div>
          </div>
        </header>

        {/* Content — extra bottom padding on mobile for nav bar */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-line flex items-center justify-around px-2 py-1 safe-area-bottom">
        {NAV.map(item => <MobileNavItem key={item.href} item={item} active={pathname === item.href} />)}
      </nav>
    </div>
  )
}