'use client'
// Flashfo v6 — Shell & Navigation
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { novaStream } from '@/lib/api'
import { useIsMobile } from '@/hooks/useIsMobile'
import MobileShell from '@/components/MobileShell'

const I = ({ d, s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
)

const ICONS = {
  dashboard: 'M1 1h6v6H1zm8 0h6v6H9zM1 9h6v6H1zm8 0h6v6H9z',
  create: 'M8 1l1.8 5H15l-4.4 3.2 1.7 5.2L8 11.2 3.7 14.4l1.7-5.2L1 6h5.2z',
  study: 'M2 4h12M2 8h8M2 12h10',
  teach: 'M8 1a4 4 0 100 8 4 4 0 000-8zm-6 14c0-3.3 2.7-6 6-6s6 2.7 6 6',
  mystuff: 'M1 4h5l2 2h7v8H1zm0 2v8',
  summarize: 'M2 3h12v2.5H2zm0 4h8v2.5H2zm0 4h10v2H2',
  flashcards: 'M4 3h9a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zM2 5H1v7a1 1 0 001 1h9',
  quiz: 'M6 5.5a2.5 2.5 0 014.5 1.5c0 1.5-1.5 2-2 3V11m0 2.5v.5',
  lesson: 'M13 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V2a1 1 0 00-1-1zM5 5h6m-6 3h6m-6 3h4',
  search: 'M7 1a6 6 0 100 12A6 6 0 007 1zm7 14l-3-3',
  nova: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a4 4 0 100 8 4 4 0 000-8zm0 3a1 1 0 100 2 1 1 0 000-2z',
  guide: 'M1 3h6.5L9 4.5h6V13H9l-1.5-1.5H1zm0 0v10',
  studentp: 'M8 1l7 3.5-7 3.5-7-3.5zm-5 5.5v4c0 2 2.2 3 5 3s5-1 5-3V10',
  suite: 'M8 1l1.5 4H14l-3.7 2.7 1.4 4.3L8 9.5 4.3 12 5.7 7.7 2 5h4.5z',
  sources: 'M1 5h3v9H1zm4-3h4v12H5zm5 2h4v10h-4z',
  curriculum: 'M1 2h6v12H1zm8 0h6v12H9zM3 5h2M3 7h2M3 9h2M10 5h3M10 7h3M10 9h3',
  collab: 'M2 5h9v8H2zM4 3h9v8H4zM6 7h4M6 9h3M12 1v4M10 2l2-1 2 1',
  progress: 'M2 13V7h3v6zm4 0V4h3v9zm4 0V9h3v4z',
  import: 'M8 1v8m-3-3l3 3 3-3M1 11v2a2 2 0 002 2h10a2 2 0 002-2v-2',
  together: 'M5 7a3 3 0 100-6 3 3 0 000 6zm6 0a3 3 0 100-6 3 3 0 000 6zM1 15c0-2.2 1.8-4 4-4m10 4c0-2.2-1.8-4-4-4m-2 4c0-2.2-1.3-4-3-4s-3 1.8-3 4',
  parent: 'M8 1a3 3 0 100 6 3 3 0 000-6zM2 15c0-3.3 2.7-6 6-6s6 2.7 6 6M4 7.5L2 10h3v4M12 7.5l2 2.5h-3v4',
  insights: 'M1 12l3-7 3 4 2-6 3 5 3-3',
}

const PLAN_RANK = { free:0, student:1, teacher:2, school:3, lifetime:99 }

function canAccess(userPlan, minPlan) {
  const plan = userPlan || 'free'
  const isLifetime = plan === 'lifetime'
  return isLifetime || (PLAN_RANK[plan] ?? 0) >= (PLAN_RANK[minPlan] ?? 0)
}

const NAV = [
  { href:'/dashboard', label:'Dashboard', icon:'dashboard', minPlan:'free' },
  { href:'/create', label:'Create', icon:'create', minPlan:'student' },
  { href:'/study', label:'Study', icon:'study', minPlan:'student' },
  { href:'/ai-tutor', label:'Nova', icon:'nova', minPlan:'student', nova:true },
  { href:'/teach', label:'Teach', icon:'teach', minPlan:'teacher' },
  { href:'/student-portal',label:'Student Portal',icon:'studentp', minPlan:'student' },
  { href:'/my-stuff', label:'My Stuff', icon:'mystuff', minPlan:'student' },
  { href:'/curriculum', label:'Curriculum', icon:'curriculum',minPlan:'teacher' },
  { href:'/collab-decks', label:'Collab Decks', icon:'collab', minPlan:'school' },
  { href:'/my-progress', label:'My Progress', icon:'progress', minPlan:'student' },
  { href:'/study-together',label:'Study Together',icon:'together', minPlan:'student' },
  { href:'/import', label:'Import', icon:'import', minPlan:'student' },
]

function NavItem({ item, collapsed, active, userPlan }) {
  const nova = item.nova
  const locked = typeof window !== 'undefined' && !canAccess(userPlan, item.minPlan)
  if (locked) return (
    <div title={collapsed ? item.label : undefined} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 8px', borderRadius:10, color:'#484f58', cursor:'pointer', position:'relative', opacity:0.5 }} onClick={() => { const needed = item.minPlan === 'teacher' ? 'Teacher' : item.minPlan === 'school' ? 'School' : 'Student'; alert(`Upgrade to ${needed} plan to access ${item.label}.`) }}>
      <I d={ICONS[item.icon] || ICONS.dashboard} s={18}/>
      {!collapsed && <span style={{ fontSize:13, fontWeight:500, flex:1 }}>{item.label}</span>}
      {!collapsed && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#484f58" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
    </div>
  )
  return (
    <Link href={item.href} title={collapsed ? item.label : undefined} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 8px', borderRadius:10, fontSize:13, fontWeight:500, textDecoration:'none', transition:'all 0.1s', background: active ? (nova ? 'rgba(124,58,237,0.12)' : 'rgba(29,78,216,0.1)') : 'transparent', border: active && nova ? '1px solid rgba(124,58,237,0.2)' : '1px solid transparent', color: active ? (nova ? '#a78bfa' : '#3b82f6') : 'var(--c-t2)' }}>
      <span style={{ flexShrink:0, position:'relative' }}>
        {nova ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg> : <I d={ICONS[item.icon] || ICONS.dashboard}/> }
        {nova && <span style={{ position:'absolute', top:-3, right:-3, width:7, height:7, background:'#a78bfa', borderRadius:'50%', border:'1.5px solid var(--c-surface)', animation:'nova-breathe 2.4s ease-in-out infinite' }}/>}
      </span>
      {!collapsed && <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</span>}
    </Link>
  )
}

function CreatureSVGShell({ id, size }) {
  const s = { width:size, height:size, viewBox:'0 0 60 60', xmlns:'http://www.w3.org/2000/svg', display:'block' }
  if (id==='cat') return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#1a2e1a"/><circle cx="30" cy="32" r="15" fill="#4ade80"/><ellipse cx="22" cy="18" rx="5" ry="8" fill="#86efac"/><ellipse cx="38" cy="18" rx="5" ry="8" fill="#86efac"/><ellipse cx="22" cy="20" rx="3.5" ry="5.5" fill="#4ade80"/><ellipse cx="38" cy="20" rx="3.5" ry="5.5" fill="#4ade80"/><circle cx="25" cy="30" r="5" fill="#fff"/><circle cx="35" cy="30" r="5" fill="#fff"/><circle cx="25" cy="30" r="3" fill="#166534"/><circle cx="35" cy="30" r="3" fill="#166534"/><circle cx="24" cy="29" r="1" fill="#fff"/><circle cx="34" cy="29" r="1" fill="#fff"/><ellipse cx="30" cy="36" rx="5" ry="2" fill="#86efac"/><path d="M27 38 Q30 41 33 38" stroke="#166534" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>)
  if (id==='alien') return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#0f172a"/><ellipse cx="30" cy="35" rx="16" ry="13" fill="#818cf8"/><circle cx="30" cy="22" r="12" fill="#a5b4fc"/><circle cx="30" cy="13" r="5" fill="#c7d2fe"/><ellipse cx="22" cy="22" rx="4" ry="7" fill="#6366f1"/><ellipse cx="38" cy="22" rx="4" ry="7" fill="#6366f1"/><circle cx="26" cy="22" r="4.5" fill="#fff"/><circle cx="34" cy="22" r="4.5" fill="#fff"/><circle cx="26" cy="22" r="2.8" fill="#312e81"/><circle cx="34" cy="22" r="2.8" fill="#312e81"/><circle cx="25" cy="21" r="1" fill="#fff"/><circle cx="33" cy="21" r="1" fill="#fff"/><ellipse cx="30" cy="29" rx="4" ry="1.5" fill="#c7d2fe"/><path d="M27 31 Q30 34 33 31" stroke="#312e81" strokeWidth="1.4" fill="none" strokeLinecap="round"/></svg>)
  if (id==='fox') return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#2d1a00"/><ellipse cx="30" cy="38" rx="14" ry="11" fill="#f97316"/><circle cx="30" cy="24" r="12" fill="#f97316"/><ellipse cx="30" cy="13" rx="7" ry="4.5" fill="#fb923c"/><rect x="27.5" y="9" width="5" height="7" rx="2.5" fill="#fb923c"/><circle cx="25" cy="23" r="4.5" fill="#fff"/><circle cx="35" cy="23" r="4.5" fill="#fff"/><circle cx="25" cy="23" r="2.8" fill="#431407"/><circle cx="35" cy="23" r="2.8" fill="#431407"/><circle cx="24" cy="22" r="1" fill="#fff"/><circle cx="34" cy="22" r="1" fill="#fff"/><ellipse cx="24" cy="28" rx="3.5" ry="1.8" fill="#fed7aa" opacity="0.65"/><ellipse cx="36" cy="28" rx="3.5" ry="1.8" fill="#fed7aa" opacity="0.65"/><path d="M27 30 Q30 33 33 30" stroke="#431407" strokeWidth="1.4" fill="none" strokeLinecap="round"/><circle cx="19" cy="22" r="3" fill="#fb923c"/><circle cx="41" cy="22" r="3" fill="#fb923c"/></svg>)
  if (id==='dolphin') return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#001a2d"/><circle cx="30" cy="26" r="14" fill="#38bdf8"/><ellipse cx="18" cy="24" rx="5" ry="9" fill="#7dd3fc"/><ellipse cx="42" cy="24" rx="5" ry="9" fill="#7dd3fc"/><circle cx="25" cy="24" r="5" fill="#fff"/><circle cx="35" cy="24" r="5" fill="#fff"/><circle cx="25" cy="24" r="3" fill="#0c4a6e"/><circle cx="35" cy="24" r="3" fill="#0c4a6e"/><circle cx="24" cy="23" r="1.1" fill="#fff"/><circle cx="34" cy="23" r="1.1" fill="#fff"/><ellipse cx="30" cy="31" rx="4" ry="1.5" fill="#bae6fd"/><path d="M27 33 Q30 36 33 33" stroke="#0c4a6e" strokeWidth="1.4" fill="none" strokeLinecap="round"/><ellipse cx="30" cy="47" rx="12" ry="6" fill="#0ea5e9"/><path d="M14 43 Q8 35 14 28" stroke="#38bdf8" strokeWidth="4" fill="none" strokeLinecap="round"/><path d="M46 43 Q52 35 46 28" stroke="#38bdf8" strokeWidth="4" fill="none" strokeLinecap="round"/></svg>)
  if (id==='wizard') return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#1a0a2e"/><ellipse cx="30" cy="42" rx="16" ry="12" fill="#a855f7"/><circle cx="30" cy="24" r="13" fill="#c084fc"/><path d="M17 20 Q30 7 43 20 L42 16 Q30 5 18 16Z" fill="#7e22ce"/><circle cx="25" cy="24" r="4" fill="#fff"/><circle cx="35" cy="24" r="4" fill="#fff"/><circle cx="25" cy="24" r="2.5" fill="#581c87"/><circle cx="35" cy="24" r="2.5" fill="#581c87"/><circle cx="24" cy="23" r="0.9" fill="#fff"/><circle cx="34" cy="23" r="0.9" fill="#fff"/><ellipse cx="24" cy="29" rx="3.5" ry="1.5" fill="#e9d5ff" opacity="0.65"/><ellipse cx="36" cy="29" rx="3.5" ry="1.5" fill="#e9d5ff" opacity="0.65"/><path d="M27 31 Q30 34 33 31" stroke="#581c87" strokeWidth="1.4" fill="none" strokeLinecap="round"/><circle cx="17" cy="30" r="4" fill="#a855f7"/><circle cx="43" cy="30" r="4" fill="#a855f7"/></svg>)
  return null
}

function Avatar({ user, profile, size = 28 }) {
  const initials = (profile?.full_name || user?.email || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  if (profile?.avatar_url) return <img src={profile.avatar_url} alt="" style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover' }}/>
  if (profile?.avatar_id) return <div style={{ width:size, height:size, borderRadius:'50%', overflow:'hidden', flexShrink:0 }}><CreatureSVGShell id={profile.avatar_id} size={size}/></div>
  return <div style={{ width:size, height:size, borderRadius:'50%', background:'#1d4ed8', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:size*0.38, fontWeight:700, flexShrink:0 }} suppressHydrationWarning>{initials}</div>
}

// ── NOVA AMBIENT COMPONENT ────────────────────────────────────────────────────
function NovaAmbient({ pathname }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState(false)
  const panelRef = useRef(null)
  const msgsEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120)
  }, [open])

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const routeContext = {
    '/dashboard':      'Dashboard — overview of their activity and progress',
    '/flashcards':     'Flashcards — studying a deck of flashcards',
    '/quiz':           'Quiz — taking or generating a quiz',
    '/study':          'Study hub',
    '/my-progress':    'My Progress — streaks and stats',
    '/my-stuff':       'My Stuff — saved decks and content',
    '/teach':          'Teacher portal',
    '/create':         'Create page — generating new study content',
    '/curriculum':     'Curriculum planner',
    '/student-portal': 'Student portal — classes and assignments',
    '/summarize':      'Summarize — summarizing text or notes',
    '/study-guide':    'Study Guide — building a study guide',
    '/lesson-builder': 'Lesson Builder — building a lesson plan',
  }
  const context = routeContext[pathname] || `page: ${pathname}`

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    const userMsg = { role: 'user', text }
    setMessages(prev => [...prev, userMsg, { role: 'nova', text: '' }])
    setStreaming(true)

    try {
      // Build conversation history for the API
      const history = messages.map(m => ({
        role: m.role === 'nova' ? 'assistant' : 'user',
        content: m.text
      }))
      // Build rich context — include current card if on flashcards page
      const card = window._flashfoCurrentCard
      const cardCtx = card
        ? ` The user is currently viewing a flashcard. Question: "${card.front}"${card.back ? `; Answer: "${card.back}"` : ' (answer not yet revealed)'}. Deck topic: "${card.topic}". If the user asks about "this card", "this one", "explain", or similar, they mean this flashcard.`
        : ''
      const userContent = messages.length === 0
        ? `[The user is on the ${context} in Flashfo.${cardCtx} You are Nova, Flashfo's AI study assistant. Answer helpfully and concisely — you can see what's on their screen.]\n\n${text}`
        : text

      const res = await novaStream([...history, { role: 'user', content: userContent }])

      if (!res.ok) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setMessages(prev => [...prev.slice(0, -1), { role: 'nova', text: full }])
      }

      if (!full) setMessages(prev => [...prev.slice(0, -1), { role: 'nova', text: 'Something went wrong. Try again.' }])
    } catch {
      setMessages(prev => [...prev.slice(0, -1), { role: 'nova', text: 'Something went wrong. Try again.' }])
    } finally {
      setStreaming(false)
    }
  }

  const hasMessages = messages.length > 0

  return (
    <>
      {/* Aura overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 89,
        opacity: open ? 1 : 0, transition: 'opacity 0.7s ease',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: open
            ? 'linear-gradient(to right,rgba(99,102,241,0.06) 0%,transparent 30%),linear-gradient(to left,rgba(124,58,237,0.06) 0%,transparent 30%),linear-gradient(to bottom,rgba(99,102,241,0.04) 0%,transparent 20%),linear-gradient(to top,rgba(124,58,237,0.06) 0%,transparent 20%)'
            : 'none',
        }}/>
        <div style={{
          position: 'absolute', inset: 0,
          boxShadow: open ? 'inset 0 0 0 2px rgba(99,102,241,0.25),inset 0 0 40px rgba(124,58,237,0.08)' : 'none',
          transition: 'box-shadow 0.7s ease',
        }}/>
      </div>

      {/* Panel + pill */}
      <div ref={panelRef} style={{
        position: 'fixed',
        bottom: 'calc(64px + env(safe-area-inset-bottom,0px) + 10px)',
        right: 16, zIndex: 90,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
      }}>
        {/* Panel */}
        <div style={{
          width: 240,
          background: 'rgba(10,0,26,0.97)',
          border: '0.5px solid rgba(124,58,237,0.32)',
          borderRadius: 16, padding: 14,
          backdropFilter: 'blur(18px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.55),0 0 24px rgba(124,58,237,0.1)',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.95)',
          pointerEvents: open ? 'all' : 'none',
          transition: 'all 0.22s ease',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#a78bfa" strokeWidth="1.4"/>
                <circle cx="12" cy="12" r="6" stroke="#a78bfa" strokeWidth="1.4"/>
                <circle cx="12" cy="12" r="2" fill="#a78bfa"/>
              </svg>
              <span style={{ fontSize:13, fontWeight:700, color:'#a5b4fc' }}>Nova</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {hasMessages && (
                <button onClick={() => setMessages([])} style={{ fontSize:10, color:'rgba(241,240,255,0.3)', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                  Clear
                </button>
              )}
              <div style={{ width:6, height:6, borderRadius:'50%', background: streaming ? '#f59e0b' : '#818cf8', animation:'nova-breathe 2.4s ease-in-out infinite' }}/>
            </div>
          </div>

          {/* Context chip — only when no messages */}
          {!hasMessages && (
            <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(99,102,241,0.08)', border:'0.5px solid rgba(99,102,241,0.18)', borderRadius:7, padding:'5px 8px' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#6366f1', flexShrink:0, animation:'nova-pulse 1.5s infinite' }}/>
              <span style={{ fontSize:10, color:'rgba(241,240,255,0.42)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{context}</span>
            </div>
          )}

          {/* Intro text — only when no messages */}
          {!hasMessages && (
            <p style={{ fontSize:12, color:'rgba(241,240,255,0.65)', lineHeight:1.5, margin:0 }}>
              Ask me anything — I'll answer right here without taking you away from what you're doing.
            </p>
          )}

          {/* Messages */}
          {hasMessages && (
            <div style={{ maxHeight:220, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '90%',
                  background: m.role === 'user' ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.05)',
                  border: `0.5px solid ${m.role === 'user' ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  padding: '8px 10px',
                  fontSize: 12, color: 'rgba(241,240,255,0.82)', lineHeight: 1.55,
                }}>
                  {m.text || (m.role === 'nova' && streaming ? (
                    <span style={{ display:'flex', gap:3, alignItems:'center' }}>
                      <span style={{ width:4, height:4, borderRadius:'50%', background:'#a78bfa', animation:'nova-pulse 0.9s ease-in-out infinite' }}/>
                      <span style={{ width:4, height:4, borderRadius:'50%', background:'#a78bfa', animation:'nova-pulse 0.9s ease-in-out infinite 0.2s' }}/>
                      <span style={{ width:4, height:4, borderRadius:'50%', background:'#a78bfa', animation:'nova-pulse 0.9s ease-in-out infinite 0.4s' }}/>
                    </span>
                  ) : '')}
                </div>
              ))}
              <div ref={msgsEndRef}/>
            </div>
          )}

          {/* Input */}
          <div style={{ display:'flex', gap:6, alignItems:'center', background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:9, padding:'6px 9px' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={streaming ? 'Nova is thinking…' : 'Ask Nova anything…'}
              disabled={streaming}
              style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:11, color:'rgba(241,240,255,0.7)', fontFamily:'inherit' }}
            />
            <button
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              style={{ width:20, height:20, borderRadius:6, background: streaming ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.18)', border:'none', cursor: streaming ? 'default' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, opacity: (!input.trim() || streaming) ? 0.4 : 1 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
            </button>
          </div>

          <button
            onClick={() => {
              if (messages.length > 0) {
                // Convert panel messages to ai-tutor format and pass via localStorage
                const handoff = messages.map(m => ({
                  role: m.role === 'nova' ? 'assistant' : 'user',
                  content: m.text
                }))
                localStorage.setItem('flashfo_nova_handoff', JSON.stringify(handoff))
              }
              window.open('/ai-tutor', '_blank')
            }}
            style={{ display:'block', width:'100%', textAlign:'center', fontSize:10, color:'rgba(129,140,248,0.4)', background:'none', border:'none', cursor:'pointer', padding:'4px 0 0', fontFamily:'inherit' }}
          >
            Open full Nova ↗
          </button>
        </div>

        {/* Pill */}
        <div onClick={() => setOpen(o => !o)} style={{
          display:'flex', alignItems:'center', gap:7,
          background: open ? 'rgba(99,102,241,0.14)' : 'rgba(13,0,34,0.9)',
          border: `0.5px solid ${open ? 'rgba(129,140,248,0.5)' : 'rgba(124,58,237,0.38)'}`,
          borderRadius:40, padding:'8px 14px 8px 10px',
          cursor:'pointer', backdropFilter:'blur(12px)',
          boxShadow: open
            ? '0 4px 20px rgba(0,0,0,0.5),0 0 20px rgba(124,58,237,0.28)'
            : '0 4px 18px rgba(0,0,0,0.45),0 0 14px rgba(124,58,237,0.18)',
          transition:'all 0.2s', userSelect:'none',
        }}>
          <div style={{
            width:8, height:8, borderRadius:'50%', flexShrink:0,
            background:'radial-gradient(circle at 35% 35%,#c4b5fd,#7c3aed 60%,#4c1d95)',
            boxShadow:'0 0 6px rgba(124,58,237,0.6)',
            animation:'pill-pulse 2.5s ease-in-out infinite',
          }}/>
          <span style={{ fontSize:12, fontWeight:600, color:'rgba(241,240,255,0.75)', letterSpacing:'0.01em' }}>Nova</span>
          {hasMessages && <span style={{ width:5, height:5, borderRadius:'50%', background:'#a78bfa', flexShrink:0 }}/>}
          <span style={{ fontSize:11, color:'#818cf8' }}>✦</span>
        </div>
      </div>
    </>
  )
}

export default function Shell({ children }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const pathname = usePathname()
  const router = useRouter()
    const isMobile = useIsMobile()
  const { user, profile, loading: authLoading, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    const w = window.innerWidth
    return w >= 768 && w < 1100
  })
  const [cmdOpen, setCmdOpen] = useState(false)
  const [cmdQuery, setCmdQuery] = useState('')
  const cmdRef = useRef(null)
  const cmdInputRef = useRef(null)
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem('ff-theme')
    const isDark = saved !== 'light'
    if (isDark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    return isDark
  })
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notifFilter, setNotifFilter] = useState('all')
  const [unreadCount, setUnreadCount] = useState(0)
  const bellRef = useRef(null)
  const panelRef = useRef(null)
  const [plusOpen, setPlusOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    const id = 'shell-anim'
    if (document.getElementById(id)) return
    const s = document.createElement('style')
    s.id = id
    s.textContent = [
      '@keyframes sh-spin{to{transform:rotate(360deg)}}',
      '@media(prefers-reduced-motion:reduce){*{animation:none!important}}',
      '@keyframes ff-more-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}',
      '@keyframes nova-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.75)}}',
      '@keyframes nova-breathe{0%,100%{box-shadow:0 0 0 0 rgba(167,139,250,0.5)}50%{box-shadow:0 0 0 6px rgba(167,139,250,0)}}',
      '@keyframes nova-thinking{0%,100%{box-shadow:0 0 0 2px rgba(167,139,250,0.7)}50%{box-shadow:0 0 0 5px rgba(167,139,250,0.1)}}',
      '@keyframes pill-pulse{0%,100%{box-shadow:0 0 6px rgba(124,58,237,0.6)}50%{box-shadow:0 0 12px rgba(129,140,248,0.8)}}',
      'body[data-path="/ai-tutor"] .nova-ambient-pill{display:none!important}',
    ].join('')
    document.head.appendChild(s)
  }, [])

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      if (w >= 768 && w < 1100) setCollapsed(true)
      else if (w >= 1100) setCollapsed(false)
    }
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { document.body.setAttribute('data-path', pathname) }, [pathname])

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
      if (data) { setNotifications(data); setUnreadCount(data.filter(n => !n.read).length) }
    }
    fetchNotifs()
    const sub = supabase.channel('notifs_'+user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.'+user.id }, payload => {
        setNotifications(prev => [payload.new, ...prev]); setUnreadCount(c => c + 1)
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [user])

  useEffect(() => {
    if (!showNotifs) return
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && bellRef.current && !bellRef.current.contains(e.target)) setShowNotifs(false)
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

  const filteredNotifs = notifFilter === 'all' ? notifications : notifications.filter(n => n.category === notifFilter)
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
    { label:'Curriculum Standards',href:'/curriculum', icon:'curriculum' },
    { label:'Collab Decks', href:'/collab-decks', icon:'collab' },
    { label:'My Stuff', href:'/my-stuff', icon:'mystuff' },
    { label:'Student Portal', href:'/student-portal',icon:'studentp' },
  ]
  const filteredCmds = cmdQuery ? CMD_ITEMS.filter(c => c.label.toLowerCase().includes(cmdQuery.toLowerCase())) : CMD_ITEMS
if (isMobile) return <MobileShell>{children}</MobileShell>
  
  return (
    <div style={{ display:'flex', height:'100dvh', overflow:'hidden', background:'var(--c-bg)' }}>
      {/* Nova Ambient — floats above everything, hidden on /ai-tutor */}
      {pathname !== '/ai-tutor' && <NovaAmbient pathname={pathname} />}

      {cmdOpen && <div onClick={() => setCmdOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200 }}/>}
      {cmdOpen && (
        <div ref={cmdRef} style={{ position:'fixed', top:'18%', left:'50%', transform:'translateX(-50%)', width:'min(560px,calc(100vw - 32px))', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:14, boxShadow:'0 16px 48px rgba(0,0,0,0.5)', zIndex:201, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderBottom:'1px solid var(--c-line)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--c-t3)" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input ref={cmdInputRef} value={cmdQuery} onChange={e => setCmdQuery(e.target.value)} placeholder="Search pages and tools..." style={{ flex:1, background:'none', border:'none', outline:'none', color:'var(--c-t1)', fontSize:14, fontFamily:'inherit' }}/>
            <kbd style={{ fontSize:10, color:'var(--c-t3)', background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:5, padding:'2px 6px' }}>Esc</kbd>
          </div>
          <div style={{ maxHeight:320, overflowY:'auto', padding:6 }}>
            {filteredCmds.length === 0 && <div style={{ padding:24, textAlign:'center', color:'var(--c-t3)', fontSize:13 }}>No results</div>}
            {filteredCmds.map((item, idx) => (
              <Link key={idx} href={item.href} onClick={() => { setCmdOpen(false); setCmdQuery('') }} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:8, color:'var(--c-t1)', textDecoration:'none', fontSize:13, background: pathname === item.href ? 'var(--c-surface2)' : 'none' }} onMouseEnter={e => e.currentTarget.style.background='var(--c-surface2)'} onMouseLeave={e => e.currentTarget.style.background = pathname === item.href ? 'var(--c-surface2)' : 'none'}>
                <div style={{ width:28, height:28, borderRadius:7, background:'var(--c-surface2)', border:'1px solid var(--c-line)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <I d={ICONS[item.icon] || ICONS.dashboard} s={12}/>
                </div>
                <span style={{ flex:1 }}>{item.label}</span>
                {pathname === item.href && <span style={{ fontSize:10, color:'var(--c-t3)' }}>current</span>}
              </Link>
            ))}
          </div>
          <div style={{ padding:'8px 16px', borderTop:'1px solid var(--c-line)', display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--c-t3)' }}>
            <span><kbd style={{ background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:4, padding:'1px 5px', fontSize:10 }}>↑↓</kbd> navigate</span>
            <span><kbd style={{ background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:4, padding:'1px 5px', fontSize:10 }}>⌘K</kbd> / <kbd style={{ background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:4, padding:'1px 5px', fontSize:10 }}>Ctrl+K</kbd></span>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="ff-desktop-only" style={{ width:sidebarW, transition:'width 0.2s', flexShrink:0, background:'var(--c-surface)', borderRight:'1px solid var(--c-line)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 14px', height:52, borderBottom:'1px solid var(--c-line)', flexShrink:0 }}>
          <div style={{ width:36, height:36, position:'relative', flexShrink:0 }}>
            <div style={{ position:'absolute', inset:-3, borderRadius:13, background:'conic-gradient(#3b82f6,#8b5cf6,#a78bfa,#3b82f6)', animation:'sh-spin 3s linear infinite' }}/>
            <div style={{ position:'absolute', inset:2, borderRadius:10, background:'var(--c-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="#3b82f6"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
            </div>
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
        <nav style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:8, display:'flex', flexDirection:'column', gap:2 }}>
          {NAV.map(item => <NavItem key={item.href} item={item} collapsed={collapsed} userPlan={profile?.plan} active={pathname === item.href}/>)}
        </nav>
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
          <div className="ff-mobile-block" style={{ display:'none', alignItems:'center', gap:8 }}>
            <div style={{ width:36, height:36, position:'relative' }}>
              <div style={{ position:'absolute', inset:-3, borderRadius:13, background:'conic-gradient(#3b82f6,#8b5cf6,#a78bfa,#3b82f6)', animation:'sh-spin 3s linear infinite' }}/>
              <div style={{ position:'absolute', inset:2, borderRadius:10, background:'var(--c-bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="#3b82f6"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
              </div>
            </div>
            <span style={{ fontSize:14, fontWeight:700, color:'var(--c-t1)' }}>Flashfo</span>
          </div>
          {!authLoading && user && firstName && (
            <span className="ff-desktop-only" style={{ fontSize:13, color:'var(--c-t2)', fontWeight:500 }}>
              Welcome back, <span style={{ color:'var(--c-t1)', fontWeight:700 }}>{firstName}</span>
            </span>
          )}
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            <button onClick={() => { setCmdOpen(true); setCmdQuery('') }} title="Command palette" style={{ height:30, padding:'0 10px', borderRadius:8, border:'1px solid var(--c-line)', background:'var(--c-surface2)', cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'var(--c-t3)', fontSize:11 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <span className="ff-desktop-only">⌘K / Ctrl+K</span>
            </button>
            {/* Bell */}
            <div style={{ position:'relative' }}>
              <button ref={bellRef} onClick={() => setShowNotifs(v => !v)} style={{ position:'relative', background:showNotifs?'var(--c-surface2)':'none', border:'none', cursor:'pointer', padding:5, color: unreadCount>0?'#a78bfa':'var(--c-t2)', display:'flex', alignItems:'center', borderRadius:8, flexShrink:0, transition:'color 0.2s,background 0.2s' }}>
                <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 1a5 5 0 00-5 5v2.5L1.5 11h13L13 8.5V6a5 5 0 00-5-5zM6.5 13.5a1.5 1.5 0 003 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span style={{ position:'absolute', top:3, right:3, minWidth:14, height:14, background:'#ef4444', borderRadius:7, border:'1.5px solid var(--c-surface)', fontSize:8, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 2px' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div ref={panelRef} style={{ position:'fixed', top:56, right:12, left:12, width:'auto', maxWidth:380, margin:'0 auto', background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.4)', zIndex:300, overflow:'hidden' }}>
                  <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid var(--c-line)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--c-t1)' }}>Notifications</span>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      {unreadCount > 0 && <button onClick={markAllRead} style={{ fontSize:11, color:'#a78bfa', background:'none', border:'none', cursor:'pointer', padding:0 }}>Mark all read</button>}
                      <button onClick={() => setShowNotifs(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--c-t3)', display:'flex', padding:2 }}>
                        <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 1l10 10M11 1L1 11"/></svg>
                      </button>
                    </div>
                  </div>
                  {notifCategories.length > 1 && (
                    <div style={{ padding:'8px 12px', display:'flex', gap:6, overflowX:'auto', borderBottom:'1px solid var(--c-line)' }}>
                      {notifCategories.map(cat => (
                        <button key={cat} onClick={() => setNotifFilter(cat)} style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500, border:'1px solid', whiteSpace:'nowrap', cursor:'pointer', transition:'all 0.15s', background: notifFilter===cat?'#a78bfa':'var(--c-surface2)', borderColor: notifFilter===cat?'#a78bfa':'var(--c-line)', color: notifFilter===cat?'#fff':'var(--c-t2)' }}>
                          {cat.charAt(0).toUpperCase()+cat.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ maxHeight:360, overflowY:'auto' }}>
                    {filteredNotifs.length === 0 ? (
                      <div style={{ padding:'32px 16px', textAlign:'center', color:'var(--c-t3)', fontSize:13 }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--c-t3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:8 }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                        <p style={{ margin:0 }}>No notifications yet</p>
                      </div>
                    ) : filteredNotifs.map(n => (
                      <div key={n.id} onClick={() => markRead(n.id)} style={{ padding:'12px 16px', borderBottom:'1px solid var(--c-line)', cursor:'pointer', background: n.read?'transparent':'rgba(167,139,250,0.05)', display:'flex', gap:12, alignItems:'flex-start', transition:'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background='var(--c-surface2)'} onMouseLeave={e => e.currentTarget.style.background = n.read?'transparent':'rgba(167,139,250,0.05)'}>
                        <div style={{ width:32, height:32, borderRadius:8, background: n.read?'var(--c-surface2)':'rgba(167,139,250,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
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
            <button onClick={toggleDark} className="ff-mid-mobile-only" style={{ height:30, padding:'0 10px', borderRadius:20, border:'1px solid var(--c-line)', background:'var(--c-surface2)', cursor:'pointer', alignItems:'center', gap:5, color:'var(--c-t2)', flexShrink:0, fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>
              <svg width="14" height="14" viewBox="-1 -1 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink:0 }}>
                {dark ? <path d="M8 1v1M8 14v1M1 8h1M14 8h1M3 3l.7.7M12.3 12.3l.7.7M3 13l.7-.7M12.3 3.7l.7-.7M11 8a3 3 0 11-6 0 3 3 0 016 0z"/> : <path d="M13 8.5A5.5 5.5 0 016 2a6 6 0 100 12 5.5 5.5 0 007-5.5z"/>}
              </svg>
              <span>{dark ? 'Light' : 'Dark'}</span>
            </button>
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
                    <a href="/settings" onClick={() => setShowUserMenu(false)} style={{ display:'block', padding:'8px 12px', fontSize:13, color:'var(--c-t1)', textDecoration:'none', borderRadius:8, fontWeight:500 }} onMouseEnter={e => e.currentTarget.style.background='var(--c-surface2)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>Settings</a>
                    <button onClick={handleSignOut} style={{ width:'100%', textAlign:'left', padding:'8px 12px', fontSize:13, color:'#ef4444', background:'none', border:'none', cursor:'pointer', borderRadius:8, fontWeight:500 }} onMouseEnter={e => e.currentTarget.style.background='#fef2f2'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>Sign out</button>
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
        <div onClick={() => setPlusOpen(false)} style={{ position:'fixed', top:0, left:0, right:0, bottom:64, zIndex:98, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'0 16px 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[
              { href:'/quiz', label:'Quiz', icon:'M6 5.5a2.5 2.5 0 014.5 1.5c0 1.5-1.5 2-2 3V11m0 2.5v.5' },
              { href:'/flashcards', label:'Flashcards', icon:'M4 3h9a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zM2 5H1v7a1 1 0 001 1h9' },
              { href:'/summarize', label:'Summarize', icon:'M2 3h12v2.5H2zm0 4h8v2.5H2zm0 4h10v2H2' },
              { href:'/study-guide', label:'Study Guide', icon:'M1 3h6.5L9 4.5h6V13H9l-1.5-1.5H1zm0 0v10' },
              { href:'/teach', label:'Teacher Portal',icon:'M8 1a4 4 0 100 8 4 4 0 000-8zm-6 14c0-3.3 2.7-6 6-6s6 2.7 6 6' },
              { href:'/student-portal', label:'Student Portal',icon:'M8 1l7 3.5-7 3.5-7-3.5zm-5 5.5v4c0 2 2.2 3 5 3s5-1 5-3V10' },
            ].map(item => (
              <Link key={item.label} href={item.href} onClick={() => setPlusOpen(false)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'14px 8px', borderRadius:16, background:'var(--c-surface)', border:'1px solid var(--c-line)', textDecoration:'none' }}>
                <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"><path d={item.icon}/></svg>
                <span style={{ fontSize:10, fontWeight:600, color:'var(--c-t1)', textAlign:'center', lineHeight:1.2 }}>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mobile nav */}
      <div className="ff-mobile-only">
        {moreOpen && (
          <div style={{ position:'fixed', bottom:64, left:8, right:8, zIndex:99, background:'#161b22', border:'1px solid #21262d', borderRadius:16, padding:'12px 12px 8px', boxShadow:'0 -8px 32px rgba(0,0,0,0.5)', animation:'ff-more-in .25s ease both' }}>
            <div style={{ fontSize:10, color:'#484f58', fontWeight:700, letterSpacing:'.07em', marginBottom:10 }}>MORE TOOLS</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { href:'/collab-decks', label:'Collab Decks', sub:'Shared decks', border:'rgba(167,139,250,0.2)' },
                { href:'/curriculum', label:'Curriculum', sub:'Plan your year', border:'rgba(52,211,153,0.2)' },
                { href:'/student-portal', label:'Student Portal', sub:'Your classes', border:'rgba(245,158,11,0.2)' },
                { href:'/lesson-builder', label:'Lesson Builder', sub:'Plan lessons', border:'rgba(37,99,235,0.2)' },
                { href:'/my-progress', label:'Weakness Heatmap', sub:'See your weakest', border:'rgba(37,99,235,0.15)' },
                { href:'/study-together', label:'Study With a Friend', sub:'Live 2-player', border:'rgba(37,99,235,0.15)' },
                { href:'/import', label:'Import', sub:'URL or text → deck', border:'rgba(37,99,235,0.15)' },
                { href:'/parent', label:'Parent Dashboard', sub:'Monitor your child', border:'rgba(37,99,235,0.15)' },
              ].map(item => (
                <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:'#0d1117', border:`1px solid ${item.border}`, textDecoration:'none' }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:'#e6edf3' }}>{item.label}</div>
                    <div style={{ fontSize:10, color:'#8b949e' }}>{item.sub}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        <nav style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100, background:'#0d1117', borderTop:'1px solid #21262d', height:64, paddingBottom:'env(safe-area-inset-bottom,0px)', display:'flex', alignItems:'flex-end', justifyContent:'space-around', paddingTop:6, paddingLeft:4, paddingRight:4 }}>
          <Link href="/dashboard" onClick={() => setMoreOpen(false)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'4px 6px', textDecoration:'none', minWidth:52 }}>
            <div style={{ width:44, height:36, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:12, background:pathname==='/dashboard'?'rgba(59,130,246,.14)':'transparent', transition:'background .2s' }}>
              <div style={{ color:pathname==='/dashboard'?'#3b82f6':'#6b7280' }}><I d={ICONS.dashboard} s={22}/></div>
            </div>
            <span style={{ fontSize:9, fontWeight:600, color:pathname==='/dashboard'?'#e6edf3':'#484f58' }}>Home</span>
          </Link>
          <Link href="/create" onClick={() => setMoreOpen(false)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'4px 6px', textDecoration:'none', minWidth:52 }}>
            <div style={{ width:44, height:36, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:12, background:pathname==='/create'?'rgba(167,139,250,.14)':'transparent', transition:'background .2s' }}>
              <div style={{ color:pathname==='/create'?'#a78bfa':'#6b7280' }}><I d={ICONS.create} s={22}/></div>
            </div>
            <span style={{ fontSize:9, fontWeight:600, color:pathname==='/create'?'#e6edf3':'#484f58' }}>Create</span>
          </Link>
          <Link href="/ai-tutor" onClick={() => setMoreOpen(false)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, textDecoration:'none', minWidth:52, marginTop:-14 }}>
            <div style={{ position:'relative', width:52, height:52 }}>
              <div style={{ position:'absolute', top:-3, left:-3, right:-3, bottom:-3, borderRadius:21, background:'conic-gradient(#3b82f6,#8b5cf6,#a78bfa,#34d399,#3b82f6)', animation:'sh-spin 3s linear infinite' }}/>
              <div style={{ position:'absolute', top:2, left:2, right:2, bottom:2, background:'#0d1117', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#a78bfa" strokeWidth="1.4"/>
                  <circle cx="12" cy="12" r="6" stroke="#a78bfa" strokeWidth="1.4"/>
                  <circle cx="12" cy="12" r="2" fill="#a78bfa"/>
                </svg>
              </div>
            </div>
            <span style={{ fontSize:9, fontWeight:600, color:'#a78bfa' }}>Nova</span>
          </Link>
          <Link href="/study" onClick={() => setMoreOpen(false)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'4px 6px', textDecoration:'none', minWidth:52 }}>
            <div style={{ width:44, height:36, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:12, background:pathname==='/study'?'rgba(52,211,153,.14)':'transparent', transition:'background .2s' }}>
              <div style={{ color:pathname==='/study'?'#34d399':'#6b7280' }}><I d={ICONS.study} s={22}/></div>
            </div>
            <span style={{ fontSize:9, fontWeight:600, color:pathname==='/study'?'#e6edf3':'#484f58' }}>Study</span>
          </Link>
          <button onClick={() => setMoreOpen(o => !o)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'4px 6px', background:'transparent', border:'none', cursor:'pointer', minWidth:52 }}>
            <div style={{ width:44, height:36, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:12, background:moreOpen?'rgba(245,158,11,.14)':'transparent', transition:'background .2s' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="5" cy="12" r="1.5" fill={moreOpen?'#f59e0b':'#6b7280'}/>
                <circle cx="12" cy="12" r="1.5" fill={moreOpen?'#f59e0b':'#6b7280'}/>
                <circle cx="19" cy="12" r="1.5" fill={moreOpen?'#f59e0b':'#6b7280'}/>
              </svg>
            </div>
            <span style={{ fontSize:9, fontWeight:600, color:moreOpen?'#e6edf3':'#484f58' }}>More</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
