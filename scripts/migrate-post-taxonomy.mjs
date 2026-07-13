import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import matter from 'gray-matter'

const contentRoot = path.join(process.cwd(), 'content')
const refreshFromHead = process.argv.includes('--refresh-from-head')
const taxonomy = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'config/post-taxonomy.json'), 'utf8'),
)
const coreTags = taxonomy.coreTags
const contextTags = taxonomy.contextTags
const allowedTags = new Set([...coreTags, ...contextTags])

const tagAliases = new Map([
  ['自动化', '系统运维'],
  ['输入法', '产品研发'],
  ['macOS', '产品研发'],
  ['LangGraph', '多智能体'],
  ['EAVK', '系统治理'],
  ['审计', '系统治理'],
  ['Agent Runtime', '系统治理'],
  ['数据基座', '知识沉淀'],
  ['治理', '系统治理'],
  ['Codex Skill 治理', '系统治理'],
  ['系统设计', '系统治理'],
  ['开源集成', '产品研发'],
  ['治理门禁', '系统治理'],
  ['里程碑', '产品研发'],
])

const projectMatchers = [
  ['signal-radar', [/signal[ -]?radar/i]],
  ['loop-harbor', [/loopharbor/i, /回环港/]],
  ['fitlens', [/fitlens/i]],
  ['ajin-blog', [/ajin[.-]blog/i, /ajin\.blog/i]],
  ['macos-input-method', [/macos[^\n。]{0,18}输入法/i, /inputmethodkit/i, /候选窗/]],
  ['enterprise-agent-vertical-kit', [/enterprise agent vertical kit/i, /\bEAVK\b/]],
  ['eomji', [/\bEomji\b/i]],
  ['figure-vault', [/figure[ -]vault/i]],
  ['api-relay-monitor', [/api-relay-monitor/i]],
  ['nexora', [/\bNexora\b/i]],
]

const areaRules = {
  'agent-governance': {
    tags: ['多智能体', '系统治理', '安全边界'],
    patterns: [/agent/i, /治理/, /权限/, /安全边界/, /路由/, /memory/i, /skill/i, /dashboard/i, /openclaw/i],
  },
  operations: {
    tags: ['系统运维', '博客内容链'],
    patterns: [/运行/, /维护/, /运维/, /监控/, /自动化/, /cron/i, /日报/, /发布/, /部署/, /gateway/i, /pipeline/i],
  },
  'product-experience': {
    tags: ['产品研发', '前端体验'],
    patterns: [/产品/, /体验/, /前端/, /界面/, /交互/, /输入法/, /功能/, /研发/, /开发/, /设计/],
  },
  'research-knowledge': {
    tags: ['调研决策', '知识沉淀'],
    patterns: [/调研/, /研究/, /论文/, /知识/, /文档/, /决策/, /分析/, /复盘/, /总结/, /归档/],
  },
}

const stageRules = {
  repair: [/故障/, /修复/, /恢复/, /排障/, /异常/, /失败/, /bug/i, /事故/],
  validate: [/验证/, /验收/, /收口/, /qa/i, /测试/, /审计/, /检查/, /门禁/],
  research: [/调研/, /研究/, /论文/, /对比/, /评估/, /分析/, /决策/],
  retrospect: [/复盘/, /总结/, /沉淀/, /回顾/, /归档/, /交接/],
  operate: [/运行/, /维护/, /运维/, /监控/, /日报/, /发布/, /部署/, /cron/i, /日常/],
  build: [/完成/, /搭建/, /建设/, /开发/, /实现/, /接入/, /新增/, /上线/, /升级/, /重构/, /设计/],
}

function getFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return getFiles(fullPath)
    return /\.mdx?$/.test(entry.name) ? [fullPath] : []
  })
}

function scorePatterns(text, patterns) {
  return patterns.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0)
}

function inferBusinessArea(data, content, tags) {
  const summary = `${data.title ?? ''}\n${data.excerpt ?? ''}`
  const lead = `${summary}\n${content.slice(0, 1400)}`
  const scores = Object.entries(areaRules).map(([value, rule]) => {
    const tagScore = tags.reduce((score, tag) => score + (rule.tags.includes(tag) ? 4 : 0), 0)
    const summaryScore = scorePatterns(summary, rule.patterns) * 3
    const leadScore = scorePatterns(lead, rule.patterns)
    return { value, score: tagScore + summaryScore + leadScore }
  })

  scores.sort((a, b) => b.score - a.score)
  return scores[0]?.score > 0 ? scores[0].value : 'product-experience'
}

function inferWorkStage(data, content) {
  const summary = `${data.title ?? ''}\n${data.excerpt ?? ''}`
  const lead = `${summary}\n${content.slice(0, 1800)}`
  const scores = Object.entries(stageRules).map(([value, patterns]) => ({
    value,
    score: scorePatterns(summary, patterns) * 3 + scorePatterns(lead, patterns),
  }))

  scores.sort((a, b) => b.score - a.score)
  return scores[0]?.score > 0 ? scores[0].value : 'build'
}

function inferProjects(data, content, rawTags) {
  if (!refreshFromHead && Array.isArray(data.projects)) {
    return data.projects.filter((project) => projectMatchers.some(([value]) => value === project)).slice(0, 3)
  }

  const text = `${data.title ?? ''}\n${data.excerpt ?? ''}\n${rawTags.join('\n')}`
  return projectMatchers
    .filter(([, patterns]) => patterns.some((pattern) => pattern.test(text)))
    .map(([value]) => value)
    .slice(0, 3)
}

function normalizeTags(rawTags, area, projects) {
  const normalized = []

  for (const rawTag of rawTags) {
    const tag = String(rawTag).trim()
    const mapped = tagAliases.get(tag) ?? tag
    if (
      allowedTags.has(mapped) &&
      (coreTags.includes(mapped) || mapped === 'OpenClaw') &&
      !normalized.includes(mapped)
    ) {
      normalized.push(mapped)
    }
  }

  const projectTagMap = {
    'ajin-blog': 'ajin-blog',
    eomji: 'Eomji',
    'figure-vault': 'Figure Vault',
    'api-relay-monitor': 'api-relay-monitor',
    nexora: 'Nexora',
  }

  const areaFallback = {
    'agent-governance': '系统治理',
    operations: '系统运维',
    'product-experience': '产品研发',
    'research-knowledge': '调研决策',
  }

  if (!normalized.some((tag) => coreTags.includes(tag))) normalized.unshift(areaFallback[area])

  for (const project of projects) {
    const projectTag = projectTagMap[project]
    if (projectTag && !normalized.includes(projectTag)) normalized.push(projectTag)
  }

  const core = normalized.filter((tag) => coreTags.includes(tag))
  const context = normalized.filter((tag) => contextTags.includes(tag))
  return [...core, ...context].slice(0, 3)
}

function orderedFrontmatter(data, taxonomy) {
  const preferredKeys = [
    'title',
    'date',
    'category',
    'businessArea',
    'workStage',
    'projects',
    'tags',
    'excerpt',
    'author',
    'coverImage',
    'coverSourceUrl',
    'coverLicense',
    'coverAttribution',
  ]
  const merged = { ...data, ...taxonomy }
  const ordered = {}

  for (const key of preferredKeys) {
    if (merged[key] !== undefined) ordered[key] = merged[key]
  }
  for (const [key, value] of Object.entries(merged)) {
    if (!(key in ordered)) ordered[key] = value
  }
  return ordered
}

const files = getFiles(contentRoot)
const totals = { areas: {}, stages: {}, projects: {}, changed: 0 }

for (const filePath of files) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const parsed = matter(raw)
  let sourceData = parsed.data
  let sourceRaw = raw

  if (refreshFromHead) {
    try {
      const relativePath = path.relative(process.cwd(), filePath)
      const headRaw = execFileSync('git', ['show', `HEAD:${relativePath}`], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      sourceData = matter(headRaw).data
      sourceRaw = headRaw
    } catch {
      sourceData = parsed.data
    }
  }

  const rawTags = Array.isArray(sourceData.tags) ? sourceData.tags.map(String) : []
  const preliminaryArea = inferBusinessArea(parsed.data, parsed.content, rawTags)
  const projects = inferProjects(parsed.data, parsed.content, rawTags)
  const tags = normalizeTags(rawTags, preliminaryArea, projects)
  const businessArea = inferBusinessArea(parsed.data, parsed.content, tags)
  const workStage = inferWorkStage(parsed.data, parsed.content)
  const nextData = orderedFrontmatter(parsed.data, { businessArea, workStage, projects, tags })
  let nextRaw = matter.stringify(parsed.content, nextData)
  if (!sourceRaw.endsWith('\n')) nextRaw = nextRaw.replace(/\n$/, '')

  if (nextRaw !== raw) {
    fs.writeFileSync(filePath, nextRaw)
    totals.changed += 1
  }

  totals.areas[businessArea] = (totals.areas[businessArea] ?? 0) + 1
  totals.stages[workStage] = (totals.stages[workStage] ?? 0) + 1
  for (const project of projects) totals.projects[project] = (totals.projects[project] ?? 0) + 1
}

console.log(JSON.stringify({ files: files.length, ...totals }, null, 2))
