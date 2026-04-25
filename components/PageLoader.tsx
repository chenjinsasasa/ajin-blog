'use client'

import { useRef, useState } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'

interface PageLoaderProps {
  message: string
}

export function PageLoader({ message }: PageLoaderProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const labelRef = useRef<HTMLParagraphElement | null>(null)
  const [isVisible, setIsVisible] = useState(true)

  useGSAP(
    () => {
      const root = rootRef.current
      const label = labelRef.current

      if (!root || !label) {
        return
      }

      const timeline = gsap.timeline({
        defaults: {
          ease: 'power2.out',
        },
        onComplete: () => {
          setIsVisible(false)
        },
      })

      gsap.set(root, {
        opacity: 1,
      })

      gsap.set(label, {
        opacity: 1,
        y: 0,
        textContent: '',
      })

      timeline
        .to(label, {
          duration: 2.75,
          scrambleText: {
            text: message,
            chars: 'upperAndLowerCase',
            revealDelay: 0.2,
            speed: 0.35,
            tweenLength: false,
          },
        })
        .to(
          label,
          {
            opacity: 0,
            y: 16,
            duration: 0.45,
            ease: 'power2.inOut',
          },
          '+=0.55',
        )
        .to(
          root,
          {
            opacity: 0,
            duration: 0.4,
            ease: 'power2.inOut',
          },
          '-=0.18',
        )
    },
    { scope: rootRef, dependencies: [message], revertOnUpdate: true },
  )

  if (!isVisible) {
    return null
  }

  return (
    <div ref={rootRef} className="page-loader" aria-hidden="true">
      <div className="page-loader__inner">
        <p ref={labelRef} className="page-loader__label" />
      </div>
    </div>
  )
}
