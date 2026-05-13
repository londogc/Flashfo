'use client'
// Flashfo — Shell (Phase 3 redesign)
// Hover-expand island nav, per-section accent system, dark-first
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { novaStream } from '@/lib/api'
import { useIsMobile } from '@/hooks/useIsMobile'
import dynamic from 'next/dynamic'
import StickyNotes from '@/components/StickyNotes'

const MobileShell = dynamic(() => import('@/components/MobileShell'), { ssr: false })

// ── Accent system ─────────────────────────────────────────────────────────────
const ACCENT_MAP = {
  '/dashboard':     { h:'#6366f1', r:'99,102,241' },
  '/my-stuff':      { h:'#14b8a6', r:'20,184,166' },
  '/my-progress':   { h:'#0ea5e9', r:'14,165,233' },
  '/ai-tutor':      { h:'#8b5cf6', r:'139,92,246' },
  '/create':        { h:'#10b981', r:'16,185,129' },
  '/flashcards':    { h:'#10b981', r:'16,185,129' },
  '/quiz':          { h:'#10b981', r:'16,185,129' },
  '/study':         { h:'#10b981', r:'16,185,129' },
  '/study-guide':   { h:'#10b981', r:'16,185,129' },
  '/summarize':     { h:'#10b981', r:'16,185,129' },
  '/source-library':{ h:'#ec4899', r:'236,72,153' },
  '/teach':         { h:'#f59e0b', r:'245,158,11' },
  '/lesson-builder':{ h:'#f43f5e', r:'244,63,94' },
  '/live-quiz':     { h:'#f97316', r:'249,115,22' },
  '/assignments':   { h:'#06b6d4', r:'6,182,212' },
  '/student-portal':{ h:'#06b6d4', r:'6,182,212' },
  '/profile':       { h:'#f59e0b', r:'245,158,11' },
  '/settings':      { h:'#6b7280', r:'107,114,128' },
  '/curriculum':    { h:'#8b5cf6', r:'139,92,246' },
  '/collab-decks':  { h:'#10b981', r:'16,185,129' },
}
function getAccent(pathname) {
  const base = '/' + (pathname.split('/').filter(Boolean)[0] || '')
  return ACCENT_MAP[base] || ACCENT_MAP['/dashboard']
}

// ── Icons (inline SVG paths) ──────────────────────────────────────────────────
const ICONS = {
  dashboard:  'M1 1h6v6H1zm8 0h6v6H9zM1 9h6v6H1zm8 0h6v6H9z',
  create:     'M8 1v14M1 8h14',
  study:      'M2 4h12M2 8h8M2 12h10',
  nova:       'M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a4 4 0 100 8 4 4 0 000-8zm0 3a1 1 0 100 2 1 1 0 000-2z',
  teach:      'M8 1a4 4 0 100 8 4 4 0 000-8zm-6 14c0-3.3 2.7-6 6-6s6 2.7 6 6',
  mystuff:    'M1 4h5l2 2h7v8H1zm0 2v8',
  progress:   'M2 13V7h3v6zm4 0V4h3v9zm4 0V9h3v4z',
  sources:    'M1 5h3v9H1zm4-3h4v12H5zm5 2h4v10h-4z',
  curriculum: 'M1 2h6v12H1zm8 0h6v12H9z',
  collab:     'M2 5h9v8H2zM4 3h9v8H4z',
  together:   'M5 7a3 3 0 100-6 3 3 0 000 6zm6 0a3 3 0 100-6 3 3 0 000 6zM1 15c0-2.2 1.8-4 4-4m10 4c0-2.2-1.8-4-4-4',
  studentp:   'M8 1l7 3.5-7 3.5-7-3.5zm-5 5.5v4c0 2 2.2 3 5 3s5-1 5-3V10',
  assignments:'M13 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V2a1 1 0 00-1-1zM5 5h6m-6 3h6m-6 3h4',
  import:     'M8 1v8m-3-3l3 3 3-3M1 11v2a2 2 0 002 2h10a2 2 0 002-2v-2',
  settings:   'M12.4 8a4.4 4.4 0 11-8.8 0 4.4 4.4 0 018.8 0zM14.3 9.2l1.7 1-2 3.5-1.7-1a6 6 0 01-1.8 1l-.3 2h-4l-.3-2a6 6 0 01-1.8-1l-1.7 1-2-3.5 1.7-1A6 6 0 012 8c0-.4 0-.8.1-1.2L.4 5.8l2-3.5 1.7 1A6 6 0 016 2.3L6.3.3h4l.3 2a6 6 0 011.8 1l1.7-1 2 3.5-1.7 1c.1.4.1.8.1 1.2s0 .8-.2 1.2z',
  notif:      'M8 1a6 6 0 016 6v3l2 2H2l2-2V7a6 6 0 016-6zm-1 13h2a1 1 0 01-2 0z',
  chevR:      'M6 3l5 5-5 5',
  chevL:      'M10 3L5 8l5 5',
  signout:    'M10 8H2M4 5l-3 3 3 3M9 5l4-4 1 1-3 3m0 0l3 3-1 1-4-4',
  moon:       'M12 3a6 6 0 00-8 8.5A6 6 0 0012 3z',
  sun:        'M8 1v1M8 14v1M3.5 3.5l.7.7M11.8 11.8l.7.7M1 8h1M14 8h1M3.5 12.5l.7-.7M11.8 4.2l.7-.7M8 5a3 3 0 100 6 3 3 0 000-6z',
  search:     'M7 1a6 6 0 100 12A6 6 0 007 1zm7 14l-3-3',
}

const I = ({ d, s = 16, color = 'currentColor' }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display:'block', flexShrink:0 }}>
    {Array.isArray(d) ? d.map((p,i) => <path key={i} d={p}/>) : <path d={d}/>}
  </svg>
)

// ── Plan access ───────────────────────────────────────────────────────────────
const PLAN_RANK = { free:0, student:1, teacher:2, school:3, lifetime:99 }
function canAccess(userPlan, minPlan) {
  const plan = userPlan || 'free'
  return plan === 'lifetime' || (PLAN_RANK[plan] ?? 0) >= (PLAN_RANK[minPlan] ?? 0)
}

// ── Nav definition ────────────────────────────────────────────────────────────
const NAV_STUDENT = [
  { section: null },
  { href:'/dashboard',     label:'Dashboard',     icon:'dashboard',    minPlan:'free' },
  { href:'/ai-tutor',      label:'Nova',          icon:'nova',         minPlan:'student', nova:true },
  { sep: true },
  { section: 'Tools' },
  { href:'/create',        label:'Create',        icon:'create',       minPlan:'student' },
  { href:'/study',         label:'Study',         icon:'study',        minPlan:'student' },
  { href:'/source-library',label:'Source Library',icon:'sources',      minPlan:'student' },
  { sep: true },
  { section: 'Library' },
  { href:'/my-stuff',      label:'My Stuff',      icon:'mystuff',      minPlan:'student' },
  { href:'/my-progress',   label:'My Progress',   icon:'progress',     minPlan:'student' },
  { href:'/assignments',   label:'Assignments',   icon:'assignments',  minPlan:'student' },
  { href:'/student-portal',label:'Student Portal',icon:'studentp',     minPlan:'student' },
  { href:'/collab-decks',  label:'Collab Decks',  icon:'collab',       minPlan:'student' },
]
const NAV_TEACHER = [
  { section: null },
  { href:'/dashboard',     label:'Dashboard',     icon:'dashboard',    minPlan:'free' },
  { href:'/ai-tutor',      label:'Nova',          icon:'nova',         minPlan:'student', nova:true },
  { sep: true },
  { section: 'Classroom' },
  { href:'/teach',         label:'Teaching',      icon:'teach',        minPlan:'teacher' },
  { href:'/assignments',   label:'Assignments',   icon:'assignments',  minPlan:'teacher' },
  { href:'/student-portal',label:'Student Portal',icon:'studentp',     minPlan:'teacher' },
  { href:'/curriculum',    label:'Curriculum',    icon:'curriculum',   minPlan:'teacher' },
  { sep: true },
  { section: 'Tools' },
  { href:'/lesson-builder',label:'Lesson Builder',icon:'study',        minPlan:'teacher' },
  { href:'/source-library',label:'Source Library',icon:'sources',      minPlan:'teacher' },
  { href:'/my-stuff',      label:'My Stuff',      icon:'mystuff',      minPlan:'student' },
]

function getNav(role) {
  if (role === 'teacher') return NAV_TEACHER
  return NAV_STUDENT
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function CreatureSVG({ id, size }) {
  const s = { width:size, height:size, viewBox:'0 0 60 60', display:'block' }
  if (id==='cat')     return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#1a2e1a"/><circle cx="30" cy="32" r="15" fill="#4ade80"/><ellipse cx="22" cy="18" rx="5" ry="8" fill="#86efac"/><ellipse cx="38" cy="18" rx="5" ry="8" fill="#86efac"/><ellipse cx="22" cy="20" rx="3.5" ry="5.5" fill="#4ade80"/><ellipse cx="38" cy="20" rx="3.5" ry="5.5" fill="#4ade80"/><circle cx="25" cy="30" r="5" fill="#fff"/><circle cx="35" cy="30" r="5" fill="#fff"/><circle cx="25" cy="30" r="3" fill="#166534"/><circle cx="35" cy="30" r="3" fill="#166534"/><circle cx="24" cy="29" r="1" fill="#fff"/><circle cx="34" cy="29" r="1" fill="#fff"/><path d="M27 38 Q30 41 33 38" stroke="#166534" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>)
  if (id==='alien')   return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#0f172a"/><ellipse cx="30" cy="35" rx="16" ry="13" fill="#818cf8"/><circle cx="30" cy="22" r="12" fill="#a5b4fc"/><circle cx="30" cy="13" r="5" fill="#c7d2fe"/><ellipse cx="22" cy="22" rx="4" ry="7" fill="#6366f1"/><ellipse cx="38" cy="22" rx="4" ry="7" fill="#6366f1"/><circle cx="26" cy="22" r="4.5" fill="#fff"/><circle cx="34" cy="22" r="4.5" fill="#fff"/><circle cx="26" cy="22" r="2.8" fill="#312e81"/><circle cx="34" cy="22" r="2.8" fill="#312e81"/><circle cx="25" cy="21" r="1" fill="#fff"/><circle cx="33" cy="21" r="1" fill="#fff"/><path d="M27 31 Q30 34 33 31" stroke="#312e81" strokeWidth="1.4" fill="none" strokeLinecap="round"/></svg>)
  if (id==='fox')     return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#2d1a00"/><ellipse cx="30" cy="38" rx="14" ry="11" fill="#f97316"/><circle cx="30" cy="24" r="12" fill="#f97316"/><ellipse cx="30" cy="13" rx="7" ry="4.5" fill="#fb923c"/><rect x="27.5" y="9" width="5" height="7" rx="2.5" fill="#fb923c"/><circle cx="25" cy="23" r="4.5" fill="#fff"/><circle cx="35" cy="23" r="4.5" fill="#fff"/><circle cx="25" cy="23" r="2.8" fill="#431407"/><circle cx="35" cy="23" r="2.8" fill="#431407"/><circle cx="24" cy="22" r="1" fill="#fff"/><circle cx="34" cy="22" r="1" fill="#fff"/><path d="M27 30 Q30 33 33 30" stroke="#431407" strokeWidth="1.4" fill="none" strokeLinecap="round"/></svg>)
  if (id==='dolphin') return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#001a2d"/><circle cx="30" cy="26" r="14" fill="#38bdf8"/><ellipse cx="18" cy="24" rx="5" ry="9" fill="#7dd3fc"/><ellipse cx="42" cy="24" rx="5" ry="9" fill="#7dd3fc"/><circle cx="25" cy="24" r="5" fill="#fff"/><circle cx="35" cy="24" r="5" fill="#fff"/><circle cx="25" cy="24" r="3" fill="#0c4a6e"/><circle cx="35" cy="24" r="3" fill="#0c4a6e"/><circle cx="24" cy="23" r="1.1" fill="#fff"/><circle cx="34" cy="23" r="1.1" fill="#fff"/><path d="M27 33 Q30 36 33 33" stroke="#0c4a6e" strokeWidth="1.4" fill="none" strokeLinecap="round"/></svg>)
  if (id==='wizard')  return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#1a0a2e"/><ellipse cx="30" cy="42" rx="16" ry="12" fill="#a855f7"/><circle cx="30" cy="24" r="13" fill="#c084fc"/><path d="M17 20 Q30 7 43 20 L42 16 Q30 5 18 16Z" fill="#7e22ce"/><circle cx="25" cy="24" r="4" fill="#fff"/><circle cx="35" cy="24" r="4" fill="#fff"/><circle cx="25" cy="24" r="2.5" fill="#581c87"/><circle cx="35" cy="24" r="2.5" fill="#581c87"/><circle cx="24" cy="23" r="0.9" fill="#fff"/><circle cx="34" cy="23" r="0.9" fill="#fff"/><path d="M27 31 Q30 34 33 31" stroke="#581c87" strokeWidth="1.4" fill="none" strokeLinecap="round"/></svg>)
  return null
}

function Avatar({ user, profile, size = 26, accentH }) {
  if (profile?.avatar_url) return <img src={profile.avatar_url} alt="" style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', border:`1.5px solid ${accentH}44`, flexShrink:0 }}/>
  if (profile?.avatar_id) return <div style={{ width:size, height:size, borderRadius:'50%', overflow:'hidden', flexShrink:0, border:`1.5px solid ${accentH}44` }}><CreatureSVG id={profile.avatar_id} size={size}/></div>
  const initials = (profile?.full_name || user?.email || '?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  return <div style={{ width:size, height:size, borderRadius:'50%', background:`rgba(${(ACCENT_MAP['/dashboard'].r)},0.2)`, border:`1.5px solid ${accentH}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:700, color:accentH, flexShrink:0 }}>{initials}</div>
}

// ── NovaAmbient (unchanged) ───────────────────────────────────────────────────
function NovaAmbient({ pathname }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [reply, setReply] = useState('')
  const ref = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const send = async () => {
    if (!input.trim() || loading) return
    setLoading(true); setReply('')
    try {
      const res = await novaStream([{ role:'user', content:input }], { systemOverride:'You are Nova, a concise AI study assistant. Answer in 2-3 sentences.' })
      const reader = res.body.getReader(); const dec = new TextDecoder(); let full = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        const chunk = dec.decode(value)
        chunk.split('\n').forEach(line => { if (line.startsWith('data:')) { try { const d = JSON.parse(line.slice(5)); if (d.delta) { full += d.delta; setReply(full) } } catch {} } })
      }
    } catch(e) { setReply('Something went wrong.') }
    setLoading(false)
  }
  if (pathname === '/ai-tutor') return null
  return (
    <div ref={ref} style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:100, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      {open && (
        <div style={{ width:380, background:'rgba(10,8,22,0.95)', border:'1px solid rgba(139,92,246,0.3)', borderRadius:16, padding:16, backdropFilter:'blur(24px)', boxShadow:'0 8px 40px rgba(0,0,0,0.5)' }}>
          {reply && <div style={{ fontSize:13, color:'rgba(255,255,255,0.8)', marginBottom:10, lineHeight:1.6, maxHeight:120, overflowY:'auto' }}>{reply}</div>}
          <div style={{ display:'flex', gap:8 }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask Nova anything…" autoFocus
              style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'8px 12px', fontSize:13, color:'#fff', outline:'none', fontFamily:'inherit' }}/>
            <button onClick={send} disabled={loading} style={{ height:36, padding:'0 14px', background:'rgba(124,58,237,0.5)', border:'1px solid rgba(167,139,250,0.4)', borderRadius:10, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              {loading ? '…' : 'Ask'}
            </button>
          </div>
        </div>
      )}
      <button onClick={()=>setOpen(o=>!o)}
        style={{ height:36, padding:'0 16px', background:'rgba(10,8,22,0.88)', border:`1px solid rgba(139,92,246,${open?'0.6':'0.3'})`, borderRadius:20, display:'flex', alignItems:'center', gap:8, cursor:'pointer', backdropFilter:'blur(12px)', boxShadow:open?'0 0 20px rgba(124,58,237,0.4)':'0 2px 12px rgba(0,0,0,0.4)', transition:'all 0.2s' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="#c4b5fd" stroke="none"/></svg>
        <span style={{ fontSize:12, fontWeight:600, color:'rgba(196,181,253,0.9)' }}>Nova</span>
        {loading && <span style={{ width:6, height:6, borderRadius:'50%', background:'#c4b5fd', animation:'nova-pulse 1s infinite' }}/>}
      </button>
    </div>
  )
}

// ── Main Shell ────────────────────────────────────────────────────────────────
export default function Shell({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useIsMobile()
  const { user, profile, loading: authLoading, signOut } = useAuth()

  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem('ff-theme')
    const isDark = saved !== 'light'
    document.documentElement.classList.toggle('dark', isDark)
    return isDark
  })
  const [cmdOpen, setCmdOpen] = useState(false)
  const [cmdQuery, setCmdQuery] = useState('')
  const cmdInputRef = useRef(null)
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const bellRef = useRef(null)
  const panelRef = useRef(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)
  const [navHovered, setNavHovered] = useState(false)

  const accent = getAccent(pathname)
  const role = profile?.role || 'student'
  const navItems = getNav(role)
  const plan = profile?.plan || 'free'

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => { document.body.setAttribute('data-path', pathname) }, [pathname])

  useEffect(() => {
    const id = 'shell-anim'
    if (document.getElementById(id)) return
    const s = document.createElement('style')
    s.id = id
    s.textContent = [
      '@keyframes sh-spin{to{transform:rotate(360deg)}}',
      '@keyframes nova-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.75)}}',
      '@media(max-width:767px){.ff-desktop-shell{display:none!important}}',
    ].join('')
    document.head.appendChild(s)
  }, [])

  useEffect(() => {
    if (!user) return
    const fetchNotifs = async () => {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
      if (data) { setNotifications(data); setUnreadCount(data.filter(n => !n.read).length) }
    }
    fetchNotifs()
    const sub = supabase.channel('notifs_'+user.id)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'notifications', filter:'user_id=eq.'+user.id }, payload => {
        setNotifications(prev => [payload.new, ...prev]); setUnreadCount(c => c + 1)
      }).subscribe()
    return () => supabase.removeChannel(sub)
  }, [user])

  useEffect(() => {
    if (!showNotifs) return
    const h = (e) => { if (panelRef.current && !panelRef.current.contains(e.target) && bellRef.current && !bellRef.current.contains(e.target)) setShowNotifs(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [showNotifs])

  useEffect(() => {
    if (!showUserMenu) return
    const h = (e) => { if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [showUserMenu])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(v => !v); setCmdQuery('') }
      if (e.key === 'Escape') { setCmdOpen(false); setShowNotifs(false); setShowUserMenu(false) }
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => { if (cmdOpen && cmdInputRef.current) cmdInputRef.current.focus() }, [cmdOpen])

  // ── Handlers ──────────────────────────────────────────────────────────────
  function toggleDark() {
    const next = !dark; setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('ff-theme', next ? 'dark' : 'light')
  }

  async function handleSignOut() {
    await signOut()
    setShowUserMenu(false)
    window.location.href = '/auth'
  }

  const markAllRead = async () => {
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true }))); setUnreadCount(0)
  }

  const markRead = async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(c => Math.max(0, c - 1))
  }

  const CMD_ITEMS = [
    { label:'Dashboard', href:'/dashboard', icon:'dashboard' },
    { label:'Nova', href:'/ai-tutor', icon:'nova' },
    { label:'Flashcards', href:'/flashcards', icon:'study' },
    { label:'Quiz', href:'/quiz', icon:'study' },
    { label:'Study Guide', href:'/study-guide', icon:'study' },
    { label:'Summarize', href:'/summarize', icon:'study' },
    { label:'Source Library', href:'/source-library', icon:'sources' },
    { label:'My Stuff', href:'/my-stuff', icon:'mystuff' },
    { label:'Assignments', href:'/assignments', icon:'assignments' },
    { label:'Teach', href:'/teach', icon:'teach' },
    { label:'Lesson Builder', href:'/lesson-builder', icon:'study' },
    { label:'Curriculum', href:'/curriculum', icon:'curriculum' },
    { label:'Collab Decks', href:'/collab-decks', icon:'collab' },
    { label:'My Progress', href:'/my-progress', icon:'progress' },
    { label:'Student Portal', href:'/student-portal', icon:'studentp' },
  ]
  const filteredCmds = cmdQuery ? CMD_ITEMS.filter(c => c.label.toLowerCase().includes(cmdQuery.toLowerCase())) : CMD_ITEMS
  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || null

  if (isMobile) return <><MobileShell>{children}</MobileShell><StickyNotes/></>

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ff-desktop-shell" style={{ display:'flex', height:'100dvh', overflow:'hidden', background:'#04030c', position:'relative' }}>

      {/* Ambient accent glow behind nav */}
      <div style={{ position:'fixed', width:220, height:220, borderRadius:'50%', background:accent.h, filter:'blur(80px)', opacity:0.07, top:-40, left:-60, pointerEvents:'none', zIndex:0, transition:'background 0.6s ease' }}/>

      {/* Nova ambient pill */}
      {pathname !== '/ai-tutor' && <NovaAmbient pathname={pathname}/>}

      {/* Command palette */}
      {cmdOpen && <div onClick={() => setCmdOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:200, backdropFilter:'blur(4px)' }}/>}
      {cmdOpen && (
        <div style={{ position:'fixed', top:'18%', left:'50%', transform:'translateX(-50%)', width:'min(560px,calc(100vw - 32px))', background:'rgba(10,8,22,0.98)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,0.7)', zIndex:201, overflow:'hidden', backdropFilter:'blur(24px)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
            <I d={ICONS.search} s={14} color="rgba(255,255,255,0.3)"/>
            <input ref={cmdInputRef} value={cmdQuery} onChange={e => setCmdQuery(e.target.value)} placeholder="Search pages and tools..." style={{ flex:1, background:'none', border:'none', outline:'none', color:'rgba(255,255,255,0.88)', fontSize:14, fontFamily:'inherit' }}/>
            <kbd style={{ fontSize:10, color:'rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:5, padding:'2px 6px' }}>Esc</kbd>
          </div>
          <div style={{ maxHeight:320, overflowY:'auto', padding:6 }}>
            {filteredCmds.length === 0 && <div style={{ padding:24, textAlign:'center', color:'rgba(255,255,255,0.3)', fontSize:13 }}>No results</div>}
            {filteredCmds.map((item, idx) => (
              <Link key={idx} href={item.href} onClick={() => { setCmdOpen(false); setCmdQuery('') }}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, color:'rgba(255,255,255,0.75)', textDecoration:'none', fontSize:13, background: pathname === item.href ? 'rgba(255,255,255,0.06)' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = pathname === item.href ? 'rgba(255,255,255,0.06)' : 'none'}>
                <div style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <I d={ICONS[item.icon] || ICONS.dashboard} s={12} color="rgba(255,255,255,0.5)"/>
                </div>
                <span>{item.label}</span>
                {pathname === item.href && <span style={{ marginLeft:'auto', fontSize:10, color:'rgba(255,255,255,0.3)' }}>current</span>}
              </Link>
            ))}
          </div>
          <div style={{ padding:'8px 16px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', fontSize:11, color:'rgba(255,255,255,0.25)' }}>
            <span>↑↓ navigate</span><span>⌘K toggle</span>
          </div>
        </div>
      )}

      {/* ── Hover-expand Nav ── */}
      <nav
        onMouseEnter={() => setNavHovered(true)}
        onMouseLeave={() => setNavHovered(false)}
        style={{
          position:'relative', zIndex:10, flexShrink:0,
          width: navHovered ? 210 : 58,
          transition:'width 0.32s cubic-bezier(0.34,1.56,0.64,1)',
          background:'rgba(255,255,255,0.025)',
          borderRight:'0.5px solid rgba(255,255,255,0.07)',
          display:'flex', flexDirection:'column', overflow:'hidden',
        }}>

        {/* Logo */}
        <div style={{ height:52, display:'flex', alignItems:'center', padding:'0 14px', gap:10, borderBottom:'0.5px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
          <div style={{ width:28, height:28, borderRadius:9, background:`rgba(${accent.r},0.2)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.5s' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill={accent.h} style={{ transition:'fill 0.5s' }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10"/></svg>
          </div>
          <span style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.85)', whiteSpace:'nowrap', opacity: navHovered ? 1 : 0, transform: navHovered ? 'translateX(0)' : 'translateX(-8px)', transition:'opacity 0.18s 0.1s, transform 0.18s 0.1s' }}>Flashfo</span>
        </div>

        {/* Nav items */}
        <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:'6px 0' }}>
          {navItems.map((item, i) => {
            if (item.sep) return <div key={i} style={{ height:'0.5px', background:'rgba(255,255,255,0.06)', margin:'5px 10px' }}/>
            if (item.section !== undefined) return item.section ? (
              <div key={i} style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)', padding:'0 15px', margin:'8px 0 3px', whiteSpace:'nowrap', opacity: navHovered ? 1 : 0, transform: navHovered ? 'translateX(0)' : 'translateX(-6px)', transition:'opacity 0.17s 0.12s, transform 0.17s 0.12s' }}>{item.section}</div>
            ) : null
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const locked = !canAccess(plan, item.minPlan)
            return (
              <Link key={item.href} href={locked ? '#' : item.href}
                onClick={locked ? (e) => { e.preventDefault(); alert(`Upgrade to access ${item.label}.`) } : undefined}
                title={!navHovered ? item.label : undefined}
                style={{ display:'flex', alignItems:'center', height:36, padding:'0 14px', gap:10,
                  borderLeft:`2px solid ${active ? accent.h : 'transparent'}`,
                  background: active ? `rgba(${accent.r},0.1)` : 'transparent',
                  textDecoration:'none', cursor: locked ? 'not-allowed' : 'pointer',
                  opacity: locked ? 0.4 : 1, transition:'background 0.14s, border-color 0.5s' }}
                onMouseEnter={e => { if (!active && !locked) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.background = active ? `rgba(${accent.r},0.1)` : 'transparent' }}>
                <I d={ICONS[item.icon] || ICONS.dashboard} s={16} color={active ? accent.h : 'rgba(255,255,255,0.35)'}/>
                <span style={{ fontSize:13, color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)', whiteSpace:'nowrap', fontWeight: active ? 500 : 400, opacity: navHovered ? 1 : 0, transform: navHovered ? 'translateX(0)' : 'translateX(-7px)', transition:'opacity 0.17s 0.08s, transform 0.17s 0.08s' }}>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ borderTop:'0.5px solid rgba(255,255,255,0.07)', padding:'6px 0', flexShrink:0 }}>
          {/* Dark toggle */}
          <button onClick={toggleDark}
            style={{ display:'flex', alignItems:'center', height:36, width:'100%', padding:'0 14px', gap:10, background:'none', border:'none', cursor:'pointer', borderLeft:'2px solid transparent' }}>
            <I d={dark ? ICONS.sun : ICONS.moon} s={16} color="rgba(255,255,255,0.3)"/>
            <span style={{ fontSize:13, color:'rgba(255,255,255,0.35)', whiteSpace:'nowrap', opacity: navHovered ? 1 : 0, transition:'opacity 0.17s 0.08s' }}>{dark ? 'Light mode' : 'Dark mode'}</span>
          </button>
          {/* Settings */}
          <Link href="/settings"
            style={{ display:'flex', alignItems:'center', height:36, padding:'0 14px', gap:10, textDecoration:'none', borderLeft:`2px solid ${pathname==='/settings' ? accent.h : 'transparent'}`, background: pathname==='/settings' ? `rgba(${accent.r},0.1)` : 'transparent' }}>
            <I d={ICONS.settings} s={16} color="rgba(255,255,255,0.3)"/>
            <span style={{ fontSize:13, color:'rgba(255,255,255,0.35)', whiteSpace:'nowrap', opacity: navHovered ? 1 : 0, transition:'opacity 0.17s 0.08s' }}>Settings</span>
          </Link>
          {/* User */}
          <div ref={userMenuRef} style={{ position:'relative' }}>
            <div onClick={() => setShowUserMenu(m => !m)}
              style={{ display:'flex', alignItems:'center', height:42, padding:'0 12px', gap:10, cursor:'pointer', borderTop:'0.5px solid rgba(255,255,255,0.06)' }}>
              <Avatar user={user} profile={profile} size={26} accentH={accent.h}/>
              <div style={{ opacity: navHovered ? 1 : 0, transition:'opacity 0.17s 0.08s', minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'rgba(255,255,255,0.75)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:130 }}>{firstName || 'Account'}</div>
                <div style={{ fontSize:10, color: accent.h, fontWeight:600, transition:'color 0.5s' }}>{plan === 'lifetime' ? 'Lifetime ✦' : plan.charAt(0).toUpperCase()+plan.slice(1)}</div>
              </div>
            </div>
            {showUserMenu && (
              <div style={{ position:'absolute', bottom:'100%', left:8, width:180, background:'rgba(10,8,22,0.98)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:6, boxShadow:'0 8px 32px rgba(0,0,0,0.6)', backdropFilter:'blur(24px)', zIndex:50 }}>
                <Link href="/profile" onClick={()=>setShowUserMenu(false)} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, fontSize:13, color:'rgba(255,255,255,0.7)', textDecoration:'none' }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>Profile</Link>
                <Link href="/settings" onClick={()=>setShowUserMenu(false)} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, fontSize:13, color:'rgba(255,255,255,0.7)', textDecoration:'none' }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>Settings</Link>
                <Link href="/pricing" onClick={()=>setShowUserMenu(false)} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, fontSize:13, color:accent.h, textDecoration:'none', fontWeight:600 }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  {plan === 'free' ? 'Upgrade plan ✦' : 'Manage plan'}
                </Link>
                <div style={{ height:'0.5px', background:'rgba(255,255,255,0.07)', margin:'4px 0' }}/>
                <button onClick={handleSignOut} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, fontSize:13, color:'rgba(248,113,113,0.8)', background:'none', border:'none', cursor:'pointer', width:'100%', textAlign:'left', fontFamily:'inherit' }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Main content area ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, position:'relative' }}>

        {/* Topbar */}
        <div style={{ height:52, flexShrink:0, display:'flex', alignItems:'center', padding:'0 22px', gap:12, borderBottom:'0.5px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.015)', position:'relative', zIndex:5 }}>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)' }}>
            <span style={{ color:'rgba(255,255,255,0.65)', fontWeight:500 }}>
              {navItems.find(n => n.href && (pathname === n.href || pathname.startsWith(n.href+'/')))?.label || 'Flashfo'}
            </span>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
            {/* Search */}
            <button onClick={() => { setCmdOpen(true); setCmdQuery('') }}
              style={{ height:28, padding:'0 10px', background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:9, display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
              <I d={ICONS.search} s={12} color="rgba(255,255,255,0.25)"/>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>Search</span>
              <kbd style={{ fontSize:9, color:'rgba(255,255,255,0.18)', background:'rgba(255,255,255,0.06)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:4, padding:'1px 5px' }}>⌘K</kbd>
            </button>
            {/* Notifications */}
            <div style={{ position:'relative' }}>
              <button ref={bellRef} onClick={() => setShowNotifs(v => !v)}
                style={{ width:30, height:30, borderRadius:9, background: showNotifs ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
                <I d={ICONS.notif} s={14} color="rgba(255,255,255,0.45)"/>
                {unreadCount > 0 && <div style={{ position:'absolute', top:-3, right:-3, width:14, height:14, borderRadius:'50%', background:accent.h, fontSize:8, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.5s' }}>{unreadCount > 9 ? '9+' : unreadCount}</div>}
              </button>
              {showNotifs && (
                <div ref={panelRef} style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:320, background:'rgba(10,8,22,0.98)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, boxShadow:'0 12px 40px rgba(0,0,0,0.6)', zIndex:50, backdropFilter:'blur(24px)', overflow:'hidden' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.8)' }}>Notifications</span>
                    {unreadCount > 0 && <button onClick={markAllRead} style={{ fontSize:11, color:accent.h, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Mark all read</button>}
                  </div>
                  <div style={{ maxHeight:320, overflowY:'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding:32, textAlign:'center', color:'rgba(255,255,255,0.3)', fontSize:13 }}>All caught up ✓</div>
                    ) : notifications.slice(0,20).map(n => (
                      <div key={n.id} onClick={() => { markRead(n.id); if (n.link) router.push(n.link); setShowNotifs(false) }}
                        style={{ padding:'10px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)', cursor:n.link?'pointer':'default', background: n.read ? 'transparent' : 'rgba(255,255,255,0.03)' }}
                        onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(255,255,255,0.03)'}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {!n.read && <div style={{ width:6, height:6, borderRadius:'50%', background:accent.h, flexShrink:0, transition:'background 0.5s' }}/>}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:500, color:'rgba(255,255,255,0.8)', marginBottom:2 }}>{n.title}</div>
                            {n.body && <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.body}</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Avatar topbar */}
            <div onClick={() => setShowUserMenu(m => !m)} style={{ cursor:'pointer' }}>
              <Avatar user={user} profile={profile} size={28} accentH={accent.h}/>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', WebkitOverflowScrolling:'touch', background:'#04030c', position:'relative' }}>
          {/* Per-page subtle background tint */}
          <div style={{ position:'fixed', top:52, left:58, right:0, bottom:0, pointerEvents:'none', zIndex:0,
            background:`radial-gradient(ellipse 40% 30% at 80% 10%, rgba(${accent.r},0.06) 0%, transparent 70%)`,
            transition:'background 0.7s ease' }}/>
          <div style={{ position:'relative', zIndex:1 }}>
            {children}
          </div>
        </div>
      </div>

      <StickyNotes/>
    </div>
  )
}
