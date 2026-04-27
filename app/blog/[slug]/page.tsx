import { getPostBySlug, getAllSlugs, getAdjacentPosts } from '@/lib/posts'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import readingTime from 'reading-time'
import LikeButton from '@/components/LikeButton'
import DiaryGuard from '@/components/DiaryGuard'
import ReadingProgress from '@/components/ReadingProgress'
import { Pre, Table } from '@/components/MDXComponents'
import { getAuthorName } from '@/lib/authors'
import { formatPostDate, getPostCategoryEyebrow } from '@/lib/postPresentation'

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

function formatReadingTime(content: string) {
  const minutes = Math.max(1, Math.round(readingTime(content).minutes))
  return `${minutes} min read`
}

function ArticleNavCard({
  post,
  label,
}: {
  post: { slug: string; title: string } | null
  label: string
}) {
  if (!post) {
    return (
      <div className="detail-nav-card detail-nav-card--empty">
        <p className="detail-nav-card__label">{label}</p>
        <p className="detail-nav-card__empty">暂时没有更多文章了。</p>
      </div>
    )
  }

  return (
    <Link href={`/blog/${post.slug}`} className="detail-nav-card">
      <p className="detail-nav-card__label">{label}</p>
      <p className="detail-nav-card__title">{post.title}</p>
    </Link>
  )
}

export default function BlogPost({ params }: Props) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  const { prev, next } = getAdjacentPosts(params.slug)
  const authorName = post.author ? getAuthorName(post.author) : null

  const articleContent = (
    <article className="detail-page">
      <ReadingProgress />

      <section className="detail-announce">
        <p className="detail-announce__eyebrow">Not A Reader Yet?</p>
        <p className="detail-announce__copy">
          首页是一份导览，真正持续更新的部分在文章 Archive 里。
        </p>
        <Link href="/#blog" className="detail-announce__link">
          Read The Archive
        </Link>
      </section>

      <div className="detail-page__container">
        <header className="detail-header">
          <p className="detail-header__eyebrow">{getPostCategoryEyebrow(post.category)}</p>

          <div className="detail-header__meta">
            <time dateTime={post.date} className="detail-header__meta-item">
              {formatPostDate(post.date, 'en-US')}
            </time>
            {authorName && (
              <span className="detail-header__meta-item">
                {authorName}
              </span>
            )}
            <span className="detail-header__meta-item">
              {formatReadingTime(post.content)}
            </span>
          </div>

          <h1 className="detail-header__title">{post.title}</h1>

          {post.excerpt && (
            <p className="detail-header__excerpt">{post.excerpt}</p>
          )}
        </header>

        <section className="detail-content">
          <div className="prose prose-custom max-w-none">
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
        </section>

        <section className="detail-response">
          <div className="detail-response__copy">
            <p className="detail-response__eyebrow">Reader Response</p>
            <p className="detail-response__text">
              如果这一篇对你有触动，可以留一个喜欢。对写作者来说，这是一种很安静但很实在的回应。
            </p>
          </div>
          <LikeButton slug={params.slug} />
        </section>

        <nav className="detail-nav" aria-label="文章导航">
          <ArticleNavCard post={prev} label="上一篇" />
          <ArticleNavCard post={next} label="下一篇" />
        </nav>
      </div>
    </article>
  )

  if (post.category === 'diary') {
    return <DiaryGuard>{articleContent}</DiaryGuard>
  }

  return articleContent
}
