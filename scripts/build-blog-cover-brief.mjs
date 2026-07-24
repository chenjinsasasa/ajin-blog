#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import matter from 'gray-matter'

const projectRoot = process.cwd()
const contentRoot = path.join(projectRoot, 'content')
const config = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'config', 'blog-cover-image2.json'), 'utf8'),
)
const schemaPath = path.join(projectRoot, 'config', 'blog-cover-visual-brief.schema.json')
const requiredBriefFields = [
  'coreEventZh',
  'primarySubjectZh',
  'keyActionZh',
  'resultZh',
  'tensionZh',
  'industrialMetaphorZh',
  'sceneDescriptionZh',
  'imagePromptEn',
]

function printHelp() {
  console.log(`Build an auditable visual brief from a complete blog article through Codex.

Usage:
  npm run cover:image2:brief -- --post content/progress/YYYY-MM-DD-progress.mdx

Options:
  --post <path>  Complete article to abstract (required)
  --force        Rebuild even when the article hash is unchanged
  -h, --help     Show this help
`)
}

function parseArgs(argv) {
  const options = { force: false, post: '' }
  const args = [...argv]
  while (args.length > 0) {
    const arg = args.shift()
    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
    if (arg === '--force') options.force = true
    else if (arg === '--post') {
      const value = args.shift()
      if (!value) throw new Error('--post 缺少参数')
      options.post = value
    } else {
      throw new Error(`未知参数：${arg}`)
    }
  }
  if (!options.post) throw new Error('必须提供 --post <文章路径>')
  return options
}

function resolvePost(relativePath) {
  const absolutePath = path.resolve(projectRoot, relativePath)
  if (!absolutePath.startsWith(`${path.resolve(contentRoot)}${path.sep}`)) {
    throw new Error(`文章路径必须位于 content/：${relativePath}`)
  }
  if (!/\.mdx?$/.test(absolutePath)) throw new Error('文章必须是 .md 或 .mdx 文件')
  if (!fs.existsSync(absolutePath)) throw new Error(`文章不存在：${relativePath}`)
  return absolutePath
}

function hashText(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function briefRelativePath(postPath) {
  const slug = path.basename(postPath, path.extname(postPath))
  return path.join('content', 'cover-briefs', `${slug}.json`)
}

function validateVisualBrief(brief) {
  if (!brief || typeof brief !== 'object' || Array.isArray(brief)) {
    throw new Error('Codex visual brief 不是 JSON object')
  }
  for (const field of requiredBriefFields) {
    if (typeof brief[field] !== 'string' || !brief[field].trim()) {
      throw new Error(`Codex visual brief 缺少非空字段 ${field}`)
    }
  }
  for (const field of ['supportingSymbolsZh', 'focalElementsEn']) {
    if (
      !Array.isArray(brief[field]) ||
      brief[field].length !== 3 ||
      !brief[field].every((item) => typeof item === 'string' && item.trim())
    ) {
      throw new Error(`${field} 必须包含恰好 3 个非空字符串`)
    }
  }
}

function buildPrompt({ title, excerpt, body, relativePostPath }) {
  return `【任务类型】A. 完整文章研读与视觉抽象
【任务目标】读取当天完整博客正文，提炼一份供封面生成使用的结构化 visual brief。
【工作范围】只分析下方提供的单篇文章；不要读取其他文件，不要修改任何文件。
【禁止扩展】不要生成图片，不要讨论风格方案，不要调用工具，不要补写文章内容。
【本轮停点】返回符合 JSON Schema 的一个 JSON object 后立即停止。
【验收证据】所有字段非空；supportingSymbolsZh 与 focalElementsEn 都恰好为 3 项；imagePromptEn 不超过 500 字符且可直接描述单一画面。
【止损规则】正文不足以支持某个细节时使用克制概括，不得编造具体成果、人物或数字。

抽象规则：
1. 必须综合完整正文，不得只依据标题或摘要。
2. 只保留当天最重要的一条主线和一个核心矛盾；禁止把多条工程线逐项塞进画面。
3. 把现代技术、项目和故障转译成 19 世纪工业机制、人物动作和空间关系；不要把产品名、代码、数字或 UI 文字放进画面。
4. supportingSymbolsZh 必须恰好 3 项，分别对应主角或主体、已经稳定的成果、尚未解决的阻碍。
5. focalElementsEn 必须用英文给出与上述三项一一对应的三个短语；生图阶段只允许使用这三个视觉焦点。
6. sceneDescriptionZh 必须说明一个可拍成单帧的连贯场景；背景只能提供空间与光线，不得增加第四个叙事物件。
7. imagePromptEn 使用英文，在 500 字符内只描述三个视觉焦点的空间关系和动作，不要重复固定画风。
8. 输出内容使用简体中文，只有 focalElementsEn 与 imagePromptEn 使用英文。

文章路径：${relativePostPath}
标题：${title}
摘要：${excerpt}

完整正文开始：
---
${body}
---
完整正文结束。`
}

function runCodex(prompt, outputPath) {
  const args = [
    '-a',
    'never',
    '-s',
    'read-only',
    'exec',
    '--ephemeral',
    '--skip-git-repo-check',
    '--ignore-user-config',
    '--ignore-rules',
    '-C',
    projectRoot,
    '--output-schema',
    schemaPath,
    '--output-last-message',
    outputPath,
    '-',
  ]
  const result = spawnSync('codex', args, {
    cwd: projectRoot,
    env: Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key !== 'OPENAI_API_KEY'),
    ),
    input: prompt,
    stdio: ['pipe', 'inherit', 'inherit'],
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`Codex 正文抽象失败（exit=${result.status}）`)
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  const postPath = resolvePost(options.post)
  const relativePostPath = path.relative(projectRoot, postPath)
  const rawPost = fs.readFileSync(postPath, 'utf8')
  const post = matter(rawPost)
  const title = typeof post.data.title === 'string' ? post.data.title.trim() : ''
  const excerpt = typeof post.data.excerpt === 'string' ? post.data.excerpt.trim() : ''
  const body = post.content.trim()
  if (!title) throw new Error('文章 frontmatter 缺少 title')
  if (!excerpt) throw new Error('文章 frontmatter 缺少 excerpt')
  if (body.length < 100) throw new Error('完整正文不足 100 字符，停止视觉抽象')

  const postSha256 = hashText(rawPost)
  const bodySha256 = hashText(body)
  const relativeBriefPath = briefRelativePath(postPath)
  const briefPath = path.join(projectRoot, relativeBriefPath)

  if (!options.force && fs.existsSync(briefPath)) {
    const existing = JSON.parse(fs.readFileSync(briefPath, 'utf8'))
    if (
      existing.briefVersion === config.briefVersion &&
      existing.promptVersion === config.promptVersion &&
      existing.postSha256 === postSha256 &&
      existing.bodySha256 === bodySha256
    ) {
      validateVisualBrief(existing.visualBrief)
      console.log(
        JSON.stringify(
          {
            status: 'ok',
            action: 'reused',
            post: relativePostPath,
            brief: relativeBriefPath,
            postSha256,
          },
          null,
          2,
        ),
      )
      return
    }
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ajin-blog-cover-brief-'))
  const codexOutputPath = path.join(tempDir, 'visual-brief.json')
  try {
    runCodex(buildPrompt({ title, excerpt, body, relativePostPath }), codexOutputPath)
    const visualBrief = JSON.parse(fs.readFileSync(codexOutputPath, 'utf8'))
    validateVisualBrief(visualBrief)

    const artifact = {
      schemaVersion: 1,
      briefVersion: config.briefVersion,
      promptVersion: config.promptVersion,
      generatedBy: 'codex',
      executionMode: 'full-article-analysis',
      postPath: relativePostPath,
      postSha256,
      bodySha256,
      bodyCharacters: body.length,
      generatedAt: new Date().toISOString(),
      visualBrief,
    }
    fs.mkdirSync(path.dirname(briefPath), { recursive: true })
    fs.writeFileSync(briefPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          action: 'generated',
          post: relativePostPath,
          brief: relativeBriefPath,
          postSha256,
          bodyCharacters: body.length,
        },
        null,
        2,
      ),
    )
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
