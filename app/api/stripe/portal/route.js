import Stripe from 'stripe'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(req) {
  try {
    const { userEmail } = await req.json()

    // Find the Stripe customer by email
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 })
    if (!customers.data.length) {
      return Response.json({ error: 'No Stripe customer found for this email' }, { status: 404 })
    }

    const origin = req.headers.get('origin') || 'https://flashfo-git-v6-glen-londos-projects.vercel.app'

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: origin + '/settings',
    })

    return Response.json({ url: portalSession.url })
  } catch (err) {
    console.error('Portal error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
