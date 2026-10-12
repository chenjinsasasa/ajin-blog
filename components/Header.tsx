'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Header() {
  const pathname = usePathname()
  const isTeam = pathname === '/team'

  return (
    <header className="site-header">
      <div className="section-shell site-header__inner">
        <Link href="/" className="site-brand" aria-label="ajin.blog，返回首页">
          <span className="site-brand__wordmark">ajin.blog</span>
          <span className="site-brand__caption">PERSONAL BLOG<br />PUBLIC WORK ARCHIVE</span>
        </Link>
        <nav className="site-nav" aria-label="主导航">
          <Link href="/#blog" aria-current={!isTeam ? 'page' : undefined}>Archive</Link>
          <Link href="/team" aria-current={isTeam ? 'page' : undefined}>AI Team</Link>
          <a href="https://chenjin.ai" target="_blank" rel="noreferrer">chenjin.ai <span aria-hidden="true">↗</span></a>
        </nav>
        <span className="site-header__motto">Build · Document · Think · Together</span>
      </div>
    </header>
  )
}
