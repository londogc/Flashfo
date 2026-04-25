export const runtime = 'nodejs';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Missing OPENAI_API_KEY in Vercel Environment Variables.');
  return key;
}

async function callOpenAI(payload) {
  const res = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getOpenAIKey()}`
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${text}`);

  const json = JSON.parse(text);
  if (json.output_text) return json.output_text;

  if (Array.isArray(json.output)) {
    const chunks = [];
    json.output.forEach((item) => {
      if (Array.isArray(item.content)) {
        item.content.forEach((part) => {
          if (part.type === 'output_text' && part.text) chunks.push(part.text);
        });
      }
    });
    if (chunks.length) return chunks.join('\n').trim();
  }

  throw new Error('OpenAI returned an unexpected response format.');
}

export async function POST(request) {
  try {
    const { fn, args = [] } = await request.json();
    const handlers = { runLearningFeature: async (p, lang) => 'AI Suite placeholder' };
    if (!fn || !Object.prototype.hasOwnProperty.call(handlers, fn)) throw new Error(`Unknown function: ${fn}`);
    const result = await handlers[fn](...(Array.isArray(args) ? args : []));
    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
