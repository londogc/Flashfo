import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const getKey = () => process.env.OPENAI_API_KEY || ''
const MODEL  = process.env.OPENAI_MODEL || 'gpt-4.1-mini'

// ── In-memory rate limiting (per-instance — see security notes) ───────────
// NOTE: Replace with Upstash Redis before scaling past ~10k users.
// Each Vercel serverless instance has its own Map, so this provides
// per-instance limiting only. Good enough for launch, not for scale.
const rateLimitMap = new Map()
function checkRateLimit(key, limit = 20, windowMs = 60_000) {
  const now   = Date.now()
  const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs }
  entry.count++
  rateLimitMap.set(key, entry)
  return entry.count <= limit
}

// ── Auth verification ─────────────────────────────────────────────────────
async function verifyAuth(request) {
  const auth  = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null
    return user
  } catch {
    return null
  }
}

// ── Input sanitization ────────────────────────────────────────────────────
const MAX_TOPIC_LENGTH = 500
const MAX_COUNT        = 20   // cap at 20 questions regardless of request
const MIN_COUNT        = 1

function sanitizeString(val, maxLen = 200) {
  return String(val || '').slice(0, maxLen).trim()
}

export async function POST(request) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(ip, 20, 60_000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      )
    }

    // Auth required — this endpoint calls OpenAI and must be gated
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      )
    }

    // Parse + validate inputs
    const body    = await request.json()
    const topic   = sanitizeString(body.topic, MAX_TOPIC_LENGTH)
    const subject = sanitizeString(body.subject, 100)
    const grade   = sanitizeString(body.grade, 50)
    const count   = Math.min(
      MAX_COUNT,
      Math.max(MIN_COUNT, parseInt(body.count, 10) || 10)
    )

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required.' }, { status: 400 })
    }

    const prompt = [
      `Generate ${count} multiple-choice quiz questions about "${topic}"`,
      subject ? ` for ${subject}` : '',
      grade   ? ` at ${grade} level` : '',
      `. Return ONLY valid JSON array, no markdown, no extra text:`,
      ` [{"question":"...","options":["A text","B text","C text","D text"],"correct":0,"explanation":"brief explanation"}]`,
      ` - correct is the 0-based index of the correct option`,
      ` - options must have exactly 4 items prefixed with A, B, C, D`,
      ` - explanations should be 1-2 sentences`,
      ` - vary difficulty slightly across questions`,
    ].join('')

    const res = await fetch('https://api.openai.com/v1/responses', {
      method:  'POST',
      headers: {
        Authorization:  'Bearer ' + getKey(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
      }),
    })

    const data = await res.json()
    const raw  = data.output?.[0]?.content?.[0]?.text
                 || data.choices?.[0]?.message?.content
                 || ''
    const clean     = raw.replace(/```json|```/g, '').trim()
    const questions = JSON.parse(clean)

    return NextResponse.json({ questions })

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
