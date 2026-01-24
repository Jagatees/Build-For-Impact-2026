import { NextResponse } from 'next/server'

const SEA_LION_API_URL = 'https://cf-sealion01.jagateesvaran.workers.dev/chat'

export async function POST(request: Request) {
  try {
    const { prompt, system } = await request.json()

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Call the Sea Lion API
    const response = await fetch(SEA_LION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt.trim(),
        system: system || 'You are a helpful safety assistant for migrant workers in Singapore. Provide clear, practical safety advice.'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Sea Lion API error:', errorText)
      
      return NextResponse.json(
        { error: `API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const aiResponse = data.response || data.message || 'Sorry, I could not generate a response.'

    return NextResponse.json({ response: aiResponse })
  } catch (error) {
    console.error('Error calling Sea Lion API:', error)
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
