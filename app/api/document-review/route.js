export const runtime = "nodejs";

import { NextResponse } from "next/server";

const SEA_LION_API_URL =
  process.env.SEA_LION_API_URL ||
  "https://cf-sealion01.jagateesvaran.workers.dev";

export async function POST(req) {
  try {
    const { text } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "No text provided for review" },
        { status: 400 }
      );
    }

    /* ================================
       🧠 STRICT SYSTEM PROMPT
       ================================ */
    const systemPrompt = `
You are a Singapore Ministry of Manpower (MOM) employment advisor.

IMPORTANT CONTEXT:
- The document may contain OCR noise or foreign-language fragments.
- ONLY quote English text.
- IGNORE non-English content when quoting.

STRICT OUTPUT FORMAT (DO NOT DEVIATE):

For EACH issue, output EXACTLY this structure:

ISSUE 1

Problem (quoted exactly from document):
"<copy the exact English sentence or clause>"

Why this is a concern:
<explain clearly why this may be unclear, unreasonable, or risky>

Who to reach out to:
<Employer / Supervisor / MOM officer / Employment agency>

Rules:
- Output ONLY issues
- Use "ISSUE <number>" exactly (no colon)
- Number issues strictly in the order they appear
- Any number of issues is allowed
- Do NOT merge issues
- Do NOT paraphrase in the "Problem" section
- English only
- Calm, respectful, advisory tone
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
       🤖 CALL SEA-LION
       ================================ */
    const response = await fetch(`${SEA_LION_API_URL}/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: systemPrompt,
        prompt: userPrompt,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Sea-Lion review error:", err);
      return NextResponse.json(
        { error: "Review failed" },
        { status: response.status }
      );
    }

    const fullText = await response.text();

    /* ================================
       🔍 PARSE ISSUES (STRUCTURED)
       ================================ */
    const rawIssues = fullText
      .split(/ISSUE\s+\d+/)
      .map(i => i.trim())
      .filter(Boolean);

    const issues = rawIssues.map((issueText, index) => ({
      issueNumber: index + 1,
      raw: issueText,
    }));

    /* ================================
       📤 RETURN JSON (FRONTEND-FRIENDLY)
       ================================ */
    return NextResponse.json({
      issues,
      rawOutput: fullText,
    });

  } catch (err) {
    console.error("DOCUMENT REVIEW ERROR:", err);
    return NextResponse.json(
      { error: "Internal review error" },
      { status: 500 }
    );
  }
}
