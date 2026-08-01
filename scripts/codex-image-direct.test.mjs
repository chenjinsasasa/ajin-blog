import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  resolveBuiltInImageSource,
  resolveVisualBriefInput,
  validateFreshBriefArtifact,
} from './lib/blog-cover-direct.mjs'

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

test('当前 Codex 的 visual brief 输入只能来自项目私有状态目录', (t) => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-direct-brief-'))
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }))
  const allowed = path.join(projectRoot, '.local', 'blog-automation', 'brief.json')
  fs.mkdirSync(path.dirname(allowed), { recursive: true })
  fs.writeFileSync(allowed, '{}\n')

  assert.equal(resolveVisualBriefInput(projectRoot, allowed), allowed)
  assert.throws(
    () => resolveVisualBriefInput(projectRoot, path.join(projectRoot, 'brief.json')),
    /必须位于/,
  )
})

test('当前 Codex 生图只接收 generated_images 下的真实文件', (t) => {
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-direct-image-'))
  t.after(() => fs.rmSync(codexHome, { recursive: true, force: true }))
  const allowed = path.join(codexHome, 'generated_images', 'run', 'cover.png')
  fs.mkdirSync(path.dirname(allowed), { recursive: true })
  fs.writeFileSync(allowed, 'png fixture')

  assert.equal(resolveBuiltInImageSource(allowed, codexHome), allowed)
  assert.throws(
    () => resolveBuiltInImageSource(path.join(codexHome, 'cover.png'), codexHome),
    /必须位于/,
  )
})

test('当前 Codex 生图前拒绝过期的文章或正文哈希', () => {
  const rawPost = '---\ntitle: test\n---\nbody'
  const body = 'body'
  const config = { briefVersion: 'v2', promptVersion: 'p2' }
  const artifact = {
    briefVersion: 'v2',
    promptVersion: 'p2',
    postPath: 'content/progress/test.mdx',
    postSha256: sha256(rawPost),
    bodySha256: sha256(body),
    visualBrief: { focalElementsEn: ['a', 'b', 'c'] },
  }

  assert.equal(
    validateFreshBriefArtifact({
      artifact,
      body,
      config,
      rawPost,
      relativePostPath: artifact.postPath,
    }),
    artifact,
  )
  assert.throws(
    () =>
      validateFreshBriefArtifact({
        artifact,
        body: 'changed body',
        config,
        rawPost,
        relativePostPath: artifact.postPath,
      }),
    /正文哈希已过期/,
  )
})
