'use client'

import { useState, useEffect, ReactNode } from 'react'

interface DiaryGuardProps {
  children: ReactNode
}

export default function DiaryGuard({ children }: DiaryGuardProps) {
  const [unlocked, setUnlocked] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const val = sessionStorage.getItem('diary-unlocked')
    if (val === '1') {
      setUnlocked(true)
    }
    setMounted(true)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/diary-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json() as { ok: boolean }
      if (data.ok) {
        sessionStorage.setItem('diary-unlocked', '1')
        setUnlocked(true)
      } else {
        setError(true)
        setPassword('')
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  // Before mount: render nothing to avoid hydration mismatch
  if (!mounted) return null

  if (unlocked) return <>{children}</>

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '360px',
          padding: '2.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          textAlign: 'center',
        }}
      >
        {/* Lock icon */}
        <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>🔒</div>

        {/* Title */}
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            color: 'var(--fg)',
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          这是阿锦的私人日记
        </h2>

        {/* Subtitle */}
        <p style={{ fontSize: '0.875rem', color: 'var(--muted-fg)', margin: 0 }}>
          请输入密码才能继续阅读 ✨
        </p>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
        >
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(false)
            }}
            placeholder="密码"
            disabled={loading}
            autoFocus
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: '0.5rem',
              border: `1.5px solid ${error ? '#ef4444' : 'var(--border)'}`,
              background: 'var(--bg)',
              color: 'var(--fg)',
              fontSize: '0.9375rem',
              outline: 'none',
              transition: 'border-color 0.15s',
              boxSizing: 'border-box',
            }}
          />

          {error && (
            <p
              style={{
                fontSize: '0.8125rem',
                color: '#ef4444',
                margin: 0,
                textAlign: 'center',
              }}
            >
              密码不对，再想想 🙈
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            style={{
              width: '100%',
              padding: '0.625rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: loading || !password.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !password.trim() ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? '验证中…' : '进入'}
          </button>
        </form>
      </div>
    </div>
  )
}
