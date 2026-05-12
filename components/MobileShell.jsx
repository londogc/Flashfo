'use client'
// Flashfo — MobileShell
// Full mobile layout: CSS aurora background (iOS-safe), floating island nav,
// Nova morphing drawer, per-page palette shifts, edge glow.
// Replaces the desktop Shell entirely on mobile (< 768px).

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

// CSS gradient palettes — no WebGL, works on all iOS Safari
const PALETTES = [
  // 0 — Home/Dashboard: purple/indigo
  {
    bg: '#06040f',
    g1: 'radial-gradient(ellipse 80% 50% at 20% 20%, rgba(99,102,241,0.28) 0%, transparent 70%)',
    g2: 'radial-gradient(ellipse 60% 40% at 80% 70%, rgba(139,92,246,0.18) 0%, transparent 65%)',
    g3: 'radial-gradient(ellipse 50% 60% at 60% 10%, rgba(167,139,250,0.12) 0%, transparent 60%)',
  },
  // 1 — My Stuff: teal/emerald
  {
    bg: '#030d0c',
    g1: 'radial-gradient(ellipse 80% 50% at 20% 20%, rgba(5,150,105,0.28) 0%, transparent 70%)',
    g2: 'radial-gradient(ellipse 60% 40% at 80% 70%, rgba(16,185,129,0.18) 0%, transparent 65%)',
    g3: 'radial-gradient(ellipse 50% 60% at 60% 10%, rgba(52,211,153,0.1) 0%, transparent 60%)',
  },
  // 2 — Nova: deep violet/blue
  {
    bg: '#04020f',
    g1: 'radial-gradient(ellipse 80% 50% at 30% 30%, rgba(124,58,237,0.35) 0%, transparent 70%)',
    g2: 'radial-gradient(ellipse 60% 40% at 75% 65%, rgba(99,102,241,0.22) 0%, transparent 65%)',
    g3: 'radial-gradient(ellipse 50% 60% at 55% 5%,  rgba(196,181,253,0.1) 0%, transparent 60%)',
  },
  // 3 — Profile: warm amber/rose
  {
    bg: '#0d0603',
    g1: 'radial-gradient(ellipse 80% 50% at 20% 20%, rgba(217,119,6,0.28) 0%, transparent 70%)',
    g2: 'radial-gradient(ellipse 60% 40% at 80% 70%, rgba(219,39,119,0.18) 0%, transparent 65%)',
    g3: 'radial-gradient(ellipse 50% 60% at 60% 10%, rgba(251,146,60,0.1) 0%, transparent 60%)',
  },
]

const PATH_TO_PALETTE = {
  '/dashboard': 0, '/my-stuff': 0, '/my-progress': 0,
  '/ai-tutor': 2, '/profile': 3, '/settings': 3,
}

function rootPath(pathname) {
  return '/' + (pathname.split('/').filter(Boolean)[0] || '')
}

function AuroraBg({ paletteIdx }) {
  const pal = PALETTES[paletteIdx] || PALETTES[0]
  return (
    <>
      <style>{`
        @keyframes ff-drift1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(8%,12%) scale(1.08); }
          66%      { transform: translate(-5%,6%) scale(0.95); }
        }
        @keyframes ff-drift2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(-10%,-8%) scale(1.12); }
          70%      { transform: translate(6%,-4%) scale(0.92); }
        }
        @keyframes ff-drift3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(4%,-10%) scale(1.06); }
        }
      `}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1,
        background: pal.bg,
        transition: 'background 1.2s ease',
        pointerEvents: 'none', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: pal.g1,
          animation: 'ff-drift1 18s ease-in-out infinite',
          transition: 'background 1.2s ease',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: pal.g2,
          animation: 'ff-drift2 24s ease-in-out infinite',
          transition: 'background 1.2s ease',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: pal.g3,
          animation: 'ff-drift3 30s ease-in-out infinite',
          transition: 'background 1.2s ease',
        }} />
      </div>
    </>
  )
}

function NovaBullseye({ active }) {
  const col = active ? 'rgba(196,181,253,0.95)' : 'rgba(196,181,253,0.55)'
  const glow = active ? 'drop-shadow(0 0 9px rgba(167,139,250,0.95))' : 'drop-shadow(0 0 5px rgba(167,139,250,0.45))'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ display:'block', filter:glow, transition:'filter 0.3s' }}>
      <circle cx="11" cy="11" r="10" stroke={col} strokeWidth="1.2" />
      <circle cx="11" cy="11" r="6.5" stroke={col} strokeWidth="1.2" />
      <circle cx="11" cy="11" r="3" stroke={col} strokeWidth="1.2" />
      <circle cx="11" cy="11" r="1.2" fill={col} />
    </svg>
  )
}

export default function MobileShell({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [novaOpen, setNovaOpen] = useState(false)
  const [novaInput, setNovaInput] = useState('')
  const [paletteIdx, setPaletteIdx] = useState(0)
  const novaInputRef = useRef(null)

  useEffect(() => {
    if (novaOpen) { setPaletteIdx(2); return }
    const base = rootPath(pathname)
    setPaletteIdx(PATH_TO_PALETTE[base] ?? 0)
  }, [pathname, novaOpen])

  useEffect(() => { setNovaOpen(false) }, [pathname])

  const TABS = [
    { href: '/dashboard', label: 'Home',     icon: 'home',    palIdx: 0 },
    { href: '/my-stuff',  label: 'My Stuff', icon: 'stack-2', palIdx: 1 },
    { href: null,         label: 'Nova',     nova: true,      palIdx: 2 },
    { href: '/profile',   label: 'Profile',  icon: 'user',    palIdx: 3 },
  ]

  const activePath = rootPath(pathname)

  function isTabActive(tab) {
    if (tab.nova) return novaOpen
    return tab.href && (pathname === tab.href || activePath === tab.href)
  }

  function handleTabClick(tab, e) {
    e.preventDefault()
    if (tab.nova) {
      const next = !novaOpen
      setNovaOpen(next)
      if (next) setTimeout(() => novaInputRef.current?.focus(), 450)
    } else {
      setNovaOpen(false)
      router.push(tab.href)
    }
  }

  function handleNovaSend() {
    const q = novaInput.trim()
    if (!q) return
    setNovaInput(''); setNovaOpen(false)
    try { sessionStorage.setItem('nova_prefill', q) } catch (_) {}
    router.push('/ai-tutor')
  }

  return (
    <>
      {/* CSS aurora — reliable on all iOS Safari, no WebGL needed */}
      <AuroraBg paletteIdx={paletteIdx} />

      {/* Edge glow when Nova open */}
      <div style={{ position:'fixed', inset:0, zIndex:8, pointerEvents:'none', transition:'box-shadow 0.5s ease',
        boxShadow: novaOpen ? 'inset 0 0 40px rgba(139,92,246,0.35),inset 0 0 80px rgba(99,102,241,0.2),inset 0 0 120px rgba(167,139,250,0.1)' : 'none' }} />

      {/* Scrollable content area */}
      <div style={{ position:'fixed', inset:0, zIndex:10, overflowY:'auto', overflowX:'hidden',
        WebkitOverflowScrolling:'touch', overscrollBehavior:'contain' }}
        onClick={() => { if (novaOpen) setNovaOpen(false) }}>
        <div style={{ minHeight:'100%', paddingBottom:110 }}>{children}</div>
      </div>

      {/* Floating island nav */}
      <div style={{ position:'fixed', bottom:18, left:'50%', transform:'translateX(-50%)', zIndex:30,
        display:'flex', flexDirection:'column', alignItems:'center' }}>

        {/* Nova drawer */}
        <div style={{ overflow:'hidden', maxHeight:novaOpen?58:0, opacity:novaOpen?1:0, marginBottom:novaOpen?9:0,
          width:290, transition:'max-height 0.45s cubic-bezier(0.4,0,0.2,1),opacity 0.35s ease,margin-bottom 0.4s' }}>
          <div style={{ background:'rgba(255,255,255,0.06)', backdropFilter:'blur(40px) saturate(180%)',
            WebkitBackdropFilter:'blur(40px) saturate(180%)', border:'0.5px solid rgba(255,255,255,0.14)',
            borderRadius:22, padding:'9px 9px 9px 15px', display:'flex', alignItems:'center', gap:8,
            boxShadow:'0 0 0 0.5px rgba(139,92,246,0.2) inset,0 8px 32px rgba(0,0,0,0.3)' }}>
            <input ref={novaInputRef} value={novaInput} onChange={e => setNovaInput(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter') handleNovaSend() }}
              onClick={e => e.stopPropagation()} placeholder="Ask Nova anything…"
              style={{ flex:1, background:'none', border:'none', outline:'none', fontSize:13,
                color:'rgba(255,255,255,0.85)', fontFamily:'inherit' }} />
            <button onClick={e => { e.stopPropagation(); handleNovaSend() }}
              style={{ width:30, height:30, borderRadius:'50%', background:'rgba(139,92,246,0.4)',
                border:'0.5px solid rgba(167,139,250,0.4)', display:'flex', alignItems:'center',
                justifyContent:'center', flexShrink:0, cursor:'pointer' }}>
              <i className="ti ti-send" style={{ fontSize:12, color:'rgba(255,255,255,0.9)' }} />
            </button>
          </div>
        </div>

        {/* Island tabs */}
        <div style={{ display:'flex', alignItems:'center', gap:2, background:'rgba(10,8,22,0.85)',
          backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
          border:novaOpen?'0.5px solid rgba(139,92,246,0.45)':'0.5px solid rgba(255,255,255,0.15)',
          borderRadius:40, padding:'7px 8px',
          boxShadow:novaOpen?'0 8px 32px rgba(0,0,0,0.55),0 0 24px rgba(99,102,241,0.25)':'0 8px 32px rgba(0,0,0,0.55)',
          transition:'border-color 0.35s,box-shadow 0.35s' }}>
          {TABS.map((tab, i) => {
            const active = isTabActive(tab)
            return (
              <div key={i} style={{ display:'flex', alignItems:'center' }}>
                {i > 0 && <div style={{ width:0.5, height:16, background:'rgba(255,255,255,0.12)', flexShrink:0, margin:'0 1px' }} />}
                <a href={tab.href||'#'} onClick={(e) => handleTabClick(tab,e)}
                  style={{ display:'flex', alignItems:'center', borderRadius:30,
                    padding:tab.nova?'8px 11px':'8px 12px',
                    background:active?'rgba(99,102,241,0.2)':'none', textDecoration:'none',
                    cursor:'pointer', touchAction:'manipulation', WebkitTapHighlightColor:'transparent',
                    transition:'background 0.25s', position:'relative', overflow:'hidden' }}>
                  {active && !tab.nova && <div style={{ position:'absolute', inset:0, borderRadius:30, pointerEvents:'none',
                    background:'radial-gradient(ellipse at center,rgba(99,102,241,0.28) 0%,transparent 70%)' }} />}
                  {tab.nova ? <NovaBullseye active={active} /> : (
                    <i className={`ti ti-${tab.icon}`} style={{ fontSize:20, position:'relative', zIndex:1,
                      color:active?'#c4b5fd':'rgba(255,255,255,0.5)',
                      transform:active?'scale(1.08)':'scale(1)', transition:'color 0.25s,transform 0.2s' }} />
                  )}
                  {active && <span style={{ fontSize:12, fontWeight:500, color:'#c4b5fd', marginLeft:6,
                    overflow:'hidden', whiteSpace:'nowrap', maxWidth:80, opacity:1,
                    position:'relative', zIndex:1 }}>{tab.label}</span>}
                </a>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
