import HeroCard from './HeroCard'
import FeatureCards from './FeatureCards'
import BottomPanels from './BottomPanels'
import HistoryBar from './HistoryBar'
import SmartSuggestions from './SmartSuggestions'
export default function Dashboard(){
  return(
    <div className="p-5 max-w-[1600px] mx-auto w-full">
      <HeroCard/>
      <FeatureCards/>
      <BottomPanels/>
      <HistoryBar/>
      <SmartSuggestions/>
    </div>
  )
}