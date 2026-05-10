import { NextResponse } from 'next/server'
export const runtime = 'edge'

const getKey = () => process.env.OPENAI_API_KEY || ''
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'
const RESPONSES_URL = 'https://api.openai.com/v1/responses'
const MAX_MESSAGES = 20
const MAX_MSG_LENGTH = 8000

const rateLimitMap = new Map()
function checkRateLimit(ip, limit = 20, windowMs = 60_000) {
  const now = Date.now()
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs }
  entry.count++
  rateLimitMap.set(ip, entry)
  return entry.count <= limit
}

async function verifyAuth(request) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  try {
    const res = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/user', {
      headers: { Authorization: 'Bearer ' + token, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
    })
    if (!res.ok) return null
    const user = await res.json()
    return user?.id ? user : null
  } catch { return null }
}

const BLOCKED_PATTERNS = [
  /kill\s*(my|your|him|her|them)?self/i,
  /suicide|suicidal/i,
  /self.?harm|self.?hurt|cut\s*myself/i,
  /how\s*to\s*die/i,
  /want\s*to\s*die|wish\s*(i\s*were|i\s*was)\s*dead/i,
  /end\s*my\s*life|end\s*it\s*all/i,
  /overdose\s*on/i,
  /hang\s*myself|hang\s*yourself/i,
  /make\s*(a\s*)?(bomb|explosive)/i,
  /how\s*to\s*make\s*(drugs|meth|cocaine|heroin)/i,
]

const CRISIS_RESPONSE = 'I\'m not able to help with that, but support is available right now. If you\'re going through something difficult, please reach out:\n\u2022 988 Suicide & Crisis Lifeline: Call or text 988 (free, 24/7)\n\u2022 Crisis Text Line: Text HOME to 741741'

// System prompt stored as a plain string — no backticks inside to break template literals
const NOVA_SYSTEM_PROMPT = [
  'You are Nova, an AI study assistant built into Flashfo — an educational platform for students and teachers.',
  'You support learners from middle school through college level, including advanced STEM, programming, and professional courses.',
  '',
  'FORMATTING RULES — follow these precisely:',
  '1. For general conversation and study help: write in plain text. No asterisks for bold, no ## headers, no dash bullet points.',
  '2. For code: ALWAYS use fenced code blocks with the language specified. Example format: three backticks, the language name, newline, code, newline, three backticks.',
  '   Use proper code blocks every time you write code or commands. The app renders these with a live preview and download button.',
  '3. For numbered lists: use "1. Item" format on separate lines.',
  '4. For URLs: put them on their own line.',
  '5. When writing multiple files (HTML + CSS + JS), put each in its own labeled code block.',
  '',
  'YOUR CAPABILITIES:',
  '- Explain concepts at any level from basics to graduate-level',
  '- Write, debug, and review code in any language: Python, JavaScript, Java, C++, HTML/CSS/JS, SQL, Swift, Kotlin, R, MATLAB, and more',
  '- Analyze images: if a user uploads a photo of code, an assignment, a whiteboard, or an error screenshot — read it carefully and help',
  '- Debug errors from screenshots or pasted code: identify the exact line and issue, explain why it fails, show the corrected version',
  '- Help with math, science, history, literature, business, law, medicine, and any academic subject',
  '- Build study materials: flashcards, quizzes, outlines, summaries, study guides',
  '',
  'CODE HELP RULES:',
  '- When writing code: put it in a proper code block, then explain what it does beneath in plain text',
  '- When debugging: first name the specific error/bug, then show the fixed code in a code block, then explain what was wrong',
  '- For complex problems: break into numbered steps before writing code',
  '- When writing HTML: write complete working examples the user can preview. Include CSS and JS in the same file unless asked otherwise',
  '- Always include basic error handling in code examples',
  '',
  'ANALYZING IMAGES:',
  '- If a user shares a screenshot of code or an error: read every character carefully, identify all bugs, reference specific line numbers when visible',
  '- If a user shares a photo of a handwritten assignment or textbook page: read it fully and help solve or explain it',
  '- Always acknowledge what you can see in the image before answering',
  '',
  'SAFETY RULES:',
  '- You are ONLY an educational assistant. Redirect off-topic requests politely.',
  '- Never provide information about self-harm, suicide, violence, weapons, or illegal substances.',
  '- If someone seems distressed: 988 Lifeline (call/text 988) or Crisis Text Line (text HOME to 741741).',
].join('\n')

export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(ip, 20, 60_000)) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })
    }

    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
    }

    const { messages } = await request.json()

    const safeMessages = (Array.isArray(messages) ? messages : [])
      .slice(0, MAX_MESSAGES)
      .map(m => ({
        ...m,
        text: String(m.text || m.content || '').slice(0, MAX_MSG_LENGTH),
        content: String(m.text || m.content || '').slice(0, MAX_MSG_LENGTH),
      }))

    const lastUser = [...safeMessages].reverse().find(m => m.role === 'user')
    const userText = lastUser?.text || lastUser?.content || ''
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(userText)) {
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) { controller.enqueue(encoder.encode(CRISIS_RESPONSE)); controller.close() }
        })
        return new NextResponse(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
      }
    }

    const input = safeMessages.map(m => {
      const contentParts = []
      const text = m.text || m.content || ''
      if (text) {
        contentParts.push({
          type: m.role === 'assistant' ? 'output_text' : 'input_text',
          text,
        })
      }
      if (m.role !== 'assistant' && Array.isArray(m.images) && m.images.length > 0) {
        for (const img of m.images) {
          if (img.base64 && img.mimeType) {
            contentParts.push({
              type: 'input_image',
              image_url: 'data:' + img.mimeType + ';base64,' + img.base64,
            })
          }
        }
      }
      if (contentParts.length === 0) {
        contentParts.push({ type: 'input_text', text: '' })
      }
      return {
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: contentParts,
      }
    })

    const payload = {
      model: MODEL,
      stream: true,
      input,
      tools: [{ type: 'web_search_preview' }],
      instructions: NOVA_SYSTEM_PROMPT,
    }

    const res = await fetch(RESPONSES_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + getKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()
              if (data === '[DONE]' || !data) continue
              try {
                const parsed = JSON.parse(data)
                if (parsed.type === 'response.output_text.delta') {
                  controller.enqueue(encoder.encode(parsed.delta))
                }
              } catch { }
            }
          }
        } finally {
          controller.close()
          reader.releaseLock()
        }
      }
    })

    return new NextResponse(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' }
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
