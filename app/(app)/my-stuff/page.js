'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { getUserItems, deleteItem, updateSavedItem } from '@/lib/savedItems'

const TYPE_META = {
  quiz:        { label:'Quizzes',         color:'bg-blue-500/10 text-blue-500',    btn:'Take Quiz',   key:'flashfo_load_quiz',        href:'/quiz' },
  flashcards:  { label:'Flashcard Decks', color:'bg-violet-500/10 text-violet-500',btn:'Study',       key:'flashfo_load_flashcards',  href:'/flashcards' },
  lesson_plan: { label:'Lesson Plans',    color:'bg-amber-500/10 text-amber-500',  btn:'Open',        key:'flashfo_load_lesson_plan', href:'/lesson-builder' },
  study_guide: { label:'Study Guides',    color:'bg-emerald-500/10 text-emerald-400', btn:'Open',     key:'flashfo_load_study_guide', href:'/study-guide' },
  summary:     { label:'Summaries',       color:'bg-teal-500/10 text-teal-500',    btn:'Open',        key:'flashfo_load_summary',     href:'/summarize' },
  conversation:{ label:'Nova Chats',       color:'bg-purple-500/10 text-purple-400',btn:'Open in Nova', key:'flashfo_nova_history',     href:'/ai-tutor' },
}

const TYPE_ICONS = {
  quiz:        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>,
  flashcards:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
  lesson_plan: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>,
  study_guide: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  summary:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
}

const BTN_COLORS = {
  quiz:        'bg-blue-700 hover:bg-blue-800 text-white',
  flashcards:  'bg-violet-600 hover:bg-violet-700 text-white',
  lesson_plan: 'bg-amber-600 hover:bg-amber-700 text-white',
  study_guide: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  summary:     'bg-teal-600 hover:bg-teal-700 text-white',
  conversation:'bg-purple-600 hover:bg-purple-700 text-white',
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff/60000), h = Math.floor(m/60), d = Math.floor(h/24)
  if (d>0) return d+'d ago'
  if (h>0) return h+'h ago'
  if (m>0) return m+'m ago'
  return 'just now'
}

function openItem(item) {
  const meta = TYPE_META[item.type]
  if (!meta) return
  if (item.type === 'conversation') {
    const msgs = item.data?.messages || []
    sessionStorage.setItem('flashfo_nova_history', JSON.stringify(msgs))
    window.location.href = '/ai-tutor'
    return
  }
  sessionStorage.setItem(meta.key, JSON.stringify({ id: item.id, ...item.data }))
  window.location.href = meta.href
}

export default function MyStuffPage() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')

  useEffect(()=>{
    if (!authLoading) {
      if (user) loadItems()
      else setLoading(false)
    }
  },[user,authLoading])

  async function loadItems() {
    setLoading(true)
    try {
      const data = await getUserItems(user.id)
      setItems(data)
    } catch(e) { setError('Error: ' + (e.message || e.code || JSON.stringify(e))) }
    finally { setLoading(false) }
  }

  async function doDelete(id) {
    setDeleting(id)
    try {
      await deleteItem(id)
      setItems(i=>i.filter(x=>x.id!==id))
      if (expanded===id) setExpanded(null)
    } catch(e) { alert('Delete failed: '+e.message) }
    finally { setDeleting(null) }
  }

  const allTypes = Object.keys(TYPE_META)
  const filtered = filter==='all' ? items : items.filter(i=>i.type===filter)
  const counts = items.reduce((acc,i)=>({...acc,[i.type]:(acc[i.type]||0)+1}),{})

  if (!authLoading && !user) return (
    <div className="p-6 max-w-4xl mx-auto w-full text-center">
      <h1 className="text-2xl font-bold text-t1 mb-3">My Stuff</h1>
      <p className="text-sm text-t2 mb-5">Sign in to save and access your content.</p>
      <a href="/auth" className="inline-flex h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 items-center">Sign in →</a>
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-t1 tracking-tight mb-1">My Stuff</h1>
          <p className="text-sm text-t2">{items.length} saved item{items.length!==1?'s':''}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {['all',...allTypes].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} className={`h-7 px-3 rounded-full text-[12px] font-medium border transition-all ${filter===f?'bg-blue-700 text-white border-blue-700':'bg-surface text-t2 border-line hover:border-blue-300'}`}>
              {f==='all'?'All':TYPE_META[f]?.label}
              {f!=='all'&&counts[f]?<span className="ml-1 opacity-60">({counts[f]})</span>:null}
            </button>
          ))}
        </div>
      </div>

      {error&&<div className="mb-4 p-4 bg-amber-500/10 border border-amber-400/30 rounded-xl text-sm text-amber-600">{error}</div>}

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i)=>(
          <div key={i} className="bg-surface border border-line rounded-xl p-5 animate-pulse h-20"/>
        ))}</div>
      ) : filtered.length===0 ? (
        <div className="bg-surface border border-line rounded-xl p-10 text-center">
          <p className="text-t2 text-sm mb-4">{filter==='all'?'Nothing saved yet. Generate something and save it!':'No '+TYPE_META[filter]?.label+' saved yet.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item=>{
            const meta = TYPE_META[item.type] || { label:item.type, color:'bg-surface2 text-t2' }
            const isOpen = expanded===item.id
            return (
              <div key={item.id} className="bg-surface border border-line rounded-xl overflow-hidden transition-all">
                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-surface2 transition-colors" onClick={()=>setExpanded(isOpen?null:item.id)}>
                  <span className="text-xl flex-shrink-0">{TYPE_ICONS[item.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-t1 truncate">{item.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                      <span className="text-[11px] text-t3">{timeAgo(item.created_at)}</span>
                      {item.data?.questions&&<span className="text-[11px] text-t3">· {item.data.questions.length} questions</span>}
                      {item.data?.cards&&<span className="text-[11px] text-t3">· {item.data.cards.length} cards</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 items-center">
                    {meta.btn && (
                      <button
                        onClick={e=>{ e.stopPropagation(); openItem(item) }}
                        className={`h-7 px-3 text-[11px] font-semibold rounded-lg flex items-center ${BTN_COLORS[item.type] || 'bg-blue-700 text-white'}`}
                      >
                        {meta.btn}
                      </button>
                    )}
                    <button onClick={e=>{e.stopPropagation();if(confirm('Delete "'+item.title+'"?'))doDelete(item.id)}} disabled={deleting===item.id} className="h-7 px-2 text-[11px] text-red-400 border border-red-200 dark:border-red-500/30 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40">
                      {deleting===item.id?'...':'✕'}
                    </button>
                    <span className="text-t3 text-sm">{isOpen?'▲':'▼'}</span>
                  </div>
                </div>
                {isOpen&&(
                  <div className="border-t border-line p-4">
                    {item.type==='quiz'&&item.data?.questions&&(
                      <div className="space-y-2">
                        {item.data.questions.slice(0,3).map((q,i)=>(
                          <div key={i} className="text-[12px] text-t2"><span className="font-semibold text-t1">{i+1}.</span> {q.question}</div>
                        ))}
                        {item.data.questions.length>3&&<div className="text-[11px] text-t3">+{item.data.questions.length-3} more questions</div>}
                      </div>
                    )}
                    {item.type==='flashcards'&&item.data?.cards&&(
                      <div className="space-y-2">
                        {item.data.cards.slice(0,3).map((c,i)=>(
                          <div key={i} className="text-[12px] text-t2"><span className="font-semibold text-t1">{c.front||c.question}:</span> {c.back||c.answer}</div>
                        ))}
                        {item.data.cards.length>3&&<div className="text-[11px] text-t3">+{item.data.cards.length-3} more cards</div>}
                      </div>
                    )}
                    {(item.type==='lesson_plan'||item.type==='study_guide'||item.type==='summary')&&item.data?.output&&(
                      <p className="text-[12px] text-t2 whitespace-pre-wrap line-clamp-6">{item.data.output.substring(0,400)}{item.data.output.length>400?'...':''}</p>
                    )}
                    {item.type==='conversation'&&item.data?.messages&&(
                <div className="space-y-2">
                  {item.data.messages.slice(0,4).map((m,i)=>(
                    <div key={i} className={`text-[12px] ${m.role==='user'?'text-t1':'text-t2'}`}>
                      <span className="font-semibold">{m.role==='user'?'You':'Nova'}:</span> {(m.content||'').slice(0,120)}{(m.content||'').length>120?'...':''}
                    </div>
                  ))}
                  {item.data.messages.length>4&&<div className="text-[11px] text-t3">+{item.data.messages.length-4} more messages</div>}
                </div>
              )}
              {(item.type==='lesson_plan'||item.type==='study_guide'||item.type==='summary')&&item.data?.plan&&(
                      <p className="text-[12px] text-t2 whitespace-pre-wrap line-clamp-6">{item.data.plan.substring(0,400)}{item.data.plan.length>400?'...':''}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
