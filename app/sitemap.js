export default function sitemap() {
  const base = 'https://flashfo.org'
  const today = new Date().toISOString()

  return [
    { url: base,                       lastModified: today, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/features`,         lastModified: today, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/for-teachers`,     lastModified: today, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/for-parents`,      lastModified: today, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/pricing`,          lastModified: today, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/whats-new`,        lastModified: today, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${base}/auth`,             lastModified: today, changeFrequency: 'yearly',  priority: 0.5 },
    { url: `${base}/privacy`,          lastModified: today, changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${base}/terms`,            lastModified: today, changeFrequency: 'yearly',  priority: 0.4 },
  ]
}