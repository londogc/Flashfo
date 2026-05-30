import './globals.css'
import PageTransition from '@/components/PageTransition'
import NavigationProgress from '@/components/NavigationProgress'
import HydrationReveal from '@/components/HydrationReveal'

export const metadata = {
  // PRE-LAUNCH: Remove robots line on June 1st before deploying
  robots: 'noindex, nofollow',
  title: 'Flashfo — AI Study & Teaching Workspace',
  description: 'AI-powered study and teaching tools in one calm workspace.',
  icons: {
    icon: "/favicon.svg",
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
          Two jobs in one script:
          1. Theme detection — sets bg color before paint to prevent dark/light flash
          2. Opacity hide — sets html opacity to 0 immediately so no raw text
             ever appears. HydrationReveal (below) sets it back to 1 once
             React has mounted and all CSS is active, producing a clean fade-in.

          suppressHydrationWarning silences React #425 on this element.
        */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t  = localStorage.getItem('ff-theme');
              var d  = t !== 'light';
              var bg = d ? '#0d1117' : '#f1f5f9';
              document.documentElement.style.background      = bg;
              document.documentElement.style.backgroundColor = bg;
              if (d) document.documentElement.classList.add('dark');
              else   document.documentElement.classList.remove('dark');
            } catch(e) {
              document.documentElement.classList.add('dark');
            }
            // Hide until React mounts — prevents raw text/unstyled flash
            document.documentElement.style.opacity = '0';
          })()
        `}} />
      </head>
      <body suppressHydrationWarning>
        {/* Reveals the page once hydration is complete */}
        <HydrationReveal />
        <NavigationProgress />
        <PageTransition>
          {children}
        </PageTransition>
      </body>
    </html>
  )
}
