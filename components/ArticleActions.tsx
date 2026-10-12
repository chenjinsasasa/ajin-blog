'use client'

import { useState } from 'react'

export default function ArticleActions({ title }: { title: string }) {
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  async function copyLink() {
    if (!navigator.clipboard?.writeText) {
      setMessage('当前浏览器无法复制，请从地址栏复制链接。')
      return
    }
    try {
      await navigator.clipboard.writeText(window.location.href)
      setMessage('链接已复制。')
    } catch {
      setMessage('复制失败，请从地址栏复制链接。')
    }
  }

  async function share() {
    if (pending) return
    if (!navigator.share) {
      await copyLink()
      return
    }
    setPending(true)
    try {
      await navigator.share({ title, url: window.location.href })
      setMessage('分享已完成。')
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setMessage('已取消分享。')
      } else {
        setMessage('分享失败，可以使用复制链接。')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="article-actions">
      <div className="article-actions__buttons">
        <button type="button" className="article-button article-button--secondary" onClick={share} disabled={pending}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m9 10 6-4M9 14l6 4" /></svg>
          {pending ? '分享中…' : '分享'}
        </button>
        <button type="button" className="article-button article-button--secondary" onClick={copyLink}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(0 0) scale(.95)" /></svg>
          复制链接
        </button>
      </div>
      <p role="status" aria-live="polite" className="article-actions__status">{message}</p>
    </div>
  )
}
