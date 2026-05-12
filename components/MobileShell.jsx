'use client'
// Flashfo — MobileShell
// Full mobile layout: WebGL aurora background, floating island nav,
// Nova morphing drawer, per-page palette shifts, edge glow.
// Replaces the desktop Shell entirely on mobile (< 768px).

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const PALETTES = [
  { c1: [0.40, 0.18, 0.80], c2: [0.00, 0.10, 0.50], base: [0.04, 0.03, 0.10] },
  { c1: [0.05, 0.65, 0.55], c2: [0.00, 0.30, 0.25], base: [0.02, 0.06, 0.06] },
  { c1: [0.30, 0.05, 0.70], c2: [0.05, 0.05, 0.40], base: [0.03, 0.02, 0.12] },
  { c1: [0.75, 0.30, 0.10], c2: [0.50, 0.05, 0.20], base: [0.08, 0.03, 0.04] },
]

const PATH_TO_PALETTE = {
  '/dashboard': 0, '/my-stuff': 0, '/my-progress': 0,
  '/ai-tutor': 2, '/profile': 3, '/settings': 3,
}

function rootPath(pathname) {
  return '/' + (pathname.split('/').filter(Boolean)[0] || '')
}

function AuroraCanvas({ paletteIdx }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({
    gl: null, uniforms: {}, raf: null,
    current: { c1: [...PALETTES[0].c1], c2: [...PALETTES[0].c2], base: [...PALETTES[0].base] },
    target: 0, start: null,
  })

  useEffect(() => { stateRef.current.target = paletteIdx }, [paletteIdx])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const gl = canvas.getContext('webgl')
    if (!gl) return
    stateRef.current.gl = gl

    const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}'
    const FS = `precision mediump float;
      uniform float t;uniform vec2 res;uniform vec3 uC1,uC2,uBase;
      float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.-2.*f);
        float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5);
        float b=fract(sin(dot(i+vec2(1,0),vec2(127.1,311.7)))*43758.5);
        float c=fract(sin(dot(i+vec2(0,1),vec2(127.1,311.7)))*43758.5);
        float d=fract(sin(dot(i+vec2(1,1),vec2(127.1,311.7)))*43758.5);
        return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}
      vec3 pal(float x){return uBase+vec3(0.05,0.02,0.12)*cos(6.28*(uC1*x+uC2));}
      void main(){
        vec2 uv=gl_FragCoord.xy/res;vec2 q=uv*2.-1.;q.x*=res.x/res.y;
        float tt=t*.18;
        vec2 pp=q+vec2(sin(tt*.7+q.y*1.2)*.3,cos(tt*.5+q.x*.9)*.25);
        float n=noise(pp*2.5+tt);float n2=noise(pp*1.2-tt*.6+vec2(3.7,1.2));
        float n3=noise(pp*4.+tt*1.3+vec2(1.5,4.2));
        float v=n*.5+n2*.3+n3*.2;
        vec3 col=uBase;
        col=mix(col,pal(v+tt*.05)*1.4,smoothstep(.35,.75,v)*.65);
        col=mix(col,uC1*.7,smoothstep(.55,.9,n2)*.35);
        float vig=smoothstep(0.,.8,1.-length(q*vec2(.5,.4)));
        col*=vig*1.2+.1;gl_FragColor=vec4(clamp(col,0.,1.),1.);}`

    function mkShader(type, src) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s
    }
    const prog = gl.createProgram()
    gl.attachShader(prog, mkShader(gl.VERTEX_SHADER, VS))
    gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(prog); gl.useProgram(prog)
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW)
    const pLoc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(pLoc); gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0)
    stateRef.current.uniforms = {
      t: gl.getUniformLocation(prog,'t'), res: gl.getUniformLocation(prog,'res'),
      c1: gl.getUniformLocation(prog,'uC1'), c2: gl.getUniformLocation(prog,'uC2'),
      base: gl.getUniformLocation(prog,'uBase'),
    }
    gl.uniform2f(stateRef.current.uniforms.res, canvas.width, canvas.height)
    function lerp(a, b, t) { return a + (b - a) * t }
    function frame(ts) {
      const s = stateRef.current
      if (!s.start) s.start = ts
      const tp = PALETTES[s.target]
      s.current = {
        c1: s.current.c1.map((v,i) => lerp(v, tp.c1[i], 0.035)),
        c2: s.current.c2.map((v,i) => lerp(v, tp.c2[i], 0.035)),
        base: s.current.base.map((v,i) => lerp(v, tp.base[i], 0.035)),
      }
      const { c1, c2, base } = s.current
      gl.uniform1f(s.uniforms.t, (ts - s.start) / 1000)
      gl.uniform3fv(s.uniforms.c1, c1); gl.uniform3fv(s.uniforms.c2, c2)
      gl.uniform3fv(s.uniforms.base, base)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      s.raf = requestAnimationFrame(frame)
    }
    stateRef.current.raf = requestAnimationFrame(frame)
    return () => { if (stateRef.current.raf) cancelAnimationFrame(stateRef.current.raf) }
  }, [])

  return <canvas ref={canvasRef} style={{ position:'fixed', inset:0, width:'100%', height:'100%', zIndex:0, pointerEvents:'none' }} />
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
      <AuroraCanvas paletteIdx={paletteIdx} />
      <div style={{ position:'fixed', inset:0, zIndex:8, pointerEvents:'none', transition:'box-shadow 0.5s ease',
        boxShadow: novaOpen ? 'inset 0 0 40px rgba(139,92,246,0.35),inset 0 0 80px rgba(99,102,241,0.2),inset 0 0 120px rgba(167,139,250,0.1)' : 'none' }} />
      <div style={{ position:'fixed', inset:0, zIndex:10, overflowY:'auto', overflowX:'hidden',
        WebkitOverflowScrolling:'touch', overscrollBehavior:'contain' }}
        onClick={() => { if (novaOpen) setNovaOpen(false) }}>
        <div style={{ minHeight:'100%', paddingBottom:110 }}>{children}</div>
      </div>
      <div style={{ position:'fixed', bottom:18, left:'50%', transform:'translateX(-50%)', zIndex:30,
        display:'flex', flexDirection:'column', alignItems:'center' }}>
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
        <div style={{ display:'flex', alignItems:'center', gap:2, background:'rgba(10,8,22,0.72)',
          backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
          border:novaOpen?'0.5px solid rgba(139,92,246,0.45)':'0.5px solid rgba(255,255,255,0.11)',
          borderRadius:40, padding:'7px 8px',
          boxShadow:novaOpen?'0 8px 32px rgba(0,0,0,0.55),0 0 24px rgba(99,102,241,0.25)':'0 8px 32px rgba(0,0,0,0.55)',
          transition:'border-color 0.35s,box-shadow 0.35s' }}>
          {TABS.map((tab, i) => {
            const active = isTabActive(tab)
            return (
              <div key={i} style={{ display:'flex', alignItems:'center' }}>
                {i > 0 && <div style={{ width:0.5, height:16, background:'rgba(255,255,255,0.09)', flexShrink:0, margin:'0 1px' }} />}
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
                      color:active?'#c4b5fd':'rgba(255,255,255,0.3)',
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
