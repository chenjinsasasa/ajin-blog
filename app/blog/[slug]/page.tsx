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
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
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

function getCategoryMeta(category: 'progress' | 'diary') {
  return category === 'progress'
    ? {
        label: '我们的进展',
        eyebrow: 'Build Log',
        note: '写下项目推进中的节奏、决策和阶段复盘。',
      }
    : {
        label: '阿锦的日记',
        eyebrow: 'Private Journal',
        note: '把更私人、更靠近日常的部分留在这里。',
      }
}

function ArticleNavCard({
  post,
  label,
  align = 'left',
}: {
  post: { slug: string; title: string } | null
  label: string
  align?: 'left' | 'right'
}) {
  if (!post) {
    return (
      <div className="card p-5 opacity-60">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-fg)]">
          {label}
        </p>
        <p className="mt-3 text-sm leading-7 text-[var(--muted-fg)]">
          暂时没有更多文章了。
        </p>
      </div>
    )
  }

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-fg)]">
          {label}
        </p>
        <p
          className={`mt-3 font-display text-[1.45rem] leading-[1] text-[var(--fg)] transition-colors duration-200 group-hover:text-[var(--accent-strong)] sm:text-[1.7rem] ${
            align === 'right' ? 'sm:text-right' : ''
          }`}
        >
          {post.title}
        </p>
      </div>
    </Link>
  )
}

export default function BlogPost({ params }: Props) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  const { prev, next } = getAdjacentPosts(params.slug)
  const categoryMeta = getCategoryMeta(post.category)

  const articleContent = (
    <article className="article-shell mx-auto max-w-[760px] animate-fade-up lg:max-w-[920px] xl:max-w-[980px]">
      <ReadingProgress />

      <header className="mb-8">
        <div className="card relative overflow-hidden p-5 sm:p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(99,255,142,0.26)_0%,rgba(99,255,142,0.18)_34%,rgba(99,255,142,0.08)_68%,transparent_100%)]" />
          <div className="pointer-events-none absolute -top-10 left-[-6%] h-36 w-[82%] rounded-full bg-[rgba(99,255,142,0.14)] blur-3xl" />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`tag ${post.category === 'progress' ? 'tag-progress' : 'tag-diary'}`}>
                {categoryMeta.label}
              </span>
              <span className="tag tag-neutral">{categoryMeta.eyebrow}</span>
            </div>

            <p className="section-kicker mt-6">{categoryMeta.note}</p>
            <h1 className="max-w-5xl font-display text-[2.25rem] leading-[0.94] text-[var(--fg)] sm:text-[4rem] lg:max-w-[880px]">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mt-4 max-w-4xl text-[1rem] leading-7 text-[var(--muted-fg)] sm:mt-5 sm:text-[1.12rem] sm:leading-8 lg:max-w-[860px]">
                {post.excerpt}
              </p>
            )}

            <div className={`mt-7 grid gap-3 ${post.author ? 'sm:grid-cols-2' : ''}`}>
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-fg)]">
                  发布时间
                </p>
                <time dateTime={post.date} className="mt-2 block text-sm font-semibold leading-7 text-[var(--fg)]">
                  {formatDate(post.date)}
                </time>
              </div>

              {post.author && (
                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-fg)]">
                    作者
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <Image
                      src={getAuthorAvatar(post.author)}
                      alt={getAuthorName(post.author)}
                      width={44}
                      height={44}
                      className="rounded-[14px] object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[var(--fg)]">
                        {getAuthorName(post.author)}
                      </p>
                      <p className="text-sm text-[var(--muted-fg)]">
                        与你一起把事情做成的人。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="card p-5 sm:p-8 lg:p-10">
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
      </div>

      <div className="card mt-6 p-5 sm:p-6">
        <div className="mb-4">
          <p className="section-kicker">Reader Response</p>
          <p className="text-sm leading-7 text-[var(--muted-fg)]">
            如果这一篇对你有触动，可以留一个喜欢。对写作者来说，这是一种很实在的回应。
          </p>
        </div>
        <LikeButton slug={params.slug} />
      </div>

      <nav className="mt-6 grid gap-4 sm:grid-cols-2" aria-label="文章导航">
        <ArticleNavCard post={prev} label="上一篇" />
        <ArticleNavCard post={next} label="下一篇" align="right" />
      </nav>

      <div className="mt-6 flex justify-center">
        <Link href={`/?category=${post.category}`} className="button-secondary px-5 py-3 text-sm">
          返回列表
        </Link>
      </div>
    </article>
  )

  if (post.category === 'diary') {
    return <DiaryGuard>{articleContent}</DiaryGuard>
  }

  return articleContent
}
