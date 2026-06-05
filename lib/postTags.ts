export const CORE_POST_TAGS = [
  '多智能体',
  '系统治理',
  '博客内容链',
  '知识沉淀',
  '系统运维',
  '安全边界',
  '产品研发',
  '前端体验',
  '调研决策',
] as const

export const PROJECT_POST_TAGS = [
  'OpenClaw',
  'ajin-blog',
  'Figure Vault',
  'api-relay-monitor',
  'Eomji',
  'Nexora',
] as const

export const POST_TAGS = [...CORE_POST_TAGS, ...PROJECT_POST_TAGS] as const

export type PostTag = (typeof POST_TAGS)[number]

const allowedTags = new Set<string>(POST_TAGS)

export function isPostTag(tag: string | null | undefined): tag is PostTag {
  return typeof tag === 'string' && allowedTags.has(tag)
}

export function normalizePostTags(rawTags: unknown): PostTag[] {
  if (!Array.isArray(rawTags)) {
    return []
  }

  const tags: PostTag[] = []

  for (const rawTag of rawTags) {
    const tag = String(rawTag).trim()

    if (allowedTags.has(tag) && !tags.includes(tag as PostTag)) {
      tags.push(tag as PostTag)
    }
  }

  return tags
}
