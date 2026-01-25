'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import VideoGenerator from '@/components/VideoGenerator'
import Navigation from '@/components/Navigation'

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
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [useStreaming, setUseStreaming] = useState(true) // Streaming on by default
  const [selectedLanguage, setSelectedLanguage] = useState('en') // Default: English
  const [videoETAs, setVideoETAs] = useState({}) // Track ETA for each message: { messageId: { remainingSeconds, intervalId } }
  const intervalsRef = useRef({}) // Track intervals for cleanup
  const [currentVideo, setCurrentVideo] = useState(null) // Track the current video to display in main player
  const [isResponseExpanded, setIsResponseExpanded] = useState(true) // Track if chat response is expanded

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

  // Format text with markdown-style formatting
  const formatText = (text) => {
    if (!text) return ''
    
    // Split by lines to handle lists and paragraphs
    const lines = text.split('\n')
    
    return lines.map((line, lineIndex) => {
      const trimmedLine = line.trim()
      
      // Check if it's a numbered list (starts with number and period)
      if (/^\d+\.\s/.test(trimmedLine)) {
        const numberMatch = trimmedLine.match(/^(\d+)\.\s/)
        const number = numberMatch ? numberMatch[1] : ''
        const content = trimmedLine.replace(/^\d+\.\s/, '')
        return (
          <div key={lineIndex} style={{ marginBottom: '0.75rem', paddingLeft: '1.5rem', display: 'flex' }}>
            <span style={{ fontWeight: 'bold', marginRight: '0.5rem', minWidth: '1.5rem' }}>
              {number}.
            </span>
            <span style={{ flex: 1 }}>
              {formatInlineText(content)}
            </span>
          </div>
        )
      }
      
      // Check if it's a bullet point (starts with * or -)
      if (/^[\*\-]\s/.test(trimmedLine)) {
        const content = trimmedLine.replace(/^[\*\-]\s/, '')
        return (
          <div key={lineIndex} style={{ marginBottom: '0.75rem', paddingLeft: '1.5rem', display: 'flex' }}>
            <span style={{ marginRight: '0.5rem', minWidth: '1rem' }}>•</span>
            <span style={{ flex: 1 }}>
              {formatInlineText(content)}
            </span>
          </div>
        )
      }
      
      // Regular paragraph
      if (trimmedLine) {
        return (
          <div key={lineIndex} style={{ marginBottom: '0.75rem' }}>
            {formatInlineText(trimmedLine)}
          </div>
        )
      }
      
      // Empty line
      return <div key={lineIndex} style={{ marginBottom: '0.5rem' }}></div>
    })
  }

  // Format inline text with bold and italic
  const formatInlineText = (text) => {
    if (!text) return ''
    
    const parts = []
    let key = 0
    let i = 0
    
    while (i < text.length) {
      // Check for **bold** first (has priority)
      if (i < text.length - 1 && text[i] === '*' && text[i + 1] === '*') {
        const endIndex = text.indexOf('**', i + 2)
        if (endIndex !== -1) {
          // Add text before bold
          if (i > 0) {
            parts.push(<span key={key++}>{text.substring(0, i)}</span>)
          }
          // Add bold text
          const boldText = text.substring(i + 2, endIndex)
          parts.push(
            <strong key={key++} style={{ fontWeight: '700', color: '#1E293B' }}>
              {boldText}
            </strong>
          )
          // Continue after the closing **
          text = text.substring(endIndex + 2)
          i = 0
          continue
        }
      }
      
      // Check for *italic* (but not **)
      if (text[i] === '*' && (i === text.length - 1 || text[i + 1] !== '*')) {
        const endIndex = text.indexOf('*', i + 1)
        // Make sure it's not part of **
        if (endIndex !== -1 && (endIndex === text.length - 1 || text[endIndex + 1] !== '*')) {
          // Add text before italic
          if (i > 0) {
            parts.push(<span key={key++}>{text.substring(0, i)}</span>)
          }
          // Add italic text
          const italicText = text.substring(i + 1, endIndex)
          parts.push(
            <em key={key++} style={{ fontStyle: 'italic', color: '#475569' }}>
              {italicText}
            </em>
          )
          // Continue after the closing *
          text = text.substring(endIndex + 1)
          i = 0
          continue
        }
      }
      
      i++
    }
    
    // Add any remaining text
    if (text.length > 0) {
      parts.push(<span key={key++}>{text}</span>)
    }
    
    return parts.length > 0 ? parts : <span>{text}</span>
  }

  const handleSuggestionClick = (prompt) => {
    // Just fill the input field, don't send yet
    setInputValue(prompt)
  }

  const handleSend = async (e) => {
    e?.preventDefault()
    const messageToSend = inputValue.trim()
    if (!messageToSend || isLoading) return

    const userMessageText = messageToSend
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
          prompt: llmResponse // Send only LLM response to video generation, no extra prompts
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
        
        // Set this as the current video to display in main player
        setCurrentVideo({
          id: botMessageId,
          videoUrl: videoData.videoUrl,
          text: llmResponse
        })
        
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
    <div className="modern-video-chat-page">
      {/* Header */}
      <Navigation />

      {/* Main Content */}
      <div className="video-chat-container">
        {/* Large Video Player Area - Always visible */}
        <div className="main-video-section">
          <h2 className="video-header-text">Watch a Visual Guide - Sometimes Seeing is Better Than Reading</h2>
          <div className="main-video-wrapper">
            {currentVideo ? (
              <div className="main-video-player">
                <video 
                  controls 
                  className="large-video"
                  src={currentVideo.videoUrl}
                  autoPlay
                  onError={(e) => {
                    console.error('Video playback error:', e)
                    console.error('Video URL:', currentVideo.videoUrl)
                    alert('Video failed to load. Please check the console for details.')
                  }}
                  onLoadStart={() => console.log('Video loading started:', currentVideo.videoUrl)}
                  onCanPlay={() => console.log('Video can play:', currentVideo.videoUrl)}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              <div className="main-video-placeholder">
                {(isLoading || messages.some(msg => msg.type === 'bot' && msg.status === 'processing')) ? (
                  <div className="video-loading-overlay">
                    <div className="loading-content">
                      <div className="loading-spinner-large">
                        <div className="spinner-ring"></div>
                      </div>
                      <p className="loading-text">Generating video...</p>
                      {(() => {
                        const processingMessage = messages.find(msg => msg.type === 'bot' && msg.status === 'processing')
                        if (processingMessage && processingMessage.videoETA !== null && processingMessage.videoETA !== undefined) {
                          return (
                            <p className="loading-eta">
                              Estimated time: {processingMessage.videoETA > 0 ? `${processingMessage.videoETA}s` : 'Almost ready...'}
                            </p>
                          )
                        }
                        return null
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="play-button-large">
                    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="40" cy="40" r="40" fill="#FFA500"/>
                      <path d="M32 24L32 56L56 40L32 24Z" fill="white"/>
                    </svg>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chatbot Responses Below Video - Collapsible */}
        {messages.some(msg => msg.type === 'bot' && msg.text && !msg.videoUrl) && (
          <div className="chat-responses-section">
            <button 
              className="response-toggle-button"
              onClick={() => setIsResponseExpanded(!isResponseExpanded)}
            >
              <span>Chat Response</span>
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 20 20" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className={isResponseExpanded ? 'expanded' : ''}
              >
                <path d="M5 7.5L10 12.5L15 7.5" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {isResponseExpanded && (
              <div className="bot-responses-container">
                {messages.map((message) => {
                  // Only show bot text responses (not videos, those go in main player)
                  if (message.type === 'bot' && message.text && !message.videoUrl) {
                    return (
                      <div key={message.id} className="bot-response-text">
                        {formatText(message.text)}
                      </div>
                    )
                  }
                  return null
                })}
              </div>
            )}
          </div>
        )}

        {/* Suggestion Prompts - Show when no messages or when video is ready */}
        {messages.length === 0 && !isLoading && (
          <div className="suggestion-prompts-section">
            <div className="suggestion-prompts-grid">
              {examplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  className="suggestion-prompt-card"
                  onClick={() => handleSuggestionClick(prompt)}
                  disabled={isLoading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Section */}
        <div className="video-input-section">
          <form onSubmit={handleSend} className="video-input-form">
            <div className="video-input-container">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your next question here..."
                className="video-input-field"
                disabled={isLoading}
              />
              <div className="language-selector-inline">
                <select
                  id="language-select-video"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="language-dropdown-inline"
                  disabled={isLoading}
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              <button 
                type="submit" 
                className="video-send-button" 
                disabled={isLoading || !inputValue.trim()}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 10l16-8-8 16-2-6-6-2z" fill="white"/>
                </svg>
                <span>Send</span>
              </button>
            </div>
            <p className="help-text">I'm here to help with anything else!</p>
          </form>
        </div>
      </div>
    </div>
  )
}
