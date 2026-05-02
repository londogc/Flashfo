import { NextResponse } from 'next/server'

export const runtime = 'edge'

const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'

export async function POST(request) {
  try {
    const { type, content, url, topic } = await request.json()

    let sourceText = content || ''

    // For URLs, fetch the page content server-side
    if (type === 'url' && url) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Flashfo/1.0' } })
        const html = await res.text()
        // Strip HTML tags to get plain text
        sourceText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000)
      } catch {
        return NextResponse.json({ error: 'Could not fetch that URL. Try pasting the text directly.' }, { status: 400 })
      }
    }

    if (!sourceText || sourceText.trim().length < 20) {
      return NextResponse.json({ error: 'Not enough content to generate flashcards from.' }, { status: 400 })
    }

    const systemPrompt = `You are Nova, an AI study assistant for Flashfo. Generate exactly 10 high-quality flashcards from the provided source material. Return ONLY a valid JSON array with no markdown, no backticks, no explanation — just the raw JSON array.

Format: [{"front": "question or term", "back": "answer or definition"}, ...]

Rules:
- Each card must test a single, specific concept
- Questions should be clear and unambiguous  
- Answers should be concise but complete (1-3 sentences max)
- Cover the most important concepts in the material
- Do not include any personally identifiable information
- Do not reproduce copyrighted text verbatim — paraphrase and test comprehension`

    const userPrompt = sourceText.length > 100
      ? `Generate 10 flashcards from this content:\n\n${sourceText.slice(0, 6000)}`
      : `Generate 10 flashcards about: ${topic || sourceText}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    })

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || '[]'
    
    let cards
    try {
      // Strip any accidental markdown fences
      const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      cards = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Could not parse generated cards. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ cards, count: cards.length })
  } catch (error) {
    return NextResponse.json({ error: 'Import failed. Please try again.' }, { status: 500 })
  }
}