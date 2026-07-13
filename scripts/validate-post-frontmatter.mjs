import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const projectRoot = process.cwd()
const contentRoot = path.join(projectRoot, 'content')
const taxonomy = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'config/post-taxonomy.json'), 'utf8'),
)

const requiredFields = [
  'title',
  'date',
  'category',
  'businessArea',
  'workStage',
  'projects',
  'tags',
  'excerpt',
  'author',
]
const categories = new Set(['progress', 'diary'])
const businessAreas = new Set(taxonomy.businessAreas.map((item) => item.value))
const workStages = new Set(taxonomy.workStages.map((item) => item.value))
const projects = new Set(taxonomy.projects.map((item) => item.value))

function getFiles(dir) {
  if (!fs.existsSync(dir)) return []

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return getFiles(fullPath)
    return /\.mdx?$/.test(entry.name) ? [fullPath] : []
  })
}

function hasDuplicates(values) {
  return new Set(values).size !== values.length
}

function normalizeDate(rawDate) {
  if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) {
    return rawDate.toISOString().slice(0, 10)
  }
  return typeof rawDate === 'string' ? rawDate.trim() : ''
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

const files = getFiles(contentRoot)
const errors = []
const slugs = new Map()
const stats = { categories: {}, businessAreas: {}, workStages: {}, projects: {} }

for (const filePath of files) {
  const relativePath = path.relative(projectRoot, filePath)
  let data

  try {
    data = matter(fs.readFileSync(filePath, 'utf8')).data
  } catch (error) {
    errors.push(`${relativePath}: frontmatter 无法解析（${error.message}）`)
    continue
  }

  const addError = (message) => errors.push(`${relativePath}: ${message}`)

  for (const field of requiredFields) {
    if (!Object.prototype.hasOwnProperty.call(data, field)) addError(`缺少必填字段 ${field}`)
  }

  if (!isNonEmptyString(data.title)) addError('title 必须是非空字符串')
  if (!isNonEmptyString(data.excerpt)) addError('excerpt 必须是非空字符串')
  if (!isNonEmptyString(data.author)) addError('author 必须是非空字符串')

  const date = normalizeDate(data.date)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    addError('date 必须使用 YYYY-MM-DD')
  }

  if (!categories.has(data.category)) {
    addError('category 只能是 progress 或 diary')
  } else {
    const directoryCategory = path.relative(contentRoot, filePath).split(path.sep)[0]
    if (directoryCategory !== data.category) addError(`category 与目录 ${directoryCategory} 不一致`)
    stats.categories[data.category] = (stats.categories[data.category] ?? 0) + 1
  }

  if (!businessAreas.has(data.businessArea)) {
    addError(`businessArea 非法：${String(data.businessArea)}`)
  } else {
    stats.businessAreas[data.businessArea] = (stats.businessAreas[data.businessArea] ?? 0) + 1
  }

  if (!workStages.has(data.workStage)) {
    addError(`workStage 非法：${String(data.workStage)}`)
  } else {
    stats.workStages[data.workStage] = (stats.workStages[data.workStage] ?? 0) + 1
  }

  if (!Array.isArray(data.projects)) {
    addError('projects 必须是数组；无项目时使用 []')
  } else {
    if (data.projects.length > 3) addError('projects 最多填写 3 个')
    if (hasDuplicates(data.projects)) addError('projects 不能重复')
    for (const project of data.projects) {
      if (!projects.has(project)) {
        addError(`projects 包含未批准值：${String(project)}`)
      } else {
        stats.projects[project] = (stats.projects[project] ?? 0) + 1
      }
    }
  }

  if (!Array.isArray(data.tags)) {
    addError('tags 必须是数组')
  } else {
    if (data.tags.length < 1 || data.tags.length > 3) addError('tags 必须包含 1–3 个值')
    if (!data.tags.every(isNonEmptyString)) addError('tags 必须都是非空字符串')
    const normalizedTags = data.tags.map((tag) => (typeof tag === 'string' ? tag.trim() : tag))
    if (hasDuplicates(normalizedTags)) addError('tags 不能重复')
  }

  if (data.coverImage !== undefined) {
    if (!isNonEmptyString(data.coverImage) || !data.coverImage.startsWith('/')) {
      addError('coverImage 必须是 public 下以 / 开头的路径')
    } else if (!fs.existsSync(path.join(projectRoot, 'public', data.coverImage.slice(1)))) {
      addError(`coverImage 文件不存在：${data.coverImage}`)
    }
  }

  const slug = path.basename(filePath, path.extname(filePath))
  if (slugs.has(slug)) addError(`slug 与 ${slugs.get(slug)} 重复`)
  else slugs.set(slug, relativePath)
}

if (errors.length > 0) {
  console.error(`文章 frontmatter 校验失败：${errors.length} 个问题`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(JSON.stringify({ status: 'ok', files: files.length, ...stats }, null, 2))
