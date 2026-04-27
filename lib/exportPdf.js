export function printContent(title, html) { const w = window.open('', '_blank'); w.document.write('<html><head><title>' + title + '</title></head><body>' + html + '</body></html>'); w.document.close(); w.print(); }
export function quizToPrintHtml(q, t, a) { return '<h1>' + (t||'Quiz') + '</h1>'; }
export function flashcardsToPrintHtml(c, t) { return '<h1>' + (t||'Flashcards') + '</h1>'; }
