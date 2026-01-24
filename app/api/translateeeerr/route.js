import { NextResponse } from 'next/server';

const SEA_LION_API_URL = 'https://cf-sealion01.jagateesvaran.workers.dev';

export async function POST(req) {
  try {
    const { action, targetLanguage, blocks } = await req.json();

    console.log(`[API Route] Sending ${blocks.length} blocks to SEA-LION...`);

    const response = await fetch(SEA_LION_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action, 
        targetLanguage, 
        blocks 
      })
    });

    if (!response.ok) {
      throw new Error(`SEA-LION responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("[API Route Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}