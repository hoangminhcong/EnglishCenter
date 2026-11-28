import fs from 'node:fs'
import { registerHooks } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

function createMemoryStorage() {
  const store = new Map()
  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key) {
      return store.has(String(key)) ? store.get(String(key)) : null
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key) {
      store.delete(String(key))
    },
    setItem(key, value) {
      store.set(String(key), String(value))
    },
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = createMemoryStorage()
}
if (typeof globalThis.sessionStorage === 'undefined') {
  globalThis.sessionStorage = createMemoryStorage()
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis
}

const testsDir = path.dirname(fileURLToPath(import.meta.url))
const staffWebRoot = path.resolve(testsDir, '..')
const repoRoot = path.resolve(staffWebRoot, '../..')

const workspacePackageMap = new Map([
  ['@english-center/contracts', path.join(repoRoot, 'packages/contracts/src/index.ts')],
  ['@english-center/utils', path.join(repoRoot, 'packages/utils/src/index.ts')],
  ['@english-center/api-client', path.join(repoRoot, 'packages/api-client/src/index.ts')],
])

function resolveCandidateFile(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return pathToFileURL(candidate).href
    }
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (workspacePackageMap.has(specifier)) {
      return {
        shortCircuit: true,
        url: pathToFileURL(workspacePackageMap.get(specifier)).href,
      }
    }

    if (specifier.startsWith('@/')) {
      const target = path.join(staffWebRoot, 'src', specifier.slice(2))
      const resolved = resolveCandidateFile(target)
      if (resolved) {
        return { shortCircuit: true, url: resolved }
      }
    }

    if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      context.parentURL?.startsWith('file:')
    ) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL))
      const target = path.resolve(parentDir, specifier)
      const resolved = resolveCandidateFile(target)
      if (resolved) {
        return { shortCircuit: true, url: resolved }
      }
    }

    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    const loaded = nextLoad(url, context)
    if (url.endsWith('.ts') && loaded.source) {
      const text =
        typeof loaded.source === 'string'
          ? loaded.source
          : Buffer.from(loaded.source).toString('utf8')
      if (text.includes('import.meta.env')) {
        return {
          ...loaded,
          source: `import.meta.env ??= { DEV: true };\n${text}`,
        }
      }
    }
    return loaded
  },
})
