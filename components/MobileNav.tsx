'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

const OFFICIAL_SITE = {
  label: 'Official',
  href: 'https://chenjin.ai',
}

const NAV_ITEMS = [
  {
    label: 'Home',
    value: '',
    href: '/',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    label: 'Progress',
    value: 'progress',
    href: '/?category=progress',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16 9.5 10.5l4 4L20 8" />
        <path d="M15 8h5v5" />
      </svg>
    ),
  },
  {
    label: 'Diary',
    value: 'diary',
    href: '/?category=diary',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h11a2 2 0 0 1 2 2v16H8a3 3 0 0 0-3 3V6a3 3 0 0 1 3-3Z" />
        <path d="M8 7h8" />
      </svg>
    ),
  },
  {
    label: 'Team',
    value: 'team',
    href: '/?category=team',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7.5" r="3.5" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 4.13a3.5 3.5 0 0 1 0 6.74" />
      </svg>
    ),
  },
  {
    label: OFFICIAL_SITE.label,
    value: 'official',
    href: OFFICIAL_SITE.href,
    external: true,
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17" />
        <path d="M12 3.5a14.5 14.5 0 0 1 0 17" />
        <path d="M12 3.5a14.5 14.5 0 0 0 0 17" />
      </svg>
    ),
  },
]

export function MobileNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category') ?? ''

  return (
    <div className="mobile-nav lg:hidden">
      <nav className="mobile-nav__inner">
        {NAV_ITEMS.map((item) => {
          const isActive = !item.external && pathname === '/' && currentCategory === item.value

          const className = `mobile-nav__item ${isActive ? 'mobile-nav__item--active' : ''}`

          if (item.external) {
            return (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className={className}
              >
                <span className="mobile-nav__icon" aria-hidden="true">{item.icon}</span>
                <span className="mobile-nav__label">{item.label}</span>
              </a>
            )
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={className}
            >
              <span className="mobile-nav__icon" aria-hidden="true">{item.icon}</span>
              <span className="mobile-nav__label">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
