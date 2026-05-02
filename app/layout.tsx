import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Header } from '@/components/Header'

export const metadata: Metadata = {
  title: {
    default: 'ajin.blog',
    template: '%s | ajin.blog',
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
            <section className="site-footer__primary">
              <div className="section-shell site-footer__primary-inner">
                <div className="site-footer__brand">
                  <p className="site-footer__title">ajin.blog</p>
                  <p className="site-footer__copy">
                    记录产品推进、AI 协作与日常判断，把真正发生过的过程长期留住。
                  </p>

                  <div className="site-footer__links">
                    <Link href="/">Home</Link>
                    <Link href="/#blog">Archive</Link>
                    <a href="https://chenjin.ai" target="_blank" rel="noreferrer">
                      Official
                    </a>
                  </div>
                </div>

                <div className="site-footer__cta">
                  <p className="site-footer__cta-title">
                    Read the archive and follow the work as it happens.
                  </p>
                  <p className="site-footer__cta-copy">
                    首页是一份简介，文章区才是真正持续更新的正文。
                  </p>
                  <Link href="/#blog" className="site-footer__cta-link">
                    Read The Archive
                  </Link>
                </div>
              </div>
            </section>

            <section className="site-footer__secondary">
              <div className="section-shell site-footer__secondary-inner">
                <p>© {currentYear} ajin.blog. All Rights Reserved.</p>
              </div>
            </section>
          </footer>
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  )
}
