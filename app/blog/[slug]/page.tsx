import { getPostBySlug, getAllSlugs } from '@/lib/posts'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import LikeButton from '@/components/LikeButton'

interface Props {
  params: { slug: string }
}

export async function generateStaticParams() {
  const slugs = getAllSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPostBySlug(params.slug)
  if (!post) return { title: '文章未找到' }
  return {
    title: post.title,
    description: post.excerpt,
  }
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  } catch {
    return dateStr
  }
}

export default function BlogPost({ params }: Props) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  return (
    <article className="max-w-2xl mx-auto animate-fade-up">
      {/* Article header */}
      <header className="mb-12">
        {/* Category tag */}
        <div className="mb-5">
          <span className={`tag ${post.category === 'progress' ? 'tag-progress' : 'tag-diary'}`}>
            {post.category === 'progress' ? '📈 我们的进展' : '📔 阿锦的日记'}
          </span>
        </div>

        {/* Decorative accent line */}
        <div className="accent-line" />

        {/* Title */}
        <h1
          className="text-[var(--fg)] mb-4"
          style={{
            fontSize: 'clamp(1.875rem, 5vw, 2.75rem)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1.15,
          }}
        >
          {post.title}
        </h1>

        {/* Excerpt — styled as lead paragraph */}
        {post.excerpt && (
          <p
            className="text-[var(--muted-fg)] mb-6"
            style={{
              fontSize: '1.125rem',
              lineHeight: 1.7,
              fontWeight: 400,
            }}
          >
            {post.excerpt}
          </p>
        )}

        {/* Meta row */}
        <div
          className="flex items-center gap-3 pb-7 border-b border-[var(--border)]"
          style={{ fontSize: '0.8125rem', color: 'var(--muted-fg)', letterSpacing: '0.02em' }}
        >
          <span
            className="text-[var(--accent)]"
            aria-hidden
            style={{ fontSize: '0.625rem' }}
          >
            ✦
          </span>
          <time dateTime={post.date} className="tabular-nums">
            {formatDate(post.date)}
          </time>
        </div>
      </header>

      {/* MDX content */}
      <div className="prose">
        <MDXRemote source={post.content} />
      </div>

      {/* Like button */}
      <div className="mt-16 pt-8 border-t border-[var(--border)]">
        <LikeButton slug={params.slug} />
      </div>

      {/* Back link */}
      <div className="pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 cursor-pointer transition-colors duration-200 group"
          style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted-fg)', letterSpacing: '0.01em' }}
        >
          <svg
            width="15" height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="group-hover:-translate-x-0.5 transition-transform duration-200"
            style={{ color: 'var(--accent)' }}
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span className="group-hover:text-[var(--accent)] transition-colors duration-200">
            返回首页
          </span>
        </Link>
      </div>
    </article>
  )
}
