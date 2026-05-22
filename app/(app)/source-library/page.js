'use client'
// Flashfo — Source Library
// Bug #1: file was overwritten with Shell v6 code, causing white-screen crash.
// This is the correct page component.
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

// ── Citation style formatters ─────────────────────────────────────────────────
function formatAPA(s) {
  const year   = s.year   ? `(${s.year}).` : '(n.d.).'
  const title  = s.type === 'book'
    ? `<em>${s.title}</em>.`
    : `${s.title}.`
  const author = formatAuthorsAPA(s.authors)
  if (s.type === 'website') {
    return `${author} ${year} ${s.title}. ${s.publisher || s.source || ''}. ${s.url ? s.url : ''}`.trim()
  }
  if (s.type === 'journal') {
    const vol    = s.volume ? `, ${s.volume}` : ''
    const issue  = s.issue  ? `(${s.issue})` : ''
    const pages  = s.pages  ? `, ${s.pages}` : ''
    return `${author} ${year} ${s.title}. <em>${s.source}</em>${vol}${issue}${pages}.`.trim()
  }
  // book / default
  return `${author} ${year} <em>${s.title}</em>. ${s.publisher || ''}.`.trim()
}

function formatAuthorsAPA(authors = '') {
  if (!authors.trim()) return ''
  const parts = authors.split(',').map(a => a.trim()).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0] + '.'
  const last = parts[parts.length - 1]
  return parts.slice(0, -1).join(', ') + ', & ' + last + '.'
}

function formatMLA(s) {
  const author  = s.authors ? s.authors.split(',').map(a=>a.trim()).join(', ') + '.' : ''
  const title   = s.type === 'book'
    ? `<em>${s.title}</em>.`
    : `"${s.title}."`
  const source  = s.source ? `<em>${s.source}</em>,` : ''
  const vol     = s.volume ? `vol. ${s.volume},` : ''
  const issue   = s.issue  ? `no. ${s.issue},` : ''
  const year    = s.year   ? `${s.year},` : ''
  const pages   = s.pages  ? `pp. ${s.pages}.` : ''
  const pub     = s.publisher ? `${s.publisher},` : ''
  const url     = s.url ? `${s.url}.` : ''
  if (s.type === 'website') {
    return `${author} ${title} ${s.source||s.publisher||''}, ${year} ${url}`.replace(/\s+/g,' ').trim()
  }
  if (s.type === 'journal') {
    return `${author} ${title} ${source} ${vol} ${issue} ${year} ${pages}`.replace(/\s+/g,' ').trim()
  }
  return `${author} ${title} ${pub} ${year}`.replace(/\s+/g,' ').trim()
}

function formatChicago(s) {
  const author = s.authors || ''
  const year   = s.year   ? s.year + '.' : ''
  const title  = s.type === 'book'
    ? `<em>${s.title}</em>.`
    : `"${s.title}."`
  if (s.type === 'website') {
    return `${author}. ${title} ${s.source||s.publisher||''}. ${s.year||''}. ${s.url||''}`.replace(/\s+/g,' ').trim()
  }
  if (s.type === 'journal') {
    const vol   = s.volume ? `${s.volume}` : ''
    const issue = s.issue  ? `, no. ${s.issue}` : ''
    const year2 = s.year   ? ` (${s.year})` : ''
    const pages = s.pages  ? `: ${s.pages}` : ''
    return `${author}. ${title} <em>${s.source||''}</em> ${vol}${issue}${year2}${pages}.`.replace(/\s+/g,' ').trim()
  }
  return `${author}. ${title} ${s.publisher||''}, ${year}`.replace(/\s+/g,' ').trim()
}

function formatCitation(source, style) {
  if (style === 'APA')     return formatAPA(source)
  if (style === 'MLA')     return formatMLA(source)
  if (style === 'Chicago') return formatChicago(source)
  return formatAPA(source)
}

// Strip HTML tags for plain-text export
function stripHtml(str) {
  return str.replace(/<[^>]+>/g, '')
}

// ── Source type options ───────────────────────────────────────────────────────
const SOURCE_TYPES = [
  { value:'book',    label:'Book' },
  { value:'journal', label:'Journal Article' },
  { value:'website', label:'Website' },
  { value:'other',   label:'Other' },
]

const STYLES = ['APA', 'MLA', 'Chicago']

const ACCENT = { h:'#a21caf', r:'162,28,175' }

const emptySource = () => ({
  id: Math.random().toString(36).slice(2),
  type:'book', authors:'', title:'', source:'', publisher:'',
  year:'', volume:'', issue:'', pages:'', url:'',
  notes:'', createdAt: Date.now(),
})

// ── Field label helpers ───────────────────────────────────────────────────────
function fieldsForType(type) {
  const base = [
    { key:'authors',   label:'Author(s)', placeholder:'Last, First; Last, First', span:2 },
    { key:'title',     label:'Title',     placeholder:'Full title of the work',    span:2 },
    { key:'year',      label:'Year',      placeholder:'e.g. 2023',                span:1 },
  ]
  if (type === 'journal') return [
    ...base,
    { key:'source',    label:'Journal Name', placeholder:'e.g. Nature',           span:2 },
    { key:'volume',    label:'Volume',       placeholder:'e.g. 12',               span:1 },
    { key:'issue',     label:'Issue',        placeholder:'e.g. 3',                span:1 },
    { key:'pages',     label:'Pages',        placeholder:'e.g. 45–58',            span:1 },
  ]
  if (type === 'website') return [
    ...base,
    { key:'source',    label:'Website Name', placeholder:'e.g. CNN',              span:2 },
    { key:'url',       label:'URL',          placeholder:'https://…',             span:2 },
  ]
  return [
    ...base,
    { key:'publisher', label:'Publisher',    placeholder:'e.g. Oxford University Press', span:2 },
  ]
}

// ── Inline HTML renderer (bold/italic only) ───────────────────────────────────
function CitationText({ html }) {
  return <span dangerouslySetInnerHTML={{ __html: html }}/>
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SourceLibraryPage() {
  const { user } = useAuth()

  const [sources,    setSources]    = useState([])
  const [style,      setStyle]      = useState('APA')
  const [editing,    setEditing]    = useState(null)   // source being edited
  const [showForm,   setShowForm]   = useState(false)
  const [search,     setSearch]     = useState('')
  const [copied,     setCopied]     = useState(null)   // id of recently copied
  const [downloading,setDownloading]= useState(false)
  const [saving,     setSaving]     = useState(false)

  const STORAGE_KEY = `ff-sources-${user?.id || 'guest'}`

  const [fetchingMeta, setFetchingMeta] = useState(false)

  // Auto-populate citation fields when a URL is pasted into the URL field
  async function fetchUrlMeta(url) {
    if (!url || !url.startsWith('http')) return
    setFetchingMeta(true)
    try {
      // Use the page's og/meta tags via a CORS proxy or Nova
      const { rpc } = await import('@/lib/api')
      const data = await rpc('extractUrlMetadata', [url])
      const meta = data?.result
      if (meta) {
        setEditing(prev => ({
          ...prev,
          type:      'website',
          title:     meta.title     || prev.title     || '',
          authors:   meta.author    || prev.authors   || '',
          source:    meta.siteName  || prev.source    || '',
          year:      meta.year      || prev.year      || String(new Date().getFullYear()),
          url,
        }))
      }
    } catch {
      // Silent fail — user can fill fields manually
    } finally {
      setFetchingMeta(false)
    }
  }

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      setSources(saved)
    } catch {}
  }, [user])

  function persist(next) {
    setSources(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }

  function openNew() {
    setEditing(emptySource())
    setShowForm(true)
  }

  function openEdit(src) {
    setEditing({ ...src })
    setShowForm(true)
  }

  function saveEdit() {
    if (!editing?.title?.trim()) return
    const exists = sources.find(s => s.id === editing.id)
    if (exists) {
      persist(sources.map(s => s.id === editing.id ? editing : s))
    } else {
      persist([...sources, editing])
    }
    setShowForm(false)
    setEditing(null)
  }

  function deleteSource(id) {
    if (!window.confirm('Remove this source?')) return
    persist(sources.filter(s => s.id !== id))
  }

  function copyBib(src) {
    const text = stripHtml(formatCitation(src, style))
    navigator.clipboard.writeText(text).then(() => {
      setCopied(src.id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  function copyAll() {
    const text = filtered
      .map((s, i) => `[${i+1}] ${stripHtml(formatCitation(s, style))}`)
      .join('\n\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied('all')
      setTimeout(() => setCopied(null), 2000)
    })
  }

  function downloadTxt() {
    setDownloading(true)
    const header  = `Flashfo Source Library\nCitation Style: ${style}\nExported: ${new Date().toLocaleDateString()}\n${'─'.repeat(60)}\n\n`
    const body    = filtered
      .map((s, i) => `[${i+1}] ${stripHtml(formatCitation(s, style))}${s.notes ? '\n    Note: ' + s.notes : ''}`)
      .join('\n\n')
    const blob = new Blob([header + body], { type:'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `bibliography-${style.toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
    setTimeout(() => setDownloading(false), 800)
  }

  const filtered = sources.filter(s =>
    !search || [s.title, s.authors, s.source, s.publisher].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  )

  const inputStyle = {
    width:'100%', padding:'9px 12px', borderRadius:9,
    border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)',
    color:'rgba(255,255,255,0.88)', fontSize:13, outline:'none',
    fontFamily:'inherit', boxSizing:'border-box',
  }

  const fields = editing ? fieldsForType(editing.type) : []

  return (
    <div style={{ maxWidth:860, margin:'0 auto', padding:'28px 24px 80px', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <style>{`
        @keyframes sl-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .sl-card{animation:sl-in 0.25s ease both}
        .sl-btn:hover{opacity:0.85}
        .sl-input:focus{border-color:rgba(162,28,175,0.5)!important;box-shadow:0 0 0 3px rgba(162,28,175,0.1)}
        .sl-source-row:hover .sl-row-actions{opacity:1!important}
        em{font-style:italic}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:`rgba(${ACCENT.r},0.15)`, border:`1px solid rgba(${ACCENT.r},0.25)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={ACCENT.h} strokeWidth="1.5" strokeLinecap="round">
                  <path d="M1 5h3v9H1zm4-3h4v12H5zm5 2h4v10h-4z"/>
                </svg>
              </div>
              <h1 style={{ fontSize:22, fontWeight:700, color:'rgba(255,255,255,0.92)', margin:0, letterSpacing:'-0.02em' }}>Source Library</h1>
            </div>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', margin:0 }}>
              Manage your sources and generate formatted bibliographies.
            </p>
          </div>
          <button onClick={openNew} className="sl-btn"
            style={{ height:36, padding:'0 16px', background:ACCENT.h, border:'none', borderRadius:10, fontSize:13, fontWeight:600, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:7, flexShrink:0, fontFamily:'inherit' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M8 1v14M1 8h14"/></svg>
            Add Source
          </button>
        </div>
      </div>

      {/* Controls bar */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        {/* Search */}
        <div style={{ flex:1, minWidth:180, position:'relative' }}>
          <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
            width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M7 1a6 6 0 100 12A6 6 0 007 1zm7 14l-3-3"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sources…"
            className="sl-input"
            style={{ ...inputStyle, paddingLeft:32 }}/>
        </div>

        {/* Style picker */}
        <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:3 }}>
          {STYLES.map(s => (
            <button key={s} onClick={() => setStyle(s)} className="sl-btn"
              style={{ height:30, padding:'0 14px', borderRadius:8, border:'none', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
                background: style===s ? ACCENT.h : 'transparent',
                color: style===s ? '#fff' : 'rgba(255,255,255,0.45)',
              }}>
              {s}
            </button>
          ))}
        </div>

        {/* Actions */}
        {sources.length > 0 && (
          <>
            <button onClick={copyAll} className="sl-btn"
              style={{ height:36, padding:'0 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.65)', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
              {copied==='all' ? 'Copied ✓' : 'Copy All'}
            </button>
            <button onClick={downloadTxt} className="sl-btn" disabled={downloading}
              style={{ height:36, padding:'0 14px', background:`rgba(${ACCENT.r},0.15)`, border:`1px solid rgba(${ACCENT.r},0.3)`, borderRadius:10, fontSize:12, fontWeight:600, color:ACCENT.h, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6 }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 1v8m-3-3l3 3 3-3M1 11v2a2 2 0 002 2h10a2 2 0 002-2v-2"/></svg>
              {downloading ? 'Saving…' : 'Download .txt'}
            </button>
          </>
        )}
      </div>

      {/* ── Source form modal ── */}
      {showForm && editing && (
        <div onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); setEditing(null) } }}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ width:'100%', maxWidth:560, background:'rgba(10,8,22,0.98)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:18, padding:24, boxShadow:'0 20px 60px rgba(0,0,0,0.6)', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:'rgba(255,255,255,0.9)' }}>
                {sources.find(s => s.id === editing.id) ? 'Edit Source' : 'Add Source'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditing(null) }}
                style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', fontSize:18, lineHeight:1, padding:4, fontFamily:'inherit' }}>✕</button>
            </div>

            {/* Type selector */}
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', display:'block', marginBottom:6 }}>Source Type</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {SOURCE_TYPES.map(t => (
                  <button key={t.value} onClick={() => setEditing(e => ({ ...e, type:t.value }))}
                    style={{ height:32, padding:'0 14px', borderRadius:8, border:'1px solid', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
                      background: editing.type===t.value ? `rgba(${ACCENT.r},0.2)` : 'rgba(255,255,255,0.05)',
                      borderColor: editing.type===t.value ? ACCENT.h : 'rgba(255,255,255,0.1)',
                      color: editing.type===t.value ? ACCENT.h : 'rgba(255,255,255,0.55)',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic fields */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              {fields.map(f => (
                <div key={f.key} style={{ gridColumn: f.span === 2 ? 'span 2' : 'span 1' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                    <label style={{ fontSize:11, fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)' }}>{f.label}</label>
                    {f.key === 'url' && fetchingMeta && (
                      <span style={{ fontSize:10, color:ACCENT.h, display:'flex', alignItems:'center', gap:4 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation:'_fcspin .7s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                        Auto-filling…
                      </span>
                    )}
                    {f.key === 'url' && !fetchingMeta && editing?.url?.startsWith('http') && (
                      <button onClick={()=>fetchUrlMeta(editing.url)} style={{ fontSize:10, color:ACCENT.h, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                        Auto-fill ↺
                      </button>
                    )}
                  </div>
                  <input
                    value={editing[f.key] || ''}
                    onChange={e => setEditing(ed => ({ ...ed, [f.key]: e.target.value }))}
                    onPaste={f.key === 'url' ? e => {
                      const pasted = e.clipboardData.getData('text').trim()
                      if (pasted.startsWith('http')) {
                        e.preventDefault()
                        setEditing(ed => ({ ...ed, url: pasted, type:'website' }))
                        setTimeout(() => fetchUrlMeta(pasted), 100)
                      }
                    } : undefined}
                    placeholder={f.placeholder} className="sl-input" style={inputStyle}/>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', display:'block', marginBottom:5 }}>Notes (optional)</label>
              <textarea value={editing.notes || ''} onChange={e => setEditing(ed => ({ ...ed, notes:e.target.value }))}
                placeholder="Personal notes about this source…" rows={2} className="sl-input"
                style={{ ...inputStyle, resize:'vertical', lineHeight:1.5 }}/>
            </div>

            {/* Preview */}
            {editing.title && (
              <div style={{ background:`rgba(${ACCENT.r},0.07)`, border:`1px solid rgba(${ACCENT.r},0.2)`, borderRadius:10, padding:'10px 14px', marginBottom:20 }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:ACCENT.h, marginBottom:6 }}>Preview · {style}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)', lineHeight:1.7 }}>
                  <CitationText html={formatCitation(editing, style)}/>
                </div>
              </div>
            )}

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => { setShowForm(false); setEditing(null) }}
                style={{ height:36, padding:'0 16px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.6)', cursor:'pointer', fontFamily:'inherit' }}>
                Cancel
              </button>
              <button onClick={saveEdit} disabled={!editing.title?.trim()}
                style={{ height:36, padding:'0 20px', background: editing.title?.trim() ? ACCENT.h : 'rgba(255,255,255,0.1)', border:'none', borderRadius:10, fontSize:13, fontWeight:600, color:'#fff', cursor: editing.title?.trim() ? 'pointer' : 'not-allowed', fontFamily:'inherit', opacity: editing.title?.trim() ? 1 : 0.5 }}>
                Save Source
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sources list ── */}
      {sources.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ width:56, height:56, borderRadius:16, background:`rgba(${ACCENT.r},0.1)`, border:`1px solid rgba(${ACCENT.r},0.2)`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke={ACCENT.h} strokeWidth="1.4" strokeLinecap="round">
              <path d="M1 5h3v9H1zm4-3h4v12H5zm5 2h4v10h-4z"/>
            </svg>
          </div>
          <div style={{ fontSize:16, fontWeight:600, color:'rgba(255,255,255,0.7)', marginBottom:8 }}>No sources yet</div>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginBottom:20, maxWidth:320, margin:'0 auto 20px' }}>
            Add books, journal articles, and websites to build your bibliography.
          </p>
          <button onClick={openNew} className="sl-btn"
            style={{ height:36, padding:'0 20px', background:ACCENT.h, border:'none', borderRadius:10, fontSize:13, fontWeight:600, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
            Add your first source
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'rgba(255,255,255,0.35)', fontSize:13 }}>
          No sources match "{search}"
        </div>
      ) : (
        <>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginBottom:12, fontWeight:600 }}>
            {filtered.length} source{filtered.length!==1?'s':''} · {style} format
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map((src, i) => (
              <div key={src.id} className="sl-card sl-source-row"
                style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'14px 16px', display:'flex', gap:14, alignItems:'flex-start', animationDelay:`${i*0.04}s` }}>

                {/* Index */}
                <div style={{ width:24, height:24, borderRadius:7, background:`rgba(${ACCENT.r},0.12)`, border:`1px solid rgba(${ACCENT.r},0.2)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:ACCENT.h }}>{i+1}</span>
                </div>

                {/* Citation */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.78)', lineHeight:1.7, marginBottom: src.notes ? 6 : 0 }}>
                    <CitationText html={formatCitation(src, style)}/>
                  </div>
                  {src.notes && (
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontStyle:'italic' }}>
                      Note: {src.notes}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:5, background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.35)' }}>
                      {SOURCE_TYPES.find(t => t.value === src.type)?.label || src.type}
                    </span>
                    {src.year && <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>{src.year}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="sl-row-actions" style={{ display:'flex', gap:6, flexShrink:0, opacity:0, transition:'opacity 0.15s' }}>
                  <button onClick={() => copyBib(src)} title="Copy citation"
                    style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {copied===src.id
                      ? <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round"><path d="M2 8l4 4 8-8"/></svg>
                      : <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"><rect x="5" y="5" width="9" height="9" rx="2"/><path d="M3 11H2a1 1 0 01-1-1V2a1 1 0 011-1h8a1 1 0 011 1v1"/></svg>
                    }
                  </button>
                  <button onClick={() => openEdit(src)} title="Edit"
                    style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>
                  </button>
                  <button onClick={() => deleteSource(src.id)} title="Delete"
                    style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="rgba(248,113,113,0.7)" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
