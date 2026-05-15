'use client'
import { useEffect } from 'react'

// HydrationReveal — runs once React has mounted and all CSS/fonts are applied.
// Counterpart to the opacity:0 set in the layout.js inline script.
// By the time useEffect fires, styles are guaranteed to be active,
// so the page fades in cleanly with no text flash.
export default function HydrationReveal() {
  useEffect(() => {
    document.documentElement.style.opacity = '1'
  }, [])
  return null
}
