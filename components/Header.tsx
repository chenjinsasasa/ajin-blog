'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

const TABS = [
  { label: 'Archive', value: '', href: '/' },
  { label: 'Progress', value: 'progress', href: '/?category=progress' },
  { label: 'Diary', value: 'diary', href: '/?category=diary' },
  { label: 'Agents', value: 'team', href: '/?category=team' },
]

export function Header() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category') ?? ''
  const activeTab = TABS.find((tab) => tab.value === currentCategory) ?? TABS[0]

  const isHomePage = pathname === '/'
  const onArticlePage = pathname.startsWith('/blog/')

  return (
    <header className="site-header">
      <div className="section-shell site-header__inner site-header__inner--blog">
        <Link href="/" className="brand" aria-label="ajin.blog 首页">
          <span className="brand__dot" aria-hidden="true" />
          <span className="brand__name">ajin.blog</span>
          <span className="brand__meta">build + diary archive</span>
        </Link>

        {isHomePage ? (
          <>
            <div className="mobile-header-state md:hidden" aria-hidden="true">
              <span className="mobile-header-state__label">view</span>
              <span className="mobile-header-state__value">{activeTab.label}</span>
            </div>

            <nav className="site-nav site-nav--blog" aria-label="博客导航">
              {TABS.map((tab) => {
                const active = currentCategory === tab.value

                return (
                  <Link
                    key={tab.value || 'all'}
                    href={tab.href}
                    className={active ? 'site-nav__pill site-nav__pill--active' : 'site-nav__pill'}
                  >
                    {tab.label}
                  </Link>
                )
              })}
            </nav>
          </>
        ) : (
          <div className="breadcrumb-row">
            <Link href="/">archive</Link>
            <span>/</span>
            <span>{onArticlePage ? 'article' : 'page'}</span>
          </div>
        )}
      </div>
    </header>
  )
}
