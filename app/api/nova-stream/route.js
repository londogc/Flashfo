import { NextResponse } from 'next/server'

const getKey = () => process.env.OPENAI_API_KEY || ''
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'
const RESPONSES_URL = 'https://api.openai.com/v1/responses'

export const runtime = 'edge'

export async function POST(request) {
  try {
    const { messages, systemPrompt } = await request.json()

    const input = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: [{ type: 'input_text', text: m.text || m.content || '' }]
    }))

    const res = await fetch(RESPONSES_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + getKey(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        system: systemPrompt,
        input,
      })
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }

    // Stream SSE back to client
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) { controller.close(); break }
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop()
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') { controller.close(); return }
            try {
              const parsed = JSON.parse(data)
              // OpenAI Responses API delta format
              const delta =
                parsed?.delta?.text ||
                parsed?.choices?.[0]?.delta?.content ||
                parsed?.output?.[0]?.content?.[0]?.text ||
                ''
              if (delta) controller.enqueue(encoder.encode(delta))
            } catch {}
          }
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      }
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
