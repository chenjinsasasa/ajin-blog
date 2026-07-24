import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCodexImageArgs,
  buildCodexImagePrompt,
} from './lib/blog-cover-image-prompt.mjs'

const config = {
  motherPrompt:
    'Dense black-ink copperplate engraving on warm ivory paper, late-nineteenth-century industrial workshop.',
  constraints: 'One coherent 16:9 scene. No text, logo, watermark, or collage.',
  negativePrompt: 'modern computer, neon gradient, colorful 3D render',
  promptVersion: 'steam-industrial-v2',
  briefVersion: 'full-article-v2',
  references: [
    { path: 'public/entry-cards/blog-archive.jpg' },
    { path: 'public/entry-cards/private-diary.jpg' },
  ],
}

const briefArtifact = {
  briefVersion: 'full-article-v2',
  visualBrief: {
    coreEventZh: '主线完成，但最后一道出口仍被阻断。',
    focalElementsEn: [
      'a calibrated typesetting press on the left',
      'a chief engineer at the center',
      'a locked steam outlet valve on the right',
    ],
    imagePromptEn:
      'The engineer inspects the locked outlet while the finished press and a small backup engine remain stable.',
    supportingSymbolsZh: ['排字机', '工程师', '闭锁阀门'],
  },
}

test('生图命令不附加参考图输入', () => {
  const args = buildCodexImageArgs('/workspace')

  assert.equal(args.includes('-i'), false)
  assert.deepEqual(
    args.slice(args.indexOf('-c'), args.indexOf('-c') + 2),
    ['-c', 'model_reasoning_effort="low"'],
  )
  assert.equal(args.at(-1), '-')
})

test('生图提示只注入锁定风格和三个视觉焦点', () => {
  const prompt = buildCodexImagePrompt({
    briefArtifact,
    config,
    outputPath: '/workspace/public/covers/example.png',
  })

  assert.match(prompt, /Input images: none/)
  assert.match(prompt, /exactly three focal elements/i)
  for (const element of briefArtifact.visualBrief.focalElementsEn) {
    assert.match(prompt, new RegExp(element.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.doesNotMatch(prompt, /blog-archive\.jpg/)
  assert.doesNotMatch(prompt, /private-diary\.jpg/)
  assert.doesNotMatch(prompt, /supportingSymbolsZh/)
  assert.doesNotMatch(prompt, /Full-article visual brief:\s*\{/)
  assert.ok(prompt.length < 3500, `提示词过长：${prompt.length}`)
})

test('视觉焦点不是恰好三个时拒绝生成', () => {
  assert.throws(
    () =>
      buildCodexImagePrompt({
        briefArtifact: {
          ...briefArtifact,
          visualBrief: {
            ...briefArtifact.visualBrief,
            focalElementsEn: ['one', 'two', 'three', 'four'],
          },
        },
        config,
        outputPath: '/workspace/public/covers/example.png',
      }),
    /恰好 3 个/,
  )
})
