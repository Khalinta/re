// Giriş noktası: açılış ekranı, service worker kaydı ve güncelleme akışı.
// Oyunun kendisi sonraki adımlarda buraya bağlanacak.
import { OYUN_SURUMU } from './surum.js';
import { tarih, saatTarihten } from './core/format.js';

const $ = s => document.querySelector(s);

function cssYukle(yol) {
  return new Promise(coz => {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = yol;
    l.onload = l.onerror = coz;
    document.head.appendChild(l);
  });
}

function acilisiKapat() {
  clearTimeout(window.__acilisZamanlayici);
  const a = $('#acilis');
  a.classList.add('gizle');
  setTimeout(() => a.remove(), 500);
}

function bantGoster(metin, dugme, eylem) {
  const b = document.createElement('div');
  b.className = 'bant';
  b.innerHTML = `<span></span><button></button>`;
  b.querySelector('span').textContent = metin;
  b.querySelector('button').textContent = dugme;
  b.querySelector('button').onclick = eylem;
  document.body.appendChild(b);
}

async function swKur() {
  if (!('serviceWorker' in navigator)) return { durum: 'desteklenmiyor' };
  const kayit = await navigator.serviceWorker.register('./sw.js');
  let yenileniyor = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (yenileniyor) return;
    yenileniyor = true;
    location.reload();
  });

  // Açılışta bekleyen bir güncelleme varsa: oyun henüz yüklenmedi, hemen geç (veri kaybı riski yok).
  if (kayit.waiting && navigator.serviceWorker.controller) {
    kayit.waiting.postMessage('hemenGec');
    return { durum: 'guncelleniyor' };
  }

  // Oyun sırasında gelen güncelleme: kullanıcıya sor.
  kayit.addEventListener('updatefound', () => {
    const yeni = kayit.installing;
    yeni?.addEventListener('statechange', () => {
      if (yeni.state === 'installed' && navigator.serviceWorker.controller) {
        bantGoster('Yeni sürüm hazır.', 'Yenile', () => yeni.postMessage('hemenGec'));
      }
    });
  });
  // Uygulama her öne geldiğinde güncelleme var mı bak
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') kayit.update().catch(() => {});
  });
  await navigator.serviceWorker.ready;
  return { durum: navigator.serviceWorker.controller ? 'hazir' : 'ilk' };
}

async function basla() {
  const [, sw] = await Promise.all([cssYukle('./css/temel.css'), swKur().catch(h => ({ durum: 'hata', hata: h }))]);
  if (sw.durum === 'guncelleniyor') return;

  const simdi = new Date(Date.now() + 3 * 3600 * 1000); // Türkiye saati (UTC+3)
  const cevrimdisi = {
    hazir: 'Çevrimdışı hazır ✓ — uçak modunda da açılır.',
    ilk: 'Çevrimdışı kurulum tamamlandı. Bir kez kapatıp açınca uçak modunda da çalışır.',
    desteklenmiyor: 'Bu tarayıcı çevrimdışı çalışmayı desteklemiyor.',
    hata: 'Çevrimdışı kurulum başarısız oldu.',
  }[sw.durum];

  const tamEkran = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  $('#uygulama').innerHTML = `
    <main class="gecici">
      <h1>YENİDEN</h1>
      <p>Yapım aşamasında — Faz 1 altyapısı kuruluyor.</p>
      <div class="kart">${tarih(simdi)} · ${saatTarihten(simdi)}</div>
      <div class="kart">${cevrimdisi}</div>
      <div class="kart">${tamEkran ? 'Ana ekrandan açıldı ✓' : 'Tarayıcıda açık. Paylaş → “Ana Ekrana Ekle” ile uygulama gibi kullanabilirsin.'}</div>
      <p class="soluk">Sürüm ${OYUN_SURUMU}</p>
    </main>`;
  setTimeout(acilisiKapat, 700);
}

basla();
