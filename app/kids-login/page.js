'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Creatures matching the approved design set
const CREATURES = [
  { id: 'fox',    label: 'Fox',    color: '#f97316' },
  { id: 'dragon', label: 'Dragon', color: '#6366f1' },
  { id: 'owl',    label: 'Owl',    color: '#92400e' },
  { id: 'bear',   label: 'Bear',   color: '#78350f' },
  { id: 'rabbit', label: 'Rabbit', color: '#be185d' },
  { id: 'wolf',   label: 'Wolf',   color: '#64748b' },
  { id: 'panda',  label: 'Panda',  color: '#1e293b' },
  { id: 'cat',    label: 'Cat',    color: '#f59e0b' },
]

function CreatureSVG({ id, size = 34 }) {
  const svgs = {
    fox: <svg width={size} height={size} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="50" rx="18" ry="14" fill="#f97316"/><ellipse cx="36" cy="30" rx="18" ry="17" fill="#f97316"/><polygon points="20,18 14,4 28,14" fill="#f97316"/><polygon points="52,18 58,4 44,14" fill="#f97316"/><polygon points="21,17 16,7 27,15" fill="#fda4af"/><polygon points="51,17 56,7 45,15" fill="#fda4af"/><ellipse cx="36" cy="33" rx="11" ry="9" fill="#fff7ed"/><ellipse cx="30" cy="27" rx="3.5" ry="3.5" fill="#1c1917"/><ellipse cx="42" cy="27" rx="3.5" ry="3.5" fill="#1c1917"/><circle cx="31.2" cy="26" r="1.2" fill="#fff"/><circle cx="43.2" cy="26" r="1.2" fill="#fff"/><ellipse cx="36" cy="32" rx="2.2" ry="1.5" fill="#9a3412"/></svg>,
    dragon: <svg width={size} height={size} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="51" rx="17" ry="13" fill="#6366f1"/><ellipse cx="36" cy="28" rx="17" ry="16" fill="#6366f1"/><polygon points="26,16 22,4 30,13" fill="#4f46e5"/><polygon points="46,16 50,4 42,13" fill="#4f46e5"/><ellipse cx="36" cy="33" rx="9" ry="7" fill="#818cf8"/><ellipse cx="29" cy="25" rx="3.5" ry="3.5" fill="#fbbf24"/><ellipse cx="43" cy="25" rx="3.5" ry="3.5" fill="#fbbf24"/><ellipse cx="29" cy="25" rx="2" ry="2.5" fill="#1c1917"/><ellipse cx="43" cy="25" rx="2" ry="2.5" fill="#1c1917"/><circle cx="29.8" cy="24" r="0.9" fill="#fff"/><circle cx="43.8" cy="24" r="0.9" fill="#fff"/></svg>,
    owl: <svg width={size} height={size} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="50" rx="16" ry="15" fill="#92400e"/><ellipse cx="36" cy="26" rx="17" ry="16" fill="#92400e"/><polygon points="27,13 23,3 31,12" fill="#78350f"/><polygon points="45,13 49,3 41,12" fill="#78350f"/><ellipse cx="36" cy="28" rx="13" ry="12" fill="#fef3c7"/><ellipse cx="29" cy="26" rx="4.2" ry="4.2" fill="#f59e0b"/><ellipse cx="43" cy="26" rx="4.2" ry="4.2" fill="#f59e0b"/><ellipse cx="29" cy="26" rx="2.8" ry="2.8" fill="#1c1917"/><ellipse cx="43" cy="26" rx="2.8" ry="2.8" fill="#1c1917"/><circle cx="30" cy="25" r="1" fill="#fff"/><circle cx="44" cy="25" r="1" fill="#fff"/><polygon points="36,30 33,35 39,35" fill="#f97316"/></svg>,
    bear: <svg width={size} height={size} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="51" rx="18" ry="14" fill="#78350f"/><ellipse cx="20" cy="16" rx="8" ry="8" fill="#78350f"/><ellipse cx="52" cy="16" rx="8" ry="8" fill="#78350f"/><ellipse cx="20" cy="16" rx="5" ry="5" fill="#fda4af"/><ellipse cx="52" cy="16" rx="5" ry="5" fill="#fda4af"/><ellipse cx="36" cy="30" rx="19" ry="18" fill="#92400e"/><ellipse cx="36" cy="35" rx="10" ry="8" fill="#b45309"/><ellipse cx="28" cy="26" rx="3.8" ry="3.8" fill="#1c1917"/><ellipse cx="44" cy="26" rx="3.8" ry="3.8" fill="#1c1917"/><circle cx="29.2" cy="25" r="1.3" fill="#fff"/><circle cx="45.2" cy="25" r="1.3" fill="#fff"/><ellipse cx="36" cy="33" rx="3" ry="2" fill="#1c1917"/></svg>,
    rabbit: <svg width={size} height={size} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="52" rx="16" ry="13" fill="#e2e8f0"/><ellipse cx="26" cy="12" rx="6" ry="14" fill="#e2e8f0"/><ellipse cx="46" cy="12" rx="6" ry="14" fill="#e2e8f0"/><ellipse cx="26" cy="12" rx="3.5" ry="11" fill="#fda4af"/><ellipse cx="46" cy="12" rx="3.5" ry="11" fill="#fda4af"/><ellipse cx="36" cy="32" rx="18" ry="17" fill="#e2e8f0"/><ellipse cx="29" cy="28" rx="3.8" ry="3.8" fill="#be185d"/><ellipse cx="43" cy="28" rx="3.8" ry="3.8" fill="#be185d"/><ellipse cx="36" cy="34" rx="2" ry="1.5" fill="#fda4af"/></svg>,
    wolf: <svg width={size} height={size} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="51" rx="17" ry="13" fill="#64748b"/><polygon points="22,18 16,3 30,14" fill="#64748b"/><polygon points="50,18 56,3 42,14" fill="#64748b"/><polygon points="23,17 18,6 29,14" fill="#fda4af"/><polygon points="49,17 54,6 43,14" fill="#fda4af"/><ellipse cx="36" cy="29" rx="18" ry="17" fill="#64748b"/><ellipse cx="36" cy="35" rx="10" ry="7" fill="#94a3b8"/><ellipse cx="29" cy="25" rx="3.8" ry="3.8" fill="#fbbf24"/><ellipse cx="43" cy="25" rx="3.8" ry="3.8" fill="#fbbf24"/><ellipse cx="29" cy="25" rx="2.2" ry="2.8" fill="#1c1917"/><ellipse cx="43" cy="25" rx="2.2" ry="2.8" fill="#1c1917"/></svg>,
    panda: <svg width={size} height={size} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="52" rx="18" ry="14" fill="#f8fafc"/><ellipse cx="20" cy="15" rx="8" ry="8" fill="#1e293b"/><ellipse cx="52" cy="15" rx="8" ry="8" fill="#1e293b"/><ellipse cx="36" cy="30" rx="19" ry="18" fill="#f8fafc"/><ellipse cx="27" cy="27" rx="7" ry="6" fill="#1e293b" transform="rotate(-10 27 27)"/><ellipse cx="45" cy="27" rx="7" ry="6" fill="#1e293b" transform="rotate(10 45 27)"/><ellipse cx="27" cy="27" rx="4" ry="4" fill="#fff"/><ellipse cx="45" cy="27" rx="4" ry="4" fill="#fff"/><ellipse cx="27" cy="27" rx="2.5" ry="2.5" fill="#1e293b"/><ellipse cx="45" cy="27" rx="2.5" ry="2.5" fill="#1e293b"/><ellipse cx="36" cy="33" rx="2.5" ry="1.8" fill="#1e293b"/></svg>,
    cat: <svg width={size} height={size} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="52" rx="16" ry="13" fill="#f59e0b"/><polygon points="21,18 16,4 30,15" fill="#f59e0b"/><polygon points="51,18 56,4 42,15" fill="#f59e0b"/><polygon points="22,17 18,7 29,15" fill="#fda4af"/><polygon points="50,17 54,7 43,15" fill="#fda4af"/><ellipse cx="36" cy="29" rx="18" ry="17" fill="#f59e0b"/><ellipse cx="36" cy="34" rx="11" ry="9" fill="#fef3c7"/><ellipse cx="28.5" cy="26" rx="4" ry="3.5" fill="#1c1917"/><ellipse cx="43.5" cy="26" rx="4" ry="3.5" fill="#1c1917"/><ellipse cx="28.5" cy="26" rx="1" ry="2.2" fill="#1c1917"/><ellipse cx="43.5" cy="26" rx="1" ry="2.2" fill="#1c1917"/><polygon points="36,31.5 34,34 38,34" fill="#be185d"/></svg>,
  }
  return svgs[id] || svgs.fox
}

// ── Hydration guard ──────────────────────────────────────────────────────────
export default function KidsLoginPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return <div style={{ position: 'fixed', inset: 0, background: '#0a0a1a' }} />
  return <KidsLoginUI />
}

function KidsLoginUI() {
  const router = useRouter()
  const canvasRef = useRef(null)

  const [children, setChildren]     = useState([])      // family children from DB
  const [selected, setSelected]     = useState(null)    // selected child object
  const [password, setPassword]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [fetching, setFetching]     = useState(true)

  // ── Space background (WebGL) ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || canvas._init) return
    canvas._init = true
    try {
      const gl = canvas.getContext('webgl')
      if (!gl) return
      let running = true
      const resize = () => {
        canvas.width = innerWidth
        canvas.height = innerHeight
        gl.viewport(0, 0, canvas.width, canvas.height)
      }
      resize()
      window.addEventListener('resize', resize)

      const VS = `attribute vec2 aP;varying vec2 vU;void main(){vU=aP*.5+.5;gl_Position=vec4(aP,.999,1.);}`
      const FS = `precision highp float;
uniform float uT;uniform vec2 uR;varying vec2 vU;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float stars(vec2 uv,float scale){
  vec2 g=floor(uv*scale);vec2 f=fract(uv*scale);
  float s=hash(g);float b=smoothstep(.95+s*.04,1.,1.-length(f-.5));
  return b*s;
}
void main(){
  vec2 uv=vU;float ar=uR.x/uR.y;uv.x*=ar;
  vec3 col=mix(vec3(.02,.01,.08),vec3(.08,.02,.18),uv.y);
  col=mix(col,vec3(.18,.04,.32),smoothstep(.3,.7,uv.y*.5+sin(uT*.1)*.1));
  float s=stars(vU,80.)+stars(vU*1.3+.1,120.)+stars(vU*.7+.5,60.);
  col+=vec3(s*.9,s*.95,s);
  vec2 pc=vec2(uR.x*.78/uR.x*ar,uR.y*.12/uR.y);
  float pd=length(uv-pc);
  col+=vec3(.08,.06,.35)*smoothstep(.18,.0,pd);
  col+=vec3(.12,.10,.50)*smoothstep(.10,.0,pd);
  vec2 vig=vU-.5;col*=clamp(1.-dot(vig,vig)*1.2,.0,1.);
  gl_FragColor=vec4(col,1.);
}`
      const mkS = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); return sh }
      const prog = gl.createProgram()
      gl.attachShader(prog, mkS(gl.VERTEX_SHADER, VS))
      gl.attachShader(prog, mkS(gl.FRAGMENT_SHADER, FS))
      gl.linkProgram(prog)
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW)
      const uT = gl.getUniformLocation(prog, 'uT')
      const uR = gl.getUniformLocation(prog, 'uR')
      const aP = gl.getAttribLocation(prog, 'aP')
      let t = 0;
      (function draw() {
        if (!running) return
        requestAnimationFrame(draw)
        t += 0.016
        gl.clearColor(0.02, 0.01, 0.08, 1)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.useProgram(prog)
        gl.uniform1f(uT, t)
        gl.uniform2f(uR, canvas.width, canvas.height)
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.enableVertexAttribArray(aP)
        gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      })()
      return () => { running = false; window.removeEventListener('resize', resize) }
    } catch (e) { /* silent GPU failure */ }
  }, [])

  // ── Load children for this family based on URL param or all active ────────
  // We load all active children so the parent can bookmark this page for the family.
  // In production you might scope this by a family_id query param.
  useEffect(() => {
    async function loadChildren() {
      try {
        const { data, error } = await supabase
          .from('family_children')
          .select('id, child_name, username, creature_id, grade_level, parent_id')
          .eq('active', true)
          .order('created_at', { ascending: true })

        if (error) throw error
        setChildren(data || [])
        if (data && data.length > 0) setSelected(data[0])
      } catch (e) {
        setError('Could not load profiles. Please try again.')
      } finally {
        setFetching(false)
      }
    }
    loadChildren()
  }, [])

  // ── Login handler ─────────────────────────────────────────────────────────
  async function handleLogin() {
    if (!selected) return
    if (!password.trim()) { setError('Enter your password.'); return }
    setLoading(true)
    setError('')
    try {
      // Verify password against hash stored in family_children
      // We call a Supabase RPC function to do the bcrypt comparison server-side
      const { data, error } = await supabase.rpc('verify_child_password', {
        p_child_id: selected.id,
        p_password: password,
      })
      if (error || !data) {
        setError('Wrong password. Ask your parent if you forgot it.')
        setLoading(false)
        return
      }
      // Store child session in localStorage for the kids app to use
      localStorage.setItem('flashfo_child_session', JSON.stringify({
        childId: selected.id,
        childName: selected.child_name,
        username: selected.username,
        creatureId: selected.creature_id,
        gradeLevel: selected.grade_level,
        parentId: selected.parent_id,
        loginAt: Date.now(),
      }))
      router.replace('/kids')
    } catch (e) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const s = {
    wrap: { position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
    canvas: { position: 'fixed', inset: 0, zIndex: 0 },
    // Decorative space elements
    planet: { position: 'fixed', top: 22, right: 22, width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 0 24px rgba(99,102,241,0.45)', zIndex: 1 },
    planetRing: { position: 'fixed', top: 34, right: 8, width: 78, height: 18, borderRadius: '50%', border: '2.5px solid rgba(99,102,241,0.4)', zIndex: 1, transform: 'rotate(-15deg)' },
    moon: { position: 'fixed', bottom: 80, right: 28, width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#fcd34d,#f59e0b)', boxShadow: '0 0 14px rgba(252,211,77,0.4)', zIndex: 1 },
    meteor: { position: 'fixed', top: 60, left: 24, width: 44, height: 2, background: 'linear-gradient(90deg,rgba(255,255,255,0.7),transparent)', borderRadius: 999, transform: 'rotate(-25deg)', zIndex: 1 },
    card: { position: 'relative', zIndex: 2, width: '100%', maxWidth: 340, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '22px 20px' },
    logo: { textAlign: 'center', marginBottom: 18 },
    logoText: { fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em', fontFamily: 'system-ui,sans-serif' },
    logoAccent: { color: '#e11d48' },
    logoSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 3, fontFamily: 'system-ui,sans-serif' },
    creaturesRow: { display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' },
    creaturePick: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' },
    creatureBubble: (isSelected, color) => ({
      width: 52, height: 52, borderRadius: 16,
      background: isSelected ? `rgba(${hexToRgb(color)},0.15)` : 'rgba(255,255,255,0.05)',
      border: isSelected ? `2px solid ${color}` : '0.5px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s',
    }),
    creatureLabel: (isSelected, color) => ({
      fontSize: 10,
      color: isSelected ? color : 'rgba(255,255,255,0.3)',
      fontFamily: 'system-ui,sans-serif',
    }),
    fieldWrap: { marginBottom: 10 },
    fieldLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontFamily: 'system-ui,sans-serif' },
    fieldInput: { width: '100%', background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#fff', fontFamily: 'system-ui,sans-serif', outline: 'none', boxSizing: 'border-box' },
    loginBtn: { width: '100%', padding: '12px', borderRadius: 10, background: loading ? 'rgba(225,29,72,0.5)' : '#e11d48', border: 'none', color: '#fff', fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'system-ui,sans-serif', marginBottom: 12 },
    forgotLink: { display: 'block', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.28)', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.15)', paddingBottom: 1, width: 'fit-content', margin: '0 auto' },
    parentLink: { display: 'block', textAlign: 'center', marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'system-ui,sans-serif', cursor: 'pointer' },
    parentLinkSpan: { color: 'rgba(255,255,255,0.38)', borderBottom: '0.5px solid rgba(255,255,255,0.2)' },
    error: { fontSize: 12, color: '#fda4af', textAlign: 'center', marginBottom: 10, fontFamily: 'system-ui,sans-serif' },
    // Forgot screen
    forgotIcon: { width: 52, height: 52, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', border: '0.5px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px auto 14px', fontSize: 22 },
    forgotTitle: { fontSize: 18, fontWeight: 500, color: '#fff', textAlign: 'center', marginBottom: 6, fontFamily: 'system-ui,sans-serif' },
    forgotSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.6, marginBottom: 20, fontFamily: 'system-ui,sans-serif' },
    forgotSubSpan: { color: '#fcd34d' },
    steps: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 },
    stepRow: { display: 'flex', alignItems: 'flex-start', gap: 10 },
    stepNum: { width: 22, height: 22, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '0.5px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: '#fcd34d', flexShrink: 0, marginTop: 1, fontFamily: 'system-ui,sans-serif' },
    stepText: { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, fontFamily: 'system-ui,sans-serif' },
    backBtn: { width: '100%', padding: '11px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'system-ui,sans-serif' },
    loading: { textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '20px 0', fontFamily: 'system-ui,sans-serif' },
  }

  return (
    <div style={s.wrap}>
      <canvas ref={canvasRef} style={s.canvas} />
      <div style={s.planet} />
      <div style={s.planetRing} />
      <div style={s.moon} />
      <div style={s.meteor} />

      <div style={s.card}>
        {showForgot ? (
          // ── Forgot password screen ────────────────────────────────────────
          <>
            <div style={s.forgotIcon}>🔒</div>
            <div style={s.forgotTitle}>No worries!</div>
            <p style={s.forgotSub}>
              Ask your <span style={s.forgotSubSpan}>parent or guardian</span> to reset your password. It only takes them a second.
            </p>
            <div style={s.steps}>
              {[
                'Tell your parent you need your password reset',
                <>Go to <strong style={{ color: '#fff' }}>flashfo.org</strong> and ask them to log in</>,
                <>They click on your name and tap <strong style={{ color: '#fff' }}>Reset password</strong></>,
                'Come back here and log in with your new password',
              ].map((text, i) => (
                <div key={i} style={s.stepRow}>
                  <div style={s.stepNum}>{i + 1}</div>
                  <div style={s.stepText}>{text}</div>
                </div>
              ))}
            </div>
            <button style={s.backBtn} onClick={() => setShowForgot(false)}>Back to login</button>
          </>
        ) : (
          // ── Main login screen ─────────────────────────────────────────────
          <>
            <div style={s.logo}>
              <div style={s.logoText}>flash<span style={s.logoAccent}>fo</span></div>
              <div style={s.logoSub}>Pick your character to log in</div>
            </div>

            {fetching ? (
              <div style={s.loading}>Loading profiles...</div>
            ) : children.length === 0 ? (
              <div style={s.loading}>No profiles found. Ask your parent to set up your account.</div>
            ) : (
              <>
                <div style={s.creaturesRow}>
                  {children.map(child => {
                    const creature = CREATURES.find(c => c.id === child.creature_id) || CREATURES[0]
                    const isSelected = selected?.id === child.id
                    return (
                      <div
                        key={child.id}
                        style={s.creaturePick}
                        onClick={() => { setSelected(child); setPassword(''); setError('') }}
                      >
                        <div style={s.creatureBubble(isSelected, creature.color)}>
                          <CreatureSVG id={child.creature_id} size={34} />
                        </div>
                        <div style={s.creatureLabel(isSelected, creature.color)}>{child.child_name}</div>
                      </div>
                    )
                  })}
                </div>

                {error && <div style={s.error}>{error}</div>}

                <div style={s.fieldWrap}>
                  <div style={s.fieldLabel}>Username</div>
                  <div style={{ ...s.fieldInput, color: 'rgba(255,255,255,0.6)' }}>
                    {selected?.username || ''}
                  </div>
                </div>

                <div style={s.fieldWrap}>
                  <div style={s.fieldLabel}>Password</div>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="Enter your password"
                    style={{ ...s.fieldInput, borderColor: 'rgba(225,29,72,0.3)' }}
                    autoComplete="current-password"
                  />
                </div>

                <button
                  style={s.loginBtn}
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : "Let's go!"}
                </button>

                <span style={s.forgotLink} onClick={() => setShowForgot(true)}>
                  I forgot my password
                </span>

                <span style={s.parentLink} onClick={() => router.push('/auth?tab=signin')}>
                  Are you a parent? <span style={s.parentLinkSpan}>Log in here</span>
                </span>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Helper: hex to rgb for rgba() ─────────────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
