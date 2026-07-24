#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

import { createCoverRedrawManifest } from './lib/cover-redraw-manifest.mjs'

const projectRoot = process.cwd()
const defaultOutput = 'config/blog-cover-redraw-manifest.json'
const config = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'config', 'blog-cover-image2.json'), 'utf8'),
)

function parseArgs(argv) {
  const options = { batchSize: 5, out: defaultOutput }
  const args = [...argv]
  while (args.length > 0) {
    const arg = args.shift()
    if (arg === '--batch-size') options.batchSize = Number(args.shift())
    else if (arg === '--out') options.out = args.shift()
    else if (arg === '--help' || arg === '-h') {
      console.log(`Build the resumable historical cover redraw manifest.

Usage:
  npm run cover:image2:backfill:inventory
  npm run cover:image2:backfill:inventory -- --batch-size 5 --out config/blog-cover-redraw-manifest.json
`)
      process.exit(0)
    } else throw new Error(`未知参数：${arg}`)
  }
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1) {
    throw new Error('--batch-size 必须是正整数')
  }
  if (!options.out) throw new Error('--out 缺少参数')
  return options
}

function getPostFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(dir, entry.name)
    if (entry.isDirectory()) return getPostFiles(filePath)
    return /\.mdx?$/.test(entry.name) ? [filePath] : []
  })
}

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  return typeof value === 'string' ? value.trim() : ''
}

function hasExactCoverContract(data) {
  const exactFields = {
    coverSourceType: 'generated',
    coverProvider: config.provider,
    coverModel: config.model,
    coverExecutionMode: config.executionMode,
    coverStyle: config.style,
    coverPromptVersion: config.promptVersion,
    coverBriefVersion: config.briefVersion,
    coverReferenceSet: config.referenceSet,
  }
  const forbidden = ['coverSourceUrl', 'coverLicense', 'coverAttribution']
  return (
    Object.entries(exactFields).every(([field, expected]) => data[field] === expected) &&
    forbidden.every((field) => !Object.prototype.hasOwnProperty.call(data, field)) &&
    typeof data.coverBriefPath === 'string' &&
    data.coverBriefPath.startsWith('content/cover-briefs/')
  )
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  const posts = getPostFiles(path.join(projectRoot, 'content'))
    .map((postPath) => {
      const data = matter(fs.readFileSync(postPath, 'utf8')).data
      return {
        postPath: path.relative(projectRoot, postPath),
        title: typeof data.title === 'string' ? data.title.trim() : '',
        date: normalizeDate(data.date),
        coverImage: typeof data.coverImage === 'string' ? data.coverImage.trim() : '',
        coverPromptVersion:
          typeof data.coverPromptVersion === 'string' ? data.coverPromptVersion.trim() : '',
        coverContractValid: hasExactCoverContract(data),
      }
    })
    .filter((post) => post.coverImage)

  const manifest = createCoverRedrawManifest({
    batchSize: options.batchSize,
    config,
    exists: (relativePath) => fs.existsSync(path.join(projectRoot, relativePath)),
    posts,
  })
  const outputPath = path.resolve(projectRoot, options.out)
  if (!outputPath.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error('--out 必须位于项目内')
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(
    JSON.stringify(
      {
        status: 'ok',
        output: path.relative(projectRoot, outputPath),
        total: manifest.total,
        batchSize: manifest.batchSize,
        batchCount: manifest.batchCount,
        summary: manifest.summary,
      },
      null,
      2,
    ),
  )
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
