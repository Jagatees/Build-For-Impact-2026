'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import VideoGenerator from '@/components/VideoGenerator'

const languages = [
  { code: 'en', name: 'English' },
  { code: 'ta', name: 'Tamil' },
  { code: 'ms', name: 'Malay' },
  { code: 'zh', name: 'Mandarin' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'th', name: 'Thai' },
  { code: 'id', name: 'Indonesian' },
  { code: 'tl', name: 'Tagalog' }
]

const examplePrompts = [
  'What to do if I get lost in Singapore?',
  'How to report workplace safety issues?',
  'What are my rights if my employer doesn\'t pay me?',
  'How to contact the Ministry of Manpower?',
  'What to do in a medical emergency?',
  'How to find help if I face problems at work?'
]

export default function VideoChat() {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! I can generate helpful videos for migrant workers in Singapore. Ask me to create videos about workplace safety, your rights, what to do if lost, or other important topics. Try the example prompts below!', type: 'bot', videoUrl: null }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [useStreaming, setUseStreaming] = useState(true) // Streaming on by default
  const [selectedLanguage, setSelectedLanguage] = useState('en') // Default: English
  const [videoETAs, setVideoETAs] = useState({}) // Track ETA for each message: { messageId: { remainingSeconds, intervalId } }
  const intervalsRef = useRef({}) // Track intervals for cleanup

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      // Clear all intervals when component unmounts
      Object.values(intervalsRef.current).forEach((intervalId) => {
        if (intervalId) {
          clearInterval(intervalId)
        }
      })
    }
  }, [])

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here
      console.log('Copied to clipboard')
    }).catch(err => {
      console.error('Failed to copy:', err)
    })
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessageText = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    // Add user message
    const userMessage = {
      id: Date.now(),
      text: userMessageText,
      type: 'user'
    }
    setMessages(prev => [...prev, userMessage])

    try {
      // Step 1: Get LLM response first
      console.log('🤖 Step 1: Getting LLM response for:', userMessageText.substring(0, 50))
      
      // Get selected language name
      const languageName = languages.find(lang => lang.code === selectedLanguage)?.name || 'English'
      
      // Add language instruction to the message
      const messageWithLanguage = `${userMessageText}\n\nPlease reply in ${languageName}.`

      // Build conversation history (last 10 messages for context)
      const conversationHistory = messages
        .filter(msg => msg.type === 'user' || msg.type === 'bot')
        .slice(-10) // Last 10 messages
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.text
        }))

      // Call chat API to get LLM response
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: messageWithLanguage,
          conversationHistory: conversationHistory,
          useStreaming: false
        })
      })

      let chatData
      try {
        chatData = await chatResponse.json()
      } catch (parseError) {
        const errorText = await chatResponse.text()
        throw new Error(`Chat API error (${chatResponse.status}): ${errorText.substring(0, 200)}`)
      }

      if (!chatResponse.ok) {
        throw new Error(chatData.error || chatData.details || 'Failed to get response from chat')
      }

      const llmResponse = chatData.message || userMessageText
      console.log('✅ Step 1 Complete: Got LLM response:', llmResponse.substring(0, 100))
      console.log('📏 LLM response length:', llmResponse.length, 'characters')

      // Create bot message with LLM text immediately (before video is ready)
      const botMessageId = Date.now() + 1
      const botMessage = {
        id: botMessageId,
        text: llmResponse, // Show the LLM response text immediately
        type: 'bot',
        videoUrl: null,
        status: 'processing', // Video is still processing
        videoETA: null // Will be set when we get ETA from API
      }
      setMessages(prev => [...prev, botMessage])

      // Step 2: Use LLM response to generate video with dynamic duration (in background)
      console.log('🎬 Step 2: Generating video from LLM response with dynamic duration')
      
      // Start video generation in background
      fetch('/api/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: llmResponse // LLM response IS the script that will be spoken in the video
        })
      })
      .then(async (videoResponse) => {
        console.log('📹 Video API response status:', videoResponse.status)

        let videoData
        try {
          videoData = await videoResponse.json()
        } catch (parseError) {
          const errorText = await videoResponse.text()
          throw new Error(`Video API error (${videoResponse.status}): ${errorText.substring(0, 200)}`)
        }

        if (!videoResponse.ok) {
          console.error('Video API Error:', videoData)
          // Show user-friendly message for blocked content
          if (videoData.blocked) {
            throw new Error(videoData.error || 'This content cannot be generated. Please ask about topics related to migrant workers in Singapore.')
          }
          throw new Error(videoData.error || videoData.details || 'Failed to generate video')
        }

        // Update ETA with actual estimate from API if available
        if (videoData.estimatedProcessingTime) {
          setVideoETAs(prev => {
            const current = prev[botMessageId]
            if (current) {
              // Calculate elapsed time and adjust remaining time
              const elapsedTime = current.initialETA - current.remainingSeconds
              const newRemaining = Math.max(0, videoData.estimatedProcessingTime - elapsedTime)
              return {
                ...prev,
                [botMessageId]: { 
                  remainingSeconds: newRemaining, 
                  intervalId: current.intervalId,
                  initialETA: videoData.estimatedProcessingTime
                }
              }
            }
            return prev
          })
          
          // Update message with new ETA
          setMessages(prev => prev.map(msg => 
            msg.id === botMessageId 
              ? { ...msg, videoInitialETA: videoData.estimatedProcessingTime }
              : msg
          ))
        }

        // Clear ETA countdown when video is ready
        if (intervalsRef.current[botMessageId]) {
          clearInterval(intervalsRef.current[botMessageId])
          delete intervalsRef.current[botMessageId]
        }
        setVideoETAs(prev => {
          const newETAs = { ...prev }
          delete newETAs[botMessageId]
          return newETAs
        })

        // Update message with video
        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, videoUrl: videoData.videoUrl, status: 'completed', videoETA: null }
            : msg
        ))
        
        console.log('✅ Step 2 Complete: Video generated and message updated')
      })
      .catch((error) => {
        console.error('Video generation error:', error)
        // Update message to show error
        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, status: 'error', videoETA: null, text: msg.text + '\n\n⚠️ Video generation failed: ' + (error.message || 'Unknown error') }
            : msg
        ))
        
        // Clear ETA countdown on error
        if (intervalsRef.current[botMessageId]) {
          clearInterval(intervalsRef.current[botMessageId])
          delete intervalsRef.current[botMessageId]
        }
        setVideoETAs(prev => {
          const newETAs = { ...prev }
          delete newETAs[botMessageId]
          return newETAs
        })
      })

      // Estimate ETA and start countdown (we'll update this when we get actual ETA from API)
      // Default estimate based on actual performance: 4s=100s, 8s=150s, 12s=200s
      // We'll use a conservative default and update when API responds
      const defaultETA = 150 // seconds (conservative default for 8s video)
      let remainingSeconds = defaultETA
      let initialETA = defaultETA
      
      // Start countdown timer
      const intervalId = setInterval(() => {
        remainingSeconds -= 1
        setVideoETAs(prev => ({
          ...prev,
          [botMessageId]: { remainingSeconds, intervalId, initialETA }
        }))
        
        // Update message with current ETA
        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, videoETA: remainingSeconds, videoInitialETA: initialETA }
            : msg
        ))
        
        if (remainingSeconds <= 0) {
          clearInterval(intervalId)
          delete intervalsRef.current[botMessageId]
        }
      }, 1000)
      
      intervalsRef.current[botMessageId] = intervalId
      setVideoETAs(prev => ({
        ...prev,
        [botMessageId]: { remainingSeconds, intervalId, initialETA }
      }))
    } catch (error) {
      console.error('Error:', error)
      // Show user-friendly error message
      let errorText = error.message || 'Sorry, I encountered an error. Please try again.'
      
      // If content was blocked, show helpful guidance
      if (error.message && (error.message.includes('inappropriate') || 
          error.message.includes('cannot be processed') || 
          error.message.includes('related to migrant workers'))) {
        errorText = error.message + ' Try asking about: workplace safety, your rights, getting help, or what to do in emergencies.'
      }
      
      const errorMessage = {
        id: Date.now(),
        text: errorText,
        type: 'bot'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <nav className="nav">
        <div className="nav-content">
          <h2>Build For Impact</h2>
          <ul className="nav-links">
            <li><Link href="/">Home</Link></li>
            <li><Link href="/chat">Chat</Link></li>
            <li><Link href="/document-chat">Document Chat</Link></li>
            <li><Link href="/voice-chat">Voice Chat</Link></li>
            <li><Link href="/video-chat">Video Chat</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
            <li><Link href="/company-review">Company Review</Link></li>
            <li><Link href="/reviews">View Reviews</Link></li>
          </ul>
        </div>
      </nav>

      <div className="chat-page-container">
        <div className="chat-wrapper">
          <div className="chat-header">
            <div className="chat-header-top">
              <div>
                <h1>Video Chat</h1>
                <p>Generate helpful videos for migrant workers. Ask about workplace safety, your rights, what to do if lost, or other important topics.</p>
              </div>
              <div className="language-selector">
                <label htmlFor="language-select" className="language-label">
                  Language:
                </label>
                <select
                  id="language-select"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="language-dropdown"
                  disabled={isLoading}
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="chat-messages-container">
            {messages.length === 1 && (
              <div className="example-prompts-section">
                <p className="example-prompts-title">💡 Example prompts you can try:</p>
                <div className="example-prompts-grid">
                  {examplePrompts.map((example, index) => (
                    <button
                      key={index}
                      className="example-prompt-btn"
                      onClick={() => setInputValue(example)}
                      disabled={isLoading}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="chat-messages">
              {messages.map((message) => (
                <div key={message.id} className={`message-bubble ${message.type}`}>
                  <div className="message-content">
                    {message.text && <p>{message.text}</p>}
                    {message.videoUrl ? (
                      <div className="video-container">
                        <video 
                          controls 
                          className="video-player"
                          src={message.videoUrl}
                          style={{ width: '100%', maxWidth: '500px', borderRadius: '8px' }}
                          onError={(e) => {
                            console.error('Video load error:', e)
                            console.error('Video URL:', message.videoUrl)
                          }}
                        >
                          Your browser does not support the video tag.
                        </video>
                        <a 
                          href={message.videoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ 
                            display: 'block', 
                            marginTop: '0.5rem', 
                            color: '#667eea',
                            fontSize: '0.9rem',
                            textDecoration: 'underline'
                          }}
                        >
                          Open video in new tab
                        </a>
                      </div>
                    ) : message.type === 'bot' && message.status === 'processing' && (
                      <div className="video-processing" style={{ 
                        marginTop: '1rem', 
                        padding: '1rem', 
                        background: '#f5f5f5', 
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                          </span>
                          <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: '500' }}>
                            Generating video...
                          </span>
                        </div>
                        {message.videoETA !== null && message.videoETA !== undefined && (
                          <div style={{ marginTop: '0.75rem' }}>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              marginBottom: '0.5rem'
                            }}>
                              <span style={{ fontSize: '0.85rem', color: '#666' }}>
                                Estimated time remaining:
                              </span>
                              <span style={{ 
                                fontSize: '1rem', 
                                fontWeight: '600', 
                                color: '#667eea',
                                fontFamily: 'monospace'
                              }}>
                                {message.videoETA > 0 ? `${message.videoETA}s` : 'Almost ready...'}
                              </span>
                            </div>
                            <div style={{
                              width: '100%',
                              height: '6px',
                              background: '#e0e0e0',
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${Math.max(0, Math.min(100, message.videoInitialETA ? ((message.videoInitialETA - message.videoETA) / message.videoInitialETA) * 100 : ((150 - message.videoETA) / 150) * 100))}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #667eea 0%, #764ba2)',
                                borderRadius: '3px',
                                transition: 'width 1s linear'
                              }} />
                            </div>
                          </div>
                        )}
                        {message.videoETA === null && (
                          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                            This may take 2-3 minutes...
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {message.text && (
                    <button
                      className="copy-button"
                      onClick={() => copyToClipboard(message.text)}
                      title="Copy message"
                    >
                      📋
                    </button>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="message-bubble bot">
                  <div className="message-content">
                    <span className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                      Generating video response...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSend} className="chat-input-wrapper">
            <div className="chat-input-container">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="e.g., What to do if I get lost in Singapore? How to report workplace safety issues?"
                className="chat-input-field"
                disabled={isLoading}
              />
              <button type="submit" className="send-button" disabled={isLoading || !inputValue.trim()}>
                {isLoading ? (
                  <span className="spinner"></span>
                ) : (
                  <span>➤</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
