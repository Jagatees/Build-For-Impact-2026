import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
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
  'id': 'Indonesian'
};

async function querySeaLion(message, conversationHistory = [], targetLangCode = null) {
  if (!message || !message.trim()) throw new Error('Message is required');

  // 1. DETERMINE TARGET LANGUAGE STRATEGY
  let langInstruction = "";
  
  if (targetLangCode && LANGUAGE_MAP[targetLangCode]) {
     const langName = LANGUAGE_MAP[targetLangCode];
     
     // === THE FIX: STRICT "NO ENGLISH/ROMANIZATION" RULE ===
     if (targetLangCode !== 'en') {
        langInstruction = `\n[CRITICAL INSTRUCTION:
        1. The user has selected ${langName}.
        2. Reply ONLY in ${langName} script/characters.
        3. FORBIDDEN: Do NOT provide the Romanized/Latin transliteration (e.g. No Pinyin, No Hinglish).
        4. FORBIDDEN: Do NOT provide the English translation in brackets.
        5. FORBIDDEN: Do NOT use any English words.
        6. OUTPUT: Just the pure ${langName} response.]`;
     } else {
        langInstruction = `\n[SYSTEM INSTRUCTION: Reply in English.]`;
     }
  } else {
     // Default: Mirror
     langInstruction = `\n[SYSTEM INSTRUCTION: Detect the user's language and reply in that EXACT SAME language. Do not mix languages.]`;
  }

  const systemPrompt = `You are a helpful assistant for migrant workers in Singapore.
  Your goal is to be direct, accurate, and helpful.
  ${langInstruction}`;
  
  const endpoint = '/chat'; 
  const apiUrl = `${SEA_LION_API_URL}${endpoint}`;

  let fullPrompt = message.trim();
  if (conversationHistory && conversationHistory.length > 0) {
    const historyText = conversationHistory
      .filter(msg => msg.role !== 'system')
      .slice(-6)
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
    fullPrompt = `Previous conversation:\n${historyText}\n\nCurrent question: ${message.trim()}`;
  }

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
      const langCode = formData.get('language'); 

      if (!audioFile) return NextResponse.json({ error: 'No audio file' }, { status: 400 });

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // 1. Whisper (Transcribe)
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const tempFilePath = path.join('/tmp', `${uuidv4()}.wav`);
      fs.writeFileSync(tempFilePath, buffer);
      
      let userText = "";
      try {
        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(tempFilePath),
          model: 'whisper-1',
          temperature: 0.0, 
        });
        userText = transcription.text;
      } finally {
        try { fs.unlinkSync(tempFilePath); } catch (e) {} 
      }

      if (!userText || userText.length < 2) return NextResponse.json({ success: false, error: "No voice detected" });

      // 2. Sea Lion (Think with Forced Language)
      const aiText = await querySeaLion(userText, [], langCode);

      // 3. TTS (Speak)
      const mp3Response = await openai.audio.speech.create({
        model: 'tts-1-hd',
        voice: 'alloy', 
        input: aiText,
      });

      const mp3Buffer = Buffer.from(await mp3Response.arrayBuffer());
      
      return NextResponse.json({
        success: true,
        userText,
        message: aiText,
        audioBase64: mp3Buffer.toString('base64')
      });
    } 
    
    // --- TEXT FLOW ---
    else {
      const { message, conversationHistory, useStreaming, language } = await request.json();
      
      if (useStreaming) {
         // Force system prompt for streaming too
         const targetLangName = LANGUAGE_MAP[language] || "English";
         const systemPrompt = `You are a helpful assistant. You MUST reply in ${targetLangName} script ONLY. Do NOT include Romanized text or English translations.`;
         
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

      const result = await querySeaLion(message, conversationHistory, language);
      return NextResponse.json({ message: result });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}