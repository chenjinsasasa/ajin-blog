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
    } catch (err) {
      console.error('Failed to copy!', err)
    }
  }

  return (
    <div className="relative group/code my-6 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[#0d1117]">
      {/* Header / Window Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-[10px] font-bold text-[#8b949e] uppercase tracking-widest">
            {language}
          </span>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-200 
            text-[#8b949e] hover:text-white hover:bg-[#30363d] active:scale-95"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[#28c840]">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>已复制</span>
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>复制</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre
        ref={preRef}
        {...props}
        className="m-0 p-4 pt-4 pb-4 overflow-x-auto text-[13px] sm:text-[14px] leading-relaxed scrollbar-thin scrollbar-thumb-[#30363d]"
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
