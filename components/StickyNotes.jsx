'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'

// ── Constants ────────────────────────────────────────────────────────────────
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

function uid() { return Math.random().toString(36).slice(2,10) }

function load() {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function save(notes) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)) } catch {}
}

// ── Single note ───────────────────────────────────────────────────────────────
function Note({ note, pathname, onUpdate, onDelete }) {
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [minimized, setMinimized] = useState(note.minimized || false)
  const dragRef = useRef({ startX:0, startY:0, startLeft:0, startTop:0 })
  const resizeRef = useRef({ startX:0, startY:0, startW:0, startH:0 })
  const autoSaveRef = useRef(null)
  const noteRef = useRef(null)

  const color = NOTE_COLORS.find(c => c.id === note.color) || NOTE_COLORS[0]

  // Is this note visible on current page?
  const isPinned = !!note.pinnedTo
  const isVisible = !isPinned || note.pinnedTo === pathname

  if (!isVisible) return null

  function handleTextChange(text) {
    onUpdate({ ...note, text })
  }

  // ── Drag ──────────────────────────────────────────────────────────────────
  function onDragStart(e) {
    if (e.target.closest('.note-action') || resizing) return
    e.preventDefault()
    const rect = noteRef.current.getBoundingClientRect()
    dragRef.current = { startX: e.clientX, startY: e.clientY, startLeft: note.x, startTop: note.y }
    setDragging(true)

    function onMove(e) {
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      const x = Math.max(0, Math.min(window.innerWidth - (note.w||DEFAULT_W), dragRef.current.startLeft + dx))
      const y = Math.max(0, Math.min(window.innerHeight - 40, dragRef.current.startTop + dy))
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

  // ── Resize ────────────────────────────────────────────────────────────────
  function onResizeStart(e) {
    e.preventDefault(); e.stopPropagation()
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: note.w||DEFAULT_W, startH: note.h||DEFAULT_H }
    setResizing(true)

    function onMove(e) {
      const w = Math.max(MIN_W, resizeRef.current.startW + e.clientX - resizeRef.current.startX)
      const h = Math.max(MIN_H, resizeRef.current.startH + e.clientY - resizeRef.current.startY)
      onUpdate({ ...note, w, h })
    }
    function onUp() {
      setResizing(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function toggleMinimized() {
    const next = !minimized
    setMinimized(next)
    onUpdate({ ...note, minimized: next })
  }

  function togglePin() {
    onUpdate({ ...note, pinnedTo: note.pinnedTo ? null : pathname })
  }

  const w = note.w || DEFAULT_W
  const h = note.h || DEFAULT_H

  return (
    <div ref={noteRef}
      style={{ position:'fixed', left:note.x, top:note.y, width:w, height:minimized?36:'auto',
        minHeight:minimized?36:MIN_H, maxHeight:minimized?36:h,
        zIndex:1000, cursor:dragging?'grabbing':'grab',
        boxShadow:'0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12)',
        borderRadius:12, border:`1.5px solid ${color.border}`,
        background:color.bg, display:'flex', flexDirection:'column',
        overflow:'hidden', transition:'max-height 0.2s ease, height 0.2s ease',
        userSelect:dragging?'none':'auto' }}
      onMouseDown={onDragStart}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 8px', borderBottom:minimized?'none':`1px solid ${color.border}44`, flexShrink:0 }}>
        {/* Color picker */}
        <div className="note-action" style={{ display:'flex', gap:3, cursor:'default' }}>
          {NOTE_COLORS.map(c => (
            <div key={c.id} onClick={() => onUpdate({ ...note, color: c.id })}
              style={{ width:10, height:10, borderRadius:'50%', background:c.border,
                border:`1.5px solid ${note.color===c.id?'#000':'transparent'}`, cursor:'pointer', flexShrink:0 }}/>
          ))}
        </div>

        <div style={{ flex:1 }}/>

        {/* Pin button */}
        <div className="note-action" title={note.pinnedTo ? 'Pinned to this page — click to make global' : 'Pin to this page'}
          onClick={togglePin} style={{ cursor:'pointer', opacity:note.pinnedTo?1:0.45, transition:'opacity 0.15s' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill={note.pinnedTo?color.border:'none'} stroke={color.border} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </div>

        {/* Minimize */}
        <div className="note-action" onClick={toggleMinimized} title={minimized?'Expand':'Minimize'}
          style={{ cursor:'pointer', color:color.border, fontSize:14, lineHeight:1, opacity:0.7 }}>
          {minimized ? '▪' : '─'}
        </div>

        {/* Delete */}
        <div className="note-action" onClick={() => onDelete(note.id)} title="Delete note"
          style={{ cursor:'pointer', color:color.border, fontSize:13, lineHeight:1, opacity:0.6 }}>
          ✕
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <textarea
          value={note.text}
          onChange={e => handleTextChange(e.target.value)}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          placeholder="Write a note…"
          style={{ flex:1, resize:'none', border:'none', outline:'none', background:'transparent',
            padding:'8px 10px', fontSize:12, lineHeight:1.55, color:color.text,
            fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif',
            overflowY:'auto', minHeight:MIN_H - 36 }}
        />
      )}

      {/* Resize handle */}
      {!minimized && (
        <div onMouseDown={onResizeStart} className="note-action"
          style={{ position:'absolute', right:0, bottom:0, width:14, height:14, cursor:'se-resize',
            display:'flex', alignItems:'center', justifyContent:'center', opacity:0.4 }}>
          <svg width="8" height="8" viewBox="0 0 8 8"><path d="M7 1L1 7M7 4L4 7" stroke={color.border} strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
      )}
    </div>
  )
}

// ── Notes tray button ─────────────────────────────────────────────────────────
function NotesButton({ count, onClick }) {
  return (
    <button onClick={onClick} title="Sticky notes" aria-label="Open sticky notes"
      style={{ position:'fixed', bottom:24, right:24, zIndex:999,
        width:42, height:42, borderRadius:'50%',
        background:'rgba(10,8,22,0.88)', border:'0.5px solid rgba(255,255,255,0.15)',
        boxShadow:'0 4px 20px rgba(0,0,0,0.4)', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h8l6-6V4a2 2 0 00-2-2z"/><path d="M14 2v6h6"/>
      </svg>
      {count > 0 && (
        <div style={{ position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%',
          background:'#6366f1', fontSize:9, fontWeight:700, color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center' }}>{count}</div>
      )}
    </button>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function StickyNotes() {
  const pathname = usePathname()
  const [notes, setNotes] = useState([])
  const [mounted, setMounted] = useState(false)

  // Load on mount
  useEffect(() => {
    setNotes(load())
    setMounted(true)
  }, [])

  // Persist on every change
  useEffect(() => {
    if (mounted) save(notes)
  }, [notes, mounted])

  function addNote() {
    const id = uid()
    const x = 80 + (notes.length % 5) * 24
    const y = 120 + (notes.length % 5) * 24
    setNotes(n => [...n, { id, text:'', color:'yellow', x, y, w:DEFAULT_W, h:DEFAULT_H, minimized:false, pinnedTo:null, createdAt:Date.now() }])
  }

  function updateNote(updated) {
    setNotes(n => n.map(note => note.id === updated.id ? updated : note))
  }

  function deleteNote(id) {
    setNotes(n => n.filter(note => note.id !== id))
  }

  if (!mounted) return null

  // Visible notes for this page (global + pinned to current path)
  const visible = notes.filter(n => !n.pinnedTo || n.pinnedTo === pathname)

  return (
    <>
      {notes.map(note => (
        <Note key={note.id} note={note} pathname={pathname} onUpdate={updateNote} onDelete={deleteNote}/>
      ))}
      <NotesButton count={visible.length} onClick={addNote}/>
    </>
  )
}
