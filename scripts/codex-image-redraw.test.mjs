import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import matter from 'gray-matter'

import {
  createCoverRedrawManifest,
  targetCoverFor,
} from './lib/cover-redraw-manifest.mjs'
import {
  commitCoverRedrawBatch,
  upsertCoverProvenance,
} from './lib/cover-redraw-apply.mjs'

test('历史封面候选始终使用独立的 Image 2 v2 PNG 路径', () => {
  assert.equal(
    targetCoverFor('/covers/2026-07-01-progress.jpg'),
    '/covers/2026-07-01-progress-image2-v2.png',
  )
  assert.equal(
    targetCoverFor('/covers/2026-07-02-existing.png'),
    '/covers/2026-07-02-existing-image2-v2.png',
  )
})

test('清单按日期倒序分批，并从文件与 frontmatter 推导断点状态', () => {
  const posts = [
    {
      postPath: 'content/progress/2026-07-22-progress.mdx',
      title: '22 日',
      date: '2026-07-22',
      coverImage: '/covers/22-image2-v2.png',
      coverPromptVersion: 'steam-industrial-v2',
      coverContractValid: false,
    },
    {
      postPath: 'content/progress/2026-07-23-progress.mdx',
      title: '23 日',
      date: '2026-07-23',
      coverImage: '/covers/23.jpg',
      coverPromptVersion: '',
      coverContractValid: false,
    },
    {
      postPath: 'content/progress/2026-07-21-progress.mdx',
      title: '21 日',
      date: '2026-07-21',
      coverImage: '/covers/21-image2-v2.png',
      coverPromptVersion: 'steam-industrial-v2',
      coverContractValid: true,
    },
  ]
  const existing = new Set([
    'public/covers/22-image2-v2.png',
    'public/covers/21-image2-v2.png',
  ])

  const manifest = createCoverRedrawManifest({
    batchSize: 2,
    config: { promptVersion: 'steam-industrial-v2' },
    exists: (relativePath) => existing.has(relativePath),
    posts,
  })

  assert.equal(manifest.total, 3)
  assert.equal(manifest.batchCount, 2)
  assert.deepEqual(
    manifest.entries.map(({ date, batch, status }) => ({ date, batch, status })),
    [
      { date: '2026-07-23', batch: 1, status: 'pending' },
      { date: '2026-07-22', batch: 1, status: 'ready-for-review' },
      { date: '2026-07-21', batch: 2, status: 'applied' },
    ],
  )
})

test('历史封面清单忽略截止日之后新增的文章并保持批次断点稳定', () => {
  const posts = [
    {
      postPath: 'content/progress/2026-07-24-progress.mdx',
      title: '当天新文章',
      date: '2026-07-24',
      coverImage: '/covers/24.png',
      coverPromptVersion: 'steam-industrial-v2',
      coverContractValid: true,
    },
    {
      postPath: 'content/progress/2026-07-23-progress.mdx',
      title: '历史文章',
      date: '2026-07-23',
      coverImage: '/covers/23.jpg',
      coverPromptVersion: '',
      coverContractValid: false,
    },
  ]

  const manifest = createCoverRedrawManifest({
    batchSize: 5,
    config: {
      backfillCutoffDate: '2026-07-23',
      promptVersion: 'steam-industrial-v2',
    },
    exists: () => true,
    posts,
  })

  assert.equal(manifest.total, 1)
  assert.equal(manifest.backfillCutoffDate, '2026-07-23')
  assert.deepEqual(manifest.entries.map(({ date, batch }) => ({ date, batch })), [
    { date: '2026-07-23', batch: 1 },
  ])
})

test('应用候选图时只更新封面字段并保持正文原样', () => {
  const raw = `---
title: "示例"
coverImage: "/covers/old.jpg"
coverSourceUrl: "https://example.com/old.jpg"
coverLicense: "Public Domain"
coverAttribution: "Old Source"
---

# 正文

内容不应被改写。
`
  const next = upsertCoverProvenance(
    raw,
    {
      coverImage: '/covers/new-image2-v2.png',
      coverProvider: 'codex',
      coverPromptVersion: 'steam-industrial-v2',
    },
    ['coverSourceUrl', 'coverLicense', 'coverAttribution'],
  )

  assert.match(next, /coverImage: "\/covers\/new-image2-v2\.png"/)
  assert.match(next, /coverProvider: "codex"/)
  assert.match(next, /coverPromptVersion: "steam-industrial-v2"/)
  assert.doesNotMatch(next, /coverSourceUrl:|coverLicense:|coverAttribution:/)
  assert.equal(next.slice(next.indexOf('\n---\n') + 5), raw.slice(raw.indexOf('\n---\n') + 5))
})

test('移除多行来源字段时不残留 YAML 块内容', () => {
  const raw = `---
title: 示例
coverImage: /covers/old.jpg
coverAttribution: >-
  The Metropolitan Museum of Art, New York. Harbor Scene,
  Engraving by Aegidius Sadeler II.
---

正文
`

  const next = upsertCoverProvenance(
    raw,
    { coverImage: '/covers/new-image2-v2.png' },
    ['coverAttribution'],
  )

  assert.doesNotMatch(next, /Metropolitan Museum|Engraving by/)
  assert.equal(matter(next).data.coverImage, '/covers/new-image2-v2.png')
  assert.equal(matter(next).content.trim(), '正文')
})

test('批次验证失败时恢复本批所有已写文件', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ajin-cover-apply-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const firstPath = path.join(root, 'first.mdx')
  const secondPath = path.join(root, 'second.json')
  fs.writeFileSync(firstPath, 'first-before')
  fs.writeFileSync(secondPath, 'second-before')

  await assert.rejects(
    commitCoverRedrawBatch({
      changes: [
        { filePath: firstPath, contents: 'first-after' },
        { filePath: secondPath, contents: 'second-after' },
      ],
      validate: async () => {
        assert.equal(fs.readFileSync(firstPath, 'utf8'), 'first-after')
        assert.equal(fs.readFileSync(secondPath, 'utf8'), 'second-after')
        throw new Error('整批验证失败')
      },
    }),
    /整批验证失败/,
  )

  assert.equal(fs.readFileSync(firstPath, 'utf8'), 'first-before')
  assert.equal(fs.readFileSync(secondPath, 'utf8'), 'second-before')
})
