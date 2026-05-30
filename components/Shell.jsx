'use client'
// Flashfo — Shell (Phase 3) — comprehensive bug-fix pass v3
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { novaStream } from '@/lib/api'
import { useIsMobile } from '@/hooks/useIsMobile'
import MobileShell from '@/components/MobileShell'
import StickyNotes from '@/components/StickyNotes'

// ── Accent system ─────────────────────────────────────────────────────────────
const ACCENT_MAP = {
  '/dashboard':      { h:'#6366f1', r:'99,102,241'  },
  '/my-stuff':       { h:'#14b8a6', r:'20,184,166'  },
  '/my-progress':    { h:'#0ea5e9', r:'14,165,233'  },
  '/review':         { h:'#f59e0b', r:'245,158,11'  },
  '/exam-countdown': { h:'#a78bfa', r:'167,139,250' },
  '/shared-decks':   { h:'#6366f1', r:'99,102,241'  },
  '/ai-tutor':       { h:'#8b5cf6', r:'139,92,246'  },
  '/create':         { h:'#10b981', r:'16,185,129'  },
  '/flashcards':     { h:'#3b82f6', r:'59,130,246'  },  // blue
  '/quiz':           { h:'#6366f1', r:'99,102,241'  },  // indigo
  '/study-guide':    { h:'#10b981', r:'16,185,129'  },  // emerald
  '/summarize':      { h:'#f59e0b', r:'245,158,11'  },  // amber — was violet, fixed
  '/study':          { h:'#10b981', r:'16,185,129'  },
  '/study-modes':    { h:'#6366f1', r:'99,102,241'  },
  '/source-library': { h:'#ec4899', r:'236,72,153'  },
  '/teach':          { h:'#f59e0b', r:'245,158,11'  },
  '/lesson-builder': { h:'#f43f5e', r:'244,63,94'   },
  '/live-quiz':        { h:'#f97316', r:'249,115,22'  },
  '/resource-hub':     { h:'#f59e0b', r:'245,158,11'  },
  '/study-together':   { h:'#8b5cf6', r:'139,92,246'  },
  '/standards':        { h:'#34d399', r:'52,211,153'  },
  '/parent-report':    { h:'#60a5fa', r:'96,165,250'  },
  '/assignments':    { h:'#06b6d4', r:'6,182,212'   },
  '/student-portal': { h:'#06b6d4', r:'6,182,212'   },
  '/profile':        { h:'#f59e0b', r:'245,158,11'  },
  '/settings':       { h:'#6b7280', r:'107,114,128' },
  '/curriculum':     { h:'#8b5cf6', r:'139,92,246'  },
  '/collab-decks':   { h:'#10b981', r:'16,185,129'  },
}
function getAccent(pathname) {
  const base = '/' + (pathname.split('/').filter(Boolean)[0] || '')
  return ACCENT_MAP[base] || ACCENT_MAP['/dashboard']
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const ICONS = {
  dashboard:   'M1 1h6v6H1zm8 0h6v6H9zM1 9h6v6H1zm8 0h6v6H9z',
  create:      'M8 1v14M1 8h14',
  study:       'M2 4h12M2 8h8M2 12h10',
  nova:        'M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a4 4 0 100 8 4 4 0 000-8zm0 3a1 1 0 100 2 1 1 0 000-2z',
  teach:       'M8 1a4 4 0 100 8 4 4 0 000-8zm-6 14c0-3.3 2.7-6 6-6s6 2.7 6 6',
  mystuff:     'M1 4h5l2 2h7v8H1zm0 2v8',
  progress:    'M2 13V7h3v6zm4 0V4h3v9zm4 0V9h3v4z',
  sources:     'M1 5h3v9H1zm4-3h4v12H5zm5 2h4v10h-4z',
  curriculum:  'M1 2h6v12H1zm8 0h6v12H9z',
  collab:      'M2 5h9v8H2zM4 3h9v8H4z',
  resource:    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  together:    'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm10 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  standards:   'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
  parentrpt:   'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-2 10H8m4 4H8m6-8H8',
  livequiz:    'M4 2l10 6-10 6V2z',
  studentp:    'M8 1l7 3.5-7 3.5-7-3.5zm-5 5.5v4c0 2 2.2 3 5 3s5-1 5-3V10',
  assignments: 'M13 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V2a1 1 0 00-1-1zM5 5h6m-6 3h6m-6 3h4',
  review:      'M1 8a7 7 0 0112.5-4.3M15 8a7 7 0 01-12.5 4.3M13 3l2 1-1 2M3 13l-2-1 1-2',
  exam:        'M8 1l1.5 3h3l-2.5 2 1 3L8 7.5 5 9l1-3L3.5 4h3z M2 13h12M4 11v2M8 11v2M12 11v2',
  shared:      'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zm9 11v-1.5a3 3 0 00-2-2.83M13 7.13A3 3 0 0115 10',
  settings:    'M12.4 8a4.4 4.4 0 11-8.8 0 4.4 4.4 0 018.8 0zM14.3 9.2l1.7 1-2 3.5-1.7-1a6 6 0 01-1.8 1l-.3 2h-4l-.3-2a6 6 0 01-1.8-1l-1.7 1-2-3.5 1.7-1A6 6 0 012 8c0-.4 0-.8.1-1.2L.4 5.8l2-3.5 1.7 1A6 6 0 016 2.3L6.3.3h4l.3 2a6 6 0 011.8 1l1.7-1 2 3.5-1.7 1c.1.4.1.8.1 1.2s0 .8-.2 1.2z',
  notif:       'M8 1a6 6 0 016 6v3l2 2H2l2-2V7a6 6 0 016-6zm-1 13h2a1 1 0 01-2 0z',
  search:      'M7 1a6 6 0 100 12A6 6 0 007 1zm7 14l-3-3',
}
const I = ({ d, s = 16, color = 'currentColor' }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display:'block', flexShrink:0 }}>
    {Array.isArray(d) ? d.map((p,i) => <path key={i} d={p}/>) : <path d={d}/>}
  </svg>
)

// ── Fiverr logo mark — teal swoosh with three white dots ─────────────────────
function FlashfoLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 665.28 666.56" fill="none" style={{ display:'block', flexShrink:0 }}>
      <path d="M1282.19,1163.42c5.4-1.84,9.76-4.91,11.46-10.11.39-1.1.75-2.2,1-3.29.41-1.41.73-2.83,1-4.24l8.54-7.5c.4-.39.85-.78,1.26-1.17a69,69,0,0,0,12.74-16.22c20.33-35.15,14.68-87.65,9.89-107.88-4-16.7-14.83-41.7-44.22-53.18a56.64,56.64,0,0,0-12.73-53.73c-4,7.35-8.17,14.84-12.55,22.35l-1.72,3c-.65,1.11-1.31,2.22-2,3.33-1,1.67-2,3.34-3,5-.56.93-1.12,1.86-1.69,2.79q-4.76,7.85-9.77,15.76-5.74,9-11.82,18.19-7.35,11.13-15.24,22.36a3.46,3.46,0,0,0,.24.57q-3.17,4.67-6.41,9.34-1.29,1.88-2.61,3.75l-1.32,1.88a30.64,30.64,0,0,1,2.46,9.91,29.7,29.7,0,0,1-1.66,12.49,30.53,30.53,0,1,1-52.19-29.75c.63-.76,1.31-1.49,2-2.19l.54-.52c.54-.51,1.1-1,1.69-1.47.43-.35.87-.69,1.33-1l.46-.32c.41-.28.83-.56,1.25-.82.21-.14.43-.27.64-.39.43-.26.88-.5,1.32-.74A30.46,30.46,0,0,1,1173,996.2a35.71,35.71,0,0,1,5.07,0,834.66,834.66,0,0,0,57.07-92.83c.68-1.29,1.36-2.57,2-3.86s1.32-2.58,2-3.86,1.3-2.56,1.93-3.84c.32-.63.64-1.27,1-1.91q-3.3,6.69-6.86,13.49,10.65-18.81,19.51-36.85c.2-.4.39-.8.59-1.19l-.17-.31c1.85-3.76,3.67-7.51,5.41-11.22-.57-.39-1.18-.75-1.78-1.08h0c.9-2.13,1.73-4.25,2.6-6.38,29.66-74.69,31.41-135.15-1.83-163.67s-92.69-17.54-162,23.17c-8.19,4.79-16.58,10-25.06,15.71a161.76,161.76,0,0,1,36.61,13.56l4.2-2.5c57.4-33.71,103.94-45.15,126-26.24s17.85,66.57-6.77,128.47c-1.09,2.82-2.22,5.64-3.47,8.51-1.35-.1-2.7-.15-4.09-.12a101.17,101.17,0,0,0-19-30.16c-16.5-18.35-39.46-32.12-62.42-36.11a80,80,0,0,0-9-1.05l-3.1-.2-.76.41-5.16-3.69A203.56,203.56,0,0,0,1080.25,748a.21.21,0,0,1-.2-.07c-30.86-11.9-65.15-16.84-100.28-14.15a232.75,232.75,0,0,0-52.07,9.92q-7.34,2.31-14.4,5.11c-5.69-3-11.34-5.79-16.89-8.45-12.63-6.17-24.93-11.56-36.82-16.28-74.68-29.7-135.15-31.49-163.63,1.75-23.13,26.93-20.3,71.12,3.3,123.78a65.14,65.14,0,0,1,7.17-5.07,72.59,72.59,0,0,1,7.19-3.88c.92-2,1.91-4,3-6,1.72-3.34,3.61-6.58,5.63-9.78-14.15-35.29-16-63.12-2.54-78.68,18.83-22,66.58-17.81,128.43,6.77,7.31,2.88,14.85,6.07,22.48,9.57.82.37,1.68.78,2.51,1.15h0q17.63,8.1,36.17,18.15c45,24.33,93.53,56.94,142.14,96.32a30.09,30.09,0,0,1,7.91-1.68,30.55,30.55,0,1,1-28.15,32.78c0-.55-.07-1.11-.08-1.67a30.86,30.86,0,0,1,.4-5.56A799.8,799.8,0,0,0,864.62,791.79q-23.72-11.68-46.38-21a6.25,6.25,0,0,1-.89.27c-1.66.52-3.36,1.09-5,1.69-33.22,11.57-65.16,34.22-82.94,68.5-1.76,3.39-3.39,6.88-4.86,10.47a59.22,59.22,0,0,0-18.94,11.36c-1,.87-2.08,1.82-3.07,2.81A80.24,80.24,0,0,0,688,885.64a102.14,102.14,0,0,0-7.08,77.23c-8.69,9.74-14.2,26.8-13.52,43.94.81,21.37,11.29,38.83,29,48.73,4.48,27.48,20.38,46.32,45.53,55.08l.05,0c2.08.72,4.23,1.38,6.44,2,3.43.89,7,1.6,10.7,2.19h0a126.37,126.37,0,0,0,18.08,1.38h2.64l1.34,0,1.18,0,1.19,0c2.38-.09,4.8-.22,7.26-.41,2-.15,3.81-.33,5.5-.51l.81-.09.82-.11,1.31-.16.74-.1.89-.13.53-.08h0l.47-.07h0c2.48-.37,4.21-.7,5-.85-.07.3-.12.59-.18.88s-.15.76-.22,1.11a.59.59,0,0,1,0,.13c0,.2-.07.4-.11.6-.1.58-.2,1.12-.27,1.61,0,.17-.06.33-.08.48a.69.69,0,0,0,0,.13c0,.16,0,.32-.07.47a2.17,2.17,0,0,0,0,.25,2.34,2.34,0,0,0,0,.26.07.07,0,0,0,0,0l0,.2,0,.21c0,.09,0,.18,0,.27s0,.24-.05.34v0l0,.22a1.11,1.11,0,0,0,0,.17.13.13,0,0,0,0,.06s0,.08,0,.11v.1l-.15,1.49.16,1h0v.1l.1.51c5.91,31.75,44.65,56,92.37,60.94l1.42.13.72.07c3.66.32,7.36.53,11.11.61a793.86,793.86,0,0,0,66.78-55.5,32.47,32.47,0,0,1-.65-4.42,30.53,30.53,0,1,1,55.51,15.11c-.27.38-.55.76-.83,1.12a30.41,30.41,0,0,1-21.87,11.88,31.43,31.43,0,0,1-10.94-1.11q-13.94,12.64-27.66,24.2-6.42,5.4-12.78,10.55c-1.64,1.31-3.25,2.62-4.89,3.9q-5,3.95-9.95,7.77a582,582,0,0,1-58.74,40c-6.58,3.87-92.27,54-125.9,26.23-23.15-19.11-20.57-74.25,10.32-131.39q1.05-2,2.16-3.93c-1.54-.06-3.07-.15-4.58-.26-3.58-.26-7.07-.65-10.45-1.17a120,120,0,0,1-12.15-2.51q-4.89-1.29-9.44-3c-33.56,70.14-29.68,138.58,3.8,165.87,37.78,30.79,106.95,4.3,147.72-11.9a346,346,0,0,0,104.26-65.26c3.89-3.51,7.59-7,11.09-10.4a62.3,62.3,0,0,1,7,4.66,59.84,59.84,0,0,1,11,10.77c.34.42.66.84,1,1.27a24.85,24.85,0,0,1,2.55,4.32c1.12,2.21,2.92,5.64,6.28,11.72a362.13,362.13,0,0,0,38.24,55.54c5.68,6.3,14,15.38,24.51,23.59,12.13,9.5,27.16,17.83,44.36,19.35,5.35.48,8.92.11,11.29-2.21,8.9-8.7-5.81-38.19-20.1-62.25-1.36-2.29-2.72-4.53-4-6.7a39.29,39.29,0,0,1,12.69-7.76q1.46-.54,3-1c4.23-1.13,6.57-.59,11.23-1.26l15.23,6c3.5,1.12,6.94,2.16,10.34,3.09,57.11,16.35,102.47,12.72,126-14.71,22.4-26.12,14.56-68.06,7.39-93.9l-1.37,1.22-.09.36c-.35,1.22-.79,2.64-1.28,4.06-2,6.1-7.24,14.54-20.41,19a10.33,10.33,0,0,1-1,.32c4.39,21.09,2.45,37.8-6.86,48.65-11,12.85-31.88,16.71-59.62,12.85l-2.36-.35-3.6-.57-1.21-.22c-.45-.08-.89-.15-1.33-.24l-.93-.17-.2,0-1.42-.27c-1.29-.25-2.59-.52-3.91-.81l-1.55-.34-1.35-.3-1.92-.45c-1.17-.22-2.3-.53-3.43-.81l-2.07-.52-.93-.24-.18,0-.07,0-.09,0-.66-.18q-4.23-1.12-8.31-2.27l-2-.58q-5.07-1.43-9.94-2.91l-1.94-.6-1.68-.52-2.15-.68-1.9-.61-1.89-.62c-1.25-.41-2.5-.83-3.73-1.26l-.13,0c-.58-.19-1.15-.39-1.72-.6-1.23-.42-2.45-.86-3.66-1.3l-1.82-.67-2.24-.84-.37-.14L1147,1219l-.68-.27q-2.19-.85-4.35-1.75l-1.41-.59c-1.35-.57-2.7-1.15-4-1.74l-1-.46-1.19-.53-.15-.08-.83-.37-2.27-1.07-.73-.35-1-.47-1.08-.53-1.26-.62-1-.53-1-.51-.68-.36-2.27-1.19-1.09-.59-.19-.1h0l-1.18-.65-2.48-1.39-1.13-.65-.83-.48-.83-.49-1.65-1-.83-.51q-2.89-1.76-5.77-3.66c-.55-.36-1.1-.72-1.64-1.09h0l-1.59-1.08,0,0-1.54-1.06a.41.41,0,0,0-.11-.07l-1.48-1-.16-.12-1.44-1-1.59-1.16-1.59-1.19-1.6-1.22L1092,1188c-.57-.43-1.13-.88-1.7-1.33l-.78-.62-1.13-.91-.8-.65c-.53-.43-1.07-.87-1.6-1.32-.27-.22-.54-.44-.8-.67l-1.61-1.36c-.5-.42-1-.86-1.51-1.3q-1.66-1.44-3.33-2.93a422.77,422.77,0,0,0,144.4,39.61,34,34,0,0,0,36.5-50c2.41-.11,4.7-.21,6.87-.37A64.07,64.07,0,0,0,1282.19,1163.42ZM1243,888h0l-.18-.3.66-1.33c-.21.44-.43.88-.65,1.32ZM1253,866q-1.83,4.13-3.78,8.31c.85-1.87,1.7-3.73,2.52-5.57.42-.92.83-1.84,1.24-2.75.5-1.12,1-2.23,1.48-3.35q1.42-3.24,2.79-6.44Q1255.23,861,1253,866Z" transform="translate(-667.34 -666.76)" fill="#47f0df"/>
      <circle cx="341" cy="455.71" r="16.09" fill="#ffffff"/>
      <circle cx="395.32" cy="240.34" r="16.09" fill="#ffffff"/>
      <circle cx="508.68" cy="359.67" r="16.09" fill="#ffffff"/>
    </svg>
  )
}

// ── Plan access ───────────────────────────────────────────────────────────────
const PLAN_RANK = { free:0, student:1, teacher:2, school:3, lifetime:99 }
function canAccess(userPlan, minPlan) {
  const plan = userPlan || 'free'
  return plan === 'lifetime' || (PLAN_RANK[plan] ?? 0) >= (PLAN_RANK[minPlan] ?? 0)
}

// ── Nav definitions ───────────────────────────────────────────────────────────
const NAV_STUDENT = [
  { section: null },
  { href:'/dashboard',      label:'Dashboard',      icon:'dashboard',   minPlan:'free' },
  { href:'/ai-tutor',       label:'Nova',           icon:'nova',        minPlan:'student', nova:true },
  { sep: true },
  { section: 'Tools' },
  { href:'/create',         label:'Create',         icon:'create',      minPlan:'student' },
  { href:'/study',          label:'Study',          icon:'study',       minPlan:'student' },
  { href:'/source-library', label:'Source Library', icon:'sources',     minPlan:'student' },
  { sep: true },
  { section: 'Library' },
  { href:'/my-stuff',         label:'My Stuff',        icon:'mystuff',     minPlan:'student' },
  { href:'/my-progress',      label:'My Progress',     icon:'progress',    minPlan:'student' },
  { href:'/review',           label:'Review',          icon:'review',      minPlan:'student' },
  { href:'/exam-countdown',   label:'Exam Countdown',  icon:'exam',        minPlan:'student' },
  { href:'/shared-decks',     label:'Shared Decks',    icon:'shared',      minPlan:'student' },
  { href:'/assignments',      label:'Assignments',     icon:'assignments', minPlan:'student' },
  { href:'/student-portal', label:'Student Portal', icon:'studentp',    minPlan:'student' },
  { href:'/collab-decks',   label:'Collab Decks',   icon:'collab',      minPlan:'student' },
]
const NAV_TEACHER = [
  { section: null },
  { href:'/dashboard',        label:'Dashboard',      icon:'dashboard',   minPlan:'free'    },
  { href:'/ai-tutor',         label:'Nova',           icon:'nova',        minPlan:'student', nova:true },
  { sep: true },
  { section: 'Classroom' },
  { href:'/teach',            label:'Teaching',       icon:'teach',       minPlan:'teacher' },
  { href:'/assignments',      label:'Assignments',    icon:'assignments', minPlan:'teacher' },
  { href:'/student-portal',   label:'Student Portal', icon:'studentp',    minPlan:'teacher' },
  { href:'/live-quiz',        label:'Live Quiz',      icon:'livequiz',    minPlan:'teacher' },
  { href:'/study-together',   label:'Study Together', icon:'together',    minPlan:'teacher' },
  { sep: true },
  { section: 'Content' },
  { href:'/lesson-builder',   label:'Lesson Builder', icon:'study',       minPlan:'teacher' },
  { href:'/curriculum',       label:'Curriculum',     icon:'curriculum',  minPlan:'teacher' },
  { href:'/standards',        label:'Standards',      icon:'standards',   minPlan:'teacher' },
  { href:'/resource-hub',     label:'Resource Hub',   icon:'resource',    minPlan:'teacher' },
  { href:'/source-library',   label:'Source Library', icon:'sources',     minPlan:'teacher' },
  { sep: true },
  { section: 'Reports' },
  { href:'/parent-report',    label:'Parent Reports', icon:'parentrpt',   minPlan:'teacher' },
  { sep: true },
  { section: 'Library' },
  { href:'/my-stuff',         label:'My Stuff',       icon:'mystuff',     minPlan:'student' },
  { href:'/collab-decks',     label:'Collab Decks',   icon:'collab',      minPlan:'teacher' },
]
function getNav(role) { return role === 'teacher' ? NAV_TEACHER : NAV_STUDENT }

// ── Avatar ────────────────────────────────────────────────────────────────────
function CreatureSVG({ id, size }) {
  const s = { width:size, height:size, viewBox:'0 0 60 60', display:'block' }
  if (id==='cat')     return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#1a2e1a"/><circle cx="30" cy="32" r="15" fill="#4ade80"/><ellipse cx="22" cy="18" rx="5" ry="8" fill="#86efac"/><ellipse cx="38" cy="18" rx="5" ry="8" fill="#86efac"/><ellipse cx="22" cy="20" rx="3.5" ry="5.5" fill="#4ade80"/><ellipse cx="38" cy="20" rx="3.5" ry="5.5" fill="#4ade80"/><circle cx="25" cy="30" r="5" fill="#fff"/><circle cx="35" cy="30" r="5" fill="#fff"/><circle cx="25" cy="30" r="3" fill="#166534"/><circle cx="35" cy="30" r="3" fill="#166534"/><circle cx="24" cy="29" r="1" fill="#fff"/><circle cx="34" cy="29" r="1" fill="#fff"/><path d="M27 38 Q30 41 33 38" stroke="#166534" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>)
  if (id==='alien')   return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#0f172a"/><ellipse cx="30" cy="35" rx="16" ry="13" fill="#818cf8"/><circle cx="30" cy="22" r="12" fill="#a5b4fc"/><circle cx="30" cy="13" r="5" fill="#c7d2fe"/><ellipse cx="22" cy="22" rx="4" ry="7" fill="#6366f1"/><ellipse cx="38" cy="22" rx="4" ry="7" fill="#6366f1"/><circle cx="26" cy="22" r="4.5" fill="#fff"/><circle cx="34" cy="22" r="4.5" fill="#fff"/><circle cx="26" cy="22" r="2.8" fill="#312e81"/><circle cx="34" cy="22" r="2.8" fill="#312e81"/><circle cx="25" cy="21" r="1" fill="#fff"/><circle cx="33" cy="21" r="1" fill="#fff"/><path d="M27 31 Q30 34 33 31" stroke="#312e81" strokeWidth="1.4" fill="none" strokeLinecap="round"/></svg>)
  if (id==='fox')     return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#2d1a00"/><ellipse cx="30" cy="38" rx="14" ry="11" fill="#f97316"/><circle cx="30" cy="24" r="12" fill="#f97316"/><ellipse cx="30" cy="13" rx="7" ry="4.5" fill="#fb923c"/><rect x="27.5" y="9" width="5" height="7" rx="2.5" fill="#fb923c"/><circle cx="25" cy="23" r="4.5" fill="#fff"/><circle cx="35" cy="23" r="4.5" fill="#fff"/><circle cx="25" cy="23" r="2.8" fill="#431407"/><circle cx="35" cy="23" r="2.8" fill="#431407"/><circle cx="24" cy="22" r="1" fill="#fff"/><circle cx="34" cy="22" r="1" fill="#fff"/><path d="M27 30 Q30 33 33 30" stroke="#431407" strokeWidth="1.4" fill="none" strokeLinecap="round"/></svg>)
  if (id==='dolphin') return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#001a2d"/><circle cx="30" cy="26" r="14" fill="#38bdf8"/><ellipse cx="18" cy="24" rx="5" ry="9" fill="#7dd3fc"/><ellipse cx="42" cy="24" rx="5" ry="9" fill="#7dd3fc"/><circle cx="25" cy="24" r="5" fill="#fff"/><circle cx="35" cy="24" r="5" fill="#fff"/><circle cx="25" cy="24" r="3" fill="#0c4a6e"/><circle cx="35" cy="24" r="3" fill="#0c4a6e"/><circle cx="24" cy="23" r="1.1" fill="#fff"/><circle cx="34" cy="23" r="1.1" fill="#fff"/><path d="M27 33 Q30 36 33 33" stroke="#0c4a6e" strokeWidth="1.4" fill="none" strokeLinecap="round"/></svg>)
  if (id==='wizard')  return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#1a0a2e"/><ellipse cx="30" cy="42" rx="16" ry="12" fill="#a855f7"/><circle cx="30" cy="24" r="13" fill="#c084fc"/><path d="M17 20 Q30 7 43 20 L42 16 Q30 5 18 16Z" fill="#7e22ce"/><circle cx="25" cy="24" r="4" fill="#fff"/><circle cx="35" cy="24" r="4" fill="#fff"/><circle cx="25" cy="24" r="2.5" fill="#581c87"/><circle cx="35" cy="24" r="2.5" fill="#581c87"/><circle cx="24" cy="23" r="0.9" fill="#fff"/><circle cx="34" cy="23" r="0.9" fill="#fff"/><path d="M27 31 Q30 34 33 31" stroke="#581c87" strokeWidth="1.4" fill="none" strokeLinecap="round"/></svg>)
  return null
}
function Avatar({ user, profile, size = 26, accentH }) {
  if (profile?.avatar_url) return <img src={profile.avatar_url} alt="" style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', border:`1.5px solid ${accentH}44`, flexShrink:0, display:'block' }}/>
  if (profile?.avatar_id)  return <div style={{ width:size, height:size, borderRadius:'50%', overflow:'hidden', flexShrink:0, border:`1.5px solid ${accentH}44` }}><CreatureSVG id={profile.avatar_id} size={size}/></div>
  const initials = (profile?.full_name||user?.email||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  return <div style={{ width:size, height:size, borderRadius:'50%', background:`rgba(${ACCENT_MAP['/dashboard'].r},0.2)`, border:`1.5px solid ${accentH}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:700, color:accentH, flexShrink:0 }}>{initials}</div>
}

// ── Shared user menu items ────────────────────────────────────────────────────
function UserMenuItems({ accentH, plan, onClose, onSignOut }) {
  const base = { display:'flex', alignItems:'center', padding:'8px 10px', borderRadius:8, fontSize:13, color:'rgba(255,255,255,0.7)', textDecoration:'none', cursor:'pointer', width:'100%', textAlign:'left', background:'none', border:'none', fontFamily:'inherit' }
  const hov  = e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
  const unv  = e => e.currentTarget.style.background = 'none'
  return (
    <div style={{ background:'rgba(10,8,22,0.98)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:6, boxShadow:'0 8px 32px rgba(0,0,0,0.6)', backdropFilter:'blur(24px)', width:184 }}>
      <Link href="/profile"           onClick={onClose} style={base} onMouseEnter={hov} onMouseLeave={unv}>Profile</Link>
      <Link href="/settings"          onClick={onClose} style={base} onMouseEnter={hov} onMouseLeave={unv}>Settings</Link>
      <Link href="/settings?tab=plan" onClick={onClose} style={{ ...base, color:accentH, fontWeight:600 }} onMouseEnter={hov} onMouseLeave={unv}>
        {plan === 'free' ? 'Upgrade plan ✦' : 'Manage plan'}
      </Link>
      <div style={{ height:'0.5px', background:'rgba(255,255,255,0.07)', margin:'4px 0' }}/>
      <button onClick={onSignOut} style={{ ...base, color:'rgba(248,113,113,0.85)' }} onMouseEnter={hov} onMouseLeave={unv}>Sign out</button>
    </div>
  )
}

// ── Nova Ambient ──────────────────────────────────────────────────────────────
function NovaAmbient({ pathname }) {
  const [open, setOpen]       = useState(false)
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [reply, setReply]     = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const send = async () => {
    if (!input.trim() || loading) return
    setLoading(true); setReply('')
    try {
      const res = await novaStream([{ role:'user', content:input }], { systemOverride:'You are Nova, a concise AI study assistant. Answer in 2-3 sentences.' })
      const reader = res.body.getReader(); const dec = new TextDecoder(); let full = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        dec.decode(value).split('\n').forEach(line => { if (line.startsWith('data:')) { try { const d=JSON.parse(line.slice(5)); if (d.delta) { full+=d.delta; setReply(full) } } catch {} } })
      }
    } catch { setReply('Something went wrong.') }
    setLoading(false)
  }

  if (pathname === '/ai-tutor') return null

  return (
    <>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:89, opacity:open?1:0, transition:'opacity 0.6s ease' }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right,rgba(99,102,241,0.06) 0%,transparent 26%),linear-gradient(to left,rgba(124,58,237,0.06) 0%,transparent 26%),linear-gradient(to top,rgba(124,58,237,0.05) 0%,transparent 20%)' }}/>
        <div style={{ position:'absolute', inset:0, boxShadow:'inset 0 0 0 2px rgba(99,102,241,0.22), inset 0 0 50px rgba(124,58,237,0.07)' }}/>
      </div>
      <div ref={ref} style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:100, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
        {open && (
          <div style={{ width:380, background:'rgba(10,8,22,0.95)', border:'1px solid rgba(139,92,246,0.3)', borderRadius:16, padding:16, backdropFilter:'blur(24px)', boxShadow:'0 8px 40px rgba(0,0,0,0.5)' }}>
            {reply && <div style={{ fontSize:13, color:'rgba(255,255,255,0.8)', marginBottom:10, lineHeight:1.6, maxHeight:120, overflowY:'auto' }}>{reply}</div>}
            <div style={{ display:'flex', gap:8 }}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask Nova anything…" autoFocus
                style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'8px 12px', fontSize:13, color:'#fff', outline:'none', fontFamily:'inherit' }}/>
              <button onClick={send} disabled={loading} style={{ height:36, padding:'0 14px', background:'rgba(124,58,237,0.5)', border:'1px solid rgba(167,139,250,0.4)', borderRadius:10, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                {loading?'…':'Ask'}
              </button>
            </div>
          </div>
        )}
        <button onClick={()=>setOpen(o=>!o)}
          style={{ height:36, padding:'0 16px', background:'rgba(10,8,22,0.88)', border:`1px solid rgba(139,92,246,${open?'0.6':'0.3'})`, borderRadius:20, display:'flex', alignItems:'center', gap:8, cursor:'pointer', backdropFilter:'blur(12px)', boxShadow:open?'0 0 20px rgba(124,58,237,0.4)':'0 2px 12px rgba(0,0,0,0.4)', transition:'all 0.2s' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="#c4b5fd" stroke="none"/></svg>
          <span style={{ fontSize:12, fontWeight:600, color:'rgba(196,181,253,0.9)' }}>Nova</span>
          {loading && <span style={{ width:6, height:6, borderRadius:'50%', background:'#c4b5fd', animation:'nova-pulse 1s infinite' }}/>}
        </button>
      </div>
    </>
  )
}

// ── Main Shell ────────────────────────────────────────────────────────────────
export default function Shell({ children }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const isMobile  = useIsMobile()
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth()

  // Always dark
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  const [cmdOpen, setCmdOpen]   = useState(false)
  const [cmdQuery, setCmdQuery] = useState('')
  const cmdInputRef = useRef(null)

  const [showNotifs,    setShowNotifs]    = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const bellRef  = useRef(null)
  const panelRef = useRef(null)

  // Two separate menus so each popup appears next to the avatar that triggered it
  const [showTopbarMenu,  setShowTopbarMenu]  = useState(false)
  const [showSidebarMenu, setShowSidebarMenu] = useState(false)
  const [sidebarMenuPos,  setSidebarMenuPos]  = useState({ bottom:0, left:0 })
  const topbarMenuWrapRef = useRef(null)
  const sidebarAvatarRef  = useRef(null)
  const sidebarMenuRef    = useRef(null)
  const contentRef        = useRef(null)   // scoped desktop fade — sidebar/topbar stays visible
  const hoverIgnoreRef    = useRef(false)  // blocks mouseenter for 120ms after focus restore

  // Fade only the content area on navigation, before the browser paints.
  // useLayoutEffect fires synchronously before paint so the new content
  // is never seen at full opacity mid-swap — no hard cut.
  const firstRender = useRef(true)
  useLayoutEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    const el = contentRef.current
    if (!el) return
    el.style.transition = 'none'
    el.style.opacity    = '0'
    el.style.transform  = 'translateY(4px)'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.18s ease, transform 0.18s ease'
        el.style.opacity    = '1'
        el.style.transform  = 'translateY(0)'
      })
    })
  }, [pathname])

  const [navHovered,    setNavHovered]    = useState(false)
  const [navTransition, setNavTransition] = useState(true)

  const accent    = getAccent(pathname)
  const role      = profile?.role || 'student'
  const navItems  = getNav(role)
  const plan      = profile?.plan || 'free'
  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || null

  // ── Role revert fix: refresh profile on every route change + window focus ──
  // Without this, a role saved in Settings doesn't propagate until a hard reload.
  useEffect(() => { refreshProfile?.() }, [pathname])
  useEffect(() => {
    const onFocus = () => refreshProfile?.()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // ── Nav lag fix: block hover events briefly after focus restore ──────────────
  // Race condition: on focus return the browser fires a synthetic mouseenter on
  // whatever element the cursor is over, which races against the reset and leaves
  // navTransition=false when the next real hover fires. hoverIgnoreRef blocks
  // onMouseEnter for 120ms — long enough for React to flush and browser to settle.
  useEffect(() => {
    const reset = () => {
      hoverIgnoreRef.current = true
      setNavHovered(false)
      setNavTransition(false)
      setTimeout(() => {
        hoverIgnoreRef.current = false
        setNavTransition(true)
      }, 120)
    }
    const onVis = () => { if (document.visibilityState === 'visible') reset() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', reset)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', reset)
    }
  }, [])

  useEffect(() => { document.body.setAttribute('data-path', pathname) }, [pathname])

  // ff-desktop-shell hide rule + nova-pulse keyframe moved to globals.css
  // so they apply at first paint without any JS execution.

  // Realtime role sync (picks up settings-page saves immediately, no need to refresh tab)
  useEffect(() => {
    if (!user) return
    const sub = supabase
      .channel('profile_sync_' + user.id)
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'profiles', filter:`id=eq.${user.id}` },
        () => refreshProfile?.())
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [user])

  // Notifications
  useEffect(() => {
    if (!user) return
    const fetch_ = async () => {
      const { data } = await supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50)
      if (data) { setNotifications(data); setUnreadCount(data.filter(n=>!n.read).length) }
    }
    fetch_()
    const sub = supabase.channel('notifs_'+user.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+user.id},
        p=>{setNotifications(prev=>[p.new,...prev]);setUnreadCount(c=>c+1)})
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [user])

  useEffect(() => {
    if (!showNotifs) return
    const h = e => { if (panelRef.current&&!panelRef.current.contains(e.target)&&bellRef.current&&!bellRef.current.contains(e.target)) setShowNotifs(false) }
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  }, [showNotifs])

  useEffect(() => {
    if (!showTopbarMenu && !showSidebarMenu) return
    const h = e => {
      if (showTopbarMenu  && topbarMenuWrapRef.current && !topbarMenuWrapRef.current.contains(e.target)) setShowTopbarMenu(false)
      if (showSidebarMenu && sidebarMenuRef.current   && !sidebarMenuRef.current.contains(e.target)
          && sidebarAvatarRef.current && !sidebarAvatarRef.current.contains(e.target)) setShowSidebarMenu(false)
    }
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  }, [showTopbarMenu,showSidebarMenu])

  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();setCmdOpen(v=>!v);setCmdQuery('')}
      if (e.key==='Escape'){setCmdOpen(false);setShowNotifs(false);setShowTopbarMenu(false);setShowSidebarMenu(false)}
    }
    window.addEventListener('keydown',onKey); return()=>window.removeEventListener('keydown',onKey)
  }, [])
  useEffect(()=>{if(cmdOpen&&cmdInputRef.current)cmdInputRef.current.focus()},[cmdOpen])

  async function handleSignOut() {
    setShowTopbarMenu(false); setShowSidebarMenu(false)
    await signOut()
    window.location.href = '/auth'
  }
  const markAllRead = async () => {
    if (!user) return
    await supabase.from('notifications').update({read:true}).eq('user_id',user.id).eq('read',false)
    setNotifications(prev=>prev.map(n=>({...n,read:true}))); setUnreadCount(0)
  }
  const markRead = async id => {
    await supabase.from('notifications').update({read:true}).eq('id',id)
    setNotifications(prev=>prev.map(n=>n.id===id?{...n,read:true}:n))
    setUnreadCount(c=>Math.max(0,c-1))
  }
  function openSidebarMenu() {
    if (sidebarAvatarRef.current) {
      const r = sidebarAvatarRef.current.getBoundingClientRect()
      setSidebarMenuPos({ bottom: window.innerHeight - r.top + 6, left: navHovered ? r.right + 8 : 66 })
    }
    setShowSidebarMenu(m=>!m)
  }

  const CMD_ITEMS = [
    {label:'Dashboard',     href:'/dashboard',     icon:'dashboard'},
    {label:'Nova',          href:'/ai-tutor',      icon:'nova'},
    {label:'Flashcards',    href:'/flashcards',    icon:'study'},
    {label:'Quiz',          href:'/quiz',          icon:'study'},
    {label:'Study Guide',   href:'/study-guide',   icon:'study'},
    {label:'Summarize',     href:'/summarize',     icon:'study'},
    {label:'Source Library',href:'/source-library',icon:'sources'},
    {label:'My Stuff',      href:'/my-stuff',      icon:'mystuff'},
    {label:'Assignments',   href:'/assignments',   icon:'assignments'},
    {label:'Teach',         href:'/teach',         icon:'teach'},
    {label:'Lesson Builder',href:'/lesson-builder',icon:'study'},
    {label:'Curriculum',    href:'/curriculum',    icon:'curriculum'},
    {label:'Collab Decks',  href:'/collab-decks',  icon:'collab'},
    {label:'My Progress',   href:'/my-progress',   icon:'progress'},
    {label:'Student Portal',href:'/student-portal',icon:'studentp'},
  ]
  const filteredCmds = cmdQuery ? CMD_ITEMS.filter(c=>c.label.toLowerCase().includes(cmdQuery.toLowerCase())) : CMD_ITEMS

  // StickyNotes intentionally excluded from mobile — backdrop-filter:blur causes
  // GPU compositing lag on iOS. Notes UX (drag, resize) doesn't suit mobile anyway.
  if (isMobile) return <MobileShell>{children}</MobileShell>

  return (
    <div className="ff-desktop-shell" style={{ display:'flex', height:'100dvh', overflow:'hidden', background:'#04030c', position:'relative' }}>

      <div style={{ position:'fixed', width:220, height:220, borderRadius:'50%', background:accent.h, filter:'blur(80px)', opacity:0.07, top:-40, left:-60, pointerEvents:'none', zIndex:0, transition:'background 0.6s ease' }}/>

      <NovaAmbient pathname={pathname}/>

      {cmdOpen&&<div onClick={()=>setCmdOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:200, backdropFilter:'blur(4px)' }}/>}
      {cmdOpen&&(
        <div style={{ position:'fixed', top:'18%', left:'50%', transform:'translateX(-50%)', width:'min(560px,calc(100vw - 32px))', background:'rgba(10,8,22,0.98)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,0.7)', zIndex:201, overflow:'hidden', backdropFilter:'blur(24px)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
            <I d={ICONS.search} s={14} color="rgba(255,255,255,0.3)"/>
            <input ref={cmdInputRef} value={cmdQuery} onChange={e=>setCmdQuery(e.target.value)} placeholder="Search pages and tools..." style={{ flex:1, background:'none', border:'none', outline:'none', color:'rgba(255,255,255,0.88)', fontSize:14, fontFamily:'inherit' }}/>
            <kbd style={{ fontSize:10, color:'rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:5, padding:'2px 6px' }}>Esc</kbd>
          </div>
          <div style={{ maxHeight:320, overflowY:'auto', padding:6 }}>
            {filteredCmds.length===0&&<div style={{ padding:24, textAlign:'center', color:'rgba(255,255,255,0.3)', fontSize:13 }}>No results</div>}
            {filteredCmds.map((item,idx)=>(
              <Link key={idx} href={item.href} onClick={()=>{setCmdOpen(false);setCmdQuery('')}}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, color:'rgba(255,255,255,0.75)', textDecoration:'none', fontSize:13, background:pathname===item.href?'rgba(255,255,255,0.06)':'none' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                onMouseLeave={e=>e.currentTarget.style.background=pathname===item.href?'rgba(255,255,255,0.06)':'none'}>
                <div style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <I d={ICONS[item.icon]||ICONS.dashboard} s={12} color="rgba(255,255,255,0.5)"/>
                </div>
                {item.label}
                {pathname===item.href&&<span style={{ marginLeft:'auto', fontSize:10, color:'rgba(255,255,255,0.3)' }}>current</span>}
              </Link>
            ))}
          </div>
          <div style={{ padding:'8px 16px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', fontSize:11, color:'rgba(255,255,255,0.25)' }}>
            <span>↑↓ navigate</span><span>⌘K toggle</span>
          </div>
        </div>
      )}

      {/* Sidebar user menu rendered at root — position:fixed escapes nav overflow:hidden */}
      {showSidebarMenu&&(
        <div ref={sidebarMenuRef} style={{ position:'fixed', bottom:sidebarMenuPos.bottom, left:sidebarMenuPos.left, zIndex:500 }}>
          <UserMenuItems accentH={accent.h} plan={plan} onClose={()=>setShowSidebarMenu(false)} onSignOut={handleSignOut}/>
        </div>
      )}

      {/* ── Hover-expand nav ── */}
      <nav
        onMouseEnter={()=>{ if(!hoverIgnoreRef.current) setNavHovered(true) }}
        onMouseLeave={()=>setNavHovered(false)}
        style={{
          position:'relative', zIndex:10, flexShrink:0,
          width: navHovered ? 210 : 58,
          // ease-out instead of spring — no overshoot that accumulates into lag
          transition: navTransition ? 'width 0.22s ease-out' : 'none',
          background:'rgba(255,255,255,0.025)',
          borderRight:'0.5px solid rgba(255,255,255,0.07)',
          display:'flex', flexDirection:'column', overflow:'hidden',
        }}>

        {/* Logo — matches landing page squircle */}
        <div style={{ height:52, display:'flex', alignItems:'center', padding:'0 14px', gap:10, borderBottom:'0.5px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
          <FlashfoLogo size={28}/>
          <span style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.85)', whiteSpace:'nowrap', opacity:navHovered?1:0, transform:navHovered?'translateX(0)':'translateX(-8px)', transition:'opacity 0.18s 0.1s, transform 0.18s 0.1s' }}>Flashfo</span>
        </div>

        {/* Nav items */}
        <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:'6px 0' }}>
          {navItems.map((item,i)=>{
            if (item.sep) return <div key={i} style={{ height:'0.5px', background:'rgba(255,255,255,0.06)', margin:'5px 10px' }}/>
            if (item.section!==undefined) return item.section?(
              <div key={i} style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)', padding:'0 15px', margin:'8px 0 3px', whiteSpace:'nowrap', opacity:navHovered?1:0, transition:'opacity 0.17s 0.12s' }}>{item.section}</div>
            ):null
            const active = pathname===item.href||pathname.startsWith(item.href+'/')
            const locked = !canAccess(plan,item.minPlan)
            return(
              <Link key={item.href} href={locked?'#':item.href}
                onClick={locked?e=>{e.preventDefault();alert(`Upgrade to access ${item.label}.`)}:undefined}
                title={!navHovered?item.label:undefined}
                style={{ display:'flex', alignItems:'center', height:36, padding:'0 14px', gap:10,
                  borderLeft:`2px solid ${active?accent.h:'transparent'}`,
                  background:active?`rgba(${accent.r},0.1)`:'transparent',
                  textDecoration:'none', cursor:locked?'not-allowed':'pointer',
                  opacity:locked?0.4:1, transition:'background 0.14s, border-color 0.5s' }}
                onMouseEnter={e=>{if(!active&&!locked)e.currentTarget.style.background='rgba(255,255,255,0.04)'}}
                onMouseLeave={e=>{e.currentTarget.style.background=active?`rgba(${accent.r},0.1)`:'transparent'}}>
                <I d={ICONS[item.icon]||ICONS.dashboard} s={16} color={active?accent.h:'rgba(255,255,255,0.35)'}/>
                <span style={{ fontSize:13, color:active?'rgba(255,255,255,0.9)':'rgba(255,255,255,0.45)', whiteSpace:'nowrap', fontWeight:active?500:400, opacity:navHovered?1:0, transition:'opacity 0.17s 0.08s' }}>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ borderTop:'0.5px solid rgba(255,255,255,0.07)', padding:'4px 0', flexShrink:0 }}>
          <Link href="/settings"
            style={{ display:'flex', alignItems:'center', height:36, padding:'0 14px', gap:10, textDecoration:'none', borderLeft:`2px solid ${pathname==='/settings'?accent.h:'transparent'}`, background:pathname==='/settings'?`rgba(${accent.r},0.1)`:'transparent' }}>
            <I d={ICONS.settings} s={16} color="rgba(255,255,255,0.3)"/>
            <span style={{ fontSize:13, color:'rgba(255,255,255,0.35)', whiteSpace:'nowrap', opacity:navHovered?1:0, transition:'opacity 0.17s 0.08s' }}>Settings</span>
          </Link>
          <div ref={sidebarAvatarRef} onClick={openSidebarMenu}
            style={{ display:'flex', alignItems:'center', height:44, padding:'0 12px', gap:10, cursor:'pointer', borderTop:'0.5px solid rgba(255,255,255,0.06)' }}>
            <Avatar user={user} profile={profile} size={26} accentH={accent.h}/>
            <div style={{ opacity:navHovered?1:0, transition:'opacity 0.17s 0.08s', minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:500, color:'rgba(255,255,255,0.75)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:128 }}>{firstName||'Account'}</div>
              <div style={{ fontSize:10, color:accent.h, fontWeight:600 }}>{plan==='lifetime'?'Lifetime ✦':plan.charAt(0).toUpperCase()+plan.slice(1)}</div>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main content area ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, position:'relative' }}>

        {/* Topbar — hidden on /ai-tutor (Nova manages its own full-height layout) */}
        {pathname !== '/ai-tutor' && <div style={{ height:52, flexShrink:0, display:'flex', alignItems:'center', padding:'0 20px', gap:10, borderBottom:'0.5px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.015)', position:'relative', zIndex:5 }}>
          <span style={{ fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.65)' }}>
            {navItems.find(n=>n.href&&(pathname===n.href||pathname.startsWith(n.href+'/')))?.label||'Flashfo'}
          </span>

          {/* Right group — explicit height:32 on wrapper so all items sit on same baseline */}
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8, height:32 }}>

            {/* Search */}
            <button onClick={()=>{setCmdOpen(true);setCmdQuery('')}}
              style={{ height:32, padding:'0 10px', background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:9, display:'flex', alignItems:'center', gap:6, cursor:'pointer', flexShrink:0 }}>
              <I d={ICONS.search} s={12} color="rgba(255,255,255,0.25)"/>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>Search</span>
              <kbd style={{ fontSize:9, color:'rgba(255,255,255,0.18)', background:'rgba(255,255,255,0.06)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:4, padding:'1px 5px' }}>⌘K</kbd>
            </button>

            {/* Notifications */}
            <div style={{ position:'relative', height:32, display:'flex', alignItems:'center', flexShrink:0 }}>
              <button ref={bellRef} onClick={()=>setShowNotifs(v=>!v)}
                style={{ width:32, height:32, borderRadius:9, background:showNotifs?'rgba(255,255,255,0.08)':'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
                <I d={ICONS.notif} s={14} color="rgba(255,255,255,0.45)"/>
                {unreadCount>0&&<div style={{ position:'absolute', top:-3, right:-3, width:14, height:14, borderRadius:'50%', background:accent.h, fontSize:8, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>{unreadCount>9?'9+':unreadCount}</div>}
              </button>
              {showNotifs&&(
                <div ref={panelRef} style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:320, background:'rgba(10,8,22,0.98)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, boxShadow:'0 12px 40px rgba(0,0,0,0.6)', zIndex:50, backdropFilter:'blur(24px)', overflow:'hidden' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.8)' }}>Notifications</span>
                    {unreadCount>0&&<button onClick={markAllRead} style={{ fontSize:11, color:accent.h, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Mark all read</button>}
                  </div>
                  <div style={{ maxHeight:320, overflowY:'auto' }}>
                    {notifications.length===0?(
                      <div style={{ padding:32, textAlign:'center', color:'rgba(255,255,255,0.3)', fontSize:13 }}>All caught up ✓</div>
                    ):notifications.slice(0,20).map(n=>(
                      <div key={n.id} onClick={()=>{markRead(n.id);if(n.link)router.push(n.link);setShowNotifs(false)}}
                        style={{ padding:'10px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.05)', cursor:n.link?'pointer':'default', background:n.read?'transparent':'rgba(255,255,255,0.03)' }}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                        onMouseLeave={e=>e.currentTarget.style.background=n.read?'transparent':'rgba(255,255,255,0.03)'}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {!n.read&&<div style={{ width:6, height:6, borderRadius:'50%', background:accent.h, flexShrink:0 }}/>}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:500, color:'rgba(255,255,255,0.8)', marginBottom:2 }}>{n.title}</div>
                            {n.body&&<div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.body}</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Topbar avatar — 32×32 wrapper matches other button sizes, popup is absolute below */}
            <div ref={topbarMenuWrapRef} style={{ position:'relative', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <div onClick={()=>setShowTopbarMenu(m=>!m)} style={{ cursor:'pointer', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Avatar user={user} profile={profile} size={28} accentH={accent.h}/>
              </div>
              {showTopbarMenu&&(
                <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, zIndex:200 }}>
                  <UserMenuItems accentH={accent.h} plan={plan} onClose={()=>setShowTopbarMenu(false)} onSignOut={handleSignOut}/>
                </div>
              )}
            </div>
          </div>
        </div>}

        {/* Page content — overflow:hidden on /ai-tutor so Nova controls its own scroll */}
        <div style={{ flex:1, overflow: pathname === '/ai-tutor' ? 'hidden' : 'auto', overflowX:'hidden', WebkitOverflowScrolling:'touch', background:'#04030c', position:'relative' }}>
          {pathname !== '/ai-tutor' && <div style={{ position:'fixed', top:52, left:58, right:0, bottom:0, pointerEvents:'none', zIndex:0, background:`radial-gradient(ellipse 40% 30% at 80% 10%, rgba(${accent.r},0.06) 0%, transparent 70%)`, transition:'background 0.7s ease' }}/>}
          <div ref={contentRef} style={{ position:'relative', zIndex:1, height: pathname === '/ai-tutor' ? '100%' : undefined }}>{children}</div>
        </div>
      </div>

      {!pathname.startsWith('/ai-tutor') && <StickyNotes/>}
    </div>
  )
}
