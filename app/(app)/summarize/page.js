'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { saveItem } from '@/lib/savedItems'

function SummarizePageInner() {
  const { user } = useAuth()
  const _sp = useSearchParams()
  useEffect(() => {
    const _q = _sp.get('q')
    if (_q) setInput(decodeURIComponent(_q))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [input, setInput]   = useState('')

  const _sumSP = useSearchParams()
  useEffect(() => {
    const q = _sumSP.get('q')
    if (q) setInput(decodeURIComponent(q))
  }, [_sumSP.get('q')])  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const audioRef = useRef(null)

  async function speak() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setSpeaking(false); return }
    setSpeaking(true)
    try {
      const res = await fetch('/api/rpc', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ fn:'generateOpenAITtsAudio', args:[output,'nova',1] }) })
      const d = await res.json()
      const audio = new Audio('data:'+d.result.mimeType+';base64,'+d.result.base64)
      audioRef.current = audio
      audio.onended = () => { setSpeaking(false); audioRef.current = null }
      audio.play()
    } catch { setSpeaking(false) }
  }

  async function run() {
    if (!input.trim()) return
    setLoading(true); setOutput(''); setError('')
    try {
      const res = await fetch('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'summarizeText', args: [input.trim(), 'paragraph', 300, 'English'] }) })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setOutput(typeof data.result === 'string' ? data.result : JSON.stringify(data.result))
    } catch { setError('Something went wrong.') }
    finally { setLoading(false) }
  }

  async function doSave() {
    if (!user || !output) return
    setSaving(true)
    try {
      await saveItem(user.id, 'summary', input.trim().substring(0, 60) + '...', { output, input })
      setSaveFeedback('Saved!')
      setTimeout(() => setSaveFeedback(''), 3000)
    } catch { setSaveFeedback('Save failed') }
    finally { setSaving(false) }
  }

  useEffect(() => {
    const id = 'nova-gen-anim'
    if (document.getElementById(id)) return
    const s = document.createElement('style')
    s.id = id
    s.textContent = '@keyframes nova-pop{0%{opacity:0;transform:translateY(14px) scale(0.97)}60%{opacity:1;transform:translateY(-3px) scale(1.005)}100%{opacity:1;transform:translateY(0) scale(1)}} @keyframes nova-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.85)}} .nova-card{opacity:0;animation:nova-pop .42s cubic-bezier(.22,.68,0,1.2) forwards} .nova-dot-pulse{animation:nova-pulse .9s ease-in-out infinite}'
    document.head.appendChild(s)
  }, [])

  return (
    <div style={{minHeight:'100vh',background:'#0d1117',padding:'32px 20px',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <div style={{maxWidth:660,margin:'0 auto'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(167,139,250,0.08)',border:'1px solid rgba(167,139,250,0.2)',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700,color:'#a78bfa',marginBottom:20,letterSpacing:'0.04em'}}>
          <svg width="10" height="10" viewBox="0 0 14 14" fill="#a78bfa"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
          NOVA · SUMMARY
        </div>
        <div style={{marginBottom:24}}>
          <div style={{fontSize:24,fontWeight:800,color:'#e6edf3',letterSpacing:'-0.02em',marginBottom:6}}>Summarise anything</div>
          <div style={{fontSize:14,color:'#8b949e'}}>Paste text or notes — Nova distils it instantly.</div>
        </div>
        <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Paste your text, article, or notes here..."
          style={{width:'100%',minHeight:120,background:'#161b22',border:'1px solid #30363d',borderRadius:10,padding:'12px 14px',fontSize:14,color:'#e6edf3',outline:'none',resize:'vertical',fontFamily:'inherit',lineHeight:1.6,marginBottom:12,display:'block'}}/>
        <button
          onClick={async()=>{
            if(!input.trim()||loading)return
            setLoading(true);setOutput('');setError('')
            try{
              const res=await fetch('/api/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fn:'summarizeText',args:[input.trim()]})})
              if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error||'Error '+res.status)}
              const d=await res.json();setOutput(d.result||'')
            }catch(e){setError(e.message)}finally{setLoading(false)}
          }}
          disabled={loading}
          style={{width:'100%',padding:'13px 0',borderRadius:10,border:'none',background:'linear-gradient(90deg,#2563eb,#7c3aed)',color:'#fff',fontSize:14,fontWeight:700,cursor:loading?'not-allowed':'pointer',opacity:loading?0.6:1,letterSpacing:'-0.01em',marginBottom:16}}>
          {loading?'Nova is summarising...':'Summarise with Nova →'}
        </button>
        <div style={{display:'flex',alignItems:'center',gap:8,minHeight:22,marginBottom:12}}>
          {loading&&<div className="nova-dot-pulse" style={{width:7,height:7,borderRadius:'50%',background:'#a78bfa'}}/>}
          {loading&&<span style={{fontSize:12,color:'#8b949e'}}>Nova is reading and condensing...</span>}
          {!loading&&output&&<><div style={{width:7,height:7,borderRadius:'50%',background:'#34d399'}}/><span style={{fontSize:12,color:'#34d399'}}>Summary ready</span></>}
        </div>
        {error&&<div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:9,padding:'10px 14px',fontSize:13,color:'#f87171',marginBottom:14}}>{error}</div>}
        {output&&(
          <div className="nova-card" style={{background:'#161b22',border:'1px solid #21262d',borderRadius:12,padding:'20px 22px'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:12}}>
              <div style={{width:4,height:14,background:'#a78bfa',borderRadius:2}}/>
              <span style={{fontSize:11,fontWeight:700,color:'#484f58',letterSpacing:'0.07em'}}>SUMMARY</span>
            </div>
            <div style={{fontSize:14,color:'#e6edf3',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{output}</div>
            <div style={{marginTop:16,paddingTop:12,borderTop:'1px solid #21262d',display:'flex',gap:8}}>
              <button onClick={()=>navigator.clipboard?.writeText(output)} style={{padding:'6px 14px',borderRadius:7,border:'1px solid #30363d',background:'transparent',color:'#8b949e',fontSize:12,cursor:'pointer'}}>Copy</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SummarizePageInner() {
  return <Suspense fallback={<div style={{minHeight:'100vh'}}/>}><SummarizePageInner/></Suspense>
}

export default function SummarizePage() {
  return <Suspense fallback={<div style={{minHeight:'100vh'}}/>}><SummarizePageInner/></Suspense>
}
