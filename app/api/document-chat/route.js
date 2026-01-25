export const runtime = "nodejs";

import { NextResponse } from "next/server";

const SEA_LION_API_URL =
  process.env.SEA_LION_API_URL ||
  "https://cf-sealion01.jagateesvaran.workers.dev";

/* ---------- Language map (IMPORTANT) ---------- */
const LANGUAGE_MAP = {
  en: "English",
  zh: "Chinese (Simplified)",
  ms: "Malay",
  ta: "Tamil",
  hi: "Hindi",
  bn: "Bengali",
  th: "Thai",
  id: "Indonesian",
  vi: "Vietnamese",
};

/* ---------- Chunking helper ---------- */
function chunkText(text, chunkSize = 2500) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize));
    start += chunkSize;
  }

  return chunks;
}

export async function POST(req) {
  try {
    // Accept JSON with extracted text (extracted on client side)
    const contentType = req.headers.get("content-type");
    
    let extractedText;
    let targetLanguage;

    if (contentType?.includes("application/json")) {
      // New approach: text extracted on client side
      const body = await req.json();
      extractedText = body.text;
      targetLanguage = body.language;

      if (!extractedText || !extractedText.trim()) {
        return NextResponse.json(
          { error: "No text provided for translation" },
          { status: 400 }
        );
      }
    } else {
      // Fallback: old form data approach (for backward compatibility)
      const formData = await req.formData();
      const file = formData.get("file");
      targetLanguage = formData.get("language");

      if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }

      // Check if it's a PDF file
      if (file.type !== 'application/pdf' && !file.name?.endsWith('.pdf')) {
        return NextResponse.json(
          { error: 'File must be a PDF' },
          { status: 400 }
        )
      }

      /* ---------- Extract text from PDF using pdf-parse (fallback) ---------- */
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Load pdf-parse using require (server-side only)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      
      const data = await pdfParse(buffer);
      extractedText = data.text || '';

      if (!extractedText || extractedText.trim().length === 0) {
        return NextResponse.json(
          { error: 'No text could be extracted from the PDF. The PDF might be image-based or empty.' },
          { status: 400 }
        );
      }
    }

    /* ---------- Translation (CHUNKED) ---------- */
    const languageName =
      LANGUAGE_MAP[targetLanguage] || "English";

    const systemPrompt = `
You are a document translation assistant.
- Translate clearly and accurately
- Preserve paragraph structure
- Do NOT summarize
- Do NOT add explanations
- Output only translated text
`;

    const chunks = chunkText(extractedText);
    let finalTranslation = "";

    for (const chunk of chunks) {
      const prompt = `
Translate the following document into ${languageName}.
Preserve formatting and paragraph breaks.
Do NOT summarize.

DOCUMENT:
${chunk}
`;

      const response = await fetch(`${SEA_LION_API_URL}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          system: systemPrompt,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Sea-Lion error:", errText);
        throw new Error("Sea-Lion translation failed on a chunk");
      }

      const translatedChunk = await response.text();
      finalTranslation += translatedChunk + "\n\n";
    }

    /* ---------- Return JSON ---------- */
    return NextResponse.json({
      translatedText: finalTranslation,
      originalText: extractedText,
    });

  } catch (err) {
    console.error("DOCUMENT PROCESSING ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Translation failed" },
      { status: 500 }
    );
  }
}
