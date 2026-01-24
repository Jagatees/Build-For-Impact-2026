# Build For Impact

A support platform for migrant workers in Singapore, built with Next.js and React.

## Features

- **Home Page**: Welcome page with navigation
- **Chat Page**: Interactive chat interface at `/chat` powered by SEA-LION v4
- **FAQ Page**: Comprehensive information about migrant worker rights, contract red flags, and support resources
- **Safety Inspector**: AI-powered image analysis tool to identify workplace safety hazards at `/safety`
- **404 Page**: Custom error page for better user experience

## Getting Started

First, install the dependencies:

```bash
npm install
```

### Configure Sea Lion AI API

The app uses a custom Sea Lion AI API endpoint. The default endpoint is:
- **Base URL**: `https://cf-sealion01.jagateesvaran.workers.dev`

You can optionally override this by creating a `.env.local` file:

```env
SEA_LION_API_URL="https://cf-sealion01.jagateesvaran.workers.dev"
```

**API Endpoints:**
- `/chat` - Non-streaming chat completion
- `/stream` - Streaming chat completion (Server-Sent Events)

**⚠️ IMPORTANT SECURITY NOTE**: 
- Never commit your `.env.local` file to GitHub
- The API is called from the backend (API routes), never exposed to the frontend

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the website.

## Pages

- `/` - Home page
- `/chat` - Chat interface page with SEA-LION v4 AI assistant
- `/faq` - FAQ page with information about migrant worker rights and support resources
- `/safety` - Safety Inspector: Upload workplace photos to analyze for safety hazards (supports multiple languages)
- `/safety-assistant` - Safety Assistant: Text-based safety advice and guidance using Sea Lion AI

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- JavaScript
- Tailwind CSS
- SEA-LION v4 (AI chatbot)

## AI Features

### Chat Feature
The chat feature is powered by a custom Sea Lion AI API, optimized for Southeast Asian languages. The chatbot is specifically configured to help migrant workers with:
- Employment rights and contract questions
- Legal support resources
- Housing and healthcare information
- General guidance and support

**Features:**
- **Non-streaming mode**: Get complete responses at once
- **Streaming mode**: Watch responses appear in real-time (toggle in chat interface)
- **Conversation history**: The bot remembers context from previous messages

### Safety Inspector
The Safety Inspector uses SEA-LION's vision-language models to analyze workplace photos for safety hazards. Features:
- Upload workplace photos
- Multi-language support (English, Tamil, Malay, Mandarin)
- Custom question support
- Real-time AI analysis of safety hazards

### Safety Assistant
The Safety Assistant provides text-based safety advice and guidance. Features:
- Simple text input interface
- Instant safety advice for workplace questions
- Clear, actionable recommendations
- Built with TypeScript and Tailwind CSS

All features connect to the Sea Lion AI API through secure API routes that keep all API calls on the server side.

## API Integration

The chat feature supports two modes:

1. **Non-streaming** (default): Complete response returned at once
2. **Streaming**: Real-time text streaming for a typing effect

You can toggle between modes using the checkbox in the chat interface. The streaming mode provides a more interactive experience as users can see the response being generated in real-time.
