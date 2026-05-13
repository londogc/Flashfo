'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

// ── Constants ─────────────────────────────────────────────────────────────────
const NOTE_COLORS = [
  { id:'yellow', bg:'#fef3c7', border:'#f59e0b', text:'#78350f' },
  { id:'violet', bg:'#ede9fe', border:'#7c3aed', text:'#4c1d95' },
  { id:'green',  bg:'#d1fae5', border:'#059669', text:'#064e3b' },
  { id:'pink',   bg:'#fce7f3', border:'#db2777', text:'#831843' },
  { id:'slate',  bg:'#f1f5f9', border:'#64748b', text:'#1e293b' },
]
const DEFAULT_W = 220
const DEFAULT_H = 160
const MIN_W = 160
const MIN_H = 100
const STORAGE_KEY = 'ff-sticky-notes'

function uid() { return Math.random().toString(36).slice(2, 10) }
function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } }
function save(notes) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)) } catch {} }

// ── Single note ───────────────────────────────────────────────────────────────
function Note({ note, pathname, onUpdate, onDelete }) {
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const dragRef   = useRef({ startX:0, startY:0, startLeft:0, startTop:0 })
  const resizeRef = useRef({ startX:0, startY:0, startW:0, startH:0 })
  const saveTimer = useRef(null)
  const noteRef   = useRef(null)

  const color    = NOTE_COLORS.find(c => c.id === note.color) || NOTE_COLORS[0]
  const isPinned = !!note.pinnedTo
  const isVisible = !isPinned || note.pinnedTo === pathname

  // Bug #5a: minimized notes return null — completely hidden until restored from tray
  if (note.minimized || !isVisible) return null

  const w = note.w || DEFAULT_W
  const h = note.h || DEFAULT_H  // Bug #5b: always use fixed pixel height

  function handleTextChange(text) {
    onUpdate({ ...note, text })
    // Bug #5e: show "Saved ✓" flash 800ms after last keystroke
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    }, 800)
  }

  function onDragStart(e) {
    if (e.target.closest('.note-action') || resizing) return
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startY: e.clientY, startLeft: note.x, startTop: note.y }
    setDragging(true)
    function onMove(e) {
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      const x = Math.max(0, Math.min(window.innerWidth  - w,  dragRef.current.startLeft + dx))
      const y = Math.max(0, Math.min(window.innerHeight - 40, dragRef.current.startTop  + dy))
      onUpdate({ ...note, x, y })
    }
    function onUp() {
      setDragging(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function onResizeStart(e) {
    e.preventDefault(); e.stopPropagation()
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: w, startH: h }
    setResizing(true)
    function onMove(e) {
      // Bug #5b: track both axes so vertical resize actually works
      const nw = Math.max(MIN_W, resizeRef.current.startW + e.clientX - resizeRef.current.startX)
      const nh = Math.max(MIN_H, resizeRef.current.startH + e.clientY - resizeRef.current.startY)
      onUpdate({ ...note, w: nw, h: nh })
    }
    function onUp() {
      setResizing(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function togglePin() {
    onUpdate({ ...note, pinnedTo: note.pinnedTo ? null : pathname })
  }

  // Bug #5d: confirm before deleting
  function handleDelete() {
    if (window.confirm('Delete this note? It cannot be recovered.')) {
      onDelete(note.id)
    }
  }

  return (
    <div ref={noteRef}
      style={{ position:'fixed', left:note.x, top:note.y,
        width: w,
        height: h,  // Bug #5b: fixed height so resize handle actually constrains it
        zIndex:1000, cursor:dragging ? 'grabbing' : 'grab',
        boxShadow:'0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12)',
        borderRadius:12, border:`1.5px solid ${color.border}`,
        background:color.bg, display:'flex', flexDirection:'column',
        overflow:'hidden', userSelect:dragging ? 'none' : 'auto' }}
      onMouseDown={onDragStart}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 8px', borderBottom:`1px solid ${color.border}44`, flexShrink:0 }}>
        {/* Color picker */}
        <div className="note-action" style={{ display:'flex', gap:3 }}>
          {NOTE_COLORS.map(c => (
            <div key={c.id} onClick={() => onUpdate({ ...note, color: c.id })}
              style={{ width:10, height:10, borderRadius:'50%', background:c.border,
                border:`1.5px solid ${note.color === c.id ? '#000' : 'transparent'}`,
                cursor:'pointer', flexShrink:0 }}/>
          ))}
        </div>

        <div style={{ flex:1 }}/>

        {/* Bug #5c: Pin button — more visible with text label + active highlight */}
        <div className="note-action"
          title={note.pinnedTo ? 'Pinned to this page — click to unpin' : 'Pin to this page only'}
          onClick={togglePin}
          style={{ display:'flex', alignItems:'center', gap:3, cursor:'pointer',
            background: note.pinnedTo ? `${color.border}22` : 'transparent',
            border: `1px solid ${note.pinnedTo ? color.border : 'transparent'}`,
            borderRadius:5, padding:'2px 5px', transition:'all 0.15s' }}>
          <svg width="10" height="10" viewBox="0 0 24 24"
            fill={note.pinnedTo ? color.border : 'none'}
            stroke={color.border} strokeWidth="2.2" strokeLinecap="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span style={{ fontSize:9, fontWeight:700, color:color.border, opacity:note.pinnedTo ? 1 : 0.55 }}>
            {note.pinnedTo ? 'Pinned' : 'Pin'}
          </span>
        </div>

        {/* Minimize — Bug #5a: hides note completely (goes to tray counter) */}
        <div className="note-action"
          onClick={() => onUpdate({ ...note, minimized: true })}
          title="Minimize — hides note to button"
          style={{ cursor:'pointer', color:color.border, fontSize:14, lineHeight:1, opacity:0.65, padding:'0 2px', userSelect:'none' }}>
          ─
        </div>

        {/* Bug #5d: X requires confirmation */}
        <div className="note-action" onClick={handleDelete} title="Delete note"
          style={{ cursor:'pointer', color:color.border, fontSize:12, lineHeight:1, opacity:0.6, padding:'0 2px', userSelect:'none' }}>
          ✕
        </div>
      </div>

      {/* Body — Bug #5b: flex:1 fills fixed height correctly */}
      <textarea
        value={note.text}
        onChange={e => handleTextChange(e.target.value)}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        placeholder="Write a note…"
        style={{ flex:1, resize:'none', border:'none', outline:'none', background:'transparent',
          padding:'8px 10px', fontSize:12, lineHeight:1.55, color:color.text,
          fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif',
          overflowY:'auto' }}
      />

      {/* Bug #5e: saved indicator */}
      {savedFlash && (
        <div style={{ position:'absolute', bottom:6, left:'50%', transform:'translateX(-50%)',
          fontSize:9, fontWeight:700, color:color.border, opacity:0.75,
          background:color.bg, padding:'2px 8px', borderRadius:4, pointerEvents:'none',
          whiteSpace:'nowrap' }}>
          Saved ✓
        </div>
      )}

      {/* Resize handle — both axes */}
      <div onMouseDown={onResizeStart} className="note-action"
        style={{ position:'absolute', right:0, bottom:0, width:16, height:16,
          cursor:'se-resize', display:'flex', alignItems:'center', justifyContent:'center', opacity:0.4 }}>
        <svg width="9" height="9" viewBox="0 0 9 9">
          <path d="M8 1L1 8M8 4L4 8" stroke={color.border} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  )
}

// ── Notes tray (popup above the button) ───────────────────────────────────────
function NotesTray({ notes, pathname, onAdd, onRestore, onClose }) {
  const hidden  = notes.filter(n => n.minimized)
  const visible = notes.filter(n => !n.minimized && (!n.pinnedTo || n.pinnedTo === pathname))

  return (
    <div style={{ position:'fixed', bottom:76, right:16, zIndex:1001,
      width:244, background:'rgba(10,8,22,0.97)', border:'1px solid rgba(255,255,255,0.12)',
      borderRadius:14, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.55)',
      backdropFilter:'blur(20px)' }}>

      {/* Header */}
      <div style={{ padding:'10px 12px', borderBottom:'0.5px solid rgba(255,255,255,0.08)',
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.65)' }}>
          Notes {notes.length > 0 && `(${notes.length})`}
        </span>
        <button onClick={onAdd}
          style={{ height:24, padding:'0 10px', background:'rgba(99,102,241,0.2)',
            border:'0.5px solid rgba(99,102,241,0.4)', borderRadius:7, fontSize:11,
            fontWeight:600, color:'#c4b5fd', cursor:'pointer', fontFamily:'inherit' }}>
          + New
        </button>
      </div>

      {notes.length === 0 && (
        <div style={{ padding:'20px 16px', textAlign:'center', color:'rgba(255,255,255,0.25)', fontSize:12 }}>
          No notes yet
        </div>
      )}

      <div style={{ maxHeight:240, overflowY:'auto', padding:6 }}>
        {/* Hidden (minimized) notes */}
        {hidden.length > 0 && (
          <>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
              color:'rgba(255,255,255,0.22)', padding:'4px 6px 2px' }}>Hidden</div>
            {hidden.map(n => {
              const col = NOTE_COLORS.find(c => c.id === n.color) || NOTE_COLORS[0]
              return (
                <div key={n.id} onClick={() => { onRestore(n.id); onClose() }}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 8px',
                    borderRadius:8, cursor:'pointer', marginBottom:2 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:col.border, flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)', flex:1,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {n.text.trim().slice(0, 36) || 'Empty note'}
                  </span>
                  <span style={{ fontSize:9, color:'rgba(255,255,255,0.2)', flexShrink:0 }}>Restore</span>
                </div>
              )
            })}
          </>
        )}

        {/* Divider */}
        {hidden.length > 0 && visible.length > 0 && (
          <div style={{ height:'0.5px', background:'rgba(255,255,255,0.07)', margin:'4px 6px' }}/>
        )}

        {/* Visible notes */}
        {visible.length > 0 && (
          <>
            {(hidden.length > 0 || notes.length > visible.length) && (
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
                color:'rgba(255,255,255,0.22)', padding:'4px 6px 2px' }}>Visible</div>
            )}
            {visible.map(n => {
              const col = NOTE_COLORS.find(c => c.id === n.color) || NOTE_COLORS[0]
              return (
                <div key={n.id}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 8px',
                    borderRadius:8, marginBottom:2 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:col.border, flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)', flex:1,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {n.text.trim().slice(0, 36) || 'Empty note'}
                  </span>
                  {n.pinnedTo && (
                    <span style={{ fontSize:10, color:'rgba(255,255,255,0.2)', flexShrink:0 }}>📌</span>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

// ── Floating button ───────────────────────────────────────────────────────────
function NotesButton({ count, onClick }) {
  return (
    <button onClick={onClick} title="Notes" aria-label="Sticky notes"
      style={{ position:'fixed', bottom:24, right:24, zIndex:999,
        width:42, height:42, borderRadius:'50%',
        background:'rgba(10,8,22,0.88)', border:'0.5px solid rgba(255,255,255,0.15)',
        boxShadow:'0 4px 20px rgba(0,0,0,0.4)', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        backdropFilter:'blur(12px)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h8l6-6V4a2 2 0 00-2-2z"/>
        <path d="M14 2v6h6"/>
      </svg>
      {count > 0 && (
        <div style={{ position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%',
          background:'#6366f1', fontSize:9, fontWeight:700, color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          {count > 9 ? '9+' : count}
        </div>
      )}
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StickyNotes() {
  const pathname = usePathname()
  const [notes,   setNotes]   = useState([])
  const [mounted, setMounted] = useState(false)
  const [trayOpen, setTrayOpen] = useState(false)
  const trayRef = useRef(null)
  const btnRef  = useRef(null)

  useEffect(() => { setNotes(load()); setMounted(true) }, [])
  useEffect(() => { if (mounted) save(notes) }, [notes, mounted])

  // Close tray on outside click
  useEffect(() => {
    if (!trayOpen) return
    const h = (e) => {
      if (trayRef.current && !trayRef.current.contains(e.target) &&
          btnRef.current  && !btnRef.current.contains(e.target)) {
        setTrayOpen(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [trayOpen])

  function addNote() {
    const offset = (notes.length % 5) * 24
    setNotes(n => [...n, {
      id: uid(), text:'', color:'yellow',
      x: 80 + offset, y: 120 + offset,
      w: DEFAULT_W, h: DEFAULT_H,
      minimized: false, pinnedTo: null, createdAt: Date.now(),
    }])
    setTrayOpen(false)
  }

  function updateNote(updated) {
    setNotes(n => n.map(note => note.id === updated.id ? updated : note))
  }

  function restoreNote(id) {
    setNotes(n => n.map(note => note.id === id ? { ...note, minimized: false } : note))
  }

  function deleteNote(id) {
    setNotes(n => n.filter(note => note.id !== id))
  }

  // Bug #5a: if notes exist → open tray; otherwise create first note directly
  function handleButtonClick() {
    if (notes.length > 0) {
      setTrayOpen(o => !o)
    } else {
      addNote()
    }
  }

  if (!mounted) return null

  return (
    <>
      {notes.map(note => (
        <Note key={note.id} note={note} pathname={pathname} onUpdate={updateNote} onDelete={deleteNote}/>
      ))}

      {trayOpen && (
        <div ref={trayRef}>
          <NotesTray
            notes={notes}
            pathname={pathname}
            onAdd={addNote}
            onRestore={restoreNote}
            onClose={() => setTrayOpen(false)}
          />
        </div>
      )}

      <div ref={btnRef}>
        <NotesButton count={notes.length} onClick={handleButtonClick}/>
      </div>
    </>
  )
}
