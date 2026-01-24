import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const reviewsFilePath = path.join(process.cwd(), 'data', 'reviews.json')

// Helper function to read reviews
function readReviews() {
  try {
    if (!fs.existsSync(reviewsFilePath)) {
      // Create directory if it doesn't exist
      const dir = path.dirname(reviewsFilePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      // Create empty JSON file
      fs.writeFileSync(reviewsFilePath, JSON.stringify([], null, 2))
      return []
    }
    const fileContent = fs.readFileSync(reviewsFilePath, 'utf8')
    return JSON.parse(fileContent)
  } catch (error) {
    console.error('Error reading reviews:', error)
    return []
  }
}

// Helper function to write reviews
function writeReviews(reviews) {
  try {
    const dir = path.dirname(reviewsFilePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(reviewsFilePath, JSON.stringify(reviews, null, 2))
    return true
  } catch (error) {
    console.error('Error writing reviews:', error)
    return false
  }
}

// GET - Fetch all reviews
export async function GET() {
  try {
    const reviews = readReviews()
    return NextResponse.json({ reviews })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// POST - Add a new review
export async function POST(request) {
  try {
    const { companyName, answers, questions } = await request.json()

    if (!companyName || !answers) {
      return NextResponse.json(
        { error: 'Company name and answers are required' },
        { status: 400 }
      )
    }

    const reviews = readReviews()

    const newReview = {
      id: Date.now().toString(),
      companyName: companyName.trim(),
      timestamp: new Date().toISOString(),
      questions: questions.map((q, index) => ({
        id: q.id,
        text: q.text,
        answer: answers[q.id],
        votes: {
          helpful: 0,
          notHelpful: 0
        }
      }))
    }

    reviews.push(newReview)
    const success = writeReviews(reviews)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save review' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      review: newReview 
    })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}

// PUT - Update a review (for voting)
export async function PUT(request) {
  try {
    const { reviewId, questionId, voteType } = await request.json()

    if (!reviewId || !questionId || !voteType) {
      return NextResponse.json(
        { error: 'Review ID, question ID, and vote type are required' },
        { status: 400 }
      )
    }

    const reviews = readReviews()
    const reviewIndex = reviews.findIndex(r => r.id === reviewId)

    if (reviewIndex === -1) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    const review = reviews[reviewIndex]
    const question = review.questions.find(q => q.id === questionId)

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // Initialize votes if they don't exist
    if (!question.votes) {
      question.votes = { helpful: 0, notHelpful: 0 }
    }

    // Increment the vote
    if (question.votes[voteType] !== undefined) {
      question.votes[voteType] = (question.votes[voteType] || 0) + 1
    }

    reviews[reviewIndex] = review
    const success = writeReviews(reviews)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update review' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      review: review 
    })
  } catch (error) {
    console.error('Error updating review:', error)
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    )
  }
}
