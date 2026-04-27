#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'

const projectRoot = process.cwd()
const defaultRoot = path.join(projectRoot, 'public', 'covers')
const manifestPath = path.join(projectRoot, 'scripts', 'cover-optimization-manifest.json')
const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])
const maxWidth = 1600
const maxHeight = 1200

function formatBytes(value) {
  if (value < 1024) return `${value} B`

  const units = ['KB', 'MB', 'GB']
  let size = value / 1024
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 100 ? 0 : 1)} ${units[unitIndex]}`
}

function parseCliArguments(argv) {
  const args = [...argv]
  let root = defaultRoot
  let force = false
  const targets = []

  while (args.length > 0) {
    const arg = args.shift()

    if (!arg) continue

    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }

    if (arg === '--force') {
      force = true
      continue
    }

    if (arg === '--root') {
      const value = args.shift()
      if (!value) {
        throw new Error('Missing value for --root')
      }

      root = path.resolve(projectRoot, value)
      continue
    }

    targets.push(path.resolve(projectRoot, arg))
  }

  return {
    force,
    root,
    targets: targets.length > 0 ? targets : [root],
  }
}

function printHelp() {
  console.log(`Optimize blog cover assets in place.

Usage:
  npm run covers:optimize
  npm run cover:optimize -- public/covers/2026-04-27-my-post.jpg
  npm run cover:optimize -- --force public/covers/2026-04-27-my-post.jpg

Options:
  --root <dir>  Optimize all supported files under a directory
  --force       Rewrite files even when the optimized result is larger
  -h, --help    Show this help text
`)
}

async function walkFiles(targetPath) {
  const stats = await fs.stat(targetPath)

  if (stats.isFile()) {
    return supportedExtensions.has(path.extname(targetPath).toLowerCase()) ? [targetPath] : []
  }

  if (!stats.isDirectory()) {
    return []
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(targetPath, entry.name)
      return entry.isDirectory() ? walkFiles(absolutePath) : [absolutePath]
    }),
  )

  return files.flat().filter((filePath) => supportedExtensions.has(path.extname(filePath).toLowerCase()))
}

async function readManifest() {
  try {
    const raw = await fs.readFile(manifestPath, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return {}
    }

    throw error
  }
}

async function writeManifest(manifest) {
  const orderedEntries = Object.entries(manifest).sort(([left], [right]) => left.localeCompare(right))
  const serialized = `${JSON.stringify(Object.fromEntries(orderedEntries), null, 2)}\n`
  await fs.writeFile(manifestPath, serialized, 'utf8')
}

async function hashFile(filePath) {
  const buffer = await fs.readFile(filePath)
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function createSharpPipeline(image, extension) {
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return image.jpeg({
        quality: 78,
        mozjpeg: true,
        progressive: true,
      })
    case '.png':
      return image.png({
        compressionLevel: 9,
        effort: 10,
        palette: true,
        quality: 80,
      })
    case '.webp':
      return image.webp({
        quality: 76,
        effort: 6,
      })
    case '.avif':
      return image.avif({
        quality: 58,
        effort: 6,
      })
    default:
      throw new Error(`Unsupported image extension: ${extension}`)
  }
}

async function optimizeFile(filePath, { force, manifest }) {
  const extension = path.extname(filePath).toLowerCase()
  const relativePath = path.relative(projectRoot, filePath)
  const currentHash = await hashFile(filePath)

  if (!force && manifest[relativePath] === currentHash) {
    const currentStats = await fs.stat(filePath)
    const currentMetadata = await sharp(filePath).metadata()
    return {
      action: 'unchanged',
      beforeSize: currentStats.size,
      afterSize: currentStats.size,
      filePath,
      hash: currentHash,
      height: currentMetadata.height ?? maxHeight,
      width: currentMetadata.width ?? maxWidth,
    }
  }

  const beforeStats = await fs.stat(filePath)
  const image = sharp(filePath)
  const metadata = await image.metadata()
  const originalWidth = metadata.width ?? maxWidth
  const originalHeight = metadata.height ?? maxHeight
  const needsResize = originalWidth > maxWidth || originalHeight > maxHeight
  const tempPath = `${filePath}.tmp${extension}`

  await createSharpPipeline(
    sharp(filePath)
      .rotate()
      .resize({
        width: maxWidth,
        height: maxHeight,
        fit: 'inside',
        withoutEnlargement: true,
      }),
    extension,
  ).toFile(tempPath)

  const afterStats = await fs.stat(tempPath)
  const shouldReplace = force || needsResize || afterStats.size < beforeStats.size

  if (!shouldReplace) {
    await fs.unlink(tempPath)
    return {
      action: 'skipped',
      beforeSize: beforeStats.size,
      afterSize: beforeStats.size,
      filePath,
      hash: currentHash,
      height: originalHeight,
      width: originalWidth,
    }
  }

  await fs.rename(tempPath, filePath)

  const finalMetadata = await sharp(filePath).metadata()
  const finalHash = await hashFile(filePath)
  return {
    action: needsResize ? 'resized' : 'optimized',
    beforeSize: beforeStats.size,
    afterSize: afterStats.size,
    filePath,
    hash: finalHash,
    height: finalMetadata.height ?? originalHeight,
    width: finalMetadata.width ?? originalWidth,
  }
}

async function main() {
  const options = parseCliArguments(process.argv.slice(2))
  const manifest = await readManifest()
  const uniqueTargets = [...new Set(options.targets)]
  const files = (
    await Promise.all(
      uniqueTargets.map(async (target) => {
        try {
          return await walkFiles(target)
        } catch (error) {
          if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
            throw new Error(`Path not found: ${target}`)
          }

          throw error
        }
      }),
    )
  ).flat()

  const uniqueFiles = [...new Set(files)].sort()

  if (uniqueFiles.length === 0) {
    console.log('No supported cover images found.')
    return
  }

  const results = []

  for (const filePath of uniqueFiles) {
    const result = await optimizeFile(filePath, {
      ...options,
      manifest,
    })
    results.push(result)
    manifest[path.relative(projectRoot, result.filePath)] = result.hash
  }

  let totalBefore = 0
  let totalAfter = 0
  let optimizedCount = 0
  let resizedCount = 0
  let skippedCount = 0
  let unchangedCount = 0

  for (const result of results) {
    totalBefore += result.beforeSize
    totalAfter += result.afterSize

    if (result.action === 'optimized') optimizedCount += 1
    if (result.action === 'resized') resizedCount += 1
    if (result.action === 'skipped') skippedCount += 1
    if (result.action === 'unchanged') unchangedCount += 1

    const relativePath = path.relative(projectRoot, result.filePath)
    const delta = result.beforeSize - result.afterSize
    const deltaLabel =
      result.action === 'unchanged'
        ? 'already optimized'
        : delta > 0
          ? `saved ${formatBytes(delta)}`
          : 'no size gain'

    console.log(
      `${result.action.padEnd(9)} ${relativePath} ` +
        `(${result.width}x${result.height}, ${formatBytes(result.afterSize)}, ${deltaLabel})`,
    )
  }

  await writeManifest(manifest)

  const savedBytes = totalBefore - totalAfter
  const savedPercent = totalBefore > 0 ? ((savedBytes / totalBefore) * 100).toFixed(1) : '0.0'

  console.log('')
  console.log(`Files scanned: ${uniqueFiles.length}`)
  console.log(`Optimized: ${optimizedCount}`)
  console.log(`Resized: ${resizedCount}`)
  console.log(`Skipped: ${skippedCount}`)
  console.log(`Unchanged: ${unchangedCount}`)
  console.log(`Before: ${formatBytes(totalBefore)}`)
  console.log(`After:  ${formatBytes(totalAfter)}`)
  console.log(`Saved:  ${formatBytes(savedBytes)} (${savedPercent}%)`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
