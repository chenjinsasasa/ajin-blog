/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  // Static files in public/ (avatars, etc.) are served directly by Vercel CDN
  experimental: {},
}

module.exports = nextConfig
