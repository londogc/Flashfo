'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function PageTransition({ children }) {
  const ref = useRef(null)
  const pathname = usePathname()

  useEffect(() => {
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
    <div ref={ref} style={{ opacity: 0, transform: 'translateY(12px)', willChange: 'opacity, transform' }}>
      {children}
    </div>
  )
}
