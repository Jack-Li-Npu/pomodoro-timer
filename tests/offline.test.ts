import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'

it('generates a scoped offline cache that serves matching HTML and assets without network access', async () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'pomo-offline-'))
  try {
    mkdirSync(resolve(dir, 'dist/assets'), { recursive: true })
    writeFileSync(resolve(dir, 'dist/index.html'), '<html><body>focus workspace</body></html>')
    writeFileSync(resolve(dir, 'dist/assets/app-abc.js'), 'app bundle')
    execFileSync(process.execPath, [resolve('scripts/build-sw.mjs')], { cwd: dir })
    const script = readFileSync(resolve(dir, 'dist/sw.js'), 'utf8')
    const scope = 'https://example.test/pomodoro-timer/'
    const contents = new Map<string, string>()
    const listeners: Record<string, (event: unknown) => void> = {}
    const fetch = vi.fn(() => Promise.reject(new Error('offline')))
    const cache = {
      addAll: async (paths: string[]) => {
        for (const path of paths)
          contents.set(new URL(path, scope).href, readFileSync(resolve(dir, 'dist', path), 'utf8'))
      },
      match: async (request: URL | { url: string }) =>
        contents.get(request instanceof URL ? request.href : request.url),
    }
    const deleteCache = vi.fn(async () => true)
    runInNewContext(script, {
      URL,
      fetch,
      caches: {
        open: async () => cache,
        keys: async () => [
          'pomo-studio-/pomodoro-timer/-old',
          'unrelated-app',
          'pomo-studio-/another-path/-old',
        ],
        delete: deleteCache,
      },
      self: {
        registration: { scope },
        location: { origin: 'https://example.test' },
        clients: { claim: async () => {} },
        addEventListener: (name: string, callback: (event: unknown) => void) => {
          listeners[name] = callback
        },
      },
    })
    let work: Promise<unknown> | undefined
    listeners.install({
      waitUntil: (promise: Promise<unknown>) => {
        work = promise
      },
    })
    await work
    listeners.activate({
      waitUntil: (promise: Promise<unknown>) => {
        work = promise
      },
    })
    await work
    expect(deleteCache.mock.calls).toEqual([['pomo-studio-/pomodoro-timer/-old']])
    const respondWith = (promise: Promise<unknown>) => {
      work = promise
    }
    listeners.fetch({
      request: { url: `${scope}?demo=1`, method: 'GET', mode: 'navigate' },
      respondWith,
    })
    expect(await work).toContain('focus workspace')
    listeners.fetch({
      request: { url: `${scope}assets/app-abc.js`, method: 'GET', mode: 'cors' },
      respondWith,
    })
    expect(await work).toBe('app bundle')
    expect(fetch).not.toHaveBeenCalled()
    const ignored = vi.fn()
    listeners.fetch({
      request: { url: 'https://other.test/data', method: 'GET', mode: 'cors' },
      respondWith: ignored,
    })
    expect(ignored).not.toHaveBeenCalled()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
