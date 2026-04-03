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

export function PostCard({ post }: { post: PostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className="block group">
      <article className="card p-5 sm:p-6">
        {/* Top row: category tag + date */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className={`tag ${post.category === 'progress' ? 'tag-progress' : 'tag-diary'}`}>
            {post.category === 'progress' ? '📈 我们的进展' : '📔 阿锦的日记'}
          </span>
          <time
            dateTime={post.date}
            className="text-xs text-[var(--muted-fg)] tabular-nums shrink-0"
          >
            {formatDate(post.date)}
          </time>
        </div>

        {/* Title */}
        <h2
          className="font-bold text-[var(--fg)] text-lg leading-snug mb-2 group-hover:text-[var(--accent)] transition-colors duration-150"
          style={{ letterSpacing: '-0.02em' }}
        >
          {post.title}
        </h2>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-sm text-[var(--muted-fg)] leading-relaxed line-clamp-2">
            {post.excerpt}
          </p>
        )}

        {/* Read more arrow */}
        <div className="mt-4 flex items-center gap-1 text-xs font-medium text-[var(--muted-fg)] group-hover:text-[var(--accent)] transition-colors duration-150">
          <span>阅读全文</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:translate-x-0.5 transition-transform duration-150">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </div>
      </article>
    </Link>
  )
}
