import { getPostBySlug, getAllSlugs } from '@/lib/posts'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'

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
    <article className="max-w-2xl mx-auto">
      {/* Article header */}
      <header className="mb-10">
        {/* Category tag */}
        <div className="mb-4">
          <span className={`tag ${post.category === 'progress' ? 'tag-progress' : 'tag-diary'}`}>
            {post.category === 'progress' ? '📈 我们的进展' : '📔 阿锦的日记'}
          </span>
        </div>

        {/* Title */}
        <h1
          className="text-3xl sm:text-4xl font-bold text-[var(--fg)] leading-tight mb-4"
          style={{ letterSpacing: '-0.03em' }}
        >
          {post.title}
        </h1>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-lg text-[var(--muted-fg)] leading-relaxed mb-5">
            {post.excerpt}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-sm text-[var(--muted-fg)] pb-6 border-b border-[var(--border)]">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </div>
      </header>

      {/* MDX content */}
      <div className="prose">
        <MDXRemote source={post.content} />
      </div>

      {/* Back link */}
      <div className="mt-16 pt-8 border-t border-[var(--border)]">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-fg)] hover:text-[var(--accent)] transition-colors duration-150"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          返回首页
        </Link>
      </div>
    </article>
  )
}
