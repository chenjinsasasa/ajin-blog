#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

import { buildCodexImagePrompt } from './lib/blog-cover-image-prompt.mjs'

const projectRoot = process.cwd()

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), 'utf8'))
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function imageGenerationBlock(prompt) {
  const match = prompt.match(/IMAGE GENERATION PROMPT\n([\s\S]*?)\nEND IMAGE GENERATION PROMPT/)
  if (!match) throw new Error('缺少 IMAGE GENERATION PROMPT block')
  return match[1]
}

function main() {
  const config = readJson('config/blog-cover-image2.json')
  const manifest = readJson('config/blog-cover-redraw-manifest.json')
  if (manifest.total !== manifest.entries.length) {
    throw new Error(
      `清单总数不一致：声明 ${manifest.total}，实际 ${manifest.entries.length}`,
    )
  }
  const posts = new Set()
  const targets = new Set()
  const promptLengths = []

  for (const reference of config.references) {
    const referencePath = path.join(projectRoot, reference.path)
    if (!fs.existsSync(referencePath)) throw new Error(`标准参考图不存在：${reference.path}`)
    if (sha256(fs.readFileSync(referencePath)) !== reference.sha256) {
      throw new Error(`标准参考图已漂移：${reference.path}`)
    }
  }

  for (const entry of manifest.entries) {
    const postPath = path.join(projectRoot, entry.postPath)
    const slug = path.basename(entry.postPath, path.extname(entry.postPath))
    const briefPath = path.join(projectRoot, 'content', 'cover-briefs', `${slug}.json`)
    if (!fs.existsSync(postPath)) throw new Error(`文章不存在：${entry.postPath}`)
    if (!fs.existsSync(briefPath)) throw new Error(`visual brief 不存在：${briefPath}`)
    if (
      !entry.targetCover.startsWith(`/covers/${entry.date}-`) ||
      !entry.targetCover.endsWith('-image2-v2.png')
    ) {
      throw new Error(`目标封面路径不符合约定：${entry.targetCover}`)
    }
    if (posts.has(entry.postPath)) throw new Error(`文章重复：${entry.postPath}`)
    if (targets.has(entry.targetCover)) throw new Error(`目标封面重复：${entry.targetCover}`)
    posts.add(entry.postPath)
    targets.add(entry.targetCover)

    const rawPost = fs.readFileSync(postPath, 'utf8')
    const body = matter(rawPost).content.trim()
    const briefArtifact = JSON.parse(fs.readFileSync(briefPath, 'utf8'))
    if (briefArtifact.postPath !== entry.postPath) {
      throw new Error(`visual brief 文章路径不一致：${entry.postPath}`)
    }
    if (briefArtifact.postSha256 !== sha256(rawPost)) {
      throw new Error(`visual brief 文章哈希已过期：${entry.postPath}`)
    }
    if (briefArtifact.bodySha256 !== sha256(body)) {
      throw new Error(`visual brief 正文哈希已过期：${entry.postPath}`)
    }
    if (briefArtifact.bodyCharacters !== body.length) {
      throw new Error(`visual brief 正文长度不一致：${entry.postPath}`)
    }
    if (briefArtifact.briefVersion !== config.briefVersion) {
      throw new Error(`visual brief 版本错误：${entry.postPath}`)
    }
    if (briefArtifact.promptVersion !== config.promptVersion) {
      throw new Error(`visual brief 提示版本错误：${entry.postPath}`)
    }

    const outputPath = path.join(projectRoot, 'public', entry.targetCover.replace(/^\//, ''))
    const prompt = buildCodexImagePrompt({ briefArtifact, config, outputPath })
    promptLengths.push(imageGenerationBlock(prompt).length)
  }

  const sortedLengths = [...promptLengths].sort((left, right) => left - right)
  console.log(
    JSON.stringify(
      {
        status: 'ok',
        manifestEntries: manifest.entries.length,
        promptsValidated: promptLengths.length,
        referencesVerified: config.references.length,
        uniquePosts: posts.size,
        uniqueTargets: targets.size,
        promptLength: {
          min: sortedLengths[0],
          median: sortedLengths[Math.floor(sortedLengths.length / 2)],
          max: sortedLengths.at(-1),
          limit: config.generationPromptMaxCharacters,
        },
      },
      null,
      2,
    ),
  )
}

try {
  main()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
