'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Header() {
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <header className="site-header">
      <div className="section-shell site-header__inner">
        <Link href="/" className="site-brand" aria-label="返回首页">
          <Image
            src="/chenjin-icon.png"
            alt=""
            aria-hidden="true"
            width={40}
            height={40}
            priority
            className="site-brand__mark"
          />
        </Link>

        {isHome ? (
          <a href="#blog" className="site-header__link">
            Read The Archive
          </a>
        ) : (
          <Link href="/#blog" className="site-header__link">
            Read The Archive
          </Link>
        )}
      </div>
    </header>
  )
}
