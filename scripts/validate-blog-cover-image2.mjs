#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import sharp from 'sharp'

const projectRoot = process.cwd()
const contentRoot = path.join(projectRoot, 'content')
const config = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'config', 'blog-cover-image2.json'), 'utf8'),
)
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
const forbiddenExternalFields = ['coverSourceUrl', 'coverLicense', 'coverAttribution']
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

function getFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return getFiles(fullPath)
    return /\.mdx?$/.test(entry.name) ? [fullPath] : []
  })
}

function normalizeDate(rawDate) {
  if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) {
    return rawDate.toISOString().slice(0, 10)
  }
  return typeof rawDate === 'string' ? rawDate.trim() : ''
}

function parseArgs(argv) {
  if (argv.length === 0) return { post: '' }
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) {
    console.log(`Validate Image 2 blog cover provenance and geometry.

Usage:
  npm run cover:image2:validate
  npm run cover:image2:validate -- --post content/progress/YYYY-MM-DD-progress.mdx
`)
    process.exit(0)
  }
  if (argv.length === 2 && argv[0] === '--post') return { post: argv[1] }
  throw new Error('用法：--post <文章路径>')
}

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

function hashText(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function expectedBriefPath(filePath) {
  const slug = path.basename(filePath, path.extname(filePath))
  return path.join('content', 'cover-briefs', `${slug}.json`)
}

function verifyReferences(errors) {
  for (const reference of config.references) {
    const absolutePath = path.join(projectRoot, reference.path)
    if (!fs.existsSync(absolutePath)) {
      errors.push(`标准参考图不存在：${reference.path}`)
      continue
    }
    const actualHash = hashFile(absolutePath)
    if (actualHash !== reference.sha256) {
      errors.push(`标准参考图已漂移：${reference.path}`)
    }
  }
}

async function validatePost(filePath, force, errors) {
  const relativePath = path.relative(projectRoot, filePath)
  const rawPost = fs.readFileSync(filePath, 'utf8')
  const post = matter(rawPost)
  const data = post.data
  const date = normalizeDate(data.date)
  if (!force && (!date || date < config.enforcementStartDate)) return false

  const addError = (message) => errors.push(`${relativePath}: ${message}`)

  for (const [field, expected] of Object.entries(exactFields)) {
    if (data[field] !== expected) addError(`${field} 必须是 ${JSON.stringify(expected)}`)
  }
  for (const field of forbiddenExternalFields) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      addError(`Image 2 封面不得保留外部来源字段 ${field}`)
    }
  }

  const expectedRelativeBriefPath = expectedBriefPath(filePath)
  if (data.coverBriefPath !== expectedRelativeBriefPath) {
    addError(`coverBriefPath 必须是 ${JSON.stringify(expectedRelativeBriefPath)}`)
  }
  const briefRoot = path.resolve(projectRoot, 'content', 'cover-briefs')
  const briefPath = path.resolve(projectRoot, expectedRelativeBriefPath)
  if (!briefPath.startsWith(`${briefRoot}${path.sep}`)) {
    addError('coverBriefPath 解析后必须仍位于 content/cover-briefs/')
  } else if (!fs.existsSync(briefPath)) {
    addError(`visual brief 文件不存在：${expectedRelativeBriefPath}`)
  } else {
    try {
      const brief = JSON.parse(fs.readFileSync(briefPath, 'utf8'))
      if (brief.schemaVersion !== 1) addError('visual brief schemaVersion 必须是 1')
      if (brief.briefVersion !== config.briefVersion) {
        addError(`visual brief briefVersion 必须是 ${JSON.stringify(config.briefVersion)}`)
      }
      if (brief.promptVersion !== config.promptVersion) {
        addError(`visual brief promptVersion 必须是 ${JSON.stringify(config.promptVersion)}`)
      }
      if (brief.generatedBy !== 'codex' || brief.executionMode !== 'full-article-analysis') {
        addError('visual brief 必须由 Codex full-article-analysis 生成')
      }
      if (brief.postPath !== relativePath) addError('visual brief postPath 与文章不一致')
      if (brief.postSha256 !== hashText(rawPost)) addError('visual brief 已过期：文章哈希不一致')
      if (brief.bodySha256 !== hashText(post.content.trim())) {
        addError('visual brief 已过期：正文哈希不一致')
      }
      for (const field of requiredBriefFields) {
        if (typeof brief.visualBrief?.[field] !== 'string' || !brief.visualBrief[field].trim()) {
          addError(`visual brief 缺少非空字段 ${field}`)
        }
      }
      for (const field of ['supportingSymbolsZh', 'focalElementsEn']) {
        const values = brief.visualBrief?.[field]
        if (
          !Array.isArray(values) ||
          values.length !== 3 ||
          !values.every((item) => typeof item === 'string' && item.trim())
        ) {
          addError(`visual brief ${field} 必须包含恰好 3 个非空字符串`)
        }
      }
    } catch (error) {
      addError(`visual brief 无法读取：${error.message}`)
    }
  }

  if (typeof data.coverImage !== 'string' || !data.coverImage.startsWith('/covers/')) {
    addError('coverImage 必须位于 /covers/')
    return true
  }
  if (path.extname(data.coverImage).toLowerCase() !== '.png') {
    addError('Image 2 封面统一使用 .png')
  }

  const coverRoot = path.resolve(projectRoot, 'public', 'covers')
  const coverPath = path.resolve(projectRoot, 'public', data.coverImage.slice(1))
  if (!coverPath.startsWith(`${coverRoot}${path.sep}`)) {
    addError('coverImage 解析后必须仍位于 public/covers/')
    return true
  }
  if (!fs.existsSync(coverPath)) {
    addError(`封面文件不存在：${data.coverImage}`)
    return true
  }

  try {
    const metadata = await sharp(coverPath).metadata()
    const width = metadata.width || 0
    const height = metadata.height || 0
    const ratio = height > 0 ? width / height : 0
    if (Math.abs(ratio - 16 / 9) > 0.01) {
      addError(`封面必须是 16:9，当前为 ${width}x${height}`)
    }
    if (width < 1280 || height < 720) {
      addError(`封面分辨率不得低于 1280x720，当前为 ${width}x${height}`)
    }
  } catch (error) {
    addError(`封面无法读取：${error.message}`)
  }

  return true
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const errors = []
  verifyReferences(errors)

  let files
  let force = false
  if (options.post) {
    const absolutePath = path.resolve(projectRoot, options.post)
    const absoluteContentRoot = path.resolve(contentRoot)
    if (!absolutePath.startsWith(`${absoluteContentRoot}${path.sep}`)) {
      throw new Error(`文章路径必须位于 content/：${options.post}`)
    }
    files = [absolutePath]
    force = true
  } else {
    files = getFiles(contentRoot)
  }

  let enforced = 0
  for (const filePath of files) {
    if (await validatePost(filePath, force, errors)) enforced += 1
  }

  if (errors.length > 0) {
    console.error(`Image 2 封面校验失败：${errors.length} 个问题`)
    for (const error of errors) console.error(`- ${error}`)
    process.exit(1)
  }

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        model: config.model,
        promptVersion: config.promptVersion,
        briefVersion: config.briefVersion,
        referenceSet: config.referenceSet,
        enforcementStartDate: config.enforcementStartDate,
        postsChecked: enforced,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
