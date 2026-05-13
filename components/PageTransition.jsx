'use client'
import { useRef } from 'react'
import { useLayoutEffect, useEffect } from 'react'
import { usePathname } from 'next/navigation'

// useLayoutEffect fires synchronously after React commits but BEFORE the browser
// paints — so setting opacity:0 here means the new content is never shown at
// full opacity before the transition starts. useEffect (the old approach) fired
// AFTER paint, causing one painted frame of the new content = the hard switch.
//
// Fall back to useEffect on the server (SSR) where layout effects don't run.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

export default function PageTransition({ children }) {
  const ref = useRef(null)
  const pathname = usePathname()
  const firstRender = useRef(true)

  useIsomorphicLayoutEffect(() => {
    // Skip animation on initial mount — page should appear instantly on load.
    if (firstRender.current) {
      firstRender.current = false
      return
    }

    const el = ref.current
    if (!el) return

    const mobile = window.innerWidth < 768

    // Set BEFORE browser paints so the new content is never seen mid-swap.
    el.style.transition = 'none'
    el.style.opacity = '0'
    if (!mobile) {
      // Desktop: subtle lift. Kept small (5px) so it reads as a breath, not a jump.
      el.style.transform = 'translateY(5px)'
    }

    // Two rAFs: first lets React flush any pending style recalcs,
    // second actually triggers the transition in the new frame.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = mobile
          ? 'opacity 0.16s ease'                            // mobile: fade only — no movement, feels native
          : 'opacity 0.2s ease, transform 0.2s ease'        // desktop: fade + lift
        el.style.opacity = '1'
        if (!mobile) el.style.transform = 'translateY(0)'
      })
    })
  }, [pathname])

  return (
    <div ref={ref} style={{ opacity: 1 }}>
      {children}
    </div>
  )
}
