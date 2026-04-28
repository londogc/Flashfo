export default function Loading() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--c-bg, #0d1117)',
      zIndex: 9999
    }}/>
  )
}