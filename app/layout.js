import './globals.css'
import Shell from '@/components/Shell'

export const metadata = {
  title: 'Flashfo — AI Study & Teaching Workspace',
  description: 'AI-powered study and teaching tools in one calm workspace.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}