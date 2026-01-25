/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Mark packages that should not be bundled for server components/API routes
  serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist', 'react-pdf'],
  webpack: (config, { isServer, dev }) => {
    // More aggressive handling for development mode
    if (isServer) {
      // Mark pdf-parse and pdfjs-dist as externals to avoid bundling issues
      // This ensures they're loaded from node_modules at runtime, not bundled
      if (!config.externals) {
        config.externals = []
      }
      // Add as strings to mark them as external (works in both dev and prod)
      config.externals.push('pdf-parse', 'pdfjs-dist', 'react-pdf')
      
      // Ignore worker files for server-side builds
      config.resolve.alias = config.resolve.alias || {}
      config.resolve.alias['pdfjs-dist/build/pdf.worker.mjs'] = false
      config.resolve.alias['pdfjs-dist/build/pdf.worker.js'] = false
      config.resolve.alias['./pdf.worker.mjs'] = false
      config.resolve.alias['./pdf.worker.js'] = false
      
      // Prevent pdfjs-dist from trying to use browser globals
      config.resolve.alias['canvas'] = false
      
      // Development mode: ensure react-pdf is external to prevent SSR analysis errors
      // This error occurs in dev but not production because Next.js analyzes modules differently
      if (dev) {
        // Make sure react-pdf is treated as external
        // The externals array already includes it, but we ensure it's handled
      }
    } else {
      // Client-side: resolve canvas and other browser-only modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
      }
      
      // Ensure pdfjs-dist can be imported on client-side (don't externalize it)
      // Remove pdfjs-dist from externals if it was added
      if (Array.isArray(config.externals)) {
        config.externals = config.externals.filter(
          ext => ext !== 'pdfjs-dist' && (typeof ext !== 'string' || !ext.includes('pdfjs-dist'))
        )
      }
      
      // In development, add better error handling for client-side
      if (dev) {
        // Suppress warnings about react-pdf in development
        config.ignoreWarnings = [
          ...(config.ignoreWarnings || []),
          /react-pdf/,
          /pdfjs-dist/,
        ]
      }
    }
    return config
  },
}

module.exports = nextConfig
