import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'

// When copied into repo/scripts, no environment override is needed.
const repo = process.env.BLOG_TEST_REPO || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { ensureCodexImageRoute, recoverCodexImageRoute } = await import(pathToFileURL(path.join(repo, 'scripts/lib/codex-image-route.mjs')).href)
const current = 'OpenAI current'
const alternate = 'OpenAI alternate'

function fixture(t, { probeHealthy = false } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ajin-route-no-switch-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const log = path.join(directory, 'requests.jsonl')
  const selected = path.join(directory, 'selected.json')
  const socket = path.join(directory, 'fake-clash.sock')
  const curl = path.join(directory, 'fake-curl')
  fs.writeFileSync(socket, 'fixture marker; not a socket')
  fs.writeFileSync(curl, `#!${process.execPath}
const fs = require('node:fs')
const args = process.argv.slice(2)
const log = ${JSON.stringify(log)}
const selected = ${JSON.stringify(selected)}
const url = args.at(-1)
const method = args.includes('--head') ? 'HEAD' : args.includes('--request') ? args[args.indexOf('--request') + 1] : 'GET'
fs.appendFileSync(log, JSON.stringify({ method, url, args }) + '\\n')
if (method === 'HEAD') process.exit(${probeHealthy} || fs.existsSync(selected) ? 0 : 7)
if (method === 'GET' && url.endsWith('/proxies')) {
  process.stdout.write(JSON.stringify({ proxies: { 'OpenAI Auto': { type: 'Selector', now: ${JSON.stringify(current)}, all: [${JSON.stringify(current)}, ${JSON.stringify(alternate)}] } } }))
} else if (method === 'GET' && url.includes('/delay?')) {
  process.stdout.write(JSON.stringify({ delay: 2 }))
} else if (method === 'PUT') {
  fs.writeFileSync(selected, args[args.indexOf('--data') + 1])
} else if (method !== 'DELETE') {
  process.stderr.write('unexpected fixture request')
  process.exitCode = 99
}
`, { mode: 0o755 })
  return {
    options: { attempts: 1, requiredPasses: 1, candidateLimit: 0, clashSocket: socket, curlPath: curl,
      probeUrl: 'https://fixture.invalid/health', proxyUrl: '', settleMilliseconds: 0, timeoutSeconds: 1 },
    requests: () => fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse),
  }
}

function assertNoMutation(requests) {
  assert.ok(requests.length > 0, 'must actually invoke the real route module through fake curl')
  assert.ok(requests.every(({ method }) => method === 'GET' || method === 'HEAD'), JSON.stringify(requests))
  assert.equal(requests.filter(({ method }) => method === 'PUT' || method === 'DELETE').length, 0)
}

test('candidateLimit=0: failed probe cannot switch or delete connections', async (t) => {
  const f = fixture(t)
  const result = await ensureCodexImageRoute(f.options)
  assert.equal(result.status, 'failed')
  assert.equal(result.reason, 'candidate_missing')
  assertNoMutation(f.requests())
  assert.ok(f.requests().some(({ method }) => method === 'HEAD'))
})

test('candidateLimit=0: healthy but quarantined current route cannot switch or delete', async (t) => {
  const f = fixture(t, { probeHealthy: true })
  const result = await ensureCodexImageRoute({ ...f.options, excludedCandidates: [current] })
  assert.equal(result.status, 'failed')
  assert.equal(result.reason, 'candidate_missing')
  assertNoMutation(f.requests())
})

test('candidateLimit=0: healthy unquarantined current route retains action none', async (t) => {
  const f = fixture(t, { probeHealthy: true })
  const result = await ensureCodexImageRoute(f.options)
  assert.equal(result.status, 'ok')
  assert.equal(result.action, 'none')
  assert.equal(result.current, current)
  assertNoMutation(f.requests())
})

test('candidateLimit=0: direct recovery hook also cannot mutate route', async (t) => {
  const f = fixture(t)
  const result = await recoverCodexImageRoute(f.options)
  assert.equal(result.reason, 'candidate_missing')
  assertNoMutation(f.requests())
})

for (const quarantined of [false, true]) {
  test(`positive control candidateLimit=1 exposes original PUT+DELETE (${quarantined ? 'quarantined' : 'probe failure'})`, async (t) => {
    const f = fixture(t, { probeHealthy: quarantined })
    const result = await ensureCodexImageRoute({ ...f.options, candidateLimit: 1, excludedCandidates: quarantined ? [current] : [] })
    assert.equal(result.status, 'ok')
    assert.equal(result.action, 'switched')
    const mutations = f.requests().filter(({ method }) => method === 'PUT' || method === 'DELETE')
    assert.deepEqual(mutations.map(({ method }) => method), ['PUT', 'DELETE'])
    assert.equal(mutations[0].url, 'http://localhost/proxies/OpenAI%20Auto')
    assert.equal(mutations[1].url, 'http://localhost/connections')
    assert.throws(() => assertNoMutation(f.requests()), 'the negative assertion must catch the original behavior')
  })
}

test('generator imageRouteOptions preserves literal zero and config changes only candidateLimit', () => {
  const configPath = path.join(repo, 'config/blog-cover-image2.json')
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  const baseline = JSON.parse(execFileSync('git', ['-C', repo, 'show', `${process.env.IMAGE_ROUTE_BASE_REF || 'HEAD'}:config/blog-cover-image2.json`], { encoding: 'utf8' }))
  const expected = structuredClone(baseline)
  expected.routeGuard.candidateLimit = 0
  assert.deepEqual(config, expected)
  assert.equal(config.routeGuard.maxGenerationAttempts, 1)
  assert.equal(config.routeGuard.candidateLimit, 0)
  const source = fs.readFileSync(path.join(repo, 'scripts/generate-blog-cover-image2.mjs'), 'utf8')
  const helper = source.match(/function imageRouteOptions\(excludedCandidates = \[\]\) \{[\s\S]*?\n\}/)?.[0]
  assert.ok(helper, 'generator must expose the existing option-building function in source')
  // Evaluate this exact small helper only; importing the generator would start production work.
  const options = vm.runInNewContext(`${helper}; imageRouteOptions(['fixture-quarantine'])`, { config })
  assert.equal(options.candidateLimit, 0)
  assert.equal(options.attempts, config.routeGuard.attempts)
  assert.deepEqual(Array.from(options.excludedCandidates), ['fixture-quarantine'])
  assert.match(source, /ensureCodexImageRoute\(routeOptions\)/)
  assert.match(source, /recoverCodexImageRoute\(\s*imageRouteOptions\(quarantinedRoutes\(\)\)/)
})
