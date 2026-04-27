export function printContent(title, html) {
  const win = window.open('', '_blank')
  win.document.write(`<!DOCTYPE html><html><head>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; padding: 40px; max-width: 780px; margin: 0 auto; font-size: 13px; line-height: 1.6; }
    h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 28px; }
    .question { margin-bottom: 22px; page-break-inside: avoid; }
    .q-num { font-weight: 700; font-size: 13px; color: #1d4ed8; margin-bottom: 4px; }
    .q-text { font-weight: 600; margin-bottom: 10px; }
    .option { padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 5px; font-size: 12px; }
    .correct { background: #d1fae5; border-color: #6ee7b7; font-weight: 600; }
    .blank-line { border-bottom: 1px solid #999; display: inline-block; width: 180px; margin-left: 4px; }
    .match-row { display: flex; gap: 16px; margin-bottom: 6px; align-items: center; }
    .match-col { flex: 1; padding: 5px 8px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 12px; }
    .explanation { margin-top: 8px; font-size: 11px; color: #555; background: #f9fafb; padding: 6px 10px; border-radius: 6px; border-left: 3px solid #3b82f6; }
    .flashcard { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 8px; page-break-inside: avoid; }
    .fc-front { padding: 10px 14px; font-weight: 600; background: #f8faff; border-right: 1px solid #e5e7eb; }
    .fc-back { padding: 10px 14px; color: #374151; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
    pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; }
    @media print { body { padding: 20px; } button { display: none; } }
  </style>
  </head><body>${html}
  <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script>
  </body></html>`)
  win.document.close()
}

export function quizToPrintHtml(questions, topic, showAnswers) {
  const qHtml = questions.map((q,i) => {
    const isFITB = q.type==='fill_blank'
    const isMatch = q.type==='matching'
    const isSA = q.type==='short_answer'
    const isTF = q.type==='true_false'
    let bodyHtml = ''
    if (isFITB) {
      bodyHtml = `<div class="option">Fill in: <span class="blank-line"></span>${showAnswers?` <strong style="color:#059669">(Answer: ${q.correctAnswer})</strong>':''}</div>`
    } else if (isMatch) {
      const pairs = q.pairs||[]
      const rights = showAnswers ? pairs.map(p=>p.right) : [...pairs.map(p=>p.right)].sort(()=>Math.random()-0.5)
      bodyHtml = pairs.map((p,j)=>`<div class="match-row"><div class="match-col">${j+1}. ${p.left}</div><div class="match-col">${showAnswers?p.right:'_____________'}</div></div>`).join('')
    } else if (isSA) {
      bodyHtml = showAnswers
        ? `<div class="option correct">Answer: ${q.correctAnswer||'Open-ended'}</div>`
        : `<div style="border:1px solid #e5e7eb;border-radius:6px;height:60px;margin-top:4px;"></div>`
    } else {
      const opts = q.options||(isTF?['True','False']:[])
      bodyHtml = opts.map((o,j)=>`<div class="option ${showAnswers&&j===q.answerIndex?'correct':''}">${['A','B','C','D'][j]}. ${o}${showAnswers&&j===q.answerIndex?' ✓':''}</div>`).join('')
    }
    const expHtml = showAnswers&&q.explanation?`<div class="explanation"><strong>Explanation:</strong> ${q.explanation}</div>`:''
    return `<div class="question"><div class="q-num">Question ${i+1} <span style="color:#9ca3af;font-weight:400;font-size:11px;">${q.type||'mcq'}</span></div><div class="q-text">${q.question}</div>${bodyHtml}${expHtml}</div>`
  }).join('')
  return `<h1>${topic||'Quiz'}</h1><div class="meta">${questions.length} questions${showAnswers?' · Answer Key':''}</div>${qHtml}`
}

export function flashcardsToPrintHtml(cards, topic) {
  const rows = cards.map(c=>`<div class="flashcard"><div class="fc-front">${c.front||c.question||''}</div><div class="fc-back">${c.back||c.answer||''}</div></div>`).join('')
  return `<h1>${topic||'Flashcards'}</h1><div class="meta">${cards.length} cards</div><div style="margin-top:16px">${rows}</div>`
}
