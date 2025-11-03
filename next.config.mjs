/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    // Transparent API proxy to avoid CORS in the browser.
    // Dev default: proxy to localhost:8080 if API_PROXY_TARGET is not set.
    // Prod: requires explicit API_PROXY_TARGET.
    const prefix = process.env.API_PROXY_PATH_PREFIX || ''
    const isProd = process.env.NODE_ENV === 'production'
    const target = process.env.API_PROXY_TARGET || (!isProd ? 'http://localhost:8080' : '')
    if (!target) return []
    return [
      {
        source: '/api/:path*',
        destination: `${target}${prefix}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
