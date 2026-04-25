'use client'

import { useRef, useState } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'

interface PageLoaderProps {
  message: string
}

const DEFAULT_LOADER_TEXT = "Welcome to Chenjin's space"
const DEFAULT_INITIAL_TEXT = "W3LC0ME T0 CHENJIN'S SP4CE"

export function PageLoader({ message }: PageLoaderProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const labelRef = useRef<HTMLParagraphElement | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const initialText =
    message === DEFAULT_LOADER_TEXT ? DEFAULT_INITIAL_TEXT : message.toUpperCase()

  useGSAP(
    () => {
      const shouldSkipLoader =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const root = rootRef.current
      const label = labelRef.current

      if (shouldSkipLoader || !root || !label) {
        setIsVisible(false)
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
        textContent: initialText,
      })

      timeline
        .to(label, {
          duration: 1.6,
          scrambleText: {
            text: message,
            chars: 'upperAndLowerCase',
            revealDelay: 0.18,
            speed: 0.45,
            tweenLength: false,
          },
        })
        .to(
          label,
          {
            opacity: 0,
            y: 12,
            duration: 0.32,
            ease: 'power2.inOut',
          },
          '+=0.18',
        )
        .to(
          root,
          {
            opacity: 0,
            duration: 0.28,
            ease: 'power2.inOut',
          },
          '-=0.08',
        )
    },
    { scope: rootRef, dependencies: [initialText, message], revertOnUpdate: true },
  )

  if (!isVisible) {
    return null
  }

  return (
    <div ref={rootRef} className="page-loader" aria-hidden="true">
      <div className="page-loader__inner">
        <p ref={labelRef} className="page-loader__label">
          {initialText}
        </p>
      </div>
    </div>
  )
}
