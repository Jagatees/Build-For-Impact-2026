export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { exec } from "child_process";
import util from "util";
import tesseract from "node-tesseract-ocr";

const execAsync = util.promisify(exec);

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
  let tempDir;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const targetLanguage = formData.get("language");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    /* ---------- Setup temp workspace ---------- */
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "doc-ocr-"));
    const pdfPath = path.join(tempDir, file.name);

    await fs.writeFile(pdfPath, Buffer.from(await file.arrayBuffer()));

    /* ---------- PDF → PNG ---------- */
    const outputPrefix = path.join(tempDir, "page");
    await execAsync(`pdftoppm -png "${pdfPath}" "${outputPrefix}"`);

    /* ---------- OCR ---------- */
    const files = await fs.readdir(tempDir);
    const imageFiles = files
      .filter(f => f.startsWith("page-") && f.endsWith(".png"))
      .sort((a, b) => {
        const na = parseInt(a.match(/page-(\d+)/)?.[1] || 0, 10);
        const nb = parseInt(b.match(/page-(\d+)/)?.[1] || 0, 10);
        return na - nb;
      });

    if (imageFiles.length === 0) {
      throw new Error("PDF conversion produced no images");
    }

    let extractedText = "";

    for (const img of imageFiles) {
      const imgPath = path.join(tempDir, img);
      const pageText = await tesseract.recognize(imgPath, {
        lang: "eng+tam+hin+ben+msa+chi_sim",
        oem: 1,
        psm: 3,
      });
      extractedText += pageText + "\n\n";
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "No text detected in document" },
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
    });

  } catch (err) {
    console.error("DOCUMENT OCR PIPELINE ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Translation failed" },
      { status: 500 }
    );
  } finally {
    /* ---------- Cleanup ---------- */
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}
    }
  }
}
