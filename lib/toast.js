'use client'
import { createContext, useContext, useState, useCallback } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((msg, type = 'default') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const colors = {
    default: { bg: 'var(--c-surface)', border: 'var(--c-line)', text: 'var(--c-t1)' },
    success: { bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)', text: '#34d399' },
    error:   { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', text: '#ef4444' },
    nova:    { bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)', text: '#a78bfa' },
  }

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:500, display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end', pointerEvents:'none' }}>
        {toasts.map(t => {
          const c = colors[t.type] || colors.default
          return (
            <div key={t.id} style={{
              background: c.bg, border: '1px solid ' + c.border, color: c.text,
              padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
              maxWidth: 320, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              animation: 'toast-in 0.25s ease',
              fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
            }}>
              {t.msg}
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes toast-in { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </ToastCtx.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}
