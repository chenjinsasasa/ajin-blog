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
      <article className="card p-5 sm:p-6 relative overflow-hidden">
        {/* Subtle accent glow on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top left, var(--accent-glow) 0%, transparent 70%)' }}
        />

        {/* Top row: category tag + date */}
        <div className="flex items-center justify-between gap-3 mb-3.5 relative">
          <span className={`tag ${post.category === 'progress' ? 'tag-progress' : 'tag-diary'}`}>
            {post.category === 'progress' ? '📈 我们的进展' : '📔 阿锦的日记'}
          </span>
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
    </Link>
  )
}
