// app/(app)/loading.js — app route group loading screen
// Shows while any app page is loading during client-side navigation.
// Keeps the Shell visible (Shell renders from layout, not page)
// so only the content area shows this — no full-screen flash.
export default function AppLoading() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
      width: '100%',
    }}>
      <div style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'rgba(139,92,246,0.7)',
        animation: 'nova-pulse 0.9s ease-in-out infinite',
      }}/>
    </div>
  )
}
