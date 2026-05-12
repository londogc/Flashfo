import { useState, useEffect } from 'react'

/**
 * Returns true when window.innerWidth < breakpoint (default 768px).
 * Safe for SSR - always false on first render, hydrates correctly.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < breakpoint)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])

  return isMobile
}
