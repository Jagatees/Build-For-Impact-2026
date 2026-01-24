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
    }
    return config
  },
}

module.exports = nextConfig
