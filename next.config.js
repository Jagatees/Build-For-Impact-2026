/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark pdf-parse and pdfjs-dist as externals to avoid bundling issues
      config.externals = config.externals || []
      config.externals.push({
        'pdf-parse': 'commonjs pdf-parse',
        'pdfjs-dist': 'commonjs pdfjs-dist'
      })
      
      // Ignore worker files for server-side builds
      config.resolve.alias = config.resolve.alias || {}
      config.resolve.alias['pdfjs-dist/build/pdf.worker.mjs'] = false
      config.resolve.alias['pdfjs-dist/build/pdf.worker.js'] = false
      config.resolve.alias['./pdf.worker.mjs'] = false
      config.resolve.alias['./pdf.worker.js'] = false
    }
    return config
  },
}

module.exports = nextConfig
