import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export type Category = 'all' | 'progress' | 'diary'

export interface PostMeta {
  slug: string
  title: string
  date: string
  category: 'progress' | 'diary'
  excerpt: string
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

export function getAllPosts(category?: Category): PostMeta[] {
  const dirs =
    category && category !== 'all'
      ? [path.join(contentDir, category)]
      : [path.join(contentDir, 'progress'), path.join(contentDir, 'diary')]

  const files: string[] = []
  for (const dir of dirs) {
    files.push(...getFilesRecursive(dir))
  }

  const posts: PostMeta[] = files.map((filePath) => {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const { data } = matter(raw)
    const filename = path.basename(filePath, path.extname(filePath))
    return {
      slug: filename,
      title: data.title ?? filename,
      date: data.date ?? '',
      category: data.category ?? 'diary',
      excerpt: data.excerpt ?? '',
    }
  })

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1))
}

/** Returns { pinnedPost, posts } where posts excludes the pinned slug */
export function getPostsWithPinned(category?: Category): {
  pinnedPost: PostMeta | null
  posts: PostMeta[]
} {
  const all = getAllPosts(category)
  const pinnedIndex = all.findIndex((p) => p.slug === PINNED_SLUG)
  if (pinnedIndex === -1) {
    return { pinnedPost: null, posts: all }
  }
  const pinnedPost = all[pinnedIndex]
  const posts = all.filter((_, i) => i !== pinnedIndex)
  return { pinnedPost, posts }
}

export function getPostBySlug(slug: string): Post | null {
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
    const { data, content } = matter(raw)
    return {
      slug,
      title: data.title ?? slug,
      date: data.date ?? '',
      category: data.category ?? 'diary',
      excerpt: data.excerpt ?? '',
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
