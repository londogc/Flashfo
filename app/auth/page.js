'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'reset'
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [loading, setLoading] = useState(false)
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
        if (data.user && !data.session) {
          setSuccess('Check your email to confirm your account, then sign in.')
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
    <div style={{ minHeight: '100dvh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: '#1d4ed8', borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <svg width="22" height="22" viewBox="0 0 14 14" fill="white"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Flashfo</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
          </div>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e8ecf0', padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Full Name</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor='#3b82f6'} onBlur={e => e.target.style.borderColor='#e2e8f0'}/>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" required style={inputStyle}
                onFocus={e => e.target.style.borderColor='#3b82f6'} onBlur={e => e.target.style.borderColor='#e2e8f0'}/>
            </div>

            {mode !== 'reset' && (
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Password</label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" required minLength={6} style={inputStyle}
                  onFocus={e => e.target.style.borderColor='#3b82f6'} onBlur={e => e.target.style.borderColor='#e2e8f0'}/>
              </div>
            )}

            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>{error}</div>}
            {success && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#16a34a' }}>{success}</div>}

            <button type="submit" disabled={loading} style={{
              height: 46, background: loading ? '#93c5fd' : '#1d4ed8', color: 'white',
              border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s', marginTop: 4,
            }}>
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset email'}
            </button>
          </form>

          {/* Mode switcher */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            {mode === 'signin' && <>
              <button onClick={() => { setMode('reset'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', fontSize: 13, color: '#64748b', cursor: 'pointer' }}>
                Forgot password?
              </button>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                No account?{' '}
                <button onClick={() => { setMode('signup'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', fontSize: 13, color: '#1d4ed8', fontWeight: 600, cursor: 'pointer' }}>
                  Sign up free
                </button>
              </div>
            </>}
            {mode === 'signup' && (
              <div style={{ fontSize: 13, color: '#64748b' }}>
                Already have an account?{' '}
                <button onClick={() => { setMode('signin'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', fontSize: 13, color: '#1d4ed8', fontWeight: 600, cursor: 'pointer' }}>
                  Sign in
                </button>
              </div>
            )}
            {mode === 'reset' && (
              <button onClick={() => { setMode('signin'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', fontSize: 13, color: '#1d4ed8', fontWeight: 600, cursor: 'pointer' }}>
                ← Back to sign in
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 20 }}>
          By signing up you agree to our Terms of Service.
        </p>
      </div>
    </div>
  )
}