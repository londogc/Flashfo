export const dynamic = 'force-dynamic'

const MORBID = /\b(kill(ed|ing|s)?|dead|d(ied|ies|eath|eaths)|crash(ed|es|ing)?|disaster|battle|attack(ed|s)?|bomb(ing|ed|s)?|terrorist|earthquake|hurricane|flood(ed|ing)?|explo(sion|ded)|murder(ed)?|execut(ed|ion)|sentenced|derail(ed|s|ing)?|sank|sunk|collaps(ed)?|massacre|genocide|assassinat(ed|ion)?|fatal(ities)?|casualt(y|ies)|hijack(ed)?|riot(s)?|famine|plague|epidemic|pandemic|destroyed|stabbed|shot|hanged|drowned|funeral|wars?|conflict|wounded|siege|coup|tragedy|tragic|victims?|damag(ed|ing)|virus|malware|hack(ed|ing)?|cyber|ransomware|terror|explosion|collide|overturn|capsize|perish(ed)?|catastroph|devastat|wreck(ed)?|crisis|scandal|corrupt|protest|rebel|uprising|overthrow|invasion|occupation|annex)\b/i

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    // Use client-supplied date if provided (avoids UTC vs local timezone mismatch)
    const clientMonth = searchParams.get('month')
    const clientDay   = searchParams.get('day')
    const clientYear  = searchParams.get('year')
    const now = new Date()
    const month = clientMonth ? clientMonth.padStart(2,'0') : String(now.getMonth()+1).padStart(2,'0')
    const day   = clientDay   ? clientDay.padStart(2,'0')   : String(now.getDate()).padStart(2,'0')
    const year  = clientYear  ? parseInt(clientYear)        : now.getFullYear()
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December']

    const url = 'https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected/' + month + '/' + day
    const res = await fetch(url, { headers: { 'User-Agent': 'Flashfo/1.0 (https://flashfo.org)' } })
    if (!res.ok) throw new Error('wiki ' + res.status)
    const data = await res.json()
    const events = data.selected || data.events || []
    const notable   = events.filter(e => e.year && e.text && e.text.length > 40)
    const positive  = notable.filter(e => !MORBID.test(e.text))
    const pool      = positive.length > 0 ? positive : notable
    const historical = pool.filter(e => e.year < (year - 5))
    const final     = historical.length > 0 ? historical : pool
    const pick      = final[Math.floor(Math.random() * Math.min(final.length, 8))]
    const monthName = months[parseInt(month)-1]
    const dateStr   = monthName + ' ' + parseInt(day)
    const wikiUrl   = pick.pages?.[0]?.content_urls?.desktop?.page || null
    return Response.json({ year: pick.year, text: pick.text, dateStr, fullDate: dateStr + ', ' + year, wikiUrl })
  } catch (e) {
    return Response.json({ error: true }, { status: 200 })
  }
}
