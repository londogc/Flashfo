import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { sessionData } = await request.json()

    const prompt = `You are Nova, an AI teaching assistant for Flashfo. A teacher just ran a live quiz with their class.

Session data:
- Topic: ${sessionData.topic || 'Unknown topic'}
- Subject: ${sessionData.subject || 'Unknown subject'}  
- Students: ${sessionData.student_count || 'Unknown'} students
- Class average: ${sessionData.avg_score || 0}%

Write a concise 3-sentence insight for the teacher. Sentence 1: What the class understood well. Sentence 2: What they struggled with. Sentence 3: One concrete recommendation for the next lesson. Be specific, practical, and encouraging. Do not use bullet points.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    })

    return NextResponse.json({ insight: message.content[0].text })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 })
  }
}