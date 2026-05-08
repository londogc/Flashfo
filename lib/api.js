import { supabase } from '@/lib/supabase'

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

export async function rpc(fn, args = []) {
  const authHeaders = await getAuthHeader()
  const res = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ fn, args }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}

export async function novaStream(messages, extra = {}) {
  const authHeaders = await getAuthHeader()
  return fetch('/api/nova-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ messages, ...extra }),
  })
}
