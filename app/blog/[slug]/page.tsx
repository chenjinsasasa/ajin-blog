import { getPostBySlug, getAllSlugs, getAdjacentPosts, getAllPosts } from '@/lib/posts'
import { compileMDX } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import CoverImage from '@/components/CoverImage'
import Link from 'next/link'
import readingTime from 'reading-time'
import LikeButton from '@/components/LikeButton'
import DiaryGuard from '@/components/DiaryGuard'
import ReadingProgress from '@/components/ReadingProgress'
import ArticleTOC from '@/components/ArticleTOC'
import ArticleActions from '@/components/ArticleActions'
import { Pre, Table } from '@/components/MDXComponents'
import { ArticleImage, ArticleVideo } from '@/components/ArticleMedia'
import { getAuthorName } from '@/lib/authors'
import { formatPostDate, getPostCategoryEyebrow, isPublicPost } from '@/lib/postPresentation'
import { BUSINESS_AREAS } from '@/lib/postTaxonomy'
import { rehypeArticleHeadings, type ArticleHeading } from '@/lib/articleHeadings'
import remarkGfm from 'remark-gfm'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeSlug from 'rehype-slug'
import './article.css'

interface Props { params: { slug: string } }

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPostBySlug(params.slug)
  if (!post) return { title: '文章未找到' }
  return { title: post.title, description: post.excerpt }
}

function ArticleNavCard({ post, label }: { post: { slug: string; title: string } | null; label: string }) {
  return post ? (
    <Link href={`/blog/${post.slug}`} className="detail-nav-card">
      <p className="detail-nav-card__label">{label} <span aria-hidden="true">→</span></p>
      <p className="detail-nav-card__title">{post.title}</p>
    </Link>
  ) : (
    <div className="detail-nav-card detail-nav-card--empty">
      <p className="detail-nav-card__label">{label}</p>
      <p className="detail-nav-card__empty">暂时没有更多文章了。</p>
    </div>
  )
}

export default async function BlogPost({ params }: Props) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()
  const publicPost = isPublicPost(post)
  const publicPosts = publicPost ? getAllPosts().filter(isPublicPost) : []
  const index = publicPosts.findIndex((item) => item.slug === params.slug)
  const { prev, next } = publicPost
    ? { prev: publicPosts[index + 1] ?? null, next: publicPosts[index - 1] ?? null }
    : getAdjacentPosts(params.slug)
  const authorName = post.author ? getAuthorName(post.author) : null
  const businessArea = BUSINESS_AREAS.find((area) => area.value === post.businessArea)?.label
  const minutes = Math.max(1, Math.round(readingTime(post.content).minutes))
  const headings: ArticleHeading[] = []
  const { content } = await compileMDX({
    source: post.content,
    components: { ArticleImage, ArticleVideo, pre: Pre, table: Table },
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [rehypeArticleHeadings as any, { title: post.title, headings }],
          [rehypePrettyCode as any, {
            theme: 'github-dark', keepBackground: true,
            onVisitLine(node: any) {
              if (node.children.length === 0) node.children = [{ type: 'text', value: ' ' }]
            },
            onVisitHighlightedLine(node: any) { node.properties.className.push('line--highlighted') },
            onVisitHighlightedWord(node: any) { node.properties.className = ['word--highlighted'] },
          }],
        ],
      },
    },
  })

  const articleContent = (
    <article className="article-page">
      <ReadingProgress />
      <header className={`article-hero${post.coverImage ? '' : ' article-hero--plain'}`}>
        {post.coverImage && <div className="article-hero__art" aria-hidden="true"><CoverImage src={post.coverImage} showUnavailable={false} alt="" fill priority sizes="(max-width: 767px) 100vw, 65vw" /></div>}
        <div className="article-hero__copy">
          <nav className="article-breadcrumb" aria-label="当前位置"><Link href="/#blog">Archive</Link><span aria-hidden="true">/</span><span>{businessArea}</span><span aria-hidden="true">/</span><span>{getPostCategoryEyebrow(post.category, post.visibility)}</span></nav>
          <h1>{post.title}</h1>
          {post.excerpt && <p className="article-hero__excerpt">{post.excerpt}</p>}
          <div className="article-hero__meta"><time dateTime={post.date}>{formatPostDate(post.date)}</time>{authorName && <span>{authorName}</span>}<span>约 {minutes} 分钟阅读</span><span>{businessArea}</span></div>
          <div className="article-hero__actions"><Link href="/#blog" className="button-primary">← 返回档案</Link><ArticleActions key={post.slug} title={post.title} /></div>
        </div>
      </header>

      <div className="article-layout" data-has-toc={headings.length >= 2}>
        <aside className="article-sidebar" aria-label="文章导航与资料">
          <ArticleTOC key={post.slug} />
          <section className="article-info">
            <h2 className="article-sidebar__heading">文档信息 <small>DOCUMENT INFO</small></h2>
            <dl>
              {authorName && <div><dt>作者</dt><dd>{authorName}</dd></div>}
              <div><dt>发布时间</dt><dd><time dateTime={post.date}>{formatPostDate(post.date)}</time></dd></div>
              <div><dt>阅读时长</dt><dd>约 {minutes} 分钟</dd></div>
              <div><dt>分类</dt><dd>{businessArea}</dd></div>
              {post.tags.length > 0 && <div><dt>标签</dt><dd>{post.tags.join(' · ')}</dd></div>}
            </dl>
          </section>
        </aside>
        <div className="article-reading">
          <div className="prose-custom article-body">{content}</div>
          <section className="detail-response">
            <div><p className="detail-response__eyebrow">Reader Response</p><p className="detail-response__text">如果这一篇对你有触动，可以留一个喜欢。</p></div>
            <LikeButton slug={params.slug} />
          </section>
          <nav className="detail-nav" aria-label="文章导航"><ArticleNavCard post={prev} label="上一篇" /><ArticleNavCard post={next} label="下一篇" /></nav>
        </div>
      </div>
    </article>
  )
  return publicPost ? articleContent : <DiaryGuard>{articleContent}</DiaryGuard>
}
