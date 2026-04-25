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
    const value = sessionStorage.getItem('diary-unlocked')
    if (value === '1') setUnlocked(true)
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

  if (!mounted) return null
  if (unlocked) return <>{children}</>

  return (
    <div className="flex min-h-[55vh] items-center justify-center px-1 py-4 sm:px-4">
      <div className="card w-full max-w-[460px] p-6 text-center sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--accent-softer)] text-[var(--accent-strong)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="11" width="16" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 1 1 8 0v3" />
          </svg>
        </div>

        <p className="section-kicker mt-5 justify-center">Private Journal Access</p>
        <h2 className="font-display text-[2.2rem] leading-[0.95] text-[var(--fg)] sm:text-[2.8rem]">
          这一部分只对知道密码的人打开。
        </h2>
        <p className="mt-4 text-[0.98rem] leading-7 text-[var(--muted-fg)]">
          日记会更私人一些，所以多加了一层门。输入密码后，当前会话里会保持解锁状态。
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3 text-left">
          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-fg)]">
            访问密码
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(false)
            }}
            placeholder="请输入密码"
            disabled={loading}
            autoFocus
            className="w-full rounded-[18px] border bg-[var(--panel-soft)] px-4 py-3 text-base text-[var(--fg)] outline-none transition-colors duration-200 placeholder:text-[var(--muted-fg)]"
            style={{ borderColor: error ? '#ff7a7a' : 'var(--border)' }}
          />

          {error && (
            <p className="text-sm text-[#ff7a7a]">
              密码不对，再试一次。
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="button-primary w-full px-4 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? '验证中...' : '进入日记'}
          </button>
        </form>
      </div>
    </div>
  )
}
