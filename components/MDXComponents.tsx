'use client'

import React, { useState, useRef } from 'react'

interface CodeBlockProps {
  children?: React.ReactNode
  'data-language'?: string
  'data-theme'?: string
}

export function Pre({ children, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)
  const language = props['data-language'] || 'code'

  const handleCopy = async () => {
    if (!preRef.current) return

    const code = preRef.current.querySelector('code')?.innerText || ''

    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy code block', error)
    }
  }

  return (
    <div className="my-8 overflow-hidden rounded-[28px] border border-[var(--border-strong)] bg-[#14110d] shadow-[0_24px_48px_rgba(20,14,7,0.16)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(188,155,106,0.12)] px-4 py-3 text-[var(--fg)]">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#8b7140]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#bc9b6a]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f2eadc]" />
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            {language}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[rgba(188,155,106,0.06)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--fg)] transition-colors duration-200 hover:bg-[rgba(188,155,106,0.12)]"
          aria-label="复制代码"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>已复制</span>
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>复制</span>
            </>
          )}
        </button>
      </div>

      <pre
        ref={preRef}
        {...props}
        className="m-0 overflow-x-auto px-0 py-4 text-[13px] leading-7 text-[#f2eadc] sm:text-[14px]"
      >
        {children}
      </pre>
    </div>
  )
}

export function Table({ children }: { children?: React.ReactNode }) {
  return (
    <div className="table-container">
      <table>{children}</table>
    </div>
  )
}
