import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Header } from '@/components/Header'
import { MobileNav } from '@/components/MobileNav'

export const metadata: Metadata = {
  title: {
    default: '阿锦的博客',
    template: '%s | 阿锦的博客',
  },
  description: '阿锦的终端式博客。记录进展、团队和那些不想被时间吞掉的日常片段。',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-icon.png',
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
          <Suspense fallback={null}>
            <MobileNav />
          </Suspense>
          <footer className="site-footer">
            <div className="section-shell site-footer__inner">
              <div className="site-footer__brand">
                <p className="site-footer__title">ajin.blog</p>
                <p>build + diary archive / © {currentYear}</p>
              </div>

              <div className="site-footer__links">
                <Link href="/">archive</Link>
                <Link href="/?category=progress">progress</Link>
                <Link href="/?category=team">agents</Link>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}
