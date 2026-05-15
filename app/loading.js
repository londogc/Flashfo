// app/loading.js — root loading screen
// Shows while the landing page or root layout is hydrating.
// Replaces the plain dark div that was there before.
export default function Loading() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0d1117',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Flashfo bolt logo */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        animation: 'ff-load-breathe 1.4s ease-in-out infinite',
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #1d4ed8, #4f46e5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 32px rgba(99,102,241,0.35)',
        }}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <polygon points="16,4 7,18 16,18 14,28 25,14 16,14" fill="white"/>
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes ff-load-breathe {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(0.94); }
        }
      `}</style>
    </div>
  )
}
