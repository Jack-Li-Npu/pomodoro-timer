import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const result = await Promise.all(
    entries.map((item) =>
      item.isDirectory() ? walk(`${dir}/${item.name}`) : `${dir}/${item.name}`,
    ),
  )
  return result.flat()
}
const files = (await walk('dist')).filter((file) => !file.endsWith('/sw.js')).sort()
const hash = createHash('sha256')
for (const file of files) hash.update(await readFile(file))
const version = hash.digest('hex').slice(0, 12)
const assets = files.map((file) => `./${file.slice(5)}`)
await writeFile(
  'dist/sw.js',
  `// Generated from the production build. Updates activate after old tabs close.
const CACHE = 'pomo-studio-' + new URL(self.registration.scope).pathname + '-${version}';
const PREFIX = 'pomo-studio-' + new URL(self.registration.scope).pathname + '-';
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(Promise.all([caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))), self.clients.claim()])));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  // Keep the HTML and hashed assets from one build together, even during deployment.
  if (event.request.mode === 'navigate') { event.respondWith(caches.open(CACHE).then(cache => cache.match(new URL('./index.html', self.registration.scope))).then(response => response || fetch(event.request))); return; }
  if (ASSETS.some(path => new URL(path, self.registration.scope).href === url.href)) event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request)).then(response => response || fetch(event.request)));
});
`,
)
console.log(`Offline cache: ${assets.length} files, version ${version}`)
