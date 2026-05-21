'use client'
// Flashfo — Nova AI Tutor
// Fix: removed DOM-manipulation useEffect that hid the Shell topbar (fragile, wrong approach).
// Shell now conditionally hides its own topbar on this route.
// Fix: height changed from 100dvh → 100% so the page fills the Shell content area exactly,
// keeping the input bar always visible.
import { rpc, novaStream } from '@/lib/api'
import { saveItem } from '@/lib/savedItems'
import { useAuth } from '@/lib/useAuth'
import { useState, useEffect, useRef, useCallback } from 'react'

const ORB_CSS = `
.nv-orb{border-radius:50%;background:radial-gradient(circle at 33% 33%,#c4b5fd,#7c3aed 40%,#4c1d95 70%,#08001a);position:relative;flex-shrink:0}
.nv-gloss{position:absolute;top:18%;left:23%;width:52%;height:37%;background:radial-gradient(ellipse at 42% 42%,rgba(255,255,255,.26),transparent 70%);border-radius:50%;pointer-events:none}
.nv-orb-idle{animation:nv-breathe 3.5s ease-in-out infinite}
.nv-orb-thinking{animation:nv-think 0.8s ease-in-out infinite}
.nv-orb-generating{animation:nv-gen 0.4s ease-in-out infinite}
@keyframes nv-breathe{0%,100%{box-shadow:0 0 55px rgba(124,58,237,.7),0 0 120px rgba(109,40,217,.4),inset 0 0 45px rgba(196,181,253,.2);transform:scale(1)}50%{box-shadow:0 0 80px rgba(124,58,237,.9),0 0 170px rgba(109,40,217,.55),inset 0 0 65px rgba(196,181,253,.32);transform:scale(1.05)}}
@keyframes nv-think{0%,100%{box-shadow:0 0 80px rgba(124,58,237,1),0 0 160px rgba(109,40,217,.7),inset 0 0 70px rgba(196,181,253,.35);transform:scale(1)}50%{box-shadow:0 0 110px rgba(167,139,250,1),0 0 220px rgba(124,58,237,.85),inset 0 0 95px rgba(196,181,253,.5);transform:scale(1.08)}}
@keyframes nv-gen{0%,100%{box-shadow:0 0 110px rgba(196,181,253,1),0 0 240px rgba(139,92,246,.9),inset 0 0 90px rgba(255,255,255,.35);transform:scale(1.03)}50%{box-shadow:0 0 150px rgba(255,255,255,.85),0 0 320px rgba(167,139,250,1),inset 0 0 120px rgba(255,255,255,.5);transform:scale(1.1)}}
.nv-ring{position:absolute;top:50%;left:50%;border-radius:50%;border-style:solid;animation:nv-orbit linear infinite;transform-origin:center;pointer-events:none}
@keyframes nv-orbit{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}
.nv-ring::before{content:'';position:absolute;top:0;left:50%;transform:translate(-50%,-50%);border-radius:50%}
.nv-r1{border-width:1px;border-color:rgba(129,140,248,.25);animation-duration:9s}
.nv-r1::before{width:7px;height:7px;background:#818cf8;box-shadow:0 0 10px #818cf8,0 0 20px rgba(129,140,248,.5)}
.nv-r2{border-width:1px;border-color:rgba(167,139,250,.16);animation-duration:14s;animation-direction:reverse}
.nv-r2::before{width:5px;height:5px;background:#a78bfa;box-shadow:0 0 8px #a78bfa}
.nv-r3{border-width:1px;border-color:rgba(99,102,241,.08);animation-duration:21s}
.nv-r3::before{width:4px;height:4px;background:#c4b5fd;box-shadow:0 0 6px #c4b5fd}
@keyframes nv-bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}
@keyframes nv-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.nv-msgs::-webkit-scrollbar{display:none}
.nv-ta::placeholder{color:rgba(255,255,255,.22)!important}
`

// ── Constellation background (replaces WebGL nebula) ─────────────────────────
function initConstellationBg(canvas) {
  if (!canvas || canvas._sInit) return
  canvas._sInit = true
  requestAnimationFrame(() => {
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    if (!W || !H) return
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    const ro = new ResizeObserver(() => {
      const nW = canvas.offsetWidth, nH = canvas.offsetHeight
      if (!nW || !nH) return
      canvas.width = nW; canvas.height = nH
    })
    ro.observe(canvas)
    const N = 55
    const dots = Array.from({length: N}, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .15,
      r: Math.random() < .15 ? 1.8 : 1.1,
      bright: .25 + Math.random() * .4, phase: Math.random() * Math.PI * 2,
    }))
    let t = 0, running = true
    canvas._stop = () => { running = false; ro.disconnect() }
    function draw() {
      if (!running) return
      t += .007
      const cW = canvas.width, cH = canvas.height
      ctx.clearRect(0, 0, cW, cH)
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy
        if (d.x < 0 || d.x > cW) d.vx *= -1
        if (d.y < 0 || d.y > cH) d.vy *= -1
      })
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 110) {
          ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y)
          ctx.strokeStyle = `rgba(196,181,253,${((1 - dist / 110) * .2).toFixed(2)})`
          ctx.lineWidth = .5; ctx.stroke()
        }
      }
      dots.forEach(d => {
        const tw = d.bright + Math.sin(t + d.phase) * .1
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(216,180,254,${tw.toFixed(2)})`; ctx.fill()
      })
      requestAnimationFrame(draw)
    }
    draw()
  })
}

// ── 3D constellation sphere (raw WebGL, no dependencies) ──────────────────────
function initSphere(canvas) {
  if (!canvas || canvas._sphInit) return
  canvas._sphInit = true
  requestAnimationFrame(() => {
    const S = canvas.offsetWidth || 140
    canvas.width = S; canvas.height = S
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false })
    if (!gl) return
    gl.viewport(0, 0, S, S)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    function mkSh(type, src) {
      const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh)
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null
    }
    function mkProg(vs, fs) {
      const v = mkSh(gl.VERTEX_SHADER, vs), f = mkSh(gl.FRAGMENT_SHADER, fs)
      if (!v || !f) return null
      const p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p)
      return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null
    }
    const ptVS = `attribute vec3 aPos;uniform mat4 uMVP;uniform float uSz;void main(){vec4 p=uMVP*vec4(aPos,1.);gl_Position=p;gl_PointSize=clamp(uSz/max(p.w,.3),1.,8.);}`
    const ptFS = `precision mediump float;uniform vec4 uCol;void main(){vec2 c=gl_PointCoord-.5;float d=length(c)*2.;if(d>1.)discard;gl_FragColor=vec4(uCol.rgb,uCol.a*(1.-d));}`
    const lnVS = `attribute vec3 aPos;uniform mat4 uMVP;void main(){gl_Position=uMVP*vec4(aPos,1.);}`
    const lnFS = `precision mediump float;uniform vec4 uCol;void main(){gl_FragColor=uCol;}`
    const ptProg = mkProg(ptVS, ptFS), lnProg = mkProg(lnVS, lnFS)
    if (!ptProg || !lnProg) return
    const N = 110, phi = Math.PI * (3 - Math.sqrt(5))
    const verts = []
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = phi * i
      verts.push(r * Math.cos(th), y, r * Math.sin(th))
    }
    const ptBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW)
    const lnData = []
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const dx = verts[i*3]-verts[j*3], dy = verts[i*3+1]-verts[j*3+1], dz = verts[i*3+2]-verts[j*3+2]
      if (Math.sqrt(dx*dx+dy*dy+dz*dz) < .44) {
        lnData.push(verts[i*3], verts[i*3+1], verts[i*3+2], verts[j*3], verts[j*3+1], verts[j*3+2])
      }
    }
    const lnCount = lnData.length / 3
    const lnBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, lnBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lnData), gl.STATIC_DRAW)
    const ptAPos = gl.getAttribLocation(ptProg, 'aPos'), ptMVP = gl.getUniformLocation(ptProg, 'uMVP')
    const ptSz = gl.getUniformLocation(ptProg, 'uSz'), ptCol = gl.getUniformLocation(ptProg, 'uCol')
    const lnAPos = gl.getAttribLocation(lnProg, 'aPos'), lnMVP = gl.getUniformLocation(lnProg, 'uMVP')
    const lnCol = gl.getUniformLocation(lnProg, 'uCol')
    function mul4(a, b) {
      const o = new Float32Array(16)
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        let s = 0; for (let k = 0; k < 4; k++) s += a[k*4+r] * b[c*4+k]; o[c*4+r] = s
      }
      return o
    }
    function mkRotY(a) { const c=Math.cos(a),s=Math.sin(a); return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]) }
    function mkRotX(a) { const c=Math.cos(a),s=Math.sin(a); return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]) }
    const t2 = 1 / Math.tan(0.45), nf = 1 / (0.1 - 100)
    const proj = new Float32Array([t2,0,0,0, 0,t2,0,0, 0,0,(100+0.1)*nf,-1, 0,0,2*100*0.1*nf,0])
    const view = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-2.6,1])
    const pv = mul4(proj, view)
    let t = 0, running = true
    canvas._stop = () => { running = false }
    function draw() {
      if (!running) return
      t += .008
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
      const model = mul4(mkRotY(t * .35), mkRotX(Math.sin(t * .18) * .22))
      const mvp = mul4(pv, model)
      gl.useProgram(lnProg)
      gl.bindBuffer(gl.ARRAY_BUFFER, lnBuf); gl.enableVertexAttribArray(lnAPos)
      gl.vertexAttribPointer(lnAPos, 3, gl.FLOAT, false, 0, 0)
      gl.uniformMatrix4fv(lnMVP, false, mvp); gl.uniform4fv(lnCol, [.655, .545, .984, .2])
      gl.drawArrays(gl.LINES, 0, lnCount)
      gl.useProgram(ptProg)
      gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf); gl.enableVertexAttribArray(ptAPos)
      gl.vertexAttribPointer(ptAPos, 3, gl.FLOAT, false, 0, 0)
      gl.uniformMatrix4fv(ptMVP, false, mvp)
      gl.uniform4fv(ptCol, [.486, .227, .929, .18]); gl.uniform1f(ptSz, 9.)
      gl.drawArrays(gl.POINTS, 0, N)
      gl.uniform4fv(ptCol, [.847, .706, .996, .9]); gl.uniform1f(ptSz, 4.)
      gl.drawArrays(gl.POINTS, 0, N)
      requestAnimationFrame(draw)
    }
    draw()
  })
}

function Orb({ size=34, state='idle', rings=false }) {
  const r1=Math.round(size*1.6),r2=Math.round(size*2.1),r3=Math.round(size*2.55)
  const wrap=rings?r3:size
  return (
    <div style={{ position:'relative',width:wrap,height:wrap,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
      <div className={`nv-orb nv-orb-${state}`} style={{ width:size,height:size,zIndex:2 }}><div className="nv-gloss"/></div>
      {rings&&<><div className="nv-ring nv-r1" style={{ width:r1,height:r1 }}/><div className="nv-ring nv-r2" style={{ width:r2,height:r2 }}/><div className="nv-ring nv-r3" style={{ width:r3,height:r3 }}/></>}
    </div>
  )
}

function detectNovaAction(content) {
  if (!content||content.length<80) return null
  const lower=content.toLowerCase()
  if ((lower.includes('flashcard')||lower.includes('flash card'))&&(content.match(/\d+\.\s+.+[:\u2014\-]/)||content.match(/front:|back:/i))) return 'flashcards'
  const termDef=content.match(/^\d+\.\s+.+[\u2014\-\u2013].+$/gm)
  if (termDef&&termDef.length>=4) return 'flashcards'
  if (lower.includes('quiz')&&content.match(/[A-D]\.\s+/)&&content.match(/\d+\.\s+/)) return 'quiz'
  if (content.match(/[A-D]\)\s+/)&&content.match(/\d+\.\s+/)&&content.match(/answer:|correct answer:/i)) return 'quiz'
  if ((lower.includes('study guide')||lower.includes('key terms')||lower.includes('key concepts'))&&content.length>400) return 'study_guide'
  return null
}

function NovaActionChip({ action, content, onAction }) {
  const [busy,setBusy]=useState(false)
  const cfg=({flashcards:{text:'⚡ Study as flashcards',color:'#818cf8',bg:'rgba(99,102,241,0.15)',border:'rgba(99,102,241,0.3)'},quiz:{text:'❓ Take as a quiz',color:'#34d399',bg:'rgba(16,185,129,0.12)',border:'rgba(16,185,129,0.28)'},study_guide:{text:'📋 Open study guide',color:'#60a5fa',bg:'rgba(37,99,235,0.12)',border:'rgba(37,99,235,0.28)'}})[action]||{text:'Study',color:'#818cf8',bg:'rgba(99,102,241,0.15)',border:'rgba(99,102,241,0.3)'}
  return (
    <button onClick={()=>{setBusy(true);onAction(action,content).finally(()=>setBusy(false))}} disabled={busy}
      style={{ marginTop:8,display:'flex',alignItems:'center',gap:7,padding:'7px 13px',borderRadius:10,background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.color,fontSize:12,fontWeight:600,cursor:'pointer',opacity:busy?0.6:1,transition:'opacity 0.15s' }}>
      {busy?<><span style={{ width:10,height:10,border:`1.5px solid ${cfg.color}`,borderTopColor:'transparent',borderRadius:'50%',display:'inline-block',animation:'nv-spin 0.6s linear infinite' }}/> Generating...</>:cfg.text}
    </button>
  )
}

function parseBlocks(content) {
  const parts=[];const re=/```(\w+)?\n?([\s\S]*?)```/g;let last=0,m
  while((m=re.exec(content))!==null){if(m.index>last)parts.push({type:'text',content:content.slice(last,m.index)});parts.push({type:'code',lang:(m[1]||'text').toLowerCase(),code:m[2].trim()});last=m.index+m[0].length}
  if(last<content.length)parts.push({type:'text',content:content.slice(last)})
  return parts
}

function CodeBlock({ lang, code }) {
  const [preview,setPreview]=useState(false)
  const previewable=['html','css','javascript','js','jsx'].includes(lang)
  function download(){const ext=lang==='javascript'||lang==='jsx'?'js':lang==='text'?'txt':lang;const blob=new Blob([code],{type:'text/plain'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`nova-code.${ext}`;a.click();URL.revokeObjectURL(url)}
  const srcDoc=lang==='html'?code:lang==='css'?`<style>${code}</style><p style="font-family:sans-serif;padding:16px;color:#333">CSS preview</p>`:(lang==='js'||lang==='javascript'||lang==='jsx')?`<script>try{${code}}catch(e){document.body.innerHTML='<pre style="color:red">'+e+'</pre>'}<\/script>`:code
  return (
    <div style={{ marginTop:8,borderRadius:10,overflow:'hidden',border:'1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 12px',background:'rgba(255,255,255,0.05)',borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ fontSize:11,color:'rgba(255,255,255,0.4)',fontFamily:'monospace',letterSpacing:'0.05em' }}>{lang}</span>
        <div style={{ display:'flex',gap:6 }}>
          {previewable&&<button onClick={()=>setPreview(p=>!p)} style={{ fontSize:11,color:'#818cf8',background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:6,padding:'3px 9px',cursor:'pointer' }}>{preview?'Code':'Preview'}</button>}
          <button onClick={download} style={{ fontSize:11,color:'rgba(255,255,255,0.5)',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:6,padding:'3px 9px',cursor:'pointer' }}>Download</button>
        </div>
      </div>
      {preview&&previewable?<iframe sandbox="allow-scripts allow-same-origin" srcDoc={srcDoc} title="Preview" style={{ width:'100%',height:280,border:'none',background:'#fff',display:'block' }}/>:<pre style={{ margin:0,padding:'12px 14px',background:'rgba(0,0,0,0.45)',overflowX:'auto',fontSize:12,lineHeight:1.65,color:'#e2e8f0',fontFamily:'monospace',whiteSpace:'pre-wrap',wordBreak:'break-word' }}><code>{code}</code></pre>}
    </div>
  )
}

function MessageBody({ content }) {
  if (!content.includes('```')) return <span style={{ whiteSpace:'pre-wrap',wordBreak:'break-word' }}>{content}</span>
  const parts=parseBlocks(content)
  return <div>{parts.map((p,i)=>p.type==='text'?<span key={i} style={{ whiteSpace:'pre-wrap',wordBreak:'break-word' }}>{p.content}</span>:<CodeBlock key={i} lang={p.lang} code={p.code}/>)}</div>
}

export default function NovaPage() {
  const { user } = useAuth()
  const [novaState,setNovaState]=useState('idle')
  const [savedChat,setSavedChat]=useState(false)
  const [messages,setMessages]=useState([])
  const [prefillMsg,setPrefillMsg]=useState(null)
  const [input,setInput]=useState('')
  const [loading,setLoading]=useState(false)
  const [greeting,setGreeting]=useState(true)
  const [handoffBanner,setHandoffBanner]=useState(false)
  const [pendingImages,setPendingImages]=useState([])
  const [voiceMode,  setVoiceMode]  = useState(false)
  const [listening,  setListening]  = useState(false)
  const [ttsLoading, setTtsLoading] = useState(null)
  const recognitionRef = useRef(null)
  const msgsRef=useRef(null)
  const inputBarRef=useRef(null)
  const inputRef=useRef(null)
  const bgRef=useRef(null)
  const sphereRef=useRef(null)
  const imageInputRef=useRef(null)

  useEffect(()=>{
    const style=document.createElement('style')
    style.id='nova-orb-css';style.textContent=ORB_CSS
    document.head.appendChild(style)
    return()=>document.getElementById('nova-orb-css')?.remove()
  },[])

  useEffect(()=>{
    if(bgRef.current)initConstellationBg(bgRef.current)
    return()=>bgRef.current?._stop?.()
  },[])

  useEffect(()=>{
    if(sphereRef.current)initSphere(sphereRef.current)
    return()=>sphereRef.current?._stop?.()
  },[])

  // Restore persisted chat
  useEffect(()=>{
    try{const saved=localStorage.getItem('ff-nova-messages');if(saved){const msgs=JSON.parse(saved);if(msgs?.length){setMessages(msgs);setGreeting(false)}}}catch(e){}
  },[])

  // Persist messages
  useEffect(()=>{
    if(messages.length===0)return
    try{localStorage.setItem('ff-nova-messages',JSON.stringify(messages.map(m=>({role:m.role,content:m.content}))))}catch(e){}
  },[messages])

  // Prefill + handoff
  useEffect(()=>{
    try{const prefill=sessionStorage.getItem('nova_prefill');if(prefill){sessionStorage.removeItem('nova_prefill');setGreeting(false);setPrefillMsg(prefill)}}catch(e){}
    try{const raw=localStorage.getItem('flashfo_nova_handoff');if(!raw)return;localStorage.removeItem('flashfo_nova_handoff');const msgs=JSON.parse(raw);if(msgs?.length){setMessages(msgs);setGreeting(false);setHandoffBanner(true);setTimeout(()=>setHandoffBanner(false),4000)}}catch(e){}
  },[])

  useEffect(()=>{if(msgsRef.current)msgsRef.current.scrollTop=msgsRef.current.scrollHeight},[messages,loading])

  const scrollInputIntoView=useCallback(()=>{
    const vv=window.visualViewport
    if(!vv||!inputBarRef.current)return
    setTimeout(()=>{const barRect=inputBarRef.current.getBoundingClientRect();const visibleBottom=vv.offsetTop+vv.height;const overlap=barRect.bottom-visibleBottom;if(overlap>0&&msgsRef.current)msgsRef.current.scrollTop+=overlap+16},100)
  },[])

  const compressImage=(dataUrl)=>new Promise(resolve=>{
    const img=new Image()
    img.onerror=()=>resolve(null)
    img.onload=()=>{const MAX=1024;let{width,height}=img;if(width>MAX||height>MAX){if(width>height){height=Math.round(height*MAX/width);width=MAX}else{width=Math.round(width*MAX/height);height=MAX}};const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(img,0,0,width,height);canvas.toBlob(blob=>{if(!blob){resolve(null);return};const r=new FileReader();r.onload=ev2=>resolve({base64:ev2.target.result.split(',')[1],mimeType:'image/jpeg',preview:ev2.target.result});r.readAsDataURL(blob)},'image/jpeg',0.82)}
    img.src=dataUrl
  })

  const handleImageSelect=useCallback((e)=>{
    const files=Array.from(e.target.files||[])
    files.forEach(file=>{const reader=new FileReader();reader.onload=async(ev)=>{const compressed=await compressImage(ev.target.result);if(compressed)setPendingImages(prev=>[...prev,compressed])};reader.readAsDataURL(file)})
    e.target.value=''
  },[])

  const send=useCallback(async(text)=>{
    const hasText=text?.trim();const hasImages=pendingImages.length>0
    if((!hasText&&!hasImages)||loading)return
    const userMsg=(text||'').trim();const imagesToSend=[...pendingImages]
    setInput('');setPendingImages([])
    if(inputRef.current)inputRef.current.style.height='auto'
    setGreeting(false)
    setMessages(prev=>[...prev,{role:'user',content:userMsg,images:imagesToSend}])
    setLoading(true);setNovaState('thinking')
    try{
      const history=messages.map(m=>({role:m.role,text:m.content}))
      const res=await novaStream([...history,{role:'user',text:userMsg,images:imagesToSend}])
      if(!res.ok)throw new Error('fail')
      setNovaState('generating')
      const reader=res.body.getReader();const decoder=new TextDecoder();let full=''
      setMessages(prev=>[...prev,{role:'assistant',content:''}])
      while(true){const{done,value}=await reader.read();if(done)break;full+=decoder.decode(value,{stream:true});setMessages(prev=>{const u=[...prev];u[u.length-1]={role:'assistant',content:full};return u})}
    }catch{setMessages(prev=>[...prev,{role:'assistant',content:'Sorry, something went wrong. Please try again.'}])}
    finally{setLoading(false);setNovaState('idle')}
  },[loading,messages,pendingImages])

  const handleNovaAction=useCallback(async(action,sourceContent)=>{
    try{
      if(action==='flashcards'){const data=await rpc('generateFlashcardsFromText',[sourceContent,10,'English']);const cards=data?.result?.cards||[];if(cards.length){sessionStorage.setItem('flashfo_load_flashcards',JSON.stringify({cards,topic:'Nova deck'}));window.open('/flashcards','_blank')}}
      else if(action==='quiz'){const data=await rpc('generateQuizAdvancedFromText',[sourceContent,{mcq:5,trueFalse:2,shortAnswer:0,difficulty:'medium'},'English']);const questions=data?.result?.questions||[];if(questions.length){sessionStorage.setItem('flashfo_quiz_load',JSON.stringify({questions,topic:'Nova quiz'}));window.open('/quiz','_blank')}}
      else if(action==='study_guide'){const data=await rpc('generateStudyGuideFromText',[sourceContent,'English']);if(data?.result){sessionStorage.setItem('flashfo_studyguide_load',JSON.stringify({guide:data.result,topic:'Nova study guide'}));window.open('/study-guide','_blank')}}
    }catch(err){console.error('[Nova action]',err)}
  },[])

  const saveChat=useCallback(async()=>{
    if(!user||!messages.length)return
    const firstMsg=messages.find(m=>m.role==='user')?.content||'Nova conversation'
    const title=firstMsg.slice(0,60)+(firstMsg.length>60?'...':'')
    try{await saveItem(user.id,'conversation',title,{messages:messages.map(m=>({role:m.role,content:m.content})),savedAt:new Date().toISOString()});setSavedChat(true);setTimeout(()=>setSavedChat(false),2500)}catch(e){console.error('[Nova save]',e)}
  },[user,messages])

  const clearChat=useCallback(()=>{
    setMessages([]);setGreeting(true);setPendingImages([])
    try{localStorage.removeItem('ff-nova-messages')}catch(e){}
  },[])

  useEffect(()=>{if(prefillMsg&&!loading){send(prefillMsg);setPrefillMsg(null)}},[prefillMsg,send,loading])

  const handleKey=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input)}}

  const dotColor=novaState==='idle'?'#10b981':novaState==='thinking'?'#fbbf24':'#818cf8'
  const dotGlow=novaState==='idle'?'rgba(16,185,129,.8)':novaState==='thinking'?'rgba(251,191,36,.8)':'rgba(129,140,248,.8)'
  const stateLabel=novaState==='idle'?'Online':novaState==='thinking'?'Thinking...':'Generating...'


  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice input not supported. Use Chrome or Safari.'); return }
    const rec = new SR()
    rec.continuous = false; rec.interimResults = true; rec.lang = 'en-US'
    rec.onstart  = () => setListening(true)
    rec.onend    = () => setListening(false)
    rec.onerror  = () => setListening(false)
    rec.onresult = e => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('')
      setInput(t)
      if (e.results[e.results.length-1].isFinal) setTimeout(() => { const s=t.trim(); if(s)sendMsg(s) }, 120)
    }
    recognitionRef.current = rec; rec.start()
  }
  function stopListening() { recognitionRef.current?.stop(); setListening(false) }

  async function speakMessage(text, idx) {
    if (ttsLoading !== null) return
    setTtsLoading(idx)
    try {
      const res = await rpc('generateOpenAITtsAudio', [text, 'marin', 'English'])
      const audio = new Audio('data:' + res.mimeType + ';base64,' + res.base64)
      audio.onended = () => setTtsLoading(null)
      audio.onerror = () => setTtsLoading(null)
      audio.play()
    } catch(e) { setTtsLoading(null) }
  }

  return (
    // height:100% fills the Shell content area (which = full viewport since Shell hides its
    // topbar on this route). This keeps the input bar always visible on desktop.
    <div style={{ display:'flex', flexDirection:'column', height:'100%', position:'relative', overflow:'hidden' }}>
      <canvas ref={bgRef} style={{ position:'absolute',inset:0,width:'100%',height:'100%',zIndex:0,pointerEvents:'none' }}/>

      {/* Compact nav strip */}
      <div style={{ flexShrink:0, zIndex:2, position:'relative', padding:'10px 14px 8px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ display:'flex', gap:4 }}>
            {[
              { href:'/dashboard', label:'Home',     path:'M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z M9 21V12h6v9' },
              { href:'/my-stuff',  label:'My Stuff',  path:'M12 2L2 7l10 5 10-5-10-5z M2 12l10 5 10-5 M2 17l10 5 10-5' },
              { href:'/profile',   label:'Profile',   path:'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z' },
            ].map(tab=>(
              <a key={tab.href} href={tab.href}
                style={{ display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:20,background:'rgba(255,255,255,0.07)',border:'0.5px solid rgba(255,255,255,0.12)',textDecoration:'none',touchAction:'manipulation',WebkitTapHighlightColor:'transparent' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {tab.path.split(' M').map((p,i)=><path key={i} d={(i===0?'':' M')+p}/>)}
                </svg>
                <span style={{ fontSize:11,color:'rgba(255,255,255,0.55)',fontWeight:500 }}>{tab.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Status bar */}
        <div style={{ background:'rgba(255,255,255,0.07)',border:'0.5px solid rgba(129,140,248,0.32)',borderRadius:30,padding:'7px 10px',display:'flex',alignItems:'center',gap:8,backdropFilter:'blur(12px)' }}>
          <div style={{ position:'relative',flexShrink:0,width:20,height:20 }}>
            <div className={`nv-orb nv-orb-${novaState}`} style={{ width:20,height:20 }}><div className="nv-gloss"/></div>
            <div style={{ position:'absolute',bottom:-1,right:-1,width:6,height:6,borderRadius:'50%',background:dotColor,border:'1px solid #07090f',boxShadow:`0 0 6px ${dotGlow}` }}/>
          </div>
          <span style={{ fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.78)',flex:1 }}>Nova · {stateLabel}</span>
          {handoffBanner&&<span style={{ fontSize:10,color:'rgba(167,139,250,0.65)',marginRight:4 }}>❖ Continued</span>}
          {messages.length>0&&(
            <div style={{ display:'flex',gap:6 }}>
              <button onClick={saveChat} style={{ background:savedChat?'rgba(52,211,153,0.15)':'rgba(255,255,255,0.08)',border:savedChat?'0.5px solid rgba(52,211,153,0.4)':'0.5px solid rgba(255,255,255,0.16)',borderRadius:8,cursor:'pointer',color:savedChat?'#34d399':'rgba(255,255,255,0.5)',fontSize:11,padding:'3px 10px',fontFamily:'inherit',transition:'all 0.2s' }}>
                {savedChat?'Saved ✓':'Save'}
              </button>
              <button onClick={clearChat} style={{ background:'rgba(255,255,255,0.08)',border:'0.5px solid rgba(255,255,255,0.16)',borderRadius:8,cursor:'pointer',color:'rgba(255,255,255,0.5)',fontSize:11,padding:'3px 10px',fontFamily:'inherit' }}>Clear</button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={msgsRef} className="nv-msgs" style={{ flex:1,overflowY:'auto',overflowX:'hidden',WebkitOverflowScrolling:'touch',padding:'12px 16px 8px',display:'flex',flexDirection:'column',gap:12,position:'relative',zIndex:1 }}>
        {greeting&&(
          <div style={{ textAlign:'center',padding:'20px 16px 12px',flexShrink:0 }}>
            <canvas ref={sphereRef} style={{ width:140,height:140,display:'block',margin:'0 auto 16px' }}/>
            <div style={{ fontSize:22,fontWeight:900,letterSpacing:'-.04em',marginBottom:8,background:'linear-gradient(135deg,#fff,#a5b4fc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>What are we working on?</div>
            <div style={{ fontSize:13,color:'rgba(255,255,255,.35)',lineHeight:1.6 }}>Ask me anything — I'll explain, write code, debug errors, or build flashcards.</div>
            <div style={{ display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap',marginTop:16 }}>
              {['Explain a concept','Debug my code','Write a quiz','Summarize notes'].map(q=>(
                <button key={q} onClick={()=>send(q)} style={{ fontSize:12,color:'rgba(167,139,250,0.75)',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.22)',borderRadius:20,padding:'6px 14px',cursor:'pointer',fontFamily:'inherit' }}>{q}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m,i)=>{
          const action=m.role==='assistant'?detectNovaAction(m.content):null
          return(
            <div key={i} style={{ display:'flex',flexDirection:m.role==='user'?'row-reverse':'row',alignItems:'flex-start' }}>
              <div style={{ maxWidth:'84%' }}>
                {m.images?.length>0&&<div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:6,justifyContent:m.role==='user'?'flex-end':'flex-start' }}>{m.images.map((img,ii)=><img key={ii} src={img.preview} alt="Attached" style={{ maxWidth:140,maxHeight:100,borderRadius:8,objectFit:'cover',border:'1px solid rgba(255,255,255,0.1)' }}/>)}</div>}
                {m.content&&<div style={{ padding:'11px 14px',borderRadius:m.role==='user'?'18px 18px 5px 18px':'18px 18px 18px 5px',background:m.role==='user'?'linear-gradient(135deg,rgba(79,70,229,.28),rgba(109,40,217,.22))':'rgba(8,12,22,.88)',border:`1px solid ${m.role==='user'?'rgba(99,102,241,.3)':'rgba(255,255,255,.09)'}`,color:'rgba(255,255,255,.88)',fontSize:14,lineHeight:1.65,backdropFilter:'blur(12px)' }}><MessageBody content={m.content}/></div>}
                {action&&<NovaActionChip action={action} content={m.content} onAction={handleNovaAction}/>}
              </div>
            </div>
          )
        })}
        {loading&&novaState==='thinking'&&(
          <div style={{ display:'flex' }}>
            <div style={{ padding:'12px 16px',borderRadius:'18px 18px 18px 5px',background:'rgba(8,12,22,.88)',border:'1px solid rgba(255,255,255,.09)',display:'flex',gap:5,alignItems:'center',backdropFilter:'blur(12px)' }}>
              {[0,150,300].map((d,j)=><div key={j} style={{ width:7,height:7,borderRadius:'50%',background:'rgba(129,140,248,.7)',animation:`nv-bounce .9s ease-in-out ${d}ms infinite` }}/>)}
            </div>
          </div>
        )}
      </div>

      {/* Input bar — always visible because page height:100% = available shell space */}
      <div ref={inputBarRef} style={{ flexShrink:0,zIndex:2,position:'relative',padding:'8px 14px',paddingBottom:'max(14px, calc(env(safe-area-inset-bottom) + 14px))',borderTop:'1px solid rgba(255,255,255,.07)',background:'rgba(5,7,9,.92)',backdropFilter:'blur(24px)' }}>
        {pendingImages.length>0&&(
          <div style={{ display:'flex',gap:8,paddingBottom:8,flexWrap:'wrap' }}>
            {pendingImages.map((img,i)=>(
              <div key={i} style={{ position:'relative' }}>
                <img src={img.preview} alt="" style={{ width:52,height:52,borderRadius:8,objectFit:'cover',border:'1px solid rgba(255,255,255,0.15)' }}/>
                <button onClick={()=>setPendingImages(prev=>prev.filter((_,ii)=>ii!==i))} style={{ position:'absolute',top:-5,right:-5,width:17,height:17,borderRadius:'50%',background:'#ef4444',border:'1.5px solid #07090f',cursor:'pointer',color:'#fff',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1,padding:0 }}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display:'flex',gap:8,alignItems:'flex-end' }}>
          <button onClick={()=>imageInputRef.current?.click()} disabled={loading}
            style={{ width:42,height:42,borderRadius:'50%',border:'1.5px solid rgba(255,255,255,0.13)',background:'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',cursor:loading?'not-allowed':'pointer',flexShrink:0,opacity:loading?0.4:1 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
          <input ref={imageInputRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleImageSelect}/>
          {voiceMode && (<button onClick={listening?stopListening:startListening} title={listening?'Stop':'Speak'} style={{ flexShrink:0,width:36,height:36,borderRadius:'50%',border:'none',cursor:'pointer',background:listening?'#ef4444':'rgba(167,139,250,0.18)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:listening?'0 0 0 4px rgba(239,68,68,0.25)':'none',transition:'all .2s' }}>
            {listening?<svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>}
          </button>)}
          <textarea ref={inputRef} className="nv-ta" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} onFocus={scrollInputIntoView}
            onInput={e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,110)+'px'}}
            placeholder="Ask Nova anything..." rows={1} disabled={loading}
            style={{ flex:1,minHeight:42,maxHeight:110,borderRadius:21,background:'rgba(255,255,255,.06)',border:'1.5px solid rgba(255,255,255,.11)',padding:'11px 16px',fontSize:16,color:'#e2e8f0',fontFamily:'inherit',outline:'none',resize:'none',lineHeight:1.4 }}/>
          <button onClick={()=>{setVoiceMode(v=>!v);if(listening)stopListening()}} title={voiceMode?'Voice mode on':'Voice mode off'}
            style={{ flexShrink:0, width:34, height:34, borderRadius:8, border:'none', cursor:'pointer',
              background:voiceMode?'rgba(167,139,250,0.18)':'none',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={voiceMode?'#a78bfa':'rgba(255,255,255,0.35)'} strokeWidth="2" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
            </svg>
          </button>
          <button onClick={()=>send(input)} disabled={loading||(!input.trim()&&!pendingImages.length)}
            style={{ width:42,height:42,borderRadius:'50%',border:'none',flexShrink:0,background:'linear-gradient(135deg,#4f46e5,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',cursor:(loading||(!input.trim()&&!pendingImages.length))?'not-allowed':'pointer',opacity:(loading||(!input.trim()&&!pendingImages.length))?0.45:1,boxShadow:'0 4px 16px rgba(99,102,241,.4)',transition:'opacity .15s' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
