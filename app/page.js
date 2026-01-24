import Link from 'next/link'

export default function Home() {
  return (
    <div className="home-page">
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

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Empowering Migrant Workers in Singapore
          </h1>
          <p className="hero-subtitle">
            Your trusted platform for employment rights, legal support, and community reviews. 
            Get the information and assistance you need to navigate your work journey safely.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">How We Help</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3 className="feature-title">AI Chat Assistant</h3>
              <p className="feature-description">
                Get instant answers to your questions about employment rights, contracts, 
                and legal support. Our AI assistant is available 24/7 to help you.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <h3 className="feature-title">Comprehensive FAQ</h3>
              <p className="feature-description">
                Learn about your rights, identify problematic contract clauses, and find 
                support resources. Everything you need to know in one place.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⭐</div>
              <h3 className="feature-title">Company Reviews</h3>
              <p className="feature-description">
                Share your work experience and view position scores for companies. 
                Help other workers make informed decisions about their employment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">AI Support Available</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">100%</div>
              <div className="stat-label">Anonymous Reviews</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">Free</div>
              <div className="stat-label">For All Workers</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Get Started?</h2>
            <p className="cta-description">
              Join our community and access the resources you need to protect your rights 
              and make informed employment decisions.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
