import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image')
    const prompt = formData.get('prompt') || 'What do you see in this image? Describe it in detail.'

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env.local file.' },
        { status: 500 }
      )
    }

    // Convert image file to base64
    const bytes = await imageFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')
    const mimeType = imageFile.type || 'image/jpeg'
    const imageUrl = `data:${mimeType};base64,${base64Image}`

    console.log('Sending image to OpenAI Vision API:', {
      imageSize: buffer.length,
      mimeType: mimeType,
      prompt: prompt.substring(0, 50) + '...'
    })

    // Call OpenAI Vision API (GPT-4 Vision)
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // or 'gpt-4-vision-preview' depending on your OpenAI plan
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    })

    const result = response.choices[0]?.message?.content || 'No response generated.'

    console.log('OpenAI Vision response received:', result.substring(0, 100) + '...')

    return NextResponse.json({ 
      result: result,
      model: response.model,
      usage: response.usage
    })
  } catch (error) {
    console.error('Error calling OpenAI Vision API:', error)
    
    // Handle specific OpenAI errors
    if (error.status === 401) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key' },
        { status: 401 }
      )
    }
    
    if (error.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { 
        error: error.message || 'Failed to process image',
        details: error.error?.message || 'Unknown error'
      },
      { status: error.status || 500 }
    )
  }
}
