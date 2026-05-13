'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function NavigationProgress() {
  const pathname   = usePathname()
  const prevPath   = useRef(pathname)
  const navigating = useRef(false)
  const timers     = useRef([])

  const [width,   setWidth]   = useState(0)
  const [visible, setVisible] = useState(false)
  const [done,    setDone]    = useState(false)

  function clearTimers() {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  function schedule(fn, delay) {
    const id = setTimeout(fn, delay)
    timers.current.push(id)
  }

  function start() {
    if (navigating.current) return
    navigating.current = true
    setDone(false)
    setVisible(true)
    setWidth(0)

    // Quick jump then slow crawl — never reaches 100 until navigation completes
    schedule(() => setWidth(15),  50)
    schedule(() => setWidth(40),  300)
    schedule(() => setWidth(60),  700)
    schedule(() => setWidth(75),  1200)
    schedule(() => setWidth(85),  2000)
    schedule(() => setWidth(90),  3500)
  }

  function complete() {
    clearTimers()
    navigating.current = false
    setDone(true)
    setWidth(100)
    // Short pause at 100%, then fade out
    schedule(() => {
      setVisible(false)
      schedule(() => { setWidth(0); setDone(false) }, 200)
    }, 250)
  }

  // Start on any internal link click
  useEffect(() => {
    function onClick(e) {
      const a = e.target.closest('a[href]')
      if (!a) return
      const href = a.getAttribute('href')
      // Skip external, hash, mailto, tel links
      if (!href || href.startsWith('http') || href.startsWith('//') ||
          href.startsWith('#') || href.startsWith('mailto') || href.startsWith('tel')) return
      // Skip if same page (hash navigation)
      const dest = href.split('?')[0].split('#')[0]
      if (dest === window.location.pathname) return
      start()
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // Complete when pathname changes
  useEffect(() => {
    if (prevPath.current === pathname) return
    prevPath.current = pathname
    if (navigating.current) complete()
  }, [pathname])

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [])

  if (!visible && width === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 2,
      zIndex: 9999,
      pointerEvents: 'none',
      opacity: visible ? 1 : 0,
      transition: visible ? 'none' : 'opacity 0.2s ease',
    }}>
      <div style={{
        height: '100%',
        width: `${width}%`,
        background: 'linear-gradient(to right, #6366f1, #8b5cf6, #a78bfa)',
        boxShadow: '0 0 10px rgba(139,92,246,0.7), 0 0 4px rgba(139,92,246,0.5)',
        borderRadius: '0 2px 2px 0',
        transition: done
          ? 'width 0.15s ease'      // snap to 100% fast
          : 'width 0.5s ease',      // crawl slowly
      }} />
    </div>
  )
}
