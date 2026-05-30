'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Mounted guard: server renders a stable dark div, client renders
// the full auth UI after mount. No hydration mismatch possible.
export default function AuthPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return <div style={{ position:'fixed', inset:0, background:'#050709' }} />
  return <AuthUI />
}

function AuthUI() {
  const router = useRouter()
  const [tab,      setTab]      = useState('signup')
  const [step,     setStep]     = useState('form')
  const [role,     setRole]     = useState('student')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')
  const bgRef = useRef(null)

  // Safe to read URL params here — client only
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'signin') setTab('signin')
  }, [])

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => { if (session) router.replace('/dashboard') })
      .catch(() => {})
  }, [])

  // WebGL background — fully try/caught so any GPU failure is silent
  useEffect(() => {
    const canvas = bgRef.current
    if (!canvas || canvas._init) return
    canvas._init = true
    try {
      const gl = canvas.getContext('webgl')
      if (!gl) return
      let running = true
      const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; gl.viewport(0,0,canvas.width,canvas.height) }
      resize(); window.addEventListener('resize', resize)
      const VS = `attribute vec2 aP;varying vec2 vU;void main(){vU=aP*.5+.5;gl_Position=vec4(aP,.999,1.);}`
      const FS = `precision highp float;uniform float uT;uniform vec2 uR;varying vec2 vU;vec2 h2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.545);}float n(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(dot(h2(i),f),dot(h2(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(h2(i+vec2(0,1)),f-vec2(0,1)),dot(h2(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}float fbm(vec2 p){float v=0.,a=.5;mat2 r=mat2(.8,-.6,.6,.8);for(int i=0;i<5;i++){v+=a*n(p);p=r*p*2.01;a*=.5;}return v;}void main(){vec2 uv=vU;float ar=uR.x/uR.y;uv.x*=ar;float t=uT*.05;vec2 q=vec2(fbm(uv*1.6+t),fbm(uv*1.6+vec2(5.2,1.3)+t*.8));vec2 r=vec2(fbm(uv*1.6+3.4*q+t*.6),fbm(uv*1.6+3.4*q+vec2(8.3,2.8)+t*.45));float f=fbm(uv*1.6+3.4*r+t*.3);f=clamp(f,0.,1.);vec3 col=mix(vec3(.010,.018,.10),vec3(.12,.022,.28),smoothstep(0.,.47,f));col=mix(col,vec3(.30,.06,.60),smoothstep(.27,.67,f));col=mix(col,vec3(.68,.12,.88),smoothstep(.51,.83,f));vec2 vig=vU-.5;col*=clamp(1.-dot(vig,vig)*1.8,.0,1.);col+=.01;gl_FragColor=vec4(col,1.);}`
      const mkS = (t,s) => { const sh = gl.createShader(t); gl.shaderSource(sh,s); gl.compileShader(sh); return sh }
      const prog = gl.createProgram()
      gl.attachShader(prog, mkS(gl.VERTEX_SHADER, VS))
      gl.attachShader(prog, mkS(gl.FRAGMENT_SHADER, FS))
      gl.linkProgram(prog)
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW)
      const uT=gl.getUniformLocation(prog,'uT'), uR=gl.getUniformLocation(prog,'uR'), aP=gl.getAttribLocation(prog,'aP')
      let t=0;(function draw(){if(!running)return;requestAnimationFrame(draw);t+=.01;gl.clearColor(.02,.03,.06,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(prog);gl.uniform1f(uT,t);gl.uniform2f(uR,canvas.width,canvas.height);gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(aP);gl.vertexAttribPointer(aP,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)})()
      return () => { running=false; window.removeEventListener('resize',resize) }
    } catch { /* silent — background is decorative */ }
  }, [])

  async function handleSignUp(e) {
    e.preventDefault(); setError(''); setLoading(true)
    if (!email.trim() || password.length < 6) { setError('Please enter a valid email and a password of at least 6 characters.'); setLoading(false); return }
    setLoading(false); setStep('role')
  }

  async function handleRoleConfirm() {
    setError(''); setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${location.origin}/dashboard`, data: { role } } })
      if (error) { setStep('form'); setError(error.message); setLoading(false); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) await supabase.from('profiles').upsert({ id: session.user.id, role }, { onConflict: 'id' })
      setSuccess('Check your email to confirm your account, then sign in.')
      setTab('signin'); setStep('form')
    } catch { setError('Something went wrong. Please try again.') }
    setLoading(false)
  }

  async function handleSignIn(e) {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) { setError(error.message); setLoading(false); return }
      router.replace('/dashboard')
    } catch { setError('Something went wrong. Please try again.'); setLoading(false) }
  }

  const isSignIn = tab === 'signin'
  const ROLES = [
    { id:'student', label:'Student', desc:'Flashcards, quizzes, Nova AI tutor, study guides', color:'#6366f1', bg:'rgba(99,102,241,0.12)', border:'rgba(99,102,241,0.35)', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> },
    { id:'teacher', label:'Teacher', desc:'Live quizzes, lesson plans, class rosters, assignments', color:'#f59e0b', bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.35)', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="1"/><path d="M8 21h8M12 17v4"/></svg> },
    { id:'parent', label:'Parent', desc:"Track your child's quiz scores and study activity", color:'#34d399', bg:'rgba(52,211,153,0.12)', border:'rgba(52,211,153,0.35)', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> },
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
        .auth-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
        .auth-logo-ring{position:relative;width:34px;height:34px}
        .auth-logo-spin{position:absolute;inset:-2px;border-radius:10px;background:conic-gradient(#3b82f6,#8b5cf6,#a78bfa,#3b82f6);animation:spin 3s linear infinite}
        .auth-logo-inner{position:absolute;inset:2px;border-radius:7px;background:#080b12;display:flex;align-items:center;justify-content:center}
        .auth-logo-word{font-size:17px;font-weight:800;color:#e2e8f0;letter-spacing:-.02em}
        @keyframes spin{100%{transform:rotate(360deg)}}
        .auth-nav-right{font-size:14px;color:rgba(255,255,255,0.45)}
        .auth-nav-right a{color:#818cf8;font-weight:600;text-decoration:none;margin-left:6px}
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
        .submit-btn{width:100%;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;box-shadow:0 4px 20px rgba(99,102,241,0.4);margin-top:4px}
        .submit-btn:hover{box-shadow:0 6px 28px rgba(99,102,241,0.6);transform:translateY(-1px)}
        .submit-btn:active{transform:scale(.98)}
        .submit-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .auth-error{background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:10px 14px;font-size:13px;color:#fca5a5;margin-bottom:16px}
        .auth-success{background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:10px 14px;font-size:13px;color:#6ee7b7;margin-bottom:16px}
        .auth-bottom{text-align:center;margin-top:20px;font-size:13px;color:rgba(255,255,255,0.35)}
        .auth-bottom a{color:#818cf8;font-weight:600;text-decoration:none;margin-left:4px}
        .trial-badge{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:16px;font-size:12px;color:rgba(255,255,255,0.25)}
        .trial-badge svg{width:12px;height:12px;fill:none;stroke:rgba(255,255,255,0.25);stroke-width:1.5;stroke-linecap:round}
      `}</style>

      <canvas id="auth-bg" ref={bgRef} />

      <div className="auth-wrap">
        <nav className="auth-nav">
          <a className="auth-logo" href="/">
            <div style={{ width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="34" height="34" viewBox="0 0 665.28 666.56" fill="none" style={{ display:'block' }}>
                <path d="M1282.19,1163.42c5.4-1.84,9.76-4.91,11.46-10.11.39-1.1.75-2.2,1-3.29.41-1.41.73-2.83,1-4.24l8.54-7.5c.4-.39.85-.78,1.26-1.17a69,69,0,0,0,12.74-16.22c20.33-35.15,14.68-87.65,9.89-107.88-4-16.7-14.83-41.7-44.22-53.18a56.64,56.64,0,0,0-12.73-53.73c-4,7.35-8.17,14.84-12.55,22.35l-1.72,3c-.65,1.11-1.31,2.22-2,3.33-1,1.67-2,3.34-3,5-.56.93-1.12,1.86-1.69,2.79q-4.76,7.85-9.77,15.76-5.74,9-11.82,18.19-7.35,11.13-15.24,22.36a3.46,3.46,0,0,0,.24.57q-3.17,4.67-6.41,9.34-1.29,1.88-2.61,3.75l-1.32,1.88a30.64,30.64,0,0,1,2.46,9.91,29.7,29.7,0,0,1-1.66,12.49,30.53,30.53,0,1,1-52.19-29.75c.63-.76,1.31-1.49,2-2.19l.54-.52c.54-.51,1.1-1,1.69-1.47.43-.35.87-.69,1.33-1l.46-.32c.41-.28.83-.56,1.25-.82.21-.14.43-.27.64-.39.43-.26.88-.5,1.32-.74A30.46,30.46,0,0,1,1173,996.2a35.71,35.71,0,0,1,5.07,0,834.66,834.66,0,0,0,57.07-92.83c.68-1.29,1.36-2.57,2-3.86s1.32-2.58,2-3.86,1.3-2.56,1.93-3.84c.32-.63.64-1.27,1-1.91q-3.3,6.69-6.86,13.49,10.65-18.81,19.51-36.85c.2-.4.39-.8.59-1.19l-.17-.31c1.85-3.76,3.67-7.51,5.41-11.22-.57-.39-1.18-.75-1.78-1.08h0c.9-2.13,1.73-4.25,2.6-6.38,29.66-74.69,31.41-135.15-1.83-163.67s-92.69-17.54-162,23.17c-8.19,4.79-16.58,10-25.06,15.71a161.76,161.76,0,0,1,36.61,13.56l4.2-2.5c57.4-33.71,103.94-45.15,126-26.24s17.85,66.57-6.77,128.47c-1.09,2.82-2.22,5.64-3.47,8.51-1.35-.1-2.7-.15-4.09-.12a101.17,101.17,0,0,0-19-30.16c-16.5-18.35-39.46-32.12-62.42-36.11a80,80,0,0,0-9-1.05l-3.1-.2-.76.41-5.16-3.69A203.56,203.56,0,0,0,1080.25,748a.21.21,0,0,1-.2-.07c-30.86-11.9-65.15-16.84-100.28-14.15a232.75,232.75,0,0,0-52.07,9.92q-7.34,2.31-14.4,5.11c-5.69-3-11.34-5.79-16.89-8.45-12.63-6.17-24.93-11.56-36.82-16.28-74.68-29.7-135.15-31.49-163.63,1.75-23.13,26.93-20.3,71.12,3.3,123.78a65.14,65.14,0,0,1,7.17-5.07,72.59,72.59,0,0,1,7.19-3.88c.92-2,1.91-4,3-6,1.72-3.34,3.61-6.58,5.63-9.78-14.15-35.29-16-63.12-2.54-78.68,18.83-22,66.58-17.81,128.43,6.77,7.31,2.88,14.85,6.07,22.48,9.57.82.37,1.68.78,2.51,1.15h0q17.63,8.1,36.17,18.15c45,24.33,93.53,56.94,142.14,96.32a30.09,30.09,0,0,1,7.91-1.68,30.55,30.55,0,1,1-28.15,32.78c0-.55-.07-1.11-.08-1.67a30.86,30.86,0,0,1,.4-5.56A799.8,799.8,0,0,0,864.62,791.79q-23.72-11.68-46.38-21a6.25,6.25,0,0,1-.89.27c-1.66.52-3.36,1.09-5,1.69-33.22,11.57-65.16,34.22-82.94,68.5-1.76,3.39-3.39,6.88-4.86,10.47a59.22,59.22,0,0,0-18.94,11.36c-1,.87-2.08,1.82-3.07,2.81A80.24,80.24,0,0,0,688,885.64a102.14,102.14,0,0,0-7.08,77.23c-8.69,9.74-14.2,26.8-13.52,43.94.81,21.37,11.29,38.83,29,48.73,4.48,27.48,20.38,46.32,45.53,55.08l.05,0c2.08.72,4.23,1.38,6.44,2,3.43.89,7,1.6,10.7,2.19h0a126.37,126.37,0,0,0,18.08,1.38h2.64l1.34,0,1.18,0,1.19,0c2.38-.09,4.8-.22,7.26-.41,2-.15,3.81-.33,5.5-.51l.81-.09.82-.11,1.31-.16.74-.1.89-.13.53-.08h0l.47-.07h0c2.48-.37,4.21-.7,5-.85-.07.3-.12.59-.18.88s-.15.76-.22,1.11a.59.59,0,0,1,0,.13c0,.2-.07.4-.11.6-.1.58-.2,1.12-.27,1.61,0,.17-.06.33-.08.48a.69.69,0,0,0,0,.13c0,.16,0,.32-.07.47a2.17,2.17,0,0,0,0,.25,2.34,2.34,0,0,0,0,.26.07.07,0,0,0,0,0l0,.2,0,.21c0,.09,0,.18,0,.27s0,.24-.05.34v0l0,.22a1.11,1.11,0,0,0,0,.17.13.13,0,0,0,0,.06s0,.08,0,.11v.1l-.15,1.49.16,1h0v.1l.1.51c5.91,31.75,44.65,56,92.37,60.94l1.42.13.72.07c3.66.32,7.36.53,11.11.61a793.86,793.86,0,0,0,66.78-55.5,32.47,32.47,0,0,1-.65-4.42,30.53,30.53,0,1,1,55.51,15.11c-.27.38-.55.76-.83,1.12a30.41,30.41,0,0,1-21.87,11.88,31.43,31.43,0,0,1-10.94-1.11q-13.94,12.64-27.66,24.2-6.42,5.4-12.78,10.55c-1.64,1.31-3.25,2.62-4.89,3.9q-5,3.95-9.95,7.77a582,582,0,0,1-58.74,40c-6.58,3.87-92.27,54-125.9,26.23-23.15-19.11-20.57-74.25,10.32-131.39q1.05-2,2.16-3.93c-1.54-.06-3.07-.15-4.58-.26-3.58-.26-7.07-.65-10.45-1.17a120,120,0,0,1-12.15-2.51q-4.89-1.29-9.44-3c-33.56,70.14-29.68,138.58,3.8,165.87,37.78,30.79,106.95,4.3,147.72-11.9a346,346,0,0,0,104.26-65.26c3.89-3.51,7.59-7,11.09-10.4a62.3,62.3,0,0,1,7,4.66,59.84,59.84,0,0,1,11,10.77c.34.42.66.84,1,1.27a24.85,24.85,0,0,1,2.55,4.32c1.12,2.21,2.92,5.64,6.28,11.72a362.13,362.13,0,0,0,38.24,55.54c5.68,6.3,14,15.38,24.51,23.59,12.13,9.5,27.16,17.83,44.36,19.35,5.35.48,8.92.11,11.29-2.21,8.9-8.7-5.81-38.19-20.1-62.25-1.36-2.29-2.72-4.53-4-6.7a39.29,39.29,0,0,1,12.69-7.76q1.46-.54,3-1c4.23-1.13,6.57-.59,11.23-1.26l15.23,6c3.5,1.12,6.94,2.16,10.34,3.09,57.11,16.35,102.47,12.72,126-14.71,22.4-26.12,14.56-68.06,7.39-93.9l-1.37,1.22-.09.36c-.35,1.22-.79,2.64-1.28,4.06-2,6.1-7.24,14.54-20.41,19a10.33,10.33,0,0,1-1,.32c4.39,21.09,2.45,37.8-6.86,48.65-11,12.85-31.88,16.71-59.62,12.85l-2.36-.35-3.6-.57-1.21-.22c-.45-.08-.89-.15-1.33-.24l-.93-.17-.2,0-1.42-.27c-1.29-.25-2.59-.52-3.91-.81l-1.55-.34-1.35-.3-1.92-.45c-1.17-.22-2.3-.53-3.43-.81l-2.07-.52-.93-.24-.18,0-.07,0-.09,0-.66-.18q-4.23-1.12-8.31-2.27l-2-.58q-5.07-1.43-9.94-2.91l-1.94-.6-1.68-.52-2.15-.68-1.9-.61-1.89-.62c-1.25-.41-2.5-.83-3.73-1.26l-.13,0c-.58-.19-1.15-.39-1.72-.6-1.23-.42-2.45-.86-3.66-1.3l-1.82-.67-2.24-.84-.37-.14L1147,1219l-.68-.27q-2.19-.85-4.35-1.75l-1.41-.59c-1.35-.57-2.7-1.15-4-1.74l-1-.46-1.19-.53-.15-.08-.83-.37-2.27-1.07-.73-.35-1-.47-1.08-.53-1.26-.62-1-.53-1-.51-.68-.36-2.27-1.19-1.09-.59-.19-.1h0l-1.18-.65-2.48-1.39-1.13-.65-.83-.48-.83-.49-1.65-1-.83-.51q-2.89-1.76-5.77-3.66c-.55-.36-1.1-.72-1.64-1.09h0l-1.59-1.08,0,0-1.54-1.06a.41.41,0,0,0-.11-.07l-1.48-1-.16-.12-1.44-1-1.59-1.16-1.59-1.19-1.6-1.22L1092,1188c-.57-.43-1.13-.88-1.7-1.33l-.78-.62-1.13-.91-.8-.65c-.53-.43-1.07-.87-1.6-1.32-.27-.22-.54-.44-.8-.67l-1.61-1.36c-.5-.42-1-.86-1.51-1.3q-1.66-1.44-3.33-2.93a422.77,422.77,0,0,0,144.4,39.61,34,34,0,0,0,36.5-50c2.41-.11,4.7-.21,6.87-.37A64.07,64.07,0,0,0,1282.19,1163.42ZM1243,888h0l-.18-.3.66-1.33c-.21.44-.43.88-.65,1.32ZM1253,866q-1.83,4.13-3.78,8.31c.85-1.87,1.7-3.73,2.52-5.57.42-.92.83-1.84,1.24-2.75.5-1.12,1-2.23,1.48-3.35q1.42-3.24,2.79-6.44Q1255.23,861,1253,866Z" transform="translate(-667.34 -666.76)" fill="#47f0df"/>
                <circle cx="341" cy="455.71" r="16.09" fill="#ffffff"/>
                <circle cx="395.32" cy="240.34" r="16.09" fill="#ffffff"/>
                <circle cx="508.68" cy="359.67" r="16.09" fill="#ffffff"/>
              </svg>
            </div>
            <span className="auth-logo-word">Flashfo</span>
          </a>
          <div className="auth-nav-right">
            {isSignIn ? <>New here? <a href="/auth">Sign up free</a></> : <>Already have an account? <a href="/auth?tab=signin">Sign in</a></>}
          </div>
        </nav>

        <div className="auth-main">
          <div className="auth-card">
            <div className="auth-tabs">
              <button className={`auth-tab${!isSignIn?' active':''}`} onClick={()=>{setTab('signup');setStep('form');setError('');setSuccess('')}}>Sign up</button>
              <button className={`auth-tab${isSignIn?' active':''}`}  onClick={()=>{setTab('signin');setStep('form');setError('');setSuccess('')}}>Sign in</button>
            </div>

            {!isSignIn && step==='role' ? (
              <>
                <div className="auth-title">I am signing up as a…</div>
                <div className="auth-sub" style={{marginBottom:20}}>Choose your account type. You can change this later.</div>
                {error && <div className="auth-error">{error}</div>}
                <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
                  {ROLES.map(r=>(
                    <div key={r.id} onClick={()=>setRole(r.id)} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:14,cursor:'pointer',transition:'all 0.15s',border:`1.5px solid ${role===r.id?r.border:'rgba(255,255,255,0.09)'}`,background:role===r.id?r.bg:'rgba(255,255,255,0.03)'}}>
                      <div style={{width:42,height:42,borderRadius:12,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s',background:role===r.id?r.bg:'rgba(255,255,255,0.06)',color:role===r.id?r.color:'rgba(255,255,255,0.35)'}}>{r.icon}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:15,fontWeight:700,marginBottom:2,color:role===r.id?'#e2e8f0':'rgba(255,255,255,0.65)'}}>{r.label}</div>
                        <div style={{fontSize:12,color:'rgba(255,255,255,0.3)',lineHeight:1.4}}>{r.desc}</div>
                      </div>
                      <div style={{width:18,height:18,borderRadius:'50%',flexShrink:0,transition:'all 0.15s',display:'flex',alignItems:'center',justifyContent:'center',border:`2px solid ${role===r.id?r.color:'rgba(255,255,255,0.2)'}`,background:role===r.id?r.color:'transparent'}}>
                        {role===r.id&&<svg width="9" height="9" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="submit-btn" onClick={handleRoleConfirm} disabled={loading}>{loading?'Creating account…':`Continue as ${ROLES.find(r=>r.id===role)?.label} →`}</button>
                <div style={{textAlign:'center',marginTop:14}}>
                  <button onClick={()=>setStep('form')} style={{background:'none',border:'none',color:'rgba(255,255,255,0.35)',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>← Back</button>
                </div>
              </>
            ) : (
              <>
                <div className="auth-title">{isSignIn?'Welcome back':'Create your account'}</div>
                <div className="auth-sub">{isSignIn?'Sign in to your Flashfo account.':"You're starting a 3-day free trial."}</div>
                {error   && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}
                <form onSubmit={isSignIn?handleSignIn:handleSignUp}>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required disabled={loading}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input className="form-input" type="password" placeholder={isSignIn?'••••••••':'Create a password'} value={password} onChange={e=>setPassword(e.target.value)} required disabled={loading} minLength={6}/>
                  </div>
                  {isSignIn&&<div className="forgot"><a href="/auth/reset">Forgot password?</a></div>}
                  <button className="submit-btn" type="submit" disabled={loading}>{loading?'Please wait...':isSignIn?'Sign in →':'Continue →'}</button>
                </form>
                <div className="auth-bottom">
                  {isSignIn?<>Don't have an account? <a href="/auth">Sign up free</a></>:<>Already have an account? <a href="/auth?tab=signin">Sign in</a></>}
                </div>
                {!isSignIn&&(
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
