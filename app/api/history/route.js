export const dynamic = 'force-dynamic'

const MORBID = /\b(kill(ed|ing|s)?|dead|d(ied|ies|eath|eaths)|crash(ed|es|ing)?|disaster|battle|attack(ed|s)?|bomb(ing|ed|s)?|terrorist|earthquake|hurricane|flood(ed|ing)?|explo(sion|ded)|murder(ed)?|execut(ed|ion)|sentenced|derail(ed|s|ing)?|sank|sunk|collaps(ed)?|massacre|genocide|assassinat(ed|ion)?|fatal(ities)?|casualt(y|ies)|hijack(ed)?|riot(s)?|famine|plague|epidemic|pandemic|destroyed|stabbed|shot|hanged|drowned|funeral|wars?|conflict|wounded|siege|coup|tragedy|tragic|victims?)\b/i

export async function GET() {
  try {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day   = String(now.getDate()).padStart(2, '0')
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December']

    const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected/${month}/${day}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Flashfo/1.0 (https://flashfo.org; contact@flashfo.org)',
        'Api-User-Agent': 'Flashfo/1.0'
      }
    })

    if (!res.ok) throw new Error('wiki ' + res.status)
    const data = await res.json()
    const events = data.selected || data.events || []

    const notable   = events.filter(e => e.year && e.text && e.text.length > 40)
    const positive  = notable.filter(e => !MORBID.test(e.text))
    const pool      = positive.length > 0 ? positive : notable
    const historical = pool.filter(e => e.year < (now.getFullYear() - 5))
    const final      = historical.length > 0 ? historical : pool

    const pick = final[Math.floor(Math.random() * Math.min(final.length, 6))]
    const dateStr = months[now.getMonth()] + ' ' + now.getDate()

    return Response.json({
      year: pick.year,
      text: pick.text,
      dateStr,
      fullDate: dateStr + ', ' + now.getFullYear()
    })
  } catch (e) {
    return Response.json({ error: true, msg: e.message }, { status: 200 })
  }
}