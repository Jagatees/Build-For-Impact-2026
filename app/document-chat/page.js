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

export default function DocumentChat() {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! Upload a PDF document and I can help you understand it. Ask me questions about the document content, and I\'ll analyze it for you.', type: 'bot' }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [useStreaming, setUseStreaming] = useState(true) // Streaming on by default
  const [selectedLanguage, setSelectedLanguage] = useState('en') // Default: English
  const [pdfText, setPdfText] = useState(null) // Store extracted PDF text (original)
  const [pdfTranslatedText, setPdfTranslatedText] = useState(null) // Store translated PDF text
  const [pdfInfo, setPdfInfo] = useState(null) // Store PDF metadata
  const [isUploading, setIsUploading] = useState(false) // Track PDF upload status
  const [isTranslating, setIsTranslating] = useState(false) // Track translation status

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here
      console.log('Copied to clipboard')
    }).catch(err => {
      console.error('Failed to copy:', err)
    })
  }

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert('Please upload a PDF file')
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append('pdf', file)

    try {
      const response = await fetch('/api/pdf-extract', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract text from PDF')
      }

      setPdfText(data.text)
      setPdfInfo(data.info)
      
      // Translate the PDF text based on selected language
      if (data.text && selectedLanguage) {
        setIsTranslating(true)
        try {
          const translateResponse = await fetch('/api/translate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: data.text,
              targetLanguage: selectedLanguage
            })
          })

          const translateData = await translateResponse.json()
          
          if (translateResponse.ok && translateData.success) {
            setPdfTranslatedText(translateData.translatedText)
            
            // Add a message indicating PDF was uploaded and translated
            const languageName = languages.find(lang => lang.code === selectedLanguage)?.name || 'English'
            const uploadMessage = {
              id: Date.now(),
              text: `📄 PDF uploaded: ${data.info.title || file.name} (${data.pages} pages)\n\n✅ Document translated to ${languageName}!\n\nI've analyzed your document. You can now ask me questions about it!`,
              type: 'bot'
            }
            setMessages(prev => [...prev, uploadMessage])
          } else {
            // If translation fails, still show uploaded message
            setPdfTranslatedText(null)
            const uploadMessage = {
              id: Date.now(),
              text: `📄 PDF uploaded: ${data.info.title || file.name} (${data.pages} pages)\n\nI've analyzed your document. You can now ask me questions about it!`,
              type: 'bot'
            }
            setMessages(prev => [...prev, uploadMessage])
          }
        } catch (translateError) {
          console.error('Translation error:', translateError)
          // Continue even if translation fails
          setPdfTranslatedText(null)
          const uploadMessage = {
            id: Date.now(),
            text: `📄 PDF uploaded: ${data.info.title || file.name} (${data.pages} pages)\n\nI've analyzed your document. You can now ask me questions about it!`,
            type: 'bot'
          }
          setMessages(prev => [...prev, uploadMessage])
        } finally {
          setIsTranslating(false)
        }
      } else {
        // No translation needed or no text
        const uploadMessage = {
          id: Date.now(),
          text: `📄 PDF uploaded: ${data.info.title || file.name} (${data.pages} pages)\n\nI've analyzed your document. You can now ask me questions about it!`,
          type: 'bot'
        }
        setMessages(prev => [...prev, uploadMessage])
      }
    } catch (error) {
      console.error('Error uploading PDF:', error)
      alert(error.message || 'Failed to process PDF. Please try again.')
    } finally {
      setIsUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const clearPdf = () => {
    setPdfText(null)
    setPdfTranslatedText(null)
    setPdfInfo(null)
    const clearMessage = {
      id: Date.now(),
      text: 'PDF document cleared. You can upload a new document.',
      type: 'bot'
    }
    setMessages(prev => [...prev, clearMessage])
  }

  // Re-translate PDF when language changes
  const handleLanguageChange = async (newLanguage) => {
    setSelectedLanguage(newLanguage)
    
    // If PDF is loaded, re-translate it
    if (pdfText && newLanguage) {
      setIsTranslating(true)
      try {
        const translateResponse = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: pdfText,
            targetLanguage: newLanguage
          })
        })

        const translateData = await translateResponse.json()
        
        if (translateResponse.ok && translateData.success) {
          setPdfTranslatedText(translateData.translatedText)
        } else {
          setPdfTranslatedText(null)
        }
      } catch (translateError) {
        console.error('Translation error:', translateError)
        setPdfTranslatedText(null)
      } finally {
        setIsTranslating(false)
      }
    } else {
      setPdfTranslatedText(null)
    }
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
      
      // Build the message with PDF context if available
      // Use translated text if available, otherwise use original
      let messageWithContext = userMessageText
      
      if (pdfText) {
        // Use translated PDF text if available and language is not English
        const pdfContentToUse = (pdfTranslatedText && selectedLanguage !== 'en') 
          ? pdfTranslatedText 
          : pdfText
        
        // Include PDF text in the context
        const pdfContext = `\n\n--- Document Content ---\n${pdfContentToUse.substring(0, 8000)}\n--- End Document ---\n\n`
        messageWithContext = `Document context:${pdfContext}User question: ${userMessageText}\n\nPlease answer based on the document content above. If the document doesn't contain relevant information, say so.`
      }
      
      // Add language instruction to the message
      const messageWithLanguage = `${messageWithContext}\n\nPlease reply in ${languageName}.`

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
                <h1>Document Chat</h1>
                <p>Upload a PDF and ask questions about it</p>
              </div>
              <div className="language-selector">
                <label htmlFor="language-select" className="language-label">
                  Language:
                </label>
                <select
                  id="language-select"
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="language-dropdown"
                  disabled={isLoading || isTranslating}
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* PDF Upload Section */}
            <div className="pdf-upload-section">
              <div className="pdf-upload-container">
                <label htmlFor="pdf-upload" className="pdf-upload-label">
                  {isUploading ? (
                    <span>📄 Processing PDF...</span>
                  ) : (
                    <span>📄 {pdfText ? 'Replace PDF' : 'Upload PDF Document'}</span>
                  )}
                </label>
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handlePdfUpload}
                  disabled={isUploading || isLoading}
                  className="pdf-upload-input"
                />
                {pdfText && (
                  <div className="pdf-info">
                    <span className="pdf-name">
                      📄 {pdfInfo?.title || 'Document loaded'}
                      {isTranslating && <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#667eea' }}>🔄 Translating...</span>}
                      {pdfTranslatedText && !isTranslating && <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#10b981' }}>✓ Translated</span>}
                    </span>
                    <button 
                      onClick={clearPdf} 
                      className="clear-pdf-button"
                      disabled={isLoading || isTranslating}
                      title="Clear document"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              
              {/* Translated Text Display */}
              {pdfText && (
                <div className="translated-text-section">
                  <div className="translated-text-header">
                    <h3>
                      📄 Document Content 
                      {isTranslating ? (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#667eea', fontWeight: 'normal' }}>
                          (Translating to {languages.find(lang => lang.code === selectedLanguage)?.name || 'English'}...)
                        </span>
                      ) : (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#666', fontWeight: 'normal' }}>
                          ({pdfTranslatedText ? languages.find(lang => lang.code === selectedLanguage)?.name : 'Original'} - {selectedLanguage === 'en' ? 'English' : languages.find(lang => lang.code === selectedLanguage)?.name || 'English'})
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={() => {
                        const textToCopy = pdfTranslatedText || pdfText
                        copyToClipboard(textToCopy)
                      }}
                      className="copy-translated-button"
                      title="Copy text"
                      disabled={isTranslating}
                    >
                      📋 Copy
                    </button>
                  </div>
                  <textarea
                    className="translated-text-box"
                    value={isTranslating ? 'Translating document content... Please wait.' : (pdfTranslatedText || pdfText)}
                    readOnly
                    rows={12}
                    placeholder="Document content will appear here..."
                    disabled={isTranslating}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="chat-messages-container">
            <div className="chat-messages">
              {messages.map((message) => (
                <div key={message.id} className={`message-bubble ${message.type}`}>
                  <div className="message-content">
                    {message.text}
                  </div>
                  <button
                    className="copy-button"
                    onClick={() => copyToClipboard(message.text)}
                    title="Copy message"
                  >
                    📋
                  </button>
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
