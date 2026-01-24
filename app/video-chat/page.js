'use client'

import { useState } from 'react'
import Link from 'next/link'

const languages = [
  { code: 'en', name: 'English' },
  { code: 'ta', name: 'Tamil' },
  { code: 'ms', name: 'Malay' },
  { code: 'zh', name: 'Mandarin' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'th', name: 'Thai' },
  { code: 'id', name: 'Indonesian' }
]

export default function VideoChat() {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! I\'m here to help you with questions about your rights as a migrant worker in Singapore, employment contracts, and finding support resources. How can I assist you today?', type: 'bot', videoUrl: null }
  ])
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
      // Call video generation API instead of text chat
      const response = await fetch('/api/video-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: userMessageText,
          language: selectedLanguage
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to generate video')
      }

      // Create bot message with video
      const botMessage = {
        id: Date.now() + 1,
        text: data.message || 'Here is your video response:',
        type: 'bot',
        videoUrl: data.videoUrl,
        status: data.status || 'completed'
      }
      setMessages(prev => [...prev, botMessage])
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
                <p>Ask questions about your rights, contracts, and support resources</p>
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
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    ) : message.type === 'bot' && message.status === 'processing' && (
                      <div className="video-processing">
                        <span className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </span>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                          Generating video... This may take a moment.
                        </p>
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
                placeholder="Type your message..."
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
