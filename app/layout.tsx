import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Header } from '@/components/Header'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: {
    default: '阿锦的记事本',
    template: '%s | 阿锦的记事本',
  },
  description: '记录日常、分享成长，写给自己和你的碎碎念。',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head />
      <body>
        <Providers>
          <Suspense fallback={null}>
            <Header />
          </Suspense>
          <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 min-h-[calc(100vh-8rem)]">
            {children}
          </main>
          <footer className="border-t border-[var(--border)] py-8 mt-16">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3"
              style={{ fontSize: '0.8125rem', color: 'var(--muted-fg)' }}>
              <div className="flex items-center gap-2">
                <span className="text-[var(--accent)]" style={{ fontSize: '0.625rem' }}>✦</span>
                <span className="font-semibold text-[var(--fg)]" style={{ letterSpacing: '-0.01em' }}>
                  阿锦的记事本
                </span>
              </div>
              <div className="flex items-center gap-2 opacity-70" style={{ letterSpacing: '0.01em' }}>
                <span>用心写，认真活</span>
                <span className="text-[var(--accent)]">🌸</span>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}
