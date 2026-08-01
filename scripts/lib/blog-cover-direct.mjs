import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function hashText(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function assertInside(root, candidate, label) {
  const resolvedRoot = path.resolve(root)
  const resolvedCandidate = path.resolve(candidate)
  if (
    resolvedCandidate !== resolvedRoot &&
    !resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw new Error(`${label} 必须位于 ${resolvedRoot}/：${candidate}`)
  }
  return resolvedCandidate
}

export function resolveVisualBriefInput(projectRoot, inputPath) {
  const allowedRoot = path.join(projectRoot, '.local', 'blog-automation')
  const resolved = assertInside(allowedRoot, path.resolve(projectRoot, inputPath), 'visual brief 输入')
  if (!fs.existsSync(resolved)) throw new Error(`visual brief 输入不存在：${inputPath}`)
  return resolved
}

export function resolveBuiltInImageSource(sourcePath, codexHome = '') {
  const effectiveCodexHome = codexHome || process.env.CODEX_HOME || path.join(os.homedir(), '.codex')
  const generatedRoot = path.join(effectiveCodexHome, 'generated_images')
  const resolved = assertInside(generatedRoot, sourcePath, '内置 image_gen 源文件')
  if (!fs.existsSync(resolved)) throw new Error(`内置 image_gen 源文件不存在：${sourcePath}`)
  if (!fs.statSync(resolved).isFile()) throw new Error(`内置 image_gen 源路径不是文件：${sourcePath}`)
  return resolved
}

export function validateFreshBriefArtifact({
  artifact,
  body,
  config,
  rawPost,
  relativePostPath,
}) {
  if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
    throw new Error('visual brief artifact 不是 JSON object')
  }
  if (artifact.briefVersion !== config.briefVersion) {
    throw new Error(`visual brief 版本错误：${artifact.briefVersion}`)
  }
  if (artifact.promptVersion !== config.promptVersion) {
    throw new Error(`visual brief prompt 版本错误：${artifact.promptVersion}`)
  }
  if (artifact.postPath !== relativePostPath) {
    throw new Error(`visual brief 文章路径不一致：${artifact.postPath}`)
  }
  if (artifact.postSha256 !== hashText(rawPost)) {
    throw new Error('visual brief 文章哈希已过期')
  }
  if (artifact.bodySha256 !== hashText(body)) {
    throw new Error('visual brief 正文哈希已过期')
  }
  if (!artifact.visualBrief || typeof artifact.visualBrief !== 'object') {
    throw new Error('visual brief 缺少 visualBrief object')
  }
  return artifact
}
