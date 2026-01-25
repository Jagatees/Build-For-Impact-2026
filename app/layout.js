import './globals.css'

export const metadata = {
  title: 'MigrantBuddie',
  description: 'MigrantBuddie - Your 24/7 companion for employment advice, contract checks, and community support',
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
    shortcut: '/logo.jpg',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
        <link rel="shortcut icon" href="/logo.jpg" type="image/jpeg" />
      </head>
      <body>{children}</body>
    </html>
  )
}
