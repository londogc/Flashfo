'use client'
// Fixes applied:
// 1. HYDRATION CRASH (#418/#422): The previous fix read window.location.search inside
//    useState() initializer → server returns 'signup', client returns 'signin' for
//    /auth?tab=signin → mismatch → crash. Fixed: useState stays 'signup' on both
//    server and client. URL param is read in useEffect (after hydration), safe.
// 2. ORIGINAL CRASH (#425): dangerouslySetInnerHTML on <script> tag caused server/client
//    HTML mismatch (Next.js strips/defers script content in SSR). Fixed: WebGL moved
//    entirely into a useEffect with useRef — no script tag, no mismatch.
// 3. WEBGL SAFETY: Entire WebGL setup wrapped in try/catch so any GPU-specific failure
//    (null program, shader compile error, etc.) fails silently instead of crashing.
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const router = useRouter()

  // IMPORTANT: must be 'signup' here — same value on server AND client during hydration.
  // URL params are read in useEffect below (after hydration) to avoid mismatch.
  const [tab,      setTab]      = useState('signup')
  const [step,     setStep]     = useState('form')
  const [role,     setRole]     = useState('student')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  const bgRef = useRef(null)

  // Read URL params AFTER hydration — safe, no mismatch
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'signin') setTab('signin')
  }, [])

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    }).catch(() => {})  // ignore stale refresh token errors
  }, [])

  // WebGL fluid background — in useEffect so it's never in SSR HTML (no hydration mismatch)
  // Entire setup in try/catch so any GPU failure is silent (background is decorative)
  useEffect(() => {
    const canvas = bgRef.current
    if (!canvas || canvas._init) return
    canvas._init = true

    try {
      const gl = canvas.getContext('webgl')
      if (!gl) return

      let running = true

      const resize = () => {
        canvas.width  = innerWidth
        canvas.height = innerHeight
        gl.viewport(0, 0, canvas.width, canvas.height)
      }
      resize()
      window.addEventListener('resize', resize)

      const VS = `attribute vec2 aP;varying vec2 vU;void main(){vU=aP*.5+.5;gl_Position=vec4(aP,.999,1.);}`
      const FS = `precision highp float;uniform float uT;uniform vec2 uR;varying vec2 vU;vec2 h2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.545);}float n(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(dot(h2(i),f),dot(h2(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(h2(i+vec2(0,1)),f-vec2(0,1)),dot(h2(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}float fbm(vec2 p){float v=0.,a=.5;mat2 r=mat2(.8,-.6,.6,.8);for(int i=0;i<5;i++){v+=a*n(p);p=r*p*2.01;a*=.5;}return v;}void main(){vec2 uv=vU;float ar=uR.x/uR.y;uv.x*=ar;float t=uT*.05;vec2 q=vec2(fbm(uv*1.6+t),fbm(uv*1.6+vec2(5.2,1.3)+t*.8));vec2 r=vec2(fbm(uv*1.6+3.4*q+t*.6),fbm(uv*1.6+3.4*q+vec2(8.3,2.8)+t*.45));float f=fbm(uv*1.6+3.4*r+t*.3);f=clamp(f,0.,1.);vec3 col=mix(vec3(.010,.018,.10),vec3(.12,.022,.28),smoothstep(0.,.47,f));col=mix(col,vec3(.30,.06,.60),smoothstep(.27,.67,f));col=mix(col,vec3(.68,.12,.88),smoothstep(.51,.83,f));vec2 vig=vU-.5;col*=clamp(1.-dot(vig,vig)*1.8,.0,1.);col+=.01;gl_FragColor=vec4(col,1.);}`

      const mkS = (t, s) => {
        const sh = gl.createShader(t)
        if (!sh) throw new Error('shader null')
        gl.shaderSource(sh, s)
        gl.compileShader(sh)
        return sh
      }

      const prog = gl.createProgram()
      if (!prog) throw new Error('program null')
      gl.attachShader(prog, mkS(gl.VERTEX_SHADER, VS))
      gl.attachShader(prog, mkS(gl.FRAGMENT_SHADER, FS))
      gl.linkProgram(prog)

      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW)

      const uT = gl.getUniformLocation(prog, 'uT')
      const uR = gl.getUniformLocation(prog, 'uR')
      const aP = gl.getAttribLocation(prog, 'aP')
      let t = 0

      ;(function draw() {
        if (!running) return
        requestAnimationFrame(draw)
        t += 0.01
        gl.clearColor(0.02, 0.03, 0.06, 1)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.useProgram(prog)
        gl.uniform1f(uT, t)
        gl.uniform2f(uR, canvas.width, canvas.height)
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.enableVertexAttribArray(aP)
        gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      })()

      return () => {
        running = false
        window.removeEventListener('resize', resize)
      }
    } catch {
      // WebGL not available or failed — background is decorative, safe to skip
    }
  }, [])

  async function handleSignUp(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    if (!email.trim() || password.length < 6) {
      setError('Please enter a valid email and a password of at least 6 characters.')
      setLoading(false); return
    }
    setLoading(false)
    setStep('role')
  }

  async function handleRoleConfirm() {
    setError(''); setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { emailRedirectTo: `${location.origin}/dashboard`, data: { role } },
      })
      if (error) { setStep('form'); setError(error.message); setLoading(false); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        await supabase.from('profiles').upsert({ id: session.user.id, role }, { onConflict: 'id' })
      }
      setSuccess('Check your email to confirm your account, then sign in.')
      setTab('signin'); setStep('form')
    } catch (e) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) { setError(error.message); setLoading(false); return }
      router.replace('/dashboard')
    } catch (e) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const isSignIn = tab === 'signin'

  const ROLES = [
    {
      id:'student', label:'Student', desc:'Flashcards, quizzes, Nova AI tutor, study guides',
      color:'#6366f1', bg:'rgba(99,102,241,0.12)', border:'rgba(99,102,241,0.35)',
      icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
    },
    {
      id:'teacher', label:'Teacher', desc:'Live quizzes, lesson plans, class rosters, assignments',
      color:'#f59e0b', bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.35)',
      icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="1"/><path d="M8 21h8M12 17v4"/></svg>,
    },
    {
      id:'parent', label:'Parent', desc:"Track your child's quiz scores and study activity",
      color:'#34d399', bg:'rgba(52,211,153,0.12)', border:'rgba(52,211,153,0.35)',
      icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;font-family:'Inter',-apple-system,sans-serif;background:#050709;color:#e2e8f0}
        #auth-bg{position:fixed;inset:0;z-index:0;pointer-events:none}
        .auth-wrap{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column}
        .auth-nav{padding:18px 32px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .auth-logo{display:flex;align-items:center;gap:10px;text-decoration:none;cursor:pointer}
        .auth-logo-ring{position:relative;width:34px;height:34px}
        .auth-logo-spin{position:absolute;inset:-2px;border-radius:10px;background:conic-gradient(#3b82f6,#8b5cf6,#a78bfa,#3b82f6);animation:spin 3s linear infinite}
        .auth-logo-inner{position:absolute;inset:2px;border-radius:7px;background:#080b12;display:flex;align-items:center;justify-content:center}
        .auth-logo-word{font-size:17px;font-weight:800;color:#e2e8f0;letter-spacing:-.02em}
        @keyframes spin{100%{transform:rotate(360deg)}}
        .auth-nav-right{font-size:14px;color:rgba(255,255,255,0.45)}
        .auth-nav-right a{color:#818cf8;font-weight:600;text-decoration:none;margin-left:6px}
        .auth-nav-right a:hover{color:#a5b4fc}
        .auth-main{flex:1;display:flex;align-items:center;justify-content:center;padding:20px}
        .auth-card{background:rgba(10,14,24,0.92);border:1px solid rgba(255,255,255,0.09);border-radius:20px;padding:32px;width:100%;max-width:420px;backdrop-filter:blur(24px)}
        .auth-tabs{display:flex;background:rgba(255,255,255,0.05);border-radius:12px;padding:4px;margin-bottom:28px}
        .auth-tab{flex:1;padding:10px;border-radius:9px;font-size:14px;font-weight:700;text-align:center;cursor:pointer;transition:all .2s;color:rgba(255,255,255,0.35);border:none;background:none;font-family:inherit}
        .auth-tab.active{background:rgba(255,255,255,0.1);color:#e2e8f0}
        .auth-title{font-size:22px;font-weight:900;letter-spacing:-.04em;color:#e2e8f0;margin-bottom:4px}
        .auth-sub{font-size:14px;color:rgba(255,255,255,0.35);margin-bottom:24px}
        .form-group{margin-bottom:16px}
        .form-label{display:block;font-size:12px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
        .form-input{width:100%;padding:12px 14px;border-radius:12px;border:1.5px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:#e2e8f0;font-size:14px;font-family:inherit;outline:none;transition:border-color .2s}
        .form-input:focus{border-color:rgba(129,140,248,0.5);background:rgba(255,255,255,0.09)}
        .form-input::placeholder{color:rgba(255,255,255,0.2)}
        .form-input:disabled{opacity:.5}
        .forgot{text-align:right;margin-top:-8px;margin-bottom:16px}
        .forgot a{font-size:13px;color:rgba(129,140,248,0.7);text-decoration:none;font-weight:600}
        .forgot a:hover{color:#a5b4fc}
        .submit-btn{width:100%;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;box-shadow:0 4px 20px rgba(99,102,241,0.4);margin-top:4px}
        .submit-btn:hover{box-shadow:0 6px 28px rgba(99,102,241,0.6);transform:translateY(-1px)}
        .submit-btn:active{transform:scale(.98)}
        .submit-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .auth-error{background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:10px 14px;font-size:13px;color:#fca5a5;margin-bottom:16px}
        .auth-success{background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:10px 14px;font-size:13px;color:#6ee7b7;margin-bottom:16px}
        .auth-bottom{text-align:center;margin-top:20px;font-size:13px;color:rgba(255,255,255,0.35)}
        .auth-bottom a{color:#818cf8;font-weight:600;text-decoration:none;margin-left:4px}
        .auth-bottom a:hover{color:#a5b4fc}
        .trial-badge{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:16px;font-size:12px;color:rgba(255,255,255,0.25)}
        .trial-badge svg{width:12px;height:12px;fill:none;stroke:rgba(255,255,255,0.25);stroke-width:1.5;stroke-linecap:round}
      `}</style>

      {/* Canvas with ref — no script tag, no SSR mismatch */}
      <canvas id="auth-bg" ref={bgRef}/>

      <div className="auth-wrap">
        <nav className="auth-nav">
          <a className="auth-logo" href="/">
            <div className="auth-logo-ring">
              <div className="auth-logo-spin"/>
              <div className="auth-logo-inner">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
            </div>
            <span className="auth-logo-word">Flashfo</span>
          </a>
          <div className="auth-nav-right">
            {isSignIn
              ? <>New here? <a href="/auth">Sign up free</a></>
              : <>Already have an account? <a href="/auth?tab=signin">Sign in</a></>}
          </div>
        </nav>

        <div className="auth-main">
          <div className="auth-card">
            <div className="auth-tabs">
              <button className={`auth-tab${!isSignIn?' active':''}`}
                onClick={() => { setTab('signup'); setStep('form'); setError(''); setSuccess('') }}>Sign up</button>
              <button className={`auth-tab${isSignIn?' active':''}`}
                onClick={() => { setTab('signin'); setStep('form'); setError(''); setSuccess('') }}>Sign in</button>
            </div>

            {!isSignIn && step === 'role' ? (
              <>
                <div className="auth-title">I am signing up as a…</div>
                <div className="auth-sub" style={{ marginBottom:20 }}>Choose your account type. You can change this later in settings.</div>
                {error && <div className="auth-error">{error}</div>}
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
                  {ROLES.map(r => (
                    <div key={r.id} onClick={() => setRole(r.id)}
                      style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:14, cursor:'pointer', transition:'all 0.15s',
                        border:`1.5px solid ${role===r.id ? r.border : 'rgba(255,255,255,0.09)'}`,
                        background: role===r.id ? r.bg : 'rgba(255,255,255,0.03)' }}>
                      <div style={{ width:42, height:42, borderRadius:12, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s',
                        background: role===r.id ? r.bg : 'rgba(255,255,255,0.06)',
                        color: role===r.id ? r.color : 'rgba(255,255,255,0.35)' }}>
                        {r.icon}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:15, fontWeight:700, marginBottom:2, color: role===r.id ? '#e2e8f0' : 'rgba(255,255,255,0.65)' }}>{r.label}</div>
                        <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', lineHeight:1.4 }}>{r.desc}</div>
                      </div>
                      <div style={{ width:18, height:18, borderRadius:'50%', flexShrink:0, transition:'all 0.15s', display:'flex', alignItems:'center', justifyContent:'center',
                        border:`2px solid ${role===r.id ? r.color : 'rgba(255,255,255,0.2)'}`,
                        background: role===r.id ? r.color : 'transparent' }}>
                        {role===r.id && <svg width="9" height="9" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>}
                      </div>
                    </div>
                  ))}
                </div>
                {role==='parent' && (
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginBottom:14, padding:'8px 12px', background:'rgba(255,255,255,0.04)', borderRadius:10, lineHeight:1.5 }}>
                    Parents need a separate account from their child. Use Settings → Share with Parent to link accounts after signing up.
                  </div>
                )}
                <button className="submit-btn" onClick={handleRoleConfirm} disabled={loading}>
                  {loading ? 'Creating account…' : `Continue as ${ROLES.find(r => r.id===role)?.label} →`}
                </button>
                <div style={{ textAlign:'center', marginTop:14 }}>
                  <button onClick={() => setStep('form')} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>← Back</button>
                </div>
              </>
            ) : (
              <>
                <div className="auth-title">{isSignIn ? 'Welcome back' : 'Create your account'}</div>
                <div className="auth-sub">{isSignIn ? 'Sign in to your Flashfo account.' : "You're starting a 3-day free trial."}</div>
                {error   && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}
                <form onSubmit={isSignIn ? handleSignIn : handleSignUp}>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)} required disabled={loading}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input className="form-input" type="password" placeholder={isSignIn ? '••••••••' : 'Create a password'}
                      value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} minLength={6}/>
                  </div>
                  {isSignIn && <div className="forgot"><a href="/auth/reset">Forgot password?</a></div>}
                  <button className="submit-btn" type="submit" disabled={loading}>
                    {loading ? 'Please wait...' : isSignIn ? 'Sign in →' : 'Continue →'}
                  </button>
                </form>
                <div className="auth-bottom">
                  {isSignIn
                    ? <>Don't have an account? <a href="/auth">Sign up free</a></>
                    : <>Already have an account? <a href="/auth?tab=signin">Sign in</a></>}
                </div>
                {!isSignIn && (
                  <div className="trial-badge">
                    <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    3-day free trial · no charge until day 4 · cancel any time
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
