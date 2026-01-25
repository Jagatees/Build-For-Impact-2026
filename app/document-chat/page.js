'use client'

import Navigation from '@/components/Navigation'

export default function DocumentChat() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #FFE4B5 0%, #FFEDD5 50%, #FFFFFF 100%)', display: 'flex', flexDirection: 'column' }}>
      <Navigation />
      
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: '800', 
            color: '#1E293B',
            marginBottom: '1rem'
          }}>
            Coming Soon
          </h1>
          <p style={{ 
            fontSize: '1.2rem', 
            color: '#64748B',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            We're working on something amazing. Check back soon!
          </p>
        </div>
      </div>
    </div>
  )
}
