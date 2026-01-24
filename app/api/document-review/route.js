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

export async function POST(req) {
  try {
    /* ================================
       📥 READ & LOG REQUEST
       ================================ */
    const body = await req.json();
    console.log("📥 RAW REQUEST BODY:", body);

    const text = body?.text;
    const language = body?.language || "en"; // ✅ SAFE DEFAULT

    if (!text || !text.trim()) {
      console.error("❌ Missing text");
      return NextResponse.json(
        { error: "No text provided for review" },
        { status: 400 }
      );
    }

    const languageName = LANGUAGE_MAP[language] || "English";

    console.log("🟡 LANGUAGE CODE:", language);
    console.log("🟡 LANGUAGE NAME:", languageName);

    /* ================================
       🧠 SYSTEM PROMPT (STRICT)
       ================================ */
    const systemPrompt = `
You are a Singapore Ministry of Manpower (MOM) employment advisor.

IMPORTANT:
- Quote ONLY exact English text from document
- NEVER paraphrase quoted text

LANGUAGE RULE (STRICT):
- The following MUST be written ONLY in ${languageName}:
  • Flagged Statement (translated)
  • Why this is a concern (translated)
- English in translated sections is FORBIDDEN
- If unable, output: [TRANSLATION ERROR]

OUTPUT FORMAT (DO NOT DEVIATE):

ISSUE 1

Flagged Statement (exact quote from document):
"<exact English sentence>"

Flagged Statement (translated to ${languageName}):
"<${languageName} ONLY>"

Why this is a concern (English):
<English explanation>

Why this is a concern (translated to ${languageName}):
<${languageName} ONLY>

Who to reach out to:
<Employer / Supervisor / MOM officer / Employment agency>
`;

    const userPrompt = `
Review the following document and identify unclear, unreasonable,
or suspicious clauses.

DOCUMENT:
<<<
${text}
>>>
`;

    /* ================================
       🤖 CALL SEA-LION (STREAM SAFE)
       ================================ */
    const response = await fetch(`${SEA_LION_API_URL}/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: systemPrompt,
        prompt: userPrompt,
      }),
    });

    if (!response.ok || !response.body) {
      const err = await response.text();
      console.error("❌ Sea-Lion HTTP error:", err);
      return NextResponse.json(
        { error: "Sea-Lion request failed" },
        { status: response.status }
      );
    }

    /* ================================
       📡 CONSUME STREAM CORRECTLY
       ================================ */
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let fullText = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    console.log("\n========== RAW SEA-LION OUTPUT ==========");
    console.log(fullText);
    console.log("========== END RAW OUTPUT ==========\n");

    if (!fullText.trim()) {
      console.error("❌ EMPTY SEA-LION OUTPUT");
      return NextResponse.json(
        { error: "Empty response from model" },
        { status: 500 }
      );
    }

    /* ================================
       🔍 PARSE ISSUES
       ================================ */
    const rawIssues = fullText
      .split(/ISSUE\s+\d+/)
      .map((i) => i.trim())
      .filter(Boolean);

    const clean = (str) =>
      str?.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n\n").trim() || "";

    const issues = rawIssues.map((issueText, index) => {
      const flagged = issueText.match(
        /Flagged Statement \(exact quote from document\):\s*"([^"]+)"/s
      );
      const flaggedT = issueText.match(
        /Flagged Statement \(translated.*?\):\s*"([^"]+)"/s
      );
      const concernEn = issueText.match(
        /Why this is a concern \(English\):\s*([\s\S]*?)\nWhy this is a concern \(translated/s
      );
      const concernT = issueText.match(
        /Why this is a concern \(translated.*?\):\s*([\s\S]*?)\nWho to reach out to:/s
      );
      const action = issueText.match(
        /Who to reach out to:\s*([\s\S]*)$/s
      );

      return {
        issueNumber: index + 1,
        flaggedStatement: clean(flagged?.[1]),
        flaggedStatementTranslated: clean(flaggedT?.[1]),
        concernEnglish: clean(concernEn?.[1]),
        concernTranslated: clean(concernT?.[1]),
        action: clean(action?.[1]),
      };
    });

    /* ================================
       🚨 DEBUG + VALIDATION
       ================================ */
    console.log("========== PARSED ISSUES ==========");
    issues.forEach((i) => {
      console.log(i);
      if (language === "ta" && /[a-zA-Z]/.test(i.flaggedStatementTranslated)) {
        console.error("❌ ENGLISH FOUND IN TAMIL FIELD");
      }
    });
    console.log("========== END PARSED ==========\n");

    /* ================================
       📤 RETURN
       ================================ */
    return NextResponse.json({
      issues,
      rawOutput: fullText,
    });
  } catch (err) {
    console.error("🔥 DOCUMENT REVIEW ERROR:", err);
    return NextResponse.json(
      { error: "Internal review error" },
      { status: 500 }
    );
  }
}
