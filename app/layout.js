import './globals.css'
import Shell from '@/components/Shell'

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
    <html lang="en">
      <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('ff-theme');if(t==='dark')document.documentElement.classList.add('dark');else if(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark');}catch(e){}})()` }}/>
      <body>
        {children}
      </body>
    </html>
  )
}