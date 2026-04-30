'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

const CHIPS = ['Review my due cards', 'Quiz me on a topic', 'Explain a concept', 'Build me flashcards']
const fmt = (d) => { try { const t=d?new Date(d):new Date(); return t.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) } catch { return '' } }

// ── Register levels ─────────────────────────────────────────────────────────
const REGISTERS = [
  { id:'simple', label:'Simple', desc:'Plain language, analogies' },
  { id:'normal', label:'Normal', desc:'Standard explanation' },
  { id:'advanced', label:'Advanced', desc:'Technical depth, AP level' },
]

export default function NovaPage() {
  const { user } = useAuth()
  const [messages, setMessages]         = useState([])
  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [speaking, setSpeaking]         = useState(false)
  const [grade, setGrade]               = useState('')
  const [classContext, setClassContext] = useState(null)
  const [allClasses, setAllClasses]     = useState([])
  const [showClassManager, setShowClassManager] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [newClassSubject, setNewClassSubject] = useState('')
  const [register, setRegister]         = useState('normal')
  const [showRegister, setShowRegister] = useState(false)
  const [studySession, setStudySession] = useState(null) // { startTime, topic, questionsAnswered, correct }
  const [sessionTimer, setSessionTimer] = useState(0)
  const [dueCards, setDueCards]         = useState(0)
  const [recentActivity, setRecentActivity] = useState(null) // { topic, score, date }
  const [streamingId, setStreamingId]   = useState(null) // id of message currently streaming
  const bottomRef  = useRef(null)
  const textareaRef= useRef(null)
  const fileRef    = useRef(null)
  const timerRef   = useRef(null)

  // ── Scroll to bottom ────────────────────────────────────────────────────
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, loading])

  // ── Load session memory + context on mount ───────────────────────────────
  useEffect(() => {
    if (!user) return

    // Load last 30 messages from Supabase for session memory
    supabase.from('nova_messages').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMessages(data.reverse().map(m => ({ role: m.role, text: m.content, ts: m.created_at })))
        } else {
          // First time — show welcome
          const welcome = { role:'assistant', text:"Hey! I'm Nova — built for how you study. Tell me what you're working on or pick something below.", ts: new Date().toISOString() }
          setMessages([welcome])
          supabase.from('nova_messages').insert({ user_id: user.id, role:'assistant', content: welcome.text }).then(()=>{})
          if (typeof window !== 'undefined') localStorage.setItem('ff-nova-welcomed','1')
        }
      })

    // Grade level
    supabase.from('profiles').select('grade_level').eq('id', user.id).single()
      .then(({ data }) => { if (data?.grade_level) setGrade(data.grade_level) })

    // All saved Nova classes
    supabase.from('nova_user_classes').select('*').eq('user_id', user.id).order('created_at')
      .then(({ data }) => { if (data?.length) setAllClasses(data) })

    // Active classroom
    supabase.from('student_enrollments').select('*, classroom:classrooms(*)')
      .eq('student_id', user.id).order('joined_at', { ascending: false }).limit(1).single()
      .then(({ data }) => {
        if (data?.classroom) {
          supabase.from('homework_assignments').select('title').eq('classroom_id', data.classroom.id)
            .eq('status','open').order('due_date').limit(3)
            .then(({ data: hw }) => {
              setClassContext({ className: data.classroom.name, subject: data.classroom.subject, homework: (hw||[]).map(h=>h.title) })
            })
        }
      })

    // Recent quiz score
    supabase.from('saved_items').select('title, metadata, created_at').eq('user_id', user.id)
      .eq('type','quiz_result').order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (data?.[0]) setRecentActivity({ topic: data[0].title, score: data[0].metadata?.score, date: data[0].created_at }) })

    // Due flashcards today
    supabase.from('ff_card_reviews').select('id', { count:'exact' }).eq('user_id', user.id)
      .lte('next_review', new Date().toISOString())
      .then(({ count }) => { if (count) setDueCards(count) })

  }, [user])

  // ── Study session timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (studySession) {
      timerRef.current = setInterval(() => setSessionTimer(s => s+1), 1000)
    } else {
      clearInterval(timerRef.current)
      setSessionTimer(0)
    }
    return () => clearInterval(timerRef.current)
  }, [studySession])

  // ── Build system prompt ─────────────────────────────────────────────────
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

  // Extend system prompt with register + activity context
  const buildFullSystemPrompt = () => {
    let prompt = buildSystemPrompt(allClasses)
    const regMap = { simple: 'Use very simple language, relatable analogies, short sentences. Avoid jargon.', advanced: 'Use precise technical language, AP/college level depth. Assume strong background knowledge.' }
    if (regMap[register]) prompt += regMap[register] + ' '
    if (recentActivity?.topic) prompt += 'Recently the student scored ' + (recentActivity.score||'?') + '% on ' + recentActivity.topic + '. '
    if (dueCards > 0) prompt += 'The student has ' + dueCards + ' flashcards due for review today. '
    if (studySession?.topic) prompt += 'Current study session topic: ' + studySession.topic + '. Questions answered: ' + (studySession.questionsAnswered||0) + '.'
    return prompt
  }

  // ── Detect topic from message ───────────────────────────────────────────
  const detectTopic = (text) => {
    const topicMatch = text.match(/(?:about|on|for|studying|review|quiz(?:ze)? me on|explain|understand)s+([A-Za-z][^.!?]{3,40})/i)
    return topicMatch ? topicMatch[1].trim() : null
  }

  // ── Save message to Supabase ────────────────────────────────────────────
  const saveMessage = async (role, content) => {
    if (!user) return
    await supabase.from('nova_messages').insert({ user_id: user.id, role, content })
  }

  // ── Streaming send ──────────────────────────────────────────────────────
  const send = async (overrideText) => {
    const msg = (overrideText || input).trim()
    if (!msg || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const userMsg = { role:'user', text: msg, ts: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    await saveMessage('user', msg)

    // Detect topic for study session
    const topic = detectTopic(msg)
    if (topic && !studySession) setStudySession({ startTime: Date.now(), topic, questionsAnswered:0, correct:0 })

    // Detect new class mentions and auto-save
    const classMatch = msg.match(/(?:i(?:'m| am) (?:in|taking|enrolled in)|my class(?:es)?)[:\s]+([A-Z][^.!?\n]{3,40})/i)
    if (classMatch && user) {
      const name = classMatch[1].trim()
      if (!allClasses.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        supabase.from('nova_user_classes').insert({ user_id: user.id, name }).then(({ data }) => {
          if (data) setAllClasses(prev => [...prev, ...data])
        })
      }
    }

    setLoading(true)
    const tempId = Date.now().toString()
    setStreamingId(tempId)
    setMessages(prev => [...prev, { role:'assistant', text:'', ts: new Date().toISOString(), id: tempId, streaming: true }])

    try {
      const history = [...messages, userMsg]
      let fullText = ''
      let streamOk = false

      try {
        const res = await fetch('/api/nova-stream', {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ messages: history, systemPrompt: buildFullSystemPrompt() })
        })

        if (res.ok && res.body) {
          streamOk = true
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            fullText += chunk
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: fullText } : m))
          }
        }
      } catch {}

      // Fallback to non-streaming RPC if stream failed or empty
      if (!streamOk || !fullText.trim()) {
        const fallback = await fetch('/api/rpc', {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ fn:'generateChatResponse', args:[history, buildFullSystemPrompt()] })
        })
        const fdata = await fallback.json()
        fullText = fdata.reply || 'Sorry, I had trouble with that. Try again.'

        // Typewriter effect for fallback
        let displayed = ''
        for (let ci = 0; ci < fullText.length; ci++) {
          displayed += fullText[ci]
          const snap = displayed
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: snap } : m))
          if (ci % 8 === 0) await new Promise(r => setTimeout(r, 10))
        }
      }

      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, streaming: false } : m))
      await saveMessage('assistant', fullText)

      // Update study session
      if (studySession) setStudySession(prev => ({ ...prev, questionsAnswered: (prev?.questionsAnswered||0) + 1 }))

    } catch (err) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: 'Something went wrong — try again.', streaming: false } : m))
    }

    setLoading(false)
    setStreamingId(null)
  }

  // ── Voice input ─────────────────────────────────────────────────────────
  const startMic = () => {
    if (typeof window === 'undefined') return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice input not supported in this browser'); return }
    const rec = new SR()
    rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1
    rec.onresult = (e) => { const t = e.results[0][0].transcript; setInput(prev => prev ? prev + ' ' + t : t) }
    rec.onerror = () => {}
    rec.start()
  }

  // ── Read aloud ──────────────────────────────────────────────────────────
  const readAloud = (text) => {
    if (typeof window === 'undefined') return
    const synth = window.speechSynthesis
    if (!synth) return
    if (speaking) { synth.cancel(); setSpeaking(false); return }
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.95; utt.onend = () => setSpeaking(false)
    setSpeaking(true); synth.speak(utt)
  }

  // ── File upload ─────────────────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1]
      setLoading(true)
      try {
        const res = await fetch('/api/rpc', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ fn:'summarizeImportedFile', args:[{ base64, mimeType: file.type, filename: file.name }, 'Extract all text content clearly.'] }) })
        const data = await res.json()
        const extracted = data.result || data.text || ''
        if (extracted) {
          setInput('[Document: ' + file.name + ']\n\n' + extracted.slice(0, 2000))
        }
      } catch { setInput('[Attached: ' + file.name + ']') }
      setLoading(false)
    }
    reader.readAsDataURL(file)
  }

  // ── End study session ───────────────────────────────────────────────────
  const endSession = () => {
    if (!studySession) return
    const mins = Math.round(sessionTimer / 60)
    const summary = 'Study session complete! You studied ' + studySession.topic + ' for ' + mins + ' minute' + (mins!==1?'s':'') + '. ' + (studySession.questionsAnswered||0) + ' questions answered.'
    setMessages(prev => [...prev, { role:'assistant', text: summary, ts: new Date().toISOString(), sessionEnd: true }])
    saveMessage('assistant', summary)
    setStudySession(null)
  }

  // ── Save as flashcards ──────────────────────────────────────────────────
  const saveAsFlashcards = async (text) => {
    if (!user || !text) return
    try {
      const res = await fetch('/api/rpc', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ fn:'generateFlashcardsCore', args:['Nova conversation', text, 8] }) })
      const data = await res.json()
      if (data.result) {
        await supabase.from('saved_items').insert({ user_id: user.id, type:'flashcards', title:'Nova: ' + (studySession?.topic || 'Study session'), content: JSON.stringify(data.result) })
        setMessages(prev => [...prev, { role:'assistant', text:'Saved as a flashcard deck — find it in My Stuff.', ts: new Date().toISOString() }])
        saveMessage('assistant', 'Saved as a flashcard deck — find it in My Stuff.')
      }
    } catch {}
  }


  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 56px)',background:'var(--c-bg)',overflow:'hidden'}}>

      {/* ── Header ── */}
      <div style={{flexShrink:0,background:'linear-gradient(135deg,rgba(124,58,237,0.18) 0%,rgba(167,139,250,0.05) 100%)',borderBottom:'1px solid rgba(167,139,250,0.15)',padding:'12px 20px'}}>
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

          {/* Right controls */}
          <div style={{display:'flex',gap:5,alignItems:'center'}}>
            {/* Register picker */}
            <div style={{position:'relative'}}>
              <button onClick={()=>setShowRegister(v=>!v)} title="Explanation level"
                style={{height:28,padding:'0 10px',borderRadius:7,cursor:'pointer',border:'1px solid rgba(167,139,250,0.2)',background:'rgba(167,139,250,0.06)',display:'flex',alignItems:'center',gap:5,color:'#a78bfa',fontSize:11,fontWeight:500}}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                {REGISTERS.find(r=>r.id===register)?.label}
              </button>
              {showRegister && (
                <div style={{position:'absolute',top:'calc(100% + 6px)',right:0,background:'var(--c-surface)',border:'1px solid var(--c-line)',borderRadius:10,padding:6,zIndex:50,minWidth:160,boxShadow:'0 4px 20px rgba(0,0,0,0.3)'}}>
                  {REGISTERS.map(r=>(
                    <button key={r.id} onClick={()=>{setRegister(r.id);setShowRegister(false)}}
                      style={{display:'block',width:'100%',padding:'8px 12px',borderRadius:7,border:'none',background:register===r.id?'rgba(167,139,250,0.1)':'none',textAlign:'left',cursor:'pointer',marginBottom:2}}>
                      <div style={{fontSize:12,fontWeight:600,color:register===r.id?'#a78bfa':'var(--c-t1)'}}>{r.label}</div>
                      <div style={{fontSize:10,color:'var(--c-t3)'}}>{r.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Study session toggle */}
            {studySession ? (
              <button onClick={endSession}
                style={{height:28,padding:'0 10px',borderRadius:7,cursor:'pointer',border:'1px solid rgba(52,211,153,0.3)',background:'rgba(52,211,153,0.08)',display:'flex',alignItems:'center',gap:5,color:'#34d399',fontSize:11,fontWeight:500}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="16 8 8 16"/><polyline points="8 8 8 16 16 16"/></svg>
                {Math.floor(sessionTimer/60)+':'+(sessionTimer%60).toString().padStart(2,'0')}
              </button>
            ) : (
              <button onClick={()=>setStudySession({startTime:Date.now(),topic:'General',questionsAnswered:0,correct:0})}
                title="Start study session"
                style={{width:28,height:28,borderRadius:7,cursor:'pointer',border:'1px solid rgba(167,139,250,0.2)',background:'rgba(167,139,250,0.06)',display:'flex',alignItems:'center',justifyContent:'center',color:'#a78bfa'}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </button>
            )}

            <button onClick={startMic} title="Voice input"
              style={{width:28,height:28,borderRadius:7,cursor:'pointer',border:'1px solid rgba(167,139,250,0.2)',background:'rgba(167,139,250,0.06)',display:'flex',alignItems:'center',justifyContent:'center',color:'#a78bfa'}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0014 0M12 19v3M9 22h6"/></svg>
            </button>
            <button onClick={()=>setMessages([])} title="Clear chat"
              style={{width:28,height:28,borderRadius:7,cursor:'pointer',border:'1px solid rgba(167,139,250,0.2)',background:'rgba(167,139,250,0.06)',display:'flex',alignItems:'center',justifyContent:'center',color:'#a78bfa'}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Context bar ── */}
      {(allClasses.length > 0 || classContext || dueCards > 0 || recentActivity) && (
        <div style={{flexShrink:0,background:'rgba(124,58,237,0.05)',borderBottom:'1px solid rgba(167,139,250,0.1)',padding:'6px 20px',display:'flex',alignItems:'center',gap:8,overflowX:'auto'}}>
          {(allClasses.length > 0 || classContext) && (
            <>
              <span style={{fontSize:10,color:'#484f58',letterSpacing:'0.07em',flexShrink:0}}>CLASSES</span>
              {allClasses.map((c,i)=>(<span key={i} style={{padding:'2px 9px',borderRadius:20,flexShrink:0,background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.2)',fontSize:11,color:'#c4b5fd',whiteSpace:'nowrap'}}>{c.name}</span>))}
              {!allClasses.length && classContext && <span style={{padding:'2px 9px',borderRadius:20,background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.2)',fontSize:11,color:'#c4b5fd'}}>{classContext.className}</span>}
            </>
          )}
          {dueCards > 0 && <span style={{padding:'2px 9px',borderRadius:20,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.2)',fontSize:11,color:'#f59e0b',whiteSpace:'nowrap',flexShrink:0}}>{dueCards} cards due</span>}
          {recentActivity?.topic && <span style={{padding:'2px 9px',borderRadius:20,background:'rgba(52,211,153,0.07)',border:'1px solid rgba(52,211,153,0.2)',fontSize:11,color:'#34d399',whiteSpace:'nowrap',flexShrink:0}}>Last: {recentActivity.topic} {recentActivity.score ? recentActivity.score+'%' : ''}</span>}
        </div>
      )}

      {/* ── Messages ── */}
      <div style={{flex:1,overflowY:'auto',padding:'20px'}}>
        <div style={{maxWidth:760,margin:'0 auto'}}>

          {messages.length === 0 && (
            <div style={{textAlign:'center',padding:'60px 16px 32px'}}>
              <div style={{width:56,height:56,borderRadius:14,margin:'0 auto 18px',background:'rgba(124,58,237,0.12)',border:'1px solid rgba(167,139,250,0.25)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.4"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="#a78bfa" stroke="none"/></svg>
              </div>
              <p style={{fontSize:16,fontWeight:600,color:'var(--c-t1)',marginBottom:8}}>Hey, I'm Nova</p>
              <p style={{fontSize:13,color:'var(--c-t2)',lineHeight:1.7,maxWidth:320,margin:'0 auto 24px'}}>Ask me anything — I'll explain concepts, quiz you, build flashcards, or help you prep for a test.</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center'}}>
                {CHIPS.map((c,i)=>(<button key={i} onClick={()=>send(c)} style={{padding:'7px 14px',borderRadius:8,cursor:'pointer',border:'1px solid rgba(167,139,250,0.2)',background:'rgba(167,139,250,0.06)',fontSize:12,color:'#a78bfa'}}>{c}</button>))}
              </div>
            </div>
          )}

          {messages.map((m,i)=>{
            const isNova = m.role==='assistant'
            const showChips = isNova && i===0 && messages.length===1
            return (
              <div key={i} style={{marginBottom:16}}>
                {isNova ? (
                  <div>
                    <div style={{paddingLeft:14,borderLeft:'2px solid rgba(167,139,250,0.45)'}}>
                      <div style={{fontSize:10,fontWeight:600,color:'#a78bfa',letterSpacing:'0.08em',marginBottom:5}}>NOVA{m.streaming?' · typing...':''}</div>
                      <div style={{fontSize:13,color:'var(--c-t1)',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{m.text}</div>
                      {m.streaming && (
                        <span style={{display:'inline-block',width:8,height:13,background:'#a78bfa',animation:'nova-breathe 0.8s ease-in-out infinite',verticalAlign:'text-bottom',marginLeft:2,borderRadius:1}}/>
                      )}
                      {showChips && !m.streaming && (
                        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>
                          {CHIPS.map((c,ci)=>(<button key={ci} onClick={()=>send(c)} style={{padding:'5px 12px',borderRadius:8,cursor:'pointer',border:'1px solid rgba(167,139,250,0.2)',background:'rgba(167,139,250,0.06)',fontSize:12,color:'#a78bfa'}}>{c}</button>))}
                        </div>
                      )}
                      {/* Action buttons on completed Nova messages */}
                      {!m.streaming && m.text && m.text.length > 100 && (
                        <div style={{display:'flex',gap:6,marginTop:8}}>
                          <button onClick={()=>readAloud(m.text)} style={{padding:'3px 9px',borderRadius:6,border:'1px solid #30363d',background:'none',fontSize:11,color:'#484f58',cursor:'pointer'}}>
                            {speaking?'Stop':'Read aloud'}
                          </button>
                          <button onClick={()=>saveAsFlashcards(m.text)} style={{padding:'3px 9px',borderRadius:6,border:'1px solid #30363d',background:'none',fontSize:11,color:'#484f58',cursor:'pointer'}}>
                            Save as flashcards
                          </button>
                        </div>
                      )}
                    </div>
                    <div style={{fontSize:10,color:'#30363d',marginTop:5,paddingLeft:16}}>{fmt(m.ts)}</div>
                  </div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end'}}>
                    <div style={{background:'#1e3a8a',borderRadius:'12px 12px 2px 12px',padding:'10px 14px',maxWidth:'min(80%,560px)',fontSize:13,color:'#dbeafe',lineHeight:1.6}}>{m.text}</div>
                    <div style={{fontSize:10,color:'#30363d',marginTop:5}}>{fmt(m.ts)}</div>
                  </div>
                )}
              </div>
            )
          })}

          <div ref={bottomRef}/>
        </div>
      </div>

      {/* ── Input ── */}
      <div style={{flexShrink:0,borderTop:'1px solid #21262d',background:'var(--c-surface)',padding:'12px 16px'}}>
        <div style={{maxWidth:760,margin:'0 auto'}}>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f)}}/>
          <div style={{display:'flex',gap:8,alignItems:'flex-end',background:'var(--c-bg)',border:'1px solid #30363d',borderRadius:12,padding:'9px 9px 9px 14px',transition:'border-color 0.2s'}}
            onFocus={e=>e.currentTarget.style.borderColor='rgba(167,139,250,0.45)'}
            onBlur={e=>e.currentTarget.style.borderColor='#30363d'}>
            <textarea ref={textareaRef} value={input}
              onChange={e=>{setInput(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'}}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}
              placeholder="Ask Nova anything..."
              rows={1}
              style={{flex:1,background:'none',border:'none',outline:'none',color:'var(--c-t1)',fontSize:13,resize:'none',lineHeight:1.5,fontFamily:'inherit',minHeight:20,maxHeight:120,overflow:'hidden',paddingTop:1,width:'100%'}}
            />
            <div style={{display:'flex',gap:5,alignItems:'center',flexShrink:0}}>
              <button onClick={()=>fileRef.current?.click()} title="Upload PDF or notes"
                style={{width:30,height:30,borderRadius:8,border:'1px solid #30363d',background:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#484f58'}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              </button>
              <button onClick={()=>send()} disabled={loading||!input.trim()}
                style={{width:32,height:32,borderRadius:9,border:'none',background:input.trim()?'#7c3aed':'#21262d',cursor:input.trim()?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',color:input.trim()?'#fff':'#484f58',transition:'all 0.15s'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              </button>
            </div>
          </div>
          <p style={{fontSize:10,color:'#484f58',textAlign:'center',marginTop:7}}>Shift+Enter for new line · Nova remembers your sessions</p>
        </div>
      </div>
    </div>
  )
}
