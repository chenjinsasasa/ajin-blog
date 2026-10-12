'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface HomeFrameProps {
  children: ReactNode
}

export default function HomeFrame({ children }: HomeFrameProps) {
  useEffect(() => {
    function scrollToHash() {
      const hash = window.location.hash.replace('#', '')
      if (!hash) return

      const element = document.getElementById(hash)
      if (!element) return

      requestAnimationFrame(() => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
      })
    }

    scrollToHash()
    window.addEventListener('hashchange', scrollToHash)

    return () => {
      window.removeEventListener('hashchange', scrollToHash)
    }
  }, [])

  return (
    <div className="home-frame">{children}</div>
  )
}
