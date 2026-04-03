'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const TABS = [
  { label: '全部', value: 'all' },
  { label: '我们的进展', value: 'progress' },
  { label: '阿锦的日记', value: 'diary' },
]

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

export function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category') ?? 'all'

  useEffect(() => setMounted(true), [])

  const isHomePage = pathname === '/'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Top bar */}
        <div className="flex items-center justify-between h-14">
          {/* Blog name */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-[var(--accent)] text-lg">✦</span>
            <span
              className="font-bold text-base tracking-tight text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors duration-150"
              style={{ letterSpacing: '-0.02em' }}
            >
              阿锦的记事本
            </span>
          </Link>

          {/* Dark mode toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="切换暗黑模式"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--muted)] transition-all duration-150"
          >
            {mounted ? (theme === 'dark' ? <SunIcon /> : <MoonIcon />) : <MoonIcon />}
          </button>
        </div>

        {/* Category tabs — only on home */}
        {isHomePage && (
          <nav className="flex items-center gap-1 -mb-px overflow-x-auto scrollbar-none">
            {TABS.map((tab) => (
              <Link
                key={tab.value}
                href={tab.value === 'all' ? '/' : `/?category=${tab.value}`}
                className={`
                  px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-150
                  ${currentCategory === tab.value ? 'tab-active' : 'tab-inactive'}
                `}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Breadcrumb — on article pages */}
        {!isHomePage && (
          <div className="pb-3 flex items-center gap-2 text-sm text-[var(--muted-fg)]">
            <Link href="/" className="hover:text-[var(--fg)] transition-colors">首页</Link>
            <span>/</span>
            <span className="text-[var(--fg)]">文章</span>
          </div>
        )}
      </div>
    </header>
  )
}
