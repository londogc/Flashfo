'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/create', label: 'Create' },
  { href: '/study', label: 'Study' },
  { href: '/teach', label: 'Teach' },
  { href: '/my-stuff', label: 'My Stuff' },
]
const TOOLS = [
  { href: '/summarize', label: 'Summarize' },
  { href: '/flashcards', label: 'Flashcards' },
  { href: '/quiz', label: 'Quiz' },
  { href: '/lesson-builder', label: 'Lesson Builder' },
  { href: '/search', label: 'Search' },
]
const ADVANCED = [
  { href: '/ai-tutor', label: 'AI Tutor' },
  { href: '/ai-suite', label: 'AI Suite' },
  { href: '/source-library', label: 'Source Library' },
]

function NavItem({ item, collapsed, active }) {
  return (
    <Link
      href={item.href}
      className={[
        'flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors',
        active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
      ].join(' ')}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-60" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

function SectionLabel({ label, collapsed }) {
  if (collapsed) return <div className="my-2 border-t border-slate-100" />
  return <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 pt-4 pb-1">{label}</div>
}

export default function Shell({ children }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark] = useState(false)

  const toggleDark = () => {
    setDark(!dark)
    document.documentElement.classList.toggle('dark', !dark)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <aside
        style={{ width: collapsed ? 56 : 208 }}
        className="bg-white border-r border-slate-100 flex flex-col flex-shrink-0 transition-all duration-200"
      >
        <div className="flex items-center gap-2.5 px-3.5 py-3.5 border-b border-slate-100 flex-shrink-0">
          <div className="w-7 h-7 bg-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 14 14" fill="currentColor">
              <polygon points="7 1 2 8 7 8 6 13 12 6 7 6" />
            </svg>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900 leading-none">Flashfo</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Study workspace</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              {collapsed
                ? <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                : <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {NAV.map(item => <NavItem key={item.href} item={item} collapsed={collapsed} active={pathname === item.href} />)}
          <SectionLabel label="Tools" collapsed={collapsed} />
          {TOOLS.map(item => <NavItem key={item.href} item={item} collapsed={collapsed} active={pathname === item.href} />)}
          <SectionLabel label="Advanced" collapsed={collapsed} />
          {ADVANCED.map(item => <NavItem key={item.href} item={item} collapsed={collapsed} active={pathname === item.href} />)}
        </nav>

        <div className="p-2 border-t border-slate-100">
          <button
            onClick={toggleDark}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 12a4 4 0 100-8 4 4 0 000 8zm0-10V1m0 14v-1M1 8H0m16 0h-1M3.5 3.5l-.7-.7m9.9 9.9-.7-.7M3.5 12.5l-.7.7m9.9-9.9-.7.7" stroke="currentColor" strokeWidth="1.2" fill="none"/>
            </svg>
            {!collapsed && <span>{dark ? 'Dark mode' : 'Light mode'}</span>}
          </button>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="h-13 bg-white border-b border-slate-100 flex items-center px-5 gap-3 flex-shrink-0">
          <div className="flex-1 max-w-md h-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center px-3 gap-2">
            <svg className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6.5" cy="6.5" r="5" /><path d="M12 12l2.5 2.5" strokeLinecap="round"/>
            </svg>
            <span className="text-xs text-slate-400 flex-1">Search any topic, question, or keyword...</span>
            <span className="text-[10px] text-slate-300 bg-white border border-slate-100 px-1.5 py-0.5 rounded">⌘K</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="h-8 px-3 text-xs font-medium bg-slate-50 border border-slate-100 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors">
              Upgrade
            </button>
            <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white text-[11px] font-semibold">
              GL
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <nav className="hidden fixed bottom-3 left-3 right-3 z-50 bg-white border border-slate-100 rounded-2xl px-2 py-1.5 shadow-lg" style={{display:'none'}}>
        {NAV.slice(0, 5).map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-colors',
              pathname === item.href ? 'text-blue-700 bg-blue-50' : 'text-slate-400',
            ].join(' ')}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}