import './globals.css'

export const metadata = {
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
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Critical inline CSS — applies before external CSS loads, prevents all flashes */}
        <style dangerouslySetInnerHTML={{ __html: `
          html { background-color: #f1f5f9; }
          html.dark { background-color: #0d1117; color-scheme: dark; }
          @media (max-width: 767px) {
            .ff-desktop-only { display: none !important; }
            .ff-mobile-only { display: flex !important; }
          }
          @media (min-width: 768px) {
            .ff-mobile-only { display: none !important; }
          }
          @media (min-width: 768px) and (max-width: 1099px) {
            aside.ff-desktop-only { width: 56px !important; min-width: 56px !important; max-width: 56px !important; overflow: hidden !important; }
          }
          .ff-content { padding-bottom: 0; }
          @media (max-width: 767px) { .ff-content { padding-bottom: 80px !important; } }
        `}}/>
        {/* Anti-flash script — sets dark class before first paint, sets bg-color directly */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('ff-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.style.backgroundColor='#0d1117';}}catch(e){}})()` }}/>
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
