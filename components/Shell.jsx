'use client'
// v5.9.2 — scrubbed for v6.0
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

const I = ({ d, s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
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
  nova:       'M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a4 4 0 100 8 4 4 0 000-8zm0 3a1 1 0 100 2 1 1 0 000-2z',
  tutor:      'M8 1a7 7 0 100 14A7 7 0 008 1zm0 10a3 3 0 100-6 3 3 0 000 6z',
  guide:      'M1 3h6.5L9 4.5h6V13H9l-1.5-1.5H1zm0 0v10',
  studentp:   'M8 1l7 3.5-7 3.5-7-3.5zm-5 5.5v4c0 2 2.2 3 5 3s5-1 5-3V10',
  suite:      'M8 1l1.5 4H14l-3.7 2.7 1.4 4.3L8 9.5 4.3 12 5.7 7.7 2 5h4.5z',
  sources:    'M1 5h3v9H1zm4-3h4v12H5zm5 2h4v10h-4z',
  cL:         'M10 3L5 8l5 5',
  cR:         'M6 3l5 5-5 5',
  stem:       'M9 1L4 8h4l-1 7 6-8H9z',
  curriculum: 'M1 2h6v12H1zm8 0h6v12H9zM3 5h2M3 7h2M3 9h2M10 5h3M10 7h3M10 9h3',
  collab:     'M2 5h9v8H2zM4 3h9v8H4zM6 7h4M6 9h3M12 1v4M10 2l2-1 2 1',
}

const NAV = [
  { href:'/dashboard',      label:'Dashboard',     icon:'dashboard' },
  { href:'/create',         label:'Create',        icon:'create'    },
  { href:'/study',          label:'Study',         icon:'study'     },
  { href:'/ai-tutor',       label:'Nova',          icon:'nova', nova:true },
  { href:'/teach',          label:'Teach',         icon:'teach'     },
  { href:'/student-portal', label:'Student Portal',icon:'studentp'  },
  { href:'/my-stuff',       label:'My Stuff',      icon:'mystuff'   },
  { href:'/curriculum',     label:'Curriculum',    icon:'curriculum'},
  { href:'/collab-decks',   label:'Collab Decks',  icon:'collab'    },
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
  { href:'/resource-hub',   label:'Resource Hub',  icon:'mystuff' },
  { href:'/ai-suite',       label:'Create',        icon:'suite'   },
  { href:'/source-library', label:'Source Library',icon:'sources' },
]

function NavItem({ item, collapsed, active }) {
  const nova = item.nova
  return (
    <Link href={item.href} title={collapsed ? item.label : undefined}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 8px', borderRadius:10,
        fontSize:13, fontWeight:500, textDecoration:'none', transition:'all 0.1s',
        background: active ? (nova ? 'rgba(124,58,237,0.12)' : 'rgba(29,78,216,0.1)') : 'transparent',
        border: active && nova ? '1px solid rgba(124,58,237,0.2)' : '1px solid transparent',
        color: active ? (nova ? '#a78bfa' : '#3b82f6') : 'var(--c-t2)' }}>
      <span style={{ flexShrink:0, position:'relative' }}>
        {nova
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
            </svg>
          : <I d={ICONS[item.icon] || ICONS.dashboard}/>
        }
        {nova && <span style={{ position:'absolute', top:-3, right:-3, width:7, height:7, background:'#a78bfa', borderRadius:'50%', border:'1.5px solid var(--c-surface)', animation:'nova-breathe 2.4s ease-in-out infinite' }}/>}
      </span>
      {!collapsed && <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</span>}
    </Link>
  )
}

function Avatar({ user, profile, size = 28 }) {
  const initials = (profile?.full_name || user?.email || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  return profile?.avatar_url
    ? <img src={profile.avatar_url} alt="" style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover' }}/>
    : <div style={{ width:size, height:size, borderRadius:'50%', background:'#1d4ed8', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:size*0.38, fontWeight:700, flexShrink:0 }}>{initials}</div>
}

export default function Shell({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, loading: authLoading, signOut } = useAuth()

  // collapsed: sidebar collapsed state — initializes from window width immediately
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    const w = window.innerWidth
    return w >= 768 && w < 1100
  })
  const [cmdOpen, setCmdOpen] = useState(false)
  const [cmdQuery, setCmdQuery] = useState('')
  const cmdRef = useRef(null)
  const cmdInputRef = useRef(null)

  // dark: reads localStorage synchronously so no flash on first render
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('ff-theme')
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (isDark) document.documentElement.classList.add('dark')
    return isDark
  })

  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notifFilter, setNotifFilter] = useState('all')
  const [unreadCount, setUnreadCount] = useState(0)
  const bellRef = useRef(null)
  const panelRef = useRef(null)

  const [plusOpen, setPlusOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    // Handle sidebar auto-collapse on window resize
    const check = () => {
      const w = window.innerWidth
      if (w >= 768 && w < 1100) setCollapsed(true)
      else if (w >= 1100) setCollapsed(false)
    }
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  function toggleDark() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('ff-theme', next ? 'dark' : 'light')
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) supabase.auth.updateUser({ data: { dark_mode: next } })
    })
  }

  async function handleSignOut() {
    await signOut()
    setShowUserMenu(false)
    router.push('/auth')
  }

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || null
  const sidebarW = collapsed ? 56 : 210

  // ── Notifications ──
  useEffect(() => {
    if (!user) return
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.read).length)
      }
    }
    fetchNotifs()
    const sub = supabase.channel('notifs_'+user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.'+user.id },
        payload => { setNotifications(prev => [payload.new, ...prev]); setUnreadCount(c => c + 1) })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [user])

  useEffect(() => {
    if (!showNotifs) return
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          bellRef.current && !bellRef.current.contains(e.target)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showNotifs])

  const markAllRead = async () => {
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const markRead = async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(c => Math.max(0, c - 1))
  }

  const filteredNotifs = notifFilter === 'all'
    ? notifications
    : notifications.filter(n => n.category === notifFilter)

  const notifCategories = ['all', ...new Set(notifications.map(n => n.category).filter(Boolean))]

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(v => !v); setCmdQuery('') }
      if (e.key === 'Escape') setCmdOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => { if (cmdOpen && cmdInputRef.current) cmdInputRef.current.focus() }, [cmdOpen])
  const CMD_ITEMS = [
    { label:'Dashboard', href:'/dashboard', icon:'dashboard' },
    { label:'Create', href:'/create', icon:'create' },
    { label:'Flashcards', href:'/flashcards', icon:'mystuff' },
    { label:'Quiz', href:'/quiz', icon:'study' },
    { label:'Study Guide', href:'/study-guide', icon:'guide' },
    { label:'Ask Nova', href:'/ai-tutor', icon:'nova' },
    { label:'Teach', href:'/teach', icon:'teach' },
    { label:'Curriculum Standards', href:'/curriculum', icon:'curriculum' },
    { label:'Collab Decks', href:'/collab-decks', icon:'collab' },
    { label:'My Stuff', href:'/my-stuff', icon:'mystuff' },
    { label:'Student Portal', href:'/student-portal', icon:'studentp' },
  ]
  const filteredCmds = cmdQuery ? CMD_ITEMS.filter(c => c.label.toLowerCase().includes(cmdQuery.toLowerCase())) : CMD_ITEMS

  return (
    <div style={{ display:'flex', height:'100dvh', overflow:'hidden', background:'var(--c-bg)' }}>
      {cmdOpen && <div onClick={()=>setCmdOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200}}/>}
      {cmdOpen && (
        <div ref={cmdRef} style={{position:'fixed',top:'18%',left:'50%',transform:'translateX(-50%)',width:'min(560px,calc(100vw - 32px))',background:'var(--c-surface)',border:'1px solid var(--c-line)',borderRadius:14,boxShadow:'0 16px 48px rgba(0,0,0,0.5)',zIndex:201,overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',borderBottom:'1px solid var(--c-line)'}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--c-t3)" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input ref={cmdInputRef} value={cmdQuery} onChange={e=>setCmdQuery(e.target.value)} placeholder="Search pages and tools..." style={{flex:1,background:'none',border:'none',outline:'none',color:'var(--c-t1)',fontSize:14,fontFamily:'inherit'}}/>
            <kbd style={{fontSize:10,color:'var(--c-t3)',background:'var(--c-surface2)',border:'1px solid var(--c-line)',borderRadius:5,padding:'2px 6px'}}>Esc</kbd>
          </div>
          <div style={{maxHeight:320,overflowY:'auto',padding:6}}>
            {filteredCmds.length===0 && <div style={{padding:24,textAlign:'center',color:'var(--c-t3)',fontSize:13}}>No results</div>}
            {filteredCmds.map((item,idx)=>(
              <Link key={idx} href={item.href} onClick={()=>{setCmdOpen(false);setCmdQuery('')}}
                style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:8,color:'var(--c-t1)',textDecoration:'none',fontSize:13,background:pathname===item.href?'var(--c-surface2)':'none'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--c-surface2)'}
                onMouseLeave={e=>e.currentTarget.style.background=pathname===item.href?'var(--c-surface2)':'none'}>
                <div style={{width:28,height:28,borderRadius:7,background:'var(--c-surface2)',border:'1px solid var(--c-line)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <I d={ICONS[item.icon]||ICONS.dashboard} s={12}/>
                </div>
                <span style={{flex:1}}>{item.label}</span>
                {pathname===item.href && <span style={{fontSize:10,color:'var(--c-t3)'}}>current</span>}
              </Link>
            ))}
          </div>
          <div style={{padding:'8px 16px',borderTop:'1px solid var(--c-line)',display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--c-t3)'}}>
            <span><kbd style={{background:'var(--c-surface2)',border:'1px solid var(--c-line)',borderRadius:4,padding:'1px 5px',fontSize:10}}>↑↓</kbd> navigate</span>
            <span><kbd style={{background:'var(--c-surface2)',border:'1px solid var(--c-line)',borderRadius:4,padding:'1px 5px',fontSize:10}}>⌘K</kbd> / <kbd style={{background:'var(--c-surface2)',border:'1px solid var(--c-line)',borderRadius:4,padding:'1px 5px',fontSize:10}}>Ctrl+K</kbd></span>
          </div>
        </div>
      )}

      {/* Sidebar — CSS hides on mobile (<768px) */}
      <aside className="ff-desktop-only" style={{ width:sidebarW, transition:'width 0.2s', flexShrink:0, background:'var(--c-surface)', borderRight:'1px solid var(--c-line)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Logo + collapse button */}
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
            <I d={collapsed ? ICONS.cR : ICONS.cL} s={13}/>
          </button>
        </div>

        {/* Nav links */}
        <nav style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:8, display:'flex', flexDirection:'column', gap:2 }}>
          {NAV.map(item => <NavItem key={item.href} item={item} collapsed={collapsed} active={pathname === item.href}/>)}
          {!collapsed
            ? <div style={{ fontSize:10, fontWeight:700, color:'var(--c-t3)', textTransform:'uppercase', letterSpacing:'0.06em', padding:'16px 8px 4px' }}>Tools</div>
            : <div style={{ borderTop:'1px solid var(--c-line)', margin:'8px 0' }}/>}
          {TOOLS.map(item => <NavItem key={item.href} item={item} collapsed={collapsed} active={pathname === item.href}/>)}
          </nav>

        {/* Dark mode toggle — hidden on mid-screen (pill in topbar handles it) */}
        <div style={{ padding:12, borderTop:'1px solid var(--c-line)', flexShrink:0 }}>
          <button onClick={toggleDark} className="ff-desktop-dark-toggle" style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:10, background:'none', border:'none', cursor:'pointer' }}>
            {!collapsed && <span style={{ fontSize:12, fontWeight:500, color:'var(--c-t2)' }}>{dark ? 'Dark' : 'Light'}</span>}
            <div style={{ marginLeft:'auto', width:36, height:20, background:dark?'#1d4ed8':'#e2e8f0', borderRadius:10, position:'relative', transition:'background 0.2s', flexShrink:0 }}>
              <div style={{ position:'absolute', top:3, left:dark?19:3, width:14, height:14, background:'#fff', borderRadius:'50%', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
            </div>
          </button>
        </div>
      </aside>

      {/* Main content column */}
      <div style={{ display:'flex', flexDirection:'column', flex:1, minWidth:0, overflow:'hidden' }}>

        {/* Topbar */}
        <header style={{ height:52, background:'var(--c-surface)', borderBottom:'1px solid var(--c-line)', display:'flex', alignItems:'center', padding:'0 16px', gap:12, flexShrink:0 }}>

          {/* Mobile logo — shown only on mobile via CSS */}
          <div className="ff-mobile-block" style={{ display:'none', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, background:'#1d4ed8', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
            </div>
            <span style={{ fontSize:14, fontWeight:700, color:'var(--c-t1)' }}>Flashfo</span>
          </div>

          {/* Welcome message — desktop only */}
          {!authLoading && user && firstName && (
            <span className="ff-desktop-only" style={{ fontSize:13, color:'var(--c-t2)', fontWeight:500 }}>
              Welcome back, <span style={{ color:'var(--c-t1)', fontWeight:700 }}>{firstName}</span> 
            </span>
          )}

          {/* Right side */}
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            {/* Cmd palette trigger */}
            <button onClick={()=>{setCmdOpen(true);setCmdQuery('')}} title="Command palette"
              style={{height:30,padding:'0 10px',borderRadius:8,border:'1px solid var(--c-line)',background:'var(--c-surface2)',cursor:'pointer',display:'flex',alignItems:'center',gap:6,color:'var(--c-t3)',fontSize:11}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <span className="ff-desktop-only">⌘K / Ctrl+K</span>
            </button>
            {/* Notification bell */}
             <div style={{ position:'relative' }}>
               <button ref={bellRef} onClick={() => { setShowNotifs(v=>!v); if(!showNotifs){ /* panel opening */ } }}
                 style={{ position:'relative', background:showNotifs?'var(--c-surface2)':'none', border:'none', cursor:'pointer', padding:5, color: unreadCount>0?'#a78bfa':'var(--c-t2)', display:'flex', alignItems:'center', borderRadius:8, flexShrink:0, transition:'color 0.2s,background 0.2s' }}
                 title="Notifications">
                 <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M8 1a5 5 0 00-5 5v2.5L1.5 11h13L13 8.5V6a5 5 0 00-5-5zM6.5 13.5a1.5 1.5 0 003 0"/>
                 </svg>
                 {unreadCount > 0 && (
                   <span style={{ position:'absolute', top:3, right:3, minWidth:14, height:14, background:'#ef4444', borderRadius:7, border:'1.5px solid var(--c-surface)', fontSize:8, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 2px' }}>
                     {unreadCount > 9 ? '9+' : unreadCount}
                   </span>
                 )}
               </button>

               {/* Notifications panel */}
               {showNotifs && (
                 <div ref={panelRef} style={{ position:'fixed', top:56, right:12, left:12, width:'auto', maxWidth:380, margin:'0 auto', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.4)', zIndex:300, overflow:'hidden' }}>
                   {/* Header */}
                   <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid var(--c-line)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                     <span style={{ fontSize:13, fontWeight:600, color:'var(--c-t1)' }}>Notifications</span>
                     <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                       {unreadCount > 0 && (
                         <button onClick={markAllRead} style={{ fontSize:11, color:'#a78bfa', background:'none', border:'none', cursor:'pointer', padding:0 }}>Mark all read</button>
                       )}
                       <button onClick={() => setShowNotifs(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--c-t3)', display:'flex', padding:2 }}>
                         <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 1l10 10M11 1L1 11"/></svg>
                       </button>
                     </div>
                   </div>

                   {/* Filter pills */}
                   {notifCategories.length > 1 && (
                     <div style={{ padding:'8px 12px', display:'flex', gap:6, overflowX:'auto', borderBottom:'1px solid var(--c-line)' }}>
                       {notifCategories.map(cat => (
                         <button key={cat} onClick={() => setNotifFilter(cat)}
                           style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500, border:'1px solid', whiteSpace:'nowrap', cursor:'pointer', transition:'all 0.15s',
                             background: notifFilter===cat ? '#a78bfa' : 'var(--c-surface2)',
                             borderColor: notifFilter===cat ? '#a78bfa' : 'var(--c-line)',
                             color: notifFilter===cat ? '#fff' : 'var(--c-t2)' }}>
                           {cat.charAt(0).toUpperCase()+cat.slice(1)}
                         </button>
                       ))}
                     </div>
                   )}

                   {/* List */}
                   <div style={{ maxHeight:360, overflowY:'auto' }}>
                     {filteredNotifs.length === 0 ? (
                       <div style={{ padding:'32px 16px', textAlign:'center', color:'var(--c-t3)', fontSize:13 }}>
                         <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--c-t3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:8}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                         <p style={{ margin:0 }}>No notifications yet</p>
                       </div>
                     ) : filteredNotifs.map(n => (
                       <div key={n.id} onClick={() => markRead(n.id)}
                         style={{ padding:'12px 16px', borderBottom:'1px solid var(--c-line)', cursor:'pointer', background: n.read ? 'transparent' : 'rgba(167,139,250,0.05)', display:'flex', gap:12, alignItems:'flex-start', transition:'background 0.15s' }}
                         onMouseEnter={e=>e.currentTarget.style.background='var(--c-surface2)'}
                         onMouseLeave={e=>e.currentTarget.style.background=n.read?'transparent':'rgba(167,139,250,0.05)'}>
                         <div style={{ width:32, height:32, borderRadius:8, background: n.read?'var(--c-surface2)':'rgba(167,139,250,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:15 }}>
                           {n.type==='assignment'
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>
    : n.type==='quiz'
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
    : n.type==='grade'
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="20 6 9 17 4 12"/></svg>
    : n.type==='class'
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  }
                         </div>
                         <div style={{ flex:1, minWidth:0 }}>
                           <p style={{ margin:'0 0 2px', fontSize:13, fontWeight: n.read?400:600, color:'var(--c-t1)', lineHeight:1.4 }}>{n.title}</p>
                           {n.body && <p style={{ margin:'0 0 4px', fontSize:12, color:'var(--c-t2)', lineHeight:1.4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{n.body}</p>}
                           <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                             {n.category && <span style={{ fontSize:10, color:'#a78bfa', background:'rgba(167,139,250,0.1)', padding:'1px 6px', borderRadius:4 }}>{n.category}</span>}
                             <span style={{ fontSize:10, color:'var(--c-t3)' }}>{n.created_at ? new Date(n.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : ''}</span>
                           </div>
                         </div>
                         {!n.read && <div style={{ width:6, height:6, borderRadius:'50%', background:'#a78bfa', flexShrink:0, marginTop:4 }}/>}
                       </div>
                     ))}
                   </div>
                 </div>
               )}
             </div>

            {/* Dark pill — shows on mobile + mid-screen only */}
            <button onClick={toggleDark} className="ff-mid-mobile-only" style={{ height:30, padding:'0 10px', borderRadius:20, border:'1px solid var(--c-line)', background:'var(--c-surface2)', cursor:'pointer', alignItems:'center', gap:5, color:'var(--c-t2)', flexShrink:0, fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>
              <svg width="14" height="14" viewBox="-1 -1 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink:0 }}>
                {dark
                  ? <path d="M8 1v1M8 14v1M1 8h1M14 8h1M3 3l.7.7M12.3 12.3l.7.7M3 13l.7-.7M12.3 3.7l.7-.7M11 8a3 3 0 11-6 0 3 3 0 016 0z"/>
                  : <path d="M13 8.5A5.5 5.5 0 016 2a6 6 0 100 12 5.5 5.5 0 007-5.5z"/>}
              </svg>
              <span>{dark ? 'Light' : 'Dark'}</span>
            </button>

            {/* Auth */}
            {!authLoading && !user && (
              <a href="/auth" style={{ height:32, padding:'0 14px', fontSize:12, fontWeight:600, background:'#1d4ed8', color:'white', borderRadius:8, display:'inline-flex', alignItems:'center', textDecoration:'none' }}>Sign in</a>
            )}
            {!authLoading && user && (
              <div style={{ position:'relative' }}>
                <button onClick={() => setShowUserMenu(m => !m)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, padding:'2px 4px', borderRadius:8 }}>
                  <Avatar user={user} profile={profile}/>
                  <span className="ff-desktop-only" style={{ fontSize:12, fontWeight:600, color:'var(--c-t1)', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {profile?.full_name || user.email}
                  </span>
                </button>
                {showUserMenu && (
                  <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:14, padding:8, minWidth:180, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:200 }}>
                    <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--c-line)', marginBottom:4 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--c-t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile?.full_name || 'Account'}</div>
                      <div style={{ fontSize:11, color:'var(--c-t3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</div>
                    </div>
                    <a href="/settings" onClick={() => setShowUserMenu(false)} style={{ display:'block', padding:'8px 12px', fontSize:13, color:'var(--c-t1)', textDecoration:'none', borderRadius:8, fontWeight:500 }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--c-surface2)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>Settings</a>
                    <button onClick={handleSignOut} style={{ width:'100%', textAlign:'left', padding:'8px 12px', fontSize:13, color:'#ef4444', background:'none', border:'none', cursor:'pointer', borderRadius:8, fontWeight:500 }}
                      onMouseEnter={e=>e.currentTarget.style.background='#fef2f2'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>Sign out</button>
                  </div>
                )}
              </div>
            )}
            {authLoading && <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--c-line)' }}/>}
          </div>
        </header>

        <main className="ff-content" style={{ flex:1, overflowY:'auto' }} key={pathname}>
          {children}
        </main>
      </div>

      {/* Mobile wheel overlay */}
      {plusOpen && (
        <div onClick={() => setPlusOpen(false)}
          style={{ position:'fixed', top:0, left:0, right:0, bottom:64, zIndex:98,
            background:'rgba(0,0,0,0.4)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', transition:'backdrop-filter 0.4s ease, opacity 0.4s ease',
            display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'0 16px 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[
              { href:'/quiz',           label:'Quiz',           icon:'M6 5.5a2.5 2.5 0 014.5 1.5c0 1.5-1.5 2-2 3V11m0 2.5v.5' },
              { href:'/flashcards',     label:'Flashcards',     icon:'M4 3h9a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zM2 5H1v7a1 1 0 001 1h9' },
              { href:'/summarize',      label:'Summarize',      icon:'M2 3h12v2.5H2zm0 4h8v2.5H2zm0 4h10v2H2' },
              { href:'/study-guide',    label:'Study Guide',    icon:'M1 3h6.5L9 4.5h6V13H9l-1.5-1.5H1zm0 0v10' },
              { href:'/teach',          label:'Teacher Portal', icon:'M8 1a4 4 0 100 8 4 4 0 000-8zm-6 14c0-3.3 2.7-6 6-6s6 2.7 6 6' },
              { href:'/student-portal', label:'Student Portal', icon:'M8 1l7 3.5-7 3.5-7-3.5zm-5 5.5v4c0 2 2.2 3 5 3s5-1 5-3V10' },
            ].map(item => (
              <Link key={item.label} href={item.href} onClick={() => setPlusOpen(false)}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'14px 8px', borderRadius:16, background:'var(--c-surface)', border:'1px solid var(--c-line)', textDecoration:'none' }}>
                <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round">
                  <path d={item.icon}/>
                </svg>
                <span style={{ fontSize:10, fontWeight:600, color:'var(--c-t1)', textAlign:'center', lineHeight:1.2 }}>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mobile nav — CSS wrapper hides on desktop */}
      <div className="ff-mobile-only">
        <button onClick={() => setPlusOpen(o => !o)}
          style={{ position:'fixed', bottom:'calc(12px + env(safe-area-inset-bottom, 0px))', left:'calc(50% - 26px)',
            transform: plusOpen ? 'rotate(45deg)' : 'none',
            width:52, height:52, background:'#2563eb', border:'none', borderRadius:16,
            cursor:'pointer', zIndex:101, transition:'transform 0.2s',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M8 2v12M2 8h12"/>
          </svg>
        </button>
        <nav style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100,
          background:'var(--c-surface)', borderTop:'1px solid var(--c-line)',
          height:64, paddingBottom:'env(safe-area-inset-bottom, 0px)',
          display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', alignItems:'center' }}>
          <Link href="/dashboard" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'6px 4px', borderRadius:12, textDecoration:'none', justifyContent:'center', color: pathname==='/dashboard'?'#3b82f6':'var(--c-t3)' }}>
            <I d={ICONS.dashboard} s={20}/><span style={{ fontSize:9, fontWeight:600 }}>Dashboard</span>
          </Link>
          <Link href="/my-stuff" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'6px 4px', borderRadius:12, textDecoration:'none', justifyContent:'center', color: pathname==='/my-stuff'?'#3b82f6':'var(--c-t3)' }}>
            <I d={ICONS.mystuff} s={20}/><span style={{ fontSize:9, fontWeight:600 }}>My Stuff</span>
          </Link>
          <div/>
          <Link href="/ai-tutor" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'6px 4px', borderRadius:12, textDecoration:'none', justifyContent:'center', color: pathname==='/ai-tutor'?'#6366f1':'var(--c-t3)' }}>
            <I d={ICONS.tutor} s={20}/><span style={{ fontSize:9, fontWeight:600 }}>Nova</span>
          </Link>
          <Link href="/settings" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'6px 4px', borderRadius:12, textDecoration:'none', justifyContent:'center', color: pathname==='/settings'?'#3b82f6':'var(--c-t3)' }}>
            <I d={ICONS.settings} s={20}/><span style={{ fontSize:9, fontWeight:600 }}>Settings</span>
          </Link>
        </nav>
      </div>

    <style>{`
      @keyframes nova-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.75)}}
      @keyframes nova-breathe{0%,100%{box-shadow:0 0 0 0 rgba(167,139,250,0.5)}50%{box-shadow:0 0 0 6px rgba(167,139,250,0)}}
      @keyframes nova-thinking{0%,100%{box-shadow:0 0 0 2px rgba(167,139,250,0.7)}50%{box-shadow:0 0 0 5px rgba(167,139,250,0.1)}}
    `}</style>
    </div>
  )
}