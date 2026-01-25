/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Mark packages that should not be bundled for server components/API routes
  serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark pdf-parse and pdfjs-dist as externals to avoid bundling issues
      // This ensures they're loaded from node_modules at runtime, not bundled
      if (!config.externals) {
        config.externals = []
      }
      // Add as strings to mark them as external
      config.externals.push('pdf-parse', 'pdfjs-dist', 'react-pdf')
      
      // Ignore worker files for server-side builds
      config.resolve.alias = config.resolve.alias || {}
      config.resolve.alias['pdfjs-dist/build/pdf.worker.mjs'] = false
      config.resolve.alias['pdfjs-dist/build/pdf.worker.js'] = false
      config.resolve.alias['./pdf.worker.mjs'] = false
      config.resolve.alias['./pdf.worker.js'] = false
      
      // Prevent pdfjs-dist from trying to use browser globals
      config.resolve.alias['canvas'] = false
    } else {
      // Client-side: resolve canvas and other browser-only modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
