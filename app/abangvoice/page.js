'use client'

import { useState, useRef, useEffect } from 'react'
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

function formatMessageText(text) {
  if (!text) return text
  const lines = text.split('\n')
  const elements = []
  let listItems = []

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(<ul key={`ul-${elements.length}`} style={{ margin: '4px 0', paddingLeft: '20px' }}>{listItems}</ul>)
      listItems = []
    }
  }

  const formatInline = (str, keyPrefix) => {
    const parts = []
    const regex = /(\*\*(.+?)\*\*)|(\[([^\]]+)\]\((https?:\/\/[^\)]+)\))|(https?:\/\/[^\s]+)/g
    let lastIndex = 0
    let match
    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.slice(lastIndex, match.index))
      }
      if (match[1]) {
        parts.push(<strong key={`${keyPrefix}-b-${match.index}`}>{match[2]}</strong>)
      } else if (match[3]) {
        parts.push(<a key={`${keyPrefix}-a-${match.index}`} href={match[5]} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'underline', wordBreak: 'break-all' }}>{match[4]}</a>)
      } else if (match[6]) {
        parts.push(<a key={`${keyPrefix}-u-${match.index}`} href={match[6]} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'underline', wordBreak: 'break-all' }}>{match[6]}</a>)
      }
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < str.length) {
      parts.push(str.slice(lastIndex))
    }
    return parts.length > 0 ? parts : str
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim()
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)/)
    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)/)
    if (bulletMatch || numberedMatch) {
      const content = bulletMatch ? bulletMatch[1] : numberedMatch[1]
      listItems.push(<li key={`li-${i}`} style={{ marginBottom: '2px' }}>{formatInline(content, `li-${i}`)}</li>)
    } else {
      flushList()
      if (trimmed === '') {
        elements.push(<br key={`br-${i}`} />)
      } else {
        elements.push(<div key={`p-${i}`}>{formatInline(trimmed, `p-${i}`)}</div>)
      }
    }
  })
  flushList()
  return elements
}

export default function VoiceChat() {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! Tap the microphone and speak — I\'ll translate it for you.', type: 'bot', timestamp: new Date() }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [useStreaming, setUseStreaming] = useState(true)
  const [speakLanguage, setSpeakLanguage] = useState('en')
  const [replyLanguage, setReplyLanguage] = useState('en')
  const [processingStep, setProcessingStep] = useState(null)
  const [pendingTranscript, setPendingTranscript] = useState(null)
  const [nerdMode, setNerdMode] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [playingMessageId, setPlayingMessageId] = useState(null)

  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const currentAudioRef = useRef(null)
  const lastTranscribeTimingRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard')
    }).catch(err => console.error('Failed to copy:', err))
  }

  const playAudio = (url, messageId) => {
    // If already playing something, stop it first
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
      currentAudioRef.current = null
    }

    setIsPlaying(true)
    setIsPaused(false)
    setPlayingMessageId(messageId)
    const audio = new Audio(url)
    currentAudioRef.current = audio
    audio.onended = () => {
      setIsPlaying(false)
      setIsPaused(false)
      setPlayingMessageId(null)
      currentAudioRef.current = null
    }
    audio.onerror = () => {
      setIsPlaying(false)
      setIsPaused(false)
      setPlayingMessageId(null)
      currentAudioRef.current = null
      alert("Error playing audio")
    }
    audio.play()
  }

  const pauseAudio = () => {
    if (currentAudioRef.current && isPlaying && !isPaused) {
      currentAudioRef.current.pause()
      setIsPaused(true)
    }
  }

  const resumeAudio = () => {
    if (currentAudioRef.current && isPaused) {
      currentAudioRef.current.play()
      setIsPaused(false)
    }
  }

  const stopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
      currentAudioRef.current = null
    }
    setIsPlaying(false)
    setIsPaused(false)
    setPlayingMessageId(null)
  }

  // --- TOGGLE RECORDING (transcribe only) ---
  const toggleRecording = async () => {
    if (isRecording) {
        // STOP RECORDING → transcribe only
        setIsRecording(false);
        setIsLoading(true);
        setProcessingStep('transcribing');

        try {
          const audioBase64 = await AudioRecorder.stop();
          if (!audioBase64) { setIsLoading(false); setProcessingStep(null); return; }

          const base64Response = await fetch(audioBase64);
          const blob = await base64Response.blob();

          const formData = new FormData();
          formData.append('file', blob, 'recording.webm');
          formData.append('speakLanguage', speakLanguage);
          formData.append('transcribeOnly', 'true');

          const response = await fetch('/api/chat', { method: 'POST', body: formData });
          const data = await response.json();

          if (data.success && data.userText) {
            setPendingTranscript(data.userText);
            lastTranscribeTimingRef.current = data.timings?.transcribe || null;
          } else {
            alert(data.error || "Could not understand audio.");
          }
        } catch (error) {
          console.error(error);
          alert("Error transcribing audio.");
        } finally {
          setIsLoading(false);
          setProcessingStep(null);
        }
    } else {
        // START RECORDING
        if (isLoading || pendingTranscript) return;
        try {
          await AudioRecorder.start();
          setIsRecording(true);
        } catch (e) {
          alert("Microphone denied.");
        }
    }
  };

  // --- SEND CONFIRMED/EDITED TRANSCRIPT ---
  const sendTranscript = async () => {
    if (!pendingTranscript || !pendingTranscript.trim()) return;

    const userText = pendingTranscript.trim();
    setPendingTranscript(null);
    setIsLoading(true);
    setProcessingStep('thinking');

    const stepTimer = setTimeout(() => setProcessingStep('speaking'), 4000);

    const tempId = Date.now();
    setMessages(prev => [...prev, { id: tempId, text: userText, type: 'user', timestamp: new Date() }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, replyLanguage, withAudio: true }),
      });
      const data = await response.json();
      clearTimeout(stepTimer);

      if (data.success) {
        let audioUrl = null;
        const botId = Date.now() + 1;
        if (data.audioBase64) {
          const byteCharacters = atob(data.audioBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const audioBlob = new Blob([new Uint8Array(byteNumbers)], { type: 'audio/mp3' });
          audioUrl = URL.createObjectURL(audioBlob);
          playAudio(audioUrl, botId);
        }
        const timings = data.timings ? {
          transcribe: lastTranscribeTimingRef.current,
          translate: data.timings.translate,
          tts: data.timings.tts,
          total: (lastTranscribeTimingRef.current || 0) + (data.timings.translate || 0) + (data.timings.tts || 0),
        } : null;
        lastTranscribeTimingRef.current = null;
        setMessages(prev => [...prev, { id: botId, text: data.message, type: 'bot', audioUrl, timings, timestamp: new Date() }]);
      } else {
        alert(data.error || "Could not get a reply.");
      }
    } catch (error) {
      console.error(error);
      alert("Error processing message.");
    } finally {
      setIsLoading(false);
      setProcessingStep(null);
    }
  };

  const cancelTranscript = () => {
    setPendingTranscript(null);
  };

  const formatTime = (date) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #FFE4B5 0%, #FFEDD5 50%, #FFFFFF 100%)', display: 'flex', flexDirection: 'column' }}>

      {/* --- ANIMATIONS CSS --- */}
      <style jsx>{`
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .mic-container {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .mic-container::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: rgba(239, 68, 68, 0.4);
          border-radius: 50%;
          z-index: 0;
          opacity: 0;
          transform: scale(1);
        }

        .mic-container.recording::before {
          animation: ripple 1.5s infinite linear;
        }

        .chat-container::-webkit-scrollbar {
          width: 6px;
        }
        .chat-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-container::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
        }

        .audio-btn {
          border: none;
          background: none;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.85rem;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: background 0.2s;
        }
        .audio-btn:hover {
          background: rgba(0,0,0,0.05);
        }
        .audio-btn-play { color: #3182ce; }
        .audio-btn-pause { color: #d69e2e; }
        .audio-btn-stop { color: #e53e3e; }

        .msg-bubble {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* MAIN LAYOUT - Two sections: controls on top, chat below */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '900px', margin: '0 auto', width: '100%', padding: '1rem' }}>

        {/* TOP SECTION: Mic + Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 0' }}>

          <h1 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#2d3748', marginBottom: '1rem', textAlign: 'center' }}>
            {isRecording ? "Listening..." : pendingTranscript ? "Review your message" : processingStep === 'transcribing' ? "Transcribing..." : processingStep === 'thinking' ? "Translating..." : processingStep === 'speaking' ? "Converting to speech..." : "Tap to Speak"}
          </h1>

          {/* MIC BUTTON */}
          <div className={`mic-container ${isRecording ? 'recording' : ''}`} style={{ width: '100px', height: '100px', marginBottom: '1rem' }}>
            <button
              onClick={toggleRecording}
              disabled={isLoading || pendingTranscript !== null}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: 'none',
                background: isRecording
                  ? '#ef4444'
                  : 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                color: 'white',
                fontSize: '2.5rem',
                cursor: (isLoading || pendingTranscript) ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                zIndex: 2,
                position: 'relative',
                transition: 'all 0.3s ease',
                transform: isRecording ? 'scale(1.05)' : 'scale(1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: (isLoading || pendingTranscript) ? 0.6 : 1,
              }}
            >
              {isRecording ? '⏹' : '🎤'}
            </button>
          </div>

          {/* STATUS TEXT */}
          <p style={{ fontSize: '0.95rem', color: isRecording ? '#ef4444' : pendingTranscript ? '#f7931e' : '#718096', fontWeight: '600', marginBottom: '0.75rem' }}>
             {isRecording ? "Tap again to SEND" : pendingTranscript ? "Edit if needed, then send" : (isLoading ? (processingStep === 'transcribing' ? "Transcribing..." : processingStep === 'thinking' ? "Step 1/2" : processingStep === 'speaking' ? "Step 2/2" : "Processing...") : "Ready")}
          </p>

          {/* AUDIO PLAYBACK CONTROLS */}
          {isPlaying && (
            <div style={{
              display: 'flex', gap: '8px', marginBottom: '0.75rem',
              background: 'white', padding: '8px 16px', borderRadius: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)', alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.8rem', color: '#718096', marginRight: '4px', animation: isPaused ? 'pulse 1.5s infinite' : 'none' }}>
                {isPaused ? '⏸ Paused' : '🔊 Speaking...'}
              </span>
              {isPaused ? (
                <button className="audio-btn audio-btn-play" onClick={resumeAudio}>
                  ▶ Resume
                </button>
              ) : (
                <button className="audio-btn audio-btn-pause" onClick={pauseAudio}>
                  ⏸ Pause
                </button>
              )}
              <button className="audio-btn audio-btn-stop" onClick={stopAudio}>
                ⏹ Stop
              </button>
            </div>
          )}

          {/* TRANSCRIPT REVIEW */}
          {pendingTranscript !== null && (
            <div style={{
              width: '100%', maxWidth: '500px', marginBottom: '0.75rem',
              background: 'white', borderRadius: '12px', border: '2px solid #f7931e',
              boxShadow: '0 4px 12px rgba(247, 147, 30, 0.15)', padding: '16px',
            }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#4a5568', marginBottom: '8px', display: 'block' }}>
                What we heard:
              </label>
              <textarea
                value={pendingTranscript}
                onChange={(e) => setPendingTranscript(e.target.value)}
                style={{
                  width: '100%', minHeight: '60px', padding: '10px 12px',
                  borderRadius: '8px', border: '1px solid #e2e8f0',
                  fontSize: '0.95rem', lineHeight: '1.5', resize: 'vertical',
                  outline: 'none', fontFamily: 'inherit', color: '#2d3748',
                  background: '#fafafa',
                }}
                onFocus={(e) => e.target.style.borderColor = '#f7931e'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={cancelTranscript}
                  style={{
                    padding: '8px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
                    background: 'white', color: '#718096', fontSize: '0.9rem',
                    cursor: 'pointer', fontWeight: '500',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={sendTranscript}
                  disabled={!pendingTranscript?.trim()}
                  style={{
                    padding: '8px 24px', borderRadius: '8px', border: 'none',
                    background: pendingTranscript?.trim() ? 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' : '#e2e8f0',
                    color: pendingTranscript?.trim() ? 'white' : '#a0aec0',
                    fontSize: '0.9rem', cursor: pendingTranscript?.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: '600', boxShadow: pendingTranscript?.trim() ? '0 2px 8px rgba(247,147,30,0.3)' : 'none',
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* LANGUAGE SELECTORS */}
          {!isRecording && !pendingTranscript && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ padding: '0.6rem 1rem', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <label style={{ marginRight: '8px', fontWeight: '500', color: '#4a5568', fontSize: '0.85rem' }}>I speak:</label>
                <select
                  value={speakLanguage}
                  onChange={(e) => setSpeakLanguage(e.target.value)}
                  disabled={isLoading}
                  style={{
                    padding: '0.4rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e0',
                    outline: 'none',
                    background: isLoading ? '#f5f5f5' : 'white',
                    color: isLoading ? '#999' : '#333',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    minWidth: '110px',
                    fontSize: '0.9rem'
                  }}
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ padding: '0.6rem 1rem', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <label style={{ marginRight: '8px', fontWeight: '500', color: '#4a5568', fontSize: '0.85rem' }}>Reply in:</label>
                <select
                  value={replyLanguage}
                  onChange={(e) => setReplyLanguage(e.target.value)}
                  disabled={isLoading}
                  style={{
                    padding: '0.4rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e0',
                    outline: 'none',
                    background: isLoading ? '#f5f5f5' : 'white',
                    color: isLoading ? '#999' : '#333',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    minWidth: '110px',
                    fontSize: '0.9rem'
                  }}
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* CHAT WINDOW */}
        <div style={{
          flex: 1,
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: '350px',
          maxHeight: '500px',
          border: '1px solid #e2e8f0'
        }}>
          {/* Chat Header */}
          <div style={{
            padding: '12px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f7fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#48bb78' }} />
              <span style={{ fontWeight: '600', color: '#2d3748', fontSize: '0.95rem' }}>Abang Voice Translator</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}>
                {messages.length - 1} message{messages.length - 1 !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setNerdMode(n => !n)}
                style={{
                  padding: '3px 8px', borderRadius: '12px', border: 'none', fontSize: '0.7rem',
                  fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                  background: nerdMode ? '#2d3748' : '#e2e8f0',
                  color: nerdMode ? '#68d391' : '#a0aec0',
                }}
                title="Toggle timing stats"
              >
                {nerdMode ? '{ } ON' : '{ }'}
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={chatContainerRef}
            className="chat-container"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className="msg-bubble"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: message.type === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Sender Label */}
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  color: '#a0aec0',
                  marginBottom: '4px',
                  paddingLeft: message.type === 'bot' ? '12px' : '0',
                  paddingRight: message.type === 'user' ? '12px' : '0',
                }}>
                  {message.type === 'user' ? 'You' : 'Translation'}
                </span>

                {/* Message Bubble */}
                <div style={{
                  maxWidth: '80%',
                  padding: '10px 16px',
                  borderRadius: message.type === 'user'
                    ? '16px 16px 4px 16px'
                    : '16px 16px 16px 4px',
                  background: message.type === 'user'
                    ? 'linear-gradient(135deg, #3182ce, #2b6cb0)'
                    : '#f0f4f8',
                  color: message.type === 'user' ? 'white' : '#2d3748',
                  fontSize: '0.95rem',
                  lineHeight: '1.5',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  wordBreak: 'break-word',
                }}>
                  {message.type === 'bot' ? formatMessageText(message.text) : message.text}
                </div>

                {/* Bottom row: timestamp + audio controls */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '4px',
                  paddingLeft: message.type === 'bot' ? '12px' : '0',
                  paddingRight: message.type === 'user' ? '12px' : '0',
                }}>
                  <span style={{ fontSize: '0.7rem', color: '#cbd5e0' }}>
                    {formatTime(message.timestamp)}
                  </span>

                  {/* Play button for bot messages with audio */}
                  {message.type === 'bot' && message.audioUrl && (
                    <button
                      className="audio-btn audio-btn-play"
                      onClick={() => playAudio(message.audioUrl, message.id)}
                      disabled={isPlaying && playingMessageId === message.id}
                      style={{
                        fontSize: '0.75rem',
                        opacity: (isPlaying && playingMessageId === message.id) ? 0.5 : 1
                      }}
                    >
                      {isPlaying && playingMessageId === message.id
                        ? (isPaused ? '⏸ Paused' : '🔊 Playing')
                        : '🔊 Play'}
                    </button>
                  )}

                  {/* Copy button for bot messages */}
                  {message.type === 'bot' && message.id !== 1 && (
                    <button
                      className="audio-btn"
                      onClick={() => copyToClipboard(message.text)}
                      style={{ fontSize: '0.75rem', color: '#a0aec0' }}
                    >
                      📋 Copy
                    </button>
                  )}
                </div>

                {/* Nerd mode: timing stats */}
                {nerdMode && message.type === 'bot' && message.timings && (
                  <div style={{
                    marginTop: '4px', paddingLeft: '12px',
                    display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center',
                  }}>
                    {message.timings.transcribe != null && (
                      <span style={{ fontSize: '0.65rem', background: '#ebf8ff', color: '#2b6cb0', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                        STT {(message.timings.transcribe / 1000).toFixed(1)}s
                      </span>
                    )}
                    {message.timings.translate != null && (
                      <span style={{ fontSize: '0.65rem', background: '#fefcbf', color: '#975a16', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                        LLM {(message.timings.translate / 1000).toFixed(1)}s
                      </span>
                    )}
                    {message.timings.tts != null && (
                      <span style={{ fontSize: '0.65rem', background: '#f0fff4', color: '#276749', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                        TTS {(message.timings.tts / 1000).toFixed(1)}s
                      </span>
                    )}
                    {message.timings.total != null && (
                      <span style={{ fontSize: '0.65rem', background: '#2d3748', color: '#68d391', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: '700' }}>
                        Total {(message.timings.total / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Progress stepper */}
            {isLoading && processingStep && (
              <div className="msg-bubble" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#a0aec0', marginBottom: '4px', paddingLeft: '12px' }}>
                  Translation
                </span>
                <div style={{
                  padding: '12px 20px',
                  borderRadius: '16px 16px 16px 4px',
                  background: '#f0f4f8',
                  minWidth: '260px',
                }}>
                  {(processingStep === 'transcribing'
                    ? [{ key: 'transcribing', label: 'Transcribing your voice...' }]
                    : [
                        { key: 'thinking', label: 'Translating...' },
                        { key: 'speaking', label: 'Converting to speech...' },
                      ]
                  ).map((step, idx, arr) => {
                    const steps = arr.map(s => s.key);
                    const currentIdx = steps.indexOf(processingStep);
                    const isActive = step.key === processingStep;
                    const isDone = idx < currentIdx;
                    return (
                      <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: idx < arr.length - 1 ? '8px' : 0 }}>
                        <div style={{
                          width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: '700',
                          background: isDone ? '#48bb78' : isActive ? '#f7931e' : '#e2e8f0',
                          color: isDone || isActive ? 'white' : '#a0aec0',
                          animation: isActive ? 'pulse 1.5s infinite' : 'none',
                        }}>
                          {isDone ? '✓' : idx + 1}
                        </div>
                        <span style={{
                          fontSize: '0.85rem',
                          color: isActive ? '#2d3748' : isDone ? '#48bb78' : '#a0aec0',
                          fontWeight: isActive ? '600' : '400',
                        }}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

      </main>
    </div>
  )
}
