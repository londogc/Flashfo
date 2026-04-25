export const dynamic = 'force-dynamic'

const MORBID = /\b(kill(ed|ing|s)?|dead|d(ied|ies|eath|eaths)|crash(ed|es|ing)?|disaster|battle|attack(ed|s)?|bomb(ing|ed|s)?|terrorist|earthquake|hurricane|flood(ed|ing)?|explo(sion|ded)|murder(ed)?|execut(ed|ion)|sentenced|derail(ed|s|ing)?|sank|sunk|collaps(ed)?|massacre|genocide|assassinat(ed|ion)?|fatal(ities)?|casualt(y|ies)|hijack(ed)?|riot(s)?|famine|plague|epidemic|pandemic|destroyed|stabbed|shot|hanged|drowned|funeral|war\b|wars\b|conflict|wounded|siege|coup|tragedy|tragic|victims?)\b/i

export async function GET() {
  try {
    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
    const dateStr = months[now.getMonth()] + ' ' + day

    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${month}/${day}`, {
      headers: { 'User-Agent': 'Flashfo/1.0 (educational app)' },
      next: { revalidate: 3600 }
    })
    const data = await res.json()
    const events = data.events || []

    const notable = events.filter(e => e.year && e.text && e.text.length > 40)
    const positive = notable.filter(e => !MORBID.test(e.text))
    const pool = positive.length > 0 ? positive : notable
    const historical = pool.filter(e => e.year < (now.getFullYear() - 5))
    const final = historical.length > 0 ? historical : pool

    // Pick a random one from top candidates
    const pick = final[Math.floor(Math.random() * Math.min(final.length, 5))]

    return Response.json({
      year: pick.year,
      text: pick.text,
      dateStr,
      fullDate: dateStr + ', ' + now.getFullYear()
    })
  } catch {
    return Response.json({ error: true }, { status: 200 })
  }
}