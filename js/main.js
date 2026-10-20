// Giriş noktası: açılış ekranı, service worker kaydı ve güncelleme akışı.
import { yukle as ayarlariYukle } from './ayarlar.js';
import { arayuzKur } from './ui/arayuz.js';
import { simdiEkrani, paragraflariGoster, oyunuGoster, yeniOyunuGoster } from './ui/ekranlar/simdi.js';
import { kayitlariGoster } from './ui/ekranlar/kayitlar.js';
import { bilgiGoster, panelAc } from './ui/panel.js';
import { h } from './ui/dom.js';
import * as oyun from './oyun.js';
import * as kayit from './kayit.js';
import * as hata from './hata.js';

// Hata yakalama her şeyden önce kurulur
hata.kur();
hata.bagla({ durum: () => oyun.durumAl(), kayitUyarilari: () => kayit.hatalar, bilgi: () => ({ depolama: kayit.depolamaBilgisi() }) });
import { telefonEkrani } from './ui/ekranlar/yertutucu.js';
import { sehirEkrani } from './ui/ekranlar/sehir.js';
import { hayatimEkrani } from './ui/ekranlar/hayatim.js';
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
  // İlk ziyarette sayfanın kontrolcüsü yoktur; service worker kurulup kontrolü aldığında
  // (clients.claim) bu bir güncelleme değildir, sayfa yeniden yüklenmemeli.
  const oncedenKontrolluydu = !!navigator.serviceWorker.controller;
  const swKaydi = await navigator.serviceWorker.register('./sw.js');
  let yenileniyor = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (yenileniyor || !oncedenKontrolluydu) return;
    yenileniyor = true;
    location.reload();
  });

  // Açılışta bekleyen bir güncelleme varsa: oyun henüz yüklenmedi, hemen geç (veri kaybı riski yok).
  if (swKaydi.waiting && navigator.serviceWorker.controller) {
    swKaydi.waiting.postMessage('hemenGec');
    return { durum: 'guncelleniyor' };
  }

  // Oyun sırasında gelen güncelleme: kullanıcıya sor.
  swKaydi.addEventListener('updatefound', () => {
    const yeni = swKaydi.installing;
    yeni?.addEventListener('statechange', () => {
      if (yeni.state === 'installed' && navigator.serviceWorker.controller) {
        bantGoster('Yeni sürüm hazır.', 'Yenile', async () => { try { await kayit.hemenKaydet(); } finally { yeni.postMessage('hemenGec'); } });
      }
    });
  });
  // Uygulama her öne geldiğinde güncelleme var mı bak
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') swKaydi.update().catch(() => {});
  });
  await navigator.serviceWorker.ready;
  return { durum: navigator.serviceWorker.controller ? 'hazir' : 'ilk' };
}

async function basla() {
  ayarlariYukle();
  const [, sw] = await Promise.all([cssYukle('./css/temel.css'), swKur().catch(e => ({ durum: 'hata', hata: e }))]);
  if (sw.durum === 'guncelleniyor') return;

  await oyun.veriYukle();

  hata.bagla({ panel: panelAc });
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
  setTimeout(acilisiKapat, 500);
  await kayitliOyunuAc();
}

// Etkin yuvadaki oyunu açar; yoksa yeni oyun başlatır. Kayıt okunamazsa asla üstüne yazmaz.
async function kayitliOyunuAc() {
  try {
    await kayit.baslat();
  } catch (e) {
    console.error(e);
  }
  oyun.dinle(durum => { kayit.otomatikKaydet(durum); });
  kayit.dinle(olay => {
    if (olay.tur === 'kaydedildi' && (oyun.durumAl()?.aksiyonGecmisi.length ?? 0) >= 3 && kayit.kaliciUyariGosterilsinMi()) {
      bilgiGoster('Kayıtların hakkında', 'Oyun her hamlede kendini kaydediyor. Ancak tarayıcı, kayıtları kalıcı tutma iznini vermedi; telefonda yer çok daralırsa silinebilirler. Uygulamayı Ana Ekrana eklemek bunu çoğu zaman çözer. Ayrıca arada bir kaydını dışa aktarman iyi olur: Daha Fazla → Kayıtlar → Dışa aktar.');
    }
    if (olay.tur === 'hata' && !kayitHatasiGosterildi) {
      kayitHatasiGosterildi = true;
      bilgiGoster('Kayıt yapılamadı', 'Son hamlen kaydedilemedi: ' + (olay.hata?.message || olay.hata) + '\n\nOyuna devam edebilirsin; bir sonraki hamlede yeniden denenecek.');
    }
  });

  const n = kayit.aktifYuva();
  let sonuc = null;
  try {
    sonuc = await kayit.yukle(n);
  } catch {
    // Yuva var ama kurtarılamadı: üstüne yazmamak için otomatik kaydı askıya al, kullanıcıya sor
    kayit.askiyaAl(true);
    panelAc({
      baslik: `Yuva ${n} açılamadı`,
      icerik: h('p', { class: 'panel-metin' }, 'Bu yuvadaki kayıt da, otomatik yedekleri de okunamadı.\n\nHiçbir şeyin üstüne yazılmadı. Kayıtlar ekranından başka bir yuvada yeni oyun başlatabilir ya da yedeklere bakabilirsin.'),
      altBilgi: h('div', { class: 'dugme-yigini' }, h('button', { class: 'dugme birincil', onclick: () => kayitlariGoster() }, 'Kayıtlara git')),
    });
    return;
  }
  if (sonuc) {
    oyun.durumYukle(sonuc.durum);
    await oyunuGoster();
    if (sonuc.kaynak !== 'ana' && sonuc.kaynak !== 'yansi') {
      bilgiGoster('Kayıt kurtarıldı', 'Son kaydın okunamadı; oyun en yakın otomatik yedekten açıldı. Birkaç hamle geride olabilirsin.');
    }
  } else {
    kayit.yuvaHazirla(n);
    await yeniOyunuGoster();
  }
}

let kayitHatasiGosterildi = false;

basla().catch(e => {
  hata.hataKaydet(e, { kaynak: 'açılış', ciddi: true });
  // Arayüz kurulduysa panel, kurulmadıysa açılış ekranında rapor düğmesi
  hata.hataPaneli(e, { yenidenBaslat: () => location.reload() });
});
