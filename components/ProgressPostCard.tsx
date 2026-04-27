import type { CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { PostMeta } from '@/lib/posts'
import { getAuthorName } from '@/lib/authors'
import { HISTORICAL_COVERS } from '@/lib/historicalCovers'

type CoverVariant = 'radar' | 'columns' | 'orbital' | 'ledger'

const COVER_VARIANTS: CoverVariant[] = ['radar', 'columns', 'orbital', 'ledger']

const COVER_PALETTES = [
  {
    bgStart: 'rgba(252, 248, 241, 0.96)',
    bgEnd: 'rgba(239, 233, 223, 0.98)',
    ink: '#18120d',
    inkSoft: 'rgba(24, 18, 13, 0.6)',
    line: 'rgba(24, 18, 13, 0.24)',
    grid: 'rgba(24, 18, 13, 0.06)',
    outer: 'rgba(147, 192, 112, 0.7)',
    mid: 'rgba(110, 153, 200, 0.66)',
    inner: 'rgba(204, 108, 100, 0.58)',
    accent: 'rgba(198, 165, 112, 0.34)',
  },
  {
    bgStart: 'rgba(246, 241, 233, 0.98)',
    bgEnd: 'rgba(231, 224, 213, 0.98)',
    ink: '#1b1712',
    inkSoft: 'rgba(27, 23, 18, 0.58)',
    line: 'rgba(27, 23, 18, 0.2)',
    grid: 'rgba(27, 23, 18, 0.05)',
    outer: 'rgba(215, 143, 107, 0.7)',
    mid: 'rgba(113, 140, 166, 0.7)',
    inner: 'rgba(124, 164, 124, 0.58)',
    accent: 'rgba(92, 69, 46, 0.16)',
  },
  {
    bgStart: 'rgba(243, 239, 233, 0.98)',
    bgEnd: 'rgba(228, 221, 214, 0.98)',
    ink: '#1f1913',
    inkSoft: 'rgba(31, 25, 19, 0.58)',
    line: 'rgba(31, 25, 19, 0.2)',
    grid: 'rgba(31, 25, 19, 0.045)',
    outer: 'rgba(166, 132, 209, 0.56)',
    mid: 'rgba(87, 163, 171, 0.68)',
    inner: 'rgba(220, 120, 134, 0.6)',
    accent: 'rgba(255, 255, 255, 0.28)',
  },
  {
    bgStart: 'rgba(247, 242, 237, 0.98)',
    bgEnd: 'rgba(235, 228, 219, 0.98)',
    ink: '#17130f',
    inkSoft: 'rgba(23, 19, 15, 0.58)',
    line: 'rgba(23, 19, 15, 0.2)',
    grid: 'rgba(23, 19, 15, 0.05)',
    outer: 'rgba(97, 171, 157, 0.72)',
    mid: 'rgba(228, 173, 103, 0.64)',
    inner: 'rgba(155, 124, 188, 0.6)',
    accent: 'rgba(49, 81, 78, 0.14)',
  },
] as const

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatCoverDate(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return d
      .toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .replace(/\//g, '.')
  } catch {
    return dateStr
  }
}

function hashString(value: string) {
  let hash = 0

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33 + value.charCodeAt(i)) >>> 0
  }

  return hash
}

function getCoverDesign(post: PostMeta): {
  variant: CoverVariant
  label: string
  style: CSSProperties
} {
  const seed = hashString(`${post.slug}:${post.author ?? 'team'}`)
  const palette = COVER_PALETTES[seed % COVER_PALETTES.length]
  const variant = COVER_VARIANTS[seed % COVER_VARIANTS.length]
  const serial = String((seed % 87) + 12).padStart(2, '0')
  const labelMap: Record<CoverVariant, string> = {
    radar: `Daily Report ${serial}`,
    columns: `Signal Stack ${serial}`,
    orbital: `Field Map ${serial}`,
    ledger: `Ops Note ${serial}`,
  }

  return {
    variant,
    label: labelMap[variant],
    style: {
      '--cover-bg-start': palette.bgStart,
      '--cover-bg-end': palette.bgEnd,
      '--cover-ink': palette.ink,
      '--cover-ink-soft': palette.inkSoft,
      '--cover-line': palette.line,
      '--cover-grid': palette.grid,
      '--cover-outer': palette.outer,
      '--cover-mid': palette.mid,
      '--cover-inner': palette.inner,
      '--cover-accent': palette.accent,
    } as CSSProperties,
  }
}

function FallbackCover({ post }: { post: PostMeta }) {
  const byline = post.author ? getAuthorName(post.author) : '阿锦团队'
  const cover = getCoverDesign(post)

  return (
    <div className={`progress-cover progress-cover--${cover.variant}`} style={cover.style} aria-hidden="true">
      <div className="progress-cover__grid" />

      {cover.variant === 'radar' && (
        <>
          <div className="progress-cover__axis progress-cover__axis--horizontal" />
          <div className="progress-cover__axis progress-cover__axis--vertical" />
          <div className="progress-cover__ring progress-cover__ring--outer" />
          <div className="progress-cover__ring progress-cover__ring--mid" />
          <div className="progress-cover__ring progress-cover__ring--inner" />
          <div className="progress-cover__core" />
        </>
      )}

      {cover.variant === 'columns' && (
        <>
          <div className="progress-cover__beam progress-cover__beam--one" />
          <div className="progress-cover__beam progress-cover__beam--two" />
          <div className="progress-cover__beam progress-cover__beam--three" />
          <div className="progress-cover__beam-cap progress-cover__beam-cap--one" />
          <div className="progress-cover__beam-cap progress-cover__beam-cap--two" />
          <div className="progress-cover__beam-cap progress-cover__beam-cap--three" />
          <div className="progress-cover__beam-rule" />
        </>
      )}

      {cover.variant === 'orbital' && (
        <>
          <div className="progress-cover__orb progress-cover__orb--one" />
          <div className="progress-cover__orb progress-cover__orb--two" />
          <div className="progress-cover__orb progress-cover__orb--three" />
          <div className="progress-cover__route progress-cover__route--one" />
          <div className="progress-cover__route progress-cover__route--two" />
          <div className="progress-cover__node progress-cover__node--one" />
          <div className="progress-cover__node progress-cover__node--two" />
        </>
      )}

      {cover.variant === 'ledger' && (
        <>
          <div className="progress-cover__ledger-frame" />
          <div className="progress-cover__ledger-stamp" />
          <div className="progress-cover__ledger-stack">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`ledger-${post.slug}-${index}`}
                className={`progress-cover__ledger-row progress-cover__ledger-row--${(index % 3) + 1}`}
              />
            ))}
          </div>
        </>
      )}

      <div className="progress-cover__meta progress-cover__meta--left">
        <span>Build Log</span>
        <strong>{cover.label}</strong>
      </div>

      <div className="progress-cover__meta progress-cover__meta--right">
        <span>{byline}</span>
        <strong>{formatCoverDate(post.date)}</strong>
      </div>

      <p className="progress-cover__caption">{post.title}</p>
    </div>
  )
}

export function ProgressPostCard({ post }: { post: PostMeta }) {
  const byline = post.author ? getAuthorName(post.author) : '阿锦团队'
  const historicalCover = HISTORICAL_COVERS[hashString(post.slug) % HISTORICAL_COVERS.length]
  const imageSrc = post.coverImage || post.fallbackCoverImage || historicalCover.src

  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <article className="progress-post-card">
        <div className="progress-post-card__media">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 520px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          ) : (
            <Image
              src={historicalCover.src}
              alt=""
              aria-hidden="true"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 520px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          )}
        </div>

        <div className="progress-post-card__body">
          <p className="progress-post-card__eyebrow">Daily Build Log</p>

          <h3 className="progress-post-card__title font-display text-[1.72rem] leading-[0.94] text-[var(--fg)] transition-colors duration-200 group-hover:text-[var(--accent-strong)] sm:text-[2.2rem]">
            {post.title}
          </h3>

          {post.excerpt && (
            <p className="progress-post-card__excerpt mt-4 text-[0.98rem] leading-7 text-[var(--muted-fg)] sm:mt-4 sm:text-[1.02rem] sm:leading-8">
              {post.excerpt}
            </p>
          )}

          <span className="progress-post-card__cta">
            Read Full Log
          </span>

          <div className="progress-post-card__footer">
            <span>{byline}</span>
            <span aria-hidden="true">•</span>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>
        </div>
      </article>
    </Link>
  )
}
