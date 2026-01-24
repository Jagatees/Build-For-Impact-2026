import { NextResponse } from 'next/server'

// Custom Sea Lion AI API endpoint
const SEA_LION_API_URL = process.env.SEA_LION_API_URL || 'https://cf-sealion01.jagateesvaran.workers.dev'

export async function POST(request) {
  try {
    const { message, conversationHistory, useStreaming } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Build system prompt
    const systemPrompt = 'You are a helpful assistant for migrant workers in Singapore. Provide brief, direct answers to questions. Do not give long pre-written introductions unless specifically asked. Respond naturally to what the user says.'

    // Use streaming endpoint if requested, otherwise use regular chat endpoint
    const endpoint = useStreaming ? '/stream' : '/chat'
    const apiUrl = `${SEA_LION_API_URL}${endpoint}`

    // Build prompt with conversation history context if available
    let fullPrompt = message.trim()
    
    // If we have conversation history, include it as context in the prompt
    if (conversationHistory && conversationHistory.length > 0) {
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

    console.log('Sending to Sea Lion AI:', { 
      url: apiUrl,
      format: 'prompt',
      hasHistory: conversationHistory && conversationHistory.length > 0,
      userMessage: message.trim().substring(0, 50) + '...',
      useStreaming: useStreaming || false
    })

    // Call custom Sea Lion AI API
    let response
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
    } catch (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json(
        { error: `Failed to connect to API: ${fetchError.message}` },
        { status: 500 }
      )
    }

    if (!response.ok) {
      let errorText
      try {
        errorText = await response.text()
      } catch (e) {
        errorText = 'Unable to read error response'
      }
      
      console.error('Sea Lion API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      
      if (response.status === 429) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded. Please wait a moment before trying again.',
            retryAfter: 60
          },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { 
          error: `API error: ${response.status} ${response.statusText}`,
          details: errorText.substring(0, 200) // Include first 200 chars of error for debugging
        },
        { status: response.status }
      )
    }

    // Handle streaming response
    if (useStreaming && response.body) {
      // For streaming, we'll return the stream
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Handle non-streaming response
    // Read as text first so we can inspect it
    const responseText = await response.text()
    console.log('Raw API response text (first 1000 chars):', responseText.substring(0, 1000))
    
    let data
    try {
      data = JSON.parse(responseText)
      console.log('Parsed JSON response:', JSON.stringify(data, null, 2))
    } catch (parseError) {
      // If it's not JSON, treat the whole response as the message
      console.log('Response is not JSON, treating as plain text')
      data = { response: responseText }
    }

    // Extract message from OpenAI-compatible format
    // The API returns: { choices: [{ message: { content: "..." } }] }
    let botMessage = 'Sorry, I could not generate a response.'
    
    if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      // OpenAI-compatible format
      botMessage = data.choices[0].message?.content || 
                   data.choices[0].content ||
                   botMessage
    } else if (data.response) {
      // Simple response format
      botMessage = data.response
    } else if (data.message) {
      // Alternative message format
      botMessage = data.message
    } else if (data.content) {
      // Direct content format
      botMessage = data.content
    } else if (typeof data === 'string') {
      // Plain text response
      botMessage = data
    }

    console.log('Extracted message:', {
      responseKeys: data && typeof data === 'object' ? Object.keys(data) : 'N/A',
      hasChoices: !!(data && data.choices && Array.isArray(data.choices)),
      hasResponse: !!(data && data.response),
      hasMessage: !!(data && data.message),
      extractionMethod: data.choices ? 'choices[0].message.content' : 
                        data.response ? 'response' :
                        data.message ? 'message' : 'fallback',
      messageLength: botMessage.length,
      preview: botMessage.substring(0, 100) + '...'
    })

    return NextResponse.json({ message: botMessage })
  } catch (error) {
    console.error('Error calling Sea Lion AI API:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        type: error.name || 'UnknownError'
      },
      { status: error.status || 500 }
    )
  }
}
