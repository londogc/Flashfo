'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { rpc } from '@/lib/api'
import { useRouter } from 'next/navigation'

// ── Small icon helper ──────────────────────────────────────────────────────
const Ico = ({ d, s = 14, color = 'currentColor' }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display:'block', flexShrink:0 }}>
    {Array.isArray(d) ? d.map((p,i) => <path key={i} d={p}/>) : <path d={d}/>}
  </svg>
)

const TYPE_META = {
  url:  { label:'URL',  color:'#3b82f6', icon:['M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71','M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71'] },
  text: { label:'Text', color:'#8b5cf6', icon:['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z','M14 2v6h6','M16 13H8','M16 17H8','M10 9H8'] },
  note: { label:'Note', color:'#f59e0b', icon:['M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7','M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z'] },
}

const ACTIONS = [
  { id:'flashcards', label:'Make flashcards', icon:'M2 5h20v14H2z M12 5v14', color:'#6366f1' },
  { id:'quiz',       label:'Generate quiz',   icon:'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.12 2.6-2.77 2.9L13 17M12 21h.01', color:'#10b981' },
  { id:'summary',    label:'Summarize all',   icon:'M4 6h16M4 10h16M4 14h10', color:'#f59e0b' },
  { id:'study_guide',label:'Study guide',     icon:'M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z', color:'#ec4899' },
  { id:'ask',        label:'Ask a question',  icon:'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z', color:'#a78bfa' },
]

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

function truncate(t, n) { return t?.length > n ? t.slice(0, n) + '…' : t || '' }

export default function SourceLibraryPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())

  // Add panel
  const [addMode, setAddMode] = useState(null) // null | 'url' | 'text' | 'note'
  const [addUrl, setAddUrl] = useState('')
  const [addTitle, setAddTitle] = useState('')
  const [addContent, setAddContent] = useState('')
  const [addTags, setAddTags] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [fetching, setFetching] = useState(false)

  // Generate panel
  const [genAction, setGenAction] = useState(null)
  const [genQuestion, setGenQuestion] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState(null)
  const [genError, setGenError] = useState('')

  // Detail view
  const [viewing, setViewing] = useState(null)

  // Search / filter
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    if (user) fetchSources()
  }, [user])

  async function fetchSources() {
    setLoading(true)
    const { data, error } = await supabase
      .from('user_sources')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error) setSources(data || [])
    setLoading(false)
  }

  // ── URL fetch preview ──────────────────────────────────────────────────────
  async function handleFetchUrl() {
    const url = addUrl.trim()
    if (!url) return
    setFetching(true); setAddError('')
    try {
      const { result } = await rpc('fetchUrlPreview', [url])
      setAddTitle(result.title || url)
      setAddContent(result.content || '')
    } catch (e) {
      setAddError('Could not fetch that URL. Try pasting the text directly.')
    }
    setFetching(false)
  }

  // ── Save source ────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!addTitle.trim()) { setAddError('Please add a title.'); return }
    if (addMode === 'url' && !addUrl.trim()) { setAddError('URL is required.'); return }
    if ((addMode === 'text' || addMode === 'note') && !addContent.trim()) { setAddError('Content is required.'); return }

    setAdding(true); setAddError('')
    const tags = addTags.split(',').map(t => t.trim()).filter(Boolean)
    const { error } = await supabase.from('user_sources').insert({
      user_id: user.id,
      type: addMode,
      title: addTitle.trim(),
      url: addMode === 'url' ? addUrl.trim() : null,
      content: addContent.trim() || null,
      tags,
    })
    if (error) { setAddError(error.message); setAdding(false); return }
    setAddMode(null); setAddUrl(''); setAddTitle(''); setAddContent(''); setAddTags('')
    await fetchSources()
    setAdding(false)
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    await supabase.from('user_sources').delete().eq('id', id)
    setSources(s => s.filter(x => x.id !== id))
    setSelected(s => { const n = new Set(s); n.delete(id); return n })
    if (viewing?.id === id) setViewing(null)
  }

  async function handleDeleteSelected() {
    for (const id of selected) await supabase.from('user_sources').delete().eq('id', id)
    setSources(s => s.filter(x => !selected.has(x.id)))
    setSelected(new Set())
  }

  // ── Generate from sources ──────────────────────────────────────────────────
  async function handleGenerate() {
    const activeSources = selected.size > 0
      ? sources.filter(s => selected.has(s.id))
      : sources
    if (activeSources.length === 0) { setGenError('No sources to generate from.'); return }
    setGenerating(true); setGenError(''); setGenResult(null)
    try {
      const { result } = await rpc('generateFromSources', [
        activeSources.map(s => ({ title: s.title, url: s.url, content: s.content })),
        genAction,
        genAction === 'ask' ? genQuestion : '',
      ])
      setGenResult({ action: genAction, text: result })
    } catch (e) {
      const msg = e.message || ''
      if (msg.includes('free_limit_reached')) setGenError("You've used your 5 free generations this month. Upgrade to Pro for unlimited access.")
      else setGenError(msg || 'Generation failed.')
    }
    setGenerating(false)
  }

  // ── Send result to tool ────────────────────────────────────────────────────
  function useInTool(action, text) {
    try {
      if (action === 'flashcards') {
        const parsed = JSON.parse(text)
        sessionStorage.setItem('flashfo_load_flashcards', JSON.stringify({ cards: parsed.cards, topic: 'Source Library' }))
        router.push('/flashcards')
      } else if (action === 'quiz') {
        const parsed = JSON.parse(text)
        sessionStorage.setItem('flashfo_quiz_load', JSON.stringify({ questions: parsed.questions, topic: 'Source Library' }))
        router.push('/quiz')
      } else if (action === 'study_guide') {
        sessionStorage.setItem('flashfo_studyguide_load', JSON.stringify({ guide: text, topic: 'Source Library' }))
        router.push('/study-guide')
      } else if (action === 'summary') {
        sessionStorage.setItem('flashfo_load_summary', JSON.stringify({ output: text, input: 'Source Library' }))
        router.push('/summarize')
      }
    } catch { alert('Could not open in tool — try copying the text manually.') }
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = sources.filter(s => {
    if (filterType !== 'all' && s.type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      return s.title.toLowerCase().includes(q) ||
        s.content?.toLowerCase().includes(q) ||
        s.url?.toLowerCase().includes(q) ||
        s.tags?.some(t => t.toLowerCase().includes(q))
    }
    return true
  })

  function toggleSelect(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function selectAll() { setSelected(new Set(filtered.map(s => s.id))) }
  function clearSelect() { setSelected(new Set()) }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const card = {
    background:'var(--c-surface)', border:'1px solid var(--c-line)',
    borderRadius:14, padding:'14px 16px', cursor:'pointer',
    transition:'border-color 0.15s',
  }
  const btn = (bg='#3b82f6', fg='#fff') => ({
    display:'inline-flex', alignItems:'center', gap:6, height:34, padding:'0 14px',
    background:bg, color:fg, border:'none', borderRadius:10, fontSize:13,
    fontWeight:600, cursor:'pointer', fontFamily:'inherit',
  })
  const inp = {
    width:'100%', height:38, padding:'0 12px', background:'var(--c-surface2)',
    border:'1px solid var(--c-line)', borderRadius:10, fontSize:13,
    color:'var(--c-t1)', outline:'none', fontFamily:'inherit', boxSizing:'border-box',
  }

  if (authLoading) return null

  return (
    <div style={{ maxWidth:960, margin:'0 auto', padding:'24px 20px', paddingBottom:100 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--c-t1)', margin:0, letterSpacing:'-0.03em' }}>Source Library</h1>
          <p style={{ fontSize:13, color:'var(--c-t2)', margin:'4px 0 0' }}>
            Save URLs, text, and notes once — reuse them across all your AI tools.
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {(['url','text','note']).map(t => (
            <button key={t} onClick={() => { setAddMode(t); setAddError('') }}
              style={{ ...btn(addMode===t ? TYPE_META[t].color : 'var(--c-surface2)', addMode===t ? '#fff' : 'var(--c-t2)'),
                border: addMode===t ? 'none' : '1px solid var(--c-line)' }}>
              <Ico d={TYPE_META[t].icon} s={13} color={addMode===t ? '#fff' : TYPE_META[t].color}/>
              Add {TYPE_META[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* Add panel */}
      {addMode && (
        <div style={{ background:'var(--c-surface)', border:`1px solid ${TYPE_META[addMode].color}44`,
          borderRadius:16, padding:20, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <span style={{ fontSize:14, fontWeight:700, color:'var(--c-t1)' }}>
              Add {TYPE_META[addMode].label}
            </span>
            <button onClick={() => setAddMode(null)} style={{ ...btn('var(--c-surface2)','var(--c-t2)'), height:28, padding:'0 10px', border:'1px solid var(--c-line)' }}>✕</button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {addMode === 'url' && (
              <div style={{ display:'flex', gap:8 }}>
                <input value={addUrl} onChange={e => setAddUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleFetchUrl()}
                  placeholder="https://example.com/article..." style={{ ...inp, flex:1 }}/>
                <button onClick={handleFetchUrl} disabled={fetching || !addUrl.trim()}
                  style={{ ...btn(), opacity: fetching ? 0.6 : 1, flexShrink:0 }}>
                  {fetching ? 'Fetching…' : 'Fetch'}
                </button>
              </div>
            )}
            <input value={addTitle} onChange={e => setAddTitle(e.target.value)}
              placeholder="Title" style={inp}/>
            <textarea value={addContent} onChange={e => setAddContent(e.target.value)}
              placeholder={addMode === 'url' ? 'Fetched content will appear here (editable)…' : addMode === 'note' ? 'Your note…' : 'Paste text here…'}
              rows={5} style={{ ...inp, height:'auto', padding:'10px 12px', resize:'vertical', lineHeight:1.5 }}/>
            <input value={addTags} onChange={e => setAddTags(e.target.value)}
              placeholder="Tags (comma separated, e.g. biology, exam-prep)" style={inp}/>
            {addError && <p style={{ fontSize:12, color:'#f87171', margin:0 }}>{addError}</p>}
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={handleSave} disabled={adding}
                style={{ ...btn(TYPE_META[addMode].color), opacity: adding ? 0.6 : 1 }}>
                {adding ? 'Saving…' : 'Save to library'}
              </button>
              <button onClick={() => { setAddMode(null); setAddUrl(''); setAddTitle(''); setAddContent(''); setAddTags('') }}
                style={{ ...btn('var(--c-surface2)','var(--c-t2)'), border:'1px solid var(--c-line)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate from sources panel */}
      {sources.length > 0 && (
        <div style={{ background:'var(--c-surface)', border:'1px solid var(--c-line)', borderRadius:16, padding:20, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <Ico d="M13 10V3L4 14h7v7l9-11h-7z" s={16} color="#6366f1"/>
            <span style={{ fontSize:14, fontWeight:700, color:'var(--c-t1)' }}>
              Generate from {selected.size > 0 ? `${selected.size} selected` : 'all'} sources
            </span>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
            {ACTIONS.map(a => (
              <button key={a.id} onClick={() => setGenAction(genAction === a.id ? null : a.id)}
                style={{ display:'inline-flex', alignItems:'center', gap:5, height:32, padding:'0 12px',
                  background: genAction===a.id ? a.color+'22' : 'var(--c-surface2)',
                  border: `1px solid ${genAction===a.id ? a.color+'66' : 'var(--c-line)'}`,
                  borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
                  color: genAction===a.id ? a.color : 'var(--c-t2)', fontFamily:'inherit' }}>
                {a.label}
              </button>
            ))}
          </div>
          {genAction === 'ask' && (
            <input value={genQuestion} onChange={e => setGenQuestion(e.target.value)}
              placeholder="What do you want to know from these sources?"
              style={{ ...inp, marginBottom:10 }}/>
          )}
          {genAction && (
            <button onClick={handleGenerate} disabled={generating}
              style={{ ...btn(), opacity: generating ? 0.6 : 1 }}>
              {generating ? 'Generating…' : `Generate ${ACTIONS.find(a=>a.id===genAction)?.label}`}
            </button>
          )}
          {genError && <p style={{ fontSize:12, color:'#f87171', margin:'8px 0 0' }}>{genError}</p>}

          {/* Result */}
          {genResult && (
            <div style={{ marginTop:14, background:'var(--c-surface2)', border:'1px solid var(--c-line)',
              borderRadius:12, padding:16 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, gap:8, flexWrap:'wrap' }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--c-t1)' }}>Result</span>
                <div style={{ display:'flex', gap:6 }}>
                  {['flashcards','quiz','study_guide','summary'].includes(genResult.action) && (
                    <button onClick={() => useInTool(genResult.action, genResult.text)}
                      style={{ ...btn('#6366f1'), height:28, fontSize:12 }}>
                      Open in {genResult.action === 'flashcards' ? 'Flashcards' : genResult.action === 'quiz' ? 'Quiz' : genResult.action === 'study_guide' ? 'Study Guide' : 'Summarizer'}
                    </button>
                  )}
                  <button onClick={() => navigator.clipboard?.writeText(genResult.text)}
                    style={{ ...btn('var(--c-surface)','var(--c-t2)'), height:28, fontSize:12, border:'1px solid var(--c-line)' }}>
                    Copy
                  </button>
                  <button onClick={() => setGenResult(null)}
                    style={{ ...btn('var(--c-surface)','var(--c-t2)'), height:28, fontSize:12, border:'1px solid var(--c-line)' }}>
                    ✕
                  </button>
                </div>
              </div>
              <pre style={{ fontSize:12, color:'var(--c-t1)', whiteSpace:'pre-wrap', lineHeight:1.6, margin:0,
                maxHeight:320, overflowY:'auto', fontFamily:'inherit' }}>{genResult.text}</pre>
            </div>
          )}
        </div>
      )}

      {/* Search + filter */}
      {sources.length > 0 && (
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search sources…"
            style={{ ...inp, flex:1, minWidth:160, height:34 }}/>
          {(['all','url','text','note']).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              style={{ height:34, padding:'0 12px', borderRadius:20, fontSize:12, fontWeight:600,
                background: filterType===t ? '#3b82f620' : 'var(--c-surface2)',
                border: filterType===t ? '1px solid #3b82f660' : '1px solid var(--c-line)',
                color: filterType===t ? '#3b82f6' : 'var(--c-t2)', cursor:'pointer', fontFamily:'inherit' }}>
              {t === 'all' ? 'All' : TYPE_META[t].label}
            </button>
          ))}
          {selected.size > 0 && (
            <>
              <button onClick={clearSelect} style={{ ...btn('var(--c-surface2)','var(--c-t2)'), height:34, border:'1px solid var(--c-line)' }}>
                Clear ({selected.size})
              </button>
              <button onClick={handleDeleteSelected} style={{ ...btn('#ef444420','#f87171'), height:34, border:'1px solid #f8717140' }}>
                Delete selected
              </button>
            </>
          )}
          {filtered.length > 1 && selected.size === 0 && (
            <button onClick={selectAll} style={{ ...btn('var(--c-surface2)','var(--c-t2)'), height:34, border:'1px solid var(--c-line)' }}>
              Select all
            </button>
          )}
        </div>
      )}

      {/* Source list */}
      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
          {[1,2,3].map(i => <div key={i} className="ff-skeleton" style={{ height:90, borderRadius:14 }}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, padding:48, textAlign:'center', cursor:'default' }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'#3b82f610', display:'flex',
            alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
            <Ico d={['M4 19.5A2.5 2.5 0 016.5 17H20','M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z']} s={24} color="#3b82f6"/>
          </div>
          <h2 style={{ fontSize:15, fontWeight:700, color:'var(--c-t1)', margin:'0 0 8px' }}>
            {search ? 'No sources match your search' : 'Your source library is empty'}
          </h2>
          <p style={{ fontSize:13, color:'var(--c-t2)', margin:0 }}>
            {search ? 'Try a different search term or filter.' : 'Add a URL, paste some text, or write a note to get started.'}
          </p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
          {filtered.map(src => {
            const meta = TYPE_META[src.type] || TYPE_META.text
            const isSelected = selected.has(src.id)
            return (
              <div key={src.id}
                onClick={() => setViewing(viewing?.id === src.id ? null : src)}
                style={{ ...card, borderColor: isSelected ? meta.color : viewing?.id === src.id ? meta.color+'88' : 'var(--c-line)',
                  background: isSelected ? meta.color+'0a' : 'var(--c-surface)' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                  {/* Select checkbox */}
                  <div onClick={e => { e.stopPropagation(); toggleSelect(src.id) }}
                    style={{ width:16, height:16, borderRadius:4, border:`1.5px solid ${isSelected ? meta.color : 'var(--c-line)'}`,
                      background: isSelected ? meta.color : 'transparent', flexShrink:0, marginTop:2, cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {isSelected && <svg width="9" height="9" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em',
                        color: meta.color, background: meta.color+'18', borderRadius:6, padding:'2px 6px' }}>
                        {meta.label}
                      </span>
                      {src.tags?.slice(0,2).map(t => (
                        <span key={t} style={{ fontSize:10, color:'var(--c-t3)', background:'var(--c-surface2)',
                          borderRadius:6, padding:'2px 6px', border:'1px solid var(--c-line)' }}>{t}</span>
                      ))}
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--c-t1)', marginBottom:3,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {src.title}
                    </div>
                    <div style={{ fontSize:11, color:'var(--c-t3)' }}>
                      {truncate(src.content || src.url || '', 70)}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleDelete(src.id) }}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'var(--c-t3)',
                      padding:4, borderRadius:6, flexShrink:0, opacity:0.5 }}>
                    <Ico d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3-3h6M10 11v6M14 11v6" s={13}/>
                  </button>
                </div>
                <div style={{ fontSize:11, color:'var(--c-t3)', marginTop:8, paddingTop:8, borderTop:'1px solid var(--c-line)', textAlign:'right' }}>
                  {timeAgo(src.created_at)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail drawer */}
      {viewing && (
        <div style={{ position:'fixed', right:0, top:0, bottom:0, width:380, background:'var(--c-surface)',
          borderLeft:'1px solid var(--c-line)', zIndex:50, overflowY:'auto', padding:24,
          boxShadow:'-8px 0 32px rgba(0,0,0,0.12)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em',
                color: TYPE_META[viewing.type]?.color, background: TYPE_META[viewing.type]?.color+'18',
                borderRadius:6, padding:'2px 7px', display:'inline-block', marginBottom:8 }}>
                {TYPE_META[viewing.type]?.label}
              </span>
              <h2 style={{ fontSize:15, fontWeight:700, color:'var(--c-t1)', margin:0 }}>{viewing.title}</h2>
            </div>
            <button onClick={() => setViewing(null)} style={{ ...btn('var(--c-surface2)','var(--c-t2)'),
              height:28, padding:'0 10px', border:'1px solid var(--c-line)', flexShrink:0 }}>✕</button>
          </div>
          {viewing.url && (
            <a href={viewing.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize:12, color:'#3b82f6', display:'block', marginBottom:12,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {viewing.url}
            </a>
          )}
          {viewing.tags?.length > 0 && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
              {viewing.tags.map(t => (
                <span key={t} style={{ fontSize:11, color:'var(--c-t2)', background:'var(--c-surface2)',
                  borderRadius:6, padding:'3px 8px', border:'1px solid var(--c-line)' }}>{t}</span>
              ))}
            </div>
          )}
          <div style={{ background:'var(--c-surface2)', border:'1px solid var(--c-line)', borderRadius:10,
            padding:14, fontSize:12, color:'var(--c-t1)', whiteSpace:'pre-wrap', lineHeight:1.7,
            maxHeight:400, overflowY:'auto' }}>
            {viewing.content || '(no content)'}
          </div>
          <div style={{ marginTop:16, display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={() => { toggleSelect(viewing.id); setViewing(null) }}
              style={{ ...btn('#6366f1'), fontSize:12, height:32 }}>
              {selected.has(viewing.id) ? 'Deselect' : 'Select for generation'}
            </button>
            <button onClick={() => navigator.clipboard?.writeText(viewing.content || viewing.url || '')}
              style={{ ...btn('var(--c-surface2)','var(--c-t2)'), fontSize:12, height:32, border:'1px solid var(--c-line)' }}>
              Copy content
            </button>
          </div>
          <div style={{ marginTop:8, fontSize:11, color:'var(--c-t3)' }}>
            Added {timeAgo(viewing.created_at)}
          </div>
        </div>
      )}
    </div>
  )
}
