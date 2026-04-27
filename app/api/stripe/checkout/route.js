// v6.0 Stripe checkout — stub until 'stripe' package is installed
export async function POST(request) {
  return Response.json({ error: 'Stripe not yet configured. Coming in v6.0.' }, { status: 503 })
}