import { NextRequest, NextResponse } from 'next/server'
import { getPostsWithPinned, type Category } from '@/lib/posts'
import {
  isBusinessArea,
  isPostMonth,
  isProjectId,
  isWorkStage,
  type PostFilters,
} from '@/lib/postTaxonomy'

export const dynamic = 'force-dynamic'

function normalizeCategory(category: string | null): Category {
  return category === 'progress' || category === 'diary' ? category : 'all'
}

export function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const category = normalizeCategory(searchParams.get('category'))
  const area = searchParams.get('area')
  const stage = searchParams.get('stage')
  const project = searchParams.get('project')
  const month = searchParams.get('month')
  const author = searchParams.get('author')?.trim() || undefined
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const offsetParam = searchParams.get('offset')
  const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10))

  const filters: PostFilters = {
    category,
    area: isBusinessArea(area) ? area : undefined,
    stage: isWorkStage(stage) ? stage : undefined,
    project: isProjectId(project) ? project : undefined,
    author,
    month: isPostMonth(month) ? month : undefined,
  }
  const { pinnedPost, posts } = getPostsWithPinned(filters)

  const start =
    offsetParam !== null
      ? Math.max(0, parseInt(offsetParam, 10) || 0)
      : (page - 1) * limit
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
