import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const validatorPath = new URL('./validate-cover-redraw-queue.mjs', import.meta.url)

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function createValidProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ajin-cover-queue-'))
  const postPath = 'content/progress/2026-07-17-progress.mdx'
  const briefPath = 'content/cover-briefs/2026-07-17-progress.json'
  const referencePath = 'public/entry-cards/reference.png'
  const rawPost = `---
title: "示例"
excerpt: "摘要"
coverImage: "/covers/old.jpg"
---

完整正文内容用于验证历史封面队列不会读取过期摘要。
`
  const body = '完整正文内容用于验证历史封面队列不会读取过期摘要。'
  const reference = Buffer.from('locked-reference')
  const config = {
    briefVersion: 'full-article-v2',
    promptVersion: 'steam-industrial-v2',
    generationPromptMaxCharacters: 700,
    generationSceneMaxCharacters: 175,
    generationStylePrompt: 'Black-ink copperplate engraving on warm ivory paper',
    generationNegativePrompt: 'text, logos, color',
    references: [{ path: referencePath, sha256: sha256(reference) }],
  }
  const brief = {
    briefVersion: config.briefVersion,
    promptVersion: config.promptVersion,
    executionMode: 'full-article-analysis',
    postPath,
    postSha256: sha256(rawPost),
    bodySha256: sha256(body),
    bodyCharacters: body.length,
    visualBrief: {
      supportingSymbolsZh: ['工程师', '传动轮组', '承压机组'],
      focalElementsEn: ['chief engineer', 'transmission wheels', 'machine under pressure'],
      imagePromptEn: 'A chief engineer coordinates transmission wheels beside a machine under pressure.',
    },
  }
  const manifest = {
    total: 1,
    batchCount: 1,
    entries: [
      {
        index: 1,
        batch: 1,
        status: 'pending',
        date: '2026-07-17',
        postPath,
        targetCover: '/covers/2026-07-17-custom-image2-v2.png',
      },
    ],
  }

  for (const file of [postPath, briefPath, referencePath]) {
    fs.mkdirSync(path.join(root, path.dirname(file)), { recursive: true })
  }
  fs.mkdirSync(path.join(root, 'config'), { recursive: true })
  fs.writeFileSync(path.join(root, postPath), rawPost)
  fs.writeFileSync(path.join(root, briefPath), `${JSON.stringify(brief)}\n`)
  fs.writeFileSync(path.join(root, referencePath), reference)
  fs.writeFileSync(
    path.join(root, 'config/blog-cover-image2.json'),
    `${JSON.stringify(config)}\n`,
  )
  fs.writeFileSync(
    path.join(root, 'config/blog-cover-redraw-manifest.json'),
    `${JSON.stringify(manifest)}\n`,
  )
  return root
}

function runValidator(root) {
  return spawnSync(process.execPath, [validatorPath.pathname], {
    cwd: root,
    encoding: 'utf8',
  })
}

test('有效的历史封面队列可通过完整生成前校验', (t) => {
  const root = createValidProject()
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))

  const result = runValidator(root)

  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout)
  assert.deepEqual(
    {
      status: report.status,
      manifestEntries: report.manifestEntries,
      promptsValidated: report.promptsValidated,
      referencesVerified: report.referencesVerified,
      uniquePosts: report.uniquePosts,
      uniqueTargets: report.uniqueTargets,
    },
    {
      status: 'ok',
      manifestEntries: 1,
      promptsValidated: 1,
      referencesVerified: 1,
      uniquePosts: 1,
      uniqueTargets: 1,
    },
  )
  assert.equal(report.promptLength.limit, 700)
  assert.ok(report.promptLength.max <= report.promptLength.limit)
})

test('文章正文变化后拒绝使用过期 visual brief', (t) => {
  const root = createValidProject()
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.appendFileSync(
    path.join(root, 'content/progress/2026-07-17-progress.mdx'),
    '\n新增但尚未重新抽象的正文。\n',
  )

  const result = runValidator(root)

  assert.equal(result.status, 1)
  assert.match(result.stderr, /visual brief 文章哈希已过期/)
})

test('清单声明数量与实际条目不一致时拒绝通过', (t) => {
  const root = createValidProject()
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const manifestPath = path.join(root, 'config/blog-cover-redraw-manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  manifest.total = 2
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`)

  const result = runValidator(root)

  assert.equal(result.status, 1)
  assert.match(result.stderr, /清单总数不一致/)
})

test('目标封面必须使用文章日期和 Image 2 v2 PNG 命名', (t) => {
  const root = createValidProject()
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const manifestPath = path.join(root, 'config/blog-cover-redraw-manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  manifest.entries[0].targetCover = '/covers/wrong.png'
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`)

  const result = runValidator(root)

  assert.equal(result.status, 1)
  assert.match(result.stderr, /目标封面路径不符合约定/)
})
