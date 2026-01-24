'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { AudioRecorder } from '@/utils/audio-recorder' 

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

export default function VoiceChat() {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! Select your language above, then speak or type.', type: 'bot' }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false) 
  const [useStreaming, setUseStreaming] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  
  // === NEW STATE: TRACK AUDIO PLAYBACK ===
  const [isPlaying, setIsPlaying] = useState(false)

  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard')
    }).catch(err => console.error('Failed to copy:', err))
  }

  // === NEW HELPER: PLAY AUDIO & TRACK STATE ===
  const playAudio = (url) => {
    if (isPlaying) return; // Prevent overlapping audio
    
    setIsPlaying(true);
    const audio = new Audio(url);
    
    // When audio finishes, re-enable buttons
    audio.onended = () => {
        setIsPlaying(false);
    };
    
    // Handle errors (e.g., if file is corrupt)
    audio.onerror = () => {
        setIsPlaying(false);
        alert("Error playing audio");
    };

    audio.play();
  };

  // ==============================
  // VOICE HANDLING
  // ==============================
  const startRecording = async () => {
    if (isLoading || isPlaying) return; // Block if playing
    try {
      await AudioRecorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error(e);
      alert("Microphone access denied. Please allow permission.");
    }
  };

  const stopRecordingAndSend = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    setIsLoading(true);

    try {
      const audioBase64 = await AudioRecorder.stop();
      if (!audioBase64) {
        setIsLoading(false);
        return;
      }

      const tempId = Date.now();
      setMessages(prev => [...prev, { id: tempId, text: '🎤 Processing audio...', type: 'user' }]);

      const base64Response = await fetch(audioBase64);
      const blob = await base64Response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      formData.append('language', selectedLanguage); 

      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...msg, text: data.userText } : msg
        ));

        let audioUrl = null;
        if (data.audioBase64) {
          const byteCharacters = atob(data.audioBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const audioBlob = new Blob([new Uint8Array(byteNumbers)], { type: 'audio/mp3' });
          audioUrl = URL.createObjectURL(audioBlob);
          
          // === USE HELPER INSTEAD OF DIRECT PLAY ===
          playAudio(audioUrl); 
        }

        setMessages(prev => [...prev, { 
          id: Date.now() + 1, 
          text: data.message, 
          type: 'bot',
          audioUrl: audioUrl 
        }]);
      } else {
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        alert(data.error || "Could not understand audio.");
      }

    } catch (error) {
      console.error('Voice Error:', error);
      alert("Error sending audio.");
    } finally {
      setIsLoading(false);
    }
  };

  // ==============================
  // TEXT HANDLING
  // ==============================
  const handleSend = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading || isPlaying) return

    const userMessageText = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    const userMessage = { id: Date.now(), text: userMessageText, type: 'user' }
    setMessages(prev => [...prev, userMessage])

    try {
      const languageName = languages.find(lang => lang.code === selectedLanguage)?.name || 'English'
      const messageWithLanguage = userMessageText; 

      const conversationHistory = messages
        .filter(msg => msg.type === 'user' || msg.type === 'bot')
        .slice(-10)
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.text
        }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageWithLanguage,
          conversationHistory: conversationHistory,
          useStreaming: useStreaming,
          language: selectedLanguage 
        })
      })

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      if (useStreaming && response.headers.get('content-type')?.includes('text/event-stream')) {
        const botMessageId = Date.now() + 1
        setMessages(prev => [...prev, { id: botMessageId, text: '', type: 'bot' }])

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          fullText += chunk
          setMessages(prev => prev.map(msg => 
            msg.id === botMessageId ? { ...msg, text: fullText } : msg
          ))
        }
      } else {
        const data = await response.json()
        setMessages(prev => [...prev, { id: Date.now() + 1, text: data.message, type: 'bot' }])
      }

    } catch (error) {
      console.error('Text Error:', error)
      setMessages(prev => [...prev, { id: Date.now(), text: 'Error: ' + error.message, type: 'bot' }])
    } finally {
      setIsLoading(false)
    }
  }

  // ==============================
  // UI RENDER
  // ==============================
  return (
    <div>
      <nav className="nav">
        <div className="nav-content">
          <h2>Build For Impact</h2>
          <ul className="nav-links">
            <li><Link href="/">Home</Link></li>
            <li><Link href="/chat">Chat</Link></li>
            <li><Link href="/voice-chat">Voice Chat</Link></li>
          </ul>
        </div>
      </nav>

      <div className="chat-page-container">
        <div className="chat-wrapper">
          <div className="chat-header">
            <div className="chat-header-top">
              <div>
                <h1>Voice & Text Chat</h1>
                <p>Speak or type to ask about your rights and contracts</p>
              </div>
              <div className="language-selector">
                <label htmlFor="language-select" className="language-label">Output Language:</label>
                <select
                  id="language-select"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="language-dropdown"
                  disabled={isLoading || isPlaying} // Disable dropdown while playing
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="chat-messages-container">
            <div className="chat-messages">
              {messages.map((message) => (
                <div key={message.id} className={`message-bubble ${message.type}`}>
                  <div className="message-content">{message.text}</div>
                  {message.audioUrl && (
                    <button
                      className="mt-2 text-xs flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800"
                      // === DISABLE REPLAY IF PLAYING ===
                      onClick={() => playAudio(message.audioUrl)}
                      disabled={isPlaying} 
                      style={{ 
                          marginTop: '8px', 
                          background: 'none', 
                          border: 'none', 
                          cursor: isPlaying ? 'not-allowed' : 'pointer',
                          opacity: isPlaying ? 0.5 : 1
                      }}
                    >
                      {isPlaying ? '🔊 Playing...' : '🔊 Replay Audio'}
                    </button>
                  )}
                  <button
                    className="copy-button"
                    onClick={() => copyToClipboard(message.text)}
                    title="Copy message"
                  >
                    📋
                  </button>
                </div>
              ))}
              {isLoading && !isRecording && (
                <div className="message-bubble bot">
                  <div className="message-content">
                    <span className="typing-indicator"><span></span><span></span><span></span></span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="chat-input-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* === MAIN BUTTON === */}
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecordingAndSend}
              onTouchStart={startRecording}
              onTouchEnd={stopRecordingAndSend}
              // === DISABLE WHILE PLAYING ===
              disabled={isLoading || isPlaying} 
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: 'bold',
                cursor: (isLoading || isPlaying) ? 'not-allowed' : 'pointer',
                // Change color based on state
                backgroundColor: isRecording ? '#ef4444' : (isPlaying ? '#9ca3af' : '#4b5563'), 
                color: 'white',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {/* === DYNAMIC TEXT === */}
              {isRecording ? 'Listening... Release to Send' : 
               isPlaying ? '🔊 Audio Playing...' : 
               '🎙️ Hold to Speak'}
            </button>

            <form onSubmit={handleSend} className="chat-input-container" style={{ width: '100%' }}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Or type your message..."
                className="chat-input-field"
                disabled={isLoading || isPlaying}
              />
              <button type="submit" className="send-button" disabled={isLoading || !inputValue.trim() || isPlaying}>
                {isLoading && !isRecording ? <span className="spinner"></span> : <span>➤</span>}
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .chat-input-wrapper {
          background: white;
          padding: 15px;
          border-top: 1px solid #e5e7eb;
        }
      `}</style>
    </div>
  )
}