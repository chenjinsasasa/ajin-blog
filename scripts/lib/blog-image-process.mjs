import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

export function successfulImageResult(result, finalPath, candidatePath) {
  if (result.status !== 0 || !fs.existsSync(finalPath) || !fs.existsSync(candidatePath)) return false
  if (!fs.lstatSync(finalPath).isFile() || fs.lstatSync(finalPath).isSymbolicLink() ||
      !fs.realpathSync(finalPath).startsWith(`${fs.realpathSync(path.dirname(candidatePath))}${path.sep}`)) return false
  // Only the CLI's final assistant message is authoritative, never echoed prompts/tool logs.
  const last = fs.readFileSync(finalPath, 'utf8').trim().split(/\r?\n/).at(-1)
  return last === `CODEX_IMAGE_RESULT status=ok output=${candidatePath}`
}

export function runImageProcess(command, args, { cwd, env, input = '', timeoutMs = 1200000,
  stream = true, maxOutputBytes = 4 * 1024 * 1024 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env, detached: process.platform !== 'win32', stdio: ['pipe','pipe','pipe'] })
    let settled = false, timedOut = false, stdout = '', stderr = '', killTimer
    const kill = (signal) => {
      try { if (process.platform !== 'win32') process.kill(-child.pid, signal); else child.kill(signal) } catch { /* already exited */ }
    }
    const stop = () => {
      timedOut = true; kill('SIGTERM')
      killTimer = setTimeout(() => kill('SIGKILL'), 1000)
    }
    const signalStop = () => { stop() }
    process.on('SIGTERM', signalStop);process.on('SIGINT', signalStop)
    const timer = setTimeout(stop, timeoutMs)
    const finish = (status, error = '') => {
      if (settled) return
      settled = true;clearTimeout(timer)
      // Also reclaim descendants when the direct child exits first.
      kill('SIGKILL');clearTimeout(killTimer)
      process.off('SIGTERM',signalStop);process.off('SIGINT',signalStop)
      resolve({status: timedOut ? 124 : status, stdout, stderr: `${stderr}${error}${timedOut ? '\nimage_process_timeout_or_interrupted' : ''}`})
    }
    child.stdout.on('data', (chunk) => { stdout=(stdout+chunk.toString()).slice(-maxOutputBytes);if(stream)process.stdout.write(chunk) })
    child.stderr.on('data', (chunk) => { stderr=(stderr+chunk.toString()).slice(-maxOutputBytes);if(stream)process.stderr.write(chunk) })
    child.once('error',(err)=>finish(1,err.message))
    child.once('close',(code,signal)=>finish(code ?? 1,signal ? `\nsignal=${signal}` : ''))
    child.stdin.on('error',()=>{})
    child.stdin.end(input)
  })
}
