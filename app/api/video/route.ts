import { NextResponse } from 'next/server'
import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN ,
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
    // Real data: 4s video took ~86 seconds (1m 25.9s), 12s video took ~181 seconds
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
    
    // Create an enhanced prompt that guides video creation for migrant workers
    // Combine the LLM response with helpful context about migrant worker topics
    const enhancedPrompt = `Create a helpful educational video for migrant workers in Singapore. 
The video should clearly explain and demonstrate: "${script}"

Guidelines for the video:
- Show practical, step-by-step guidance that is easy to understand
- Include diverse types of migrant workers: construction workers, domestic workers, factory workers, service workers, healthcare workers, cleaners, security guards, and other migrant workers in Singapore
- Make it professional, informative, and culturally sensitive
- Use clear visual demonstrations that represent various migrant worker occupations
- Focus on workplace safety, workers' rights, what to do in emergencies, or helpful information for migrant workers
- The video should be supportive and empowering, helping migrant workers understand their situation and know what to do

The script to be spoken in the video is: "${script}"`

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
    
    // Create prediction and poll for results (more reliable than replicate.run)
    // Use the model identifier directly - Replicate will resolve it
    const prediction = await replicate.predictions.create({
      version: "openai/sora-2", // Use version instead of model
      input: {
        prompt: enhancedPrompt,
        seconds: estimatedDuration
      }
    })
    
    console.log('Created prediction:', prediction.id)
    
    // Poll for completion
    let polledPrediction = prediction
    const maxWaitTime = 300000 // 5 minutes max
    const startPollTime = Date.now()
    
    while ((polledPrediction.status === 'starting' || polledPrediction.status === 'processing') && 
           (Date.now() - startPollTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds between polls
      polledPrediction = await replicate.predictions.get(prediction.id)
      console.log(`Polling prediction ${prediction.id}, status: ${polledPrediction.status}`)
    }
    
    if (polledPrediction.status !== 'succeeded') {
      throw new Error(`Prediction failed with status: ${polledPrediction.status}, error: ${JSON.stringify(polledPrediction.error)}`)
    }
    
    const output = polledPrediction.output
    
    const actualProcessingTime = Math.round((Date.now() - startTime) / 1000)

    console.log('Replicate output:', JSON.stringify(output, null, 2))
    console.log('Output type:', typeof output)
    console.log('Is array:', Array.isArray(output))

    // Replicate can return different formats - handle all cases
    let videoUrl: string | null = null

    if (typeof output === 'string') {
      videoUrl = output
    } else if (Array.isArray(output)) {
      // Handle array of URLs or objects
      const firstItem = output[0]
      if (typeof firstItem === 'string') {
        videoUrl = firstItem
      } else if (firstItem && typeof firstItem === 'object') {
        videoUrl = firstItem.url || firstItem.video_url || firstItem.videoUrl || null
      } else {
        videoUrl = output.find((item: any) => typeof item === 'string') || null
      }
    } else if (output && typeof output === 'object') {
      // Check common property names - also check nested structures
      // Replicate Sora-2 typically returns the URL directly as a string in the output
      // But handle object cases too
      videoUrl = (output as any).url || 
                 (output as any).video_url || 
                 (output as any).videoUrl ||
                 (output as any).output?.url ||
                 (output as any).output?.video_url ||
                 (output as any).files?.[0]?.url ||
                 // If output is an array, get first item
                 (Array.isArray(output) ? output[0] : null) ||
                 null
      
      // If still no URL and output is an object, try to find any string value that looks like a URL
      if (!videoUrl && typeof output === 'object' && !Array.isArray(output)) {
        const values = Object.values(output)
        videoUrl = values.find((v: any) => 
          typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'))
        ) as string || null
      }
    }

    if (!videoUrl || typeof videoUrl !== 'string') {
      console.error('Unexpected output format:', JSON.stringify(output, null, 2))
      console.error('Prediction details:', JSON.stringify(polledPrediction, null, 2))
      return NextResponse.json(
        { 
          error: 'No video URL returned from Replicate',
          details: `Received output type: ${typeof output}, value: ${JSON.stringify(output).substring(0, 500)}, prediction status: ${polledPrediction.status}`
        },
        { status: 500 }
      )
    }

    // Ensure URL is properly formatted (Replicate URLs should already be https://)
    if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
      videoUrl = `https://${videoUrl}`
    }

    console.log('Video generated successfully, URL:', videoUrl)

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
