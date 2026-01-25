'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Navigation() {
  const pathname = usePathname()
  // Optional: State to handle image error fallback if needed
  const [imageError, setImageError] = useState(false)

  return (
    <>
      <header className="navbar">
        <div className="nav-container">
          {/* LOGO SECTION */}
          <Link href="/" className="brand-logo">
            <div className="logo-wrapper">
              {!imageError ? (
                <Image 
                  src="/logo.jpg"    // This looks for public/logo.png
                  alt="AbangSG Logo" 
                  width={40} 
                  height={40} 
                  className="logo-img"
                  onError={() => setImageError(true)}
                  priority // Loads image faster since it's in the header
                />
              ) : (
                // Fallback emoji if logo.png is missing
                <span style={{ fontSize: '24px' }}>🤝</span> 
              )}
            </div>
            <span className="brand-name">AbangSG</span>
          </Link>

          {/* NAV LINKS */}
          <nav className="nav-links">
            <Link href="/chat" className={`nav-item ${pathname === '/chat' ? 'active' : ''}`}>AI Chat</Link>
            <Link href="/document-chat" className={`nav-item ${pathname === '/document-chat' ? 'active' : ''}`}>Document Chat</Link>
            <Link href="/voice-chat" className={`nav-item ${pathname === '/voice-chat' ? 'active' : ''}`}>Voice</Link>
            <Link href="/video-chat" className={`nav-item ${pathname === '/video-chat' ? 'active' : ''}`}>Video</Link>
            <Link href="/reviews" className={`nav-item ${pathname === '/reviews' ? 'active' : ''}`}>Reviews</Link>
          </nav>

          {/* CTA BUTTON */}
          <div className="nav-cta">
            <Link href="/chat" className="btn-small">Get Help</Link>
          </div>
        </div>
      </header>

      {/* STYLES (Scoped to this component) */}
      <style jsx>{`
        /* NAVBAR CONTAINER */
        .navbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #e2e8f0;
          width: 100%;
        }

        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0.8rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        /* LOGO STYLES */
        .brand-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .logo-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9; /* Light grey placeholder background */
        }

        .logo-img {
          object-fit: cover;
        }

        .brand-name {
          font-weight: 800;
          font-size: 1.25rem;
          color: #1E293B; /* Slate-800 */
          letter-spacing: -0.5px;
        }

        /* NAVIGATION LINKS */
        .nav-links {
          display: flex;
          gap: 2rem;
        }

        .nav-item {
          text-decoration: none;
          color: #64748B; /* Slate-500 */
          font-weight: 500;
          font-size: 0.95rem;
          transition: color 0.2s, font-weight 0.2s;
          position: relative;
        }

        .nav-item:hover {
          color: #2563EB; /* Primary Blue */
        }

        .nav-item.active {
          color: #2563EB;
          font-weight: 600;
        }
        
        /* Active underline dot */
        .nav-item.active::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background: #2563EB;
          border-radius: 50%;
        }

        /* BUTTONS */
        .nav-cta {
          display: none;
        }

        .btn-small {
          background: #1E293B;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 600;
          transition: background 0.2s, transform 0.1s;
        }

        .btn-small:hover {
          background: black;
          transform: translateY(-1px);
        }

        /* RESPONSIVE */
        @media (min-width: 768px) {
          .nav-cta {
            display: block;
          }
        }

        @media (max-width: 768px) {
          .nav-links {
            display: none; /* In a real app, you'd want a hamburger menu here */
          }
        }
      `}</style>
    </>
  )
}