import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import './redesign.css'
import { Providers } from '@/components/Providers'
import { Header } from '@/components/Header'

export const metadata: Metadata = {
  title: {
    default: '陈锦 ChenJin — AI Native Coder | 陈锦.blog',
    template: '%s | 陈锦.blog',
  },
  description: '阿锦的公开档案馆。记录产品推进、AI 团队协作和那些不想被时间吞掉的日常片段。',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/chenjin-icon.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: '/chenjin-apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const currentYear = new Date().getFullYear()

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Providers>
          <Suspense fallback={null}>
            <Header />
          </Suspense>
          <main className="section-shell main-frame">{children}</main>
          <footer className="site-footer">
            <div className="section-shell site-footer__inner">
              <div>
                <Link href="/" className="site-footer__title">ajin.blog</Link>
                <p className="site-footer__copy">记录产品推进、AI 协作与日常判断。</p>
              </div>
              <nav className="site-footer__links" aria-label="页脚导航">
                <Link href="/#blog">Archive</Link>
                <Link href="/team">AI Team</Link>
                <a href="https://chenjin.ai" target="_blank" rel="noreferrer">chenjin.ai ↗</a>
              </nav>
              <p className="site-footer__copyright">© {currentYear} ajin.blog</p>
            </div>
          </footer>
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  )
}
