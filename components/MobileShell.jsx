'use client'
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

// Per-page aurora palettes — blob colours only
const PALETTES = {
  0: { bg:'#05030d', b1:'#4f46e5', b2:'#7c3aed', b3:'#2563eb' }, // home: indigo/violet
  1: { bg:'#021009', b1:'#059669', b2:'#0d9488', b3:'#10b981' }, // my-stuff: emerald/teal
  2: { bg:'#04020e', b1:'#7c3aed', b2:'#4f46e5', b3:'#6d28d9' }, // nova: deep violet
  3: { bg:'#0e0502', b1:'#d97706', b2:'#db2777', b3:'#ea580c' }, // profile: amber/rose
}
const PATH_PAL = { '/dashboard':0,'/my-stuff':0,'/my-progress':0,'/ai-tutor':2,'/profile':3,'/settings':3 }

function rootPath(p) { return '/'+(p.split('/').filter(Boolean)[0]||'') }

// ── Icons ──────────────────────────────────────────────────────────────────
function IconHome({ size=20, color='currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )
}
function IconStack({ size=20, color='currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 12l10 5 10-5"/>
      <path d="M2 17l10 5 10-5"/>
    </svg>
  )
}
function IconUser({ size=20, color='currentColor' }) {
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
  const col  = active ? 'rgba(196,181,253,0.95)' : 'rgba(196,181,253,0.55)'
  const glow = active ? 'drop-shadow(0 0 8px rgba(167,139,250,0.9))' : 'drop-shadow(0 0 4px rgba(167,139,250,0.4))'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ display:'block', filter:glow, transition:'filter 0.3s' }}>
      <circle cx="11" cy="11" r="10"  stroke={col} strokeWidth="1.3"/>
      <circle cx="11" cy="11" r="6.5" stroke={col} strokeWidth="1.3"/>
      <circle cx="11" cy="11" r="3"   stroke={col} strokeWidth="1.3"/>
      <circle cx="11" cy="11" r="1.3" fill={col}/>
    </svg>
  )
}

// ── Aurora background ──────────────────────────────────────────────────────
// Transition reduced from 1.4s → 0.3s so the palette syncs with the page
// content instead of lagging a full second behind after navigation.
function Aurora({ palIdx }) {
  const pal = PALETTES[palIdx] || PALETTES[0]
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1, background:pal.bg, overflow:'hidden',
      pointerEvents:'none',
      transition:'background 0.3s ease',   // was 1.4s — caused background/content mismatch
    }}>
      <div style={{
        position:'absolute', width:'70vw', height:'55vw', borderRadius:'50%',
        background:pal.b1, filter:'blur(72px)', opacity:0.55, top:'-5%', left:'-10%',
        willChange:'transform', transform:'translateZ(0)',
        transition:'background 0.3s ease',  // was 1.4s
      }}/>
      <div style={{
        position:'absolute', width:'65vw', height:'50vw', borderRadius:'50%',
        background:pal.b2, filter:'blur(80px)', opacity:0.4, top:'25%', right:'-15%',
        willChange:'transform', transform:'translateZ(0)',
        transition:'background 0.3s ease',  // was 1.4s
      }}/>
      <div style={{
        position:'absolute', width:'50vw', height:'45vw', borderRadius:'50%',
        background:pal.b3, filter:'blur(64px)', opacity:0.3, bottom:'-10%', left:'20%',
        willChange:'transform', transform:'translateZ(0)',
        transition:'background 0.3s ease',  // was 1.4s
      }}/>
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)' }}/>
    </div>
  )
}

// ── Shell ──────────────────────────────────────────────────────────────────
export default function MobileShell({ children }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const [novaOpen, setNovaOpen] = useState(false)
  const [novaInput, setNovaInput] = useState('')
  const [palIdx, setPalIdx] = useState(0)
  const novaRef    = useRef(null)
  const contentRef = useRef(null)   // fades page content only — not Aurora or tab bar
  const firstMount = useRef(true)

  // Fade only the content area on navigation, not the chrome.
  // useLayoutEffect fires before paint so content is never seen mid-swap.
  useLayoutEffect(() => {
    if (firstMount.current) { firstMount.current = false; return }
    const el = contentRef.current
    if (!el) return
    el.style.transition = 'none'
    el.style.opacity    = '0'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.18s ease'
        el.style.opacity    = '1'
      })
    })
  }, [pathname])

  useEffect(() => {
    if (novaOpen) { setPalIdx(2); return }
    setPalIdx(PATH_PAL[rootPath(pathname)] ?? 0)
  }, [pathname, novaOpen])

  useEffect(() => { setNovaOpen(false) }, [pathname])

  const TABS = [
    { href:'/dashboard', label:'Home',    Icon:IconHome  },
    { href:'/my-stuff',  label:'My Stuff',Icon:IconStack },
    { href:null,         label:'Nova',    nova:true      },
    { href:'/profile',   label:'Profile', Icon:IconUser  },
  ]

  const active = rootPath(pathname)

  function isActive(tab) {
    if (tab.nova) return novaOpen
    return tab.href && (pathname === tab.href || active === tab.href)
  }

  function onTab(tab, e) {
    e.preventDefault()
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
    setNovaInput(''); setNovaOpen(false)
    try { sessionStorage.setItem('nova_prefill', q) } catch(_) {}
    router.push('/ai-tutor')
  }

  return (
    <>
      <Aurora palIdx={palIdx} />

      {/* Nova edge glow */}
      <div style={{
        position:'fixed', inset:0, zIndex:8, pointerEvents:'none',
        transition:'box-shadow 0.5s',
        boxShadow: novaOpen
          ? 'inset 0 0 50px rgba(109,40,217,0.4), inset 0 0 100px rgba(99,102,241,0.2)'
          : 'none',
      }}/>

      {/* Page content */}
      <div style={{
        position:'fixed', inset:0, zIndex:10,
        overflowY:  pathname.startsWith('/ai-tutor') ? 'hidden' : 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
      }} onClick={() => { if (novaOpen) setNovaOpen(false) }}>
        <div ref={contentRef} style={{
          minHeight: pathname.startsWith('/ai-tutor') ? '100%' : undefined,
          height:    pathname.startsWith('/ai-tutor') ? '100%' : undefined,
          paddingBottom: pathname.startsWith('/ai-tutor') ? 0 : 110,
        }}>
          {children}
        </div>
      </div>

      {/* Floating island — hidden on ai-tutor */}
      {!pathname.startsWith('/ai-tutor') && (
        <div style={{
          position:'fixed', bottom:18, left:'50%', transform:'translateX(-50%)',
          zIndex:30, display:'flex', flexDirection:'column', alignItems:'center',
          width:'max-content',
        }}>
          {/* Nova drawer */}
          <div style={{
            overflow:'hidden',
            maxHeight: novaOpen ? 60 : 0,
            opacity:   novaOpen ? 1 : 0,
            marginBottom: novaOpen ? 8 : 0,
            width: 286,
            transition:'max-height 0.4s cubic-bezier(.4,0,.2,1), opacity 0.3s, margin-bottom 0.35s',
          }}>
            <div style={{
              background:'rgba(15,10,35,0.85)', backdropFilter:'blur(40px)',
              WebkitBackdropFilter:'blur(40px)',
              border:'0.5px solid rgba(139,92,246,0.35)', borderRadius:20,
              padding:'8px 8px 8px 14px', display:'flex', alignItems:'center', gap:8,
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
          <div style={{
            display:'flex', alignItems:'center', gap:0,
            background:'rgba(8,6,20,0.88)',
            backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
            border: novaOpen ? '0.5px solid rgba(124,58,237,0.5)' : '0.5px solid rgba(255,255,255,0.12)',
            borderRadius:40, padding:'6px 6px',
            boxShadow: novaOpen
              ? '0 8px 32px rgba(0,0,0,0.6), 0 0 28px rgba(99,102,241,0.3)'
              : '0 8px 32px rgba(0,0,0,0.6)',
            transition:'border-color 0.3s, box-shadow 0.3s',
          }}>
            {TABS.map((tab, i) => {
              const on = isActive(tab)
              return (
                <div key={i} style={{ display:'flex', alignItems:'center' }}>
                  {i > 0 && (
                    <div style={{ width:1, height:14, background:'rgba(255,255,255,0.1)', margin:'0 2px', flexShrink:0 }}/>
                  )}
                  <a
                    href={tab.href || '#'}
                    onClick={e => onTab(tab, e)}
                    style={{
                      display:'flex', alignItems:'center', justifyContent:'center',
                      borderRadius:32, padding:'9px 14px',
                      background: on ? 'rgba(99,102,241,0.22)' : 'transparent',
                      textDecoration:'none', cursor:'pointer',
                      touchAction:'manipulation', WebkitTapHighlightColor:'transparent',
                      transition:'background 0.2s', minWidth:46,
                    }}
                  >
                    {tab.nova
                      ? <IconBullseye active={on}/>
                      : <tab.Icon size={20} color={on ? '#c4b5fd' : 'rgba(255,255,255,0.45)'}/>
                    }
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
