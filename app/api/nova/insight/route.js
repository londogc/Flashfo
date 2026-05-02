import { NextResponse } from 'next/server'

export const runtime = 'edge'

const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'

export async function POST(request) {
  try {
    const { sessionData } = await request.json()

    const prompt = `You are Nova, an AI teaching assistant for Flashfo. A teacher just finished running a live quiz with their class.

Session details:
- Topic: ${sessionData.topic || 'Unknown topic'}
- Subject: ${sessionData.subject || 'Unknown subject'}
- Students: ${sessionData.student_count || 'Unknown'} students
- Class average score: ${sessionData.avg_score || 0}%

Write a concise 3-sentence insight for the teacher. Sentence 1: What the class understood well based on the score. Sentence 2: What concepts they likely struggled with. Sentence 3: One concrete, actionable recommendation for the next lesson. Be specific, practical, and encouraging. Write in plain prose — no bullet points, no headers.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        messages: [
          { role: 'system', content: 'You are Nova, a helpful AI teaching assistant. Be concise and practical.' },
          { role: 'user', content: prompt }
        ]
      })
    })

    const data = await response.json()
    const insight = data.choices?.[0]?.message?.content || 'Unable to generate insight at this time.'
    return NextResponse.json({ insight })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 })
  }
}