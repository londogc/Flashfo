import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-04-10' })

export async function POST(request) {
  try {
    const { userId, email, plan } = await request.json()
    if (!userId || !email || !plan) return Response.json({ error: 'Missing params' }, { status: 400 })
    const priceId = plan === 'team' ? process.env.STRIPE_TEAM_PRICE_ID : process.env.STRIPE_PRO_PRICE_ID
    if (!priceId) return Response.json({ error: 'Price not configured' }, { status: 500 })
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId, plan },
      success_url: (process.env.NEXT_PUBLIC_URL || 'https://flashfo.org') + '/settings?upgraded=1',
      cancel_url:  (process.env.NEXT_PUBLIC_URL || 'https://flashfo.org') + '/settings?cancelled=1',
    })
    return Response.json({ url: session.url })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}