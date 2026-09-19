#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import matter from 'gray-matter'

import { BRIEF_PROVENANCE_VERSION, validateVisualBrief, validateBriefArtifact } from './lib/blog-brief-contract.mjs'

const projectRoot = process.cwd()
const contentRoot = path.join(projectRoot, 'content')
const config = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'config', 'blog-cover-image2.json'), 'utf8'),
)
const schemaPath = path.join(projectRoot, 'config', 'blog-cover-visual-brief.schema.json')

function printHelp() {
  console.log(`Build an auditable visual brief from a complete blog article through the OpenClaw configured text model.

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
9. 已完成归档、已封存、完好等成果必须与待验证状态区分：对应物件保持闭合完整（如 intact, unbroken seal），不得把历史失败转译为破裂封印或已完成成果受损；只对正文确实描述的损坏使用损坏隐喻。
10. 核对数量、日期、标签或回执不是必须画出的物件；不要要求画出文字标签、编号或精确份数。历史失败/归档等含义用空间关系和完整封存状态表达，避免与无排版文字合同冲突。

文章路径：${relativePostPath}
标题：${title}
摘要：${excerpt}

完整正文开始：
---
${body}
---
完整正文结束。`
}

function runTextModel(prompt) {
  const cli = path.join(os.homedir(), '.openclaw/workspace/scripts/blog_model_cli.py')
  const result = spawnSync('python3', [cli, '--role', 'brief', '--schema', schemaPath], {
    cwd: projectRoot, input: prompt, encoding: 'utf8', timeout: 960000,
    maxBuffer: 4 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
  })
  if (result.error || result.status !== 0) throw new Error(`全文抽象失败：${result.stderr || result.error?.message || result.status}`)
  const envelope = JSON.parse(result.stdout)
  if (envelope.provider !== 'claude' || envelope.model !== 'claude-sonnet-4-6' ||
      envelope.api !== 'anthropic-messages' || envelope.stop_reason !== 'end_turn') {
    throw new Error('brief 模型身份或终态无效')
  }
  validateVisualBrief(envelope.output)
  return envelope
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
    try {
      validateBriefArtifact(JSON.parse(fs.readFileSync(briefPath, 'utf8')), {
        config, postPath: relativePostPath, rawPost, body, current: true,
      })
      console.log(JSON.stringify({ status: 'ok', action: 'reused', post: relativePostPath,
        brief: relativeBriefPath, postSha256 }))
      return
    } catch { /* Stale or legacy cache must be rebuilt by this explicit command. */ }
  }
  const envelope = runTextModel(buildPrompt({ title, excerpt, body, relativePostPath }))
  const visualBrief = envelope.output

  const artifact = {
    schemaVersion: 2,
    briefVersion: config.briefVersion,
    promptVersion: config.promptVersion,
    generatedBy: 'openclaw',
    provenanceVersion: BRIEF_PROVENANCE_VERSION,
    executionMode: 'configured-model',
    provider: envelope.provider,
    model: envelope.model,
    api: envelope.api,
    postPath: relativePostPath,
    postSha256,
    bodySha256,
    bodyCharacters: body.length,
    generatedAt: new Date().toISOString(),
    visualBrief,
  }
  if (fs.readFileSync(postPath, 'utf8') !== rawPost) throw new Error('正文在 brief 生成期间变化')
  fs.mkdirSync(path.dirname(briefPath), { recursive: true })
  const temporary = `${briefPath}.${process.pid}.tmp`
  fs.writeFileSync(temporary, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
  fs.renameSync(temporary, briefPath)

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
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
