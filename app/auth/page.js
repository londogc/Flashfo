'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function AuthPageInner() {
  const [mode, setMode] = useState('signin')
  // Read ?mode=signup from URL on first load
  useEffect(() => {
    const m = searchParams.get('mode')
    if (m === 'signup' || m === 'signin' || m === 'reset') setMode(m)
  }, []) // 'signin' | 'signup' | 'reset'
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Handle email confirmation redirect — Supabase sends back tokens in the URL hash
    const handleAuthRedirect = async () => {
      // Check for error in URL params first
      const errorCode = searchParams.get('error_code')
      const errorDesc = searchParams.get('error_description')
      if (errorCode) { setError(decodeURIComponent(errorDesc || 'Authentication error')); return }

      // Handle hash-based tokens (email confirmation, magic link)
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        setLoading(true)
        try {
          // Supabase automatically processes the hash and sets the session
          const { data, error: sessionError } = await supabase.auth.getSession()
          if (sessionError) throw sessionError
          if (data.session) { router.push('/'); return }
          // If no session yet, give it a moment (supabase processes the hash async)
          await new Promise(r => setTimeout(r, 800))
          const { data: data2 } = await supabase.auth.getSession()
          if (data2.session) router.push('/')
          else setError('Email confirmed! Please sign in.')
        } catch(e) { setError('Confirmation failed. Please try signing in.') }
        finally { setLoading(false) }
        return
      }

      // Check for PKCE code flow (newer Supabase versions)
      const code = searchParams.get('code')
      if (code) {
        setLoading(true)
        try {
          const { error: exchError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchError) throw exchError
          router.push('/')
        } catch(e) { setError('Sign in failed. Please try again.') }
        finally { setLoading(false) }
      }
    }
    handleAuthRedirect()
  }, [])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
        if (error) throw error
        router.push('/')
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: form.email, password: form.password,
          options: { data: { full_name: form.name } }
        })
        if (error) throw error
        if (data.session) {
          // Email confirmation disabled — user is signed in immediately
          router.push('/dashboard')
        } else if (data.user && !data.session) {
          // Email confirmation enabled — guide them to sign in after confirming
          setSuccess('Account created! Check your email to confirm, then sign in below.')
          setMode('signin')
        } else {
          router.push('/')
        }
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: window.location.origin + '/auth/update-password'
        })
        if (error) throw error
        setSuccess('Password reset email sent. Check your inbox.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', height: 44, padding: '0 14px',
    background: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: 12, fontSize: 14, color: '#0f172a',
    outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight:'100dvh', background:'#080c14', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 16px', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style dangerouslySetInnerHTML={{__html:'@keyframes auth-spin{to{transform:rotate(360deg)}}@keyframes auth-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes auth-fadein{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.auth-input:focus{border-color:#3b82f6!important;outline:none}@media(prefers-reduced-motion:reduce){*{animation:none!important}}'}}/>

      <div style={{ width:'100%', maxWidth:420, animation:'auth-fadein 0.4s ease both' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ position:'relative', width:60, height:60, margin:'0 auto 14px' }}>
            <div style={{ position:'absolute', inset:-4, borderRadius:19, background:'conic-gradient(#3b82f6,#8b5cf6,#a78bfa,#3b82f6)', animation:'auth-spin 3s linear infinite' }}/>
            <div style={{ position:'absolute', inset:3, background:'#0d1117', borderRadius:15, display:'flex', alignItems:'center', justifyContent:'center', animation:'auth-float 3s ease-in-out infinite' }}>
              <svg width="24" height="24" viewBox="0 0 14 14" fill="#3b82f6"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
            </div>
          </div>
          <div style={{ fontSize:22, fontWeight:800, color:'#e6edf3', letterSpacing:'-0.02em', marginBottom:3 }}>Flashfo</div>
          <div style={{ fontSize:13, color:'#8b949e' }}>
            {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
          </div>
        </div>

        {/* Card */}
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:16, padding:'28px 26px' }}>

          {/* Mode switcher — only on signin/signup */}
          {mode !== 'reset' && (
            <div style={{ display:'flex', background:'#0d1117', borderRadius:10, padding:3, marginBottom:22 }}>
              {['signin','signup'].map(m => (
                <button key={m} onClick={()=>{ setMode(m); setError(''); setSuccess(''); }}
                  style={{ flex:1, height:34, borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, transition:'all 0.15s',
                    background: mode===m ? '#21262d' : 'transparent',
                    color: mode===m ? '#e6edf3' : '#8b949e' }}>
                  {m === 'signin' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={e=>{e.preventDefault();handleSubmit(e)}}>

            {/* Name field — signup only */}
            {mode === 'signup' && (
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#484f58', letterSpacing:'0.08em', display:'block', marginBottom:5 }}>FULL NAME</label>
                <input className="auth-input" type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                  placeholder="Your name" required
                  style={{ width:'100%', height:42, background:'#0d1117', border:'1px solid #30363d', borderRadius:9, padding:'0 13px', color:'#e6edf3', fontSize:14, transition:'border-color 0.15s' }}/>
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:10, fontWeight:700, color:'#484f58', letterSpacing:'0.08em', display:'block', marginBottom:5 }}>EMAIL</label>
              <input className="auth-input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                placeholder="you@example.com" required
                style={{ width:'100%', height:42, background:'#0d1117', border:'1px solid #30363d', borderRadius:9, padding:'0 13px', color:'#e6edf3', fontSize:14, transition:'border-color 0.15s' }}/>
            </div>

            {/* Password — not on reset */}
            {mode !== 'reset' && (
              <div style={{ marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:'#484f58', letterSpacing:'0.08em' }}>PASSWORD</label>
                  {mode === 'signin' && (
                    <button type="button" onClick={()=>{ setMode('reset'); setError(''); setSuccess(''); }}
                      style={{ fontSize:11, color:'#8b949e', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <input className="auth-input" type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                  placeholder="••••••••" required minLength={6}
                  style={{ width:'100%', height:42, background:'#0d1117', border:'1px solid #30363d', borderRadius:9, padding:'0 13px', color:'#e6edf3', fontSize:14, transition:'border-color 0.15s' }}/>
              </div>
            )}

            {/* Error / success */}
            {error && (
              <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:9, padding:'10px 13px', marginBottom:14, fontSize:13, color:'#f87171' }}>{error}</div>
            )}
            {success && (
              <div style={{ background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.25)', borderRadius:9, padding:'10px 13px', marginBottom:14, fontSize:13, color:'#34d399' }}>{success}</div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{ width:'100%', height:44, borderRadius:10, border:'none', cursor:loading?'not-allowed':'pointer', fontSize:15, fontWeight:700, color:'#fff', letterSpacing:'-0.01em', opacity:loading?0.6:1, transition:'opacity 0.15s',
                background:'linear-gradient(90deg,#2563eb,#7c3aed)' }}>
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in →' : mode === 'signup' ? 'Create account →' : 'Send reset link →'}
            </button>

          </form>

          {/* Reset back link */}
          {mode === 'reset' && (
            <button onClick={()=>{ setMode('signin'); setError(''); setSuccess(''); }}
              style={{ width:'100%', marginTop:12, background:'none', border:'none', color:'#8b949e', fontSize:12, cursor:'pointer' }}>
              ← Back to sign in
            </button>
          )}
        </div>

        {/* Footer */}
        <p style={{ textAlign:'center', fontSize:12, color:'#484f58', marginTop:20 }}>
          By signing up you agree to our{' '}
          <a href="/terms" style={{ color:'#8b949e', textDecoration:'none' }}>Terms of Service</a>
        </p>
      </div>
    </div>
  )
}


export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{width:24,height:24,border:'2px solid #3b82f6',borderTopColor:'transparent',borderRadius:'50%',display:'inline-block',animation:'spin 0.8s linear infinite'}}/></div>}>
      <AuthPageInner />
    </Suspense>
  )
}
