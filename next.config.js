const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

/** @type {import('next').NextConfig} */
module.exports = (phase) => {
  const isDevelopmentServer = phase === PHASE_DEVELOPMENT_SERVER

  return {
    // Keep `next dev` artifacts separate so `next build` cannot invalidate
    // chunks that an already-running local server still references.
    distDir: isDevelopmentServer ? '.next-dev' : '.next',
    pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
    async headers() {
      return [
        {
          source: '/trips/2026-chuanxi/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=604800, stale-while-revalidate=86400',
            },
          ],
        },
      ]
    },
    // Static files in public/ (avatars, etc.) are served directly by Vercel CDN
    experimental: {},
  }
}
