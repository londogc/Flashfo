import './globals.css'
import PageTransition from '@/components/PageTransition'

export const metadata = {
  // PRE-LAUNCH: Remove robots line on June 1st before deploying
  robots: 'noindex, nofollow',
  title: 'Flashfo — AI Study & Teaching Workspace',
  description: 'AI-powered study and teaching tools in one calm workspace.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%231d4ed8'/><polygon points='16 4 7 18 16 18 14 28 25 14 16 14' fill='white'/></svg>",
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: 'resizes-visual',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Theme detection script — runs before React hydrates to prevent dark/light flash.
          suppressHydrationWarning silences React #425 on this element (the script tag's
          text content is set by the server but React doesn't need to match it exactly).

          The <style dangerouslySetInnerHTML> that used to be here was REMOVED because:
          - Every rule in it is already in globals.css (ff-desktop-only, ff-mobile-only,
            skeleton shimmer, html/body resets, etc.)
          - Having it here AND in globals.css caused React hydration error #425
            ("Text content does not match server-rendered HTML") on every page load,
            which React recovered from on desktop but CRASHED on mobile iOS.
        */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ff-theme');var d=t!=='light';var bg=d?'#0d1117':'#f1f5f9';document.documentElement.style.background=bg;document.documentElement.style.backgroundColor=bg;if(d)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){document.documentElement.classList.add('dark');}})()`
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <PageTransition>
          {children}
        </PageTransition>
      </body>
    </html>
  )
}
