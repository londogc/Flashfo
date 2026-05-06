'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const [tab, setTab] = useState('signup')   // 'signup' | 'signin'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // If already logged in, go to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })
    // Read ?tab=signin from URL
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'signin') setTab('signin')
  }, [])

  async function handleSignUp(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${location.origin}/dashboard` }
    })
    setLoading(false)
    if (error) return setError(error.message)
    setSuccess('Check your email to confirm your account, then sign in.')
    setTab('signin')
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (error) return setError(error.message)
    router.replace('/dashboard')
  }

  const isSignIn = tab === 'signin'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;font-family:'Inter',-apple-system,sans-serif;background:#050709;color:#e2e8f0}
        #auth-bg{position:fixed;inset:0;z-index:0;pointer-events:none}
        .auth-wrap{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column}
        /* NAV */
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
        /* MAIN */
        .auth-main{flex:1;display:flex;align-items:center;justify-content:center;padding:20px}
        .auth-card{background:rgba(10,14,24,0.92);border:1px solid rgba(255,255,255,0.09);border-radius:20px;padding:32px;width:100%;max-width:420px;backdrop-filter:blur(24px)}
        /* TABS */
        .auth-tabs{display:flex;background:rgba(255,255,255,0.05);border-radius:12px;padding:4px;margin-bottom:28px}
        .auth-tab{flex:1;padding:10px;border-radius:9px;font-size:14px;font-weight:700;text-align:center;cursor:pointer;transition:all .2s;color:rgba(255,255,255,0.35);border:none;background:none;font-family:inherit}
        .auth-tab.active{background:rgba(255,255,255,0.1);color:#e2e8f0}
        /* FORM */
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

      {/* Background WebGL fluid */}
      <canvas id="auth-bg" ref={el => el && initBg(el)} />

      <div className="auth-wrap">
        <nav className="auth-nav">
          <a className="auth-logo" href="/">
            <div className="auth-logo-ring">
              <div className="auth-logo-spin" />
              <div className="auth-logo-inner">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
            </div>
            <span className="auth-logo-word">Flashfo</span>
          </a>
          <div className="auth-nav-right">
            {isSignIn ? <>New here?<a href="/auth">Sign up free</a></> : <>Already have an account?<a href="/auth?tab=signin">Sign in</a></>}
          </div>
        </nav>

        <div className="auth-main">
          <div className="auth-card">
            <div className="auth-tabs">
              <button className={`auth-tab${!isSignIn?' active':''}`} onClick={() => { setTab('signup'); setError(''); setSuccess('') }}>Sign up</button>
              <button className={`auth-tab${isSignIn?' active':''}`} onClick={() => { setTab('signin'); setError(''); setSuccess('') }}>Sign in</button>
            </div>

            <div className="auth-title">{isSignIn ? 'Welcome back' : 'Create your account'}</div>
            <div className="auth-sub">{isSignIn ? 'Sign in to your Flashfo account.' : "You're starting a 3-day free trial of Student Pro."}</div>

            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}

            <form onSubmit={isSignIn ? handleSignIn : handleSignUp}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder={isSignIn ? '••••••••' : 'Create a password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
              {isSignIn && (
                <div className="forgot"><a href="/auth/reset">Forgot password?</a></div>
              )}
              <button className="submit-btn" type="submit" disabled={loading}>
                {loading ? 'Please wait...' : isSignIn ? 'Sign in →' : 'Start 3-day free trial →'}
              </button>
            </form>

            <div className="auth-bottom">
              {isSignIn
                ? <>Don't have an account?<a href="/auth">Sign up free</a></>
                : <>Already have an account?<a href="/auth?tab=signin">Sign in</a></>
              }
            </div>
            {!isSignIn && (
              <div className="trial-badge">
                <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                3-day free trial · no charge until day 4 · cancel any time
              </div>
            )}
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        function initBg(c) {
          if (!c || c._init) return; c._init = true;
          var gl = c.getContext('webgl'); if (!gl) return;
          function resize() { c.width = innerWidth; c.height = innerHeight; gl.viewport(0,0,c.width,c.height); }
          resize(); window.addEventListener('resize', resize);
          var VS = 'attribute vec2 aP;varying vec2 vU;void main(){vU=aP*.5+.5;gl_Position=vec4(aP,.999,1.);}';
          var FS = 'precision highp float;uniform float uT;uniform vec2 uR;varying vec2 vU;vec2 h2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.545);}float n(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(dot(h2(i),f),dot(h2(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(h2(i+vec2(0,1)),f-vec2(0,1)),dot(h2(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}float fbm(vec2 p){float v=0.,a=.5;mat2 r=mat2(.8,-.6,.6,.8);for(int i=0;i<5;i++){v+=a*n(p);p=r*p*2.01;a*=.5;}return v;}void main(){vec2 uv=vU;float ar=uR.x/uR.y;uv.x*=ar;float t=uT*.05;vec2 q=vec2(fbm(uv*1.6+t),fbm(uv*1.6+vec2(5.2,1.3)+t*.8));vec2 r=vec2(fbm(uv*1.6+3.4*q+t*.6),fbm(uv*1.6+3.4*q+vec2(8.3,2.8)+t*.45));float f=fbm(uv*1.6+3.4*r+t*.3);f=clamp(f,0.,1.);vec3 col=mix(vec3(.010,.018,.10),vec3(.12,.022,.28),smoothstep(0.,.47,f));col=mix(col,vec3(.30,.06,.60),smoothstep(.27,.67,f));col=mix(col,vec3(.68,.12,.88),smoothstep(.51,.83,f));vec2 vig=vU-.5;col*=clamp(1.-dot(vig,vig)*1.8,.0,1.);col+=.01;gl_FragColor=vec4(col,1.);}';
          function mkS(t,s){var sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);return sh;}
          var prog=gl.createProgram();gl.attachShader(prog,mkS(gl.VERTEX_SHADER,VS));gl.attachShader(prog,mkS(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);
          var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
          var uT=gl.getUniformLocation(prog,'uT'),uR=gl.getUniformLocation(prog,'uR'),aP=gl.getAttribLocation(prog,'aP');
          var t=0;(function draw(){requestAnimationFrame(draw);t+=.01;gl.clearColor(.02,.03,.06,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(prog);gl.uniform1f(uT,t);gl.uniform2f(uR,c.width,c.height);gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(aP);gl.vertexAttribPointer(aP,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);})();
        }
      ` }} />
    </>
  )
}
