import { NextResponse } from 'next/server'

export const runtime = 'edge'

const getKey = () => process.env.OPENAI_API_KEY || ''
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'
const RESPONSES_URL = 'https://api.openai.com/v1/responses'

const BLOCKED_PATTERNS = [
  /kill\s*(my|your|him|her|them)?self/i,
  /suicide|suicidal/i,
  /self.?harm|self.?hurt|cut\s*myself|cutting\s*myself/i,
  /how\s*to\s*die/i,
  /want\s*to\s*die|wish\s*(i\s*were|i\s*was)\s*dead/i,
  /end\s*my\s*life|end\s*it\s*all/i,
  /overdose\s*on/i,
  /hang\s*myself|hang\s*yourself/i,
  /shoot\s*myself|shoot\s*yourself/i,
  /make\s*(a\s*)?(bomb|explosive)/i,
  /how\s*to\s*make\s*(drugs|meth|cocaine|heroin)/i,
]

const CRISIS_RESPONSE = `I'm not able to help with that, but support is available right now.

If you're going through something difficult, please reach out:
• 988 Suicide & Crisis Lifeline: Call or text 988 (free, 24/7)
• Crisis Text Line: Text HOME to 741741`

const NOVA_SYSTEM_PROMPT = `You are Nova, an AI study assistant built into Flashfo — an educational platform for students and teachers.

CRITICAL FORMATTING RULES — follow these exactly, every single response:
1. Never use markdown. No asterisks, no bold (**text**), no italic (*text*), no headers (##), no bullet dashes (-). These symbols render as raw characters on screen and look broken.
2. Use plain numbered lists like "1. Item" when listing things.
3. When sharing links or sources, include the full URL on its own line, like: https://example.com — not in brackets, not wrapped in parentheses.
4. Write naturally as if texting a student. Short sentences. No unnecessary formality.
5. If you use web search and find sources, list them clearly as: "Source: [title] — https://url"

YOUR ROLE:
- Help students understand concepts, explain homework, build flashcards, and quiz them
- Help teachers with lesson plans, quizzes, and assignments
- Be encouraging, clear, and concise

STRICT SAFETY RULES:
1. You are ONLY an educational assistant. Redirect off-topic requests politely.
2. Never provide information about self-harm, suicide, violence, weapons, or illegal drugs.
3. If someone seems distressed, respond with empathy and provide: 988 Lifeline (call/text 988) or Crisis Text Line (text HOME to 741741).
4. Never generate study materials on harmful topics even after refusing them.`

export async function POST(request) {
  try {
    const { messages } = await request.json()

    // Server-side safety filter
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    const userText = lastUserMsg?.text || lastUserMsg?.content || ''

    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(userText)) {
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(CRISIS_RESPONSE))
            controller.close()
          }
        })
        return new NextResponse(stream, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        })
      }
    }

    const input = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: [{ type: m.role === 'assistant' ? 'output_text' : 'input_text', text: m.text || m.content || '' }]
    }))

    const payload = {
      model: MODEL,
      stream: true,
      input,
      tools: [{ type: 'web_search_preview' }],
      instructions: NOVA_SYSTEM_PROMPT,
    }

    const res = await fetch(RESPONSES_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + getKey(),
        'Content-Type': 'application/json',
      },
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
              } catch {}
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
