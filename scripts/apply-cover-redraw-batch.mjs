#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import matter from 'gray-matter'
import sharp from 'sharp'

import { upsertCoverProvenance } from './lib/cover-redraw-apply.mjs'

const projectRoot = process.cwd()
const manifestPath = path.join(projectRoot, 'config', 'blog-cover-redraw-manifest.json')
const config = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'config', 'blog-cover-image2.json'), 'utf8'),
)

function parseArgs(argv) {
  const options = { approved: false, batch: 0, post: '' }
  const args = [...argv]
  while (args.length > 0) {
    const arg = args.shift()
    if (arg === '--approved') options.approved = true
    else if (arg === '--batch') options.batch = Number(args.shift())
    else if (arg === '--post') options.post = args.shift() || ''
    else if (arg === '--help' || arg === '-h') {
      console.log(`Apply a visually approved historical cover batch to post frontmatter.

Usage:
  npm run cover:image2:backfill:apply -- --batch 1 --approved
  npm run cover:image2:backfill:apply -- --post content/progress/YYYY-MM-DD-progress.mdx --approved
`)
      process.exit(0)
    } else throw new Error(`未知参数：${arg}`)
  }
  if (!options.post && (!Number.isInteger(options.batch) || options.batch < 1)) {
    throw new Error('必须提供 --batch <正整数> 或 --post <文章路径>')
  }
  if (!options.approved) throw new Error('必须在完成视觉验收后显式提供 --approved')
  return options
}

function hashText(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function runNode(script, args = []) {
  const result = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', script), ...args], {
    cwd: projectRoot,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${script} 执行失败（exit=${result.status}）`)
}

async function verifyCandidate(entry, post) {
  const coverPath = path.join(projectRoot, 'public', entry.targetCover.replace(/^\//, ''))
  if (!fs.existsSync(coverPath)) throw new Error(`候选封面不存在：${entry.targetCover}`)
  const metadata = await sharp(coverPath).metadata()
  const width = metadata.width || 0
  const height = metadata.height || 0
  if (Math.abs(width / height - 16 / 9) > 0.01 || width < 1280 || height < 720) {
    throw new Error(`候选封面尺寸不合格：${entry.targetCover} ${width}x${height}`)
  }

  const slug = path.basename(entry.postPath, path.extname(entry.postPath))
  const briefRelativePath = path.join('content', 'cover-briefs', `${slug}.json`)
  const briefPath = path.join(projectRoot, briefRelativePath)
  if (!fs.existsSync(briefPath)) throw new Error(`visual brief 不存在：${briefRelativePath}`)
  const brief = JSON.parse(fs.readFileSync(briefPath, 'utf8'))
  if (brief.briefVersion !== config.briefVersion || brief.promptVersion !== config.promptVersion) {
    throw new Error(`visual brief 版本不合格：${briefRelativePath}`)
  }
  if (brief.bodySha256 !== hashText(post.content.trim())) {
    throw new Error(`visual brief 正文哈希已过期：${briefRelativePath}`)
  }
  return { brief, briefPath, briefRelativePath }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  runNode('build-cover-redraw-manifest.mjs')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const entries = options.post
    ? manifest.entries.filter((entry) => entry.postPath === options.post)
    : manifest.entries.filter((entry) => entry.batch === options.batch)
  if (entries.length === 0) throw new Error('未找到待应用的历史封面记录')
  const ready = entries.filter((entry) => entry.status === 'ready-for-review')
  const scope = options.post || `批次 ${options.batch}`
  if (ready.length === 0) throw new Error(`${scope} 没有待应用的已生成封面`)
  if (ready.length !== entries.filter((entry) => entry.status !== 'applied').length) {
    throw new Error(`${scope} 仍有未生成封面，停止应用`)
  }

  for (const entry of ready) {
    const postPath = path.join(projectRoot, entry.postPath)
    const rawPost = fs.readFileSync(postPath, 'utf8')
    const post = matter(rawPost)
    const { brief, briefPath, briefRelativePath } = await verifyCandidate(entry, post)
    const nextPost = upsertCoverProvenance(
      rawPost,
      {
        coverImage: entry.targetCover,
        coverSourceType: 'generated',
        coverProvider: config.provider,
        coverModel: config.model,
        coverExecutionMode: config.executionMode,
        coverStyle: config.style,
        coverPromptVersion: config.promptVersion,
        coverBriefVersion: config.briefVersion,
        coverBriefPath: briefRelativePath,
        coverReferenceSet: config.referenceSet,
      },
      ['coverSourceUrl', 'coverLicense', 'coverAttribution'],
    )
    const nextBrief = { ...brief, postSha256: hashText(nextPost) }
    fs.writeFileSync(briefPath, `${JSON.stringify(nextBrief, null, 2)}\n`, 'utf8')
    fs.writeFileSync(postPath, nextPost, 'utf8')
    runNode('validate-blog-cover-image2.mjs', ['--post', entry.postPath])
  }

  runNode('build-cover-redraw-manifest.mjs')
  console.log(
    JSON.stringify(
      { status: 'ok', batch: options.batch || null, post: options.post || null, applied: ready.length },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
