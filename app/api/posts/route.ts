import { NextRequest, NextResponse } from 'next/server'
import { getPostsWithPinned, Category } from '@/lib/posts'

export const dynamic = 'force-dynamic'

export function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const category = (searchParams.get('category') ?? 'all') as Category
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10))

  const { pinnedPost, posts } = getPostsWithPinned(category)

  const start = (page - 1) * limit
  const end = start + limit
  const slice = posts.slice(start, end)
  const hasMore = end < posts.length

  return NextResponse.json({
    posts: slice,
    // Only include pinnedPost on first page
    pinnedPost: page === 1 ? pinnedPost : null,
    totalCount: posts.length + (pinnedPost ? 1 : 0),
    page,
    hasMore,
  })
}
