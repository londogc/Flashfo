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
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 665.28 666.56'><path d='M1282.19,1163.42c5.4-1.84,9.76-4.91,11.46-10.11c.39-1.1.75-2.2,1-3.29c.41-1.41.73-2.83,1-4.24l8.54-7.5c.4-.39.85-.78,1.26-1.17a69,69,0,0,0,12.74-16.22c20.33-35.15,14.68-87.65,9.89-107.88-4-16.7-14.83-41.7-44.22-53.18a56.64,56.64,0,0,0-12.73-53.73c-4,7.35-8.17,14.84-12.55,22.35l-1.72,3c-.65,1.11-1.31,2.22-2,3.33-1,1.67-2,3.34-3,5-.56.93-1.12,1.86-1.69,2.79q-4.76,7.85-9.77,15.76-5.74,9-11.82,18.19-7.35,11.13-15.24,22.36a3.46,3.46,0,0,0,.24.57q-3.17,4.67-6.41,9.34-1.29,1.88-2.61,3.75l-1.32,1.88a30.64,30.64,0,0,1,2.46,9.91,29.7,29.7,0,0,1-1.66,12.49,30.53,30.53,0,1,1-52.19-29.75c.63-.76,1.31-1.49,2-2.19l.54-.52c.54-.51,1.1-1,1.69-1.47c.43-.35.87-.69,1.33-1l.46-.32c.41-.28.83-.56,1.25-.82c.21-.14.43-.27.64-.39c.43-.26.88-.5,1.32-.74A30.46,30.46,0,0,1,1173,996.2a35.71,35.71,0,0,1,5.07,0,834.66,834.66,0,0,0,57.07-92.83c.68-1.29,1.36-2.57,2-3.86s1.32-2.58,2-3.86c1.3-2.56,1.93-3.84c.32-.63.64-1.27,1-1.91q-3.3,6.69-6.86,13.49,10.65-18.81,19.51-36.85c.2-.4.39-.8.59-1.19l-.17-.31c1.85-3.76,3.67-7.51,5.41-11.22-.57-.39-1.18-.75-1.78-1.08h0c.9-2.13,1.73-4.25,2.6-6.38,29.66-74.69,31.41-135.15-1.83-163.67s-92.69-17.54-162,23.17c-8.19,4.79-16.58,10-25.06,15.71a161.76,161.76,0,0,1,36.61,13.56l4.2-2.5c57.4-33.71,103.94-45.15,126-26.24s17.85,66.57-6.77,128.47c-1.09,2.82-2.22,5.64-3.47,8.51-1.35-.1-2.7-.15-4.09-.12a101.17,101.17,0,0,0-19-30.16c-16.5-18.35-39.46-32.12-62.42-36.11a80,80,0,0,0-9-1.05l-3.1-.2-.76.41-5.16-3.69A203.56,203.56,0,0,0,1080.25,748c-30.86-11.9-65.15-16.84-100.28-14.15a232.75,232.75,0,0,0-52.07,9.92q-7.34,2.31-14.4,5.11c-5.69-3-11.34-5.79-16.89-8.45-12.63-6.17-24.93-11.56-36.82-16.28-74.68-29.7-135.15-31.49-163.63,1.75-23.13,26.93-20.3,71.12,3.3,123.78a65.14,65.14,0,0,1,7.17-5.07,72.59,72.59,0,0,1,7.19-3.88c.92-2,1.91-4,3-6,1.72-3.34,3.61-6.58,5.63-9.78-14.15-35.29-16-63.12-2.54-78.68,18.83-22,66.58-17.81,128.43,6.77c57.11,16.35,102.47,12.72,126-14.71,22.4-26.12,14.56-68.06,7.39-93.9A64.07,64.07,0,0,0,1282.19,1163.42Z' transform='translate(-667.34 -666.76)' fill='%2347f0df'/><circle cx='341' cy='455.71' r='16.09' fill='white'/><circle cx='395.32' cy='240.34' r='16.09' fill='white'/><circle cx='508.68' cy='359.67' r='16.09' fill='white'/></svg>",
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
