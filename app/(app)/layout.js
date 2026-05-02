'use client'
import Shell from '@/components/Shell'
import { usePathname } from 'next/navigation'

export default function AppLayout({ children }) {
  const pathname = usePathname()
  if (pathname === '/pricing') return <>{children}</>
  return <Shell>{children}</Shell>
}