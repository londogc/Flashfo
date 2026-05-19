export const runtime = 'nodejs';

const rateLimitMap = new Map();
function getRateLimitKey(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
function checkRateLimit(key, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
  entry.count++;
  rateLimitMap.set(key, entry);
  return entry.count <= limit;
}

import { createClient } from '@supabase/supabase-js';
async function verifyAuth(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

function isSafeUrl(url) {
  try {
    const { hostname, protocol } = new URL(url);
    if (!['http:', 'https:'].includes(protocol)) return false;
    const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254', 'metadata.google.internal'];
    if (blocked.some(h => hostname === h || hostname.endsWith('.internal'))) return false;
    return true;
  } catch { return false; }
}

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const MAX_INPUT_LENGTH = 20_000;

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Missing OPENAI_API_KEY in Vercel Environment Variables.');
  return key;
}
async function callOpenAI(payload) {
  const res = await fetch(OPENAI_RESPONSES_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getOpenAIKey()}` }, body: JSON.stringify(payload) });
  const text = await res.text();
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${text}`);
  const json = JSON.parse(text);
  if (json.output_text) return json.output_text;
  if (Array.isArray(json.output)) { const chunks = []; json.output.forEach((item) => { if (Array.isArray(item.content)) { item.content.forEach((part) => { if (part.type === 'output_text' && part.text) chunks.push(part.text); }); } }); if (chunks.length) return chunks.join('\n').trim(); }
  throw new Error('OpenAI returned an unexpected response format.');
}
async function callOpenAIJson(systemPrompt, userPrompt) {
  const text = await callOpenAI({ model: DEFAULT_MODEL, input: [ { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] }, { role: 'user', content: [{ type: 'input_text', text: userPrompt }] } ] });
  return parseJsonLoose(text);
}
function parseJsonLoose(text) {
  const cleaned = String(text || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
}
function normalizeGoogleExportUrl(url) {
  const str = String(url || '');
  const docMatch = str.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9-_]+)/);
  if (docMatch) return `https://docs.google.com/document/d/${docMatch[1]}/export?format=txt`;
  const sheetMatch = str.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetMatch) return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/export?format=csv`;
  const slideMatch = str.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9-_]+)/);
  if (slideMatch) return `https://docs.google.com/presentation/d/${slideMatch[1]}/export/txt`;
  return str;
}
function htmlToText(html) {
  return String(html || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ').replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|tr)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{2,}/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
}
async function fetchUrlText(url) {
  const normalized = normalizeGoogleExportUrl(url);
  if (!isSafeUrl(normalized)) throw new Error('URL not allowed.');
  const res = await fetch(normalized, {
    headers: { 'User-Agent': 'Mozilla/5.0 Flashfo/1.0' },
    redirect: 'manual',
  });
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location');
    if (!location || !isSafeUrl(location)) throw new Error('URL not allowed (redirect target).');
    const res2 = await fetch(location, { headers: { 'User-Agent': 'Mozilla/5.0 Flashfo/1.0' }, redirect: 'follow' });
    if (!res2.ok) throw new Error('Could not fetch URL.');
    const body2 = await res2.text();
    if (/^\s*<!doctype html/i.test(body2) || /^\s*<html/i.test(body2)) return htmlToText(body2);
    return body2;
  }
  if (!res.ok) throw new Error('Could not fetch URL.');
  const body = await res.text();
  if (/^\s*<!doctype html/i.test(body) || /^\s*<html/i.test(body)) return htmlToText(body);
  return body;
}
function trimForModel(text, limit = 18000) { return String(text || '').slice(0, limit); }
function getLanguageInstruction(targetLanguage) {
  const language = String(targetLanguage || 'English').trim();
  if (!language || language === 'English') return '';
  return `\nIMPORTANT LANGUAGE REQUIREMENT: Write the entire user-facing output in ${language}. Keep the Flashfo brand name unchanged.`;
}
async function summarizeText(text, format, approxWords, targetLanguage) {
  const targetWords = approxWords || 150;
  const prompt = `Summarize the material below in about ${targetWords} words.\nFormat: ${format === 'bullets' ? 'bullet points' : 'paragraph'}.\nMake it clear, natural, and human-sounding.${getLanguageInstruction(targetLanguage)}\n\nMaterial:\n${trimForModel(text, 18000)}`;
  return (await callOpenAI({ model: DEFAULT_MODEL, input: [ { role: 'system', content: [{ type: 'input_text', text: 'You write clear, concise, natural, human-sounding summaries.' }] }, { role: 'user', content: [{ type: 'input_text', text: prompt }] } ] })).trim();
}
async function summarizeFromUrl(url, format, targetLanguage) { return summarizeText(await fetchUrlText(url), format, 150, targetLanguage); }
async function summarizeTopic(topic, format, targetLanguage) {
  const prompt = `Create a high-quality ${format === 'bullets' ? 'bullet point' : 'paragraph'} summary in about 150 words.\nMake it natural, clear, and human-sounding.${getLanguageInstruction(targetLanguage)}\nTopic: ${topic}`;
  return (await callOpenAI({ model: DEFAULT_MODEL, input: [ { role: 'system', content: [{ type: 'input_text', text: 'You write clear, concise, natural, human-sounding summaries.' }] }, { role: 'user', content: [{ type: 'input_text', text: prompt }] } ] })).trim();
}
function buildImportedFileContent(filePayload) {
  const mimeType = String(filePayload?.mimeType || '').toLowerCase();
  const base64 = String(filePayload?.base64 || '');
  const name = String(filePayload?.name || 'file');
  if (!base64) throw new Error('Imported file was empty.');
  if (mimeType.startsWith('image/')) { return [ { type: 'input_text', text: `Use this uploaded image named "${name}" as source material.` }, { type: 'input_image', image_url: `data:${mimeType};base64,${base64}` } ]; }
  const decoded = Buffer.from(base64, 'base64').toString('utf8');
  return [{ type: 'input_text', text: `Source file name: ${name}\n\n${decoded.slice(0, 18000)}` }];
}
async function summarizeImportedFile(filePayload, format, targetLanguage) {
  const content = buildImportedFileContent(filePayload);
  const prompt = 'Summarize this content in about 150 words.\n' + `Format: ${format === 'bullets' ? 'bullet points' : 'paragraph'}.\nKeep the summary strong, natural, and non-robotic.${getLanguageInstruction(targetLanguage)}`;
  return (await callOpenAI({ model: DEFAULT_MODEL, input: [ { role: 'system', content: [{ type: 'input_text', text: 'You write clear, concise, natural, human-sounding summaries.' }] }, { role: 'user', content: [{ type: 'input_text', text: prompt }].concat(content) } ] })).trim();
}
async function generateEssayOutlineFromText(text, targetLanguage) {
  const prompt = 'Using the material below, create a short 5-paragraph essay outline.\nFormat:\n1. Introduction\n2. Body Paragraph 1\n3. Body Paragraph 2\n4. Body Paragraph 3\n5. Conclusion\n\nEach section should include a topic sentence idea and supporting points.' + getLanguageInstruction(targetLanguage) + '\n\nMaterial:\n' + trimForModel(text, 14000);
  return (await callOpenAI({ model: DEFAULT_MODEL, input: [ { role: 'system', content: [{ type: 'input_text', text: 'You create clean, useful essay outlines for students.' }] }, { role: 'user', content: [{ type: 'input_text', text: prompt }] } ] })).trim();
}
async function generateFlashcardsCore(text, count, targetLanguage) {
  const result = await callOpenAIJson('You create helpful study flashcards. Return only valid JSON.', `Create exactly ${count} flashcards from this material.\nWrite the flashcard front and back text in the requested language when provided.${getLanguageInstruction(targetLanguage)}\nReturn JSON in this exact shape:\n{"cards":[{"front":"...","back":"..."}]}\n\nMaterial:\n${trimForModel(text, 16000)}`);
  return { cards: Array.isArray(result.cards) ? result.cards.slice(0, count) : [] };
}
async function generateFlashcardsFromText(text, count, targetLanguage) { return generateFlashcardsCore(text, count, targetLanguage); }
async function generateFlashcardsFromUrl(url, count, targetLanguage) { return generateFlashcardsCore(await fetchUrlText(url), count, targetLanguage); }
async function generateFlashcardsFromImportedFile(filePayload, count, targetLanguage) {
  const content = buildImportedFileContent(filePayload);
  const text = await callOpenAI({ model: DEFAULT_MODEL, input: [ { role: 'system', content: [{ type: 'input_text', text: 'You create helpful study flashcards. Return only valid JSON.' }] }, { role: 'user', content: [{ type: 'input_text', text: `Create exactly ${count} flashcards from this material.\nReturn JSON: {"cards":[{"front":"...","back":"..."}]}` }].concat(content) } ] });
  const parsed = parseJsonLoose(text);
  return { cards: Array.isArray(parsed.cards) ? parsed.cards.slice(0, count) : [] };
}
function normalizeQuizQuestions(questions) {
  return (Array.isArray(questions) ? questions : []).map((q) => {
    const type = String(q.type || 'mcq');
    if (type === 'true_false') { const answer = String(q.answer || 'True').toLowerCase() === 'false' ? 'False' : 'True'; return { type: 'true_false', question: String(q.question || ''), options: ['True', 'False'], answer, explanation: String(q.explanation || '') }; }
    if (type === 'short_answer') { return { type: 'short_answer', question: String(q.question || ''), answer: String(q.answer || ''), explanation: String(q.explanation || '') }; }
    const options = Array.isArray(q.options) ? q.options.map(String).slice(0, 4) : [];
    while (options.length < 4) options.push(`Option ${String.fromCharCode(65 + options.length)}`);
    let answerIndex = Number(q.answerIndex);
    if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) answerIndex = 0;
    return { type: 'mcq', question: String(q.question || ''), options, answerIndex, explanation: String(q.explanation || '') };
  });
}
function getQuizTotal(config) {
  const total = Number(config?.mcq || 0) + Number(config?.trueFalse || 0) + Number(config?.shortAnswer || 0);
  if (!total || total < 1) throw new Error('Quiz must contain at least 1 question.');
  return total;
}
async function generateQuizAdvancedFromPrompt(materialPrompt, config, targetLanguage) {
  const total = getQuizTotal(config); const mcq = Number(config?.mcq || 0); const tf = Number(config?.trueFalse || 0); const sa = Number(config?.shortAnswer || 0); const difficulty = String(config?.difficulty || 'medium');
  const result = await callOpenAIJson('You create accurate quizzes. Return only valid JSON.', `Create a ${difficulty} quiz.${getLanguageInstruction(targetLanguage)}\nGenerate: ${mcq} MCQ, ${tf} true/false, ${sa} short answer.\nReturn JSON: {"questions":[...]}\n\n${materialPrompt}`);
  return { questions: normalizeQuizQuestions(result.questions || []).slice(0, total) };
}
async function generateQuizAdvancedFromText(text, config, targetLanguage) { return generateQuizAdvancedFromPrompt(`Material:\n${trimForModel(text, 16000)}`, config, targetLanguage); }
async function generateQuizAdvancedFromUrl(url, config, targetLanguage) { return generateQuizAdvancedFromPrompt(`Material:\n${trimForModel(await fetchUrlText(url), 16000)}`, config, targetLanguage); }
async function generateQuizAdvancedFromImportedFile(filePayload, config, targetLanguage) {
  const content = buildImportedFileContent(filePayload);
  const total = getQuizTotal(config); const mcq = Number(config?.mcq || 0); const tf = Number(config?.trueFalse || 0); const sa = Number(config?.shortAnswer || 0); const difficulty = String(config?.difficulty || 'medium');
  const text = await callOpenAI({ model: DEFAULT_MODEL, input: [ { role: 'system', content: [{ type: 'input_text', text: 'Return only valid JSON.' }] }, { role: 'user', content: [{ type: 'input_text', text: `Create a ${difficulty} quiz: ${mcq} MCQ, ${tf} T/F, ${sa} short answer. Return JSON: {"questions":[...]}` }].concat(content) } ] });
  const parsed = parseJsonLoose(text);
  return { questions: normalizeQuizQuestions(parsed.questions || []).slice(0, total) };
}
async function buildLessonItemText(item) {
  const type = String(item?.type || ''); const value = String(item?.value || '').trim(); const label = String(item?.label || '').trim() || value || 'Untitled item';
  if (!value) return '';
  if (type === 'url') { let fetched = ''; try { fetched = await fetchUrlText(value); } catch (_e) { fetched = 'Could not fetch this URL.'; } return ['SOURCE TYPE: URL', `SOURCE LABEL: ${label}`, `SOURCE VALUE: ${value}`, 'SOURCE CONTENT:', trimForModel(fetched, 5000)].join('\n'); }
  return ['SOURCE TYPE: TEXT / TOPIC', `SOURCE LABEL: ${label}`, 'SOURCE VALUE:', trimForModel(value, 1800)].join('\n');
}
async function generateLessonPlanFromItems(items, educationLevel, targetLanguage) {
  const cleanedItems = (Array.isArray(items) ? items : []).filter((item) => item && String(item.value || '').trim());
  if (!cleanedItems.length) throw new Error('Please add at least one topic or URL.');
  const compiledParts = [];
  for (let i = 0; i < cleanedItems.length; i++) compiledParts.push(`ITEM ${i + 1}\n${await buildLessonItemText(cleanedItems[i])}`);
  const compiled = compiledParts.join('\n\n====================\n\n');
  const prompt = `Create a teacher-ready lesson plan integrating all source items.\nEducation level: ${String(educationLevel || 'Grade 9-12')}.${getLanguageInstruction(targetLanguage)}\nFormat: Lesson Title, Audience/Level, Objective, Materials, Warm-Up, Direct Instruction, Guided Practice, Independent Practice, Assessment, Exit Ticket.\n\nSOURCE ITEMS:\n${compiled}`;
  return (await callOpenAI({ model: DEFAULT_MODEL, input: [ { role: 'system', content: [{ type: 'input_text', text: 'You are an expert lesson planner for teachers.' }] }, { role: 'user', content: [{ type: 'input_text', text: prompt }] } ] })).trim();
}
async function translateFlashfoTexts(items, targetLanguage) {
  const language = String(targetLanguage || 'English').trim();
  const list = Array.isArray(items) ? items.map((item) => String(item || '')) : [];
  if (!list.length || language === 'English') return list;
  const result = await callOpenAIJson('You translate accurately. Return only valid JSON.', `Translate into ${language}. Return JSON: {"items":["..."]}\n\n${JSON.stringify({ items: list.slice(0, 220) })}`);
  const translated = Array.isArray(result.items) ? result.items : [];
  return list.map((original, idx) => translated[idx] || original);
}
async function generateStudyGuideFromText(text, targetLanguage) {
  const prompt = 'Create a student-friendly study guide.\nFormat: Title, Summary, Key Terms, Major Concepts, What To Memorize, Common Mistakes, Practice Questions, Quick Review Checklist, Memory Tricks.' + getLanguageInstruction(targetLanguage) + '\n\nMaterial:\n' + trimForModel(text, 18000);
  return (await callOpenAI({ model: DEFAULT_MODEL, input: [ { role: 'system', content: [{ type: 'input_text', text: 'You create clear study guides for students.' }] }, { role: 'user', content: [{ type: 'input_text', text: prompt }] } ] })).trim();
}
async function explainSimplyFromText(text, targetLanguage) {
  const prompt = 'Explain in simple student-friendly language.' + getLanguageInstruction(targetLanguage) + '\n\nMaterial:\n' + trimForModel(text, 9000);
  return (await callOpenAI({ model: DEFAULT_MODEL, input: [ { role: 'system', content: [{ type: 'input_text', text: 'You explain ideas clearly for students.' }] }, { role: 'user', content: [{ type: 'input_text', text: prompt }] } ] })).trim();
}
async function generateOpenAITtsAudio(text, voice, language) {
  const input = String(text || '').trim();
  if (!input) throw new Error('No text provided for TTS.');
  const safeVoiceMap = { female: 'marin', male: 'cedar', marin: 'marin', cedar: 'cedar', nova: 'nova', onyx: 'onyx', alloy: 'alloy' };
  const selectedVoice = safeVoiceMap[String(voice || 'female').trim()] || 'marin';
  const selectedLanguage = String(language || 'English').trim() || 'English';
  const res = await fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getOpenAIKey()}` }, body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: selectedVoice, input: input.slice(0, 4000), instructions: `Speak clearly in a warm study-coach style in ${selectedLanguage}.`, response_format: 'mp3' }) });
  const arrayBuffer = await res.arrayBuffer();
  if (!res.ok) throw new Error(`TTS error ${res.status}`);
  return { mimeType: 'audio/mpeg', base64: Buffer.from(arrayBuffer).toString('base64') };
}
async function searchWebSources(query, targetLanguage) {
  const q = String(query || '').trim();
  if (!q) throw new Error('Please enter a search topic.');
  const wikiLangMap = { English: 'en', Spanish: 'es', French: 'fr', German: 'de', Italian: 'it', Portuguese: 'pt', 'Chinese (Simplified)': 'zh', Japanese: 'ja', Korean: 'ko', Arabic: 'ar', Hindi: 'hi', Russian: 'ru', Vietnamese: 'vi', Tagalog: 'tl', Polish: 'pl', Dutch: 'nl' };
  const lang = wikiLangMap[String(targetLanguage || 'English')] || 'en';
  const url = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=8&namespace=0&format=json&origin=*`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Flashfo/1.0' }, redirect: 'follow' });
  if (!res.ok) throw new Error('Could not complete search.');
  const data = await res.json();
  const titles = Array.isArray(data[1]) ? data[1] : [];
  const descriptions = Array.isArray(data[2]) ? data[2] : [];
  const links = Array.isArray(data[3]) ? data[3] : [];
  return { query: q, results: titles.map((title, idx) => ({ source: 'Wikipedia', title: String(title || ''), snippet: String(descriptions[idx] || ''), url: String(links[idx] || '') })).filter(i => i.title && i.url) };
}
function sanitizeDriveFileName(name) { return String(name || 'Flashfo Export').replace(/[\\/:*?"<>|]/g, '-').slice(0, 120); }
function exportTextToGoogleDoc(title, text) {
  const safeTitle = sanitizeDriveFileName(title || 'Flashfo Export');
  const body = String(text || '').trim();
  if (!body) throw new Error('No content provided.');
  return { id: `local-${Date.now()}`, name: `${safeTitle}.txt`, url: `data:text/plain;charset=utf-8,${encodeURIComponent(body)}`, folderName: 'Flashfo local export', folderUrl: '' };
}
function saveFlashfoJsonToDrive(filename, data) {
  const safeName = `${sanitizeDriveFileName(filename || 'flashfo-data')}.json`;
  return { id: `local-${Date.now()}`, name: safeName, url: `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data || {}, null, 2))}`, folderUrl: '' };
}
function readDriveTextFile(_fileId) { throw new Error('Google Drive reading requires OAuth migration.'); }
async function runLearningFeature(payload, targetLanguage) {
  payload = payload || {};
  const featureId = String(payload.featureId || 'smart_study_path');
  const featureTitle = String(payload.featureTitle || featureId);
  const sourceText = String(payload.sourceText || '').trim();
  const instructions = String(payload.instructions || '').trim();
  const mode = String(payload.mode || '').trim();
  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  const classroomData = payload.classroomData || {};
  const promptMap = { folder_tutor: 'Act as AI tutor for this source.', smart_study_path: 'Create a smart study path with time blocks and review order.', missed_concepts: 'Identify concepts the student is missing from quiz results.', explain_mistake: 'Explain the mistake: why wrong, why correct answer is right, memory trick.', writing_coach: 'Act as writing coach for thesis, outline, structure.', worksheet_helper: 'Help with worksheet questions step-by-step.', audio_study_mode: 'Create a natural audio review script.', memory_tricks: 'Generate mnemonics, analogies, acronyms.', worksheet_generator: 'Create a printable worksheet with answer key.', rubric_generator: 'Create a teacher rubric with categories and descriptors.', differentiation: 'Rewrite for differentiation mode.', handout_generator: 'Create a classroom handout.', exam_prep: 'Create exam prep with key concepts and practice questions.', one_click_transform: 'Transform into: summary, key terms, flashcards, quiz, worksheet, next steps.', folder_ai: 'Use all folder material to answer.', source_library_ai: 'Use source library to generate output.', classroom_mode_plan: 'Plan classroom mode setup.', assignment_builder_ai: 'Create assignment plan.', teacher_analytics_ai: 'Analyze class data for insights.', live_game_mode_ai: 'Create live quiz game plan.' };
  const sourceLibraryText = sources.map((s, idx) => `SOURCE ${idx + 1}: ${String(s.title || '')}\nURL: ${String(s.url || '')}\nNOTES:\n${String(s.notes || '')}`).join('\n\n---\n\n');
  const classroomText = JSON.stringify(classroomData || {}, null, 2).slice(0, 5000);
  const prompt = `FEATURE: ${featureTitle}\nTASK: ${promptMap[featureId] || promptMap.smart_study_path}\n\nINSTRUCTIONS: ${instructions || 'None'}\nMODE: ${mode || 'Default'}${getLanguageInstruction(targetLanguage)}\n\nSOURCE MATERIAL:\n${trimForModel(sourceText, 16000)}\n\nSOURCE LIBRARY:\n${trimForModel(sourceLibraryText, 8000)}\n\nCLASSROOM DATA:\n${classroomText}`;
  return (await callOpenAI({ model: DEFAULT_MODEL, input: [ { role: 'system', content: [{ type: 'input_text', text: 'You are Flashfo, a premium education workspace.' }] }, { role: 'user', content: [{ type: 'input_text', text: prompt }] } ] })).trim();
}
async function generateChatResponse(messages, systemPrompt) {
  if (typeof messages === 'string') { messages = [{ role: 'user', text: messages }] }
  if (!Array.isArray(messages)) messages = []
  const apiMessages = messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: [{ type: 'input_text', text: String(m.text || m.content || '').slice(0, MAX_INPUT_LENGTH) }] }))
  const text = await callOpenAI({ model: DEFAULT_MODEL, instructions: systemPrompt, input: apiMessages })
  return { reply: text }
}

// ── generateQuizFromTopic ─────────────────────────────────────────────────────
// PATCHED: added "topic" field to the JSON schema and prompt instruction.
// Each generated question now includes a 2-4 word sub-topic label (e.g. "Space Race",
// "Berlin Wall") so the post-quiz results screen can group questions by subject area
// instead of by question type. Questions on the same concept share the same topic label.
async function generateQuizFromTopic(topic, config) {
  const cfg = config && typeof config === 'object' ? config : { mcq: 5 };
  const lines = [];
  if (cfg.mcq > 0) lines.push(cfg.mcq + ' multiple choice');
  if (cfg.true_false > 0) lines.push(cfg.true_false + ' true/false');
  if (cfg.short_answer > 0) lines.push(cfg.short_answer + ' short answer');
  if (cfg.fill_blank > 0) lines.push(cfg.fill_blank + ' fill-in-the-blank');
  if (cfg.matching > 0) lines.push(cfg.matching + ' matching');
  if (!lines.length) lines.push('5 multiple choice');
  return callOpenAIJson(
    'You are an expert quiz generator. Return ONLY valid JSON.',
    `Generate a quiz about: ${String(topic || '').trim()}
Create: ${lines.join(', ')}
Each question must include a "topic" field: a short 2-4 word sub-topic label grouping related questions (e.g. "Space Race", "Berlin Wall", "Nuclear Arms"). Questions testing the same concept share the same topic label.
Return JSON: {"questions":[{"type":"mcq","question":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"...","topic":"..."}]}`
  );
}

async function fetchUrlPreview(url) {
  const text = await fetchUrlText(url)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const title = lines[0]?.slice(0, 120) || url
  return { title, content: trimForModel(text, 12000) }
}

async function generateFromSources(sources, action, instructions, targetLanguage) {
  if (!Array.isArray(sources) || sources.length === 0) throw new Error('No sources provided.')
  const compiled = sources.map((s, i) =>
    `--- SOURCE ${i + 1}: ${String(s.title || 'Untitled')} ---\n${s.url ? `URL: ${s.url}\n` : ''}${String(s.content || '').slice(0, 6000)}`
  ).join('\n\n')
  const actionMap = {
    flashcards: 'Create a comprehensive set of flashcards covering the key concepts from these sources. Return JSON: {"cards":[{"front":"...","back":"..."}]}',
    quiz: 'Create a 10-question quiz (mix of MCQ and short answer) covering these sources. Return JSON: {"questions":[{"type":"mcq","question":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"..."}]}',
    summary: 'Write a clear, comprehensive summary of all these sources combined. Highlight the most important points.',
    study_guide: 'Create a structured study guide from these sources. Include: Key Concepts, Important Terms, Main Arguments, and Review Questions.',
    ask: instructions || 'Answer this question using only the provided sources as context.',
  }
  const task = actionMap[action] || actionMap.summary
  const lang = getLanguageInstruction(targetLanguage)
  const prompt = `TASK: ${task}${instructions && action === 'ask' ? `\nQUESTION: ${instructions}` : ''}${lang}\n\nSOURCES:\n${trimForModel(compiled, 18000)}`
  const systemPrompt = action === 'flashcards' || action === 'quiz'
    ? 'You generate educational study materials. Return ONLY valid JSON, no markdown.'
    : 'You are a helpful study assistant. Be clear, thorough, and well-structured.'
  return (await callOpenAI({ model: DEFAULT_MODEL, input: [
    { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
    { role: 'user', content: [{ type: 'input_text', text: prompt }] },
  ]})).trim()
}

const handlers = { summarizeText, summarizeFromUrl, summarizeTopic, summarizeImportedFile, generateEssayOutlineFromText, generateFlashcardsFromText, generateFlashcardsFromUrl, generateFlashcardsFromImportedFile, generateQuizAdvancedFromText, generateQuizAdvancedFromUrl, generateQuizAdvancedFromImportedFile, generateLessonPlanFromItems, translateFlashfoTexts, generateStudyGuideFromText, explainSimplyFromText, generateOpenAITtsAudio, searchWebSources, runLearningFeature, generateChatResponse, generateQuizFromTopic, fetchUrlPreview, generateFromSources };

export async function POST(request) {
  try {
    const ip = getRateLimitKey(request);
    if (!checkRateLimit(ip, 30, 60_000)) {
      return Response.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }
    const user = await verifyAuth(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }
    const { fn, args = [] } = await request.json();
    if (!fn || !Object.prototype.hasOwnProperty.call(handlers, fn)) throw new Error(`Unknown function: ${fn}`);

    // ── Free tier: 5 AI generations per month ────────────────────────────────
    const AI_GEN_FNS = new Set([
      'summarizeText','summarizeFromUrl','summarizeTopic','summarizeImportedFile',
      'generateFlashcardsFromText','generateFlashcardsFromUrl','generateFlashcardsFromImportedFile',
      'generateQuizAdvancedFromText','generateQuizAdvancedFromUrl','generateQuizAdvancedFromImportedFile',
      'generateLessonPlanFromItems','generateStudyGuideFromText','generateQuizFromTopic',
      'runLearningFeature','generateChatResponse','generateFromSources',
    ])
    if (AI_GEN_FNS.has(fn)) {
      const sbAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      const { data: profile } = await sbAdmin.from('profiles').select('plan').eq('id', user.id).single()
      const plan = profile?.plan || 'free'
      const isPaid = plan === 'pro' || plan === 'teacher' || plan === 'school'
      if (!isPaid) {
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)
        const { count } = await sbAdmin.from('generation_log')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', monthStart.toISOString())
        if ((count || 0) >= 5) {
          return Response.json({ error: 'free_limit_reached', message: 'You\'ve used your 5 free AI generations this month. Upgrade to Pro for unlimited access.' }, { status: 403 })
        }
        try { await sbAdmin.from('generation_log').insert({ user_id: user.id, fn }) } catch (_) {}
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const safeArgs = (Array.isArray(args) ? args : []).map(arg => typeof arg === 'string' ? arg.slice(0, MAX_INPUT_LENGTH) : arg);
    const result = await handlers[fn](...safeArgs);
    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
