'use client'

import Link from 'next/link'
import type { PostMeta } from '@/lib/posts'

interface TimelineViewProps {
  posts: PostMeta[]
  pinnedPost?: PostMeta | null
}

function formatMonthKey(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    return `${year}年${String(month).padStart(2, '0')}月`
  } catch {
    return dateStr.slice(0, 7)
  }
}

function groupByMonth(posts: PostMeta[]): { monthKey: string; items: PostMeta[] }[] {
  const map = new Map<string, PostMeta[]>()
  for (const post of posts) {
    const key = formatMonthKey(post.date)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(post)
  }
  // Preserve insertion order (posts are already sorted newest-first)
  return Array.from(map.entries()).map(([monthKey, items]) => ({ monthKey, items }))
}

export default function TimelineView({ posts, pinnedPost }: TimelineViewProps) {
  const groups = groupByMonth(posts)

  return (
    <div className="flex flex-col gap-8">
      {/* Pinned post at the very top, before month groups */}
      {pinnedPost && (
        <div>
          <div
            className="flex items-center gap-3 mb-4"
            style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', textTransform: 'uppercase' }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--accent)',
                flexShrink: 0,
              }}
            />
            <span>📌 置顶</span>
          </div>

          <div className="flex flex-col" style={{ borderLeft: '2px solid color-mix(in srgb, var(--accent) 40%, var(--border))', marginLeft: 3 }}>
            <Link
              href={`/blog/${pinnedPost.slug}`}
              className="group flex items-start gap-4 py-3 transition-colors duration-200"
              style={{ paddingLeft: '1.25rem', textDecoration: 'none' }}
            >
              {/* Timeline dot */}
              <span
                style={{
                  position: 'absolute',
                  marginLeft: '-1.375rem',
                  marginTop: '0.35rem',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  flexShrink: 0,
                  opacity: 0.8,
                  transition: 'opacity 0.2s',
                }}
                className="group-hover:opacity-100"
              />

              <div className="flex flex-col gap-1 min-w-0" style={{ position: 'relative', marginLeft: 0 }}>
                {/* Pinned badge + title */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '0.3rem',
                      background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                      color: 'var(--accent)',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                      flexShrink: 0,
                    }}
                  >
                    📌 置顶
                  </span>
                  <span
                    className="group-hover:text-[var(--accent)] transition-colors duration-200 truncate block"
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      color: 'var(--fg)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {pinnedPost.title}
                  </span>
                </div>

                {/* Excerpt */}
                {pinnedPost.excerpt && (
                  <span
                    className="block truncate"
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--muted-fg)',
                      lineHeight: 1.5,
                    }}
                  >
                    {pinnedPost.excerpt}
                  </span>
                )}

                {/* Category tag */}
                <span
                  className={`tag ${pinnedPost.category === 'progress' ? 'tag-progress' : 'tag-diary'}`}
                  style={{ alignSelf: 'flex-start', marginTop: '0.125rem' }}
                >
                  {pinnedPost.category === 'progress' ? '📈 进展' : '📔 日记'}
                </span>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Regular posts grouped by month */}
      {groups.map(({ monthKey, items }) => (
        <div key={monthKey}>
          {/* Month heading */}
          <div
            className="flex items-center gap-3 mb-4"
            style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted-fg)', textTransform: 'uppercase' }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--accent)',
                flexShrink: 0,
              }}
            />
            <span>{monthKey}</span>
          </div>

          {/* Items for this month */}
          <div className="flex flex-col" style={{ borderLeft: '2px solid var(--border)', marginLeft: 3 }}>
            {items.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex items-start gap-4 py-3 transition-colors duration-200"
                style={{ paddingLeft: '1.25rem', textDecoration: 'none' }}
              >
                {/* Timeline dot */}
                <span
                  style={{
                    position: 'absolute',
                    marginLeft: '-1.375rem',
                    marginTop: '0.35rem',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    flexShrink: 0,
                    opacity: 0.5,
                    transition: 'opacity 0.2s',
                  }}
                  className="group-hover:opacity-100"
                />

                <div className="flex flex-col gap-1 min-w-0" style={{ position: 'relative', marginLeft: 0 }}>
                  {/* Title */}
                  <span
                    className="group-hover:text-[var(--accent)] transition-colors duration-200 truncate block"
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      color: 'var(--fg)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {post.title}
                  </span>

                  {/* Excerpt */}
                  {post.excerpt && (
                    <span
                      className="block truncate"
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--muted-fg)',
                        lineHeight: 1.5,
                      }}
                    >
                      {post.excerpt}
                    </span>
                  )}

                  {/* Category tag */}
                  <span
                    className={`tag ${post.category === 'progress' ? 'tag-progress' : 'tag-diary'}`}
                    style={{ alignSelf: 'flex-start', marginTop: '0.125rem' }}
                  >
                    {post.category === 'progress' ? '📈 进展' : '📔 日记'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
