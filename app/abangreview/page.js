'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

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

// Original English text content
const originalTexts = {
  pageTitle: 'Company Reviews',
  pageDescription: 'View companies and their position scores. Click on a company to see details and add your own answers. Your answers will update the overall position score.',
  searchPlaceholder: 'Search by company name...',
  sortBy: 'Sort by:',
  positionScore: 'Position Score',
  mostRecent: 'Most Recent',
  companyName: 'Company Name',
  noCompaniesFound: 'No companies found matching your search.',
  noReviewsYet: 'No reviews yet.',
  submitFirstReview: 'Submit the First Review',
  reviews: 'reviews',
  review: 'review',
  overallPositionScore: 'Overall Position Score:',
  basedOn: 'Based on',
  thisScoreRepresents: 'This score represents the percentage of positive answers across all reviews.',
  previousReviews: 'Previous Reviews',
  reviewNumber: 'Review #',
  addYourReview: 'Add Your Review',
  answerBasedOn: 'Answer these questions based on your experience with',
  yourAnswersWillBeAdded: 'Your answers will be added to the overall position score.',
  yes: 'Yes',
  no: 'No',
  submitting: 'Submitting...',
  submitYourAnswers: 'Submit Your Answers',
  pleaseAnswerBoth: 'Please answer both questions',
  answersSubmitted: 'Your answers have been submitted! The position score has been updated.',
  failedToSubmit: 'Failed to submit answers. Please try again.'
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('score') // recent, score, name
  const [expandedCompany, setExpandedCompany] = useState(null)
  const [userAnswers, setUserAnswers] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [translatedTexts, setTranslatedTexts] = useState(originalTexts)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translatedQuestions, setTranslatedQuestions] = useState(questions)

  // Translation function using Sea Lion API
  const translateText = async (text, targetLang) => {
    if (targetLang === 'en' || !text) return text

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Translate the following text to ${languages.find(l => l.code === targetLang)?.name || 'the selected language'}. Only return the translation, nothing else:\n\n${text}`,
          language: targetLang,
          conversationHistory: []
        })
      })

      const data = await response.json()
      return data.message || text
    } catch (error) {
      console.error('Translation error:', error)
      return text
    }
  }

  // Translate all texts when language changes
  useEffect(() => {
    const translateAllTexts = async () => {
      if (selectedLanguage === 'en') {
        setTranslatedTexts(originalTexts)
        setTranslatedQuestions(questions)
        setIsTranslating(false)
        return
      }

      setIsTranslating(true)
      try {
        // Translate all text keys
        const translated = {}
        for (const [key, value] of Object.entries(originalTexts)) {
          translated[key] = await translateText(value, selectedLanguage)
        }
        setTranslatedTexts(translated)

        // Translate questions
        const translatedQ = await Promise.all(
          questions.map(async (q) => ({
            ...q,
            text: await translateText(q.text, selectedLanguage)
          }))
        )
        setTranslatedQuestions(translatedQ)
        
        // Only stop loading after all translations are complete
        setIsTranslating(false)
      } catch (error) {
        console.error('Error translating texts:', error)
        // On error, still stop loading and use original texts
        setTranslatedTexts(originalTexts)
        setTranslatedQuestions(questions)
        setIsTranslating(false)
      }
    }

    translateAllTexts()
  }, [selectedLanguage])

  // Translate review questions from stored reviews
  const translateReviewQuestion = async (questionText) => {
    if (selectedLanguage === 'en' || !questionText) return questionText
    try {
      return await translateText(questionText, selectedLanguage)
    } catch (error) {
      return questionText
    }
  }

  // Memoize translated reviews to avoid re-translating on every render
  const [translatedReviews, setTranslatedReviews] = useState([])
  const [reviewsTranslating, setReviewsTranslating] = useState(false)
  
  useEffect(() => {
    const translateStoredReviews = async () => {
      if (selectedLanguage === 'en') {
        setTranslatedReviews(reviews)
        setReviewsTranslating(false)
        return
      }

      if (reviews.length === 0) {
        setTranslatedReviews([])
        setReviewsTranslating(false)
        return
      }

      setReviewsTranslating(true)
      try {
        const translated = await Promise.all(
          reviews.map(async (review) => ({
            ...review,
            questions: await Promise.all(
              review.questions.map(async (q) => ({
                ...q,
                text: await translateReviewQuestion(q.text)
              }))
            )
          }))
        )
        setTranslatedReviews(translated)
        setReviewsTranslating(false)
      } catch (error) {
        console.error('Error translating reviews:', error)
        setTranslatedReviews(reviews)
        setReviewsTranslating(false)
      }
    }

    translateStoredReviews()
  }, [selectedLanguage, reviews])
  
  // Combined loading state - only false when both UI texts and reviews are translated
  const isLoading = isTranslating || reviewsTranslating

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

  // Group reviews by company name (use translated reviews if available)
  const reviewsToUse = translatedReviews.length > 0 ? translatedReviews : reviews
  const groupedByCompany = reviewsToUse.reduce((acc, review) => {
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
      alert(translatedTexts.pleaseAnswerBoth)
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
        throw new Error(data.error || translatedTexts.failedToSubmit)
      }

      // Refresh reviews
      const refreshResponse = await fetch('/api/reviews')
      const refreshData = await refreshResponse.json()
      if (refreshData.reviews) {
        setReviews(refreshData.reviews)
      }

      // Reset form
      setUserAnswers({})
      alert(translatedTexts.answersSubmitted)
    } catch (error) {
      console.error('Error submitting answers:', error)
      alert(translatedTexts.failedToSubmit)
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
      <Navigation />

      <div className="container">
        <div className="card">
          <h1>
            {isLoading ? (
              <span className="skeleton-text" style={{ display: 'inline-block', width: '250px', height: '2.5rem', borderRadius: '4px' }}></span>
            ) : (
              translatedTexts.pageTitle
            )}
          </h1>
          <p>
            {isLoading ? (
              <>
                <span className="skeleton-text" style={{ display: 'inline-block', width: '100%', height: '1.2rem', borderRadius: '4px', marginBottom: '0.5rem' }}></span>
                <span className="skeleton-text" style={{ display: 'inline-block', width: '80%', height: '1.2rem', borderRadius: '4px' }}></span>
              </>
            ) : (
              translatedTexts.pageDescription
            )}
          </p>
        </div>

        <div className="card">
          <div className="reviews-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder={isLoading ? '' : translatedTexts.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ maxWidth: '400px' }}
                disabled={isLoading}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label htmlFor="language-select-reviews" className="language-label" style={{ fontWeight: 500, color: '#333' }}>
                  Language:
                </label>
                <select
                  id="language-select-reviews"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="language-dropdown"
                  disabled={isLoading}
                  style={{ 
                    background: isLoading ? '#f5f5f5' : 'white',
                    color: isLoading ? '#999' : '#333'
                  }}
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
                {isLoading && (
                  <span style={{ color: '#FFA500', fontSize: '0.9rem' }}>Translating...</span>
                )}
              </div>
              <div className="sort-box">
                <label htmlFor="sort-select" style={{ marginRight: '0.5rem', fontWeight: 500 }}>
                  {isLoading ? (
                    <span className="skeleton-text" style={{ display: 'inline-block', width: '60px', height: '1rem', borderRadius: '4px' }}></span>
                  ) : (
                    translatedTexts.sortBy
                  )}
                </label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="form-input"
                  style={{ width: 'auto' }}
                  disabled={isLoading}
                >
                  <option value="score">{isLoading ? '...' : translatedTexts.positionScore}</option>
                  <option value="recent">{isLoading ? '...' : translatedTexts.mostRecent}</option>
                  <option value="name">{isLoading ? '...' : translatedTexts.companyName}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {companiesList.length === 0 ? (
          <div className="card">
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '1rem' }}>
                {searchTerm ? translatedTexts.noCompaniesFound : translatedTexts.noReviewsYet}
              </p>
              <Link href="/company-review">
                <button className="btn">{translatedTexts.submitFirstReview}</button>
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
                      {isLoading ? (
                        <span className="skeleton-text" style={{ display: 'inline-block', width: '120px', height: '1rem', borderRadius: '4px' }}></span>
                      ) : (
                        `${reviewCount} ${reviewCount === 1 ? translatedTexts.review : translatedTexts.reviews}`
                      )}
                    </p>
                  </div>
                  <div className="company-header-right">
                    {company.score !== null && (
                      <div className={`position-score-badge score-${company.score >= 70 ? 'high' : company.score >= 40 ? 'medium' : 'low'}`}>
                        <div className="score-label-small">
                          {isLoading ? (
                            <span className="skeleton-text" style={{ display: 'inline-block', width: '100px', height: '0.75rem', borderRadius: '4px' }}></span>
                          ) : (
                            translatedTexts.positionScore
                          )}
                        </div>
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
                      <h3>
                        {isLoading ? (
                          <span className="skeleton-text" style={{ display: 'inline-block', width: '300px', height: '1.8rem', borderRadius: '4px' }}></span>
                        ) : (
                          `${translatedTexts.overallPositionScore} ${company.score !== null ? `${company.score}%` : 'N/A'}`
                        )}
                      </h3>
                      <p className="score-explanation">
                        {isLoading ? (
                          <>
                            <span className="skeleton-text" style={{ display: 'inline-block', width: '100%', height: '1rem', borderRadius: '4px', marginBottom: '0.5rem' }}></span>
                            <span className="skeleton-text" style={{ display: 'inline-block', width: '90%', height: '1rem', borderRadius: '4px' }}></span>
                          </>
                        ) : (
                          `${translatedTexts.basedOn} ${company.reviews.length} ${company.reviews.length === 1 ? translatedTexts.review : translatedTexts.reviews}. ${translatedTexts.thisScoreRepresents}`
                        )}
                      </p>
                    </div>

                    <div className="previous-reviews">
                      <h3>
                        {isLoading ? (
                          <span className="skeleton-text" style={{ display: 'inline-block', width: '180px', height: '1.5rem', borderRadius: '4px' }}></span>
                        ) : (
                          translatedTexts.previousReviews
                        )}
                      </h3>
                      {company.reviews.map((review, index) => (
                        <div key={review.id} className="previous-review-item">
                          <div className="review-meta">
                            <span className="review-number">
                              {isLoading ? (
                                <span className="skeleton-text" style={{ display: 'inline-block', width: '100px', height: '0.9rem', borderRadius: '4px' }}></span>
                              ) : (
                                `${translatedTexts.reviewNumber}${index + 1}`
                              )}
                            </span>
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
                                <span className="question-label">
                                  {isLoading ? (
                                    <span className="skeleton-text" style={{ display: 'inline-block', width: '100%', height: '1rem', borderRadius: '4px' }}></span>
                                  ) : (
                                    `${qIndex + 1}. ${question.text}`
                                  )}
                                </span>
                                <span className={`answer-badge-small answer-${question.answer}`}>
                                  {isLoading ? (
                                    <span className="skeleton-text" style={{ display: 'inline-block', width: '60px', height: '1.5rem', borderRadius: '4px' }}></span>
                                  ) : (
                                    question.answer === 'yes' ? `✓ ${translatedTexts.yes}` : `✗ ${translatedTexts.no}`
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="add-review-section">
                      <h3>
                        {isLoading ? (
                          <span className="skeleton-text" style={{ display: 'inline-block', width: '200px', height: '1.5rem', borderRadius: '4px' }}></span>
                        ) : (
                          translatedTexts.addYourReview
                        )}
                      </h3>
                      <p className="section-description">
                        {isLoading ? (
                          <>
                            <span className="skeleton-text" style={{ display: 'inline-block', width: '100%', height: '1rem', borderRadius: '4px', marginBottom: '0.5rem' }}></span>
                            <span className="skeleton-text" style={{ display: 'inline-block', width: '85%', height: '1rem', borderRadius: '4px' }}></span>
                          </>
                        ) : (
                          `${translatedTexts.answerBasedOn} ${company.name}. ${translatedTexts.yourAnswersWillBeAdded}`
                        )}
                      </p>
                      <div className="review-form-inline">
                        {translatedQuestions.map((question, index) => (
                          <div key={question.id} className="question-group-inline">
                            <label className="question-label-inline">
                              {isLoading ? (
                                <span className="skeleton-text" style={{ display: 'inline-block', width: '100%', height: '1.2rem', borderRadius: '4px', marginBottom: '0.75rem' }}></span>
                              ) : (
                                <>
                                  {index + 1}. {question.text} <span className="required">*</span>
                                </>
                              )}
                            </label>
                            {!isLoading && (
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
                                  <span>{translatedTexts.yes}</span>
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
                                  <span>{translatedTexts.no}</span>
                                </label>
                              </div>
                            )}
                            {isLoading && (
                              <div className="radio-group" style={{ marginTop: '0.75rem' }}>
                                <span className="skeleton-text" style={{ display: 'inline-block', width: '80px', height: '1.5rem', borderRadius: '4px', marginRight: '1rem' }}></span>
                                <span className="skeleton-text" style={{ display: 'inline-block', width: '80px', height: '1.5rem', borderRadius: '4px' }}></span>
                              </div>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => handleSubmitAnswers(company.name)}
                          className="btn"
                          disabled={isSubmitting || !userAnswers.question1 || !userAnswers.question2 || isLoading}
                          style={{ marginTop: '1rem' }}
                        >
                          {isLoading ? (
                            <span className="skeleton-text" style={{ display: 'inline-block', width: '150px', height: '1.2rem', borderRadius: '4px' }}></span>
                          ) : (
                            isSubmitting ? translatedTexts.submitting : translatedTexts.submitYourAnswers
                          )}
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
