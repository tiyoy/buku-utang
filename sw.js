/* ===================================================
   Buku Utang Simpel - Service Worker (PWA)
   - File app: network-first (selalu versi baru saat online, tetap jalan offline)
   - Ikon & CDN (font/ikon): cache-first (hemat kuota, offline tetap bersih)
   =================================================== */

const VERSION = 'buku-utang-v1';
const CORE_CACHE = `${VERSION}-core`;    // index.html, css, js, manifest — di-update tiap online
const ASSET_CACHE = `${VERSION}-assets`; // ikon + font CDN — cache permanen

// Daftar file inti yang wajib tersedia offline
const CORE_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png'
];

// CDN yang ikut di-cache saat pertama kali diakses
const CDN_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CORE_CACHE);
    // addAll gagal semua jika salah satu file hilang — pakai one-by-one agar tahan banting
    await Promise.all(CORE_ASSETS.map(async (url) => {
      try { await cache.add(url); } catch (e) { /* abaikan file yang tidak tersedia */ }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('buku-utang-') && key !== CORE_CACHE && key !== ASSET_CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // 1) Navigasi halaman: network-first, fallback ke cache saat offline
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CORE_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(CORE_CACHE);
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  // 2) File inti (css/js/manifest): network-first dari core cache
  const isCoreFile = url.origin === self.location.origin &&
    /\/(styles\.css|app\.js|manifest\.json|sw\.js)$/.test(url.pathname);
  if (isCoreFile) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CORE_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        return (await caches.match(req)) || Response.error();
      }
    })());
    return;
  }

  // 3) Ikon lokal & CDN font/ikon: cache-first, isi cache saat online
  const isIcon = url.origin === self.location.origin && /\/icons\//.test(url.pathname);
  const isCDN = CDN_HOSTS.includes(url.hostname);
  if (isIcon || isCDN) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh.ok || fresh.type === 'opaque') {
          const cache = await caches.open(ASSET_CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (e) {
        return Response.error();
      }
    })());
  }
  // sisanya: biarkan browser menangani normal
});
