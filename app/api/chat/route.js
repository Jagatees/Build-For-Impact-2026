import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const SEA_LION_API_URL = process.env.SEA_LION_API_URL || 'https://cf-sealion01.jagateesvaran.workers.dev';
export const runtime = 'nodejs';

// Map codes to full names for the AI
const LANGUAGE_MAP = {
  'en': 'English',
  'ta': 'Tamil',
  'ms': 'Malay',
  'zh': 'Mandarin Chinese',
  'hi': 'Hindi',
  'bn': 'Bengali',
  'th': 'Thai',
  'id': 'Indonesian',
  'tl': 'Tagalog'
};

async function querySeaLion(message, conversationHistory = [], targetLangCode = null) {
  if (!message || !message.trim()) throw new Error('Message is required');

  const langName = (targetLangCode && LANGUAGE_MAP[targetLangCode]) ? LANGUAGE_MAP[targetLangCode] : 'English';

  const systemPrompt = `You are a translator. Your ONLY job is to translate the user's text into ${langName}.

RULES:
1. Output ONLY the translated text in ${langName}. Nothing else.
2. Do NOT answer questions, provide information, or have a conversation.
3. Do NOT add explanations, notes, or commentary.
4. Do NOT add "Translation:" or any labels.
5. If the text is already in ${langName}, output it as-is.
6. Preserve the original meaning and tone exactly.
7. FORBIDDEN: Do NOT use Romanized/Latin transliteration (no Pinyin, no Hinglish, etc.).
8. Output ONLY in the native script/characters of ${langName}.`;

  const fullPrompt = message.trim();

  const endpoint = '/chat';
  const apiUrl = `${SEA_LION_API_URL}${endpoint}`;

  const requestBody = { prompt: fullPrompt, system: systemPrompt };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sea Lion API Error: ${errorText.substring(0, 200)}`);
  }

  const responseText = await response.text();
  let data;
  try { data = JSON.parse(responseText); } catch (e) { data = { response: responseText }; }

  let botMessage = data.choices?.[0]?.message?.content || 
                   data.response || 
                   data.message || 
                   'Sorry, I could not generate a response.';

  // === SAFETY CLEANUP ===
  // If the model still disobeys and puts text in brackets like (Translation: ...), remove it manually.
  // This Regex removes content inside parentheses (...) if it looks like English/Translation.
  if (targetLangCode && targetLangCode !== 'en') {
      botMessage = botMessage.replace(/\([A-Za-z\s:.,-]+\)/g, "").trim(); 
      botMessage = botMessage.replace(/Translation:.*$/gi, "").trim();
  }

  return botMessage;
}

// --- MAIN HANDLER ---
export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // --- AUDIO FLOW ---
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const audioFile = formData.get('file');
      const speakLangCode = formData.get('speakLanguage');
      const replyLangCode = formData.get('replyLanguage');
      const transcribeOnly = formData.get('transcribeOnly') === 'true';

      if (!audioFile) return NextResponse.json({ error: 'No audio file' }, { status: 400 });

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // 1. Whisper (Transcribe)
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const tempFilePath = path.join(os.tmpdir(), `${uuidv4()}.wav`);
      fs.writeFileSync(tempFilePath, buffer);

      let userText = "";
      const t0 = Date.now();
      try {
        const whisperOptions = {
          file: fs.createReadStream(tempFilePath),
          model: 'whisper-1',
          temperature: 0.0,
        };
        if (speakLangCode) {
          whisperOptions.language = speakLangCode;
        }
        const transcription = await openai.audio.transcriptions.create(whisperOptions);
        userText = transcription.text;
      } finally {
        try { fs.unlinkSync(tempFilePath); } catch (e) {}
      }
      const transcribeMs = Date.now() - t0;

      if (!userText || userText.length < 2) return NextResponse.json({ success: false, error: "No voice detected" });

      // If transcribeOnly, return just the text for user review
      if (transcribeOnly) {
        return NextResponse.json({ success: true, userText, timings: { transcribe: transcribeMs } });
      }

      // 2. Sea Lion (Translate)
      const t1 = Date.now();
      const aiText = await querySeaLion(userText, [], replyLangCode);
      const translateMs = Date.now() - t1;

      // 3. TTS (Speak) — strip URLs and markdown so they aren't read aloud
      const t2 = Date.now();
      const ttsText = aiText
        .replace(/\[([^\]]+)\]\(https?:\/\/[^\)]+\)/g, '$1')
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/\*\*/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      const mp3Response = await openai.audio.speech.create({
        model: 'tts-1-hd',
        voice: 'alloy',
        input: ttsText || aiText,
      });
      const ttsMs = Date.now() - t2;

      const mp3Buffer = Buffer.from(await mp3Response.arrayBuffer());

      return NextResponse.json({
        success: true,
        userText,
        message: aiText,
        audioBase64: mp3Buffer.toString('base64'),
        timings: { transcribe: transcribeMs, translate: translateMs, tts: ttsMs, total: transcribeMs + translateMs + ttsMs }
      });
    } 
    
    // --- TEXT FLOW ---
    else {
      const { message, conversationHistory, useStreaming, language, replyLanguage, withAudio } = await request.json();
      const langCode = replyLanguage || language;

      if (useStreaming) {
         const targetLangName = LANGUAGE_MAP[langCode] || "English";
         const systemPrompt = `You are a translator. Translate the user's text into ${targetLangName}. Output ONLY the translation in native ${targetLangName} script. No explanations, no labels, no Romanization.`;

         const apiUrl = `${SEA_LION_API_URL}/stream`;
         const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: message, system: systemPrompt })
         });

         return new Response(response.body, {
            headers: {
               'Content-Type': 'text/event-stream',
               'Cache-Control': 'no-cache',
               'Connection': 'keep-alive',
            },
         });
      }

      const t1 = Date.now();
      const aiText = await querySeaLion(message, conversationHistory, langCode);
      const translateMs = Date.now() - t1;

      // If withAudio, also generate TTS
      if (withAudio) {
        const t2 = Date.now();
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const ttsText = aiText
          .replace(/\[([^\]]+)\]\(https?:\/\/[^\)]+\)/g, '$1')
          .replace(/https?:\/\/[^\s]+/g, '')
          .replace(/\*\*/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        const mp3Response = await openai.audio.speech.create({
          model: 'tts-1-hd',
          voice: 'alloy',
          input: ttsText || aiText,
        });
        const ttsMs = Date.now() - t2;
        const mp3Buffer = Buffer.from(await mp3Response.arrayBuffer());
        return NextResponse.json({
          success: true,
          message: aiText,
          audioBase64: mp3Buffer.toString('base64'),
          timings: { translate: translateMs, tts: ttsMs, total: translateMs + ttsMs }
        });
      }

      return NextResponse.json({ message: aiText });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}