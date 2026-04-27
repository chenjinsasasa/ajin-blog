import Link from 'next/link'
import type { PostMeta } from '@/lib/posts'
import { PostCategoryTag } from '@/components/PostCategoryTag'
import { formatPostDate } from '@/lib/postPresentation'

export function PinnedPostCard({ post }: { post: PostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="pinned-post-card card relative overflow-hidden p-5 sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(188,155,106,0.18)_0%,rgba(188,155,106,0.1)_42%,transparent_100%)]" />

        <div className="relative grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1.45fr)_220px] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="tag tag-pinned">置顶文章</span>
              <PostCategoryTag category={post.category} />
            </div>

            <h3 className="pinned-post-card__title mt-4 max-w-3xl font-display text-[2rem] leading-[0.95] text-[var(--fg)] transition-colors duration-200 group-hover:text-[var(--accent-strong)] sm:mt-5 sm:text-[3.3rem]">
              {post.title}
            </h3>

            {post.excerpt && (
              <p className="pinned-post-card__excerpt mt-3 max-w-2xl text-[0.98rem] leading-7 text-[var(--muted-fg)] sm:mt-4 sm:text-[1.05rem] sm:leading-8">
                {post.excerpt}
              </p>
            )}

            <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)] transition-transform duration-200 group-hover:translate-x-1 sm:mt-6">
              从这一篇开始
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </div>

          <div className="pinned-post-card__note rounded-[20px] border border-[var(--border)] bg-[var(--panel-soft)] p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-fg)]">
              Editor&apos;s Note
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-fg)]">
              这篇会一直留在前面，适合作为进入这本博客的第一站。
            </p>
            <time
              dateTime={post.date}
              className="mt-6 block text-sm font-semibold tracking-[0.08em] text-[var(--fg)]"
            >
              {formatPostDate(post.date)}
            </time>
          </div>
        </div>
      </article>
    </Link>
  )
}
