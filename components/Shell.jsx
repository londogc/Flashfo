'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const I = ({ d, s=16 }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
)
const ICONS = {
  dashboard: 'M1 1h6v6H1zm8 0h6v6H9zM1 9h6v6H1zm8 3h2m2 0h-2m0 0v-2m0 2v2',
  create:    'M8 1l1.8 5H15l-4.4 3.2 1.7 5.2L8 11.2 3.7 14.4l1.7-5.2L1 6h5.2z',
  study:     'M2 4h12M2 8h8M2 12h10',
  teach:     'M8 1a4 4 0 100 8 4 4 0 000-8zm-6 14c0-3.3 2.7-6 6-6s6 2.7 6 6',
  mystuff:   'M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm2 3h6m-6 3h4',
  summarize: 'M2 3h12v2.5H2zm0 4h8v2.5H2zm0 4h10v2H2',
  flashcards:'M1 2h6v5H1zm8 0h6v5H9zM1 9h6v5H1zm8 2h2m2 0h-2m0-2v2m0 2v-2',
  quiz:      'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5v.5m0-7c1.1 0 2 .9 2 2s-.9 2-2 2',
  lesson:    'M13 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V2a1 1 0 00-1-1zM5 5h6m-6 3h6m-6 3h4',
  search:    'M7 1a6 6 0 100 12A6 6 0 007 1zm7 14l-3-3',
  tutor:     'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10a3 3 0 100-6 3 3 0 000 6z',
  suite:     'M8 1l1.5 4H14l-3.7 2.7 1.4 4.3L8 9.5 4.3 12 5.7 7.7 2 5h4.5z',
  sources:   'M3 1h2v14H3zm4 0h2v14H7zm4 0h2v14h-2z',
  sun:       'M8 1v2m0 10v2M1 8h2m10 0h2M3.5 3.5l1.5 1.5m6 6l1.5 1.5M3.5 12.5l1.5-1.5m6-6l1.5-1.5M8 5a3 3 0 100 6 3 3 0 000-6z',
  moon:      'M12 3A6 6 0 006 15a7 7 0 006-12z',
  cL:        'M10 3L5 8l5 5',
  cR:        'M6 3l5 5-5 5',
}
const NAV=[
  {href:'/',label:'Dashboard',icon:'dashboard'},
  {href:'/create',label:'Create',icon:'create'},
  {href:'/study',label:'Study',icon:'study'},
  {href:'/teach',label:'Teach',icon:'teach'},
  {href:'/my-stuff',label:'My Stuff',icon:'mystuff'},
]
const TOOLS=[
  {href:'/summarize',label:'Summarize',icon:'summarize'},
  {href:'/flashcards',label:'Flashcards',icon:'flashcards'},
  {href:'/quiz',label:'Quiz',icon:'quiz'},
  {href:'/lesson-builder',label:'Lesson Builder',icon:'lesson'},
  {href:'/search',label:'Search',icon:'search'},
]
const ADV=[
  {href:'/ai-tutor',label:'AI Tutor',icon:'tutor'},
  {href:'/ai-suite',label:'AI Suite',icon:'suite'},
  {href:'/source-library',label:'Source Library',icon:'sources'},
]

function NavItem({item,collapsed,active}){
  return(
    <Link href={item.href} title={collapsed?item.label:undefined}
      className={`flex items-center gap-2.5 px-2 py-[7px] rounded-lg text-[13px] font-medium transition-colors ${
        active?'bg-blue-700/10 text-blue-500':'text-t2 hover:bg-surface2 hover:text-t1'
      }`}>
      <span className="flex-shrink-0"><I d={ICONS[item.icon]}/></span>
      {!collapsed&&<span className="truncate leading-none">{item.label}</span>}
    </Link>
  )
}

export default function Shell({children}){
  const pathname=usePathname()
  const [collapsed,setCollapsed]=useState(false)
  const [dark,setDark]=useState(false)

  useEffect(()=>{
    const saved=localStorage.getItem('ff-theme')
    if(saved==='dark'){
      setDark(true)
      document.documentElement.classList.add('dark')
    }
  },[])

  const toggleDark=()=>{
    const next=!dark
    setDark(next)
    document.documentElement.classList.toggle('dark',next)
    localStorage.setItem('ff-theme',next?'dark':'light')
  }

  return(
    <div className="flex h-screen overflow-hidden bg-bg">
      <aside style={{width:collapsed?56:210,transition:'width 0.2s'}}
        className="bg-surface border-r border-line flex flex-col flex-shrink-0 overflow-hidden">
        <div className="flex items-center gap-2.5 px-3.5 h-[52px] border-b border-line flex-shrink-0">
          <div className="w-7 h-7 bg-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
          </div>
          {!collapsed&&(
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-t1 leading-none tracking-tight">Flashfo</div>
              <div className="text-[10px] text-t3 mt-0.5">Study workspace</div>
            </div>
          )}
          <button onClick={()=>setCollapsed(c=>!c)} className="text-t3 hover:text-t2 flex-shrink-0 transition-colors p-0.5 rounded">
            <I d={collapsed?ICONS.cR:ICONS.cL} s={13}/>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-0.5">
          {NAV.map(item=><NavItem key={item.href} item={item} collapsed={collapsed} active={pathname===item.href}/>)}
          {!collapsed
            ?<div className="text-[10px] font-semibold text-t3 uppercase tracking-wider px-2 pt-4 pb-1">Tools</div>
            :<div className="my-2 border-t border-line"/>}
          {TOOLS.map(item=><NavItem key={item.href} item={item} collapsed={collapsed} active={pathname===item.href}/>)}
          {!collapsed
            ?<div className="text-[10px] font-semibold text-t3 uppercase tracking-wider px-2 pt-4 pb-1">Advanced</div>
            :<div className="my-2 border-t border-line"/>}
          {ADV.map(item=><NavItem key={item.href} item={item} collapsed={collapsed} active={pathname===item.href}/>)}
        </nav>
        <div className="p-2 border-t border-line flex-shrink-0">
          <button onClick={toggleDark}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs text-t3 hover:bg-surface2 hover:text-t2 transition-colors">
            <I d={dark?ICONS.moon:ICONS.sun} s={14}/>
            {!collapsed&&<span>{dark?'Dark mode':'Light mode'}</span>}
          </button>
        </div>
      </aside>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="h-[52px] bg-surface border-b border-line flex items-center px-5 gap-3 flex-shrink-0">
          <div className="flex-1 max-w-md h-8 bg-surface2 border border-line rounded-lg flex items-center px-3 gap-2 hover:border-blue-300 transition-colors cursor-text">
            <I d={ICONS.search} s={13}/>
            <span className="text-[12px] text-t3 flex-1 select-none">Search any topic, question, or keyword...</span>
            <span className="text-[10px] text-t3 bg-surface border border-line px-1.5 py-0.5 rounded font-mono">⌘K</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="h-8 px-3 text-[12px] font-medium bg-surface2 border border-line text-t2 rounded-lg hover:bg-bg transition-colors">Upgrade</button>
            <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white text-[11px] font-bold select-none">GL</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}