'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// STEM page removed — Nova handles all STEM topics natively.
// Redirect to Nova.
export default function StemPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/ai-tutor') }, [router])
  return null
}
