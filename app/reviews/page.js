'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('score') // recent, score, name
  const [expandedCompany, setExpandedCompany] = useState(null)
  const [userAnswers, setUserAnswers] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Load reviews from API
    const fetchReviews = async () => {
      try {
        const response = await fetch('/api/reviews')
        const data = await response.json()
        if (data.reviews) {
          setReviews(data.reviews)
        }
      } catch (error) {
        console.error('Error fetching reviews:', error)
      }
    }
    fetchReviews()
  }, [])

  // Group reviews by company name
  const groupedByCompany = reviews.reduce((acc, review) => {
    const companyName = review.companyName
    if (!acc[companyName]) {
      acc[companyName] = []
    }
    acc[companyName].push(review)
    return acc
  }, {})

  // Calculate overall position score for a company
  const calculateCompanyPositionScore = (companyReviews) => {
    if (!companyReviews || companyReviews.length === 0) return null

    let totalYes = 0
    let totalNo = 0

    companyReviews.forEach(review => {
      review.questions.forEach(question => {
        if (question.answer === 'yes') {
          totalYes++
        } else if (question.answer === 'no') {
          totalNo++
        }
      })
    })

    const totalAnswers = totalYes + totalNo
    if (totalAnswers === 0) return null

    // Position score: percentage of "yes" answers
    const score = Math.round((totalYes / totalAnswers) * 100)
    return score
  }

  const handleAnswerChange = (questionId, value) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleSubmitAnswers = async (companyName) => {
    if (!userAnswers.question1 || !userAnswers.question2) {
      alert('Please answer both questions')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: companyName,
          answers: userAnswers,
          questions: questions
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit answers')
      }

      // Refresh reviews
      const refreshResponse = await fetch('/api/reviews')
      const refreshData = await refreshResponse.json()
      if (refreshData.reviews) {
        setReviews(refreshData.reviews)
      }

      // Reset form
      setUserAnswers({})
      alert('Your answers have been submitted! The position score has been updated.')
    } catch (error) {
      console.error('Error submitting answers:', error)
      alert('Failed to submit answers. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleCompany = (companyName) => {
    if (expandedCompany === companyName) {
      setExpandedCompany(null)
      setUserAnswers({})
    } else {
      setExpandedCompany(companyName)
      setUserAnswers({})
    }
  }

  // Get list of companies with their scores
  const companiesList = Object.keys(groupedByCompany)
    .filter(companyName => 
      companyName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .map(companyName => ({
      name: companyName,
      reviews: groupedByCompany[companyName],
      score: calculateCompanyPositionScore(groupedByCompany[companyName])
    }))
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      } else if (sortBy === 'score') {
        const scoreA = a.score || 0
        const scoreB = b.score || 0
        return scoreB - scoreA
      } else {
        // recent - sort by most recent review
        const dateA = new Date(a.reviews[a.reviews.length - 1].timestamp)
        const dateB = new Date(b.reviews[b.reviews.length - 1].timestamp)
        return dateB - dateA
      }
    })

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
            <li><Link href="/faq">FAQ</Link></li>
            <li><Link href="/company-review">Company Review</Link></li>
            <li><Link href="/reviews">View Reviews</Link></li>
          </ul>
        </div>
      </nav>

      <div className="container">
        <div className="card">
          <h1>Company Reviews</h1>
          <p>
            View companies and their position scores. Click on a company to see details and 
            add your own answers. Your answers will update the overall position score.
          </p>
        </div>

        <div className="card">
          <div className="reviews-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search by company name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ maxWidth: '400px' }}
              />
            </div>
            <div className="sort-box">
              <label htmlFor="sort-select" style={{ marginRight: '0.5rem', fontWeight: 500 }}>
                Sort by:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-input"
                style={{ width: 'auto' }}
              >
                <option value="score">Position Score</option>
                <option value="recent">Most Recent</option>
                <option value="name">Company Name</option>
              </select>
            </div>
          </div>
        </div>

        {companiesList.length === 0 ? (
          <div className="card">
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '1rem' }}>
                {searchTerm ? 'No companies found matching your search.' : 'No reviews yet.'}
              </p>
              <Link href="/company-review">
                <button className="btn">Submit the First Review</button>
              </Link>
            </div>
          </div>
        ) : (
          companiesList.map((company) => {
            const isExpanded = expandedCompany === company.name
            const reviewCount = company.reviews.length

            return (
              <div key={company.name} className="card company-card">
                <div 
                  className="company-header"
                  onClick={() => toggleCompany(company.name)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="company-header-content">
                    <h2 className="company-name">{company.name}</h2>
                    <p className="company-meta">
                      {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                  <div className="company-header-right">
                    {company.score !== null && (
                      <div className={`position-score-badge score-${company.score >= 70 ? 'high' : company.score >= 40 ? 'medium' : 'low'}`}>
                        <div className="score-label-small">Position Score</div>
                        <div className="score-value-small">{company.score}%</div>
                      </div>
                    )}
                    <span className="expand-icon">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="company-details">
                    <div className="company-overview">
                      <h3>Overall Position Score: {company.score !== null ? `${company.score}%` : 'N/A'}</h3>
                      <p className="score-explanation">
                        Based on {company.reviews.length} {company.reviews.length === 1 ? 'review' : 'reviews'}. 
                        This score represents the percentage of positive answers across all reviews.
                      </p>
                    </div>

                    <div className="previous-reviews">
                      <h3>Previous Reviews</h3>
                      {company.reviews.map((review, index) => (
                        <div key={review.id} className="previous-review-item">
                          <div className="review-meta">
                            <span className="review-number">Review #{index + 1}</span>
                            <span className="review-date">
                              {new Date(review.timestamp).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="review-answers">
                            {review.questions.map((question, qIndex) => (
                              <div key={question.id} className="review-answer-item">
                                <span className="question-label">{qIndex + 1}. {question.text}</span>
                                <span className={`answer-badge-small answer-${question.answer}`}>
                                  {question.answer === 'yes' ? '✓ Yes' : '✗ No'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="add-review-section">
                      <h3>Add Your Review</h3>
                      <p className="section-description">
                        Answer these questions based on your experience with {company.name}. 
                        Your answers will be added to the overall position score.
                      </p>
                      <div className="review-form-inline">
                        {questions.map((question, index) => (
                          <div key={question.id} className="question-group-inline">
                            <label className="question-label-inline">
                              {index + 1}. {question.text} <span className="required">*</span>
                            </label>
                            <div className="radio-group">
                              <label className="radio-label">
                                <input
                                  type="radio"
                                  name={`${company.name}_${question.id}`}
                                  value="yes"
                                  checked={userAnswers[question.id] === 'yes'}
                                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                  disabled={isSubmitting}
                                  required
                                />
                                <span>Yes</span>
                              </label>
                              <label className="radio-label">
                                <input
                                  type="radio"
                                  name={`${company.name}_${question.id}`}
                                  value="no"
                                  checked={userAnswers[question.id] === 'no'}
                                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                  disabled={isSubmitting}
                                  required
                                />
                                <span>No</span>
                              </label>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => handleSubmitAnswers(company.name)}
                          className="btn"
                          disabled={isSubmitting || !userAnswers.question1 || !userAnswers.question2}
                          style={{ marginTop: '1rem' }}
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit Your Answers'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
