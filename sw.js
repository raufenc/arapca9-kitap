/* Arapça 9 · kalıcı önbellek ve çevrimdışı çalışma
   Kabuk dosyaları ağdan taze alınır (yoksa önbellekten); sayfa, ses, video ve etkinlik dosyaları önbellekten. */
const CACHE = 'arapca9-kitap';
const BASE = new URL('./', self.location).href;
const SHELL = new Set(['index.html', 'reader.css', 'reader.js', 'book-data.js', 'activities.js', 'activity-bridge.js',
 'activity-host.html', 'activity-host.js', 'activity-h5p.js', 'activity-h5p.css', 'manifest.webmanifest', 'offline-files.json']);

self.addEventListener('install', e => e.waitUntil((async () => {
 const c = await caches.open(CACHE);
 await Promise.all([...SHELL].map(p => fetch(BASE + p, {cache: 'no-cache'}).then(r => r.ok && c.put(BASE + p, r)).catch(() => {})));
 await self.skipWaiting();
})()));
self.addEventListener('activate', e => e.waitUntil((async () => {
 for (const k of await caches.keys()) if (k !== CACHE && k.startsWith('arapca9')) await caches.delete(k);
 await self.clients.claim();
})()));

function keyOf(url) {
 let path = url.pathname;
 if (path.endsWith('/')) path += 'index.html';
 return {rel: decodeURIComponent(path.slice(new URL(BASE).pathname.length)), key: url.origin + path};
}
async function ranged(req, res) {
 const m = /bytes=(\d+)-(\d*)/.exec(req.headers.get('range') || '');
 const blob = await res.blob(), size = blob.size;
 if (!m) return new Response(blob, {status: 200, headers: res.headers});
 const start = +m[1], end = m[2] ? Math.min(+m[2], size - 1) : size - 1;
 if (start >= size) return new Response(null, {status: 416, headers: {'Content-Range': `bytes */${size}`}});
 return new Response(blob.slice(start, end + 1), {status: 206, headers: {
  'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream',
  'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes'}});
}

self.addEventListener('fetch', e => {
 const req = e.request;
 if (req.method !== 'GET' || !req.url.startsWith(BASE) || req.headers.get('x-a9-save')) return;
 const {rel, key} = keyOf(new URL(req.url));
 if (req.mode === 'navigate' || SHELL.has(rel)) {
  e.respondWith((async () => {
   const c = await caches.open(CACHE);
   try {
    const r = await fetch(req, {cache: 'no-cache'});
    if (r.ok && r.status === 200) c.put(key, r.clone());
    return r;
   } catch (err) {
    return (await c.match(key)) || Response.error();
   }
  })());
  return;
 }
 e.respondWith((async () => {
  const c = await caches.open(CACHE), hit = await c.match(key);
  if (hit) return req.headers.has('range') ? ranged(req, hit) : hit;
  const r = await fetch(req);
  if (r.status === 200 && r.type === 'basic' && !req.headers.has('range')) c.put(key, r.clone()).catch(() => {});
  return r;
 })());
});
