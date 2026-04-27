import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-04-10' })

export const PLANS = {
  free: { name: 'Free', price: 0 },
  pro:  { name: 'Pro',  price: 999,  stripePriceId: process.env.STRIPE_PRO_PRICE_ID  || '' },
  team: { name: 'Team', price: 2999, stripePriceId: process.env.STRIPE_TEAM_PRICE_ID || '' },
}

export async function POST(request) {
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  let event
  try {
    const body = await request.text()
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan || 'pro'
        if (userId) {
          await supabase.from('profiles').update({
            plan,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          }).eq('id', userId)
        }
        break
      }
      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const isActive = ['active','trialing'].includes(sub.status)
        await supabase.from('profiles')
          .update({ plan: isActive ? 'pro' : 'free' })
          .eq('stripe_customer_id', sub.customer)
        break
      }
    }
    return Response.json({ received: true })
  } catch (err) {
    return Response.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}