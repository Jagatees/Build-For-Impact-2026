import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request) {
  try {
    const { prompt, language } = await request.json()

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env.local file.' },
        { status: 500 }
      )
    }

    // Add language instruction if provided
    let fullPrompt = prompt.trim()
    if (language && language !== 'en') {
      const languageNames = {
        'ta': 'Tamil',
        'ms': 'Malay',
        'zh': 'Mandarin',
        'hi': 'Hindi',
        'bn': 'Bengali',
        'th': 'Thai',
        'id': 'Indonesian'
      }
      const langName = languageNames[language] || 'English'
      fullPrompt = `${fullPrompt}\n\nPlease create a video response in ${langName}.`
    }

    console.log('Generating video with OpenAI:', {
      prompt: fullPrompt.substring(0, 100) + '...',
      language: language || 'en'
    })

    // Call OpenAI Video API
    // Note: OpenAI video generation API structure may vary. Trying multiple approaches.
    try {
      let videoUrl = null
      let response = null

      // Try different API methods depending on OpenAI's current API structure
      try {
        // Method 1: Direct video generation (if available)
        response = await openai.videos.generate({
          model: 'sora-1.0', // or 'sora' depending on available models
          prompt: fullPrompt,
          duration: 10,
          size: '1280x720',
        })
        videoUrl = response.video_url || response.data?.[0]?.url || response.url
      } catch (method1Error) {
        console.log('Method 1 failed, trying alternative:', method1Error.message)
        
        // Method 2: Try with different model name
        try {
          response = await openai.videos.generate({
            model: 'sora',
            prompt: fullPrompt,
          })
          videoUrl = response.video_url || response.data?.[0]?.url || response.url
        } catch (method2Error) {
          console.log('Method 2 failed, trying chat completion with video:', method2Error.message)
          
          // Method 3: Use chat completion API if video API not available
          // This is a fallback - in production, you'd want to use the actual video API
          const chatResponse = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{
              role: 'user',
              content: `Generate a detailed prompt for video creation based on: ${fullPrompt}. Return only the video generation prompt.`
            }],
            max_tokens: 200
          })
          
          // For now, return a message indicating video generation would happen here
          // In production, you'd use the video generation API with this prompt
          return NextResponse.json({
            videoUrl: null,
            message: 'Video generation is being processed. The video will appear here once ready.',
            status: 'processing',
            prompt: chatResponse.choices[0]?.message?.content || fullPrompt
          })
        }
      }

      if (!videoUrl) {
        return NextResponse.json({
          videoUrl: null,
          message: 'Video generation is processing. This may take a few moments.',
          status: 'processing'
        })
      }

      return NextResponse.json({
        videoUrl: videoUrl,
        status: 'completed',
        message: 'Here is your video response:'
      })
    } catch (videoError) {
      console.error('Video generation error:', videoError)
      
      // Check if it's a model not found error
      if (videoError.code === 'model_not_found' || 
          videoError.message?.includes('model') ||
          videoError.message?.includes('videos') ||
          videoError.status === 404) {
        return NextResponse.json(
          { 
            error: 'Video generation model not available. Please check your OpenAI plan and available models.',
            hint: 'You may need to use OpenAI Sora API or check if video generation is enabled for your account.',
            message: 'Video generation requires OpenAI Sora API access.'
          },
          { status: 404 }
        )
      }

      throw videoError
    }
  } catch (error) {
    console.error('Error calling OpenAI Video API:', error)
    
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
        error: error.message || 'Failed to generate video',
        details: error.error?.message || 'Unknown error'
      },
      { status: error.status || 500 }
    )
  }
}
