export const runtime = "nodejs";

import { NextResponse } from "next/server";

const SEA_LION_API_URL =
  process.env.SEA_LION_API_URL ||
  "https://cf-sealion01.jagateesvaran.workers.dev";

/* ---------- Language map ---------- */
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

    /* ---------- Call PDF Extract API (NO direct integration) ---------- */
    const extractForm = new FormData();
    extractForm.append("pdf", file);

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const extractRes = await fetch(`${baseUrl}/api/pdf-extract`, {
      method: "POST",
      body: extractForm,
    });

    if (!extractRes.ok) {
      const errText = await extractRes.text();
      console.error("PDF extract error:", errText);
      throw new Error("PDF extraction failed");
    }

    const extractData = await extractRes.json();
    const extractedText = extractData.text;

    if (!extractedText || !extractedText.trim()) {
      return NextResponse.json(
        { error: "No text extracted from PDF" },
        { status: 400 }
      );
    }

    /* ---------- Translation (CHUNKED, unchanged) ---------- */
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
      originalText: extractedText,
      translatedText: finalTranslation,
    });

  } catch (err) {
    console.error("DOCUMENT CHAT ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Translation failed" },
      { status: 500 }
    );
  }
}
