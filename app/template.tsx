import type { ReactNode } from 'react'
import { PageLoader } from '@/components/PageLoader'

const LOADER_MESSAGE = "Welcome to Chenjin's space"

export default function RootTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <PageLoader message={LOADER_MESSAGE} />
      {children}
    </>
  )
}
