import { NextResponse } from 'next/server'

export const runtime = 'edge'

const getKey = () => process.env.OPENAI_API_KEY || ''
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'
const RESPONSES_URL = 'https://api.openai.com/v1/responses'

export async function POST(request) {
  try {
    const { messages, systemPrompt } = await request.json()

    const input = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: [{ type: 'input_text', text: m.text || m.content || '' }]
    }))

    const payload = {
      model: MODEL,
      stream: true,
      input,
    }
    if (systemPrompt) payload.system = systemPrompt

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
        let buf = ''
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            const lines = buf.split('\n')
            buf = lines.pop() || ''
            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed || !trimmed.startsWith('data:')) continue
              const data = trimmed.slice(5).trim()
              if (data === '[DONE]') continue
              try {
                const evt = JSON.parse(data)
                // OpenAI Responses API stream event types
                const delta =
                  evt?.delta?.text ??
                  evt?.output_text_delta ??
                  evt?.choices?.[0]?.delta?.content ??
                  null
                if (delta) controller.enqueue(encoder.encode(delta))
              } catch {}
            }
          }
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
      }
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
