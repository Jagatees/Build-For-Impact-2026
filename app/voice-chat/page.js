'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { AudioRecorder } from '@/utils/audio-recorder'
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

export default function VoiceChat() {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! Tap the microphone to speak.', type: 'bot' }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false) 
  const [useStreaming, setUseStreaming] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
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

  const playAudio = (url) => {
    if (isPlaying) return;
    setIsPlaying(true);
    const audio = new Audio(url);
    audio.onended = () => { setIsPlaying(false); };
    audio.onerror = () => { setIsPlaying(false); alert("Error playing audio"); };
    audio.play();
  };

  // --- TOGGLE RECORDING ---
  const toggleRecording = async () => {
    if (isRecording) {
        // STOP RECORDING
        setIsRecording(false);
        setIsLoading(true);

        try {
          const audioBase64 = await AudioRecorder.stop();
          if (!audioBase64) { setIsLoading(false); return; }

          const tempId = Date.now();
          setMessages(prev => [...prev, { id: tempId, text: '🎤 Processing...', type: 'user' }]);

          const base64Response = await fetch(audioBase64);
          const blob = await base64Response.blob();
          
          const formData = new FormData();
          formData.append('file', blob, 'recording.webm');
          formData.append('language', selectedLanguage); 

          const response = await fetch('/api/chat', { method: 'POST', body: formData });
          const data = await response.json();

          if (data.success) {
            setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, text: data.userText } : msg));

            let audioUrl = null;
            if (data.audioBase64) {
              const byteCharacters = atob(data.audioBase64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const audioBlob = new Blob([new Uint8Array(byteNumbers)], { type: 'audio/mp3' });
              audioUrl = URL.createObjectURL(audioBlob);
              playAudio(audioUrl); 
            }

            setMessages(prev => [...prev, { id: Date.now() + 1, text: data.message, type: 'bot', audioUrl }]);
          } else {
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            alert(data.error || "Could not understand audio.");
          }
        } catch (error) {
          console.error(error);
          alert("Error sending audio.");
        } finally {
          setIsLoading(false);
        }
    } else {
        // START RECORDING
        if (isLoading || isPlaying) return; 
        try {
          await AudioRecorder.start();
          setIsRecording(true);
        } catch (e) {
          alert("Microphone denied.");
        }
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      
      {/* --- RIPPLE ANIMATION CSS --- */}
      <style jsx>{`
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        
        .mic-container {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        /* The Ripple Ring (Behind the button) */
        .mic-container::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: rgba(239, 68, 68, 0.4);
          border-radius: 50%;
          z-index: 0;
          /* Only animate when recording class is added */
          opacity: 0; 
          transform: scale(1);
        }

        .mic-container.recording::before {
          animation: ripple 1.5s infinite linear;
        }
      `}</style>

      {/* NAV */}
      <Navigation />

      {/* MAIN */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#2d3748', marginBottom: '2rem', textAlign: 'center' }}>
          {isRecording ? "Listening..." : "Tap to Speak"}
        </h1>

        {/* --- MIC BUTTON WITH RIPPLE CONTAINER --- */}
        <div className={`mic-container ${isRecording ? 'recording' : ''}`} style={{ width: '140px', height: '140px', marginBottom: '2rem' }}>
          <button
            onClick={toggleRecording}
            disabled={isLoading || isPlaying}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: 'none',
              background: isRecording 
                ? '#ef4444' // Red
                : 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)', // Orange
              color: 'white',
              fontSize: '3rem',
              cursor: (isLoading || isPlaying) ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              zIndex: 2, // Keeps button above ripple
              position: 'relative',
              transition: 'all 0.3s ease',
              transform: isRecording ? 'scale(1.05)' : 'scale(1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {isRecording ? '⏹' : '🎤'}
          </button>
        </div>

        {/* --- STATUS TEXT --- */}
        <p style={{ fontSize: '1.1rem', color: isRecording ? '#ef4444' : '#718096', fontWeight: '600', marginBottom: '1.5rem' }}>
           {isRecording ? "Tap again to SEND" : (isLoading ? "Thinking..." : "Ready")}
        </p>

        {/* LANGUAGE SELECTOR */}
        {!isRecording && (
          <div style={{ marginBottom: '2rem', padding: '0.8rem', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <label style={{ marginRight: '10px', fontWeight: '500', color: '#4a5568' }}>Language:</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              disabled={isLoading || isPlaying}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e0', outline: 'none' }}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* CHAT BUBBLES */}
        {messages.length > 0 && (
          <div style={{ width: '100%', background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', maxHeight: '300px', overflowY: 'auto' }}>
            {messages.slice(-3).map((message) => (
              <div key={message.id} style={{ 
                  marginBottom: '1rem', 
                  padding: '1rem', 
                  background: message.type === 'user' ? '#ebf8ff' : '#f7fafc', 
                  borderLeft: message.type === 'user' ? '4px solid #3182ce' : '4px solid #48bb78',
                  borderRadius: '4px'
              }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#718096', marginBottom: '4px' }}>
                    {message.type === 'user' ? 'YOU' : 'ABANG SG'}
                </div>
                <div style={{ color: '#2d3748' }}>{message.text}</div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  )
}