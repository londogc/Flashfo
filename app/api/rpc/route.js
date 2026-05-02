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

async function callOpenAIJson(systemPrompt, userPrompt) {
  const text = await callOpenAI({
    model: DEFAULT_MODEL,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
      { role: 'user', content: [{ type: 'input_text', text: userPrompt }] }
    ]
  });
  return parseJsonLoose(text);
}

function parseJsonLoose(text) {
  const cleaned = String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
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
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

async function fetchUrlText(url) {
  const normalized = normalizeGoogleExportUrl(url);
  const res = await fetch(normalized, {
    headers: { 'User-Agent': 'Mozilla/5.0 Flashfo/1.0' },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error('Could not fetch URL.');
  const body = await res.text();
  if (/^\s*<!doctype html/i.test(body) || /^\s*<html/i.test(body)) return htmlToText(body);
  return body;
}

function trimForModel(text, limit = 18000) {
  return String(text || '').slice(0, limit);
}

function getLanguageInstruction(targetLanguage) {
  const language = String(targetLanguage || 'English').trim();
  if (!language || language === 'English') return '';
  return `\nIMPORTANT LANGUAGE REQUIREMENT: Write the entire user-facing output in ${language}. Keep the Flashfo brand name unchanged.`;
}

async function summarizeText(text, format, approxWords, targetLanguage) {
  const targetWords = approxWords || 150;
  const prompt =
    `Summarize the material below in about ${targetWords} words.\n` +
    `Format: ${format === 'bullets' ? 'bullet points' : 'paragraph'}.\n` +
    `Make it clear, natural, and human-sounding.${getLanguageInstruction(targetLanguage)}\n\n` +
    `Material:\n${trimForModel(text, 18000)}`;

  return (await callOpenAI({
    model: DEFAULT_MODEL,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: 'You write clear, concise, natural, human-sounding summaries.' }] },
      { role: 'user', content: [{ type: 'input_text', text: prompt }] }
    ]
  })).trim();
}

async function summarizeFromUrl(url, format, targetLanguage) {
  return summarizeText(await fetchUrlText(url), format, 150, targetLanguage);
}

async function summarizeTopic(topic, format, targetLanguage) {
  const prompt =
    `Create a high-quality ${format === 'bullets' ? 'bullet point' : 'paragraph'} summary in about 150 words.\n` +
    `Make it natural, clear, and human-sounding.${getLanguageInstruction(targetLanguage)}\n` +
    `Topic: ${topic}`;

  return (await callOpenAI({
    model: DEFAULT_MODEL,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: 'You write clear, concise, natural, human-sounding summaries.' }] },
      { role: 'user', content: [{ type: 'input_text', text: prompt }] }
    ]
  })).trim();
}

function buildImportedFileContent(filePayload) {
  const mimeType = String(filePayload?.mimeType || '').toLowerCase();
  const base64 = String(filePayload?.base64 || '');
  const name = String(filePayload?.name || 'file');
  if (!base64) throw new Error('Imported file was empty.');

  if (mimeType.startsWith('image/')) {
    return [
      { type: 'input_text', text: `Use this uploaded image named "${name}" as source material.` },
      { type: 'input_image', image_url: `data:${mimeType};base64,${base64}` }
    ];
  }

  const decoded = Buffer.from(base64, 'base64').toString('utf8');
  return [{ type: 'input_text', text: `Source file name: ${name}\n\n${decoded.slice(0, 18000)}` }];
}

async function summarizeImportedFile(filePayload, format, targetLanguage) {
  const content = buildImportedFileContent(filePayload);
  const prompt =
    'Summarize this content in about 150 words.\n' +
    `Format: ${format === 'bullets' ? 'bullet points' : 'paragraph'}.\n` +
    `Keep the summary strong, natural, and non-robotic.${getLanguageInstruction(targetLanguage)}`;

  return (await callOpenAI({
    model: DEFAULT_MODEL,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: 'You write clear, concise, natural, human-sounding summaries.' }] },
      { role: 'user', content: [{ type: 'input_text', text: prompt }].concat(content) }
    ]
  })).trim();
}

async function generateEssayOutlineFromText(text, targetLanguage) {
  const prompt =
    'Using the material below, create a short 5-paragraph essay outline.\n' +
    'Format:\n1. Introduction\n2. Body Paragraph 1\n3. Body Paragraph 2\n4. Body Paragraph 3\n5. Conclusion\n\n' +
    `Each section should include a topic sentence idea and supporting points.${getLanguageInstruction(targetLanguage)}\n\n` +
    `Material:\n${trimForModel(text, 14000)}`;

  return (await callOpenAI({
    model: DEFAULT_MODEL,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: 'You create clean, useful essay outlines for students.' }] },
      { role: 'user', content: [{ type: 'input_text', text: prompt }] }
    ]
  })).trim();
}

async function generateFlashcardsCore(text, count, targetLanguage) {
  const result = await callOpenAIJson(
    'You create helpful study flashcards. Return only valid JSON.',
    `Create exactly ${count} flashcards from this material.\n` +
      `Write the flashcard front and back text in the requested language when provided.${getLanguageInstruction(targetLanguage)}\n` +
      'Return JSON in this exact shape:\n' +
      '{"cards":[{"front":"...","back":"..."}]}\n\n' +
      `Material:\n${trimForModel(text, 16000)}`
  );
  return { cards: Array.isArray(result.cards) ? result.cards.slice(0, count) : [] };
}

async function generateFlashcardsFromText(text, count, targetLanguage) {
  return generateFlashcardsCore(text, count, targetLanguage);
}

async function generateFlashcardsFromUrl(url, count, targetLanguage) {
  return generateFlashcardsCore(await fetchUrlText(url), count, targetLanguage);
}

async function generateFlashcardsFromImportedFile(filePayload, count, targetLanguage) {
  const content = buildImportedFileContent(filePayload);
  const text = await callOpenAI({
    model: DEFAULT_MODEL,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: 'You create helpful study flashcards. Return only valid JSON.' }] },
      { role: 'user', content: [{ type: 'input_text', text:
        `Create exactly ${count} flashcards from this material.\n` +
        `Write the flashcard front and back text in the requested language when provided.${getLanguageInstruction(targetLanguage)}\n` +
        'Return JSON in this exact shape:\n{"cards":[{"front":"...","back":"..."}]}'
      }].concat(content) }
    ]
  });
  const parsed = parseJsonLoose(text);
  return { cards: Array.isArray(parsed.cards) ? parsed.cards.slice(0, count) : [] };
}

function normalizeQuizQuestions(questions) {
  return (Array.isArray(questions) ? questions : []).map((q) => {
    const type = String(q.type || 'mcq');

    if (type === 'true_false') {
      const answer = String(q.answer || 'True').toLowerCase() === 'false' ? 'False' : 'True';
      return { type: 'true_false', question: String(q.question || ''), options: ['True', 'False'], answer, explanation: String(q.explanation || '') };
    }

    if (type === 'short_answer') {
      return { type: 'short_answer', question: String(q.question || ''), answer: String(q.answer || ''), explanation: String(q.explanation || '') };
    }

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
  const total = getQuizTotal(config);
  const mcq = Number(config?.mcq || 0);
  const tf = Number(config?.trueFalse || 0);
  const sa = Number(config?.shortAnswer || 0);
  const difficulty = String(config?.difficulty || 'medium');

  const result = await callOpenAIJson(
    'You create accurate, useful quizzes. Return only valid JSON.',
    `Create a ${difficulty} quiz from this material.${getLanguageInstruction(targetLanguage)}\n` +
      `Generate exactly:\n- ${mcq} multiple choice questions\n- ${tf} true/false questions\n- ${sa} short answer questions\n\n` +
      'For short answer questions, provide concise but concept-based correct answers.\n' +
      'Return ONLY valid JSON in this exact shape:\n' +
      '{"questions":[{"type":"mcq","question":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"..."},{"type":"true_false","question":"...","answer":"True","explanation":"..."},{"type":"short_answer","question":"...","answer":"...","explanation":"..."}]}\n\n' +
      materialPrompt
  );

  return { questions: normalizeQuizQuestions(result.questions || []).slice(0, total) };
}

async function generateQuizAdvancedFromText(text, config, targetLanguage) {
  return generateQuizAdvancedFromPrompt(`Material:\n${trimForModel(text, 16000)}`, config, targetLanguage);
}

async function generateQuizAdvancedFromUrl(url, config, targetLanguage) {
  return generateQuizAdvancedFromPrompt(`Material:\n${trimForModel(await fetchUrlText(url), 16000)}`, config, targetLanguage);
}

async function generateQuizAdvancedFromImportedFile(filePayload, config, targetLanguage) {
  const content = buildImportedFileContent(filePayload);
  const total = getQuizTotal(config);
  const mcq = Number(config?.mcq || 0);
  const tf = Number(config?.trueFalse || 0);
  const sa = Number(config?.shortAnswer || 0);
  const difficulty = String(config?.difficulty || 'medium');

  const text = await callOpenAI({
    model: DEFAULT_MODEL,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: 'You create accurate, useful quizzes. Return only valid JSON.' }] },
      { role: 'user', content: [{ type: 'input_text', text:
        `Create a ${difficulty} quiz from this material.${getLanguageInstruction(targetLanguage)}\n` +
        `Generate exactly:\n- ${mcq} multiple choice questions\n- ${tf} true/false questions\n- ${sa} short answer questions\n\n` +
        'For short answer questions, provide concise but concept-based correct answers.\n' +
        'Return ONLY valid JSON in this exact shape:\n' +
        '{"questions":[{"type":"mcq","question":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"..."},{"type":"true_false","question":"...","answer":"True","explanation":"..."},{"type":"short_answer","question":"...","answer":"...","explanation":"..."}]}'
      }].concat(content) }
    ]
  });
  const parsed = parseJsonLoose(text);
  return { questions: normalizeQuizQuestions(parsed.questions || []).slice(0, total) };
}

async function buildLessonItemText(item) {
  const type = String(item?.type || '');
  const value = String(item?.value || '').trim();
  const label = String(item?.label || '').trim() || value || 'Untitled item';
  if (!value) return '';

  if (type === 'url') {
    let fetched = '';
    try { fetched = await fetchUrlText(value); }
    catch (_e) { fetched = 'Could not fetch this URL directly, but still use the source topic implied by the URL.'; }
    return ['SOURCE TYPE: URL', `SOURCE LABEL: ${label}`, `SOURCE VALUE: ${value}`, 'SOURCE CONTENT:', trimForModel(fetched, 5000)].join('\n');
  }

  return ['SOURCE TYPE: TEXT / TOPIC', `SOURCE LABEL: ${label}`, 'SOURCE VALUE:', trimForModel(value, 1800)].join('\n');
}

async function generateLessonPlanFromItems(items, educationLevel, targetLanguage) {
  const cleanedItems = (Array.isArray(items) ? items : []).filter((item) => item && String(item.value || '').trim());
  if (!cleanedItems.length) throw new Error('Please add at least one topic or URL.');
  const compiledParts = [];
  for (let i = 0; i < cleanedItems.length; i++) compiledParts.push(`ITEM ${i + 1}\n${await buildLessonItemText(cleanedItems[i])}`);
  const compiled = compiledParts.join('\n\n====================\n\n');

  const prompt =
    'Create a teacher-ready lesson plan that integrates ALL source items below.\n' +
    'Do not ignore short keyword topics just because another source is longer.\n' +
    'Every source item should influence the final lesson plan.\n\n' +
    `The selected education level is: ${String(educationLevel || 'Grade 9–12')}. Write for that exact level.\n` +
    `Write the lesson plan in the selected site language when provided.${getLanguageInstruction(targetLanguage)}\n` +
    'The lesson plan should feel like something a real teacher could actually use.\n' +
    'Make it clear, practical, classroom-ready, and not robotic.\n\n' +
    'Use this format exactly:\nLesson Title\nAudience / Level\nLesson Objective\nMaterials Needed\nWarm-Up / Bell Ringer\nDirect Instruction\nGuided Practice\nIndependent Practice\nCheck for Understanding\nAssessment\nRecap / Exit Ticket\n\n' +
    'Keep it detailed enough to be useful, but not bloated.\n' +
    'Where the sources suggest multiple themes, merge them intelligently into one coherent lesson.\n\n' +
    `SOURCE ITEMS:\n${compiled}`;

  return (await callOpenAI({
    model: DEFAULT_MODEL,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: 'You are an expert instructional designer and classroom lesson planner. You create polished, realistic lesson plans for teachers. Always respect the exact education level selected by the user.' }] },
      { role: 'user', content: [{ type: 'input_text', text: prompt }] }
    ]
  })).trim();
}

async function translateFlashfoTexts(items, targetLanguage) {
  const language = String(targetLanguage || 'English').trim();
  const list = Array.isArray(items) ? items.map((item) => String(item || '')) : [];
  if (!list.length || language === 'English') return list;
  const result = await callOpenAIJson(
    'You translate app UI and educational content accurately. Return only valid JSON.',
    `Translate each string into ${language}. Keep brand names like Flashfo unchanged. Preserve line breaks, numbering, and simple formatting as much as possible. Return JSON exactly like {"items":["..."]}.\n\n${JSON.stringify({ items: list.slice(0, 220) })}`
  );
  const translated = Array.isArray(result.items) ? result.items : [];
  return list.map((original, idx) => translated[idx] || original);
}

async function generateStudyGuideFromText(text, targetLanguage) {
  const prompt =
    'Create a student-friendly study guide from the material below.\n' +
    'Make it practical, clear, and useful for test prep.\n\n' +
    'Use this exact format:\nStudy Guide Title\nBig Picture Summary\nKey Terms\nMajor Concepts\nWhat To Memorize\nCommon Mistakes\nPractice Questions\nQuick Review Checklist\nMemory Tricks / Mnemonics\n\n' +
    `Keep it student-focused, not teacher-facing.${getLanguageInstruction(targetLanguage)}\n\n` +
    `Material:\n${trimForModel(text, 18000)}`;

  return (await callOpenAI({
    model: DEFAULT_MODEL,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: 'You create clear, useful study guides for students.' }] },
      { role: 'user', content: [{ type: 'input_text', text: prompt }] }
    ]
  })).trim();
}

async function explainSimplyFromText(text, targetLanguage) {
  const prompt =
    'Explain the material below in simple, student-friendly language.\n' +
    `Use a natural tone, include a short example if helpful, and avoid sounding robotic.${getLanguageInstruction(targetLanguage)}\n\n` +
    `Material:\n${trimForModel(text, 9000)}`;

  return (await callOpenAI({
    model: DEFAULT_MODEL,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: 'You explain difficult ideas simply and clearly for students.' }] },
      { role: 'user', content: [{ type: 'input_text', text: prompt }] }
    ]
  })).trim();
}

async function generateOpenAITtsAudio(text, voice, language) {
  const input = String(text || '').trim();
  if (!input) throw new Error('No text provided for text-to-speech.');
  const safeVoiceMap = { female: 'marin', male: 'cedar', marin: 'marin', cedar: 'cedar', nova: 'nova', onyx: 'onyx', alloy: 'alloy' };
  const selectedVoice = safeVoiceMap[String(voice || 'female').trim()] || 'marin';
  const selectedLanguage = String(language || 'English').trim() || 'English';

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getOpenAIKey()}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: selectedVoice,
      input: input.slice(0, 4000),
      instructions: `Speak clearly and naturally in a warm, helpful study-coach style. Use natural pauses. Pronounce educational terms carefully. Speak in ${selectedLanguage} when the text is in that language.`,
      response_format: 'mp3'
    })
  });
  const arrayBuffer = await res.arrayBuffer();
  if (!res.ok) throw new Error(`OpenAI TTS error ${res.status}: ${Buffer.from(arrayBuffer).toString('utf8')}`);
  return { mimeType: 'audio/mpeg', base64: Buffer.from(arrayBuffer).toString('base64') };
}

async function searchWebSources(query, targetLanguage) {
  const q = String(query || '').trim();
  if (!q) throw new Error('Please enter a search topic.');
  const wikiLangMap = { English: 'en', Spanish: 'es', French: 'fr', German: 'de', Italian: 'it', Portuguese: 'pt', 'Chinese (Simplified)': 'zh', Japanese: 'ja', Korean: 'ko', Arabic: 'ar', Hindi: 'hi', Russian: 'ru', Vietnamese: 'vi', Tagalog: 'tl', Polish: 'pl', Dutch: 'nl' };
  const lang = wikiLangMap[String(targetLanguage || 'English')] || 'en';
  const url = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=8&namespace=0&format=json&origin=*`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Flashfo/1.0 educational search' }, redirect: 'follow' });
  if (!res.ok) throw new Error('Could not complete search.');
  const data = await res.json();
  const titles = Array.isArray(data[1]) ? data[1] : [];
  const descriptions = Array.isArray(data[2]) ? data[2] : [];
  const links = Array.isArray(data[3]) ? data[3] : [];
  const results = titles.map((title, idx) => ({ source: 'Wikipedia', title: String(title || ''), snippet: String(descriptions[idx] || `Wikipedia article related to ${q}`), url: String(links[idx] || '') })).filter((item) => item.title && item.url);
  return { query: q, results };
}

function sanitizeDriveFileName(name) {
  return String(name || 'Flashfo Export').replace(/[\\/:*?"<>|]/g, '-').slice(0, 120);
}

function exportTextToGoogleDoc(title, text) {
  const safeTitle = sanitizeDriveFileName(title || 'Flashfo Export');
  const body = String(text || '').trim();
  if (!body) throw new Error('No content provided to export.');
  return {
    id: `local-${Date.now()}`,
    name: `${safeTitle}.txt`,
    url: `data:text/plain;charset=utf-8,${encodeURIComponent(body)}`,
    folderName: 'Flashfo local export',
    folderUrl: ''
  };
}

function saveFlashfoJsonToDrive(filename, data) {
  const safeName = `${sanitizeDriveFileName(filename || 'flashfo-data')}.json`;
  return {
    id: `local-${Date.now()}`,
    name: safeName,
    url: `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data || {}, null, 2))}`,
    folderUrl: ''
  };
}

function readDriveTextFile(_fileId) {
  throw new Error('Google Drive reading requires Google OAuth and will be added after the Supabase/Google login migration.');
}

async function runLearningFeature(payload, targetLanguage) {
  payload = payload || {};
  const featureId = String(payload.featureId || 'smart_study_path');
  const featureTitle = String(payload.featureTitle || featureId);
  const sourceText = String(payload.sourceText || '').trim();
  const instructions = String(payload.instructions || '').trim();
  const mode = String(payload.mode || '').trim();
  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  const classroomData = payload.classroomData || {};
  const promptMap = {
    folder_tutor: 'Act as an AI tutor for this folder/source. Answer the user question using only the provided material when possible. If the answer is not in the source, say what is missing and explain the closest related concept.',
    smart_study_path: 'Create a smart study path that tells the student exactly what to do first, next, and last. Include time blocks, review order, quiz checkpoints, and weak-topic recovery.',
    missed_concepts: 'Analyze the missed questions or quiz results. Identify the underlying concepts the student is missing, why they are probably missing them, and what to review next.',
    explain_mistake: 'Explain the mistake clearly: what the student likely chose, why it is wrong, why the correct answer is right, a memory trick, and one similar practice question.',
    writing_coach: 'Act as a writing coach. Help with thesis, outline, evidence plan, counterargument, structure, and revision feedback. Do not just write a full essay unless requested.',
    worksheet_helper: 'Help with worksheet questions step-by-step. Explain the thinking process, give hints first, and include final answers only after the explanation.',
    audio_study_mode: 'Create a natural audio review script for listening. Make it conversational, clear, and easy to follow while walking or driving.',
    memory_tricks: 'Generate mnemonics, analogies, acronyms, visual hooks, and quick examples to help memorize the material.',
    worksheet_generator: 'Create a printable worksheet with clear student directions, questions, and an answer key.',
    rubric_generator: 'Create a polished teacher-ready rubric with categories, point values or proficiency levels, and clear descriptors.',
    differentiation: 'Rewrite or adapt the material according to the selected differentiation mode while preserving the learning objective.',
    handout_generator: 'Create a student-facing or parent-facing handout from the source material. Keep it clean, practical, and classroom-ready.',
    exam_prep: 'Create exam prep material in the requested exam style. Include key concepts, practice questions, traps, and review strategy.',
    one_click_transform: 'Transform the source into a complete learning bundle: summary, key terms, flashcard prompts, quiz questions, worksheet idea, and next study steps.',
    folder_ai: 'Act as Folder AI. Use all provided folder/source material to answer, generate, organize, or teach the content requested by the user.',
    source_library_ai: 'Use the source library and notes as context. Generate the requested educational output and cite which source titles influenced the result.',
    classroom_mode_plan: 'Plan a classroom mode setup with class structure, join-code instructions, student flow, teacher controls, and how saved content should be assigned.',
    assignment_builder_ai: 'Create an assignment plan with objective, directions, materials, student steps, submission expectations, grading notes, and optional extension support.',
    teacher_analytics_ai: 'Analyze the class/quiz data and produce teacher-friendly analytics: weak concepts, reteaching groups, next mini-lesson, and recommended assignment changes.',
    live_game_mode_ai: 'Create a live quiz/game mode plan with rounds, timing, team or solo options, scoring, review prompts, and teacher controls.'
  };
  const sourceLibraryText = sources.map((s, idx) => `SOURCE ${idx + 1}: ${String(s.title || '')}\nURL: ${String(s.url || '')}\nNOTES:\n${String(s.notes || '')}`).join('\n\n---\n\n');
  const classroomText = JSON.stringify(classroomData || {}, null, 2).slice(0, 5000);
  const prompt =
    `FEATURE: ${featureTitle}\nTASK: ${promptMap[featureId] || promptMap.smart_study_path}\n\n` +
    `USER INSTRUCTIONS: ${instructions || 'None provided'}\nMODE / FORMAT: ${mode || 'Default'}${getLanguageInstruction(targetLanguage)}\n\n` +
    `SOURCE MATERIAL:\n${trimForModel(sourceText, 16000)}\n\n` +
    `SOURCE LIBRARY CONTEXT:\n${trimForModel(sourceLibraryText, 8000)}\n\n` +
    `CLASSROOM PROTOTYPE DATA, IF RELEVANT:\n${classroomText}\n\n` +
    'Output should be polished, practical, and easy to use inside Flashfo. Use clear headings and avoid sounding robotic.';

  return (await callOpenAI({
    model: DEFAULT_MODEL,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: 'You are Flashfo, a premium education workspace for students and teachers. You create practical, high-quality learning and teaching materials.' }] },
      { role: 'user', content: [{ type: 'input_text', text: prompt }] }
    ]
  })).trim();
}


async function generateChatResponse(messages, systemPrompt) {
  // Handle string input (legacy call pattern)
  if (typeof messages === 'string') {
    messages = [{ role: 'user', text: messages }]
  }
  if (!Array.isArray(messages)) messages = []
  // messages: [{role:'user'|'assistant', text:'...'}]
  // systemPrompt: string
  const apiMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: [{ type: 'input_text', text: m.text || m.content || '' }]
  }))
  const text = await callOpenAI({
    model: DEFAULT_MODEL,
    instructions: systemPrompt,
    input: apiMessages
  })
  return { reply: text }
}

const handlers = {
  summarizeText,
  summarizeFromUrl,
  summarizeTopic,
  summarizeImportedFile,
  generateEssayOutlineFromText,
  generateFlashcardsFromText,
  generateFlashcardsFromUrl,
  generateFlashcardsFromImportedFile,
  generateQuizAdvancedFromText,
  generateQuizAdvancedFromUrl,
  generateQuizAdvancedFromImportedFile,
  generateLessonPlanFromItems,
  translateFlashfoTexts,
  generateStudyGuideFromText,
  explainSimplyFromText,
  generateOpenAITtsAudio,
  searchWebSources,
  exportTextToGoogleDoc,
  saveFlashfoJsonToDrive,
  readDriveTextFile,
  runLearningFeature,
  generateChatResponse,
};

export async function POST(request) {
  try {
    const { fn, args = [] } = await request.json();
    if (!fn || !Object.prototype.hasOwnProperty.call(handlers, fn)) throw new Error(`Unknown Flashfo function: ${fn}`);
    const result = await handlers[fn](...(Array.isArray(args) ? args : []));
    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
