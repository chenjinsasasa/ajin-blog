import type { PostMeta } from '@/lib/posts'

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return dateStr
  }
}

export function PinnedPostCard({ post }: { post: PostMeta }) {
  return (
    <a href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'block' }} className="group">
      <article
        className="card p-5 sm:p-6 relative overflow-hidden"
        style={{
          border: '1.5px solid color-mix(in srgb, var(--accent) 40%, var(--border))',
        }}
      >
        {/* Accent glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top left, var(--accent-glow) 0%, transparent 70%)', opacity: 0.6 }}
        />

        {/* Top row: 📌 badge + category tag + date */}
        <div className="flex items-center justify-between gap-3 mb-3.5 relative">
          <div className="flex items-center gap-2">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.125rem 0.5rem',
                borderRadius: '0.375rem',
                background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                color: 'var(--accent)',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              }}
            >
              📌 置顶
            </span>
            <span className={`tag ${post.category === 'progress' ? 'tag-progress' : 'tag-diary'}`}>
              {post.category === 'progress' ? '📈 我们的进展' : '📔 阿锦的日记'}
            </span>
          </div>
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
    </a>
  )
}
