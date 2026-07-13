'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PostCard } from '@/components/PostCard'
import type { PostMeta } from '@/lib/posts'
import {
  BUSINESS_AREAS,
  PROJECTS,
  WORK_STAGES,
  type BusinessArea,
  type PostFilters,
} from '@/lib/postTaxonomy'

const LOAD_MORE_SIZE = 6

interface FilterOption {
  value: string
  label: string
}

interface PostsViewProps {
  posts: PostMeta[]
  totalCount?: number
  filters?: PostFilters
  authorOptions?: FilterOption[]
  monthOptions?: string[]
  initialHasMore?: boolean
}

function formatMonth(month: string) {
  const [year, value] = month.split('-')
  return `${year}年${value}月`
}

export default function PostsView({
  posts: initialPosts,
  totalCount: totalCountProp,
  filters = {},
  authorOptions = [],
  monthOptions = [],
  initialHasMore = false,
}: PostsViewProps) {
  const router = useRouter()
  const [posts, setPosts] = useState<PostMeta[]>(initialPosts)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const filterKey = JSON.stringify(filters)

  useEffect(() => {
    setPosts(initialPosts)
    setHasMore(initialHasMore)
    setLoadError(false)
  }, [filterKey, initialPosts, initialHasMore])

  async function loadMore() {
    if (loading || !hasMore) return
    setLoading(true)
    setLoadError(false)

    try {
      const params = new URLSearchParams({
        offset: String(posts.length),
        limit: String(LOAD_MORE_SIZE),
      })

      for (const [key, value] of Object.entries(filters)) {
        if (value && value !== 'all') params.set(key, value)
      }

      const res = await fetch(`/api/posts?${params.toString()}`)
      if (!res.ok) throw new Error(`Posts API returned ${res.status}`)

      const data = await res.json() as { posts: PostMeta[]; hasMore: boolean }
      setPosts((previousPosts) => [...previousPosts, ...data.posts])
      setHasMore(data.hasMore)
    } catch (error) {
      setLoadError(true)
      console.error('Failed to load more posts', error)
    } finally {
      setLoading(false)
    }
  }

  const totalCount = totalCountProp ?? posts.length
  const secondaryFilterCount = [filters.stage, filters.project, filters.author, filters.month]
    .filter(Boolean).length
  const hasAnyFilter = Boolean(filters.area || secondaryFilterCount)

  function getAreaHref(area?: BusinessArea) {
    const params = new URLSearchParams()

    for (const [key, value] of Object.entries(filters)) {
      if (key !== 'area' && value && value !== 'all') params.set(key, value)
    }
    if (area) params.set('area', area)

    const query = params.toString()
    return `/${query ? `?${query}` : ''}#blog`
  }

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const params = new URLSearchParams()

    for (const [key, value] of Array.from(formData.entries())) {
      const normalizedValue = String(value).trim()
      if (normalizedValue) params.set(key, normalizedValue)
    }

    const query = params.toString()
    router.push(`/${query ? `?${query}` : ''}#blog`)
  }

  return (
    <>
      <div className="archive-filters">
        <nav className="post-filter" aria-label="业务范围">
          <Link
            href={getAreaHref()}
            className={`post-filter__item ${!filters.area ? 'post-filter__item--active' : ''}`}
            aria-current={!filters.area ? 'page' : undefined}
          >
            全部
          </Link>
          {BUSINESS_AREAS.map((area) => (
            <Link
              key={area.value}
              href={getAreaHref(area.value)}
              className={`post-filter__item ${filters.area === area.value ? 'post-filter__item--active' : ''}`}
              aria-current={filters.area === area.value ? 'page' : undefined}
            >
              {area.label}
            </Link>
          ))}
        </nav>

        <details className="archive-filter-panel" open={secondaryFilterCount > 0}>
          <summary className="archive-filter-panel__summary">
            <span>筛选</span>
            {secondaryFilterCount > 0 && (
              <span className="archive-filter-panel__count">{secondaryFilterCount}</span>
            )}
          </summary>

          <form action="/#blog" method="get" className="archive-filter-form" onSubmit={applyFilters}>
            {filters.area && <input type="hidden" name="area" value={filters.area} />}

            <label className="archive-filter-field">
              <span>阶段</span>
              <select name="stage" defaultValue={filters.stage ?? ''}>
                <option value="">全部阶段</option>
                {WORK_STAGES.map((stage) => (
                  <option key={stage.value} value={stage.value}>{stage.label}</option>
                ))}
              </select>
            </label>

            <label className="archive-filter-field">
              <span>项目</span>
              <select name="project" defaultValue={filters.project ?? ''}>
                <option value="">全部项目</option>
                {(['current', 'watchlist', 'historical'] as const).map((status) => (
                  <optgroup
                    key={status}
                    label={{ current: '当前', watchlist: '观察', historical: '历史' }[status]}
                  >
                    {PROJECTS.filter((project) => project.status === status).map((project) => (
                      <option key={project.value} value={project.value}>{project.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <label className="archive-filter-field">
              <span>作者</span>
              <select name="author" defaultValue={filters.author ?? ''}>
                <option value="">全部作者</option>
                {authorOptions.map((author) => (
                  <option key={author.value} value={author.value}>{author.label}</option>
                ))}
              </select>
            </label>

            <label className="archive-filter-field">
              <span>时间</span>
              <select name="month" defaultValue={filters.month ?? ''}>
                <option value="">全部时间</option>
                {monthOptions.map((month) => (
                  <option key={month} value={month}>{formatMonth(month)}</option>
                ))}
              </select>
            </label>

            <div className="archive-filter-form__actions">
              {hasAnyFilter && <Link href="/#blog" className="archive-filter-clear">清除</Link>}
              <button type="submit" className="archive-filter-submit">应用</button>
            </div>
          </form>
        </details>

        <p className="archive-filter-result">{totalCount} 篇文章</p>
      </div>

      {totalCount === 0 ? (
        <div className="archive-empty">
          <h3>暂无文章</h3>
          <Link href="/#blog">清除筛选</Link>
        </div>
      ) : (
        <>
          <div className="post-grid">
            {posts.map((post) => <PostCard key={post.slug} post={post} />)}
          </div>

          {(hasMore || loadError) && (
            <div className="post-grid__footer">
              <button
                onClick={() => void loadMore()}
                disabled={loading}
                className="load-more-button"
              >
                {loading ? '加载中' : loadError ? '重试' : '更多'}
              </button>
              {loadError && <p className="archive-load-error">加载失败</p>}
            </div>
          )}
        </>
      )}
    </>
  )
}
