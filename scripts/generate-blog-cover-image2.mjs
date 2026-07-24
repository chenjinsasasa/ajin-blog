#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import matter from 'gray-matter'
import sharp from 'sharp'

import {
  buildCodexImageArgs,
  buildCodexImagePrompt,
} from './lib/blog-cover-image-prompt.mjs'
import { runCodexImageWithRecovery } from './lib/codex-image-execution.mjs'
import {
  ensureCodexImageRoute,
  recoverCodexImageRoute,
} from './lib/codex-image-route.mjs'

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
  --dry-run          Build/reuse the brief and print the exact image prompt only
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
  if (artifact.briefVersion !== config.briefVersion) {
    throw new Error(`visual brief 版本错误：${artifact.briefVersion}`)
  }
  if (artifact.postPath !== path.relative(projectRoot, postPath)) {
    throw new Error(`visual brief 文章路径不一致：${artifact.postPath}`)
  }
  if (!artifact.visualBrief || typeof artifact.visualBrief !== 'object') {
    throw new Error('visual brief 缺少 visualBrief object')
  }
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

function runStreamingCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: options.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let settled = false
    let stderr = ''
    let stdout = ''

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      stdout += text
      process.stdout.write(text)
    })
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      stderr += text
      process.stderr.write(text)
    })
    child.once('error', (error) => {
      if (settled) return
      settled = true
      resolve({ status: 1, stderr: `${stderr}${error.message}`, stdout })
    })
    child.once('close', (status, signal) => {
      if (settled) return
      settled = true
      resolve({
        status: status ?? 1,
        stderr: signal ? `${stderr}\nCodex 进程被信号终止：${signal}` : stderr,
        stdout,
      })
    })
    child.stdin.end(options.input || '')
  })
}

function imageRouteOptions() {
  const routeGuard = config.routeGuard || {}
  return {
    attempts: routeGuard.attempts,
    candidateLimit: routeGuard.candidateLimit,
    clashSocket: routeGuard.clashSocket,
    curlPath: routeGuard.curlPath,
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

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  runCommand(process.execPath, [
    path.join(projectRoot, 'scripts', 'build-blog-cover-brief.mjs'),
    '--post',
    relativePostPath,
  ])
  const relativeBriefPath = briefRelativePath(postPath)
  const briefArtifact = readVisualBrief(path.join(projectRoot, relativeBriefPath), postPath)
  const prompt = buildCodexImagePrompt({ briefArtifact, config, outputPath })
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
  const codexArgs = buildCodexImageArgs(projectRoot)

  const routeOptions = imageRouteOptions()
  const route = await ensureCodexImageRoute(routeOptions)
  console.error(`[cover:image2] route-preflight ${JSON.stringify(route)}`)
  if (route.status !== 'ok') {
    throw new Error(`Codex Image 2 路由预检失败：${JSON.stringify(route)}`)
  }

  const codexEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key !== 'OPENAI_API_KEY'),
  )
  const execution = await runCodexImageWithRecovery({
    backoffMilliseconds: config.routeGuard?.retryBackoffMilliseconds,
    isSuccessfulResult: (attemptResult) =>
      attemptResult.status === 0 &&
      attemptResult.stdout.includes(`CODEX_IMAGE_RESULT status=ok output=${outputPath}`) &&
      fs.existsSync(outputPath),
    maxAttempts: config.routeGuard?.maxGenerationAttempts,
    recover: async () => {
      const recovery = await recoverCodexImageRoute(routeOptions)
      console.error(`[cover:image2] route-recovery ${JSON.stringify(recovery)}`)
      return recovery
    },
    runAttempt: async (attempt) => {
      console.error(
        `[cover:image2] builtin-imagegen attempt=${attempt}/${config.routeGuard?.maxGenerationAttempts || 2}`,
      )
      return runStreamingCommand('codex', codexArgs, {
        env: codexEnvironment,
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

  if (!fs.existsSync(outputPath)) {
    throw new Error('Codex 返回成功但未生成目标文件；已 fail-closed')
  }
  if (previousHash && hashFile(outputPath) === previousHash) {
    throw new Error('Codex 返回成功但目标文件未变化；已 fail-closed')
  }
  await normalizeOutput(outputPath)

  if (!options.skipOptimize) {
    runCommand(process.execPath, [path.join(projectRoot, 'scripts', 'optimize-covers.mjs'), outputPath])
  }

  console.log(
    JSON.stringify(
      {
        status: 'ok',
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
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
