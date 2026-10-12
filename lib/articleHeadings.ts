export interface ArticleHeading {
  id: string
  title: string
  level: 2 | 3
}

interface ArticleNode {
  type: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: ArticleNode[]
}

interface HeadingOptions {
  title: string
  headings: ArticleHeading[]
}

function textContent(node: ArticleNode): string {
  if (node.type === 'text') return node.value ?? ''
  if (node.tagName === 'img') return String(node.properties?.alt ?? '')
  return (node.children ?? []).map(textContent).join('')
}

/** Runs after rehype-slug, so existing and duplicate-title hashes stay stable. */
export function rehypeArticleHeadings({ title, headings }: HeadingOptions) {
  return (tree: ArticleNode) => {
    let firstHeading = true
    let sectionNumber = 0

    function visit(node: ArticleNode) {
      if (node.type === 'element' && /^h[1-6]$/.test(node.tagName ?? '')) {
        const headingText = textContent(node).trim()

        if (node.tagName === 'h1') {
          if (firstHeading && headingText === title.trim()) {
            // Keep the old fragment URL without repeating the page's main title.
            node.tagName = 'span'
            node.properties = {
              id: node.properties?.id,
              className: ['article-title-anchor'],
              'aria-hidden': 'true',
            }
            node.children = []
          } else {
            // A distinct body title remains visible beneath the page's sole H1.
            node.tagName = 'h2'
          }
        }

        firstHeading = false
        if (node.tagName === 'h2') {
          sectionNumber += 1
          if (!/^(?:\d+|[一二三四五六七八九十百]+)[.、．)）:：]/.test(headingText)) {
            node.properties = {
              ...node.properties,
              'data-section-number': String(sectionNumber).padStart(2, '0'),
            }
          }
        }

        if ((node.tagName === 'h2' || node.tagName === 'h3') && node.properties?.id) {
          headings.push({
            id: String(node.properties.id),
            title: headingText,
            level: node.tagName === 'h2' ? 2 : 3,
          })
        }
      }

      node.children?.forEach(visit)
    }

    visit(tree)
  }
}
