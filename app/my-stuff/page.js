export default function MyStuffPage(){
  return(
    <div className="p-6 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">My Stuff</h1>
      <p className="text-sm text-t2 mb-6">All your saved work, folders, decks, and recent activity in one place.</p>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {['Folders','Saved Decks','Recent History'].map(label=>(
          <div key={label} className="bg-surface border border-line rounded-xl p-5 text-center">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl mx-auto mb-3"/>
            <div className="text-[13px] font-bold text-t1">{label}</div>
            <div className="text-[11px] text-t3 mt-1">Nothing saved yet</div>
          </div>
        ))}
      </div>
      <div className="bg-surface border border-line rounded-xl p-6 text-center">
        <p className="text-sm text-t2 mb-4">Start creating to build your personal library of study materials.</p>
        <a href="/create" className="inline-flex h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors items-center">Start creating →</a>
      </div>
    </div>
  )
}