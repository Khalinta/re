// Service worker: oyunu tamamen çevrimdışı çalıştırır.
// Strateji: kurulumda tüm dosyalar önbelleğe alınır (önce önbellek, yoksa ağ).
// ÖNBELLEK_SURUMU ve DOSYALAR listesi tools/sw-liste.mjs ile otomatik üretilir — elle düzenleme.
// Herhangi bir dosya değişince sürüm (içerik özeti) değişir, tarayıcı yeni sürümü indirir.

// <otomatik>
const ONBELLEK_SURUMU = 'yeniden-12ebd8dcee7d';
const DOSYALAR = [
  './',
  './css/temel.css',
  './icons/acilis-1125x2436.png',
  './icons/acilis-1170x2532.png',
  './icons/acilis-1179x2556.png',
  './icons/acilis-1206x2622.png',
  './icons/acilis-1242x2208.png',
  './icons/acilis-1242x2688.png',
  './icons/acilis-1284x2778.png',
  './icons/acilis-1290x2796.png',
  './icons/acilis-1320x2868.png',
  './icons/acilis-750x1334.png',
  './icons/acilis-828x1792.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/ikon-192.png',
  './icons/ikon-512.png',
  './icons/ikon-maskeli-512.png',
  './icons/ikon.svg',
  './index.html',
  './js/core/format.js',
  './js/core/rng.js',
  './js/core/tr.js',
  './js/main.js',
  './js/surum.js',
  './manifest.webmanifest',
];
// </otomatik>

self.addEventListener('install', olay => {
  olay.waitUntil((async () => {
    const onbellek = await caches.open(ONBELLEK_SURUMU);
    // cache: 'reload' => tarayıcının HTTP önbelleğini atla, sunucudan taze al
    await onbellek.addAll(DOSYALAR.map(d => new Request(d, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', olay => {
  olay.waitUntil((async () => {
    for (const ad of await caches.keys()) {
      if (ad.startsWith('yeniden-') && ad !== ONBELLEK_SURUMU) await caches.delete(ad);
    }
    await self.clients.claim();
  })());
});

// Sayfa "güncelle" derse bekleyen yeni sürüm hemen devreye girer
self.addEventListener('message', olay => {
  if (olay.data === 'hemenGec') self.skipWaiting();
});

self.addEventListener('fetch', olay => {
  const istek = olay.request;
  if (istek.method !== 'GET' || new URL(istek.url).origin !== self.location.origin) return;
  olay.respondWith((async () => {
    const onbellek = await caches.open(ONBELLEK_SURUMU);
    const kayitli = await onbellek.match(istek, { ignoreSearch: true });
    if (kayitli) return kayitli;
    try {
      const yanit = await fetch(istek);
      if (yanit.ok) onbellek.put(istek, yanit.clone());
      return yanit;
    } catch (hata) {
      // Çevrimdışı ve önbellekte yok: sayfa isteğiyse ana sayfayı ver
      if (istek.mode === 'navigate') {
        const ana = await onbellek.match('./index.html') || await onbellek.match('./');
        if (ana) return ana;
      }
      throw hata;
    }
  })());
});
