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

function formatDay(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return String(d.getDate()).padStart(2, '0')
  } catch {
    return dateStr
  }
}

function groupByMonth(posts: PostMeta[]): { monthKey: string; items: PostMeta[] }[] {
  const map = new Map<string, PostMeta[]>()

  for (const post of posts) {
    const key = formatMonthKey(post.date)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(post)
  }

  return Array.from(map.entries()).map(([monthKey, items]) => ({ monthKey, items }))
}

function getCategoryLabel(category: PostMeta['category']) {
  return category === 'progress' ? '我们的进展' : '阿锦的日记'
}

export default function TimelineView({ posts, pinnedPost }: TimelineViewProps) {
  const groups = groupByMonth(posts)

  return (
    <div className="space-y-8">
      {pinnedPost && (
        <div className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tag tag-pinned">置顶文章</span>
            <span className={`tag ${pinnedPost.category === 'progress' ? 'tag-progress' : 'tag-diary'}`}>
              {getCategoryLabel(pinnedPost.category)}
            </span>
          </div>

          <Link href={`/blog/${pinnedPost.slug}`} className="group mt-4 block">
            <h3 className="font-display text-[2rem] leading-[0.96] text-[var(--fg)] transition-colors duration-200 group-hover:text-[var(--accent-strong)]">
              {pinnedPost.title}
            </h3>
            {pinnedPost.excerpt && (
              <p className="mt-3 max-w-3xl text-[0.98rem] leading-7 text-[var(--muted-fg)]">
                {pinnedPost.excerpt}
              </p>
            )}
          </Link>
        </div>
      )}

      {groups.map(({ monthKey, items }) => (
        <section key={monthKey} className="timeline-section grid gap-4 lg:grid-cols-[160px_minmax(0,1fr)]">
          <div className="lg:pt-4">
            <p className="section-kicker">Month</p>
            <h3 className="timeline-month-title font-display text-[1.7rem] text-[var(--fg)] sm:text-[2rem]">{monthKey}</h3>
          </div>

          <div className="timeline-rail space-y-3 border-l border-[var(--border-strong)] pl-4 sm:pl-5">
            {items.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="timeline-item group relative block rounded-[20px] border border-[var(--border)] bg-[var(--panel-soft)] p-4 transition-all duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--accent-soft)]"
              >
                <span className="timeline-item__dot absolute -left-[1.35rem] top-6 h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_0_6px_var(--accent-softer)] sm:-left-[1.65rem]" />

                <div className="grid gap-3 sm:grid-cols-[64px_minmax(0,1fr)] sm:items-start">
                  <div className="timeline-item__day text-sm font-semibold tracking-[0.18em] text-[var(--muted-fg)]">
                    {formatDay(post.date)}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`tag ${post.category === 'progress' ? 'tag-progress' : 'tag-diary'}`}>
                        {getCategoryLabel(post.category)}
                      </span>
                    </div>
                    <p className="timeline-item__title mt-3 font-display text-[1.4rem] leading-[1] text-[var(--fg)] transition-colors duration-200 group-hover:text-[var(--accent-strong)] sm:text-[1.6rem]">
                      {post.title}
                    </p>
                    {post.excerpt && (
                      <p className="timeline-item__excerpt mt-2 text-sm leading-7 text-[var(--muted-fg)]">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
