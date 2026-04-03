'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PostCard } from '@/components/PostCard'
import TimelineView from '@/components/TimelineView'
import { PinnedPostCard } from '@/components/PinnedPostCard'
import type { PostMeta } from '@/lib/posts'

type ViewMode = 'card' | 'timeline'

const STORAGE_KEY = 'blog-view'
const PAGE_SIZE = 10

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

  // Infinite scroll state
  const [posts, setPosts] = useState<PostMeta[]>(initialPosts)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ViewMode | null
    if (saved === 'card' || saved === 'timeline') setView(saved)
    setMounted(true)
  }, [])

  // Reset when category changes (SSR re-render gives new initialPosts)
  useEffect(() => {
    setPosts(initialPosts)
    setPage(1)
    setHasMore(initialHasMore)
  }, [category, initialHasMore]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const nextPage = page + 1
      const res = await fetch(
        `/api/posts?category=${category}&page=${nextPage}&limit=${PAGE_SIZE}`
      )
      const data = await res.json() as {
        posts: PostMeta[]
        hasMore: boolean
      }
      setPosts((prev) => [...prev, ...data.posts])
      setPage(nextPage)
      setHasMore(data.hasMore)
    } catch (e) {
      console.error('Failed to load more posts', e)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, page, category])

  // Intersection observer on sentinel
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  function switchView(next: ViewMode) {
    setView(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  const totalCount = totalCountProp ?? (posts.length + (pinnedPost ? 1 : 0))

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
      {/* 篇数 + 视图切换同行 */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-[var(--muted-fg)]" style={{ fontSize: '0.875rem', letterSpacing: '0.01em' }}>
          {totalCount > 0 ? `共 ${totalCount} 篇，按时间倒序` : '还没有文章'}
        </p>
        <div className="flex items-center gap-1">
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
      </div>

      {/* Content */}
      {view === 'card' ? (
        <div className="flex flex-col gap-3.5">
          {pinnedPost && <PinnedPostCard post={pinnedPost} />}
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <TimelineView posts={posts} pinnedPost={pinnedPost} />
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-px" />

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-8">
          <span
            style={{
              display: 'inline-block',
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: '2px solid var(--border)',
              borderTopColor: 'var(--accent)',
              animation: 'spin 0.7s linear infinite',
            }}
          />
        </div>
      )}

      {/* End of list */}
      {!hasMore && posts.length > 0 && (
        <p
          className="text-center py-8"
          style={{ fontSize: '0.8125rem', color: 'var(--muted-fg)', opacity: 0.6 }}
        >
          — 已经到底了 —
        </p>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}

