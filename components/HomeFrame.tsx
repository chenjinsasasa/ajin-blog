'use client'

import type { ReactNode } from 'react'

interface HomeFrameProps {
  children: ReactNode
}

export default function HomeFrame({ children }: HomeFrameProps) {
  return (
    <div className="home-frame">
      <div className="page-atmosphere" aria-hidden="true">
        <div className="page-atmosphere__grain" />
        <div className="page-atmosphere__glow page-atmosphere__glow--one" />
        <div className="page-atmosphere__glow page-atmosphere__glow--two" />
      </div>

      <div className="home-frame__content">{children}</div>
    </div>
  )
}
