import path from 'node:path'

export function targetCoverFor(currentCover) {
  const extension = path.posix.extname(currentCover)
  const base = currentCover.slice(0, -extension.length)
  return base.endsWith('-image2-v2') ? `${base}.png` : `${base}-image2-v2.png`
}

function publicPathFor(coverPath) {
  return path.posix.join('public', coverPath.replace(/^\//, ''))
}

export function createCoverRedrawManifest({ batchSize, config, exists, posts }) {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error('batchSize 必须是正整数')
  }

  const sorted = [...posts].sort(
    (a, b) => b.date.localeCompare(a.date) || b.postPath.localeCompare(a.postPath),
  )
  const entries = sorted.map((post, index) => {
    const targetCover = targetCoverFor(post.coverImage)
    const targetCoverExists = exists(publicPathFor(targetCover))
    const applied =
      post.coverImage === targetCover &&
      post.coverPromptVersion === config.promptVersion &&
      targetCoverExists

    return {
      index: index + 1,
      batch: Math.floor(index / batchSize) + 1,
      status: applied ? 'applied' : targetCoverExists ? 'ready-for-review' : 'pending',
      date: post.date,
      title: post.title,
      postPath: post.postPath,
      currentCover: post.coverImage,
      currentCoverExists: exists(publicPathFor(post.coverImage)),
      targetCover,
      targetCoverExists,
    }
  })

  return {
    manifestVersion: 1,
    strategy: 'generate-review-apply',
    provider: config.provider || 'codex',
    model: config.model || 'image-2',
    promptVersion: config.promptVersion,
    briefVersion: config.briefVersion || '',
    batchSize,
    batchCount: Math.ceil(entries.length / batchSize),
    total: entries.length,
    summary: {
      pending: entries.filter((entry) => entry.status === 'pending').length,
      readyForReview: entries.filter((entry) => entry.status === 'ready-for-review').length,
      applied: entries.filter((entry) => entry.status === 'applied').length,
      missingCurrentCover: entries.filter((entry) => !entry.currentCoverExists).length,
    },
    entries,
  }
}
