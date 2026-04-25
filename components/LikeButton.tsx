'use client'

import { useEffect, useState } from 'react'

interface LikeButtonProps {
  slug: string
}

export default function LikeButton({ slug }: LikeButtonProps) {
  const [likes, setLikes] = useState<number | null>(null)
  const [liked, setLiked] = useState(false)
  const [animating, setAnimating] = useState(false)

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
    <div className="mx-auto w-full max-w-md">
      <button
        onClick={handleLike}
        disabled={liked}
        aria-label={liked ? '已喜欢' : '喜欢这篇'}
        className="button-secondary w-full px-4 py-3 text-left disabled:cursor-default disabled:opacity-80"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--accent-strong)]"
          style={{
            background: liked ? 'var(--accent-soft)' : 'transparent',
            transform: animating ? 'scale(1.15)' : 'scale(1)',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={liked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20.8s-7-4.2-9.2-8.8A5.8 5.8 0 0 1 12 5.2 5.8 5.8 0 0 1 21.2 12c-2.2 4.6-9.2 8.8-9.2 8.8Z" />
          </svg>
        </span>

        <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[var(--fg)]">
              {liked ? '谢谢你留下回应' : '喜欢这篇文章'}
            </span>
            <span className="block text-xs leading-6 text-[var(--muted-fg)]">
              {liked ? '这份喜欢已经被记下来了。' : '点一下，给这篇内容一个小小的心跳。'}
            </span>
          </span>

          <span className="rounded-full bg-[var(--accent-softer)] px-3 py-1 text-sm font-semibold text-[var(--accent-strong)]">
            {likes === null ? '...' : likes}
          </span>
        </span>
      </button>
    </div>
  )
}
