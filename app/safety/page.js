'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function SafetyInspector() {
  const [selectedImage, setSelectedImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [language, setLanguage] = useState('English')
  const [customQuestion, setCustomQuestion] = useState('')

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedImage(file)
      setAnalysis(null)
      setError(null)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedImage) {
      setError('Please select an image first')
      return
    }

    setIsLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const formData = new FormData()
      formData.append('image', selectedImage)
      formData.append('language', language)
      if (customQuestion.trim()) {
        formData.append('question', customQuestion)
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setError(`Rate limit exceeded. Please wait ${data.retryAfter || 60} seconds before trying again.`)
        } else {
          setError(data.error || 'Analysis failed. Please try again.')
        }
        return
      }

      setAnalysis(data.result)
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to analyze image. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setSelectedImage(null)
    setPreview(null)
    setAnalysis(null)
    setError(null)
    setCustomQuestion('')
  }

  return (
    <div>
      <nav className="nav">
        <div className="nav-content">
          <h2>Build For Impact</h2>
          <ul className="nav-links">
            <li><Link href="/">Home</Link></li>
            <li><Link href="/chat">Chat</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
            <li><Link href="/safety">Safety Inspector</Link></li>
          </ul>
        </div>
      </nav>

      <div className="container">
        <div className="card">
          <h1>Safety Inspector</h1>
          <p>
            Upload a photo of a workplace or safety concern, and our AI will analyze it 
            for potential hazards. Available in multiple languages to help migrant workers 
            understand safety issues.
          </p>
        </div>

        <div className="safety-container">
          <div className="safety-upload-section">
            <div className="upload-area">
              {preview ? (
                <div className="image-preview">
                  <img src={preview} alt="Preview" />
                  <button onClick={handleReset} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
                    Remove Image
                  </button>
                </div>
              ) : (
                <label htmlFor="image-upload" className="upload-label">
                  <div className="upload-icon">📷</div>
                  <p>Click to upload an image</p>
                  <p style={{ fontSize: '0.9rem', color: '#666' }}>or drag and drop</p>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>

            {selectedImage && (
              <div className="safety-controls">
                <div className="control-group">
                  <label htmlFor="language">Response Language:</label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="chat-input"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                  >
                    <option value="English">English</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Malay">Malay</option>
                    <option value="Mandarin">Mandarin</option>
                  </select>
                </div>

                <div className="control-group" style={{ marginTop: '1rem' }}>
                  <label htmlFor="question">Custom Question (Optional):</label>
                  <input
                    id="question"
                    type="text"
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="e.g., What safety equipment is missing?"
                    className="chat-input"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                  />
                </div>

                <button
                  onClick={handleAnalyze}
                  className="btn"
                  disabled={isLoading}
                  style={{ width: '100%', marginTop: '1.5rem' }}
                >
                  {isLoading ? 'Analyzing...' : 'Analyze Safety Hazards'}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}

          {analysis && (
            <div className="analysis-result">
              <h2>Safety Analysis</h2>
              <div className="analysis-content">
                {analysis.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="loading-indicator">
              <p>Analyzing image for safety hazards...</p>
              <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                This may take a few moments
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
