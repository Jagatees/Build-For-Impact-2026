import { NextResponse } from 'next/server'
import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

// Content safety filter - blocks inappropriate, dangerous, or abusive content
function validatePromptSafety(prompt: string): { safe: boolean; reason?: string } {
  const promptLower = prompt.toLowerCase()
  
  // Blocked keywords for dangerous, harmful, or inappropriate content
  const blockedKeywords = [
    // Violence and harm
    'violence', 'attack', 'hurt', 'kill', 'weapon', 'gun', 'knife', 'bomb', 'explosive',
    'fight', 'assault', 'murder', 'suicide', 'self-harm',
    
    // Illegal activities
    'illegal', 'drug', 'steal', 'rob', 'fraud', 'scam', 'hack', 'pirate',
    
    // Inappropriate content
    'porn', 'sexual', 'nude', 'explicit', 'adult content',
    
    // Hate speech and discrimination
    'hate', 'racist', 'discriminate', 'slur',
    
    // Dangerous instructions
    'how to harm', 'how to hurt', 'how to attack', 'how to destroy',
    
    // Abuse of system
    'bypass', 'hack system', 'exploit', 'spam'
  ]
  
  // Check for blocked keywords
  for (const keyword of blockedKeywords) {
    if (promptLower.includes(keyword)) {
      return {
        safe: false,
        reason: `Content contains inappropriate material. Please ask about workplace safety, your rights, or getting help instead.`
      }
    }
  }
  
  // Ensure prompt is related to migrant worker topics
  const allowedTopics = [
    'lost', 'workplace', 'safety', 'rights', 'employer', 'salary', 'contract',
    'help', 'emergency', 'medical', 'ministry', 'manpower', 'singapore',
    'worker', 'migrant', 'problem', 'issue', 'report', 'contact', 'find',
    'do', 'how', 'what', 'where', 'when', 'guide', 'information', 'support',
    'assistance', 'legal', 'housing', 'healthcare', 'travel', 'transport',
    'document', 'passport', 'visa', 'permit', 'work', 'job', 'employment',
    'construction', 'domestic', 'factory', 'service', 'cleaner', 'security',
    'maid', 'helper', 'nurse', 'caregiver', 'restaurant', 'hotel', 'retail'
  ]
  
  const hasRelevantTopic = allowedTopics.some(topic => promptLower.includes(topic))
  
  if (!hasRelevantTopic && prompt.length > 20) {
    // If prompt is long but doesn't contain relevant topics, warn
    return {
      safe: false,
      reason: `Please ask about topics related to migrant workers in Singapore, such as workplace safety, your rights, getting help, or what to do in emergencies.`
    }
  }
  
  return { safe: true }
}

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json()

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Validate prompt safety
    const safetyCheck = validatePromptSafety(prompt.trim())
    if (!safetyCheck.safe) {
      console.warn('Blocked unsafe prompt:', prompt.substring(0, 100))
      return NextResponse.json(
        { 
          error: safetyCheck.reason || 'This prompt cannot be processed. Please ask about topics related to migrant workers in Singapore.',
          blocked: true
        },
        { status: 400 }
      )
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Replicate API token not configured. Please set REPLICATE_API_TOKEN in your .env.local file.' },
        { status: 500 }
      )
    }

    // Enhance prompt to be migrant worker focused
    const basePrompt = prompt.trim()
    
    // Create a focused prompt that guides video generation for migrant worker scenarios
    // This ensures videos are helpful, educational, and relevant to all types of migrant workers
    const enhancedPrompt = `A helpful educational video for migrant workers in Singapore: ${basePrompt}. 
    The video should be clear, supportive, and show practical step-by-step guidance. 
    Focus on workplace safety, workers' rights, what to do in emergencies, or helpful information for migrant workers. 
    Include diverse types of migrant workers: construction workers, domestic workers, factory workers, service workers, 
    healthcare workers, cleaners, security guards, and other migrant workers in Singapore. 
    Professional, informative, and culturally sensitive. 
    Make it easy to understand with clear visual demonstrations that represent various migrant worker occupations.
    Important: The video must have a complete ending. Let the person finish speaking completely, 
    show a natural conclusion, and end smoothly without abrupt cuts. The video should feel complete and finished.`

    console.log('Generating video with Replicate for migrant workers:', {
      originalPrompt: basePrompt.substring(0, 100) + '...',
      enhancedPrompt: enhancedPrompt.substring(0, 150) + '...'
    })

    // Call Replicate Sora model
    const output = await replicate.run(
      "openai/sora-2",
      {
        input: {
          prompt: enhancedPrompt
        }
      }
    )

    console.log('Replicate output:', output)
    console.log('Output type:', typeof output)
    console.log('Is array:', Array.isArray(output))

    // Replicate can return different formats - handle all cases
    let videoUrl: string | null = null

    if (typeof output === 'string') {
      videoUrl = output
    } else if (Array.isArray(output)) {
      videoUrl = output[0] || output.find((item: any) => typeof item === 'string') || null
    } else if (output && typeof output === 'object') {
      // Check common property names
      videoUrl = (output as any).url || (output as any).video_url || (output as any).videoUrl || null
    }

    if (!videoUrl || typeof videoUrl !== 'string') {
      console.error('Unexpected output format:', JSON.stringify(output, null, 2))
      return NextResponse.json(
        { 
          error: 'No video URL returned from Replicate',
          details: `Received output type: ${typeof output}, value: ${JSON.stringify(output).substring(0, 200)}`
        },
        { status: 500 }
      )
    }

    console.log('Video generated successfully:', videoUrl)

    return NextResponse.json({
      videoUrl: videoUrl,
      status: 'completed',
      message: 'Here is your video response:'
    })
  } catch (error: any) {
    console.error('Error calling Replicate API:', error)
    
    if (error.status === 401) {
      return NextResponse.json(
        { error: 'Invalid Replicate API token' },
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
