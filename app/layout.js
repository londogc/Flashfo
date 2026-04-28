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
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('ff-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches);var bg=d?'#0d1117':'#f1f5f9';document.documentElement.style.background=bg;document.documentElement.style.backgroundColor=bg;if(d)document.documentElement.classList.add('dark');}catch(e){}})()`}}/>
        <style dangerouslySetInnerHTML={{ __html: `
          *,*::before,*::after{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
          html,body{margin:0;padding:0;min-height:100%}
          html.dark,html.dark body{background-color:#0d1117!important;color-scheme:dark}
          html:not(.dark),html:not(.dark) body{background-color:#f1f5f9!important;color-scheme:light}
          .ff-desktop-only{display:flex!important}
          @media(max-width:767px){.ff-desktop-only{display:none!important}aside{display:none!important}}
          .ff-mobile-only{display:none!important}
          @media(max-width:767px){.ff-mobile-only{display:block!important}}
          .ff-mobile-block{display:none!important}
          @media(max-width:767px){.ff-mobile-block{display:flex!important}}
          .ff-mid-mobile-only{display:none!important}
          @media(max-width:1099px){.ff-mid-mobile-only{display:flex!important}}
          @media(min-width:768px)and(max-width:1099px){aside.ff-desktop-only{width:56px!important;min-width:56px!important;max-width:56px!important;overflow:hidden!important}.ff-desktop-dark-toggle{display:none!important}}
          @media(max-width:767px){.ff-content{padding-bottom:80px!important}}
        `}}/>
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}