import { getPostBySlug, getAllSlugs, getAdjacentPosts } from '@/lib/posts'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import LikeButton from '@/components/LikeButton'
import DiaryGuard from '@/components/DiaryGuard'
import ReadingProgress from '@/components/ReadingProgress'
import { Pre, Table } from '@/components/MDXComponents'

import remarkGfm from 'remark-gfm'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeSlug from 'rehype-slug'

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

const AUTHOR_NAME_MAP: Record<string, string> = {
  guzi: '谷子',
  along: '阿龙',
  amao: '阿毛',
  xiaojin: '小锦',
  ajin: '阿锦',
  ashang: '阿商',
  gugu: '咕咕',
  lizi: '梨子',
  xiaou: '小U',
  dangao: '蛋糕',
}

function getAuthorAvatar(author: string): string {
  if (author === 'ajin') return '/avatars/ajin.jpg'
  return `/avatars/${author}.png`
}

function getAuthorName(author: string): string {
  return AUTHOR_NAME_MAP[author] ?? author
}

export default function BlogPost({ params }: Props) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  const { prev, next } = getAdjacentPosts(params.slug)

  const articleContent = (
    <article className="max-w-2xl mx-auto animate-fade-up">
      <ReadingProgress />
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
            fontSize: 'clamp(1.75rem, 6vw, 2.75rem)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
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
          {post.author && (
            <>
              <span aria-hidden style={{ fontSize: '0.625rem', color: 'var(--muted-fg)' }}>·</span>
              <span className="flex items-center gap-1.5" style={{ color: 'var(--muted-fg)' }}>
                <Image
                  src={getAuthorAvatar(post.author)}
                  alt={getAuthorName(post.author)}
                  width={32}
                  height={32}
                  style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <span>{getAuthorName(post.author)}</span>
              </span>
            </>
          )}
        </div>
      </header>

      {/* MDX content */}
      <div className="prose prose-custom">
        <MDXRemote 
          source={post.content} 
          components={{ pre: Pre, table: Table }}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              rehypePlugins: [
                rehypeSlug,
                [
                  rehypePrettyCode as any,
                  {
                    theme: 'github-dark',
                    keepBackground: true,
                    onVisitLine(node: any) {
                      if (node.children.length === 0) {
                        node.children = [{ type: 'text', value: ' ' }]
                      }
                    },
                    onVisitHighlightedLine(node: any) {
                      node.properties.className.push('line--highlighted')
                    },
                    onVisitHighlightedWord(node: any) {
                      node.properties.className = ['word--highlighted']
                    },
                  },
                ],
              ],
            },
          }}
        />
      </div>

      {/* Like button */}
      <div className="mt-16 pt-8 border-t border-[var(--border)]">
        <LikeButton slug={params.slug} />
      </div>

      {/* Prev / Next navigation */}
      <nav
        className="flex items-stretch justify-between gap-4 mt-6 pt-6 border-t border-[var(--border)]"
        aria-label="文章导航"
      >
        {/* prev = older post, shown on left */}
        {prev ? (
          <Link
            href={`/blog/${prev.slug}`}
            className="group flex-1 flex flex-col gap-1 cursor-pointer transition-colors duration-200"
            style={{ maxWidth: '45%' }}
          >
            <span
              className="flex items-center gap-1.5 text-[var(--accent)]"
              style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em' }}
            >
              <svg
                width="13" height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="group-hover:-translate-x-0.5 transition-transform duration-200"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              上一篇
            </span>
            <span
              className="text-[var(--muted-fg)] group-hover:text-[var(--accent)] transition-colors duration-200 line-clamp-2"
              style={{ fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5 }}
            >
              {prev.title}
            </span>
          </Link>
        ) : (
          <div className="flex-1" />
        )}

        {/* next = newer post, shown on right */}
        {next ? (
          <Link
            href={`/blog/${next.slug}`}
            className="group flex-1 flex flex-col items-end gap-1 cursor-pointer transition-colors duration-200"
            style={{ maxWidth: '45%' }}
          >
            <span
              className="flex items-center gap-1.5 text-[var(--accent)]"
              style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em' }}
            >
              下一篇
              <svg
                width="13" height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="group-hover:translate-x-0.5 transition-transform duration-200"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
            <span
              className="text-[var(--muted-fg)] group-hover:text-[var(--accent)] transition-colors duration-200 text-right line-clamp-2"
              style={{ fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5 }}
            >
              {next.title}
            </span>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </nav>

      {/* Back link */}
      <div className="pb-4 mt-6">
        <Link
          href={`/?category=${post.category}`}
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

  if (post.category === 'diary') {
    return <DiaryGuard>{articleContent}</DiaryGuard>
  }

  return articleContent
}
