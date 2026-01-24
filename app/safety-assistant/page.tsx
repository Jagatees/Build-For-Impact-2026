import Link from 'next/link'
import SeaLionChat from '../../components/SeaLionChat'

export default function SafetyAssistantPage() {
  return (
    <div>
      <nav className="bg-white shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h2 className="text-xl font-bold text-gray-800">Build For Impact</h2>
            <ul className="flex gap-6 list-none">
              <li>
                <Link href="/" className="text-gray-600 hover:text-blue-600 font-medium">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/chat" className="text-gray-600 hover:text-blue-600 font-medium">
                  Chat
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-600 hover:text-blue-600 font-medium">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/safety" className="text-gray-600 hover:text-blue-600 font-medium">
                  Safety Inspector
                </Link>
              </li>
              <li>
                <Link href="/safety-assistant" className="text-blue-600 font-medium">
                  Safety Assistant
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Safety Assistant
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get instant safety advice and guidance. Ask questions about workplace hazards, 
              safety procedures, or how to handle dangerous situations.
            </p>
          </div>

          <SeaLionChat />
        </div>
      </div>
    </div>
  )
}
