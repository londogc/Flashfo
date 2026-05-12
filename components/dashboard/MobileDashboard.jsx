'use client'
// Flashfo — MobileDashboard
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ── Inline SVG icons (no Tabler font needed) ─────────────────────────────────
function TI({ name, size=16, color='currentColor', style={} }) {
  const s = { display:'block', flexShrink:0, ...style }
  const p = { fill:'none', stroke:color, strokeWidth:1.8, strokeLinecap:'round', strokeLinejoin:'round' }
  switch(name) {
    case 'cards':         return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><rect {...p} x="2" y="5" width="20" height="14" rx="2"/><path {...p} d="M16 2l2 3M6 2l2 3M2 10h20"/></svg>
    case 'help-circle':   return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><circle {...p} cx="12" cy="12" r="10"/><path {...p} d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
    case 'file-text':     return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><path {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path {...p} d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
    case 'search':        return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><circle {...p} cx="11" cy="11" r="8"/><path {...p} d="M21 21l-4.35-4.35"/></svg>
    case 'book':          return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><path {...p} d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z"/></svg>
    case 'layout':        return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><rect {...p} x="3" y="3" width="18" height="18" rx="2"/><path {...p} d="M3 9h18M9 21V9"/></svg>
    case 'users':         return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><path {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle {...p} cx="9" cy="7" r="4"/><path {...p} d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
    case 'calendar':      return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><rect {...p} x="3" y="4" width="18" height="18" rx="2"/><path {...p} d="M16 2v4M8 2v4M3 10h18"/></svg>
    case 'school':        return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><path {...p} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
    case 'chalkboard':    return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><rect {...p} x="2" y="3" width="20" height="14" rx="1"/><path {...p} d="M8 21h8M12 17v4"/></svg>
    case 'flame':         return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><path {...p} d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z"/></svg>
    case 'device-gamepad-2': return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><rect {...p} x="2" y="6" width="20" height="12" rx="2"/><path {...p} d="M6 12h4M8 10v4M15 11h.01M17 13h.01"/></svg>
    case 'download':      return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><path {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
    case 'user-check':    return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><path {...p} d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle {...p} cx="8.5" cy="7" r="4"/><path {...p} d="M17 11l2 2 4-4"/></svg>
    case 'clock':         return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><circle {...p} cx="12" cy="12" r="10"/><path {...p} d="M12 6v6l4 2"/></svg>
    case 'sparkles':      return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><path {...p} d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM5 18l.75 2.25L8 21l-2.25.75L5 24l-.75-2.25L2 21l2.25-.75L5 18zM19 2l.5 1.5L21 4l-1.5.5L19 6l-.5-1.5L17 4l1.5-.5L19 2z"/></svg>
    default:              return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><circle {...p} cx="12" cy="12" r="10"/></svg>
  }
}

// Creature SVG (self-contained, mirrors Shell.jsx)
function CreatureSVG({ id, size }) {
  const s = { width:size, height:size, viewBox:'0 0 60 60', xmlns:'http://www.w3.org/2000/svg', display:'block' }
  if (id==='cat') return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#1a2e1a"/><circle cx="30" cy="32" r="15" fill="#4ade80"/><ellipse cx="22" cy="18" rx="5" ry="8" fill="#86efac"/><ellipse cx="38" cy="18" rx="5" ry="8" fill="#86efac"/><ellipse cx="22" cy="20" rx="3.5" ry="5.5" fill="#4ade80"/><ellipse cx="38" cy="20" rx="3.5" ry="5.5" fill="#4ade80"/><circle cx="25" cy="30" r="5" fill="#fff"/><circle cx="35" cy="30" r="5" fill="#fff"/><circle cx="25" cy="30" r="3" fill="#166534"/><circle cx="35" cy="30" r="3" fill="#166534"/><circle cx="24" cy="29" r="1" fill="#fff"/><circle cx="34" cy="29" r="1" fill="#fff"/><ellipse cx="30" cy="36" rx="5" ry="2" fill="#86efac"/><path d="M27 38 Q30 41 33 38" stroke="#166534" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>)
  if (id==='alien') return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#0f172a"/><ellipse cx="30" cy="35" rx="16" ry="13" fill="#818cf8"/><circle cx="30" cy="22" r="12" fill="#a5b4fc"/><circle cx="30" cy="13" r="5" fill="#c7d2fe"/><ellipse cx="22" cy="22" rx="4" ry="7" fill="#6366f1"/><ellipse cx="38" cy="22" rx="4" ry="7" fill="#6366f1"/><circle cx="26" cy="22" r="4.5" fill="#fff"/><circle cx="34" cy="22" r="4.5" fill="#fff"/><circle cx="26" cy="22" r="2.8" fill="#312e81"/><circle cx="34" cy="22" r="2.8" fill="#312e81"/><circle cx="25" cy="21" r="1" fill="#fff"/><circle cx="33" cy="21" r="1" fill="#fff"/><ellipse cx="30" cy="29" rx="4" ry="1.5" fill="#c7d2fe"/><path d="M27 31 Q30 34 33 31" stroke="#312e81" strokeWidth="1.4" fill="none" strokeLinecap="round"/></svg>)
  if (id==='fox') return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#2d1a00"/><ellipse cx="30" cy="38" rx="14" ry="11" fill="#f97316"/><circle cx="30" cy="24" r="12" fill="#f97316"/><ellipse cx="30" cy="13" rx="7" ry="4.5" fill="#fb923c"/><rect x="27.5" y="9" width="5" height="7" rx="2.5" fill="#fb923c"/><circle cx="25" cy="23" r="4.5" fill="#fff"/><circle cx="35" cy="23" r="4.5" fill="#fff"/><circle cx="25" cy="23" r="2.8" fill="#431407"/><circle cx="35" cy="23" r="2.8" fill="#431407"/><circle cx="24" cy="22" r="1" fill="#fff"/><circle cx="34" cy="22" r="1" fill="#fff"/><ellipse cx="24" cy="28" rx="3.5" ry="1.8" fill="#fed7aa" opacity="0.65"/><ellipse cx="36" cy="28" rx="3.5" ry="1.8" fill="#fed7aa" opacity="0.65"/><path d="M27 30 Q30 33 33 30" stroke="#431407" strokeWidth="1.4" fill="none" strokeLinecap="round"/><circle cx="19" cy="22" r="3" fill="#fb923c"/><circle cx="41" cy="22" r="3" fill="#fb923c"/></svg>)
  if (id==='dolphin') return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#001a2d"/><circle cx="30" cy="26" r="14" fill="#38bdf8"/><ellipse cx="18" cy="24" rx="5" ry="9" fill="#7dd3fc"/><ellipse cx="42" cy="24" rx="5" ry="9" fill="#7dd3fc"/><circle cx="25" cy="24" r="5" fill="#fff"/><circle cx="35" cy="24" r="5" fill="#fff"/><circle cx="25" cy="24" r="3" fill="#0c4a6e"/><circle cx="35" cy="24" r="3" fill="#0c4a6e"/><circle cx="24" cy="23" r="1.1" fill="#fff"/><circle cx="34" cy="23" r="1.1" fill="#fff"/><ellipse cx="30" cy="31" rx="4" ry="1.5" fill="#bae6fd"/><path d="M27 33 Q30 36 33 33" stroke="#0c4a6e" strokeWidth="1.4" fill="none" strokeLinecap="round"/><ellipse cx="30" cy="47" rx="12" ry="6" fill="#0ea5e9"/><path d="M14 43 Q8 35 14 28" stroke="#38bdf8" strokeWidth="4" fill="none" strokeLinecap="round"/><path d="M46 43 Q52 35 46 28" stroke="#38bdf8" strokeWidth="4" fill="none" strokeLinecap="round"/></svg>)
  if (id==='wizard') return(<svg {...s}><circle cx="30" cy="30" r="30" fill="#1a0a2e"/><ellipse cx="30" cy="42" rx="16" ry="12" fill="#a855f7"/><circle cx="30" cy="24" r="13" fill="#c084fc"/><path d="M17 20 Q30 7 43 20 L42 16 Q30 5 18 16Z" fill="#7e22ce"/><circle cx="25" cy="24" r="4" fill="#fff"/><circle cx="35" cy="24" r="4" fill="#fff"/><circle cx="25" cy="24" r="2.5" fill="#581c87"/><circle cx="35" cy="24" r="2.5" fill="#581c87"/><circle cx="24" cy="23" r="0.9" fill="#fff"/><circle cx="34" cy="23" r="0.9" fill="#fff"/><ellipse cx="24" cy="29" rx="3.5" ry="1.5" fill="#e9d5ff" opacity="0.65"/><ellipse cx="36" cy="29" rx="3.5" ry="1.5" fill="#e9d5ff" opacity="0.65"/><path d="M27 31 Q30 34 33 31" stroke="#581c87" strokeWidth="1.4" fill="none" strokeLinecap="round"/><circle cx="17" cy="30" r="4" fill="#a855f7"/><circle cx="43" cy="30" r="4" fill="#a855f7"/></svg>)
  return null
}

function Avatar({ user, profile, size = 36 }) {
  const initials = ((profile?.full_name || user?.email || 'U').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase())
  if (profile?.avatar_url) return <img src={profile.avatar_url} alt="" style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover' }} />
  if (profile?.avatar_id)  return <div style={{ width:size, height:size, borderRadius:'50%', overflow:'hidden', flexShrink:0 }}><CreatureSVG id={profile.avatar_id} size={size} /></div>
  return <div style={{ width:size, height:size, borderRadius:'50%', background:'#1d4ed8', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:size*0.38, fontWeight:700, flexShrink:0 }} suppressHydrationWarning>{initials}</div>
}

const HERO_COLORS = [
  ['rgba(99,102,241,0.35)','rgba(167,139,250,0.22)'],
  ['rgba(37,99,235,0.32)', 'rgba(96,165,250,0.2)'],
  ['rgba(124,58,237,0.32)','rgba(196,181,253,0.2)'],
  ['rgba(5,150,105,0.28)', 'rgba(52,211,153,0.18)'],
]

function ParticleCanvas({ colorIdx = 0 }) {
  const ref = useRef(null)
  const rafRef = useRef(null)
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.offsetWidth || 308, H = canvas.offsetHeight || 118
    canvas.width = W; canvas.height = H
    const pts = Array.from({length:35}, () => ({
      x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-.5)*.32, vy:(Math.random()-.5)*.18,
      r:Math.random()*1.3+.3, col:`hsl(${240+Math.random()*60},70%,75%)`,
    }))
    const [c1,c2] = HERO_COLORS[colorIdx % HERO_COLORS.length]
    function draw() {
      ctx.clearRect(0,0,W,H); ctx.fillStyle='rgba(12,10,30,0.88)'; ctx.fillRect(0,0,W,H)
      const g=ctx.createRadialGradient(W*.75,H*.25,0,W*.75,H*.25,100); g.addColorStop(0,c1); g.addColorStop(1,'transparent')
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
      const g2=ctx.createRadialGradient(W*.2,H*.75,0,W*.2,H*.75,70); g2.addColorStop(0,c2); g2.addColorStop(1,'transparent')
      ctx.fillStyle=g2; ctx.fillRect(0,0,W,H)
      for(let i=0;i<pts.length;i++){
        for(let j=i+1;j<pts.length;j++){
          const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy)
          if(d<48){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle=`rgba(129,140,248,${(1-d/48)*.14})`;ctx.lineWidth=.5;ctx.stroke()}
        }
        ctx.beginPath();ctx.arc(pts[i].x,pts[i].y,pts[i].r,0,Math.PI*2);ctx.fillStyle=pts[i].col;ctx.globalAlpha=.5;ctx.fill();ctx.globalAlpha=1
        pts[i].x+=pts[i].vx;pts[i].y+=pts[i].vy
        if(pts[i].x<0||pts[i].x>W)pts[i].vx*=-1;if(pts[i].y<0||pts[i].y>H)pts[i].vy*=-1
      }
      rafRef.current=requestAnimationFrame(draw)
    }
    draw()
    return ()=>{if(rafRef.current)cancelAnimationFrame(rafRef.current)}
  },[colorIdx])
  return <canvas ref={ref} style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
}

const QUICK_TOOLS = [
  { href:'/flashcards',    label:'Flashcards',  desc:'Build a deck',     icon:'cards',       bg:'linear-gradient(135deg,#6366f1,#818cf8)', glow:'#6366f1', ic:'rgba(99,102,241,0.3)',  icCol:'#a5b4fc' },
  { href:'/quiz',          label:'Quiz',         desc:'Test yourself',    icon:'help-circle', bg:'linear-gradient(135deg,#7c3aed,#a78bfa)', glow:'#7c3aed', ic:'rgba(124,58,237,0.3)', icCol:'#c4b5fd' },
  { href:'/summarize',     label:'Summarize',    desc:'Shorten any text', icon:'file-text',   bg:'linear-gradient(135deg,#059669,#34d399)', glow:'#059669', ic:'rgba(5,150,105,0.3)',  icCol:'#6ee7b7' },
  { href:'/search',        label:'Search',       desc:'Find sources',     icon:'search',      bg:'linear-gradient(135deg,#2563eb,#60a5fa)', glow:'#2563eb', ic:'rgba(37,99,235,0.3)',  icCol:'#93c5fd' },
  { href:'/study-guide',   label:'Study guide',  desc:'Structured notes', icon:'book',        bg:'linear-gradient(135deg,#d97706,#fbbf24)', glow:'#d97706', ic:'rgba(217,119,6,0.3)',  icCol:'#fde68a' },
  { href:'/lesson-builder',label:'Lesson plan',  desc:'For teachers',     icon:'layout',      bg:'linear-gradient(135deg,#db2777,#f472b6)', glow:'#db2777', ic:'rgba(219,39,119,0.3)', icCol:'#fbcfe8' },
]

const MORE_TOOLS = [
  { href:'/collab-decks',   label:'Collab Decks',    icon:'users' },
  { href:'/curriculum',     label:'Curriculum',       icon:'calendar' },
  { href:'/student-portal', label:'Student Portal',   icon:'school' },
  { href:'/lesson-builder', label:'Lesson Builder',   icon:'chalkboard' },
  { href:'/study-guide',    label:'Weakness Heatmap', icon:'flame' },
  { href:'/study-together', label:'Study Together',   icon:'device-gamepad-2' },
  { href:'/import',         label:'Import',            icon:'download' },
  { href:'/for-parents',    label:'Parent Dashboard',  icon:'user-check' },
]

const BAD = ['kill','killed','murder','assassin','massacre','genocide','execut','suicide','terror','bomb','attack','shot','hung','hanged','beheaded','lynch','slaughter','riot','civil war','world war','holocaust','rape','torture','hostage','hijack','crash killed','died in','casualties','wounded']

function greeting() {
  const h = new Date().getHours()
  if(h<12)return'Good morning'; if(h<18)return'Good afternoon'; return'Good evening'
}

function typeLabel(t){return({flashcards:'Flashcards',quiz:'Quiz',summary:'Summary',study_guide:'Study Guide',lesson_plan:'Lesson Plan',conversation:'Nova Chat'})[t]||t}
function typeIcon(t){return({flashcards:'cards',quiz:'help-circle',summary:'file-text',study_guide:'book',lesson_plan:'layout',conversation:'sparkles'})[t]||'file'}
function chipColor(t){
  return({
    flashcards:  {dot:'#a78bfa',grad:'linear-gradient(90deg,#6366f1,#a78bfa)'},
    quiz:        {dot:'#60a5fa',grad:'linear-gradient(90deg,#2563eb,#60a5fa)'},
    summary:     {dot:'#34d399',grad:'linear-gradient(90deg,#059669,#34d399)'},
    study_guide: {dot:'#fbbf24',grad:'linear-gradient(90deg,#d97706,#fbbf24)'},
    lesson_plan: {dot:'#f472b6',grad:'linear-gradient(90deg,#db2777,#f472b6)'},
    conversation:{dot:'#c4b5fd',grad:'linear-gradient(90deg,#7c3aed,#a78bfa)'},
  })[t]||{dot:'#a78bfa',grad:'linear-gradient(90deg,#6366f1,#a78bfa)'}
}

function timeAgo(d){
  if(!d)return''
  const diff=(Date.now()-new Date(d))/1000
  if(diff<60)return'just now'; if(diff<3600)return`${Math.floor(diff/60)}m ago`
  if(diff<86400)return`${Math.floor(diff/3600)}h ago`; return`${Math.floor(diff/86400)}d ago`
}

function ContinueCard({ items }) {
  const router = useRouter()
  const [cur,setCur]=useState(0)
  const timerRef=useRef(null)
  const lastSaved=items[0]||null
  const lastOpened=items.find((it,i)=>i>0&&it.type!==lastSaved?.type)||items[1]||null
  const lastNova=items.find(it=>it.type==='conversation')||null
  const totalItems=items.length
  const quizItem=items.find(it=>it.type==='quiz')
  const quizScore=quizItem?.data?.score!=null?`${Math.round(quizItem.data.score)}%`:(quizItem?`${quizItem.data?.questions?.length||0}q`:'—')
  const novaCount=items.filter(it=>it.type==='conversation').length

  const ROUTE_FOR_TYPE = {
    flashcards:'/flashcards', quiz:'/quiz', summary:'/summarize',
    study_guide:'/study-guide', lesson_plan:'/lesson-builder', conversation:'/ai-tutor'
  }

  const SLIDES=[
    lastSaved  &&{type:lastSaved.type,  label:'Last Saved',        item:lastSaved,  colorIdx:0},
    lastOpened &&{type:lastOpened.type, label:'Recently Opened',    item:lastOpened, colorIdx:1},
    lastNova   &&{type:'conversation',  label:'Continue with Nova', item:lastNova,   colorIdx:2},
    {type:'snapshot',label:"Today's Snapshot",colorIdx:3},
  ].filter(Boolean)

  const total=SLIDES.length
  const advance=useCallback(()=>setCur(c=>(c+1)%total),[total])
  useEffect(()=>{timerRef.current=setInterval(advance,5000);return()=>clearInterval(timerRef.current)},[advance])
  function jump(i,e){e?.stopPropagation();clearInterval(timerRef.current);setCur(i);timerRef.current=setInterval(advance,5000)}
  function prev(e){e.stopPropagation();jump((cur-1+total)%total)}
  function next(e){e.stopPropagation();jump((cur+1)%total)}

  function openCard() {
    const slide=SLIDES[cur]
    if(!slide||slide.type==='snapshot') return
    const route=ROUTE_FOR_TYPE[slide.type]||'/my-stuff'
    if(slide.type==='conversation' && slide.item?.data?.messages?.length) {
      try { localStorage.setItem('flashfo_nova_handoff', JSON.stringify(slide.item.data.messages)) } catch(_) {}
    }
    router.push(route)
  }

  const touchStartX = useRef(null)
  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 40) return // too small — treat as tap
    if (dx < 0) jump((cur+1)%total)       // swipe left → next
    else         jump((cur-1+total)%total) // swipe right → prev
  }

  const slide=SLIDES[cur]; const colors=chipColor(slide?.type)
  const isClickable = slide?.type && slide.type !== 'snapshot'

  return(
    <div style={{position:'relative',height:118,borderRadius:20,overflow:'hidden',border:'0.5px solid rgba(255,255,255,0.1)',marginBottom:14,
      cursor:isClickable?'pointer':'default'}}
      onClick={openCard}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}>
      <ParticleCanvas colorIdx={slide?.colorIdx??0}/>
      <div style={{position:'absolute',inset:0,zIndex:2,display:'flex',flexDirection:'column',justifyContent:'space-between',padding:'14px 16px'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:5,background:'rgba(255,255,255,0.1)',backdropFilter:'blur(8px)',border:'0.5px solid rgba(255,255,255,0.18)',borderRadius:20,padding:'3px 9px',width:'fit-content'}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:colors.dot,boxShadow:`0 0 5px ${colors.dot}`}}/>
          <span style={{fontSize:10,fontWeight:500,color:'rgba(255,255,255,0.85)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{slide?.label}</span>
        </div>
        {slide?.type==='snapshot'?(
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
            {[{val:totalItems,label:'Saved',sub:'items total'},{val:novaCount,label:'Nova',sub:'conversations'},{val:quizScore,label:'Last quiz',sub:quizItem?.title?.slice(0,12)||'—'}].map((s,i)=>(
              <div key={i} style={{display:'flex',flexDirection:'column',gap:3,background:'rgba(255,255,255,0.07)',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'7px 8px'}}>
                <div style={{fontSize:17,fontWeight:700,color:'#fff',letterSpacing:'-0.5px',lineHeight:1}}>{s.val}</div>
                <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.07em'}}>{s.label}</div>
                <div style={{fontSize:9,color:'rgba(255,255,255,0.3)',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{s.sub}</div>
              </div>
            ))}
          </div>
        ):(
          <div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginBottom:2}}>{typeLabel(slide?.item?.type)} · {timeAgo(slide?.item?.created_at)}</div>
            <div style={{fontSize:15,fontWeight:600,color:'#fff',letterSpacing:'-0.2px',marginBottom:7,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{slide?.item?.title||'Untitled'}</div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {slide?.type!=='conversation'?(
                <><div style={{flex:1,height:3,background:'rgba(255,255,255,0.1)',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:4,background:colors.grad,width:'60%'}}/>
                </div><span style={{fontSize:10,color:'rgba(255,255,255,0.45)',whiteSpace:'nowrap'}}>
                  {slide?.item?.data?.cards?.length?`${slide.item.data.cards.length} cards`:slide?.item?.data?.questions?.length?`${slide.item.data.questions.length} questions`:'open'}
                </span></>
              ):(
                <span style={{fontSize:10,color:'rgba(255,255,255,0.35)'}}>{slide?.item?.data?.messages?.length||0} messages</span>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Prev/Next tap zones + dot indicators */}
      <div style={{position:'absolute',top:0,left:0,width:'35%',height:'100%',zIndex:5}} onClick={prev}/>
      <div style={{position:'absolute',top:0,right:0,width:'35%',height:'100%',zIndex:5}} onClick={next}/>
      <div style={{position:'absolute',bottom:9,left:'50%',transform:'translateX(-50%)',display:'flex',gap:5,zIndex:6}}>
        {SLIDES.map((_,i)=>(
          <div key={i} onClick={e=>jump(i,e)} style={{height:5,borderRadius:3,cursor:'pointer',width:i===cur?14:5,background:i===cur?'rgba(255,255,255,0.75)':'rgba(255,255,255,0.2)',transition:'all 0.3s'}}/>
        ))}
      </div>
    </div>
  )
}

function HistoryCard() {
  const [events,setEvents]=useState([])
  const [idx,setIdx]=useState(0)
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    const now=new Date(),month=now.getMonth()+1,day=now.getDate()
    fetch(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${month}/${day}`)
      .then(r=>r.json()).then(data=>{
        const items=(data.selected||[]).filter(e=>{
          if(!e.text||!e.year)return false
          const low=e.text.toLowerCase()
          return!BAD.some(w=>low.includes(w))
        }).slice(0,6).map(e=>({year:e.year,text:e.text}))
        setEvents(items);setLoading(false)
      }).catch(()=>setLoading(false))
  },[])
  const now=new Date(),label=now.toLocaleDateString('en-US',{month:'short',day:'numeric'}),ev=events[idx]
  return(
    <div style={{background:'rgba(30,27,48,0.9)',border:'0.5px solid rgba(255,255,255,0.09)',borderRadius:16,padding:14,marginBottom:12}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <div style={{width:28,height:28,borderRadius:8,background:'rgba(251,146,60,0.15)',border:'0.5px solid rgba(251,146,60,0.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <TI name="clock" size={14} color="#fb923c"/>
          </div>
          <span style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.1em'}}>This Day in History</span>
        </div>
        <span style={{fontSize:11,fontWeight:600,color:'#fb923c'}}>{label}</span>
      </div>
      {loading?(<div style={{height:60,background:'rgba(255,255,255,0.05)',borderRadius:8}}/>):ev&&(
        <>
          <div style={{display:'inline-block',background:'rgba(251,146,60,0.18)',border:'0.5px solid rgba(251,146,60,0.35)',color:'#fb923c',fontSize:12,fontWeight:700,padding:'2px 9px',borderRadius:6,marginBottom:7}}>{ev.year}</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.78)',lineHeight:1.5}}>{ev.text}</div>
          {events.length>1&&(
            <div style={{display:'flex',gap:5,marginTop:12,alignItems:'center'}}>
              {events.map((_,i)=>(
                <div key={i} onClick={()=>setIdx(i)} style={{height:6,borderRadius:3,cursor:'pointer',width:i===idx?18:6,background:i===idx?'#fb923c':'rgba(255,255,255,0.15)',transition:'all 0.3s'}}/>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function MobileDashboard() {
  const {user,profile,loading}=useAuth()
  const [items,setItems]=useState([])

  useEffect(()=>{
    if(!user)return
    supabase.from('saved_items').select('id,type,title,data,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(12)
      .then(({data})=>{if(data)setItems(data)})
  },[user])

  const firstName=(profile?.full_name||user?.email||'').split(' ')[0]||'there'

  if(loading) return (
    <div style={{padding:'34px 20px 12px',fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <div style={{height:11,width:90,borderRadius:6,background:'rgba(255,255,255,0.07)'}}/>
          <div style={{height:20,width:130,borderRadius:8,background:'rgba(255,255,255,0.1)'}}/>
        </div>
        <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.08)'}}/>
      </div>
      <div style={{height:118,borderRadius:20,background:'rgba(255,255,255,0.05)',border:'0.5px solid rgba(255,255,255,0.08)',marginBottom:14}}/>
      <div style={{height:11,width:80,borderRadius:6,background:'rgba(255,255,255,0.06)',marginBottom:9}}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:9}}>
        {[0,1,2,3,4,5].map(i=>(
          <div key={i} style={{height:88,borderRadius:16,background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.07)'}}/>
        ))}
      </div>
    </div>
  )

  return(
    <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif',color:'#fff'}}>
      <div style={{padding:'34px 20px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',letterSpacing:'0.04em'}}>{greeting()}</div>
          <div style={{fontSize:18,fontWeight:600,letterSpacing:'-0.3px'}}>{firstName}</div>
        </div>
        <a href="/profile" style={{touchAction:'manipulation',WebkitTapHighlightColor:'transparent',textDecoration:'none',borderRadius:'50%',border:'1.5px solid rgba(255,255,255,0.2)',overflow:'hidden',display:'block'}}>
          <Avatar user={user} profile={profile} size={36}/>
        </a>
      </div>
      <div style={{padding:'0 16px'}}>
        {items.length>0?(<ContinueCard items={items}/>):(
          <div style={{height:118,borderRadius:20,marginBottom:14,overflow:'hidden',background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.08)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6}}>
            <TI name="sparkles" size={24} color="rgba(255,255,255,0.3)"/>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Start creating to see your progress here</div>
          </div>
        )}
        <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:9}}>Quick tools</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:9,marginBottom:12}}>
          {QUICK_TOOLS.map(t=>(
            <a key={t.href} href={t.href} style={{borderRadius:16,padding:'13px 12px 12px',display:'flex',flexDirection:'column',gap:9,textDecoration:'none',position:'relative',overflow:'hidden',border:'0.5px solid rgba(255,255,255,0.08)',touchAction:'manipulation',WebkitTapHighlightColor:'transparent'}}>
              <div style={{position:'absolute',inset:0,background:t.bg,opacity:0.12}}/>
              <div style={{position:'absolute',top:-10,right:-10,width:60,height:60,borderRadius:'50%',background:`radial-gradient(${t.glow},transparent)`,opacity:0.4}}/>
              <div style={{width:34,height:34,borderRadius:10,background:t.ic,color:t.icCol,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',zIndex:1}}>
                <TI name={t.icon} size={17} color={t.icCol}/>
              </div>
              <div style={{position:'relative',zIndex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.92)'}}>{t.label}</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:1}}>{t.desc}</div>
              </div>
            </a>
          ))}
        </div>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:9}}>More tools</div>
        <div style={{display:'flex',gap:7,overflowX:'auto',paddingBottom:12,WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
          {MORE_TOOLS.map(t=>(
            <a key={t.href} href={t.href} style={{display:'flex',alignItems:'center',gap:6,flexShrink:0,background:'rgba(255,255,255,0.05)',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:20,padding:'6px 12px',textDecoration:'none',touchAction:'manipulation',WebkitTapHighlightColor:'transparent'}}>
              <TI name={t.icon} size={13} color="rgba(255,255,255,0.45)"/>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.65)',fontWeight:500,whiteSpace:'nowrap'}}>{t.label}</span>
            </a>
          ))}
        </div>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:9}}>This day in history</div>
        <HistoryCard/>
      </div>
    </div>
  )
}
