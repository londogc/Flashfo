import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Map price IDs to plan names for Supabase
const PRICE_TO_PLAN = {
  'price_1TS69gLu7zMVJuloo7S44sow': 'student_pro',
  'price_1TS6BtLu7zMVJuloFSLuTJou': 'student_pro',
  'price_1TS6DHLu7zMVJuloSHQ9zT1c': 'teacher_pro',
  'price_1TS6E6Lu7zMVJuloQJP7uNz2': 'teacher_pro',
  'price_1TS6FOLu7zMVJulorLTheTxO': 'school',
}

export async function POST(req) {
  try {
    const { priceId, userId, userEmail } = await req.json()

    if (!priceId || !userId) {
      return Response.json({ error: 'Missing priceId or userId' }, { status: 400 })
    }

    if (!PRICE_TO_PLAN[priceId]) {
      return Response.json({ error: 'Invalid price ID' }, { status: 400 })
    }

    const origin = req.headers.get('origin') || 'https://flashfo-git-v6-glen-londos-projects.vercel.app'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: userEmail,
      client_reference_id: userId,
      metadata: { userId, priceId, plan: PRICE_TO_PLAN[priceId] },
      success_url: origin + '/dashboard?checkout=success&plan=' + PRICE_TO_PLAN[priceId],
      cancel_url: origin + '/pricing?checkout=cancelled',
      subscription_data: {
        trial_period_days: 3,
        metadata: { userId, plan: PRICE_TO_PLAN[priceId] },
      },
      allow_promotion_codes: true,
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
