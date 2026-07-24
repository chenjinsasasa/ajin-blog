import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  ensureCodexImageRoute,
  readCodexImageRouteFailures,
  recordCodexImageRouteFailure,
  recoverCodexImageRoute,
} from './lib/codex-image-route.mjs'

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  return `http://127.0.0.1:${address.port}/health`
}

async function close(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}

async function listenUnix(server, socketPath) {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(socketPath, resolve)
  })
}

test('健康路由连续通过时不触发代理恢复', async () => {
  let probes = 0
  const server = http.createServer((request, response) => {
    probes += 1
    response.writeHead(204)
    response.end()
  })
  const probeUrl = await listen(server)

  try {
    const result = await ensureCodexImageRoute({
      attempts: 3,
      clashSocket: '/tmp/ajin-blog-no-clash.sock',
      curlPath: '/usr/bin/curl',
      probeUrl,
      proxyUrl: '',
      requiredPasses: 3,
      timeoutSeconds: 2,
    })

    assert.equal(result.status, 'ok')
    assert.equal(result.action, 'none')
    assert.equal(result.passes, 3)
    assert.equal(probes, 3)
  } finally {
    await close(server)
  }
})

test('当前节点连续失败时切换到延迟最低的 ChatGPT 节点并复验', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ajin-blog-route-test-'))
  const socketPath = path.join(tempDir, 'mihomo.sock')
  const currentNode = '🇺🇸美国 107 ChatGPT专用 | 1x US'
  const fasterNode = '🇺🇸美国 116 ChatGPT专用 | 1x US'
  const slowerNode = '🇺🇸美国 115 ChatGPT专用 | 1x US'
  let selectedNode = currentNode
  let clearedConnections = 0

  const healthServer = http.createServer((request, response) => {
    if (selectedNode === currentNode) {
      request.socket.destroy()
      return
    }
    response.writeHead(403)
    response.end()
  })
  const probeUrl = await listen(healthServer)

  const clashServer = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost')
    if (request.method === 'GET' && url.pathname === '/proxies') {
      response.setHeader('Content-Type', 'application/json')
      response.end(
        JSON.stringify({
          proxies: {
            'Mikasa 加速器': {
              all: [currentNode, slowerNode, fasterNode],
              now: selectedNode,
              type: 'Selector',
            },
          },
        }),
      )
      return
    }
    if (request.method === 'GET' && url.pathname.endsWith('/delay')) {
      const node = decodeURIComponent(url.pathname.split('/')[2])
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify({ delay: node === fasterNode ? 240 : 840 }))
      return
    }
    if (request.method === 'PUT' && url.pathname.startsWith('/proxies/')) {
      let body = ''
      request.setEncoding('utf8')
      request.on('data', (chunk) => {
        body += chunk
      })
      request.on('end', () => {
        selectedNode = JSON.parse(body).name
        response.writeHead(204)
        response.end()
      })
      return
    }
    if (request.method === 'DELETE' && url.pathname === '/connections') {
      clearedConnections += 1
      response.writeHead(204)
      response.end()
      return
    }
    response.writeHead(404)
    response.end()
  })
  await listenUnix(clashServer, socketPath)

  try {
    const result = await ensureCodexImageRoute({
      attempts: 2,
      clashSocket: socketPath,
      curlPath: '/usr/bin/curl',
      probeUrl,
      proxyUrl: '',
      requiredPasses: 2,
      timeoutSeconds: 2,
    })

    assert.equal(result.status, 'ok')
    assert.equal(result.action, 'switched')
    assert.equal(result.from, currentNode)
    assert.equal(result.to, fasterNode)
    assert.equal(selectedNode, fasterNode)
    assert.equal(clearedConnections, 1)
  } finally {
    await close(clashServer)
    await close(healthServer)
    fs.rmSync(tempDir, { force: true, recursive: true })
  }
})

test('延迟最低候选复验失败时继续切换下一个健康节点', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ajin-blog-route-fallback-test-'))
  const socketPath = path.join(tempDir, 'mihomo.sock')
  const currentNode = '🇺🇸美国 104 ChatGPT专用 | 1x US'
  const unstableNode = '🇺🇸美国 110 ChatGPT专用 | 1x US'
  const healthyNode = '🇺🇸美国 116 ChatGPT专用 | 1x US'
  let selectedNode = currentNode
  let clearedConnections = 0

  const healthServer = http.createServer((request, response) => {
    if (selectedNode !== healthyNode) {
      request.socket.destroy()
      return
    }
    response.writeHead(204)
    response.end()
  })
  const probeUrl = await listen(healthServer)

  const clashServer = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost')
    if (request.method === 'GET' && url.pathname === '/proxies') {
      response.setHeader('Content-Type', 'application/json')
      response.end(
        JSON.stringify({
          proxies: {
            'Mikasa 加速器': {
              all: [currentNode, unstableNode, healthyNode],
              now: selectedNode,
              type: 'Selector',
            },
          },
        }),
      )
      return
    }
    if (request.method === 'GET' && url.pathname.endsWith('/delay')) {
      const node = decodeURIComponent(url.pathname.split('/')[2])
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify({ delay: node === unstableNode ? 120 : 240 }))
      return
    }
    if (request.method === 'PUT' && url.pathname.startsWith('/proxies/')) {
      let body = ''
      request.setEncoding('utf8')
      request.on('data', (chunk) => {
        body += chunk
      })
      request.on('end', () => {
        selectedNode = JSON.parse(body).name
        response.writeHead(204)
        response.end()
      })
      return
    }
    if (request.method === 'DELETE' && url.pathname === '/connections') {
      clearedConnections += 1
      response.writeHead(204)
      response.end()
      return
    }
    response.writeHead(404)
    response.end()
  })
  await listenUnix(clashServer, socketPath)

  try {
    const result = await ensureCodexImageRoute({
      attempts: 2,
      clashSocket: socketPath,
      curlPath: '/usr/bin/curl',
      probeUrl,
      proxyUrl: '',
      requiredPasses: 2,
      settleMilliseconds: 0,
      timeoutSeconds: 2,
    })

    assert.equal(result.status, 'ok')
    assert.equal(result.action, 'switched')
    assert.equal(result.from, currentNode)
    assert.equal(result.to, healthyNode)
    assert.equal(selectedNode, healthyNode)
    assert.equal(clearedConnections, 2)
  } finally {
    await close(clashServer)
    await close(healthServer)
    fs.rmSync(tempDir, { force: true, recursive: true })
  }
})

test('真实生图失败节点在冷却期内不会被恢复流程重新选中', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ajin-blog-route-quarantine-test-'))
  const socketPath = path.join(tempDir, 'mihomo.sock')
  const currentNode = '🇺🇸美国 101 ChatGPT专用 | 1x US'
  const quarantinedNode = '🇺🇸美国 104 ChatGPT专用 | 1x US'
  const healthyNode = '🇺🇸美国 116 ChatGPT专用 | 1x US'
  let selectedNode = currentNode

  const healthServer = http.createServer((request, response) => {
    response.writeHead(204)
    response.end()
  })
  const probeUrl = await listen(healthServer)

  const clashServer = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost')
    if (request.method === 'GET' && url.pathname === '/proxies') {
      response.setHeader('Content-Type', 'application/json')
      response.end(
        JSON.stringify({
          proxies: {
            'Mikasa 加速器': {
              all: [currentNode, quarantinedNode, healthyNode],
              now: selectedNode,
              type: 'Selector',
            },
          },
        }),
      )
      return
    }
    if (request.method === 'GET' && url.pathname.endsWith('/delay')) {
      const node = decodeURIComponent(url.pathname.split('/')[2])
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify({ delay: node === quarantinedNode ? 100 : 500 }))
      return
    }
    if (request.method === 'PUT' && url.pathname.startsWith('/proxies/')) {
      let body = ''
      request.setEncoding('utf8')
      request.on('data', (chunk) => {
        body += chunk
      })
      request.on('end', () => {
        selectedNode = JSON.parse(body).name
        response.writeHead(204)
        response.end()
      })
      return
    }
    if (request.method === 'DELETE' && url.pathname === '/connections') {
      response.writeHead(204)
      response.end()
      return
    }
    response.writeHead(404)
    response.end()
  })
  await listenUnix(clashServer, socketPath)

  try {
    const result = await recoverCodexImageRoute({
      attempts: 2,
      clashSocket: socketPath,
      curlPath: '/usr/bin/curl',
      excludedCandidates: [quarantinedNode],
      probeUrl,
      proxyUrl: '',
      requiredPasses: 2,
      settleMilliseconds: 0,
      timeoutSeconds: 2,
    })

    assert.equal(result.status, 'ok')
    assert.equal(result.to, healthyNode)
    assert.equal(selectedNode, healthyNode)
    assert.ok(result.candidatesTried.every((candidate) => candidate.name !== quarantinedNode))
  } finally {
    await close(clashServer)
    await close(healthServer)
    fs.rmSync(tempDir, { force: true, recursive: true })
  }
})

test('真实生图失败节点会跨进程保留并在冷却期结束后自动失效', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ajin-blog-route-state-test-'))
  const failureStatePath = path.join(tempDir, 'route-failures.json')
  const failedNode = '🇺🇸美国 104 ChatGPT专用 | 1x US'

  try {
    recordCodexImageRouteFailure({
      failure: 'image generation failed: network error',
      failureStatePath,
      name: failedNode,
      now: 1_000,
    })

    assert.deepEqual(
      readCodexImageRouteFailures({
        cooldownMilliseconds: 1_000,
        failureStatePath,
        now: 1_999,
      }),
      [failedNode],
    )
    assert.deepEqual(
      readCodexImageRouteFailures({
        cooldownMilliseconds: 1_000,
        failureStatePath,
        now: 2_001,
      }),
      [],
    )
  } finally {
    fs.rmSync(tempDir, { force: true, recursive: true })
  }
})

test('当前短探测健康但处于真实生图冷却期时仍会切换节点', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aj-rp-'))
  const socketPath = path.join(tempDir, 'mihomo.sock')
  const quarantinedNode = '🇺🇸美国 104 ChatGPT专用 | 1x US'
  const healthyNode = '🇺🇸美国 116 ChatGPT专用 | 1x US'
  let selectedNode = quarantinedNode

  const healthServer = http.createServer((request, response) => {
    response.writeHead(204)
    response.end()
  })
  const probeUrl = await listen(healthServer)

  const clashServer = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost')
    if (request.method === 'GET' && url.pathname === '/proxies') {
      response.setHeader('Content-Type', 'application/json')
      response.end(
        JSON.stringify({
          proxies: {
            'Mikasa 加速器': {
              all: [quarantinedNode, healthyNode],
              now: selectedNode,
              type: 'Selector',
            },
          },
        }),
      )
      return
    }
    if (request.method === 'GET' && url.pathname.endsWith('/delay')) {
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify({ delay: 300 }))
      return
    }
    if (request.method === 'PUT' && url.pathname.startsWith('/proxies/')) {
      let body = ''
      request.setEncoding('utf8')
      request.on('data', (chunk) => {
        body += chunk
      })
      request.on('end', () => {
        selectedNode = JSON.parse(body).name
        response.writeHead(204)
        response.end()
      })
      return
    }
    if (request.method === 'DELETE' && url.pathname === '/connections') {
      response.writeHead(204)
      response.end()
      return
    }
    response.writeHead(404)
    response.end()
  })
  await listenUnix(clashServer, socketPath)

  try {
    const result = await ensureCodexImageRoute({
      attempts: 2,
      clashSocket: socketPath,
      curlPath: '/usr/bin/curl',
      excludedCandidates: [quarantinedNode],
      probeUrl,
      proxyUrl: '',
      requiredPasses: 2,
      settleMilliseconds: 0,
      timeoutSeconds: 2,
    })

    assert.equal(result.status, 'ok')
    assert.equal(result.action, 'switched', JSON.stringify(result))
    assert.equal(result.from, quarantinedNode)
    assert.equal(result.to, healthyNode)
  } finally {
    await close(clashServer)
    await close(healthServer)
    fs.rmSync(tempDir, { force: true, recursive: true })
  }
})
