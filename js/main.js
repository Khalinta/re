// Giriş noktası: açılış ekranı, service worker kaydı ve güncelleme akışı.
import { yukle as ayarlariYukle } from './ayarlar.js';
import { arayuzKur } from './ui/arayuz.js';
import { simdiEkrani, paragraflariGoster, menuyuGoster } from './ui/ekranlar/simdi.js';
import * as oyun from './oyun.js';
import { telefonEkrani, sehirEkrani, hayatimEkrani } from './ui/ekranlar/yertutucu.js';
import { dahaFazlaEkrani } from './ui/ekranlar/dahafazla.js';

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
  ayarlariYukle();
  const [, sw] = await Promise.all([cssYukle('./css/temel.css'), swKur().catch(h => ({ durum: 'hata', hata: h }))]);
  if (sw.durum === 'guncelleniyor') return;

  try {
    await oyun.veriYukle();
  } catch (hata) {
    clearTimeout(window.__acilisZamanlayici);
    $('#acilis-mesaj').textContent = 'Oyun verisi yüklenemedi: ' + hata.message;
    return;
  }

  const arayuz = arayuzKur($('#uygulama'), {
    simdi: simdiEkrani,
    telefon: telefonEkrani,
    sehir: sehirEkrani,
    hayatim: hayatimEkrani,
    dahaFazla: dahaFazlaEkrani,
  });

  oyun.dinle((durum, paragraflar) => {
    arayuz.durum.guncelle(oyun.durumCubuguVerisi());
    if (paragraflar.length) paragraflariGoster(paragraflar);
  });
  // Kayıt sistemi (1.6) gelene kadar her açılışta yeni oyun başlar
  oyun.yeniOyun();
  setTimeout(acilisiKapat, 500);
  await paragraflariGoster([]);
  menuyuGoster();
}

basla();
