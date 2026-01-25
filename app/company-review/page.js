'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

export default function CompanyReview() {
  const [companyName, setCompanyName] = useState('')
  const [answers, setAnswers] = useState({
    question1: '',
    question2: ''
  })
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const questions = [
    {
      id: 'question1',
      text: 'Did you receive your salary on time as stated in your contract?',
      label: 'Salary Payment'
    },
    {
      id: 'question2',
      text: 'Were you provided with adequate rest days as required by law?',
      label: 'Rest Days'
    }
  ]

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!companyName.trim()) {
      alert('Please enter a company name')
      return
    }

    if (!answers.question1 || !answers.question2) {
      alert('Please answer both questions')
      return
    }

    setIsSubmitting(true)

    try {
      // Save review to JSON file via API
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: companyName.trim(),
          answers: answers,
          questions: questions
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review')
      }

      setSubmitted(true)
    } catch (error) {
      console.error('Error submitting review:', error)
      alert('Failed to submit review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setCompanyName('')
    setAnswers({
      question1: '',
      question2: ''
    })
    setSubmitted(false)
  }

  return (
    <div>
      <Navigation />

      <div className="container">
        <div className="card">
          <h1>Company Review</h1>
          <p>
            Share your work experience to help other migrant workers make informed decisions. 
            Your responses are anonymous and help build a safer work environment for everyone.
          </p>
          <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
            <strong>Note:</strong> This form collects factual information about work conditions. 
            All information is provided anonymously.
          </p>
        </div>

        {!submitted ? (
          <div className="card">
            <form onSubmit={handleSubmit} className="review-form">
              <div className="form-group">
                <label htmlFor="company-name" className="form-label">
                  Company Name <span className="required">*</span>
                </label>
                <input
                  id="company-name"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter the company name"
                  className="form-input"
                  required
                  disabled={isSubmitting}
                />
                <p className="form-hint">
                  Please enter the full company name as it appears on official documents
                </p>
              </div>

              <div className="questions-section">
                <h2 className="questions-title">Work Experience Questions</h2>
                <p className="questions-subtitle">
                  Please answer these questions based on your personal work experience
                </p>

                {questions.map((question, index) => (
                  <div key={question.id} className="question-group">
                    <label className="question-label">
                      {index + 1}. {question.text} <span className="required">*</span>
                    </label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name={question.id}
                          value="yes"
                          checked={answers[question.id] === 'yes'}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          disabled={isSubmitting}
                          required
                        />
                        <span>Yes</span>
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name={question.id}
                          value="no"
                          checked={answers[question.id] === 'no'}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          disabled={isSubmitting}
                          required
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn"
                  disabled={isSubmitting || !companyName.trim() || !answers.question1 || !answers.question2}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="card success-card">
            <div className="success-content">
              <div className="success-icon">✓</div>
              <h2>Thank You!</h2>
              <p>
                Your review has been submitted successfully. Your feedback helps other migrant workers 
                make informed decisions about their employment.
              </p>
              <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem' }}>
                All submissions are anonymous and help build a safer work environment for everyone.
              </p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/reviews">
                  <button className="btn">View All Reviews</button>
                </Link>
                <button onClick={handleReset} className="btn btn-secondary">
                  Submit Another Review
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
