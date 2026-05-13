'use client'
// PageTransition is now a pure passthrough.
//
// Both Shell (desktop) and MobileShell (mobile) fade their own content area
// div using useLayoutEffect on pathname change — this scopes the transition
// to just the page content, so the sidebar, topbar, Aurora, and tab bar all
// stay fully visible during navigation. No more full-screen black flash.
//
// NavigationProgress (in root layout) handles the progress bar independently.
export default function PageTransition({ children }) {
  return <>{children}</>
}
