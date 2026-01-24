import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI with SEA-LION config
const openai = new OpenAI({
  apiKey: process.env.SEALION_API_KEY,
  baseURL: process.env.SEALION_BASE_URL,
})

export async function POST(request) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image')
    const language = formData.get('language') || 'English'
    const question = formData.get('question') || 'Analyze the safety hazards in this image.'

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      )
    }

    if (!process.env.SEALION_API_KEY) {
      return NextResponse.json(
        { error: 'SEA-LION API key not configured' },
        { status: 500 }
      )
    }

    // Convert image file to base64
    const bytes = await imageFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')
    const mimeType = imageFile.type || 'image/jpeg'
    const imageUrl = `data:${mimeType};base64,${base64Image}`

    // Determine the appropriate model - use vision model for image analysis
    // Note: You may need to check available models with: curl 'https://api.sea-lion.ai/v1/models' -H 'Authorization: Bearer YOUR_KEY'
    const model = 'aisingapore/sea-lion-qwen-vl-4b-instruct' // Vision model for image analysis

    // Create the prompt based on language
    const languagePrompts = {
      'Tamil': 'You are a Singaporean Safety Officer. Explain the hazard in this image in Tamil. Be clear and specific about what safety issues you see.',
      'English': 'You are a Singaporean Safety Officer. Analyze and explain the safety hazards in this image. Be clear and specific about what safety issues you see.',
      'Malay': 'You are a Singaporean Safety Officer. Explain the hazard in this image in Malay. Be clear and specific about what safety issues you see.',
      'Mandarin': 'You are a Singaporean Safety Officer. Explain the hazard in this image in Mandarin. Be clear and specific about what safety issues you see.'
    }

    const systemPrompt = languagePrompts[language] || languagePrompts['English']

    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: systemPrompt + (question !== 'Analyze the safety hazards in this image.' ? `\n\nUser question: ${question}` : '')
            },
            { 
              type: 'image_url', 
              image_url: { 
                url: imageUrl
              } 
            }
          ],
        },
      ],
      max_tokens: 500,
    })

    const result = response.choices[0]?.message?.content || 'Sorry, I could not analyze the image.'

    return NextResponse.json({ result })

  } catch (error) {
    console.error('SEA-LION Analyze Error:', error)
    
    // Handle rate limiting (429 errors)
    if (error.status === 429) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please wait 60 seconds before trying again. (10 requests per minute limit)',
          retryAfter: 60
        },
        { status: 429 }
      )
    }

    // Handle model not found errors
    if (error.status === 404 || error.message?.includes('model')) {
      return NextResponse.json(
        { 
          error: 'Vision model not found. Please verify the model name. Run: curl \'https://api.sea-lion.ai/v1/models\' -H \'Authorization: Bearer YOUR_KEY\' to see available models.',
          hint: 'You may need to use a different model name for vision capabilities.'
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: error.status || 500 }
    )
  }
}
