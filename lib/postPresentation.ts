import type { PostMeta } from '@/lib/posts'

const DATE_FORMATS = {
  'zh-CN': {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
  'en-US': {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>

function parseDate(dateStr: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)

  if (match) {
    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const date = new Date(dateStr)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatPostDate(
  dateStr: string,
  locale: keyof typeof DATE_FORMATS = 'zh-CN',
) {
  const date = parseDate(dateStr)
  if (!date) return dateStr

  return date.toLocaleDateString(locale, DATE_FORMATS[locale])
}

export function formatPostCoverDate(dateStr: string) {
  const date = parseDate(dateStr)
  if (!date) return dateStr

  return date
    .toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .replace(/\//g, '.')
}

export function getPostCategoryTagLabel(category: PostMeta['category']) {
  return category === 'progress' ? '我们的进展' : '阿锦的日记'
}

export function getPostCategoryAuthorLabel(category: PostMeta['category']) {
  return category === 'progress' ? 'Ajin Team' : 'Ajin'
}

export function getPostCategoryEyebrow(category: PostMeta['category']) {
  return category === 'progress' ? 'Build Log' : 'Private Journal'
}
