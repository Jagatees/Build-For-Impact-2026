'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  return (
    <header className="navbar">
      <div className="nav-container">
        <Link href="/" className="brand-logo">
          <div className="logo-wrapper">
            <Image 
              src="/logo.png" 
              alt="AbangSG Logo" 
              width={40} 
              height={40} 
              className="logo-img"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          </div>
          <span className="brand-name">AbangSG</span>
        </Link>

        <nav className="nav-links">
          <Link href="/chat" className={`nav-item ${pathname === '/chat' ? 'active' : ''}`}>AI Chat</Link>
          <Link href="/document-chat" className={`nav-item ${pathname === '/document-chat' ? 'active' : ''}`}>Document Chat</Link>
          <Link href="/voice-chat" className={`nav-item ${pathname === '/voice-chat' ? 'active' : ''}`}>Voice</Link>
          <Link href="/video-chat" className={`nav-item ${pathname === '/video-chat' ? 'active' : ''}`}>Video</Link>
          <Link href="/reviews" className={`nav-item ${pathname === '/reviews' ? 'active' : ''}`}>Reviews</Link>
        </nav>

        <div className="nav-cta">
          <Link href="/chat" className="btn-small">Get Help</Link>
        </div>
      </div>
    </header>
  )
}
