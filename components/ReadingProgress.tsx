'use client'

import { useEffect, useState } from 'react'

export default function ReadingProgress() {
  const [completion, setCompletion] = useState(0)

  useEffect(() => {
    const updateScrollCompletion = () => {
      const currentProgress = window.scrollY
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      if (scrollHeight) {
        setCompletion(
          Number((currentProgress / scrollHeight).toFixed(2)) * 100
        )
      }
    }

    window.addEventListener('scroll', updateScrollCompletion)
    return () => {
      window.removeEventListener('scroll', updateScrollCompletion)
    }
  }, [])

  return (
    <div 
      className="fixed top-0 left-0 w-full h-[3px] bg-transparent z-[60] pointer-events-none"
      aria-hidden="true"
    >
      <div 
        className="h-full bg-[var(--accent)] transition-all duration-150 ease-out shadow-[0_0_10px_var(--accent)]"
        style={{ width: `${completion}%` }}
      />
    </div>
  )
}
