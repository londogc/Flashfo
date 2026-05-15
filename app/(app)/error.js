'use client'
import { useEffect } from 'react'

// This error boundary is scoped to the (app) route group.
// The Shell (sidebar + topbar) stays visible — only the content area shows this.
export default function AppError({ error, reset }) {
  useEffect(() => {
    console.error('[Flashfo app error]', error)
  }, [error])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: '24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{
          fontSize: 32, marginBottom: 16, opacity: 0.3,
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 20 }}>
          This page hit an unexpected error. Try refreshing or navigating to another page.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              padding: '8px 20px', borderRadius: 9,
              background: '#2563eb', color: '#fff',
              border: 'none', fontWeight: 600, fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Try again
          </button>
          <a href="/dashboard" style={{
            padding: '8px 20px', borderRadius: 9,
            background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            fontWeight: 600, fontSize: 13, textDecoration: 'none',
          }}>
            Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
