'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/', label: 'Dashboard', icon: <svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg> },
  { href: '/create', label: 'Create', icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l1.5 4.5H14l-3.7 2.7 1.4 4.3L8 10 4.3 12.5l1.4-4.3L2 5.5h4.5z"/></svg> },
  { href: '/study', label: 'Study', icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v2H2zM2 7h9v2H2zM2 11h11v2H2z"/></svg> },
  { href: '/teach', label: 'Teach', icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1C4.1 1 1 4.1 1 8s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7zm0 3c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 9c-1.9 0-3.5-.9-4.5-2.3C4.4 9.6 6.1 9 8 9s3.6.6 4.5 1.7C11.5 12.1 9.9 13 8 13z"/></svg> },
  { href: '/my-stuff', label: 'My Stuff', icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zm1 3v2h6V5H5zm0 4v2h4V9H5z"/></svg> },
]

const TOOLS = [
  { href: '/summarize', label: 'Summarize', icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v3H2zm0 5h8v3H2zm0 5h10v2H2z"/></svg> },
  { href: '/flashcards', label: 'Flashcards', icon: <svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="6" height="4" rx="1"/><rect x="9" y="2" width="6" height="4" rx="1"/><rect x="1" y="10" width="6" height="4" rx="1"/><rect x="9" y="10" width="6" height="4" rx="1"/></svg> },
  { href: '/quiz', label: 'Quiz', icon: <svg viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M6.5 6.5C6.5 5.7 7.2 5 8 5s1.5.7 1.5 1.5c0 .6-.4 1.1-.9 1.4L8 8.5v.7" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round"/><circle cx="8" cy="11" r=".75" fill="currentColor"/></svg> },
  { href: '/lesson-builder', label: 'Lesson Builder', icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M13 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V3a1 1 0 00-1-1zm-2 8H5v-1.5h6V10zm0-3H5V5.5h6V7z"/></svg> },
  { href: '/search', label: 'Search', icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M7 1a6 6 0 100 12A6 6 0 007 1zm5.3 11.3l2.4 2.4-1.4 1.4-2.4-2.4A7 7 0 1112.3 12.3z"/></svg> },
]

const ADVANCED = [
  { href: '/ai-tutor', label: 'AI Tutor', icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 11c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zm0-8C5.8 4 4 5.8 4 8h1.5C5.5 6.6 6.6 5.5 8 5.5V4z"/></svg> },
  { href: '/ai-suite', label: 'AI Suite', icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 2l1.2 3.6H13l-3 2.2 1.1 3.5L8 9.3l-3.1 2 1.1-3.5-3-2.2h3.8z"/></svg> },
  { href: '/source-library', label: 'Source Library', icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M3 2h2v12H3zm4 0h2v12H7zm4 0h2v12h-2z"/></svg> },
]

function NavItem({ item, collapsed, active }) {
  return (
    <Link href={item.href}
      className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors duration-100 ${
        active
          ? 'bg-ff-blue-light text-ff-blue'
          : 'text-ff-slate hover:bg-slate-50'
      }`}>
      <span className="w-4 h-4 flex-shrink-0 opacity-80">{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

export default function Shell({ children }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState('light')

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ff-bg">

      {/* Sidebar */}
      <aside className={`bg-ff-surface border-r border-ff-border flex flex-col flex-shrink-0 transition-all duration-200 ${collapsed ? 'w-14' : 'w-52'}`}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-ff-border flex-shrink-0">
          <div className="w-7 h-7 bg-ff-blue rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 14 14" fill="currentColor">
              <polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/>
            </svg>
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-semibold text-ff-navy leading-none">Flashfo</div>
              <div className="text-[10px] text-ff-muted mt-0.5">Study workspace</div>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-ff-muted hover:text-ff-slate transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              {collapsed
                ? <path d="M6 3l5 5-5 5"/>
                : <path d="M10 3L5 8l5 5"/>}
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {NAV.map(item => <NavItem key={item.href} item={item} collapsed={collapsed} active={pathname === item.href} />)}

          {!collapsed && <div className="text-[10px] font-semibold text-ff-muted uppercase tracking-wider px-2 pt-4 pb-1">Tools</div>}
          {collapsed && <div className="border-t border-ff-border my-2"/>}
          {TOOLS.map(item => <NavItem key={item.href} item={item} collapsed={collapsed} active={pathname === item.href} />)}

          {!collapsed && <div className="text-[10px] font-semibold text-ff-muted uppercase tracking-wider px-2 pt-4 pb-1">Advanced</div>}
          {collapsed && <div className="border-t border-ff-border my-2"/>}
          {ADVANCED.map(item => <NavItem key={item.href} item={item} collapsed={collapsed} active={pathname === item.href} />)}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-ff-border">
          <button onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-ff-muted hover:bg-slate-50 transition-colors">
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
              {theme === 'light'
                ? <path d="M8 12a4 4 0 100-8 4 4 0 000 8zm0-10V1m0 14v-1M1 8H0m16 0h-1M3.5 3.5l-.7-.7m9.9 9.9-.7-.7M3.5 12.5l-.7.7m9.9-9.9-.7.7"/>
                : <path d="M12 8A4 4 0 018 12 6 6 0 016 1a6 6 0 016 7z"/>}
            </svg>
            {!collapsed && <span>{theme === 'light' ? 'Light mode' : 'Dark mode'}</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="h-13 bg-ff-surface border-b border-ff-border flex items-center px-5 gap-3 flex-shrink-0">
          <div className="flex-1 max-w-md h-8 bg-slate-50 border border-ff-border rounded-lg flex items-center px-3 gap-2">
            <svg className="w-3.5 h-3.5 text-ff-muted flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7 1a6 6 0 100 12A6 6 0 007 1zm5.3 11.3 2.4 2.4-1.4 1.4-2.4-2.4A7 7 0 1112.3 12.3z"/>
            </svg>
            <span className="text-xs text-ff-muted">Search any topic, question, or keyword...</span>
            <span className="ml-auto text-[10px] text-ff-muted bg-white border border-ff-border px-1.5 py-0.5 rounded">⌘K</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="h-8 px-3 text-xs font-medium bg-slate-50 border border-ff-border text-ff-slate rounded-lg hover:bg-slate-100 transition-colors">
              Upgrade
            </button>
            <div className="w-7 h-7 rounded-full bg-ff-blue flex items-center justify-center text-white text-[11px] font-semibold">
              GL
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="hidden max-[640px]:flex fixed bottom-3 left-3 right-3 z-50 bg-ff-surface border border-ff-border rounded-2xl px-2 py-1.5 justify-center gap-1 shadow-lg">
        {[...NAV.slice(0,5)].map(item => (
          <Link key={item.href} href={item.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-colors ${
              pathname === item.href ? 'text-ff-blue bg-ff-blue-light' : 'text-ff-muted'
            }`}>
            <span className="w-4 h-4">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}