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
