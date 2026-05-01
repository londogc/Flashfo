import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PRICE_TO_PLAN = {
  'price_1TS69gLu7zMVJuloo7S44sow': 'student_pro',
  'price_1TS6BtLu7zMVJuloFSLuTJou': 'student_pro',
  'price_1TS6DHLu7zMVJuloSHQ9zT1c': 'teacher_pro',
  'price_1TS6E6Lu7zMVJuloQJP7uNz2': 'teacher_pro',
  'price_1TS6FOLu7zMVJulorLTheTxO': 'school',
}

async function updatePlan(userId, plan) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const { error } = await supabase
    .from('profiles')
    .update({ plan, plan_updated_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('lifetime_granted', false) // Never overwrite lifetime users
  if (error) console.error('Supabase update error:', error)
}

export async function POST(req) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return new Response('Webhook error: ' + err.message, { status: 400 })
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object
        const userId  = session.client_reference_id || session.metadata?.userId
        const priceId = session.metadata?.priceId
        const plan    = PRICE_TO_PLAN[priceId] || session.metadata?.plan
        if (userId && plan) await updatePlan(userId, plan)
        break
      }

      case 'customer.subscription.updated': {
        const sub     = event.data.object
        const userId  = sub.metadata?.userId
        const priceId = sub.items?.data?.[0]?.price?.id
        const plan    = PRICE_TO_PLAN[priceId]
        if (userId && plan) await updatePlan(userId, plan)
        break
      }

      case 'customer.subscription.deleted': {
        // Subscription cancelled — downgrade to free
        const sub    = event.data.object
        const userId = sub.metadata?.userId
        if (userId) await updatePlan(userId, 'free')
        break
      }

      case 'invoice.payment_failed': {
        // Payment failed — keep plan for now, Stripe will retry
        // You could add a grace period here if needed
        console.warn('Payment failed for subscription:', event.data.object.subscription)
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return new Response('Handler error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
