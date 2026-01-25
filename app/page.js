'use client'

import Link from 'next/link'
import Navigation from '@/components/Navigation'

export default function Home() {
  return (
    <div className="landing-page">
      
      {/* --- NAVIGATION --- */}
      <Navigation />

      {/* --- HERO SECTION --- */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">🤝 For Migrant Workers in SG</div>
          <h1 className="hero-title">
            Your Safety, Your Rights, <br />
            <span className="highlight">Our Priority.</span>
          </h1>
          <p className="hero-subtitle">
            AbangSG is your 24/7 companion for employment advice, contract checks, and community support. 
            We bridge the gap between you and the help you need.
          </p>
          <div className="hero-buttons">
            <Link href="/abangchat" className="btn-primary">
              Chat with AbangSG
            </Link>
          </div>
          
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-num">50k+</span>
              <span className="stat-label">Questions Answered</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-num">24/7</span>
              <span className="stat-label">AI Support</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-num">100%</span>
              <span className="stat-label">Private & Safe</span>
            </div>
          </div>
        </div>
        
        {/* Abstract Shapes for Visual Interest */}
        <div className="hero-shape shape-1"></div>
        <div className="hero-shape shape-2"></div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section className="features">
        <div className="section-header">
          <h2>How We Empower You</h2>
          <p>Tools designed to protect your livelihood and well-being.</p>
        </div>

        <div className="features-grid">
          {/* Card 1 */}
          <div className="feature-card">
            <div className="icon-box blue">💬</div>
            <h3>AI Legal Assistant</h3>
            <p>
              Instantly check if your contract terms are legal. Ask questions about salary, 
              hours, and safety in your native language.
            </p>
            <Link href="/abangchat" className="card-link">Start Chat &rarr;</Link>
          </div>

          {/* Card 2 */}
          <div className="feature-card">
            <div className="icon-box orange">🗣️</div>
            <h3>Voice Support</h3>
            <p>
              Don't like typing? Just speak. Our AI understands Tamil, Bengali, Mandarin, 
              Malay, and more.
            </p>
            <Link href="/abangvoice" className="card-link">Use Voice &rarr;</Link>
          </div>

          {/* Card 3 */}
          <div className="feature-card">
            <div className="icon-box red">⭐</div>
            <h3>Company Reviews</h3>
            <p>
              See what other workers say about an employer before you sign. 
              Share your own experience anonymously.
            </p>
            <Link href="/abangreview" className="card-link">Check Reviews &rarr;</Link>
          </div>
        </div>
      </section>

      {/* --- CALL TO ACTION --- */}
      <section className="cta-section">
        <div className="cta-container">
          <h2>Never Walk Alone</h2>
          <p>Join thousands of brothers and sisters using AbangSG today.</p>
          <Link href="/abangchat" className="btn-white">Launch Assistant</Link>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="footer">
        <div className="footer-content">
          <p>&copy; {new Date().getFullYear()} AbangSG. Built for impact.</p>
        </div>
      </footer>

      {/* --- STYLES --- */}
      <style jsx global>{`
        /* RESET & BASICS */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, sans-serif; background: linear-gradient(180deg, #FFE4B5 0%, #FFEDD5 50%, #FFFFFF 100%); color: #1a202c; }

        /* VARIABLES */
        :root {
          --primary: #FFA500; /* Vibrant Orange */
          --primary-dark: #FF8C00;
          --accent: #F97316; /* Warm Orange */
          --bg-soft: #FFF7ED; /* Light Cream Orange */
          --text-main: #1E293B;
          --text-muted: #64748B;
        }

        .landing-page { overflow-x: hidden; }

        /* NAVBAR */
        .navbar {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #e2e8f0;
        }
        .nav-container {
          max-width: 1200px; margin: 0 auto; padding: 1rem 2rem;
          display: flex; justify-content: space-between; align-items: center;
        }
        .brand-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .logo-wrapper { border-radius: 8px; overflow: hidden; display: flex; }
        .brand-name { font-weight: 800; font-size: 1.25rem; color: var(--text-main); letter-spacing: -0.5px; }
        
        .nav-links { display: flex; gap: 2rem; }
        .nav-item { 
          text-decoration: none; color: var(--text-muted); font-weight: 500; font-size: 0.95rem; 
          transition: color 0.2s;
        }
        .nav-item:hover, .nav-item.active { color: var(--primary); }
        .nav-cta { display: none; } /* Hidden on mobile */
        @media (min-width: 768px) { .nav-cta { display: block; } }

        /* BUTTONS */
        .btn-small {
          background: var(--text-main); color: white; padding: 0.5rem 1rem; border-radius: 6px;
          text-decoration: none; font-size: 0.9rem; font-weight: 600; transition: background 0.2s;
        }
        .btn-small:hover { background: black; }

        .btn-primary {
          background: var(--primary); color: white; padding: 1rem 2rem; border-radius: 50px;
          text-decoration: none; font-weight: 600; box-shadow: 0 4px 14px rgba(255, 165, 0, 0.3);
          transition: transform 0.2s, background 0.2s;
        }
        .btn-primary:hover { background: var(--primary-dark); transform: translateY(-2px); }

        .btn-secondary {
          background: white; color: var(--text-main); padding: 1rem 2rem; border-radius: 50px;
          text-decoration: none; font-weight: 600; border: 1px solid #e2e8f0;
          transition: transform 0.2s, border-color 0.2s;
        }
        .btn-secondary:hover { border-color: var(--text-muted); transform: translateY(-2px); }

        .btn-white {
          background: white; color: var(--primary); padding: 1rem 2.5rem; border-radius: 50px;
          text-decoration: none; font-weight: 700; box-shadow: 0 4px 14px rgba(0,0,0,0.1);
          transition: transform 0.2s;
        }
        .btn-white:hover { transform: scale(1.05); }

        /* HERO SECTION */
        .hero {
          position: relative; padding: 6rem 2rem 4rem;
          background: linear-gradient(180deg, #FFF7ED 0%, #fff 100%);
          text-align: center; overflow: hidden;
        }
        .hero-content { position: relative; z-index: 10; max-width: 800px; margin: 0 auto; }
        .hero-badge {
          display: inline-block; background: #FFEDD5; color: var(--primary); 
          padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600;
          margin-bottom: 1.5rem;
        }
        .hero-title {
          font-size: 3.5rem; line-height: 1.1; font-weight: 800; color: var(--text-main);
          margin-bottom: 1.5rem; letter-spacing: -1px;
        }
        .highlight { color: var(--primary); }
        .hero-subtitle {
          font-size: 1.2rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 2.5rem;
        }
        .hero-buttons { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-bottom: 4rem; }
        
        .hero-stats {
          display: inline-flex; align-items: center; gap: 2rem; padding: 1.5rem 3rem;
          background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);
          border: 1px solid #f1f5f9;
        }
        .stat { display: flex; flex-direction: column; }
        .stat-num { font-weight: 800; font-size: 1.5rem; color: var(--text-main); }
        .stat-label { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-divider { width: 1px; height: 30px; background: #e2e8f0; }

        /* DECORATIVE SHAPES */
        .hero-shape {
          position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.6; z-index: 0;
        }
        .shape-1 { width: 400px; height: 400px; background: #FFEDD5; top: -100px; left: -100px; }
        .shape-2 { width: 300px; height: 300px; background: #FFF4E6; bottom: 50px; right: -50px; }

        /* FEATURES SECTION */
        .features { padding: 5rem 2rem; background: #fff; }
        .section-header { text-align: center; margin-bottom: 4rem; max-width: 600px; margin-left: auto; margin-right: auto; }
        .section-header h2 { font-size: 2.5rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem; }
        .section-header p { color: var(--text-muted); font-size: 1.1rem; }

        .features-grid {
          max-width: 1200px; margin: 0 auto; display: grid; gap: 2rem;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        }
        .feature-card {
          padding: 2.5rem; border-radius: 16px; border: 1px solid #f1f5f9; background: white;
          transition: all 0.3s ease; cursor: default;
        }
        .feature-card:hover {
          transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.08); border-color: transparent;
        }
        .icon-box {
          width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; margin-bottom: 1.5rem;
        }
        .icon-box.blue { background: #FFF7ED; }
        .icon-box.orange { background: #FFEDD5; }
        .icon-box.red { background: #FFE4D6; }

        .feature-card h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-main); }
        .feature-card p { color: var(--text-muted); line-height: 1.6; margin-bottom: 1.5rem; }
        .card-link { text-decoration: none; color: var(--primary); font-weight: 600; font-size: 0.95rem; }
        .card-link:hover { text-decoration: underline; }

        /* CTA SECTION */
        .cta-section { padding: 5rem 2rem; text-align: center; }
        .cta-container {
          max-width: 1000px; margin: 0 auto; background: var(--primary); color: white;
          padding: 4rem 2rem; border-radius: 24px;
          background-image: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
        }
        .cta-container h2 { font-size: 2.5rem; font-weight: 800; margin-bottom: 1rem; }
        .cta-container p { font-size: 1.2rem; opacity: 0.9; margin-bottom: 2.5rem; }

        /* FOOTER */
        .footer { padding: 2rem; background: #F8FAFC; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer p { color: var(--text-muted); font-size: 0.9rem; }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .hero-title { font-size: 2.5rem; }
          .nav-links { display: none; } /* Simplified mobile nav for now */
          .hero-stats { flex-direction: column; gap: 1rem; width: 100%; }
          .stat-divider { display: none; }
        }
      `}</style>
    </div>
  )
}