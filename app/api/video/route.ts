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

// Calculate estimated speaking time from text
// Average speaking rate: ~150 words per minute = ~2.5 words per second
function calculateVideoDuration(text: string): number {
  const words = text.trim().split(/\s+/).length
  const speakingRate = 2.5 // words per second
  const baseDuration = Math.ceil(words / speakingRate)
  
  // Add buffer for pauses, natural breaks, and ending silence
  const bufferSeconds = 2 // 2 seconds for pauses and ending
  
  const totalDuration = baseDuration + bufferSeconds
  
  // Sora-2 supports: 4, 8, or 12 seconds
  // Choose the closest supported duration that fits the content
  if (totalDuration <= 4) {
    return 4
  } else if (totalDuration <= 8) {
    return 8
  } else {
    return 12 // For longer scripts
  }
}

export async function POST(request: Request) {
  try {
    // prompt = the LLM response text (this IS the script that will be spoken in the video)
    // We use this script length to calculate appropriate video duration
    const { prompt } = await request.json()

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Prompt (script) is required' },
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

    // The prompt IS the script (LLM response text that will be spoken in the video)
    const script = prompt.trim() // This is the actual script/text that will be spoken
    
    // Calculate video duration based on the script length (how long it takes to speak this text)
    const estimatedDuration = calculateVideoDuration(script)
    
    // Estimate processing time (in seconds) based on actual performance data
    // Real data: 12s video took ~181 seconds (180983ms)
    // Using conservative estimates with buffer for variability
    const estimatedProcessingTime = estimatedDuration <= 4 ? 100 : estimatedDuration <= 8 ? 150 : 200
    
    // Calculate timing: finish speaking before the end, with buffer for silence
    const speakingEndTime = estimatedDuration - 1 // Finish 1 second before end
    const silenceDuration = 1 // 1 second of silence at the end
    
    console.log('Video duration calculation:', {
      scriptLength: script.length,
      wordCount: script.split(/\s+/).length,
      estimatedDuration: estimatedDuration,
      speakingEndTime: speakingEndTime
    })
    
    // Create a focused prompt that guides video generation for migrant worker scenarios
    // The script (prompt) will be spoken in the video, so we need to ensure proper timing
    const enhancedPrompt = `A helpful educational video for migrant workers in Singapore. 
    The script to be spoken is: "${script}"
    The video should be clear, supportive, and show practical step-by-step guidance. 
    Focus on workplace safety, workers' rights, what to do in emergencies, or helpful information for migrant workers. 
    Include diverse types of migrant workers: construction workers, domestic workers, factory workers, service workers, 
    healthcare workers, cleaners, security guards, and other migrant workers in Singapore. 
    Professional, informative, and culturally sensitive. 
    Make it easy to understand with clear visual demonstrations that represent various migrant worker occupations.
    Critical timing instructions: The video is exactly ${estimatedDuration} seconds total. 
    Speak the entire script clearly and finish all speaking within the first ${speakingEndTime} seconds. 
    The script must be fully spoken and completed by second ${speakingEndTime}. 
    Then include ${silenceDuration} full second of natural pause or complete silence at the end (final ${silenceDuration} second, seconds ${speakingEndTime + 1}-${estimatedDuration}). 
    This ensures the final sentence is completely finished and heard before any ending. 
    The video must have a complete ending with no abrupt cuts - finish speaking the complete script by second ${speakingEndTime}, 
    show a natural conclusion, and end smoothly with silence/pause in the final ${silenceDuration} second.`

    const startTime = Date.now()
    
    console.log('Generating video with Replicate for migrant workers:', {
      scriptLength: script.length,
      wordCount: script.split(/\s+/).length,
      estimatedDuration: estimatedDuration,
      estimatedProcessingTime: estimatedProcessingTime,
      speakingEndTime: speakingEndTime,
      silenceDuration: silenceDuration,
      scriptPreview: script.substring(0, 100) + '...'
    })

    // Call Replicate Sora model
    // Sora-2 supports duration: 4, 8, or 12 seconds (integer only)
    // Duration is dynamically calculated based on script length
    const output = await replicate.run(
      "openai/sora-2",
      {
        input: {
          prompt: enhancedPrompt,
          seconds: estimatedDuration // Dynamic duration based on script length
        }
      }
    )
    
    const actualProcessingTime = Math.round((Date.now() - startTime) / 1000)

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
      estimatedProcessingTime: estimatedProcessingTime,
      actualProcessingTime: actualProcessingTime,
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
