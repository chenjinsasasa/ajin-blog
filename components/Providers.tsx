'use client'

import { ReactNode } from 'react'
import { PageLoader } from '@/components/PageLoader'

export function Providers({ children }: { children: ReactNode }) {
  const loaderMessage = "Welcome to Chenjin's space"

  return (
    <>
      <PageLoader message={loaderMessage} />
      {children}
    </>
  )
}
