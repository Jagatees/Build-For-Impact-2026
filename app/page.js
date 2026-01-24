import Link from 'next/link'

export default function Home() {
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
            <li><Link href="/safety-assistant">Safety Assistant</Link></li>
          </ul>
        </div>
      </nav>

      <div className="container">
        <div className="card">
          <h1>Welcome to Build For Impact</h1>
          <p>
            A support platform for migrant workers in Singapore. We provide information, 
            resources, and assistance to help you navigate employment, legal, housing, 
            and healthcare matters.
          </p>
          <p>
            Explore our FAQ section to learn about your rights, identify problematic 
            contract clauses, and find support resources. Use the chat feature to get 
            help with your questions. Try our Safety Inspector to analyze workplace 
            photos for potential hazards.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <Link href="/faq">
              <button className="btn">View FAQ</button>
            </Link>
            <Link href="/chat">
              <button className="btn">Get Help</button>
            </Link>
            <Link href="/safety">
              <button className="btn">Safety Inspector</button>
            </Link>
            <Link href="/safety-assistant">
              <button className="btn">Safety Assistant</button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
