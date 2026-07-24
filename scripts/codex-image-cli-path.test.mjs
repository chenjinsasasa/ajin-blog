import assert from 'node:assert/strict'
import test from 'node:test'

import { BUNDLED_CODEX_PATH, resolveCodexCliPath } from './lib/codex-cli-path.mjs'

test('显式 CODEX_CLI_PATH 存在时优先使用', () => {
  const result = resolveCodexCliPath({
    env: { CODEX_CLI_PATH: '/opt/codex-current' },
    exists: (candidate) => candidate === '/opt/codex-current',
  })

  assert.equal(result, '/opt/codex-current')
})

test('默认优先使用 Codex 桌面应用捆绑的当前版本', () => {
  const result = resolveCodexCliPath({
    env: {},
    exists: (candidate) => candidate === BUNDLED_CODEX_PATH,
  })

  assert.equal(result, BUNDLED_CODEX_PATH)
})

test('桌面捆绑版本不存在时才回退 PATH 中的 codex', () => {
  const result = resolveCodexCliPath({ env: {}, exists: () => false })

  assert.equal(result, 'codex')
})

test('显式 CODEX_CLI_PATH 不存在时拒绝静默回退', () => {
  assert.throws(
    () =>
      resolveCodexCliPath({
        env: { CODEX_CLI_PATH: '/opt/missing-codex' },
        exists: () => false,
      }),
    /CODEX_CLI_PATH 不存在/,
  )
})
