import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { getHistoricalCoverByIndex } from '@/lib/historicalCovers'
import { normalizePostTags, type PostTag } from '@/lib/postTags'
import {
  isBusinessArea,
  isWorkStage,
  normalizeProjects,
  type BusinessArea,
  type PostFilters,
  type ProjectId,
  type WorkStage,
} from '@/lib/postTaxonomy'

export type Category = 'all' | 'progress' | 'diary'

export interface PostMeta {
  slug: string
  title: string
  date: string
  category: 'progress' | 'diary'
  businessArea: BusinessArea
  workStage: WorkStage
  projects: ProjectId[]
  tags: PostTag[]
  excerpt: string
  author?: string
  coverImage?: string
  fallbackCoverImage?: string
}

export interface Post extends PostMeta {
  content: string
}

export const PINNED_SLUG = '2026-04-03-hello'

const contentDir = path.join(process.cwd(), 'content')

function getFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getFilesRecursive(fullPath))
    } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
      files.push(fullPath)
    }
  }
  return files
}

function getAllContentFiles(): string[] {
  const dirs = [path.join(contentDir, 'progress'), path.join(contentDir, 'diary')]

  const files: string[] = []
  for (const dir of dirs) {
    files.push(...getFilesRecursive(dir))
  }

  return files
}

function sortPosts(posts: PostMeta[]): PostMeta[] {
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1))
}

function applyHistoricalFallbackCovers(posts: PostMeta[]): PostMeta[] {
  let fallbackIndex = 0

  return posts.map((post) => {
    if (post.coverImage) return post

    const fallbackCoverImage = getHistoricalCoverByIndex(fallbackIndex).src
    fallbackIndex += 1

    return {
      ...post,
      fallbackCoverImage,
    }
  })
}

function getResolvedPosts(): PostMeta[] {
  const files = getAllContentFiles()

  const posts: PostMeta[] = files.map((filePath) => {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const { data } = matter(raw)
    const filename = path.basename(filePath, path.extname(filePath))
    const date = data.date instanceof Date
      ? data.date.toISOString().slice(0, 10)
      : String(data.date ?? '')
    return {
      slug: filename,
      title: data.title ?? filename,
      date,
      category: data.category ?? 'diary',
      businessArea: isBusinessArea(data.businessArea) ? data.businessArea : 'product-experience',
      workStage: isWorkStage(data.workStage) ? data.workStage : 'build',
      projects: normalizeProjects(data.projects),
      tags: normalizePostTags(data.tags),
      excerpt: data.excerpt ?? '',
      author: data.author,
      coverImage: data.coverImage ?? data.cover ?? data.image,
    }
  })

  return applyHistoricalFallbackCovers(sortPosts(posts))
}

export function getAllPosts(filters: PostFilters = {}): PostMeta[] {
  const posts = getResolvedPosts()
  const { category = 'all', area, stage, project, author, month } = filters

  return posts.filter((post) => {
    if (category !== 'all' && post.category !== category) return false
    if (area && post.businessArea !== area) return false
    if (stage && post.workStage !== stage) return false
    if (project && !post.projects.includes(project)) return false
    if (author && post.author !== author) return false
    if (month && !post.date.startsWith(`${month}-`)) return false
    return true
  })
}

/** Returns { pinnedPost, posts } where posts excludes the pinned slug */
export function getPostsWithPinned(filters: PostFilters = {}): {
  pinnedPost: PostMeta | null
  posts: PostMeta[]
} {
  const all = getAllPosts(filters)
  const pinnedIndex = all.findIndex((p) => p.slug === PINNED_SLUG)
  if (pinnedIndex === -1) {
    return { pinnedPost: null, posts: all }
  }
  const pinnedPost = all[pinnedIndex]
  const posts = all.filter((_, i) => i !== pinnedIndex)
  return { pinnedPost, posts }
}

export function getPostBySlug(slug: string): Post | null {
  const meta = getResolvedPosts().find((post) => post.slug === slug)
  if (!meta) return null

  const categories = ['progress', 'diary']
  for (const cat of categories) {
    const mdxPath = path.join(contentDir, cat, `${slug}.mdx`)
    const mdPath = path.join(contentDir, cat, `${slug}.md`)
    const filePath = fs.existsSync(mdxPath)
      ? mdxPath
      : fs.existsSync(mdPath)
      ? mdPath
      : null
    if (!filePath) continue
    const raw = fs.readFileSync(filePath, 'utf-8')
    const { content } = matter(raw)
    return {
      ...meta,
      content,
    }
  }
  return null
}

export function getAllSlugs(): string[] {
  return getAllPosts().map((p) => p.slug)
}

export function getAdjacentPosts(slug: string): { prev: PostMeta | null; next: PostMeta | null } {
  // getAllPosts returns posts sorted newest-first (descending by date)
  const posts = getAllPosts()
  const index = posts.findIndex((p) => p.slug === slug)
  if (index === -1) return { prev: null, next: null }

  // next = newer post (lower index), prev = older post (higher index)
  const next = index > 0 ? posts[index - 1] : null
  const prev = index < posts.length - 1 ? posts[index + 1] : null

  return { prev, next }
}
