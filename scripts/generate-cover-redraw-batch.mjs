#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const projectRoot = process.cwd()
const manifestPath = path.join(projectRoot, 'config', 'blog-cover-redraw-manifest.json')

function parseArgs(argv) {
  const options = { batch: 0 }
  const args = [...argv]
  while (args.length > 0) {
    const arg = args.shift()
    if (arg === '--batch') options.batch = Number(args.shift())
    else if (arg === '--help' || arg === '-h') {
      console.log(`Generate one resumable historical cover batch without changing post frontmatter.

Usage:
  npm run cover:image2:backfill:generate -- --batch 1
`)
      process.exit(0)
    } else throw new Error(`未知参数：${arg}`)
  }
  if (!Number.isInteger(options.batch) || options.batch < 1) {
    throw new Error('--batch 必须是正整数')
  }
  return options
}

function runNode(script, args = []) {
  const result = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', script), ...args], {
    cwd: projectRoot,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${script} 执行失败（exit=${result.status}）`)
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  runNode('build-cover-redraw-manifest.mjs')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  if (options.batch > manifest.batchCount) {
    throw new Error(`批次超出范围：1-${manifest.batchCount}`)
  }
  const entries = manifest.entries.filter((entry) => entry.batch === options.batch)
  let generated = 0
  let skipped = 0
  for (const entry of entries) {
    if (entry.targetCoverExists) {
      skipped += 1
      console.error(`[cover:redraw] skip existing ${entry.targetCover}`)
      continue
    }
    runNode('generate-blog-cover-image2.mjs', [
      '--post',
      entry.postPath,
      '--out',
      path.posix.join('public', entry.targetCover.replace(/^\//, '')),
    ])
    generated += 1
  }
  runNode('build-cover-redraw-manifest.mjs')
  console.log(
    JSON.stringify(
      { status: 'ok', batch: options.batch, entries: entries.length, generated, skipped },
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
