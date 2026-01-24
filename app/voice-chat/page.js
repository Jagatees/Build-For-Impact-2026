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
          try {
            const byteCharacters = atob(data.audioBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const audioBlob = new Blob([new Uint8Array(byteNumbers)], { type: 'audio/mp3' });
            audioUrl = URL.createObjectURL(audioBlob);
            
            // === USE HELPER INSTEAD OF DIRECT PLAY ===
            playAudio(audioUrl); 
          } catch (audioError) {
            console.error('Error creating audio:', audioError);
          }
        }

        setMessages(prev => [...prev, { 
          id: Date.now() + 1, 
          text: data.message, 
          type: 'bot',
          audioUrl: audioUrl 
        }]);
      } else {
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        const errorMsg = data.error || "Could not understand audio.";
        
        // Show user-friendly error message
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          text: `❌ Error: ${errorMsg}${errorMsg.includes('API key') ? ' Please check your .env.local file.' : ''}`, 
          type: 'bot' 
        }]);
      }

    } catch (error) {
      console.error('Voice Error:', error);
      setMessages(prev => prev.filter(msg => msg.id === tempId));
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        text: `❌ Error: ${error.message || 'Failed to process audio. Please try again.'}`, 
        type: 'bot' 
      }]);
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
  // UI RENDER - Modern Minimalist Design
  // ==============================
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Navigation Bar */}
      <nav style={{
        padding: '1rem 2rem',
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}>
              🔊
            </div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#2d3748' }}>
              Build For Impact
            </h2>
          </div>
          <ul style={{
            display: 'flex',
            listStyle: 'none',
            margin: 0,
            padding: 0,
            gap: '2rem',
            alignItems: 'center'
          }}>
            <li>
              <Link 
                href="/" 
                style={{ 
                  color: '#2d3748', 
                  textDecoration: 'none', 
                  fontWeight: '500', 
                  transition: 'color 0.2s',
                  padding: '0.5rem 0',
                  borderBottom: '2px solid transparent'
                }}
                onMouseEnter={(e) => e.target.style.color = '#ff6b35'}
                onMouseLeave={(e) => e.target.style.color = '#2d3748'}
              >
                Home
              </Link>
            </li>
            <li>
              <Link 
                href="/chat" 
                style={{ 
                  color: '#2d3748', 
                  textDecoration: 'none', 
                  fontWeight: '500', 
                  transition: 'color 0.2s',
                  padding: '0.5rem 0',
                  borderBottom: '2px solid transparent'
                }}
                onMouseEnter={(e) => e.target.style.color = '#ff6b35'}
                onMouseLeave={(e) => e.target.style.color = '#2d3748'}
              >
                Chat
              </Link>
            </li>
            <li>
              <Link 
                href="/document-chat" 
                style={{ 
                  color: '#2d3748', 
                  textDecoration: 'none', 
                  fontWeight: '500', 
                  transition: 'color 0.2s',
                  padding: '0.5rem 0',
                  borderBottom: '2px solid transparent'
                }}
                onMouseEnter={(e) => e.target.style.color = '#ff6b35'}
                onMouseLeave={(e) => e.target.style.color = '#2d3748'}
              >
                Document Chat
              </Link>
            </li>
            <li>
              <Link 
                href="/voice-chat" 
                style={{ 
                  color: '#ff6b35', 
                  textDecoration: 'none', 
                  fontWeight: '600',
                  padding: '0.5rem 0',
                  borderBottom: '2px solid #ff6b35'
                }}
              >
                Voice Chat
              </Link>
            </li>
            <li>
              <Link 
                href="/video-chat" 
                style={{ 
                  color: '#2d3748', 
                  textDecoration: 'none', 
                  fontWeight: '500', 
                  transition: 'color 0.2s',
                  padding: '0.5rem 0',
                  borderBottom: '2px solid transparent'
                }}
                onMouseEnter={(e) => e.target.style.color = '#ff6b35'}
                onMouseLeave={(e) => e.target.style.color = '#2d3748'}
              >
                Video Chat
              </Link>
            </li>
            <li>
              <Link 
                href="/faq" 
                style={{ 
                  color: '#2d3748', 
                  textDecoration: 'none', 
                  fontWeight: '500', 
                  transition: 'color 0.2s',
                  padding: '0.5rem 0',
                  borderBottom: '2px solid transparent'
                }}
                onMouseEnter={(e) => e.target.style.color = '#ff6b35'}
                onMouseLeave={(e) => e.target.style.color = '#2d3748'}
              >
                FAQ
              </Link>
            </li>
            <li>
              <Link 
                href="/company-review" 
                style={{ 
                  color: '#2d3748', 
                  textDecoration: 'none', 
                  fontWeight: '500', 
                  transition: 'color 0.2s',
                  padding: '0.5rem 0',
                  borderBottom: '2px solid transparent'
                }}
                onMouseEnter={(e) => e.target.style.color = '#ff6b35'}
                onMouseLeave={(e) => e.target.style.color = '#2d3748'}
              >
                Company Review
              </Link>
            </li>
            <li>
              <Link 
                href="/reviews" 
                style={{ 
                  color: '#2d3748', 
                  textDecoration: 'none', 
                  fontWeight: '500', 
                  transition: 'color 0.2s',
                  padding: '0.5rem 0',
                  borderBottom: '2px solid transparent'
                }}
                onMouseEnter={(e) => e.target.style.color = '#ff6b35'}
                onMouseLeave={(e) => e.target.style.color = '#2d3748'}
              >
                View Reviews
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
        maxWidth: '800px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Main Title */}
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          color: '#2d3748',
          marginBottom: '3rem',
          textAlign: 'center'
        }}>
          How can I help you today?
        </h1>

        {/* Large Microphone Button */}
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecordingAndSend}
          onTouchStart={startRecording}
          onTouchEnd={stopRecordingAndSend}
          disabled={isLoading || isPlaying}
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            border: 'none',
            background: isRecording 
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
              : 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
            color: 'white',
            fontSize: '3rem',
            cursor: (isLoading || isPlaying) ? 'not-allowed' : 'pointer',
            boxShadow: isRecording 
              ? '0 8px 24px rgba(239, 68, 68, 0.4)' 
              : '0 8px 24px rgba(255, 107, 53, 0.3)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '2rem',
            transform: isRecording ? 'scale(1.1)' : 'scale(1)',
            opacity: (isLoading || isPlaying) ? 0.6 : 1
          }}
        >
          🎤
        </button>

        {/* Active Recording Controls */}
        {isRecording && (
          <div style={{
            width: '100%',
            maxWidth: '600px',
            padding: '1.5rem',
            borderRadius: '12px',
            background: 'white',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            marginBottom: '1rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '2rem'
            }}>
              {/* Volume Control */}
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#2d3748' }}>VOLUME</span>
                  <span style={{ fontSize: '1.2rem' }}>🔊</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%'
                }}>
                  <span style={{ fontSize: '1rem' }}>🔊</span>
                  <div style={{
                    flex: 1,
                    height: '8px',
                    background: '#e5e7eb',
                    borderRadius: '4px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '70%',
                      height: '100%',
                      background: '#10b981',
                      borderRadius: '4px',
                      transition: 'width 0.1s'
                    }} />
                  </div>
                  <span style={{ fontSize: '1rem' }}>🔊</span>
                </div>
              </div>

              {/* Stop Listening Button */}
              <button
                onClick={stopRecordingAndSend}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#dc2626'
                  e.target.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ef4444'
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: 'white'
                }} />
                Stop Listening
              </button>
            </div>
          </div>
        )}

        {/* Status Indicator */}
        {isRecording && (
          <p style={{
            fontSize: '0.9rem',
            color: '#ff6b35',
            fontWeight: '500',
            marginTop: '1rem',
            textAlign: 'center'
          }}>
            LISTENING FOR YOUR VOICE...
          </p>
        )}

        {/* Language Selector (Hidden when recording) */}
        {!isRecording && (
          <div style={{
            marginTop: '2rem',
            padding: '1rem 1.5rem',
            borderRadius: '10px',
            background: 'white',
            border: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '500', color: '#2d3748' }}>
              Language:
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              disabled={isLoading || isPlaying}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: 'white',
                color: '#2d3748',
                fontSize: '0.9rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Messages (Minimal, only show recent) */}
        {messages.length > 1 && (
          <div style={{
            width: '100%',
            maxWidth: '600px',
            marginTop: '2rem',
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '1rem',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            {messages.slice(-3).map((message) => (
              <div key={message.id} style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: message.type === 'user' ? '#f3f4f6' : '#f9fafb',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#2d3748'
              }}>
                {message.text}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}