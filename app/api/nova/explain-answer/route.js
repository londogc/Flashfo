import { NextResponse } from 'next/server'

export const runtime = 'edge'

const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'

export async function POST(request) {
  try {
    const { question, studentAnswer, correctAnswer, topic } = await request.json()

    const prompt = `You are Nova, a friendly and encouraging AI tutor on Flashfo.

A student got this practice quiz question wrong:

Question: ${question}
Their answer: ${studentAnswer}
Correct answer: ${correctAnswer}
Topic: ${topic || 'General'}

Write a SHORT explanation (2-3 sentences max) that:
1. Clearly explains WHY the correct answer is right
2. Explains what makes the student's answer incorrect or incomplete
3. Ends with a quick memory tip or way to remember it

Be warm and encouraging — not condescending. No bullet points. Plain conversational prose.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 150,
        messages: [
          { role: 'system', content: 'You are Nova, a helpful and encouraging AI tutor. Keep explanations brief and clear.' },
          { role: 'user', content: prompt }
        ]
      })
    })

    const data = await response.json()
    const explanation = data.choices?.[0]?.message?.content || 'Unable to generate explanation right now.'
    return NextResponse.json({ explanation })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500 })
  }
}