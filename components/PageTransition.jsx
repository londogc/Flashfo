'use client'
import { useRef } from 'react'
import { useLayoutEffect, useEffect } from 'react'
import { usePathname } from 'next/navigation'

// On mobile: this component does nothing — MobileShell fades only its content
// area (not the Aurora or tab bar), so the chrome always stays visible.
//
// On desktop: fade + subtle lift on every navigation.
//
// useLayoutEffect fires before the browser paints, so opacity:0 is set before
// the new content is ever visible — eliminating the hard-cut frame.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

export default function PageTransition({ children }) {
  const ref         = useRef(null)
  const pathname    = usePathname()
  const firstRender = useRef(true)

  useIsomorphicLayoutEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    if (window.innerWidth < 768) return   // mobile: MobileShell owns its transition

    const el = ref.current
    if (!el) return

    el.style.transition = 'none'
    el.style.opacity    = '0'
    el.style.transform  = 'translateY(5px)'

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.2s ease, transform 0.2s ease'
        el.style.opacity    = '1'
        el.style.transform  = 'translateY(0)'
      })
    })
  }, [pathname])

  return (
    <div ref={ref} style={{ opacity: 1 }}>
      {children}
    </div>
  )
}
