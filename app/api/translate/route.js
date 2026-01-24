import { NextResponse } from 'next/server'

const SEA_LION_API_URL = process.env.SEA_LION_API_URL || 'https://cf-sealion01.jagateesvaran.workers.dev'

const LANGUAGE_MAP = {
  'en': 'English',
  'ta': 'Tamil',
  'ms': 'Malay',
  'zh': 'Mandarin Chinese',
  'hi': 'Hindi',
  'bn': 'Bengali',
  'th': 'Thai',
  'id': 'Indonesian'
}

export async function POST(request) {
  try {
    const { text, targetLanguage } = await request.json()

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    if (!targetLanguage || !LANGUAGE_MAP[targetLanguage]) {
      return NextResponse.json(
        { error: 'Valid target language is required' },
        { status: 400 }
      )
    }

    const targetLangName = LANGUAGE_MAP[targetLanguage]
    
    // Build translation prompt
    const systemPrompt = `You are a professional translator. Translate the following text to ${targetLangName}. 
    ${targetLanguage !== 'en' ? `IMPORTANT: Reply ONLY in ${targetLangName} script/characters. Do NOT include Romanized text, English translations, or any other language.` : ''}`

    const translationPrompt = `Translate the following text to ${targetLangName}. Preserve the meaning and structure:\n\n${text.substring(0, 10000)}`

    // Call Sea Lion API for translation
    const response = await fetch(`${SEA_LION_API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: translationPrompt,
        system: systemPrompt
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Sea Lion API error:', errorText)
      return NextResponse.json(
        { error: `Translation failed: ${response.status}` },
        { status: response.status }
      )
    }

    const responseText = await response.text()
    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      data = { response: responseText }
    }

    const translatedText = data.choices?.[0]?.message?.content || 
                           data.response || 
                           data.message || 
                           text // Fallback to original if translation fails

    return NextResponse.json({
      success: true,
      translatedText: translatedText.trim(),
      originalText: text,
      targetLanguage: targetLanguage,
      targetLanguageName: targetLangName
    })
  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json(
      { error: error.message || 'Translation failed' },
      { status: 500 }
    )
  }
}
