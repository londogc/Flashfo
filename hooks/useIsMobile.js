import { useState, useLayoutEffect } from 'react'

/**
 * Returns true when window.innerWidth < breakpoint (default 768px).
 *
 * Uses useLayoutEffect (fires before paint) instead of useEffect (fires after)
 * to eliminate the one-frame flash of desktop layout on mobile refresh.
 *
 * SSR: always returns false on server (window doesn't exist). The
 * useLayoutEffect swap happens synchronously before the first browser paint
 * so the user never sees the desktop layout on mobile.
 *
 * TO REVERT to useEffect (if SSR hydration warnings appear):
 *   replace useLayoutEffect with useEffect below — single word change.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)

  useLayoutEffect(() => {
    function check() { setIsMobile(window.innerWidth < breakpoint) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])

  return isMobile
}
