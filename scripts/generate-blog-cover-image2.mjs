#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import matter from 'gray-matter'
import sharp from 'sharp'
import { runImageProcess, successfulImageResult } from './lib/blog-image-process.mjs'
import { validateBriefArtifact, textHash } from './lib/blog-brief-contract.mjs'
import { createImageWorkspace, assertLocalFile, assertSafeDestination, imageEnvironment } from './lib/blog-image-isolation.mjs'

import {
  buildCodexImageArgs,
  buildCodexImagePrompt,
} from './lib/blog-cover-image-prompt.mjs'
import { resolveCodexCliPath } from './lib/codex-cli-path.mjs'
import {
  isRetryableCodexImageNetworkError,
  runCodexImageWithRecovery,
} from './lib/codex-image-execution.mjs'
import {
  ensureCodexImageRoute,
  readCodexImageRouteFailures,
  recordCodexImageRouteFailure,
  recoverCodexImageRoute,
} from './lib/codex-image-route.mjs'

let generationReceipt = null
const projectRoot = process.cwd()
const configPath = path.join(projectRoot, 'config', 'blog-cover-image2.json')
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

function printHelp() {
  console.log(`Generate one blog cover with Codex built-in Image 2 and the locked homepage style contract.

Usage:
  npm run cover:image2:generate -- --post content/progress/YYYY-MM-DD-progress.mdx

Options:
  --post <path>      Complete post whose visual brief defines the scene (required)
  --out <path>       Override the coverImage output path
  --dry-run          Validate an existing current brief and print the prompt; no model calls
  --force            Replace an existing output file
  --skip-optimize    Keep the normalized 2048x1152 PNG
  -h, --help         Show this help
`)
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    force: false,
    post: '',
    out: '',
    skipOptimize: false,
  }
  const args = [...argv]

  while (args.length > 0) {
    const arg = args.shift()
    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--force') options.force = true
    else if (arg === '--skip-optimize') options.skipOptimize = true
    else if (arg === '--post' || arg === '--out') {
      const value = args.shift()
      if (!value) throw new Error(`${arg} 缺少参数`)
      options[arg.slice(2)] = value
    } else {
      throw new Error(`未知参数：${arg}`)
    }
  }

  if (!options.post) throw new Error('必须提供 --post <文章路径>')
  return options
}

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

function verifyReferences() {
  for (const reference of config.references) {
    const absolutePath = path.join(projectRoot, reference.path)
    if (!fs.existsSync(absolutePath)) throw new Error(`标准参考图不存在：${reference.path}`)
    const actualHash = hashFile(absolutePath)
    if (actualHash !== reference.sha256) {
      throw new Error(`标准参考图已漂移：${reference.path}\nexpected=${reference.sha256}\nactual=${actualHash}`)
    }
  }
}

function resolveInsideProject(relativePath, allowedRoot) {
  const absolutePath = path.resolve(projectRoot, relativePath)
  const absoluteRoot = path.resolve(projectRoot, allowedRoot)
  if (absolutePath !== absoluteRoot && !absolutePath.startsWith(`${absoluteRoot}${path.sep}`)) {
    throw new Error(`路径必须位于 ${allowedRoot}/：${relativePath}`)
  }
  return absolutePath
}

function briefRelativePath(postPath) {
  const slug = path.basename(postPath, path.extname(postPath))
  return path.join('content', 'cover-briefs', `${slug}.json`)
}

function readVisualBrief(briefPath, postPath) {
  if (!fs.existsSync(briefPath)) throw new Error(`visual brief 不存在：${briefPath}`)
  const artifact = JSON.parse(fs.readFileSync(briefPath, 'utf8'))
  const rawPost = fs.readFileSync(postPath, 'utf8')
  validateBriefArtifact(artifact, { config, postPath: path.relative(projectRoot, postPath),
    rawPost, body: matter(rawPost).content.trim(), current: true })
  return artifact
}

function validatePostIdentity(data) {
  const title = typeof data.title === 'string' ? data.title.trim() : ''
  const excerpt = typeof data.excerpt === 'string' ? data.excerpt.trim() : ''
  if (!title) throw new Error('文章 frontmatter 缺少 title')
  if (!excerpt) throw new Error('文章 frontmatter 缺少 excerpt')
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    ...options,
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} 执行失败（exit=${result.status}）`)
}

function imageRouteOptions(excludedCandidates = []) {
  const routeGuard = config.routeGuard || {}
  return {
    attempts: routeGuard.attempts,
    candidateLimit: routeGuard.candidateLimit,
    clashSocket: routeGuard.clashSocket,
    curlPath: routeGuard.curlPath,
    excludedCandidates,
    probeUrl: routeGuard.probeUrl,
    proxyUrl: routeGuard.proxyUrl,
    requiredPasses: routeGuard.requiredPasses,
    settleMilliseconds: routeGuard.settleMilliseconds,
    timeoutSeconds: routeGuard.timeoutSeconds,
  }
}

async function normalizeOutput(outputPath) {
  const tempPath = `${outputPath}.normalized.png`
  await sharp(outputPath)
    .rotate()
    .resize({
      width: 2048,
      height: 1152,
      fit: 'cover',
      position: 'attention',
    })
    .png({ compressionLevel: 9 })
    .toFile(tempPath)
  fs.renameSync(tempPath, outputPath)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  verifyReferences()

  const postPath = resolveInsideProject(options.post, 'content')
  const post = matter(fs.readFileSync(postPath, 'utf8'))
  validatePostIdentity(post.data)
  const relativePostPath = path.relative(projectRoot, postPath)
  const configuredCover =
    typeof post.data.coverImage === 'string' ? post.data.coverImage.replace(/^\//, '') : ''
  const requestedOutput = options.out || (configuredCover ? path.join('public', configuredCover) : '')
  if (!requestedOutput) throw new Error('文章必须先填写 coverImage，或通过 --out 指定输出路径')

  const outputPath = resolveInsideProject(requestedOutput, path.join('public', 'covers'))
  if (path.extname(outputPath).toLowerCase() !== '.png') {
    throw new Error('Codex Image 2 封面统一使用 .png 输出')
  }
  if (!options.dryRun && fs.existsSync(outputPath) && !options.force) {
    throw new Error(`输出文件已存在：${path.relative(projectRoot, outputPath)}；如需替换请加 --force`)
  }
  const previousHash = fs.existsSync(outputPath) ? hashFile(outputPath) : ''

  assertSafeDestination(outputPath, path.join(projectRoot, 'public/covers'))
  const relativeBriefPath = briefRelativePath(postPath)
  const briefArtifact = readVisualBrief(path.join(projectRoot, relativeBriefPath), postPath)
  let prompt = buildCodexImagePrompt({ briefArtifact, config, outputPath })
  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          status: 'ok',
          action: 'dry-run',
          post: relativePostPath,
          brief: relativeBriefPath,
          postSha256: briefArtifact.postSha256,
          inputImages: [],
          referenceMode: config.referenceMode,
          visualBrief: briefArtifact.visualBrief,
          imagePrompt: prompt,
          output: path.relative(projectRoot, outputPath),
        },
        null,
        2,
      ),
    )
    return
  }
  const imageWork = createImageWorkspace()
  const candidatePath = imageWork.candidate
  prompt = buildCodexImagePrompt({ briefArtifact, config, outputPath: candidatePath })
  const finalMessagePath = path.join(imageWork.directory, 'final-message.txt')
  const codexArgs = buildCodexImageArgs(imageWork.directory)
  codexArgs.splice(-1, 0, '--output-last-message', finalMessagePath)
  const receiptPath = path.join(imageWork.directory, 'receipt.json')
  const receipt = { runId: imageWork.runId, startedAt: new Date().toISOString(),
    provider: config.provider, model: config.model, post: relativePostPath,
    postSha256: briefArtifact.postSha256, briefSha256: hashFile(path.join(projectRoot, relativeBriefPath)),
    promptSha256: textHash(prompt), output: requestedOutput, status: 'pending' }
  generationReceipt = { receiptPath, receipt }
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2))
  console.error(`[cover:image2] receipt ${receiptPath}`)
  const codexCliPath = resolveCodexCliPath()
  console.error(`[cover:image2] codex-cli ${JSON.stringify({ path: codexCliPath })}`)

  const failureStatePath = path.resolve(
    projectRoot,
    config.routeGuard?.failureStatePath || '.codex-image-route-failures.json',
  )
  const failureCooldownMilliseconds =
    config.routeGuard?.failureCooldownMilliseconds || 6 * 60 * 60 * 1000
  const quarantinedRoutes = () =>
    readCodexImageRouteFailures({
      cooldownMilliseconds: failureCooldownMilliseconds,
      failureStatePath,
    })
  const routeOptions = imageRouteOptions(quarantinedRoutes())
  const route = await ensureCodexImageRoute(routeOptions)
  console.error(`[cover:image2] route-preflight ${JSON.stringify(route)}`)
  if (route.status !== 'ok') {
    throw new Error(`Codex Image 2 路由预检失败：${JSON.stringify(route)}`)
  }
  let activeRouteName = route.to || route.current || ''

  const codexEnvironment = imageEnvironment()
  const execution = await runCodexImageWithRecovery({
    backoffMilliseconds: config.routeGuard?.retryBackoffMilliseconds,
    isSuccessfulResult: (attemptResult) => successfulImageResult(attemptResult, finalMessagePath, candidatePath),
    maxAttempts: config.routeGuard?.maxGenerationAttempts,
    recover: async () => {
      const recovery = await recoverCodexImageRoute(
        imageRouteOptions(quarantinedRoutes()),
      )
      if (recovery.status === 'ok') activeRouteName = recovery.to || activeRouteName
      console.error(`[cover:image2] route-recovery ${JSON.stringify(recovery)}`)
      return recovery
    },
    onAttemptFailure: async ({ failure }) => {
      if (!activeRouteName || !isRetryableCodexImageNetworkError(failure)) return
      recordCodexImageRouteFailure({
        failure,
        failureStatePath,
        name: activeRouteName,
      })
      console.error(
        `[cover:image2] route-quarantine ${JSON.stringify({
          cooldownMilliseconds: failureCooldownMilliseconds,
          name: activeRouteName,
        })}`,
      )
    },
    runAttempt: async (attempt) => {
      console.error(
        `[cover:image2] builtin-imagegen attempt=${attempt}/${config.routeGuard?.maxGenerationAttempts || 2}`,
      )
      // A failed attempt must never donate an old output or final marker to a retry.
      for (const file of [candidatePath, finalMessagePath]) {
        if (fs.existsSync(file) || fs.lstatSync(file, { throwIfNoEntry: false })) fs.unlinkSync(file)
      }
      return runImageProcess(codexCliPath, codexArgs, {
        env: codexEnvironment,
        cwd: imageWork.directory,
        input: prompt,
      })
    },
  })
  console.error(
    `[cover:image2] builtin-imagegen ${JSON.stringify({
      attempts: execution.attempts,
      recovered: execution.recovered,
      status: execution.status,
    })}`,
  )

  if (execution.status !== 'ok') {
    fs.writeFileSync(receiptPath, JSON.stringify({ ...receipt, status: 'failed', execution }, null, 2))
    throw new Error(`Codex Image 2 失败；证据 ${receiptPath}`)
  }
  assertLocalFile(candidatePath, imageWork.directory)
  const metadata = await sharp(candidatePath).metadata()
  if (metadata.format !== 'png') throw new Error('生图输出不是 PNG')
  if (previousHash && hashFile(candidatePath) === previousHash) throw new Error('生图返回旧图片')
  await normalizeOutput(candidatePath)
  // The project owns installation; Codex has no write permission to the repository.
  assertSafeDestination(outputPath, path.join(projectRoot, 'public/covers'))
  const oldOutput = fs.existsSync(outputPath) ? fs.readFileSync(outputPath) : null
  const manifestPath = path.join(projectRoot, 'scripts/cover-optimization-manifest.json')
  const oldManifest = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath) : null
  const installPath = `${outputPath}.${imageWork.runId}.tmp`
  try {
    fs.copyFileSync(candidatePath, installPath, fs.constants.COPYFILE_EXCL)
    fs.renameSync(installPath, outputPath)
    if (!options.skipOptimize) {
      runCommand(process.execPath, [path.join(projectRoot, 'scripts', 'optimize-covers.mjs'), outputPath])
    }
    if (previousHash && hashFile(outputPath) === previousHash) throw new Error('优化后图片与旧图片相同')
  } catch (error) {
    if (oldOutput) fs.writeFileSync(outputPath, oldOutput)
    else if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
    if (oldManifest) fs.writeFileSync(manifestPath, oldManifest)
    else if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath)
    if (fs.existsSync(installPath)) fs.unlinkSync(installPath)
    throw error
  }
  fs.writeFileSync(receiptPath, JSON.stringify({ ...receipt, status: 'ok',
    endedAt: new Date().toISOString(), outputSha256: hashFile(outputPath),
    attempts: execution.attempts }, null, 2))

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        receiptPath,
        provider: config.provider,
        model: config.model,
        executionMode: config.executionMode,
        authMode: config.authMode,
        promptVersion: config.promptVersion,
        briefVersion: config.briefVersion,
        brief: relativeBriefPath,
        postSha256: briefArtifact.postSha256,
        referenceSet: config.referenceSet,
        inputImages: [],
        referenceMode: config.referenceMode,
        referenceStandards: config.references.map((reference) => reference.path),
        output: path.relative(projectRoot, outputPath),
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  if (generationReceipt) {
    const { receiptPath, receipt } = generationReceipt
    fs.writeFileSync(receiptPath, JSON.stringify({ ...receipt, status: 'failed',
      endedAt: new Date().toISOString(), error: String(error.message || error).slice(0, 4000) }, null, 2))
  }
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
