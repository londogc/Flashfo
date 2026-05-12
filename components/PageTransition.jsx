'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function PageTransition({ children }) {
  const ref = useRef(null)
  const pathname = usePathname()

  useEffect(() => {
    // Skip animation on mobile — position:fixed children in MobileShell
    // get trapped in stacking contexts created by opacity/transform.
    if (typeof window !== 'undefined' && window.innerWidth < 768) return

    const el = ref.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(12px)'
    el.style.transition = 'none'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.22s ease, transform 0.22s ease'
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      })
    })
  }, [pathname])

  return (
    <div ref={ref} style={{ opacity: 1 }}>
      {children}
    </div>
  )
}
