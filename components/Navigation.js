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
    <header className="navbar">
      <div className="nav-container">
        {/* LOGO SECTION */}
        <Link href="/" className="brand-logo">
          <div className="logo-wrapper">
            {!imageError ? (
              <Image 
                src="/logo.jpg"    // This looks for public/logo.jpg
                alt="MigrantBuddie Logo" 
                width={40} 
                height={40} 
                className="logo-img"
                onError={() => setImageError(true)}
                priority // Loads image faster since it's in the header
              />
            ) : (
              // Fallback emoji if logo.jpg is missing
              <span style={{ fontSize: '24px' }}>🤝</span> 
            )}
          </div>
          <span className="brand-name">MigrantBuddie</span>
        </Link>

        <nav className="nav-links">
          <Link href="/abangchat" className={`nav-item ${pathname === '/abangchat' ? 'active' : ''}`}>Text</Link>
          <Link href="/abangvoice" className={`nav-item ${pathname === '/abangvoice' ? 'active' : ''}`}>Voice</Link>
          <Link href="/abangvideo" className={`nav-item ${pathname === '/abangvideo' ? 'active' : ''}`}>Video</Link>
          <Link href="/document-chat" className={`nav-item ${pathname === '/document-chat' ? 'active' : ''}`}>Document</Link>
          <Link href="/abangreview" className={`nav-item ${pathname === '/abangreview' ? 'active' : ''}`}>Reviews</Link>
        </nav>
      </div>
    </header>
  )
}
