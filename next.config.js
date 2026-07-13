const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

/** @type {import('next').NextConfig} */
module.exports = (phase) => {
  const isDevelopmentServer = phase === PHASE_DEVELOPMENT_SERVER

  return {
    // Keep `next dev` artifacts separate so `next build` cannot invalidate
    // chunks that an already-running local server still references.
    distDir: isDevelopmentServer ? '.next-dev' : '.next',
    pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
    // Static files in public/ (avatars, etc.) are served directly by Vercel CDN
    experimental: {},
  }
}
