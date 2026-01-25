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
    const formData = await req.formData();
    const file = formData.get("file");
    const targetLanguage = formData.get("language");

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

    /* ---------- Extract text from PDF using pdf-parse ---------- */
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use require for server-side to avoid webpack bundling issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParseModule = require('pdf-parse');
    
    // Get the PDFParse class - it's exported as a property
    const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default;
    
    if (!PDFParse) {
      throw new Error('PDFParse class not found. Available exports: ' + Object.keys(pdfParseModule).join(', '));
    }
    
    // Instantiate PDFParse with buffer data
    const parser = new PDFParse({ data: buffer });
    
    // Extract text from PDF using the getText() method
    const result = await parser.getText();
    const extractedText = result.text;

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text could be extracted from the PDF. The PDF might be image-based or empty.' },
        { status: 400 }
      );
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
