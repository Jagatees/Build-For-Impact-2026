'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)

  const faqs = [
    {
      question: 'What is MigrantBuddie?',
      answer: 'MigrantBuddie is a platform that supports migrant workers in Singapore. It provides information, resources, and assistance to help migrant workers navigate employment, legal, housing, and healthcare matters. The platform aims to make support services more accessible and help workers understand their rights and find help when needed.'
    },
    {
      question: 'How do I use the chat feature?',
      answer: 'Navigate to the Chat page using the navigation menu. You can type messages in the input field and click Send. The chat interface will display your messages and provide simulated responses.'
    },
    {
      question: 'What technologies are used in this project?',
      answer: 'This project uses Next.js 14 for the framework, React 18 for the UI library, and JavaScript for the programming language. It follows modern web development best practices.'
    },
    {
      question: 'How do I run this project locally?',
      answer: 'First, install dependencies by running "npm install". Then start the development server with "npm run dev". Open http://localhost:3000 in your browser to view the website.'
    },
    {
      question: 'Can I customize the styling?',
      answer: 'Yes! All styles are in the globals.css file. You can modify colors, fonts, spacing, and other design elements to match your preferences.'
    },
    {
      question: 'Is this project open source?',
      answer: 'This is a template project that you can use and modify as needed. Feel free to customize it for your own purposes.'
    },
    {
      question: 'What challenges do migrant workers face in Singapore?',
      answer: 'Migrant workers play a vital role in Singapore\'s economy, yet many face challenges navigating unfamiliar legal systems, administrative processes, and language barriers after arrival. When dealing with employment disputes, housing, healthcare, or legal matters, access to help often depends on understanding complex forms, procedures, and institutional pathways. While Singapore has established various government services, NGOs, and legal clinics to support migrant workers, these resources are spread across multiple channels and may be difficult to access for individuals with limited English proficiency or digital literacy.'
    },
    {
      question: 'What are red flags in employment contracts?',
      answer: 'Be cautious if your contract includes clauses like: "The employee agrees to repay all placement and administrative costs upon termination," "The employer may deduct any costs incurred from the employee\'s salary," "Wages will be paid when company finances permit," "The employer may terminate employment at any time without notice or compensation," "The employee must give 30 days\' notice, while the employer may terminate immediately," "The employee shall submit passport to employer for safekeeping," "The employee may not leave the premises without permission," "Working hours may be extended as required without additional pay," "Early resignation will incur a penalty of SGD 3,000," or "The employer reserves the right to amend this contract at any time." Many of these clauses may be illegal or unenforceable under Singapore law.'
    },
    {
      question: 'Where can migrant workers get help in Singapore?',
      answer: 'Singapore has various government services, NGOs, and legal clinics to support migrant workers. These include the Ministry of Manpower (MOM) for employment-related issues, migrant worker support organizations, and legal aid clinics. However, these resources may be spread across multiple channels. If you need help, you can contact MOM at 6438 5122, reach out to migrant worker support NGOs, or visit legal clinics that provide free advice. It\'s important to seek help if you encounter unfair treatment or contract violations.'
    },
    {
      question: 'What are my rights as a migrant worker in Singapore?',
      answer: 'Under Singapore law, you have rights including: timely payment of wages, reasonable working hours with proper overtime compensation, safe working conditions, proper accommodation, retention of your passport (employers cannot legally keep it), freedom of movement, proper notice periods for termination, and protection from unfair dismissal. If your contract contains clauses that violate these rights, they may be unenforceable. Always seek advice if you\'re unsure about your rights.'
    },
    {
      question: 'What should I do if I signed a contract with problematic clauses?',
      answer: 'If you\'ve already signed a contract with problematic clauses, don\'t panic. Many unfair contract terms may be illegal or unenforceable under Singapore law, even if you signed them. Document everything, keep copies of your contract and all communications, and seek help from the Ministry of Manpower (MOM) or migrant worker support organizations. You can contact MOM at 6438 5122 or visit their website. Legal aid clinics may also provide free advice. Remember, signing an unfair contract doesn\'t mean you\'ve waived your legal rights.'
    },
    {
      question: 'How does this relate to sustainable development goals?',
      answer: 'Supporting migrant workers aligns with several UN Sustainable Development Goals: SDG 8 (Decent Work and Economic Growth) emphasizes fair labour practices and safe working conditions, SDG 10 (Reduced Inequalities) focuses on inclusive access to information and support regardless of background, and SDG 16 (Peace, Justice and Strong Institutions) promotes equal access to justice through effective and transparent institutions. Strengthening how migrant workers understand and navigate existing systems supports safer employment, reduces structural inequalities, and promotes dignified and sustainable integration into society.'
    }
  ]

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div>
      <Navigation />

      <div className="container">
        <div className="card">
          <h1>Frequently Asked Questions</h1>
          <p>Find answers to common questions about this website.</p>
        </div>

        <div className="faq-container">
          {faqs.map((faq, index) => (
            <div key={index} className="faq-item">
              <button
                className="faq-question"
                onClick={() => toggleFAQ(index)}
                aria-expanded={openIndex === index}
              >
                <span>{faq.question}</span>
                <span className="faq-icon">
                  {openIndex === index ? '−' : '+'}
                </span>
              </button>
              {openIndex === index && (
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
