'use client'
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'

// ── Aurora palettes ────────────────────────────────────────────────────────
const PALETTES = {
  0: { bg:'#05030d', b1:'#4f46e5', b2:'#7c3aed', b3:'#2563eb' },
  1: { bg:'#021009', b1:'#059669', b2:'#0d9488', b3:'#10b981' },
  2: { bg:'#04020e', b1:'#7c3aed', b2:'#4f46e5', b3:'#6d28d9' },
  3: { bg:'#0e0502', b1:'#d97706', b2:'#db2777', b3:'#ea580c' },
}
const PATH_PAL = {
  '/dashboard':0, '/my-stuff':0, '/my-progress':0,
  '/ai-tutor':2, '/profile':3, '/settings':3,
}
function rootPath(p) { return '/' + (p.split('/').filter(Boolean)[0] || '') }

// ── Nav icons ──────────────────────────────────────────────────────────────
function IconHome({ size=22, color='currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )
}
function IconStack({ size=22, color='currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 12l10 5 10-5"/>
      <path d="M2 17l10 5 10-5"/>
    </svg>
  )
}
function IconUser({ size=22, color='currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  )
}
function IconSend({ size=14, color='currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13"/>
      <path d="M22 2L15 22l-4-9-9-4 20-7z"/>
    </svg>
  )
}
function IconBullseye({ active }) {
  const col = active ? 'rgba(196,181,253,0.95)' : 'rgba(196,181,253,0.55)'
  const glow = active
    ? 'drop-shadow(0 0 8px rgba(167,139,250,0.9))'
    : 'drop-shadow(0 0 4px rgba(167,139,250,0.4))'
  return (
    <svg width="24" height="24" viewBox="0 0 22 22" fill="none" style={{ display:'block', filter:glow, transition:'filter 0.3s' }}>
      <circle cx="11" cy="11" r="10" stroke={col} strokeWidth="1.3"/>
      <circle cx="11" cy="11" r="6.5" stroke={col} strokeWidth="1.3"/>
      <circle cx="11" cy="11" r="3" stroke={col} strokeWidth="1.3"/>
      <circle cx="11" cy="11" r="1.3" fill={col}/>
    </svg>
  )
}
function IconTeach({ size=22, color='currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8"/>
      <path d="M12 17v4"/>
    </svg>
  )
}
function IconSpark() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
      <path d="M10 1.5L11.5 8.5L18.5 10L11.5 11.5L10 18.5L8.5 11.5L1.5 10L8.5 8.5Z" fill="#a78bfa"/>
    </svg>
  )
}

// ── Create menu icon ───────────────────────────────────────────────────────
function CreateIcon({ href }) {
  const s = { width:16, height:16, fill:'none', strokeWidth:'1.8', strokeLinecap:'round' }
  if (href === '/summarize') return (
    <svg {...s} viewBox="0 0 24 24" stroke="#fbbf24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
  if (href === '/study-guide') return (
    <svg {...s} viewBox="0 0 24 24" stroke="#34d399">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    </svg>
  )
  if (href === '/quiz') return (
    <svg {...s} viewBox="0 0 24 24" stroke="#a78bfa">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/>
    </svg>
  )
  return (
    <svg {...s} viewBox="0 0 24 24" stroke="#818cf8">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <path d="M2 10h20"/>
    </svg>
  )
}

// ── Create items — bottom to top order ────────────────────────────────────
const STUDENT_CREATE_ITEMS = [
  { label:'Summary',     href:'/summarize',   color:'#fbbf24', border:'rgba(245,158,11,0.5)' },
  { label:'Study guide', href:'/study-guide', color:'#34d399', border:'rgba(16,185,129,0.5)' },
  { label:'Quiz',        href:'/quiz',        color:'#a78bfa', border:'rgba(139,92,246,0.5)' },
  { label:'Flashcards',  href:'/flashcards',  color:'#818cf8', border:'rgba(99,102,241,0.5)' },
]
const TEACHER_CREATE_ITEMS = [
  { label:'Source Library',  href:'/source-library', color:'#a78bfa', border:'rgba(139,92,246,0.5)' },
  { label:'Live Quiz',       href:'/live-quiz',      color:'#ef4444', border:'rgba(239,68,68,0.5)'  },
  { label:'Assign Homework', href:'/assignments',    color:'#fbbf24', border:'rgba(245,158,11,0.5)' },
  { label:'Lesson Builder',  href:'/lesson-builder', color:'#34d399', border:'rgba(16,185,129,0.5)' },
  { label:'New Classroom',   href:'/teach',          color:'#3b82f6', border:'rgba(59,130,246,0.5)' },
]

// ── Aurora ─────────────────────────────────────────────────────────────────
function Aurora({ palIdx }) {
  const pal = PALETTES[palIdx] || PALETTES[0]
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1,
      background:pal.bg, overflow:'hidden', pointerEvents:'none',
      transition:'background 0.3s ease',
    }}>
      <div style={{
        position:'absolute', width:'70vw', height:'55vw', borderRadius:'50%',
        background:pal.b1, filter:'blur(72px)', opacity:0.55,
        top:'-5%', left:'-10%',
        willChange:'transform', transform:'translateZ(0)',
        transition:'background 0.3s ease',
      }}/>
      <div style={{
        position:'absolute', width:'65vw', height:'50vw', borderRadius:'50%',
        background:pal.b2, filter:'blur(80px)', opacity:0.4,
        top:'25%', right:'-15%',
        willChange:'transform', transform:'translateZ(0)',
        transition:'background 0.3s ease',
      }}/>
      <div style={{
        position:'absolute', width:'50vw', height:'45vw', borderRadius:'50%',
        background:pal.b3, filter:'blur(64px)', opacity:0.3,
        bottom:'-10%', left:'20%',
        willChange:'transform', transform:'translateZ(0)',
        transition:'background 0.3s ease',
      }}/>
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
      }}/>
    </div>
  )
}

// ── Shell ──────────────────────────────────────────────────────────────────
export default function MobileShell({ children }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const { profile } = useAuth()

  const plan          = profile?.plan || 'free'
  const isLifetime    = plan === 'lifetime'
  const isTeacherPlan = plan === 'teacher' || plan === 'school'
  const isTeacher     = isTeacherPlan || (isLifetime && profile?.role === 'teacher')

  const [novaOpen,   setNovaOpen]   = useState(false)
  const [novaInput,  setNovaInput]  = useState('')
  const [palIdx,     setPalIdx]     = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [isClosing,  setIsClosing]  = useState(false)

  const novaRef      = useRef(null)
  const contentRef   = useRef(null)
  const firstMount   = useRef(true)
  const closeTimerRef = useRef(null)

  // ── Page fade on navigation ──────────────────────────────────────────────
  useLayoutEffect(() => {
    if (firstMount.current) { firstMount.current = false; return }
    const el = contentRef.current
    if (!el) return
    el.style.transition = 'none'
    el.style.opacity = '0'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.18s ease'
        el.style.opacity = '1'
      })
    })
  }, [pathname])

  // ── Aurora palette ───────────────────────────────────────────────────────
  useEffect(() => {
    if (novaOpen) { setPalIdx(2); return }
    setPalIdx(PATH_PAL[rootPath(pathname)] ?? 0)
  }, [pathname, novaOpen])

  // ── Close menus on navigation ────────────────────────────────────────────
  useEffect(() => {
    setNovaOpen(false)
    clearTimeout(closeTimerRef.current)
    setCreateOpen(false)
    setIsClosing(false)
  }, [pathname])

  // ── Create menu open / close ─────────────────────────────────────────────
  function openCreate() {
    clearTimeout(closeTimerRef.current)
    setIsClosing(false)
    setCreateOpen(true)
    if (novaOpen) setNovaOpen(false)
  }
  function closeCreate() {
    if (!createOpen) return
    setIsClosing(true)
    closeTimerRef.current = setTimeout(() => {
      setCreateOpen(false)
      setIsClosing(false)
    }, 420)
  }
  function toggleCreate() { createOpen ? closeCreate() : openCreate() }

  // Per-item animation style
  function itemStyle(i) {
    if (!createOpen) return { opacity:0, pointerEvents:'none', transform:'translateX(-50%) translateY(20px)', animation:'none' }
    if (isClosing) {
      const delay = (CREATE_ITEMS.length - 1 - i) * 52
      return { animation:`ff-create-out 0.26s ease-in ${delay}ms both`, pointerEvents:'none' }
    }
    return { animation:`ff-create-in 0.38s cubic-bezier(0.34,1.56,0.64,1) ${i * 70}ms both`, pointerEvents:'auto' }
  }

  // ── Tab definitions ──────────────────────────────────────────────────────
  const TABS = [
    { href:'/dashboard', label:'Home',    Icon:IconHome },
    isTeacher
      ? { href:'/teach',    label:'Teach',    Icon:IconTeach }
      : { href:'/my-stuff', label:'My Stuff', Icon:IconStack },
    { create: true },
    { href:null, label:'Nova', nova:true },
    { href:'/profile', label:'Profile', Icon:IconUser },
  ]

  const active = rootPath(pathname)

  function isActive(tab) {
    if (tab.create) return false
    if (tab.nova)   return novaOpen
    return tab.href && (pathname === tab.href || active === tab.href)
  }

  function onTab(tab, e) {
    e.preventDefault()
    if (tab.create) return
    if (createOpen) closeCreate()
    if (tab.nova) {
      const next = !novaOpen
      setNovaOpen(next)
      if (next) setTimeout(() => novaRef.current?.focus(), 400)
    } else {
      setNovaOpen(false)
      router.push(tab.href)
    }
  }

  function sendNova() {
    const q = novaInput.trim()
    if (!q) return
    setNovaInput('')
    setNovaOpen(false)
    try { sessionStorage.setItem('nova_prefill', q) } catch(_) {}
    router.push('/ai-tutor')
  }

  const onAiTutor = pathname.startsWith('/ai-tutor')

  // ── Pill dimensions — single source of truth ─────────────────────────────
  // Pill sits at bottom:18, height ~56px → centre at 18+28=46px from screen bottom
  // Spark button (fixed, z:36) must be centred over the spacer gap.
  // PILL_BOTTOM=18 → spark bottom = PILL_BOTTOM + (PILL_HEIGHT/2) - (SPARK_SIZE/2)
  //                              = 18 + 28 - 20 = 26px ✓
  const PILL_BOTTOM  = 18
  const SPARK_BOTTOM = 26  // vertically centres 40px spark over 56px pill

  return (
    <>
      {/* ── Keyframes ── */}
      <style>{`
        @keyframes ff-create-in {
          0%   { opacity:0; transform:translateX(-50%) translateY(22px); }
          55%  { opacity:1; transform:translateX(-50%) translateY(-5px); }
          75%  {            transform:translateX(-50%) translateY(2px);  }
          100% { opacity:1; transform:translateX(-50%) translateY(0);    }
        }
        @keyframes ff-create-out {
          0%   { opacity:1; transform:translateX(-50%) translateY(0);    }
          18%  {            transform:translateX(-50%) translateY(-3px); }
          100% { opacity:0; transform:translateX(-50%) translateY(16px); }
        }
      `}</style>

      {/* ── Aurora ── */}
      <Aurora palIdx={palIdx} />

      {/* ── Nova edge glow ── */}
      <div style={{
        position:'fixed', inset:0, zIndex:8, pointerEvents:'none',
        transition:'box-shadow 0.5s',
        boxShadow: novaOpen
          ? 'inset 0 0 50px rgba(109,40,217,0.4), inset 0 0 100px rgba(99,102,241,0.2)'
          : 'none',
      }}/>

      {/* ── Page content ── */}
      <div style={{
        position:'fixed', inset:0, zIndex:10,
        overflowY:  onAiTutor ? 'hidden' : 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
      }} onClick={() => {
        if (novaOpen)   setNovaOpen(false)
        if (createOpen) closeCreate()
      }}>
        <div ref={contentRef} style={{
          minHeight: onAiTutor ? '100%' : undefined,
          height:    onAiTutor ? '100%' : undefined,
          paddingBottom: onAiTutor ? 0 : 110,
        }}>
          {children}
        </div>
      </div>

      {/* ── Create overlay — z:35 ── */}
      {!onAiTutor && (
        <div
          onClick={closeCreate}
          style={{
            position:'fixed', inset:0,
            background:'rgba(6,7,13,0.65)',
            backdropFilter:'blur(10px)',
            WebkitBackdropFilter:'blur(10px)',
            opacity:      createOpen ? 1 : 0,
            pointerEvents:createOpen ? 'auto' : 'none',
            transition:'opacity 0.26s ease',
            zIndex:35,
          }}
        />
      )}

      {/* ── Create stack items — z:36 ── */}
      {/* FIX: width is now screen-relative so items fill the screen properly */}
      {!onAiTutor && (isTeacher ? TEACHER_CREATE_ITEMS : STUDENT_CREATE_ITEMS).map((item, i) => (
        <div
          key={item.href}
          onClick={() => { closeCreate(); router.push(item.href) }}
          style={{
            position:'fixed',
            // Spacing: pill top ≈ 18+56=74px from bottom. Item 0 starts at 82px.
            // Each item is ~52px tall with 10px gap → step = 62px
            bottom: 82 + i * 62,
            left:'50%',
            // KEY FIX: fill the screen minus comfortable side padding
            width:'min(340px, calc(100vw - 40px))',
            background:'rgba(11,13,22,0.97)',
            border:`1px solid ${item.border}`,
            borderRadius:14,
            padding:'13px 18px',
            display:'flex',
            alignItems:'center',
            gap:12,
            zIndex:36,
            cursor:'pointer',
            WebkitTapHighlightColor:'transparent',
            touchAction:'manipulation',
            ...itemStyle(i),
          }}
        >
          <CreateIcon href={item.href}/>
          <span style={{
            fontSize:14,
            fontWeight:600,
            color:item.color,
            fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif',
          }}>
            {item.label}
          </span>
        </div>
      ))}

      {/* ── "Tap anywhere to close" hint ── */}
      {!onAiTutor && (
        <div style={{
          position:'fixed',
          bottom:70,
          left:'50%',
          transform:'translateX(-50%)',
          fontSize:12,
          color:'rgba(255,255,255,0.4)',
          whiteSpace:'nowrap',
          background:'rgba(0,0,0,0.25)',
          padding:'5px 16px',
          borderRadius:20,
          fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif',
          zIndex:36,
          opacity: createOpen ? 1 : 0,
          transition:'opacity 0.3s 0.1s',
          pointerEvents:'none',
        }}>
          tap anywhere to close
        </div>
      )}

      {/* ── Spark button — z:36, sits ABOVE overlay ── */}
      {!onAiTutor && (
        <div
          onClick={toggleCreate}
          style={{
            position:'fixed',
            bottom:SPARK_BOTTOM,
            left:'50%',
            transform:'translateX(-50%)',
            width:40, height:40,
            borderRadius:'50%',
            background: createOpen ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.16)',
            border: createOpen
              ? '0.5px solid rgba(139,92,246,0.85)'
              : '0.5px solid rgba(139,92,246,0.5)',
            display:'flex', alignItems:'center', justifyContent:'center',
            zIndex:37,
            cursor:'pointer',
            transition:'background 0.2s, border-color 0.2s, box-shadow 0.2s',
            boxShadow: createOpen ? '0 0 18px rgba(99,102,241,0.5)' : 'none',
            WebkitTapHighlightColor:'transparent',
            touchAction:'manipulation',
          }}
        >
          <IconSpark />
        </div>
      )}

      {/* ── Floating island — z:30 ── */}
      {!onAiTutor && (
        <div style={{
          position:'fixed', bottom:PILL_BOTTOM, left:'50%', transform:'translateX(-50%)',
          zIndex:30,
          display:'flex', flexDirection:'column', alignItems:'center',
          // KEY FIX: pill stretches to fill screen with comfortable margins
          width:'min(380px, calc(100vw - 16px))',
        }}>

          {/* Nova drawer */}
          <div style={{
            overflow:'hidden',
            maxHeight: novaOpen ? 60 : 0,
            opacity:   novaOpen ? 1  : 0,
            marginBottom: novaOpen ? 8 : 0,
            width:'100%',
            transition:'max-height 0.4s cubic-bezier(.4,0,.2,1), opacity 0.3s, margin-bottom 0.35s',
          }}>
            <div style={{
              background:'rgba(15,10,35,0.85)',
              backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
              border:'0.5px solid rgba(139,92,246,0.35)',
              borderRadius:20,
              padding:'8px 8px 8px 14px',
              display:'flex', alignItems:'center', gap:8,
              boxShadow:'0 0 0 0.5px rgba(139,92,246,0.15) inset, 0 8px 32px rgba(0,0,0,0.4)',
            }}>
              <input
                ref={novaRef}
                value={novaInput}
                onChange={e => setNovaInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendNova() }}
                onClick={e => e.stopPropagation()}
                placeholder="Ask Nova anything…"
                style={{
                  flex:1, background:'none', border:'none', outline:'none',
                  fontSize:13, color:'rgba(255,255,255,0.85)', fontFamily:'inherit',
                }}
              />
              <button
                onClick={e => { e.stopPropagation(); sendNova() }}
                style={{
                  width:32, height:32, borderRadius:'50%',
                  background:'rgba(124,58,237,0.5)',
                  border:'0.5px solid rgba(167,139,250,0.5)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0, cursor:'pointer',
                }}
              >
                <IconSend size={13} color="rgba(255,255,255,0.95)" />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          {/* KEY FIX: no separators, flex tabs share space evenly, pill fills width */}
          <div style={{
            display:'flex', alignItems:'center',
            width:'100%',
            background:'rgba(8,6,20,0.88)',
            backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
            border: novaOpen
              ? '0.5px solid rgba(124,58,237,0.5)'
              : '0.5px solid rgba(255,255,255,0.12)',
            borderRadius:40,
            padding:'7px 8px',
            boxShadow: novaOpen
              ? '0 8px 32px rgba(0,0,0,0.6), 0 0 28px rgba(99,102,241,0.3)'
              : '0 8px 32px rgba(0,0,0,0.6)',
            transition:'border-color 0.3s, box-shadow 0.3s',
          }}>
            {TABS.map((tab, i) => {
              const on = isActive(tab)
              if (tab.create) {
                // Invisible spacer — spark button sits over this
                return (
                  <div key={i} style={{ flex:1, display:'flex', justifyContent:'center', alignItems:'center' }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', flexShrink:0 }}/>
                  </div>
                )
              }
              return (
                <a
                  key={i}
                  href={tab.href || '#'}
                  onClick={e => onTab(tab, e)}
                  style={{
                    flex:1,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    borderRadius:32,
                    padding:'10px 0',
                    background: on ? 'rgba(99,102,241,0.22)' : 'transparent',
                    textDecoration:'none', cursor:'pointer',
                    touchAction:'manipulation',
                    WebkitTapHighlightColor:'transparent',
                    transition:'background 0.2s',
                  }}
                >
                  {tab.nova
                    ? <IconBullseye active={on}/>
                    : <tab.Icon size={22} color={on ? '#c4b5fd' : 'rgba(255,255,255,0.45)'}/>
                  }
                </a>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
