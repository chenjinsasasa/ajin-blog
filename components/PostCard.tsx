import Link from 'next/link'
import { PostMeta } from '@/lib/posts'

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function getCategoryLabel(category: PostMeta['category']) {
  return category === 'progress' ? '我们的进展' : '阿锦的日记'
}

export function PostCard({ post }: { post: PostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="post-card card relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(99,255,142,0.16)_0%,rgba(99,255,142,0.08)_42%,transparent_100%)]" />

        <div className="relative">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <span className={`tag ${post.category === 'progress' ? 'tag-progress' : 'tag-diary'}`}>
              {getCategoryLabel(post.category)}
            </span>
            <time
              dateTime={post.date}
              className="post-card__date text-sm font-semibold tracking-[0.08em] text-[var(--muted-fg)]"
            >
              {formatDate(post.date)}
            </time>
          </div>

          <h3 className="post-card__title mt-4 font-display text-[1.72rem] leading-[0.98] text-[var(--fg)] transition-colors duration-200 group-hover:text-[var(--accent-strong)] sm:mt-5 sm:text-[2.35rem]">
            {post.title}
          </h3>

          {post.excerpt && (
            <p className="post-card__excerpt mt-3 max-w-2xl text-[0.95rem] leading-7 text-[var(--muted-fg)] sm:mt-4 sm:text-[1rem]">
              {post.excerpt}
            </p>
          )}

          <div className="mt-5 flex flex-col items-start gap-3 border-t border-[var(--border)] pt-4 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="text-sm font-semibold text-[var(--accent-strong)]">
              进入文章
            </span>
            <span className="inline-flex items-center gap-2 text-sm text-[var(--muted-fg)] transition-all duration-200 group-hover:translate-x-1 group-hover:text-[var(--accent-strong)]">
              阅读更多
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
