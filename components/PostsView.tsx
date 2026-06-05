'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { PostCard } from '@/components/PostCard'
import type { PostMeta } from '@/lib/posts'
import type { PostTag } from '@/lib/postTags'

const LOAD_MORE_SIZE = 6

interface PostsViewProps {
  posts: PostMeta[]
  totalCount?: number
  category?: string
  availableTags?: PostTag[]
  selectedTag?: PostTag
  initialHasMore?: boolean
}

export default function PostsView({
  posts: initialPosts,
  totalCount: totalCountProp,
  category = 'all',
  availableTags = [],
  selectedTag,
  initialHasMore = false,
}: PostsViewProps) {
  const [posts, setPosts] = useState<PostMeta[]>(initialPosts)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setPosts(initialPosts)
    setHasMore(initialHasMore)
  }, [category, selectedTag, initialPosts, initialHasMore])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)

    try {
      const offset = posts.length
      const params = new URLSearchParams({
        category,
        offset: String(offset),
        limit: String(LOAD_MORE_SIZE),
      })

      if (selectedTag) {
        params.set('tag', selectedTag)
      }

      const res = await fetch(`/api/posts?${params.toString()}`)
      const data = await res.json() as { posts: PostMeta[]; hasMore: boolean }
      setPosts((prev) => [...prev, ...data.posts])
      setHasMore(data.hasMore)
    } catch (error) {
      console.error('Failed to load more posts', error)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, posts.length, category, selectedTag])
  const totalCount = totalCountProp ?? posts.length

  function getTagHref(tag?: PostTag) {
    const params = new URLSearchParams()

    if (category !== 'all') {
      params.set('category', category)
    }

    if (tag) {
      params.set('tag', tag)
    }

    const query = params.toString()
    return `/${query ? `?${query}` : ''}#blog`
  }

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
      {availableTags.length > 0 && (
        <nav className="post-filter" aria-label="文章标签">
          <Link
            href={getTagHref()}
            className={`post-filter__item ${!selectedTag ? 'post-filter__item--active' : ''}`}
            aria-current={!selectedTag ? 'page' : undefined}
          >
            全部
          </Link>
          {availableTags.map((tag) => (
            <Link
              key={tag}
              href={getTagHref(tag)}
              className={`post-filter__item ${selectedTag === tag ? 'post-filter__item--active' : ''}`}
              aria-current={selectedTag === tag ? 'page' : undefined}
            >
              {tag}
            </Link>
          ))}
        </nav>
      )}

      <div className="post-grid">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>

      {hasMore ? (
        <div className="post-grid__footer">
          <button
            onClick={() => void loadMore()}
            disabled={loading}
            className="load-more-button"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      ) : null}

      {loading && hasMore && (
        <div className="flex justify-center py-6">
          <span
            className="inline-block h-6 w-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]"
            style={{ animation: 'spin 0.7s linear infinite' }}
          />
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
