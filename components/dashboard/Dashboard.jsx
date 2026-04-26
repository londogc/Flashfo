'use client'
import { useEffect, useState } from 'react'
import HeroCard from './HeroCard'
import FeatureCards from './FeatureCards'
import BottomPanels from './BottomPanels'
import HistoryBar from './HistoryBar'
import SmartSuggestions from './SmartSuggestions'

export default function Dashboard() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div style={{
      padding: mobile ? '16px 12px' : '20px',
      maxWidth: 1600, margin: '0 auto', width: '100%',
    }}>
      <HeroCard />
      <FeatureCards />
      <BottomPanels />
      <HistoryBar />
      <SmartSuggestions />
    </div>
  )
}