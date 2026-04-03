import { getPostsWithPinned, Category } from '@/lib/posts'
import PostsView from '@/components/PostsView'

interface HomeProps {
  searchParams: { category?: string }
}

export default function Home({ searchParams }: HomeProps) {
  const category = (searchParams.category as Category) ?? 'all'
  const { pinnedPost, posts } = getPostsWithPinned(category)

  const totalCount = posts.length + (pinnedPost ? 1 : 0)

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
      </div>

      {/* Post list (with view toggle) */}
      <PostsView pinnedPost={pinnedPost} posts={posts} totalCount={totalCount} />
    </div>
  )
}
