'use client'

import { useState, useEffect } from 'react'
import { PostCard } from '@/components/PostCard'
import TimelineView from '@/components/TimelineView'
import type { PostMeta } from '@/lib/posts'

type ViewMode = 'card' | 'timeline'

const STORAGE_KEY = 'blog-view'

interface PostsViewProps {
  posts: PostMeta[]
  pinnedPost?: PostMeta | null
}

export default function PostsView({ posts, pinnedPost }: PostsViewProps) {
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

  const totalCount = posts.length + (pinnedPost ? 1 : 0)

  if (totalCount === 0) {
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
          {/* Pinned post at top */}
          {pinnedPost && (
            <PinnedPostCard post={pinnedPost} />
          )}
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <TimelineView posts={posts} pinnedPost={pinnedPost} />
      )}
    </>
  )
}

/** Pinned post card with 📌 badge */
function PinnedPostCard({ post }: { post: PostMeta }) {
  function formatDate(dateStr: string) {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  return (
    <a href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'block' }} className="group">
      <article
        className="card p-5 sm:p-6 relative overflow-hidden"
        style={{
          border: '1.5px solid color-mix(in srgb, var(--accent) 40%, var(--border))',
        }}
      >
        {/* Accent glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top left, var(--accent-glow) 0%, transparent 70%)', opacity: 0.6 }}
        />

        {/* Top row: 📌 badge + category tag + date */}
        <div className="flex items-center justify-between gap-3 mb-3.5 relative">
          <div className="flex items-center gap-2">
            {/* 📌 Pinned badge */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.125rem 0.5rem',
                borderRadius: '0.375rem',
                background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                color: 'var(--accent)',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              }}
            >
              📌 置顶
            </span>
            <span className={`tag ${post.category === 'progress' ? 'tag-progress' : 'tag-diary'}`}>
              {post.category === 'progress' ? '📈 我们的进展' : '📔 阿锦的日记'}
            </span>
          </div>
          <time
            dateTime={post.date}
            className="text-xs tabular-nums shrink-0 font-medium"
            style={{ color: 'var(--muted-fg)', letterSpacing: '0.02em' }}
          >
            {formatDate(post.date)}
          </time>
        </div>

        {/* Title */}
        <h2
          className="font-bold text-[var(--fg)] text-lg leading-snug mb-2.5 group-hover:text-[var(--accent)] transition-colors duration-200 relative"
          style={{ letterSpacing: '-0.025em' }}
        >
          {post.title}
        </h2>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-[0.9rem] text-[var(--muted-fg)] leading-relaxed line-clamp-2 mb-4 relative"
            style={{ lineHeight: '1.65' }}>
            {post.excerpt}
          </p>
        )}

        {/* Read more arrow */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted-fg)] group-hover:text-[var(--accent)] transition-colors duration-200 relative"
          style={{ letterSpacing: '0.02em' }}>
          <span>阅读全文</span>
          <svg
            width="13" height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transform group-hover:translate-x-1 transition-transform duration-200"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
      </article>
    </a>
  )
}
