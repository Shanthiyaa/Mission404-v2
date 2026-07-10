import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const frontendDir = resolve(__dirname, '..')
const repoDir = resolve(frontendDir, '..')
const backendDir = resolve(repoDir, 'ai-document-qa-system-2026')
const host = process.env.API_HOST || '127.0.0.1'
const port = Number(process.env.API_PORT || '8001')
const apiTarget = process.env.VITE_API_TARGET || `http://${host}:${port}`

let backendProcess
let frontendProcess
let shuttingDown = false

function commandFor(candidates) {
  return candidates.find((candidate) => existsSync(candidate))
}

function isPortAvailable(portToCheck) {
  return new Promise((resolvePort) => {
    const server = createServer()
    server.once('error', () => resolvePort(false))
    server.once('listening', () => {
      server.close(() => resolvePort(true))
    })
    server.listen(portToCheck, host)
  })
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
}

async function waitForApi(timeoutMs = 120000) {
  const healthUrl = `${apiTarget}/api/health`
  const started = Date.now()

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(healthUrl)
      if (response.ok) return
    } catch {
      // The Python API imports ML dependencies before accepting requests.
    }

    await sleep(1000)
  }

  throw new Error(`Timed out waiting for ${healthUrl}`)
}

function spawnProcess(label, command, args, options) {
  const child = spawn(command, args, {
    ...options,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })

  child.on('exit', (code, signal) => {
    if (shuttingDown) return
    const reason = signal || `exit code ${code}`
    console.log(`${label} stopped with ${reason}.`)
    shutdown(code || 1)
  })

  return child
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true

  if (frontendProcess && !frontendProcess.killed) {
    frontendProcess.kill()
  }

  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill()
  }

  process.exit(code)
}

async function main() {
  const portAvailable = await isPortAvailable(port)

  if (portAvailable) {
    const venvPython = commandFor([
      resolve(backendDir, '.venv', 'Scripts', 'python.exe'),
      resolve(backendDir, '.venv', 'bin', 'python'),
    ])
    const pythonCommand = venvPython || (process.platform === 'win32' ? 'python' : 'python3')

    console.log(`Starting API on ${apiTarget}`)
    backendProcess = spawnProcess('API', pythonCommand, ['run_api.py'], {
      cwd: backendDir,
      env: {
        ...process.env,
        API_HOST: host,
        API_PORT: String(port),
      },
    })

    await waitForApi()
  } else {
    console.log(`Using existing API on ${apiTarget}`)
  }

  const viteBin = commandFor([
    resolve(frontendDir, 'node_modules', '.bin', 'vite.cmd'),
    resolve(frontendDir, 'node_modules', '.bin', 'vite'),
  ]) || 'vite'

  frontendProcess = spawnProcess('Vite', viteBin, [], {
    cwd: frontendDir,
    env: {
      ...process.env,
      VITE_API_TARGET: apiTarget,
    },
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

main().catch((error) => {
  console.error(error.message)
  shutdown(1)
})
