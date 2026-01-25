'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [useStreaming, setUseStreaming] = useState(true) // Streaming on by default
  const [selectedLanguage, setSelectedLanguage] = useState('en') // Default: English

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

      // Always use streaming
      if (true) {
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: messageWithLanguage,
            conversationHistory: conversationHistory
          })
        })

        if (!response.ok) {
          let errorData
          try {
            errorData = await response.json()
          } catch (parseError) {
            const errorText = await response.text()
            throw new Error(`Server error (${response.status}): ${errorText.substring(0, 200)}`)
          }
          const errorMsg = errorData.error || errorData.details || 'Failed to get response'
          throw new Error(errorMsg)
        }

        // Create a placeholder bot message that we'll update as chunks arrive
        const botMessageId = Date.now() + 1
        const botMessage = {
          id: botMessageId,
          text: '',
          type: 'bot'
        }
        setMessages(prev => [...prev, botMessage])

        // Read the stream
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          fullText += chunk
          
          // Update the message with accumulated text in real-time
          setMessages(prev => prev.map(msg => 
            msg.id === botMessageId 
              ? { ...msg, text: fullText }
              : msg
          ))
        }
      } else {
        // Non-streaming response
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: userMessageText,
            conversationHistory: conversationHistory,
            useStreaming: false
          })
        })

        let data
        try {
          data = await response.json()
        } catch (parseError) {
          const errorText = await response.text()
          throw new Error(`Server error (${response.status}): ${errorText.substring(0, 200)}`)
        }

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error(`Rate limit exceeded. Please wait ${data.retryAfter || 60} seconds before trying again.`)
          }
          const errorMsg = data.error || data.details || 'Failed to get response'
          throw new Error(errorMsg)
        }

        // Add bot response
        const botMessage = {
          id: messages.length + 2,
          text: data.message,
          type: 'bot'
        }
        setMessages(prev => [...prev, botMessage])
      }
    } catch (error) {
      console.error('Error:', error)
      // Add error message
      const errorMessage = {
        id: Date.now(),
        text: error.message || 'Sorry, I encountered an error. Please try again or check your API configuration.',
        type: 'bot'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modern-chat-page">
      {/* Header */}
      <Navigation />

      {/* Main Content */}
      <div className="modern-chat-container">
        {messages.length === 0 ? (
          <div className="modern-chat-welcome">
            <h1 className="welcome-heading">How can I help you today?</h1>
            
            <form onSubmit={handleSend} className="modern-chat-form">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message here..."
                className="modern-input-field"
                disabled={isLoading}
              />
              
              <div className="send-button-container">
                <div className="language-selector-inline">
                  <select
                    id="language-select-inline"
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
                  className="modern-send-button" 
                  disabled={isLoading || !inputValue.trim()}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 10l16-8-8 16-2-6-6-2z" fill="white"/>
                  </svg>
                  <span>Send Message</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="modern-chat-wrapper">
            <div className="modern-chat-messages">
              {messages.map((message) => (
                <div key={message.id} className={`modern-message ${message.type}`}>
                  {message.type === 'bot' && (
                    <div className="bot-avatar">
                      <Image 
                        src="/logo.jpg" 
                        alt="AbangSG Logo" 
                        width={32} 
                        height={32} 
                        className="bot-avatar-img"
                        onError={(e) => {
                          if (e.target.nextElementSibling) {
                            e.target.style.display = 'none'
                            e.target.nextElementSibling.style.display = 'flex'
                          }
                        }}
                      />
                      <div className="bot-avatar-fallback" style={{ display: 'none' }}>
                        🤝
                      </div>
                    </div>
                  )}
                  <div className="modern-message-content">
                    {message.text}
                  </div>
                  <button
                    className="modern-copy-button"
                    onClick={() => copyToClipboard(message.text)}
                    title="Copy message"
                  >
                    📋
                  </button>
                </div>
              ))}
              {isLoading && (
                <div className="modern-message bot">
                  <div className="bot-avatar">
                    <Image 
                      src="/logo.jpg" 
                      alt="AbangSG Logo" 
                      width={32} 
                      height={32} 
                      className="bot-avatar-img"
                      onError={(e) => {
                        if (e.target.nextElementSibling) {
                          e.target.style.display = 'none'
                          e.target.nextElementSibling.style.display = 'flex'
                        }
                      }}
                    />
                    <div className="bot-avatar-fallback" style={{ display: 'none' }}>
                      🤝
                    </div>
                  </div>
                  <div className="modern-message-content">
                    <span className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="modern-chat-input-wrapper">
              <div className="modern-input-container">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your message here..."
                  className="modern-input-field"
                  disabled={isLoading}
                />
                <div className="language-selector-inline">
                  <select
                    id="language-select-inline-chat"
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
                  className="modern-send-button-inline" 
                  disabled={isLoading || !inputValue.trim()}
                >
                  {isLoading ? (
                    <span className="spinner"></span>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 10l16-8-8 16-2-6-6-2z" fill="white"/>
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
