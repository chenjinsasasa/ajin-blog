'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PostCard } from '@/components/PostCard'
import TimelineView from '@/components/TimelineView'
import { PinnedPostCard } from '@/components/PinnedPostCard'
import type { PostMeta } from '@/lib/posts'

type ViewMode = 'card' | 'timeline'

const STORAGE_KEY = 'blog-view'
const LOAD_MORE_SIZE = 8

interface PostsViewProps {
  posts: PostMeta[]
  pinnedPost?: PostMeta | null
  totalCount?: number
  category?: string
  initialHasMore?: boolean
}

export default function PostsView({
  posts: initialPosts,
  pinnedPost,
  totalCount: totalCountProp,
  category = 'all',
  initialHasMore = false,
}: PostsViewProps) {
  const [view, setView] = useState<ViewMode>('card')
  const [mounted, setMounted] = useState(false)
  const [posts, setPosts] = useState<PostMeta[]>(initialPosts)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ViewMode | null
    if (saved === 'card' || saved === 'timeline') setView(saved)
    setMounted(true)
  }, [])

  useEffect(() => {
    setPosts(initialPosts)
    setHasMore(initialHasMore)
  }, [category, initialHasMore]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)

    try {
      const offset = posts.length
      const res = await fetch(`/api/posts?category=${category}&offset=${offset}&limit=${LOAD_MORE_SIZE}`)
      const data = await res.json() as { posts: PostMeta[]; hasMore: boolean }
      setPosts((prev) => [...prev, ...data.posts])
      setHasMore(data.hasMore)
    } catch (error) {
      console.error('Failed to load more posts', error)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, posts.length, category])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '220px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  useEffect(() => {
    if (!mounted || loading || !hasMore) return

    const el = sentinelRef.current
    if (!el) return

    const sentinelTop = el.getBoundingClientRect().top
    const preloadThreshold = window.innerHeight + 180

    if (sentinelTop <= preloadThreshold) {
      void loadMore()
    }
  }, [mounted, posts.length, hasMore, loading, loadMore])

  function switchView(next: ViewMode) {
    setView(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  const totalCount = totalCountProp ?? (posts.length + (pinnedPost ? 1 : 0))
  const toggleBase = 'inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 sm:flex-none'

  if (totalCount === 0) {
    return (
      <div className="card p-8 text-center sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--accent-softer)] text-[var(--accent-strong)]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 3h8l5 5v13H7z" />
            <path d="M15 3v5h5" />
            <path d="M10 13h4" />
          </svg>
        </div>
        <h3 className="mt-5 font-display text-[2rem] text-[var(--fg)]">还没有文章</h3>
        <p className="mt-3 text-[0.98rem] leading-7 text-[var(--muted-fg)]">
          这里会慢慢长出第一篇内容。等它出现时，页面也会像一本真正被翻开的纸页。
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-kicker">Archive View</p>
          <p className="text-sm leading-7 text-[var(--muted-fg)]">
            共 {totalCount} 篇，按时间倒序排列。
          </p>
        </div>

        <div className="glass inline-flex w-full items-center gap-1 rounded-full p-1 sm:w-fit">
          <button
            onClick={() => switchView('card')}
            aria-label="卡片视图"
            className={`${toggleBase} ${
              view === 'card'
                ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                : 'text-[var(--muted-fg)]'
            }`}
            style={{ opacity: mounted ? 1 : 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="2" width="14" height="3" rx="1.5" />
              <rect x="1" y="7" width="14" height="3" rx="1.5" />
              <rect x="1" y="12" width="14" height="3" rx="1.5" />
            </svg>
            列表
          </button>

          <button
            onClick={() => switchView('timeline')}
            aria-label="时间轴视图"
            className={`${toggleBase} ${
              view === 'timeline'
                ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                : 'text-[var(--muted-fg)]'
            }`}
            style={{ opacity: mounted ? 1 : 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <line x1="3" y1="2.5" x2="3" y2="13.5" />
              <circle cx="3" cy="4" r="1.3" fill="currentColor" stroke="none" />
              <circle cx="3" cy="10.5" r="1.3" fill="currentColor" stroke="none" />
              <line x1="6" y1="4" x2="14" y2="4" />
              <line x1="6" y1="10.5" x2="14" y2="10.5" />
            </svg>
            时间轴
          </button>
        </div>
      </div>

      {view === 'card' ? (
        <div className="flex flex-col gap-4">
          {pinnedPost && <PinnedPostCard post={pinnedPost} />}
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <TimelineView posts={posts} pinnedPost={pinnedPost} />
      )}

      <div ref={sentinelRef} className="h-px" />

      {loading && (
        <div className="flex justify-center py-8">
          <span
            className="inline-block h-6 w-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]"
            style={{ animation: 'spin 0.7s linear infinite' }}
          />
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="flex items-center justify-center gap-3 py-8 text-sm text-[var(--muted-fg)]">
          <span className="accent-line w-10" />
          <span>已经翻到最后一页了</span>
          <span className="accent-line w-10" />
        </div>
      )}

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  )
}
