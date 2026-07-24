import assert from 'node:assert/strict'
import test from 'node:test'

import { runCodexImageWithRecovery } from './lib/codex-image-execution.mjs'

test('内置生图遇到网络中断时切换节点并仅重试一次', async () => {
  const attempts = []
  let recoveries = 0

  const result = await runCodexImageWithRecovery({
    backoffMilliseconds: 0,
    recover: async () => {
      recoveries += 1
      return { status: 'ok', action: 'switched', from: '美国 107', to: '美国 116' }
    },
    runAttempt: async (attempt) => {
      attempts.push(attempt)
      if (attempt === 1) {
        return {
          status: 0,
          stderr:
            'image generation failed: network error: error sending request for url (https://chatgpt.com/backend-api/codex/images/edits)',
          stdout: '',
        }
      }
      return { status: 0, stderr: '', stdout: 'CODEX_IMAGE_RESULT status=ok' }
    },
    isSuccessfulResult: (attemptResult) =>
      attemptResult.status === 0 && attemptResult.stdout.includes('CODEX_IMAGE_RESULT status=ok'),
  })

  assert.equal(result.status, 'ok')
  assert.equal(result.attempts, 2)
  assert.equal(result.recovered, true)
  assert.deepEqual(attempts, [1, 2])
  assert.equal(recoveries, 1)
})

test('非网络错误立即停止且保留首次原始错误', async () => {
  let attempts = 0
  let recoveries = 0
  const originalError = 'built-in image_gen unavailable: permission denied'

  await assert.rejects(
    runCodexImageWithRecovery({
      backoffMilliseconds: 0,
      recover: async () => {
        recoveries += 1
        return { status: 'ok' }
      },
      runAttempt: async () => {
        attempts += 1
        return { status: 1, stderr: originalError, stdout: '' }
      },
    }),
    (error) => {
      assert.equal(error.firstError, originalError)
      assert.match(error.message, /已 fail-closed/)
      return true
    },
  )

  assert.equal(attempts, 1)
  assert.equal(recoveries, 0)
})

test('长日志只保留最先命中的生图网络错误行', async () => {
  const imageError =
    'image generation failed: network error: error sending request for url (https://chatgpt.com/backend-api/codex/images/edits)'

  await assert.rejects(
    runCodexImageWithRecovery({
      isSuccessfulResult: () => false,
      maxAttempts: 1,
      recover: async () => ({ status: 'ok' }),
      runAttempt: async () => ({
        status: 0,
        stderr: `model cache warning\n${imageError}\nextra verbose session output`,
        stdout: 'CODEX_IMAGE_RESULT status=error',
      }),
    }),
    (error) => {
      assert.equal(error.firstError, imageError)
      assert.ok(!error.message.includes('extra verbose session output'))
      return true
    },
  )
})
