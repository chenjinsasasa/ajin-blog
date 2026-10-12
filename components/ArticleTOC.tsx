'use client'

import { useEffect, useRef, useState } from 'react'
import type { ArticleHeading } from '@/lib/articleHeadings'

interface ArticleTOCProps {
  contentSelector?: string
}

export default function ArticleTOC({ contentSelector = '.article-body' }: ArticleTOCProps) {
  const [headings, setHeadings] = useState<ArticleHeading[]>([])
  const [activeId, setActiveId] = useState('')
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const content = document.querySelector(contentSelector)
    if (!content) return

    // Read rendered headings and rehype-slug's real IDs; do not parse Markdown twice.
    const renderedHeadings = Array.from(content.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id]'))
      .map((heading): ArticleHeading => ({
        id: heading.id,
        title: heading.textContent?.trim() ?? '',
        level: heading.tagName === 'H2' ? 2 : 3,
      }))
      .filter((heading) => heading.id && heading.title)

    setHeadings(renderedHeadings)
    content.closest('.article-layout')?.setAttribute('data-has-toc', String(renderedHeadings.length >= 2))
  }, [contentSelector])

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1100px)')
    const updateExpanded = () => {
      if (detailsRef.current) detailsRef.current.open = media.matches
    }
    updateExpanded()
    media.addEventListener('change', updateExpanded)
    return () => media.removeEventListener('change', updateExpanded)
  }, [headings])

  useEffect(() => {
    const elements = headings
      .map(({ id }) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element))
    let frame = 0

    const updateActiveHeading = () => {
      frame = 0
      const offset = (document.querySelector('.site-header')?.getBoundingClientRect().height ?? 72) + 32
      let current = elements[0]?.id ?? ''
      for (const element of elements) {
        if (element.getBoundingClientRect().top <= offset) current = element.id
        else break
      }
      setActiveId(current)
    }

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveHeading)
    }

    updateActiveHeading()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.cancelAnimationFrame(frame)
    }
  }, [headings])

  if (headings.length < 2) return null

  return (
    <details className="article-toc" ref={detailsRef}>
      <summary className="article-sidebar__heading">
        <span>目录 <small>CONTENTS</small></span>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </summary>
      <nav aria-label="文章目录" className="article-toc__nav">
        <ol>
          {headings.map((heading) => (
            <li key={heading.id} className={heading.level === 3 ? 'article-toc__subsection' : undefined}>
              <a
                href={`#${heading.id}`}
                aria-current={activeId === heading.id ? 'location' : undefined}
                onClick={() => setActiveId(heading.id)}
              >
                {heading.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  )
}
