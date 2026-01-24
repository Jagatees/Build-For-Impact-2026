import './globals.css'

export const metadata = {
  title: 'Build For Impact',
  description: 'A simple Next.js website',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
