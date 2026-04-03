'use client'

import { useEffect, useRef, useState } from 'react'

interface LikeButtonProps {
  slug: string
}

export default function LikeButton({ slug }: LikeButtonProps) {
  const [likes, setLikes] = useState<number | null>(null)
  const [liked, setLiked] = useState(false)
  const [animating, setAnimating] = useState(false)
  const heartRef = useRef<HTMLSpanElement>(null)

  // Load likes count and check localStorage on mount
  useEffect(() => {
    const hasLiked = localStorage.getItem(`liked:${slug}`) === 'true'
    setLiked(hasLiked)

    fetch(`/api/likes/${slug}`)
      .then((r) => r.json())
      .then((data) => setLikes(data.likes ?? 0))
      .catch(() => setLikes(0))
  }, [slug])

  const handleLike = async () => {
    if (liked || animating) return

    // Trigger heart animation
    setAnimating(true)
    setTimeout(() => setAnimating(false), 400)

    try {
      const res = await fetch(`/api/likes/${slug}`, { method: 'POST' })
      const data = await res.json()
      setLikes(data.likes ?? (likes ?? 0) + 1)
    } catch {
      setLikes((prev) => (prev ?? 0) + 1)
    }

    setLiked(true)
    localStorage.setItem(`liked:${slug}`, 'true')
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '2rem',
      }}
    >
      <button
        onClick={handleLike}
        disabled={liked}
        aria-label={liked ? '已点赞' : '点赞'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1.25rem',
          borderRadius: '9999px',
          border: `1.5px solid ${liked ? 'var(--border)' : 'var(--accent)'}`,
          background: liked ? 'transparent' : 'var(--accent-subtle, rgba(236,72,153,0.08))',
          color: liked ? 'var(--muted-fg)' : 'var(--accent)',
          fontSize: '0.9375rem',
          fontWeight: 600,
          cursor: liked ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: liked ? 0.55 : 1,
          letterSpacing: '0.01em',
        }}
      >
        <span
          ref={heartRef}
          aria-hidden
          style={{
            display: 'inline-block',
            fontSize: '1.1rem',
            lineHeight: 1,
            transform: animating ? 'scale(1.3)' : 'scale(1)',
            transition: animating ? 'transform 0.15s ease-out' : 'transform 0.25s ease-in',
            willChange: 'transform',
          }}
        >
          ❤️
        </span>
        <span
          style={{
            minWidth: '1.5ch',
            textAlign: 'center',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {likes === null ? '—' : likes}
        </span>
      </button>
    </div>
  )
}
