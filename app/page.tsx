import { getPostsWithPinned, Category } from '@/lib/posts'
import PostsView from '@/components/PostsView'
import DiaryGuard from '@/components/DiaryGuard'
import { PinnedPostCard } from '@/components/PinnedPostCard'
import AgentsView from '@/components/AgentsView'

const PAGE_SIZE = 10

interface HomeProps {
  searchParams: { category?: string }
}

export default function Home({ searchParams }: HomeProps) {
  const category = (searchParams.category as Category) ?? 'all'
  const isHome = !searchParams.category
  const isTeam = searchParams.category === 'team'

  const categoryLabels: Record<string, string> = {
    all: '阿锦的博客',
    progress: '我们的进展',
    diary: '阿锦的日记',
    team: '我们是谁',
  }

  // Team page — no posts needed
  if (isTeam) {
    return (
      <div className="animate-fade-up">
        <div className="mb-8">
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
            我们是谁
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted-fg)', lineHeight: 1.65 }}>
            阿锦和他的 AI 团队。点击头像了解每个成员。
          </p>
        </div>
        <AgentsView />
      </div>
    )
  }

  const { pinnedPost, posts: allPosts } = getPostsWithPinned(category)
  const initialPosts = allPosts.slice(0, PAGE_SIZE)
  const hasMore = allPosts.length > PAGE_SIZE
  const totalCount = allPosts.length + (!isHome && pinnedPost ? 1 : 0)

  const postList = (
    <PostsView
      pinnedPost={isHome ? null : pinnedPost}
      posts={initialPosts}
      totalCount={totalCount}
      category={category}
      initialHasMore={hasMore}
    />
  )

  return (
    <div className="animate-fade-up">
      <div className="mb-6">
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
          {categoryLabels[category] ?? '阿锦的博客'}
        </h1>
      </div>

      {/* Pinned post — only on home */}
      {isHome && pinnedPost && (
        <div className="mb-8">
          <PinnedPostCard post={pinnedPost} />
        </div>
      )}

      {category === 'diary' ? (
        <DiaryGuard>{postList}</DiaryGuard>
      ) : (
        postList
      )}
    </div>
  )
}
