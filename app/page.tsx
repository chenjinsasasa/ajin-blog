import { getAllPosts, Category } from '@/lib/posts'
import { PostCard } from '@/components/PostCard'

interface HomeProps {
  searchParams: { category?: string }
}

export default function Home({ searchParams }: HomeProps) {
  const category = (searchParams.category as Category) ?? 'all'
  const posts = getAllPosts(category)

  const categoryLabels: Record<string, string> = {
    all: '全部文章',
    progress: '我们的进展',
    diary: '阿锦的日记',
  }

  return (
    <div className="animate-fade-up">
      {/* Page heading */}
      <div className="mb-10">
        {/* Decorative accent line */}
        <div className="accent-line" />
        <h1
          className="text-[var(--fg)]"
          style={{
            fontSize: 'clamp(1.75rem, 5vw, 2.25rem)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1.15,
            marginBottom: '0.5rem',
          }}
        >
          {categoryLabels[category] ?? '全部文章'}
        </h1>
        <p
          className="text-[var(--muted-fg)]"
          style={{ fontSize: '0.875rem', letterSpacing: '0.01em' }}
        >
          {posts.length > 0
            ? `共 ${posts.length} 篇，按时间倒序`
            : '还没有文章'}
        </p>
      </div>

      {/* Post list */}
      {posts.length === 0 ? (
        <div
          className="text-center py-24 text-[var(--muted-fg)]"
          style={{ opacity: 0.7 }}
        >
          <p className="text-4xl mb-4" aria-hidden>✍️</p>
          <p className="text-base font-medium">还没有文章，去写第一篇吧～</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
