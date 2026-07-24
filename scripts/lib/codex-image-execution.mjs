const RETRYABLE_NETWORK_ERROR =
  /network error|error sending request|i\/o timeout|context deadline exceeded|connection reset|connection closed|timed out/i

function wait(milliseconds) {
  if (milliseconds <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function rawFailure(result) {
  const combined = [result.stderr, result.stdout]
    .filter((value) => typeof value === 'string' && value.trim())
    .join('\n')
    .trim()
  const lines = combined.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const preferredPatterns = [
    /image generation failed:.*images\/(?:edits|generations)/i,
    /network error:.*images\/(?:edits|generations)/i,
    RETRYABLE_NETWORK_ERROR,
    /CODEX_IMAGE_RESULT status=error/i,
  ]
  for (const pattern of preferredPatterns) {
    const line = lines.find((candidate) => pattern.test(candidate))
    if (line) return line.slice(0, 4000)
  }
  return lines.slice(-12).join('\n').slice(-4000)
}

function executionError(message, firstError, lastError = firstError) {
  const error = new Error(`${message}\n首次错误：\n${firstError}\n末次错误：\n${lastError}`)
  error.firstError = firstError
  error.lastError = lastError
  return error
}

export function isRetryableCodexImageNetworkError(output) {
  return RETRYABLE_NETWORK_ERROR.test(output)
}

export async function runCodexImageWithRecovery({
  backoffMilliseconds = 3000,
  isSuccessfulResult = (result) => result.status === 0,
  maxAttempts = 2,
  recover,
  runAttempt,
}) {
  let firstError = ''
  let recovered = false

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await runAttempt(attempt)
    if (isSuccessfulResult(result)) {
      return { status: 'ok', attempts: attempt, recovered, result }
    }

    const failure = rawFailure(result) || `Codex 进程退出（exit=${result.status ?? 'unknown'}）`
    if (!firstError) firstError = failure
    const canRetry = attempt < maxAttempts && isRetryableCodexImageNetworkError(failure)
    if (!canRetry) {
      throw executionError('Codex Image 2 生成失败；已 fail-closed。', firstError, failure)
    }

    const recovery = await recover({ attempt, failure })
    if (!recovery || recovery.status !== 'ok') {
      const recoveryFailure = JSON.stringify(recovery || { status: 'missing' })
      throw executionError('Codex Image 2 网络失败，且代理恢复未通过。', firstError, recoveryFailure)
    }
    recovered = true
    await wait(backoffMilliseconds)
  }

  throw executionError('Codex Image 2 生成失败；已 fail-closed。', firstError)
}
