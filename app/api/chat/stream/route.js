import { NextResponse } from 'next/server'

// Custom Sea Lion AI API endpoint
const SEA_LION_API_URL = process.env.SEA_LION_API_URL || 'https://cf-sealion01.jagateesvaran.workers.dev'

export async function POST(request) {
  try {
    const { message, conversationHistory } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Build system prompt
    const systemPrompt = 'You are a helpful assistant for migrant workers in Singapore. Provide brief, direct answers to questions. Do not give long pre-written introductions unless specifically asked. Respond naturally to what the user says.'

    // Build prompt with conversation history context if available
    let fullPrompt = message.trim()
    
    // If we have conversation history, include it as context in the prompt
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      const historyText = conversationHistory
        .filter(msg => msg.role !== 'system')
        .slice(-6) // Last 6 messages for context (3 exchanges)
        .map(msg => {
          const role = msg.role === 'user' ? 'User' : 'Assistant'
          return `${role}: ${msg.content}`
        })
        .join('\n')
      
      fullPrompt = `Previous conversation:\n${historyText}\n\nCurrent question: ${message.trim()}`
    }

    // Always use the prompt format (more reliable than messages format)
    const requestBody = {
      prompt: fullPrompt,
      system: systemPrompt
    }

    // Call streaming endpoint
    const response = await fetch(`${SEA_LION_API_URL}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Sea Lion API error:', errorText)
      return NextResponse.json(
        { error: `API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    // Return the stream directly
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error calling Sea Lion AI API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}
