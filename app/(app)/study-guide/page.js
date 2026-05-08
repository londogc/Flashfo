'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import { saveItem } from '@/lib/savedItems'
import { saveDraft, loadDraft, clearDraft } from '@/lib/saveDraft'

function renderStudyGuide(text) {
  const lines = text.split('\n')
  const elements = []
  let key = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const lowerTrimmed = trimmed.toLowerCase()
    if (lowerTrimmed.includes('memory trick') || lowerTrimmed.includes('mnemonic') || lowerTrimmed.includes('memory aids')) {
      while (i + 1 < lines.length && !lines[i+1].trim().startsWith('---') && !lines[i+1].trim().startsWith('###')) i++
      continue
    }
    if (trimmed === '---' || trimmed === '') continue
    if (trimmed.startsWith('### ')) {
      const heading = trimmed.replace(/^### /, '').replace(/\*\*/g, '')
      elements.push(<div key={key++} className="mt-6 mb-2 pb-1.5 border-b border-line"><span className="text-[11px] font-bold text-t3 uppercase tracking-wider">{heading}</span></div>)
      continue
    }
    if (/^\*\*[^*]+\*\*:?$/.test(trimmed)) {
      const title = trimmed.replace(/\*\*/g, '').replace(/:$/, '')
      elements.push(<p key={key++} className="text-sm font-bold text-t1 mt-3 mb-1">{title}</p>)
      continue
    }
    if (/^[-*] /.test(trimmed)) {
      const content = trimmed.replace(/^[-*] /, '').replace(/\*\*([^*]+)\*\*/g, '$1')
      const colonMatch = content.match(/^([^:]+): (.+)$/)
      if (colonMatch) {
        elements.push(<div key={key++} className="flex gap-2 mb-1.5 text-sm"><span className="text-blue-500 flex-shrink-0 mt-0.5">•</span><span className="text-t1"><span className="font-semibold">{colonMatch[1]}:</span> {colonMatch[2]}</span></div>)
      } else {
        elements.push(<div key={key++} className="flex gap-2 mb-1.5 text-sm"><span className="text-blue-500 flex-shrink-0 mt-0.5">•</span><span className="text-t2">{content}</span></div>)
      }
      continue
    }
    if (/^\d+\./.test(trimmed)) {
      const num = trimmed.match(/^(\d+)\./)
      const content = trimmed.replace(/^\d+\.\s*/, '').replace(/\*\*([^*]+)\*\*/g, '$1')
      elements.push(<div key={key++} className="flex gap-2 mb-2 text-sm"><span className="text-blue-500 font-bold flex-shrink-0 w-5">{num[1]}.</span><span className="text-t1">{content}</span></div>)
      continue
    }
    if (trimmed) {
      const clean = trimmed.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
      elements.push(<p key={key++} className="text-sm text-t1 leading-relaxed mb-2">{clean}</p>)
    }
  }
  return <div>{elements}</div>
}

export default function StudyGuidePage() {
  const { user } = useAuth()
  const [topic, setTopic] = useState('')
  const [depth, setDepth] = useState('standard')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [draftBanner, setDraftBanner] = useState(false)
  const [autoGenTopic, setAutoGenTopic] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) {
      const decoded = decodeURIComponent(q)
      setTopic(decoded)
      if (params.get('autoGenerate') === '1') setAutoGenTopic(decoded)
      return
    }
    loadDraft('study-guide').then(draft => {
      if (draft?.data?.output) {
        setTopic(draft.data.topic || '')
        setDepth(draft.data.depth || 'standard')
        setOutput(draft.data.output)
        setDraftBanner(true)
      }
    })
  }, [])

  useEffect(() => {
    if (autoGenTopic.trim() && topic === autoGenTopic && !loading && !output) {
      generate()
      setAutoGenTopic('')
    }
  }, [autoGenTopic, topic])

  useEffect(() => {
    const id = 'nova-gen-anim'
    if (document.getElementById(id)) return
    const s = document.createElement('style')
    s.id = id
    s.textContent = '@keyframes nova-pop{0%{opacity:0;transform:translateY(14px) scale(0.97)}60%{opacity:1;transform:translateY(-3px) scale(1.005)}100%{opacity:1;transform:translateY(0) scale(1)}} @keyframes nova-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.85)}} .nova-card{opacity:0;animation:nova-pop .42s cubic-bezier(.22,.68,0,1.2) forwards} .nova-dot-pulse{animation:nova-pulse .9s ease-in-out infinite}'
    document.head.appendChild(s)
  }, [])

  async function generate() {
    if (!topic.trim()) return
    setLoading(true); setOutput(''); setError(''); setSaved(false); setDraftBanner(false)
    try {
      const depthNote = depth === 'quick' ? ' Keep it concise, key points only.' : depth === 'deep' ? ' Be comprehensive and thorough with examples.' : ''
      const res = await fetch('/api/rpc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'generateStudyGuideFromText', args: [topic.trim() + depthNote + ' Write in an engaging, student-friendly tone. Use clear section headings without ### symbols. Write bullet points as plain text without ** markers. Make it feel like a knowledgeable teacher wrote this, not a textbook. Be direct, real, and interesting. Do NOT include a Memory Tricks or Mnemonics section.', 'English'] })
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      const result = typeof data.result === 'string' ? data.result : JSON.stringify(data.result)
      setOutput(result)
      if (user) await saveDraft('study-guide', topic.trim(), { topic: topic.trim(), depth, output: result })
    } catch { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  async function doSave() {
    if (!user || !output) return
    setSaving(true)
    try {
      await saveItem(user.id, 'study_guide', topic, { output, topic, depth })
      setSaved(true)
      await clearDraft('study-guide')
      setTimeout(() => setSaved(false), 3000)
    } catch {}
    finally { setSaving(false) }
  }

  function startFresh() {
    setTopic(''); setOutput(''); setDraftBanner(false)
    clearDraft('study-guide')
  }

  const sections = output ? output.split(/(?=## )/).filter(Boolean) : []

  return (
    <div style={{minHeight:'100vh',background:'#0d1117',padding:'32px 20px',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <div style={{maxWidth:660,margin:'0 auto'}}>

        {draftBanner && (
          <div style={{background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.22)',borderRadius:10,padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
            <span style={{fontSize:12,color:'rgba(241,240,255,0.7)',flex:1}}>Resuming your last study guide — <strong style={{color:'rgba(241,240,255,0.9)'}}>{topic}</strong></span>
            <button onClick={startFresh} style={{fontSize:11,color:'rgba(241,240,255,0.4)',background:'none',border:'none',cursor:'pointer'}}>Start fresh</button>
          </div>
        )}

        <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(52,211,153,0.08)',border:'1px solid rgba(52,211,153,0.2)',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700,color:'#34d399',marginBottom:20,letterSpacing:'0.04em'}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
          NOVA · STUDY GUIDE
        </div>

        <div style={{marginBottom:24}}>
          <div style={{fontSize:24,fontWeight:800,color:'#e6edf3',letterSpacing:'-0.02em',marginBottom:6}}>Build a study guide</div>
          <div style={{fontSize:14,color:'#8b949e'}}>Nova writes a structured, in-depth guide on any topic.</div>
        </div>

        <input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!loading&&topic.trim()&&generate()}
          placeholder="Enter a topic — e.g. Photosynthesis, The Cold War..."
          style={{width:'100%',background:'#161b22',border:'1px solid #30363d',borderRadius:10,padding:'12px 14px',fontSize:14,color:'#e6edf3',outline:'none',marginBottom:10,display:'block'}}/>

        <div style={{display:'flex',gap:8,marginBottom:14}}>
          {['brief','standard','deep'].map(d=>(
            <button key={d} onClick={()=>setDepth(d)}
              style={{padding:'6px 14px',borderRadius:7,border:'1px solid '+(depth===d?'#2563eb':'#21262d'),background:depth===d?'rgba(37,99,235,0.12)':'transparent',color:depth===d?'#3b82f6':'#6b7280',fontSize:12,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>
              {d}
            </button>
          ))}
        </div>

        <button onClick={()=>!loading&&topic.trim()&&generate()} disabled={loading||!topic.trim()}
          style={{width:'100%',padding:'13px 0',borderRadius:10,border:'none',background:'linear-gradient(90deg,#2563eb,#7c3aed)',color:'#fff',fontSize:14,fontWeight:700,cursor:loading?'not-allowed':'pointer',opacity:(loading||!topic.trim())?0.6:1,letterSpacing:'-0.01em',marginBottom:16}}>
          {loading ? 'Nova is writing...' : 'Generate study guide →'}
        </button>

        <div style={{display:'flex',alignItems:'center',gap:8,minHeight:22,marginBottom:12}}>
          {loading && <div className="nova-dot-pulse" style={{width:7,height:7,borderRadius:'50%',background:'#a78bfa'}}/>}
          {loading && <span style={{fontSize:12,color:'#8b949e'}}>Nova is structuring your guide...</span>}
          {!loading && output && <><div style={{width:7,height:7,borderRadius:'50%',background:'#34d399'}}/><span style={{fontSize:12,color:'#34d399'}}>Study guide ready</span></>}
        </div>

        {error && <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:9,padding:'10px 14px',fontSize:13,color:'#f87171',marginBottom:14}}>{error}</div>}

        {sections.length > 0 ? sections.map((section,i)=>(
          <div key={i} className="nova-card" style={{animationDelay:i*110+'ms',background:'#161b22',border:'1px solid #21262d',borderRadius:12,padding:'18px 20px',marginBottom:10}}>
            <div style={{fontSize:13,color:'#e6edf3',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{section}</div>
          </div>
        )) : output ? (
          <div className="nova-card" style={{background:'#161b22',border:'1px solid #21262d',borderRadius:12,padding:'18px 20px'}}>
            <div style={{fontSize:13,color:'#e6edf3',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{output}</div>
          </div>
        ) : null}

        {output && !loading && (
          <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap',alignItems:'center'}}>
            <button onClick={()=>navigator.clipboard?.writeText(output)} style={{padding:'6px 14px',borderRadius:7,border:'1px solid #30363d',background:'transparent',color:'#8b949e',fontSize:12,cursor:'pointer'}}>Copy</button>
            {user && <button onClick={doSave} disabled={saving} style={{padding:'6px 14px',borderRadius:7,border:'1px solid rgba(52,211,153,0.25)',background:'rgba(16,185,129,0.07)',color:'#34d399',fontSize:12,cursor:'pointer',fontWeight:600}}>{saving?'Saving...':saved?'Saved!':'Save to My Stuff'}</button>}
            <button onClick={startFresh} style={{padding:'6px 14px',borderRadius:7,border:'1px solid #30363d',background:'transparent',color:'#8b949e',fontSize:12,cursor:'pointer',marginLeft:'auto'}}>New guide</button>
          </div>
        )}
      </div>
    </div>
  )
}
