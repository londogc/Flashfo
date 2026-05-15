// app/loading.js — root loading screen
// Pure dark background, nothing visible. Prevents text flash on initial load.
export default function Loading() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0d1117',
      zIndex: 9999,
    }}/>
  )
}
