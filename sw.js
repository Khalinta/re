// Service worker: oyunu tamamen çevrimdışı çalıştırır.
// Strateji: kurulumda tüm dosyalar önbelleğe alınır (önce önbellek, yoksa ağ).
// ÖNBELLEK_SURUMU ve DOSYALAR listesi tools/sw-liste.mjs ile otomatik üretilir — elle düzenleme.
// Herhangi bir dosya değişince sürüm (içerik özeti) değişir, tarayıcı yeni sürümü indirir.

// <otomatik>
const ONBELLEK_SURUMU = 'yeniden-4064ef71143e';
const DOSYALAR = [
  './',
  './css/temel.css',
  './data/aksiyonlar.json',
  './data/dunya/figurler.json',
  './data/dunya/ilerleme.json',
  './data/dunya/kurumlar.json',
  './data/dunya/mekanlar.json',
  './data/dunya/orgutler.json',
  './data/dunya/sehir.json',
  './data/dunya/semtler.json',
  './data/dunya/sirketler.json',
  './data/dunya/ulasim.json',
  './data/ekonomi.json',
  './data/gezi.json',
  './data/hava.json',
  './data/hikaye/arketipler.json',
  './data/hikaye/bilesenler.json',
  './data/npc/dedikodu.json',
  './data/npc/derinlik.json',
  './data/npc/flort.json',
  './data/npc/gorunus.json',
  './data/npc/hayat.json',
  './data/npc/hayat_olaylari.json',
  './data/npc/isimler.json',
  './data/npc/kanca.json',
  './data/npc/kisilik.json',
  './data/npc/memleket.json',
  './data/npc/sohbet.json',
  './data/npc/zevk.json',
  './data/olay_ayarlari.json',
  './data/olaylar/_liste.json',
  './data/olaylar/acilis.json',
  './data/olaylar/ev.json',
  './data/olaylar/gecmis.json',
  './data/olaylar/gunluk.json',
  './data/olaylar/iliski.json',
  './data/olaylar/tanidik.json',
  './data/simulasyon.json',
  './data/takvim.json',
  './data/yaylar.json',
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
  './js/ayarlar.js',
  './js/core/aksiyon.js',
  './js/core/aktarim.js',
  './js/core/ask.js',
  './js/core/bayrak.js',
  './js/core/cesit.js',
  './js/core/dunya.js',
  './js/core/durum.js',
  './js/core/ekonomi.js',
  './js/core/etki.js',
  './js/core/format.js',
  './js/core/hafiza.js',
  './js/core/hava.js',
  './js/core/hikaye.js',
  './js/core/ilerleme.js',
  './js/core/insanlar.js',
  './js/core/kanca.js',
  './js/core/kart.js',
  './js/core/kayitbicim.js',
  './js/core/kayitdeposu.js',
  './js/core/konum.js',
  './js/core/kosul.js',
  './js/core/mekan.js',
  './js/core/metin.js',
  './js/core/migration.js',
  './js/core/npc.js',
  './js/core/npchayat.js',
  './js/core/olay.js',
  './js/core/olaykisi.js',
  './js/core/rapor.js',
  './js/core/rng.js',
  './js/core/sadakat.js',
  './js/core/simulasyon.js',
  './js/core/sohbet.js',
  './js/core/takvim.js',
  './js/core/toplum.js',
  './js/core/tr.js',
  './js/core/ulasim.js',
  './js/core/yz.js',
  './js/core/zaman.js',
  './js/core/zevk.js',
  './js/depolama.js',
  './js/dev/panel.js',
  './js/hata.js',
  './js/kayit.js',
  './js/main.js',
  './js/oyun.js',
  './js/surum.js',
  './js/ui/anlatim.js',
  './js/ui/arayuz.js',
  './js/ui/dom.js',
  './js/ui/durumcubugu.js',
  './js/ui/ekranlar/aktarim.js',
  './js/ui/ekranlar/dahafazla.js',
  './js/ui/ekranlar/hayatim.js',
  './js/ui/ekranlar/kayitlar.js',
  './js/ui/ekranlar/sehir.js',
  './js/ui/ekranlar/simdi.js',
  './js/ui/ekranlar/yenihayat.js',
  './js/ui/ekranlar/yertutucu.js',
  './js/ui/ikonlar.js',
  './js/ui/panel.js',
  './js/ui/secenekler.js',
  './js/ui/uzunbas.js',
  './js/vendor/anthropic-sdk.mjs',
  './js/yz/ayar.js',
  './js/yz/claude.js',
  './js/yz/gemini.js',
  './js/yz/istemci.js',
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
