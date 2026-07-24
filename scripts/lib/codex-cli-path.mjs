import fs from 'node:fs'

export const BUNDLED_CODEX_PATH = '/Applications/ChatGPT.app/Contents/Resources/codex'

export function resolveCodexCliPath({ env = process.env, exists = fs.existsSync } = {}) {
  const configured = typeof env.CODEX_CLI_PATH === 'string' ? env.CODEX_CLI_PATH.trim() : ''
  if (configured) {
    if (!exists(configured)) throw new Error(`CODEX_CLI_PATH 不存在：${configured}`)
    return configured
  }
  if (exists(BUNDLED_CODEX_PATH)) return BUNDLED_CODEX_PATH
  return 'codex'
}
