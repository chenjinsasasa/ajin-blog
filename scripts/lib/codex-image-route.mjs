import { execFile } from 'node:child_process'
import fs from 'node:fs'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

async function runCurl(curlPath, args) {
  try {
    const result = await execFileAsync(curlPath, args, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    })
    return { ok: true, stderr: result.stderr, stdout: result.stdout }
  } catch (error) {
    return {
      ok: false,
      stderr: typeof error.stderr === 'string' ? error.stderr : '',
      stdout: typeof error.stdout === 'string' ? error.stdout : '',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function probeOnce({ curlPath, probeUrl, proxyUrl, timeoutSeconds }) {
  const args = [
    '--silent',
    '--show-error',
    '--head',
    '--connect-timeout',
    String(timeoutSeconds),
    '--max-time',
    String(timeoutSeconds),
    '--output',
    '/dev/null',
  ]
  if (proxyUrl) args.push('--proxy', proxyUrl)
  args.push(probeUrl)
  const result = await runCurl(curlPath, args)
  return {
    ok: result.ok,
    error: result.error || result.stderr.trim(),
  }
}

async function probeRoute(options) {
  let passes = 0
  let firstError = ''
  for (let attempt = 0; attempt < options.attempts; attempt += 1) {
    const probe = await probeOnce(options)
    if (probe.ok) passes += 1
    else if (!firstError) firstError = probe.error
  }
  return { attempts: options.attempts, firstError, passes }
}

async function clashRequest({
  clashSocket,
  curlPath,
  data,
  method = 'GET',
  path,
  timeoutSeconds,
}) {
  const args = [
    '--fail',
    '--silent',
    '--show-error',
    '--unix-socket',
    clashSocket,
    '--max-time',
    String(timeoutSeconds),
  ]
  if (method !== 'GET') args.push('--request', method)
  if (data !== undefined) {
    args.push('--header', 'Content-Type: application/json', '--data', JSON.stringify(data))
  }
  args.push(`http://localhost${path}`)
  return runCurl(curlPath, args)
}

function chooseGroup(proxies) {
  const preferred = ['OpenAI Auto', 'US Fixed', 'Mikasa 加速器', '🚀 节点选择', 'GLOBAL']
  for (const name of preferred) {
    if (proxies[name]) return [name, proxies[name]]
  }
  return (
    Object.entries(proxies).find(
      ([name, value]) =>
        ['Selector', 'URLTest', 'Fallback'].includes(value?.type) &&
        /OpenAI|ChatGPT|Mikasa|节点|选择|GLOBAL/i.test(name),
    ) || []
  )
}

async function wait(milliseconds) {
  if (milliseconds <= 0) return
  await new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export async function recoverCodexImageRoute({
  attempts = 3,
  candidateLimit = 6,
  clashSocket = '/tmp/verge/verge-mihomo.sock',
  curlPath = '/usr/bin/curl',
  probeUrl = 'https://chatgpt.com/',
  proxyUrl = 'http://127.0.0.1:7897',
  requiredPasses = 3,
  settleMilliseconds = 1000,
  timeoutSeconds = 8,
} = {}) {
  if (!fs.existsSync(clashSocket)) {
    return { status: 'failed', action: 'recovery-unavailable', reason: 'clash_socket_missing' }
  }

  const proxyResult = await clashRequest({
    clashSocket,
    curlPath,
    path: '/proxies',
    timeoutSeconds,
  })
  if (!proxyResult.ok) {
    return {
      status: 'failed',
      action: 'recovery-failed',
      reason: 'clash_proxies_unavailable',
      error: proxyResult.error || proxyResult.stderr.trim(),
    }
  }

  let proxies
  try {
    proxies = JSON.parse(proxyResult.stdout).proxies || {}
  } catch (error) {
    return {
      status: 'failed',
      action: 'recovery-failed',
      reason: 'clash_proxies_invalid_json',
      error: error instanceof Error ? error.message : String(error),
    }
  }

  const [groupName, group] = chooseGroup(proxies)
  if (!groupName || !group) {
    return { status: 'failed', action: 'recovery-failed', reason: 'clash_group_missing' }
  }

  const current = typeof group.now === 'string' ? group.now : ''
  const allCandidates = Array.isArray(group.all) ? group.all : []
  const currentIndex = allCandidates.indexOf(current)
  const rotatedCandidates =
    currentIndex >= 0
      ? [...allCandidates.slice(currentIndex + 1), ...allCandidates.slice(0, currentIndex)]
      : allCandidates
  const candidates = rotatedCandidates
    .filter(
      (name) =>
        typeof name === 'string' &&
        name !== current &&
        /ChatGPT专用|ChatGPT|OpenAI/i.test(name),
    )
    .slice(0, candidateLimit)
  if (candidates.length === 0) {
    return { status: 'failed', action: 'recovery-failed', reason: 'candidate_missing' }
  }

  const delayUrl = encodeURIComponent(probeUrl)
  const measured = await Promise.all(
    candidates.map(async (name) => {
      const result = await clashRequest({
        clashSocket,
        curlPath,
        path: `/proxies/${encodeURIComponent(name)}/delay?timeout=${timeoutSeconds * 1000}&url=${delayUrl}`,
        timeoutSeconds: timeoutSeconds + 1,
      })
      if (!result.ok) return null
      try {
        const delay = Number(JSON.parse(result.stdout).delay)
        return Number.isFinite(delay) && delay > 0 ? { delay, name } : null
      } catch {
        return null
      }
    }),
  )
  const healthyCandidates = measured
    .filter(Boolean)
    .sort((left, right) => left.delay - right.delay)
  if (healthyCandidates.length === 0) {
    return { status: 'failed', action: 'recovery-failed', reason: 'candidate_unhealthy' }
  }

  const candidatesTried = []
  let lastFailure = null
  for (const candidate of healthyCandidates) {
    const switchResult = await clashRequest({
      clashSocket,
      curlPath,
      data: { name: candidate.name },
      method: 'PUT',
      path: `/proxies/${encodeURIComponent(groupName)}`,
      timeoutSeconds,
    })
    if (!switchResult.ok) {
      lastFailure = {
        error: switchResult.error || switchResult.stderr.trim(),
        name: candidate.name,
        reason: 'candidate_switch_failed',
      }
      candidatesTried.push(lastFailure)
      continue
    }

    await clashRequest({
      clashSocket,
      curlPath,
      method: 'DELETE',
      path: '/connections',
      timeoutSeconds,
    })
    await wait(settleMilliseconds)

    const verification = await probeRoute({
      attempts,
      curlPath,
      probeUrl,
      proxyUrl,
      timeoutSeconds,
    })
    candidatesTried.push({ delay: candidate.delay, name: candidate.name, ...verification })
    if (verification.passes >= requiredPasses) {
      return {
        status: 'ok',
        action: 'switched',
        delay: candidate.delay,
        from: current,
        group: groupName,
        to: candidate.name,
        candidatesTried,
        ...verification,
      }
    }
    lastFailure = { name: candidate.name, ...verification }
  }

  return {
    status: 'failed',
    action: 'candidates-exhausted',
    from: current,
    to: lastFailure?.name || '',
    candidatesTried,
    ...(lastFailure || {}),
  }
}

export async function ensureCodexImageRoute({
  attempts = 3,
  candidateLimit = 6,
  clashSocket = '/tmp/verge/verge-mihomo.sock',
  curlPath = '/usr/bin/curl',
  probeUrl = 'https://chatgpt.com/',
  proxyUrl = 'http://127.0.0.1:7897',
  requiredPasses = 3,
  settleMilliseconds = 1000,
  timeoutSeconds = 8,
} = {}) {
  const probe = await probeRoute({ attempts, curlPath, probeUrl, proxyUrl, timeoutSeconds })

  if (probe.passes >= requiredPasses) {
    return {
      status: 'ok',
      action: 'none',
      ...probe,
    }
  }

  const recovery = await recoverCodexImageRoute({
    attempts,
    candidateLimit,
    clashSocket,
    curlPath,
    probeUrl,
    proxyUrl,
    requiredPasses,
    settleMilliseconds,
    timeoutSeconds,
  })
  return recovery.status === 'ok' ? recovery : { ...recovery, initialProbe: probe }
}
