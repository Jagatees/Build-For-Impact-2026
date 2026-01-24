'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="modern-home-page">
      {/* Header */}
      <header className="modern-chat-header">
        <div className="header-left">
          <Link href="/" className="logo-link">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#FFA500"/>
                <path d="M8 10h8M8 14h6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="header-title">Assistant Hub</h2>
          </Link>
          <nav className="header-nav">
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/chat" className="nav-link">Chat</Link>
            <Link href="/document-chat" className="nav-link">Document Chat</Link>
            <Link href="/voice-chat" className="nav-link">Voice Chat</Link>
            <Link href="/video-chat" className="nav-link">Video Chat</Link>
            <Link href="/faq" className="nav-link">FAQ</Link>
            <Link href="/company-review" className="nav-link">Company Review</Link>
            <Link href="/reviews" className="nav-link">Reviews</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="modern-home-container">
        {/* Hero Section */}
        <section className="modern-hero-section">
          <div className="modern-hero-content">
            <h1 className="modern-hero-title">
              Empowering Migrant Workers in Singapore
            </h1>
            <p className="modern-hero-subtitle">
              Your trusted platform for employment rights, legal support, and community reviews. 
              Get the information and assistance you need to navigate your work journey safely.
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="modern-features-section">
          <div className="modern-container">
            <h2 className="modern-section-title">How We Help</h2>
            <div className="modern-features-grid">
              <div className="modern-feature-card">
                <div className="modern-feature-icon">💬</div>
                <h3 className="modern-feature-title">AI Chat Assistant</h3>
                <p className="modern-feature-description">
                  Get instant answers to your questions about employment rights, contracts, 
                  and legal support. Our AI assistant is available 24/7 to help you.
                </p>
                <Link href="/chat" className="modern-feature-link">
                  Try Chat →
                </Link>
              </div>

              <div className="modern-feature-card">
                <div className="modern-feature-icon">📚</div>
                <h3 className="modern-feature-title">Comprehensive FAQ</h3>
                <p className="modern-feature-description">
                  Learn about your rights, identify problematic contract clauses, and find 
                  support resources. Everything you need to know in one place.
                </p>
                <Link href="/faq" className="modern-feature-link">
                  View FAQ →
                </Link>
              </div>

              <div className="modern-feature-card">
                <div className="modern-feature-icon">⭐</div>
                <h3 className="modern-feature-title">Company Reviews</h3>
                <p className="modern-feature-description">
                  Share your work experience and view position scores for companies. 
                  Help other workers make informed decisions about their employment.
                </p>
                <Link href="/reviews" className="modern-feature-link">
                  View Reviews →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="modern-stats-section">
          <div className="modern-container">
            <div className="modern-stats-grid">
              <div className="modern-stat-item">
                <div className="modern-stat-number">24/7</div>
                <div className="modern-stat-label">AI Support Available</div>
              </div>
              <div className="modern-stat-item">
                <div className="modern-stat-number">100%</div>
                <div className="modern-stat-label">Anonymous Reviews</div>
              </div>
              <div className="modern-stat-item">
                <div className="modern-stat-number">Free</div>
                <div className="modern-stat-label">For All Workers</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="modern-cta-section">
          <div className="modern-container">
            <div className="modern-cta-content">
              <h2 className="modern-cta-title">Ready to Get Started?</h2>
              <p className="modern-cta-description">
                Join our community and access the resources you need to protect your rights 
                and make informed employment decisions.
              </p>
              <div className="modern-cta-buttons">
                <Link href="/chat" className="modern-cta-button primary">
                  Start Chatting
                </Link>
                <Link href="/faq" className="modern-cta-button secondary">
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
