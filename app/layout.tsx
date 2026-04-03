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
          <footer className="border-t border-[var(--border)] py-8 mt-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[var(--muted-fg)]">
              <span>
                <span className="text-[var(--accent)]">✦</span>{' '}
                <span className="font-medium text-[var(--fg)]">阿锦的记事本</span>
              </span>
              <span>用心写，认真活 🌸</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}
