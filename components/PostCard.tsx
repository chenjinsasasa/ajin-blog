import CoverImage from '@/components/CoverImage'
import Link from 'next/link'
import type { PostMeta } from '@/lib/posts'
import { formatPostDate } from '@/lib/postPresentation'
import { BUSINESS_AREAS } from '@/lib/postTaxonomy'

export function PostCard({ post, compact = false }: { post: PostMeta; compact?: boolean }) {
  const cover = post.coverImage || post.fallbackCoverImage
  const area = BUSINESS_AREAS.find((item) => item.value === post.businessArea)?.label

  return (
    <Link href={`/blog/${post.slug}`} className={`post-list-card${compact ? ' post-list-card--compact' : ''}`}>
      <article className="post-list-card__inner">
        {!compact && cover && (
          <div className="post-list-card__media">
            <CoverImage src={cover} alt="" fill sizes="(max-width: 767px) 100vw, (max-width: 1099px) 45vw, 28vw" className="post-list-card__image" />
          </div>
        )}
        <div className="post-list-card__text">
          <p className="post-list-card__category">{area}</p>
          <h3 className="post-list-card__title">{post.title}</h3>
          {post.excerpt && <p className="post-list-card__summary">{post.excerpt}</p>}
        </div>
        <div className="post-list-card__meta">
          <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          <span className="post-list-card__arrow" aria-label="阅读全文">→</span>
        </div>
      </article>
    </Link>
  )
}
