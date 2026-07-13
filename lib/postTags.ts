import taxonomy from '@/config/post-taxonomy.json'

export type CorePostTag =
  | '多智能体'
  | '系统治理'
  | '博客内容链'
  | '知识沉淀'
  | '系统运维'
  | '安全边界'
  | '产品研发'
  | '前端体验'
  | '调研决策'

export type ContextPostTag =
  | 'OpenClaw'
  | 'ajin-blog'
  | 'Figure Vault'
  | 'api-relay-monitor'
  | 'Eomji'
  | 'Nexora'

export type PostTag = string

export const CORE_POST_TAGS = taxonomy.coreTags as CorePostTag[]
export const CONTEXT_POST_TAGS = taxonomy.contextTags as ContextPostTag[]
export const POST_TAGS: PostTag[] = [...CORE_POST_TAGS, ...CONTEXT_POST_TAGS]

export function isPostTag(tag: string | null | undefined): tag is PostTag {
  return typeof tag === 'string' && tag.trim().length > 0
}

export function normalizePostTags(rawTags: unknown): PostTag[] {
  if (!Array.isArray(rawTags)) return []

  const tags: PostTag[] = []

  for (const rawTag of rawTags) {
    if (typeof rawTag !== 'string') continue
    const tag = rawTag.trim()
    if (isPostTag(tag) && !tags.includes(tag)) tags.push(tag)
  }

  return tags
}
