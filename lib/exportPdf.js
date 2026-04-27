export function printContent(title, html) {
  const win = window.open('', '_blank')
  const style = [
    '* { box-sizing: border-box; margin: 0; padding: 0; }',
    'body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #111; padding: 40px; max-width: 780px; margin: 0 auto; font-size: 13px; line-height: 1.6; }',
    'h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }',
    '.meta { color: #666; font-size: 12px; margin-bottom: 28px; }',
    '.question { margin-bottom: 22px; page-break-inside: avoid; }',
    '.q-num { font-weight: 700; font-size: 13px; color: #1d4ed8; margin-bottom: 4px; }',
    '.q-text { font-weight: 600; margin-bottom: 10px; }',
    '.option { padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 5px; font-size: 12px; }',
    '.correct { background: #d1fae5; border-color: #6ee7b7; font-weight: 600; }',
    '.blank-line { border-bottom: 1px solid #999; display: inline-block; width: 180px; margin-left: 4px; }',
    '.match-row { display: flex; gap: 16px; margin-bottom: 6px; align-items: center; }',
    '.match-col { flex: 1; padding: 5px 8px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 12px; }',
    '.explanation { margin-top: 8px; font-size: 11px; color: #555; background: #f9fafb; padding: 6px 10px; border-radius: 6px; border-left: 3px solid #3b82f6; }',
    '.flashcard { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 8px; page-break-inside: avoid; }',
    '.fc-front { padding: 10px 14px; font-weight: 600; background: #f8faff; border-right: 1px solid #e5e7eb; }',
    '.fc-back { padding: 10px 14px; color: #374151; }',
    'pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; }',
    '@media print { body { padding: 20px; } button { display: none; } }'
  ].join(' ')
  win.document.write('<!DOCTYPE html><html><head><title>' + title + '</title><style>' + style + '</style></head><body>' + html + '<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>')
  win.document.close()
}

export function quizToPrintHtml(questions, topic, showAnswers) {
  var qHtml = questions.map(function(q, i) {
    var labels = ['A','B','C','D']
    var isSA = q.type === 'short_answer'
    var isFITB = q.type === 'fill_blank'
    var isMatch = q.type === 'matching'
    var bodyHtml = ''
    if (isFITB) {
      bodyHtml = '<div class="option">Fill in: <span class="blank-line"></span>' + (showAnswers ? ' <strong style="color:#059669">(Answer: ' + (q.correctAnswer||'') + ')</strong>' : '') + '</div>'
    } else if (isMatch) {
      var pairs = q.pairs || []
      bodyHtml = pairs.map(function(p, j) {
        return '<div class="match-row"><div class="match-col">' + (j+1) + '. ' + p.left + '</div><div class="match-col">' + (showAnswers ? p.right : '_____________') + '</div></div>'
      }).join('')
    } else if (isSA) {
      bodyHtml = showAnswers
        ? '<div class="option correct">Answer: ' + (q.correctAnswer || 'Open-ended') + '</div>'
        : '<div style="border:1px solid #e5e7eb;border-radius:6px;height:60px;margin-top:4px;"></div>'
    } else {
      var opts = q.options || (q.type==='true_false' ? ['True','False'] : [])
      bodyHtml = opts.map(function(o, j) {
        return '<div class="option ' + (showAnswers && j===q.answerIndex ? 'correct' : '') + '">' + labels[j] + '. ' + o + (showAnswers && j===q.answerIndex ? ' ✓' : '') + '</div>'
      }).join('')
    }
    var expHtml = (showAnswers && q.explanation) ? '<div class="explanation"><strong>Explanation:</strong> ' + q.explanation + '</div>' : ''
    return '<div class="question"><div class="q-num">Question ' + (i+1) + ' <span style="color:#9ca3af;font-weight:400;font-size:11px;">' + (q.type||'mcq') + '</span></div><div class="q-text">' + q.question + '</div>' + bodyHtml + expHtml + '</div>'
  }).join('')
  return '<h1>' + (topic||'Quiz') + '</h1><div class="meta">' + questions.length + ' questions' + (showAnswers ? ' &middot; Answer Key' : '') + '</div>' + qHtml
}

export function flashcardsToPrintHtml(cards, topic) {
  var rows = cards.map(function(c) {
    return '<div class="flashcard"><div class="fc-front">' + (c.front||c.question||'') + '</div><div class="fc-back">' + (c.back||c.answer||'') + '</div></div>'
  }).join('')
  return '<h1>' + (topic||'Flashcards') + '</h1><div class="meta">' + cards.length + ' cards</div><div style="margin-top:16px">' + rows + '</div>'
}
