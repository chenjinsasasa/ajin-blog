import Image from 'next/image'
import Link from 'next/link'
import { PostMeta } from '@/lib/posts'
import { HISTORICAL_COVERS } from '@/lib/historicalCovers'
import { getAuthorName } from '@/lib/authors'

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function getCategoryLabel(category: PostMeta['category']) {
  return category === 'progress' ? 'Ajin Team' : 'Ajin'
}

export function PostCard({ post }: { post: PostMeta }) {
  const fallbackCover = post.fallbackCoverImage || HISTORICAL_COVERS[0].src
  const authorName = post.author ? getAuthorName(post.author) : getCategoryLabel(post.category)

  return (
    <Link href={`/blog/${post.slug}`} className="post-list-card">
      <article className="post-list-card__inner">
        <div className="post-list-card__media">
          <Image
            src={post.coverImage || fallbackCover}
            alt={post.title}
            fill
            sizes="(max-width: 767px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="post-list-card__image"
          />
        </div>

        <div className="post-list-card__text">
          <h3 className="post-list-card__title">{post.title}</h3>

          {post.excerpt ? (
            <div className="post-list-card__excerpt">
              <p>{post.excerpt}</p>
            </div>
          ) : null}

          <span className="post-list-card__read-more">Read Full Post</span>
        </div>

        <div className="post-list-card__meta">
          <span>{authorName}</span>
          <span>{formatDate(post.date)}</span>
        </div>
      </article>
    </Link>
  )
}
