import { NextResponse } from 'next/server';

const SEA_LION_API_URL = 'https://cf-sealion01.jagateesvaran.workers.dev';

export async function POST(req) {
  try {
    const { action, targetLanguage, blocks } = await req.json();

    const response = await fetch(SEA_LION_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, targetLanguage, blocks })
    });

    // 1. Get the response as raw text first, NOT JSON
    const rawText = await response.text();
    console.log("[API Route] Raw Response from LLM:", rawText);

    // 2. Use Regex to find only the JSON object
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.error("[API Route] No JSON found in response");
      return NextResponse.json({ error: "LLM failed to return JSON" }, { status: 500 });
    }

    // 3. Parse only the valid JSON part
    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);

  } catch (error) {
    console.error("[API Route Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}