'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

// PageTransition — animates the page content area on every route change.
// Uses the Web Animations API (supported in all modern browsers, no deps).
// Falls back gracefully to instant render if unavailable.
//
// The wrapper div uses `display: contents` so it has zero layout impact —
// it doesn't break Shell's flex/grid or any other layout structure.
// The animation targets the first real child element instead.

export default function PageTransition({ children }) {
  const pathname  = usePathname()
  const ref       = useRef(null)
  const isFirst   = useRef(true)

  useEffect(() => {
    // Skip the very first render — no need to animate in on cold load,
    // the loading.js screen already handled that.
    if (isFirst.current) {
      isFirst.current = false
      return
    }

    const el = ref.current
    if (!el || typeof el.animate !== 'function') return

    // Cancel any in-progress animation first
    el.getAnimations?.().forEach(a => a.cancel())

    el.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)'   },
      ],
      {
        duration: 300,
        easing:   'cubic-bezier(0.4, 0, 0.2, 1)', // material ease-in-out
        fill:     'both',
      }
    )
  }, [pathname])

  return (
    // display:contents makes this div invisible to layout engines
    <div ref={ref} style={{ display: 'contents' }}>
      {children}
    </div>
  )
}
