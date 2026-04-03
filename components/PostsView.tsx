'use client'

import { useState, useEffect } from 'react'
import { PostCard } from '@/components/PostCard'
import TimelineView from '@/components/TimelineView'
import type { PostMeta } from '@/lib/posts'

type ViewMode = 'card' | 'timeline'

const STORAGE_KEY = 'blog-view'

interface PostsViewProps {
  posts: PostMeta[]
}

export default function PostsView({ posts }: PostsViewProps) {
  const [view, setView] = useState<ViewMode>('card')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ViewMode | null
    if (saved === 'card' || saved === 'timeline') {
      setView(saved)
    }
    setMounted(true)
  }, [])

  function switchView(next: ViewMode) {
    setView(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  if (posts.length === 0) {
    return (
      <div
        className="text-center py-24 text-[var(--muted-fg)]"
        style={{ opacity: 0.7 }}
      >
        <p className="text-4xl mb-4" aria-hidden>✍️</p>
        <p className="text-base font-medium">还没有文章，去写第一篇吧～</p>
      </div>
    )
  }

  return (
    <>
      {/* View toggle buttons */}
      <div className="flex items-center justify-end gap-1 mb-5">
        <button
          onClick={() => switchView('card')}
          aria-label="卡片视图"
          title="列表视图"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.65rem',
            borderRadius: '0.4rem',
            border: '1.5px solid',
            borderColor: view === 'card' ? 'var(--accent)' : 'var(--border)',
            background: view === 'card' ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
            color: view === 'card' ? 'var(--accent)' : 'var(--muted-fg)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
            opacity: mounted ? 1 : 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
            <rect x="0" y="1" width="16" height="3.5" rx="1" />
            <rect x="0" y="6.25" width="16" height="3.5" rx="1" />
            <rect x="0" y="11.5" width="16" height="3.5" rx="1" />
          </svg>
          列表
        </button>

        <button
          onClick={() => switchView('timeline')}
          aria-label="时间轴视图"
          title="时间轴视图"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.65rem',
            borderRadius: '0.4rem',
            border: '1.5px solid',
            borderColor: view === 'timeline' ? 'var(--accent)' : 'var(--border)',
            background: view === 'timeline' ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
            color: view === 'timeline' ? 'var(--accent)' : 'var(--muted-fg)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
            opacity: mounted ? 1 : 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="3" cy="3.5" r="1.5" fill="currentColor" stroke="none" />
            <line x1="3" y1="5" x2="3" y2="13" />
            <circle cx="3" cy="8" r="1.5" fill="currentColor" stroke="none" />
            <line x1="6" y1="3.5" x2="15" y2="3.5" />
            <line x1="6" y1="8" x2="15" y2="8" />
          </svg>
          时间轴
        </button>
      </div>

      {/* Content */}
      {view === 'card' ? (
        <div className="flex flex-col gap-3.5">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <TimelineView posts={posts} />
      )}
    </>
  )
}
