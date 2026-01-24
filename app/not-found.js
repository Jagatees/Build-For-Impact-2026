import Link from 'next/link'

export default function NotFound() {
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
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h1 style={{ fontSize: '6rem', marginBottom: '1rem', color: '#667eea' }}>404</h1>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#333' }}>
            Page Not Found
          </h2>
          <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
            Oops! The page you're looking for doesn't exist.
          </p>
          <Link href="/">
            <button className="btn">Go Back Home</button>
          </Link>
        </div>
      </div>
    </div>
  )
}
