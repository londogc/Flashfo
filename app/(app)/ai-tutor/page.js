'use client'
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
.nv-msgs::-webkit-scrollbar{display:none}
.nv-ta::placeholder{color:rgba(255,255,255,.22)!important}
`

function initBg(canvas) {
  if (!canvas || canvas._init) return
  canvas._init = true
  const gl = canvas.getContext('webgl')
  if (!gl) return
  const resize = () => {
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    gl.viewport(0, 0, canvas.width, canvas.height)
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  const VS = `attribute vec2 aP;varying vec2 vU;void main(){vU=aP*.5+.5;gl_Position=vec4(aP,.999,1.);}`
  const FS = `precision highp float;uniform float uT;uniform vec2 uR;varying vec2 vU;
  vec2 h2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.545);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(dot(h2(i),f),dot(h2(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(h2(i+vec2(0,1)),f-vec2(0,1)),dot(h2(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}
  float fbm(vec2 p){float v=0.,a=.5;mat2 r=mat2(.8,-.6,.6,.8);for(int i=0;i<6;i++){v+=a*n(p);p=r*p*2.01;a*=.52;}return v;}
  void main(){vec2 uv=vU;float ar=uR.x/uR.y;uv.x*=ar;float t=uT*.06;
  vec2 q=vec2(fbm(uv*1.7+t),fbm(uv*1.7+vec2(5.2,1.3)+t*.8));
  vec2 r2=vec2(fbm(uv*1.7+3.4*q+t*.6),fbm(uv*1.7+3.4*q+vec2(8.3,2.8)+t*.45));
  float f=fbm(uv*1.7+3.4*r2+t*.3);f=clamp(f,0.,1.);
  vec3 col=mix(vec3(.010,.018,.10),vec3(.12,.022,.28),smoothstep(0.,.47,f));
  col=mix(col,vec3(.30,.06,.60),smoothstep(.27,.67,f));col=mix(col,vec3(.68,.12,.88),smoothstep(.51,.83,f));
  vec2 vig=vU-.5;col*=clamp(1.-dot(vig,vig)*1.8,.0,1.);col+=.01;gl_FragColor=vec4(col,1.);}`
  function mkS(t,s){const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);return sh}
  const prog=gl.createProgram()
  gl.attachShader(prog,mkS(gl.VERTEX_SHADER,VS))
  gl.attachShader(prog,mkS(gl.FRAGMENT_SHADER,FS))
  gl.linkProgram(prog)
  const buf=gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER,buf)
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW)
  const uT=gl.getUniformLocation(prog,'uT'),uR=gl.getUniformLocation(prog,'uR'),aP=gl.getAttribLocation(prog,'aP')
  let t=0,running=true
  canvas._stop=()=>{running=false;ro.disconnect()}
  ;(function draw(){
    if(!running)return
    requestAnimationFrame(draw);t+=.009
    gl.clearColor(.02,.03,.06,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(prog)
    gl.uniform1f(uT,t);gl.uniform2f(uR,canvas.width,canvas.height)
    gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(aP)
    gl.vertexAttribPointer(aP,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)
  })()
}

function Orb({ size=34, state='idle', rings=false }) {
  const r1=Math.round(size*1.6), r2=Math.round(size*2.1), r3=Math.round(size*2.55)
  const wrap=rings?r3:size
  return (
    <div style={{position:'relative',width:wrap,height:wrap,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      <div className={`nv-orb nv-orb-${state}`} style={{width:size,height:size,zIndex:2}}>
        <div className="nv-gloss"/>
      </div>
      {rings&&<>
        <div className="nv-ring nv-r1" style={{width:r1,height:r1}}/>
        <div className="nv-ring nv-r2" style={{width:r2,height:r2}}/>
        <div className="nv-ring nv-r3" style={{width:r3,height:r3}}/>
      </>}
    </div>
  )
}

export default function NovaPage() {
  const [novaState,setNovaState] = useState('idle')
  const [messages,setMessages] = useState([])
  const [input,setInput] = useState('')
  const [loading,setLoading] = useState(false)
  const [greeting,setGreeting] = useState(true)
  // ── keyboard inset in px — updated by visualViewport ──
  const [kbInset,setKbInset] = useState(0)
  const msgsRef = useRef(null)
  const inputRef = useRef(null)
  const bgRef = useRef(null)

  useEffect(()=>{
    const style=document.createElement('style')
    style.id='nova-orb-css'
    style.textContent=ORB_CSS
    document.head.appendChild(style)
    return()=>document.getElementById('nova-orb-css')?.remove()
  },[])

  useEffect(()=>{
    if(bgRef.current) initBg(bgRef.current)
    return()=>bgRef.current?._stop?.()
  },[])

  // ── Option 1+2 combined: track visualViewport to compute keyboard height ──
  useEffect(()=>{
    const vv=window.visualViewport
    if(!vv) return
    const update=()=>{
      // keyboard height = layout viewport height minus visual viewport height minus its offset
      const layoutH = document.documentElement.clientHeight
      const inset = Math.max(0, layoutH - vv.height - vv.offsetTop)
      setKbInset(Math.round(inset))
    }
    vv.addEventListener('resize',update)
    vv.addEventListener('scroll',update)
    return()=>{
      vv.removeEventListener('resize',update)
      vv.removeEventListener('scroll',update)
    }
  },[])

  useEffect(()=>{
    if(msgsRef.current) msgsRef.current.scrollTop=msgsRef.current.scrollHeight
  },[messages,loading])

  const send=useCallback(async(text)=>{
    if(!text?.trim()||loading) return
    const userMsg=text.trim()
    setInput('')
    if(inputRef.current){inputRef.current.style.height='auto'}
    setGreeting(false)
    setMessages(prev=>[...prev,{role:'user',content:userMsg}])
    setLoading(true)
    setNovaState('thinking')
    try{
      const history=messages.map(m=>({role:m.role,text:m.content}))
      const res=await fetch('/api/nova-stream',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages:[...history,{role:'user',text:userMsg}]}),
      })
      if(!res.ok) throw new Error('fail')
      setNovaState('generating')
      const reader=res.body.getReader()
      const decoder=new TextDecoder()
      let full=''
      setMessages(prev=>[...prev,{role:'assistant',content:''}])
      while(true){
        const{done,value}=await reader.read()
        if(done) break
        full+=decoder.decode(value,{stream:true})
        setMessages(prev=>{const u=[...prev];u[u.length-1]={role:'assistant',content:full};return u})
      }
    }catch{
      setMessages(prev=>[...prev,{role:'assistant',content:'Sorry, something went wrong. Please try again.'}])
    }finally{
      setLoading(false)
      setNovaState('idle')
    }
  },[loading,messages])

  const handleKey=e=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input)}
  }

  const dotColor=novaState==='idle'?'#10b981':novaState==='thinking'?'#fbbf24':'#818cf8'
  const dotGlow=novaState==='idle'?'rgba(16,185,129,.8)':novaState==='thinking'?'rgba(251,191,36,.8)':'rgba(129,140,248,.8)'
  const stateText=novaState==='idle'?'Online · ready to help':novaState==='thinking'?'Thinking...':'Generating...'
  const stateColor=novaState==='idle'?'#10b981':novaState==='thinking'?'#fbbf24':'#818cf8'

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',position:'relative',overflow:'hidden'}}>

      {/* FLUID BG */}
      <canvas ref={bgRef} style={{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:0,pointerEvents:'none'}}/>

      {/* TOPBAR */}
      <div style={{
        flexShrink:0,zIndex:1,position:'relative',
        padding:'12px 18px',
        borderBottom:'1px solid rgba(255,255,255,0.08)',
        background:'rgba(5,7,9,0.65)',
        backdropFilter:'blur(20px)',
        display:'flex',alignItems:'center',gap:12,
      }}>
        <div style={{position:'relative',flexShrink:0}}>
          <Orb size={34} state={novaState} rings/>
          <div style={{
            position:'absolute',
            // center of ring container minus half orb, minus a couple px to land on orb edge
            bottom:Math.round((34*2.55-34)/2)-2,
            right:Math.round((34*2.55-34)/2)-2,
            width:9,height:9,borderRadius:'50%',
            background:dotColor,border:'2px solid #07090f',
            boxShadow:`0 0 8px ${dotGlow}`,zIndex:10,
          }}/>
        </div>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:'#e2e8f0',letterSpacing:'-.02em'}}>Nova</div>
          <div style={{fontSize:11,fontWeight:500,color:stateColor}}>{stateText}</div>
        </div>
      </div>

      {/* MESSAGES — flex:1, scrollable, padded bottom so last msg clears the fixed input bar */}
      <div
        ref={msgsRef}
        className="nv-msgs"
        style={{
          flex:1,overflowY:'auto',overflowX:'hidden',
          WebkitOverflowScrolling:'touch',
          padding:'16px 16px 80px',   /* 80px clears the fixed input bar */
          display:'flex',flexDirection:'column',gap:12,
          position:'relative',zIndex:1,
        }}
      >
        {greeting&&(
          <div style={{textAlign:'center',padding:'20px 16px 12px',flexShrink:0}}>
            <div style={{
              fontSize:22,fontWeight:900,letterSpacing:'-.04em',marginBottom:8,
              background:'linear-gradient(135deg,#fff,#a5b4fc)',
              WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',
            }}>What are we working on?</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,.35)',lineHeight:1.6}}>
              Ask me anything — I'll explain, build flashcards, or quiz you on it.
            </div>
          </div>
        )}

        {messages.map((m,i)=>(
          <div key={i} style={{display:'flex',flexDirection:m.role==='user'?'row-reverse':'row',alignItems:'flex-start'}}>
            <div style={{
              maxWidth:'84%',padding:'11px 14px',
              borderRadius:m.role==='user'?'18px 18px 5px 18px':'18px 18px 18px 5px',
              background:m.role==='user'?'linear-gradient(135deg,rgba(79,70,229,.28),rgba(109,40,217,.22))':'rgba(8,12,22,.88)',
              border:`1px solid ${m.role==='user'?'rgba(99,102,241,.3)':'rgba(255,255,255,.09)'}`,
              color:'rgba(255,255,255,.88)',fontSize:14,lineHeight:1.65,
              backdropFilter:'blur(12px)',whiteSpace:'pre-wrap',wordBreak:'break-word',
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {loading&&novaState==='thinking'&&(
          <div style={{display:'flex'}}>
            <div style={{
              padding:'12px 16px',borderRadius:'18px 18px 18px 5px',
              background:'rgba(8,12,22,.88)',border:'1px solid rgba(255,255,255,.09)',
              display:'flex',gap:5,alignItems:'center',backdropFilter:'blur(12px)',
            }}>
              {[0,150,300].map((d,j)=>(
                <div key={j} style={{
                  width:7,height:7,borderRadius:'50%',
                  background:'rgba(129,140,248,.7)',
                  animation:`nv-bounce .9s ease-in-out ${d}ms infinite`,
                }}/>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── FIXED INPUT BAR — Option 2 ──
          position:fixed keeps it pinned to bottom of viewport always.
          paddingBottom uses env(safe-area-inset-bottom) for notch phones,
          then adds kbInset so it rides up with the keyboard. */}
      <div style={{
        position:'fixed',
        left:0,right:0,bottom:0,
        zIndex:100,
        padding:`10px 14px calc(env(safe-area-inset-bottom, 0px) + ${kbInset}px + 10px)`,
        borderTop:'1px solid rgba(255,255,255,.07)',
        background:'rgba(5,7,9,.9)',
        backdropFilter:'blur(24px)',
        transition:'padding-bottom .15s ease',
      }}>
        <div style={{display:'flex',gap:9,alignItems:'flex-end'}}>
          <textarea
            ref={inputRef}
            className="nv-ta"
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={handleKey}
            onInput={e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,110)+'px'}}
            placeholder="Ask Nova anything..."
            rows={1}
            disabled={loading}
            style={{
              flex:1,minHeight:42,maxHeight:110,
              borderRadius:21,
              background:'rgba(255,255,255,.06)',
              border:'1.5px solid rgba(255,255,255,.11)',
              padding:'11px 16px',
              fontSize:16,  /* must be ≥16px — prevents iOS auto-zoom on focus */
              color:'#e2e8f0',fontFamily:'inherit',
              outline:'none',resize:'none',lineHeight:1.4,
            }}
          />
          <button
            onClick={()=>send(input)}
            disabled={loading||!input.trim()}
            style={{
              width:42,height:42,borderRadius:'50%',border:'none',flexShrink:0,
              background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
              display:'flex',alignItems:'center',justifyContent:'center',
              cursor:loading||!input.trim()?'not-allowed':'pointer',
              opacity:loading||!input.trim()?0.45:1,
              boxShadow:'0 4px 16px rgba(99,102,241,.4)',
              transition:'opacity .15s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

    </div>
  )
}
