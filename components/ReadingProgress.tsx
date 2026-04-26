'use client'

import { useEffect, useState } from 'react'

export default function ReadingProgress() {
  const [completion, setCompletion] = useState(0)

  useEffect(() => {
    const updateScrollCompletion = () => {
      const currentProgress = window.scrollY
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight

      if (scrollHeight > 0) {
        setCompletion(Number((currentProgress / scrollHeight).toFixed(2)) * 100)
      }
    }

    updateScrollCompletion()
    window.addEventListener('scroll', updateScrollCompletion)

    return () => {
      window.removeEventListener('scroll', updateScrollCompletion)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed left-0 top-0 z-[60] h-1 w-full bg-transparent" aria-hidden="true">
      <div
        className="h-full rounded-r-full bg-[linear-gradient(90deg,var(--accent),var(--accent-strong))] shadow-[0_0_16px_rgba(188,155,106,0.28)] transition-[width] duration-150 ease-out"
        style={{ width: `${completion}%` }}
      />
    </div>
  )
}
