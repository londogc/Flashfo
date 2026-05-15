import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d1117',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: '24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'linear-gradient(135deg, #1d4ed8, #4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 0 32px rgba(99,102,241,0.3)',
        }}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <polygon points="16,4 7,18 16,18 14,28 25,14 16,14" fill="white"/>
          </svg>
        </div>

        <div style={{
          fontSize: 72, fontWeight: 800, color: 'rgba(255,255,255,0.06)',
          letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 8,
        }}>
          404
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e6edf3', marginBottom: 8 }}>
          Page not found
        </h1>
        <p style={{ fontSize: 14, color: '#8b949e', lineHeight: 1.6, marginBottom: 28 }}>
          This page doesn't exist or has been moved. Head back to the dashboard to keep studying.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/dashboard"
            style={{
              padding: '10px 24px', borderRadius: 10,
              background: '#2563eb', color: '#fff',
              fontWeight: 600, fontSize: 14, textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Go to dashboard
          </Link>
          <Link
            href="/"
            style={{
              padding: '10px 24px', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', color: '#8b949e',
              border: '1px solid rgba(255,255,255,0.1)',
              fontWeight: 600, fontSize: 14, textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
