'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

const CHIPS = ['Review my due cards', 'Quiz me on a topic', 'Explain a concept', 'Build me flashcards']

// ── Persist messages to localStorage ─────────────────────────────────────
const CACHE_KEY = (uid) => 'ff-nova-msgs-' + (uid || 'guest')

function saveMsgCache(msgs, uid) {
  try {
    const toSave = msgs.filter(m => !m.streaming).slice(-60)
    localStorage.setItem(CACHE_KEY(uid), JSON.stringify(toSave))
  } catch(e) {}
}

function loadMsgCache(uid) {
  try {
    const raw = localStorage.getItem(CACHE_KEY(uid))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null
  } catch(e) { return null }
}

// ── Clean markdown + render links ─────────────────────────────────────────
function renderNovaText(text) {
  if (!text) return null
  // Strip heading markers (## Heading → Heading)
  let cleaned = text.replace(/^#{1,6}\s+/gm, '')
  // Strip bold (**text** → text)
  cleaned = cleaned.replace(/\*\*([^*\n]+)\*\*/g, '$1')
  // Strip italic (*text* → text, _text_ → text) — but not list bullets
  cleaned = cleaned.replace(/(?<![\-*])\*([^*\n]+)\*(?!\*)/g, '$1')
  cleaned = cleaned.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '$1')

  // Split on markdown links [text](url) and render each part
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  const parts = []
  let last = 0
  let match
  while ((match = linkRe.exec(cleaned)) !== null) {
    if (match.index > last) parts.push({ type:'text', val: cleaned.slice(last, match.index) })
    try {
      const url = match[2]
      const host = new URL(url).hostname.replace(/^www\./, '')
      parts.push({ type:'link', url, label: host })
    } catch {
      parts.push({ type:'text', val: match[0] })
    }
    last = match.index + match[0].length
  }
  if (last < cleaned.length) parts.push({ type:'text', val: cleaned.slice(last) })

  return parts.map((p, i) =>
    p.type === 'link'
      ? <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
          style={{color:'#60a5fa',textDecoration:'none',borderBottom:'1px solid rgba(96,165,250,0.3)',fontWeight:500}}>{p.label}</a>
      : <span key={i} style={{whiteSpace:'pre-wrap'}}>{p.val}</span>
  )
}
const fmt = (d) => { try { const t=d?new Date(d):new Date(); return t.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) } catch { return '' } }

// ââ Register levels âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

  // ââ Scroll to bottom ââââââââââââââââââââââââââââââââââââââââââââââââââââ
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, loading])

  // ââ Load session memory + context on mount âââââââââââââââââââââââââââââââ
  useEffect(() => {
    if (!user) {
      // Guest: load from localStorage only
      const cached = loadMsgCache('guest')
      if (cached) setMessages(cached)
      return
    }

    // Load messages: localStorage first (instant), Supabase supplements
    const cached = loadMsgCache(user.id)
    if (cached) setMessages(cached)

    supabase.from('nova_messages').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(60)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const msgs = data.reverse().map(m => ({ role: m.role, text: m.content, ts: m.created_at }))
          setMessages(msgs)
          saveMsgCache(msgs, user.id)
        } else if (!cached) {
          // First time — show welcome
          const welcome = { role:'assistant', text:"Hey! I'm Nova — built for how you study. Tell me what you're working on or pick something below.", ts: new Date().toISOString() }
          setMessages([welcome])
          supabase.from('nova_messages').insert({ user_id: user.id, role:'assistant', content: welcome.text }).then(()=>{})
          saveMsgCache([welcome], user.id)
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

  // ââ Study session timer âââââââââââââââââââââââââââââââââââââââââââââââââ
  useEffect(() => {
    if (studySession) {
      timerRef.current = setInterval(() => setSessionTimer(s => s+1), 1000)
    } else {
      clearInterval(timerRef.current)
      setSessionTimer(0)
    }
    return () => clearInterval(timerRef.current)
  }, [studySession])

  // ââ Build system prompt âââââââââââââââââââââââââââââââââââââââââââââââââ
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

  // ââ Detect topic from message âââââââââââââââââââââââââââââââââââââââââââ
  const detectTopic = (text) => {
    const topicMatch = text.match(/(?:about|on|for|studying|review|quiz(?:ze)? me on|explain|understand)s+([A-Za-z][^.!?]{3,40})/i)
    return topicMatch ? topicMatch[1].trim() : null
  }

  // ââ Save message to Supabase ââââââââââââââââââââââââââââââââââââââââââââ
  const saveMessage = async (role, content) => {
    // Cache to localStorage immediately (works for guests too)
    setMessages(prev => {
      const updated = prev.filter(m => !m.streaming)
      saveMsgCache(updated, user?.id)
      return prev
    })
    if (!user) return
    await supabase.from('nova_messages').insert({ user_id: user.id, role, content })
  }

  // ââ Streaming send ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
        fullText = fdata.result?.reply || fdata.reply || 'Sorry, I had trouble with that. Try again.'

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

      // ── Detect study material intent and actually generate it ──────────────
      const studyIntent = /\b(prepare|make|create|generate|build|give me|can you make|i need)\b.{0,50}\b(study material|study kit|study guide|flashcard|flash card|quiz me|quiz)\b/i.test(msg)
        || /\b(flashcard|quiz)s?\b.{0,30}\b(about|on|for|covering)\b/i.test(msg)

      if (studyIntent && fullText.trim()) {
        // Extract topic
        const topicFromMsg = msg.match(/\b(?:about|on|for|covering|regarding)\s+(.{3,80}?)(?:\?|$|\.)/i)?.[1]?.trim()
        const topicFromNova = fullText.match(/(?:study kit on|focused on|covering)\s+([^,.\n]{3,60})/i)?.[1]?.trim()
          || fullText.match(/on\s+([^,.\n]+),\s+covering/i)?.[1]?.trim()
        const topic = (topicFromMsg || topicFromNova || studySession?.topic || '').trim().slice(0, 80)

        if (topic) {
          setLoading(true)

          // Generate flashcards
          const fcMsgId = (Date.now() + 10).toString()
          setMessages(prev => [...prev, { role:'assistant', text:'Generating flashcards...', ts: new Date().toISOString(), id: fcMsgId, streaming: true }])

          try {
            const fcRes = await fetch('/api/rpc', { method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ fn:'generateFlashcardsFromText', args:[topic, 12, 'English'] }) })
            const fcData = await fcRes.json()
            const cards = (fcData.result?.cards || [])

            if (cards.length) {
              // Save to My Stuff if signed in
              let savedId = null
              if (user) {
                const { data: saved } = await supabase.from('saved_items').insert({
                  user_id: user.id, type:'flashcards', title: topic,
                  data: { topic, cards }
                }).select('id').single()
                savedId = saved?.id
              }

              const fcText = 'Your flashcard deck is ready — ' + cards.length + ' cards on **' + topic + '**.' + (savedId ? ' Saved to My Stuff.' : '')
              setMessages(prev => prev.map(m => m.id === fcMsgId
                ? { ...m, text: fcText, streaming: false, generatedCards: cards, generatedTopic: topic, savedItemId: savedId }
                : m))
              await saveMessage('assistant', fcText)
            } else {
              setMessages(prev => prev.filter(m => m.id !== fcMsgId))
            }
          } catch {
            setMessages(prev => prev.filter(m => m.id !== fcMsgId))
          }

          // Generate quiz
          const qzMsgId = (Date.now() + 20).toString()
          setMessages(prev => [...prev, { role:'assistant', text:'Generating quiz...', ts: new Date().toISOString(), id: qzMsgId, streaming: true }])

          try {
            const qzRes = await fetch('/api/rpc', { method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ fn:'generateQuizFromTopic', args:[topic, { mcq: 5, true_false: 3 }] }) })
            const qzData = await qzRes.json()
            const questions = qzData.result?.questions || []

            if (questions.length) {
              let savedQzId = null
              if (user) {
                const { data: savedQz } = await supabase.from('saved_items').insert({
                  user_id: user.id, type:'quiz', title: topic,
                  data: { topic, questions }
                }).select('id').single()
                savedQzId = savedQz?.id
              }

              const qzText = 'Your quiz is ready — ' + questions.length + ' questions on **' + topic + '**.' + (savedQzId ? ' Saved to My Stuff.' : '')
              setMessages(prev => prev.map(m => m.id === qzMsgId
                ? { ...m, text: qzText, streaming: false, generatedQuestions: questions, generatedTopic: topic, savedItemId: savedQzId }
                : m))
              await saveMessage('assistant', qzText)
            } else {
              setMessages(prev => prev.filter(m => m.id !== qzMsgId))
            }
          } catch {
            setMessages(prev => prev.filter(m => m.id !== qzMsgId))
          }

          setLoading(false)
        }
      }
      // ── End study material generation ─────────────────────────────────────

    } catch (err) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: 'Something went wrong — try again.', streaming: false } : m))
    }

    setLoading(false)
    setStreamingId(null)
  }

  // ââ Voice input âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

  // ââ Read aloud ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const readAloud = (text) => {
    if (typeof window === 'undefined') return
    const synth = window.speechSynthesis
    if (!synth) return
    if (speaking) { synth.cancel(); setSpeaking(false); return }
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.95; utt.onend = () => setSpeaking(false)
    setSpeaking(true); synth.speak(utt)
  }

  // ââ File upload âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

  // ââ End study session âââââââââââââââââââââââââââââââââââââââââââââââââââ
  const endSession = () => {
    if (!studySession) return
    const mins = Math.round(sessionTimer / 60)
    const summary = 'Study session complete! You studied ' + studySession.topic + ' for ' + mins + ' minute' + (mins!==1?'s':'') + '. ' + (studySession.questionsAnswered||0) + ' questions answered.'
    setMessages(prev => [...prev, { role:'assistant', text: summary, ts: new Date().toISOString(), sessionEnd: true }])
    saveMessage('assistant', summary)
    setStudySession(null)
  }

  // ââ Save as flashcards ââââââââââââââââââââââââââââââââââââââââââââââââââ
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
    <div style={{display:'flex',flexDirection:'column',height:'calc(100dvh - 56px)',background:'var(--c-bg)',overflow:'hidden'}}>

      {/* ââ Header ââ */}
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

      {/* ââ Context bar ââ */}
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

      {/* ââ Messages ââ */}
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
                      <div style={{fontSize:13,color:'var(--c-t1)',lineHeight:1.7}}>{renderNovaText(m.text)}</div>
                      {m.streaming && (
                        <span style={{display:'inline-block',width:8,height:13,background:'#a78bfa',animation:'nova-breathe 0.8s ease-in-out infinite',verticalAlign:'text-bottom',marginLeft:2,borderRadius:1}}/>
                      )}
                      {showChips && !m.streaming && (
                        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>
                          {CHIPS.map((c,ci)=>(<button key={ci} onClick={()=>send(c)} style={{padding:'5px 12px',borderRadius:8,cursor:'pointer',border:'1px solid rgba(167,139,250,0.2)',background:'rgba(167,139,250,0.06)',fontSize:12,color:'#a78bfa'}}>{c}</button>))}
                        </div>
                      )}
                      {/* Generated study material action buttons */}
                      {!m.streaming && m.generatedCards && (
                        <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
                          <a href={'/flashcards?q=' + encodeURIComponent(m.generatedTopic||'')}
                            style={{padding:'5px 12px',borderRadius:8,border:'1px solid rgba(59,130,246,0.3)',background:'rgba(37,99,235,0.1)',fontSize:12,color:'#60a5fa',textDecoration:'none',fontWeight:600}}>
                            Study Flashcards →
                          </a>
                        </div>
                      )}
                      {!m.streaming && m.generatedQuestions && (
                        <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
                          <a href={'/quiz?q=' + encodeURIComponent(m.generatedTopic||'')}
                            style={{padding:'5px 12px',borderRadius:8,border:'1px solid rgba(139,92,246,0.3)',background:'rgba(109,40,217,0.1)',fontSize:12,color:'#a78bfa',textDecoration:'none',fontWeight:600}}>
                            Take Quiz →
                          </a>
                        </div>
                      )}
                      {/* Action buttons on completed Nova messages */}
                      {!m.streaming && m.text && m.text.length > 100 && !m.generatedCards && !m.generatedQuestions && (
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

      {/* ââ Input ââ */}
      <style>{`
        .nova-input-bar{padding:10px 14px}
        @media(max-width:768px){.nova-input-bar{padding:10px 14px calc(74px + env(safe-area-inset-bottom,0px))}}
        .nova-pill-wrap{display:flex;align-items:flex-end;gap:10px;background:rgba(124,58,237,0.05);border:1.5px solid rgba(124,58,237,0.22);border-radius:26px;padding:10px 10px 10px 18px;transition:border-color 0.2s,box-shadow 0.2s}
        .nova-pill-wrap:focus-within{border-color:rgba(167,139,250,0.55);box-shadow:0 0 0 3px rgba(124,58,237,0.08)}
        .nova-pill-hint{font-size:10px;color:rgba(167,139,250,0.55);margin-top:3px;letter-spacing:0.01em}
      `}</style>
      <div className="nova-input-bar" style={{flexShrink:0,background:'var(--c-bg)'}}>
        <div style={{maxWidth:760,margin:'0 auto'}}>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f)}}/>
          <div className="nova-pill-wrap">
            <div style={{flex:1,minWidth:0}}>
              <textarea ref={textareaRef} value={input}
                onChange={e=>{setInput(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'}}
                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}
                placeholder="Ask Nova anything..."
                rows={1}
                style={{display:'block',width:'100%',background:'none',border:'none',outline:'none',color:'var(--c-t1)',fontSize:13,resize:'none',lineHeight:1.5,fontFamily:'inherit',minHeight:20,maxHeight:120,overflow:'hidden',paddingTop:1}}
              />
              <div className="nova-pill-hint">Nova · Built for how you study</div>
            </div>
            <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0,paddingBottom:2}}>
              <button onClick={()=>fileRef.current?.click()} title="Upload PDF or notes"
                style={{width:30,height:30,borderRadius:'50%',border:'1px solid rgba(124,58,237,0.2)',background:'rgba(124,58,237,0.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(167,139,250,0.7)',flexShrink:0}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              </button>
              <button onClick={()=>send()} disabled={loading||!input.trim()}
                style={{width:36,height:36,borderRadius:'50%',border:'none',background:input.trim()?'#7c3aed':'rgba(124,58,237,0.15)',cursor:input.trim()?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',color:input.trim()?'#fff':'rgba(167,139,250,0.35)',transition:'all 0.18s',flexShrink:0}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
