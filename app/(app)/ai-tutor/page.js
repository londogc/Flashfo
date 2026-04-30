'use client'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

export default function NovaPage() {
  const { user } = useAuth()
  const isFirstVisit = typeof window !== 'undefined' && !localStorage.getItem('ff-nova-visited')
  const [messages, setMessages] = useState([
    { role: 'nova', text: isFirstVisit
      ? "Hey, I'm Nova — I'm not just a chatbot. Tell me what classes you're in or what you want to study and I'll make everything specific to you. What are we working on?"
      : "Hey! I'm Nova. Ask me anything — explain a concept, quiz you on a topic, summarize your notes, or build a study guide. What are we tackling today?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  function speak(text) {
    if (!(typeof window!=='undefined'&&window.speechSynthesis)) return
    (typeof window!=='undefined'&&window.speechSynthesis).cancel()
    if (speaking) { setSpeaking(false); return }
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 1.05; utt.pitch = 1
    utt.onend = () => setSpeaking(false)
    setSpeaking(true)
    (typeof window!=='undefined'&&window.speechSynthesis).speak(utt)
  }
  const [grade, setGrade] = useState('')
  const [classContext, setClassContext] = useState(null)
  const [allClasses, setAllClasses] = useState([])
  const [showClassManager, setShowClassManager] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [newClassSubject, setNewClassSubject] = useState('')
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  
  useEffect(() => {
    if (typeof window === 'undefined') return
    const welcomed = localStorage.getItem('ff-nova-welcomed')
    if (!welcomed) {
      setMessages(prev => prev.length === 0 ? [{
        role: 'assistant', ts: new Date().toISOString(),
        text: "Hey, I'm Nova — I'm not just a chatbot. Tell me what classes you're in or what you want to study and I'll make everything specific to you."
      }] : prev)
      localStorage.setItem('ff-nova-welcomed', '1')
    }
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (!user) return
    // Load profile for grade level
    supabase.from('profiles').select('grade_level').eq('id', user.id).single()
      .then(({ data }) => { if (data?.grade_level) setGrade(data.grade_level) })
    // Load most recent enrolled classroom for context
    // Load all saved Nova classes
    supabase.from('nova_user_classes').select('*').eq('user_id', user.id).order('created_at').then(({ data }) => {
      if (data && data.length > 0) setAllClasses(data)
    })
    supabase.from('student_enrollments')
      .select('*, classroom:classrooms(*)')
      .eq('student_id', user.id)
      .order('joined_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.classroom) {
          // Get recent homework to give Nova context on what they're studying
          supabase.from('homework_assignments')
            .select('title, quiz_data')
            .eq('classroom_id', data.classroom.id)
            .eq('status', 'open')
            .order('due_date', { ascending: true })
            .limit(3)
            .then(({ data: hw }) => {
              setClassContext({
                className: data.classroom.name,
                subject: data.classroom.subject,
                homework: (hw || []).map(h => h.title)
              })
            })
        }
      })
  }, [user])

  function buildSystemPrompt(allClasses) {
    let prompt = 'You are Nova, a proactive AI study tutor inside Flashfo. You are warm, encouraging, and specific — not generic. '
    if (grade) {
      prompt += 'The student is in ' + grade + '. Calibrate language and depth accordingly. '
    }
    if (allClasses && allClasses.length > 0) {
      prompt += 'The student is enrolled in the following classes: ' + allClasses.map(c => '"' + c.name + '"' + (c.subject ? ' (' + c.subject + ')' : '') + (c.teacher ? ' with ' + c.teacher : '')).join(', ') + '. '
      prompt += 'When relevant, tailor examples, flashcards, and quiz questions to these specific classes. '
    }
    if (classContext) {
      prompt += 'Currently active class: "' + classContext.className + '"'
      if (classContext.subject) prompt += ' (' + classContext.subject + ')'
      if (classContext.homework?.length > 0) {
        prompt += '. Current assignments: ' + classContext.homework.join(', ') + '.'
      }
      prompt += ' '
    }
    prompt += 'Be proactive: if the student mentions struggling with something, suggest relevant flashcards or a quiz. If you detect a new class or subject they mention, acknowledge it and offer to build a study kit for it. '
    prompt += 'Keep responses focused and actionable. Format with short paragraphs. '
    return prompt
  }

  async function send() {
    try { localStorage.setItem('ff-nova-visited', '1') } catch(e) {}
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
    const newMessages = [...messages, { role: 'user', text }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const history = newMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))
      const res = await fetch('/api/rpc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: 'generateChatResponse', args: [history, buildSystemPrompt(allClasses)] })
      })
      const data = await res.json()
      const result = data.result?.content || data.result || ''
      if (!result || data.error) {
        const res2 = await fetch('/api/rpc', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fn: 'explainSimplyFromText', args: [text, 'English'] })
        })
        const data2 = await res2.json()
        setMessages(m => [...m, { role: 'nova', text: typeof data2.result === 'string' ? data2.result : 'Could not get a response. Try again.' }])
      } else {
        setMessages(m => [...m, { role: 'nova', text: typeof result === 'string' ? result : JSON.stringify(result) }])
      }
    } catch {
      try {
        const res2 = await fetch('/api/rpc', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fn: 'explainSimplyFromText', args: [text, 'English'] })
        })
        const data2 = await res2.json()
        setMessages(m => [...m, { role: 'nova', text: typeof data2.result === 'string' ? data2.result : 'Something went wrong.' }])
      } catch { setMessages(m => [...m, { role: 'nova', text: 'Something went wrong. Please try again.' }]) }
    } finally { setLoading(false) }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function clearChat() {
    setMessages([{ role: 'nova', text: "Hi, I'm Nova — your AI study companion. Ask me anything: explain a concept, work through a topic, summarize your notes, or build a study guide. What are we tackling today?" }])
  }


  // ── Helpers ──────────────────────────────────────────────────────────
  const SUGGESTION_CHIPS = [
    'Review my due cards',
    'Quiz me on a topic',
    'Explain a concept',
    'Build me flashcards',
  ]

  const formatTime = (d) => {
    const dt = d ? new Date(d) : new Date()
    return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }


  const CHIPS = ['Review my due cards','Quiz me on a topic','Explain a concept','Build me flashcards']
  const fmt = (d) => { const t=d?new Date(d):new Date(); return t.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) }

  // ── file upload ref ──
  const fileRef = useRef(null)
  const handleFile = async (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1]
      setInput(prev => prev + (prev?'\n':'') + '[Attached: '+file.name+']')
    }
    reader.readAsDataURL(file)
  }

  // ── mic ──
  const startMic = () => {
    if (typeof window === 'undefined') return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Speech recognition not supported in this browser'); return }
    const rec = new SR()
    rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1
    rec.onresult = (e) => { setInput(prev => prev + e.results[0][0].transcript) }
    rec.start()
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 56px)',background:'var(--c-bg)',overflow:'hidden'}}>

      {/* ── Header ── */}
      <div style={{flexShrink:0,background:'linear-gradient(135deg,rgba(124,58,237,0.18) 0%,rgba(167,139,250,0.05) 100%)',borderBottom:'1px solid rgba(167,139,250,0.15)',padding:'14px 20px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',maxWidth:760,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:38,height:38,borderRadius:10,background:'rgba(124,58,237,0.15)',border:'1px solid rgba(167,139,250,0.3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2" fill="#a78bfa" stroke="none"/>
              </svg>
              <span className="nova-thinking" style={{position:'absolute',bottom:2,right:2,width:7,height:7,borderRadius:'50%',background:'#34d399',border:'1.5px solid var(--c-bg)'}}/>
            </div>
            <div>
              <div style={{fontSize:15,fontWeight:600,color:'var(--c-t1)',letterSpacing:'-0.02em'}}>Nova</div>
              <div style={{fontSize:11,color:'#a78bfa',marginTop:1}}>Built for how you study</div>
            </div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={startMic} title="Voice input" style={{width:30,height:30,borderRadius:8,cursor:'pointer',border:'1px solid rgba(167,139,250,0.2)',background:'rgba(167,139,250,0.06)',display:'flex',alignItems:'center',justifyContent:'center',color:'#a78bfa'}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0014 0M12 19v3M9 22h6"/></svg>
            </button>
            <button onClick={()=>setMessages([])} title="Clear chat" style={{width:30,height:30,borderRadius:8,cursor:'pointer',border:'1px solid rgba(167,139,250,0.2)',background:'rgba(167,139,250,0.06)',display:'flex',alignItems:'center',justifyContent:'center',color:'#a78bfa'}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Classes pill bar ── */}
      {(allClasses.length > 0 || classContext) && (
        <div style={{flexShrink:0,background:'rgba(124,58,237,0.05)',borderBottom:'1px solid rgba(167,139,250,0.1)',padding:'7px 20px',display:'flex',alignItems:'center',gap:6,overflowX:'auto'}}>
          <span style={{fontSize:10,color:'#484f58',letterSpacing:'0.07em',flexShrink:0}}>CLASSES</span>
          {allClasses.length > 0
            ? allClasses.map((c,i)=>(<span key={i} style={{padding:'3px 10px',borderRadius:20,flexShrink:0,background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.2)',fontSize:11,color:'#c4b5fd',whiteSpace:'nowrap'}}>{c.name}</span>))
            : classContext && <span style={{padding:'3px 10px',borderRadius:20,background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.2)',fontSize:11,color:'#c4b5fd'}}>{classContext.className}</span>
          }
        </div>
      )}

      {/* ── Messages ── */}
      <div style={{flex:1,overflowY:'auto',padding:'20px'}}>
        <div style={{maxWidth:760,margin:'0 auto',display:'flex',flexDirection:'column',gap:4}}>

          {messages.length === 0 && (
            <div style={{textAlign:'center',padding:'60px 16px 32px'}}>
              <div style={{width:56,height:56,borderRadius:14,margin:'0 auto 18px',background:'rgba(124,58,237,0.12)',border:'1px solid rgba(167,139,250,0.25)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.4"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="#a78bfa" stroke="none"/></svg>
              </div>
              <p style={{fontSize:16,fontWeight:600,color:'var(--c-t1)',marginBottom:8}}>Hey, I'm Nova</p>
              <p style={{fontSize:13,color:'var(--c-t2)',lineHeight:1.7,maxWidth:320,margin:'0 auto 24px'}}>Ask me anything — I'll explain concepts, quiz you, build flashcards, or help you prep for a test.</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center'}}>
                {CHIPS.map((c,i)=>(
                  <button key={i} onClick={()=>setInput(c)} style={{padding:'7px 14px',borderRadius:8,cursor:'pointer',border:'1px solid rgba(167,139,250,0.2)',background:'rgba(167,139,250,0.06)',fontSize:12,color:'#a78bfa'}}>{c}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m,i)=>{
            const isNova = m.role==='assistant'
            const showChips = isNova && i===0
            return (
              <div key={i} style={{marginBottom:14}}>
                {isNova ? (
                  <div>
                    <div style={{paddingLeft:14,borderLeft:'2px solid rgba(167,139,250,0.45)'}}>
                      <div style={{fontSize:10,fontWeight:600,color:'#a78bfa',letterSpacing:'0.08em',marginBottom:5}}>NOVA</div>
                      <div style={{fontSize:13,color:'var(--c-t1)',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{m.text}</div>
                      {showChips && (
                        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>
                          {CHIPS.map((c,ci)=>(<button key={ci} onClick={()=>setInput(c)} style={{padding:'5px 12px',borderRadius:8,cursor:'pointer',border:'1px solid rgba(167,139,250,0.2)',background:'rgba(167,139,250,0.06)',fontSize:12,color:'#a78bfa'}}>{c}</button>))}
                        </div>
                      )}
                    </div>
                    <div style={{fontSize:10,color:'#30363d',marginTop:5,paddingLeft:16}}>{fmt(m.ts)}</div>
                  </div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end'}}>
                    <div style={{background:'#1e3a8a',borderRadius:'12px 12px 2px 12px',padding:'10px 14px',maxWidth:'min(80%, 560px)',fontSize:13,color:'#dbeafe',lineHeight:1.6}}>{m.text}</div>
                    <div style={{fontSize:10,color:'#30363d',marginTop:5}}>{fmt(m.ts)}</div>
                  </div>
                )}
              </div>
            )
          })}

          {loading && (
            <div style={{marginBottom:14}}>
              <div style={{paddingLeft:14,borderLeft:'2px solid rgba(167,139,250,0.45)'}}>
                <div style={{fontSize:10,fontWeight:600,color:'#a78bfa',letterSpacing:'0.08em',marginBottom:6}}>NOVA</div>
                <div style={{display:'flex',gap:4,alignItems:'center',height:20}}>
                  {[0,1,2].map(i=>(<div key={i} className="nova-thinking" style={{width:5,height:5,borderRadius:'50%',background:'#a78bfa',animationDelay:i*0.2+'s'}}/>))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef}/>
        </div>
      </div>

      {/* ── Input ── */}
      <div style={{flexShrink:0,borderTop:'1px solid #21262d',background:'var(--c-surface)',padding:'12px 16px'}}>
        <div style={{maxWidth:760,margin:'0 auto'}}>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f)}}/>
          <div style={{display:'flex',gap:8,alignItems:'flex-end',background:'var(--c-bg)',border:'1px solid #30363d',borderRadius:12,padding:'9px 9px 9px 14px'}}
            onFocus={e=>{const p=e.currentTarget;p.style.borderColor='rgba(167,139,250,0.45)'}}
            onBlur={e=>{const p=e.currentTarget;p.style.borderColor='#30363d'}}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e=>{setInput(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'}}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}
              placeholder="Ask Nova anything..."
              rows={1}
              style={{flex:1,background:'none',border:'none',outline:'none',color:'var(--c-t1)',fontSize:13,resize:'none',lineHeight:1.5,fontFamily:'inherit',minHeight:20,maxHeight:120,overflow:'hidden',paddingTop:1,display:'block',width:'100%'}}
            />
            <div style={{display:'flex',gap:5,alignItems:'center',flexShrink:0}}>
              <button onClick={()=>fileRef.current?.click()} title="Upload file" style={{width:30,height:30,borderRadius:8,border:'1px solid #30363d',background:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#484f58'}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              </button>
              <button onClick={send} disabled={loading||!input.trim()} style={{width:32,height:32,borderRadius:9,border:'none',background:input.trim()?'#7c3aed':'#21262d',cursor:input.trim()?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',color:input.trim()?'#fff':'#484f58',transition:'all 0.15s'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              </button>
            </div>
          </div>
          <p style={{fontSize:10,color:'#484f58',textAlign:'center',marginTop:7}}>Shift+Enter for new line · Nova knows your classes</p>
        </div>
      </div>
    </div>
  )
}