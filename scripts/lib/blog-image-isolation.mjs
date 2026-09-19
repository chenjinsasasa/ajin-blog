import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'

export function imagePermissionArgs() {
  return [
    '-c', 'default_permissions="blog-image"',
    '-c', 'permissions.blog-image.filesystem={":root"="read",":minimal"="read",":workspace_roots"={"."="write"}}',
    '-c', 'permissions.blog-image.network.enabled=false',
    '-c', 'features.multi_agent=false',
  ]
}
export function createImageWorkspace() {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ajin-blog-image-')))
  return { directory, candidate: path.join(directory, 'candidate.png'), runId: crypto.randomUUID() }
}
export function assertLocalFile(file, root) {
  if (!fs.existsSync(file) || !fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink() ||
      !fs.realpathSync(file).startsWith(`${fs.realpathSync(root)}${path.sep}`)) {
    throw new Error('图片输出不存在、不是普通文件或越过工作目录')
  }
}
export function assertSafeDestination(file, root) {
  const realRoot = fs.realpathSync(root)
  if (!fs.realpathSync(path.dirname(file)).startsWith(`${realRoot}${path.sep}`) &&
      fs.realpathSync(path.dirname(file)) !== realRoot) throw new Error('图片目标父目录越界')
  const entry = fs.lstatSync(file, { throwIfNoEntry: false })
  if (entry && (entry.isSymbolicLink() || !entry.isFile())) {
    throw new Error('图片目标必须为普通文件，禁止软链接')
  }
}
export function imageEnvironment(env = process.env) {
  const allowed = new Set(['PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'LC_ALL',
    'TMPDIR', 'CODEX_HOME', 'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY',
    'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy'])
  return Object.fromEntries(Object.entries(env).filter(([key]) => allowed.has(key)))
}
