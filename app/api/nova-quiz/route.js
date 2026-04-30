import { NextResponse } from 'next/server'

const getKey = () => process.env.OPENAI_API_KEY || ''
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'

export async function POST(request) {
  try {
    const { topic, subject, count = 10, grade } = await request.json()
    const prompt = `Generate ${count} multiple-choice quiz questions about "${topic}"${subject ? ' for ' + subject : ''}${grade ? ' at ' + grade + ' level' : ''}. 
Return ONLY valid JSON array, no markdown, no extra text:
[{"question":"...","options":["A text","B text","C text","D text"],"correct":0,"explanation":"brief explanation"}]
- correct is the 0-based index of the correct option
- options must have exactly 4 items prefixed with A, B, C, D
- explanations should be 1-2 sentences
- vary difficulty slightly across questions`

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + getKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
      })
    })
    const data = await res.json()
    const raw = data.output?.[0]?.content?.[0]?.text || data.choices?.[0]?.message?.content || ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const questions = JSON.parse(clean)
    return NextResponse.json({ questions })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
