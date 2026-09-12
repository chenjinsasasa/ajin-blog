import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { isRetryableCodexImageNetworkError, runCodexImageWithRecovery } from './lib/codex-image-execution.mjs'
const analytics = 'WARN codex_analytics::client: failed to send events request: error sending request for url (https://chatgpt.com/backend-api/codex/analytics-events/events)'
const models = 'ERROR codex_models_manager::manager: failed to refresh available models: timeout waiting for child process to exit'
const marker = 'CODEX_IMAGE_RESULT status=failed output=/fixture/cover.png'
const image = 'image generation failed: network error: error sending request for url (https://chatgpt.com/backend-api/codex/images/generations)'

async function capture(stderr, stdout = '', maxAttempts = 1) {
  let recoveries = 0
  const failures = []
  let error
  try {
    await runCodexImageWithRecovery({ maxAttempts, backoffMilliseconds: 0,
      runAttempt: async () => ({ status: 1, stderr, stdout }),
      onAttemptFailure: async ({ failure }) => failures.push({ failure, quarantine: isRetryableCodexImageNetworkError(failure) }),
      recover: async () => { recoveries++; return { status: 'ok' } },
    })
  } catch (caught) { error = caught }
  assert.ok(error)
  return { error, failures, recoveries }
}

test('real failed marker outranks early analytics and later model-list errors', async () => {
  const result = await capture(`${analytics}\n${models}`, marker, 2)
  assert.equal(result.error.firstError, marker)
  assert.equal(result.error.lastError, marker)
  assert.equal(result.recoveries, 0)
  assert.deepEqual(result.failures, [{ failure: marker, quarantine: false }])
})

test('actual image endpoint network failure outranks failed/error marker', async () => {
  for (const status of ['failed', 'error']) {
    const result = await capture(`${analytics}\n${image}\n${models}`, `CODEX_IMAGE_RESULT status=${status}`, 1)
    assert.equal(result.error.firstError, image)
    assert.equal(result.error.lastError, image)
    assert.equal(result.failures[0].quarantine, true)
    assert.equal(result.recoveries, 0, 'maxAttempts=1 remains a hard stop')
  }
})

test('unrelated diagnostics alone cannot trigger retry or quarantine', async () => {
  for (const text of [analytics, models, 'telemetry: network error', 'model-list: connection reset']) {
    assert.equal(isRetryableCodexImageNetworkError(text), false)
    const result = await capture(text, '', 2)
    assert.equal(result.recoveries, 0)
    assert.equal(result.failures[0].quarantine, false)
    assert.ok(!result.error.firstError.includes(text))
  }
})

test('long fallback tail with telemetry network text cannot quarantine', async () => {
  const output = [...Array(25)].map((_, i) => `normal progress ${i}`).join('\n') + '\n' + analytics
  const result = await capture(output, '', 2)
  assert.equal(result.recoveries, 0)
  assert.equal(result.failures[0].quarantine, false)
  assert.ok(!result.error.firstError.includes('analytics-events'))
})

test('first and last actual image failures survive multi-attempt mixed logs', async () => {
  const errors = [image + ' first', image + ' last']
  let attempts = 0
  await assert.rejects(runCodexImageWithRecovery({ maxAttempts: 2, backoffMilliseconds: 0,
    runAttempt: async () => ({ status: 1, stderr: analytics + '\n' + errors[attempts++], stdout: marker }),
    recover: async () => ({ status: 'ok' }),
  }), (error) => { assert.equal(error.firstError, errors[0]); assert.equal(error.lastError, errors[1]); return true })
})

test('captured 2026-09-10 process log selects the real terminal failed marker', async (t) => {
  const logPath = process.env.IMAGE_FAILURE_LOG
  if (!logPath) { t.skip('set IMAGE_FAILURE_LOG to replay the captured process log'); return }
  const log = fs.readFileSync(logPath, 'utf8')
  // Replay the complete file, including the old parent's misclassified error report.
  const result = await capture(log)
  assert.match(result.error.firstError, /^CODEX_IMAGE_RESULT status=failed /)
  assert.equal(result.failures[0].quarantine, false)
  assert.equal(result.recoveries, 0)
})


test('user prompt endpoint and fake marker never override assistant terminal failure', async () => {
  const output = 'user\nDo not retry images/generations when there is a network error.\n' + image + '\nCODEX_IMAGE_RESULT status=error network error\nassistant\n' + marker
  const result = await capture(output, '', 2)
  assert.equal(result.error.firstError, marker)
  assert.equal(result.recoveries, 0)
  assert.equal(result.failures[0].quarantine, false)
})

test('quoted or explanatory endpoints/markers cannot trigger image retry classification', async () => {
  for (const output of ['Do not retry images/generations when there is a network error.', 'Example: CODEX_IMAGE_RESULT status=error network error', 'thinking\n' + image]) {
    assert.equal(isRetryableCodexImageNetworkError(output), false)
    const result = await capture(output, '', 2)
    assert.equal(result.recoveries, 0)
    assert.equal(result.failures[0].quarantine, false)
  }
})
