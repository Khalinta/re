// Hata yönetimi (tarayıcı): tüm hataları yakalar ve kaydeder, oyunu çökertmez.
// - Arka plandaki beklenmedik hatalar: kaydedilir, oyun sürer (oturum başına bir kez küçük bir bant çıkar).
// - Oyuncunun bir hamlesi sırasında çıkan hata (guvenli ile sarılan işler): ciddi sayılır, hata paneli açılır.
// - Açılışta çıkan hata: açılış ekranında rapor düğmesi.
import { raporOlustur } from './core/rapor.js';
import { zarfla } from './core/kayitbicim.js';
import { kodaCevir } from './core/aktarim.js';
import { OYUN_SURUMU } from './surum.js';
import { KAYIT_SURUMU } from './core/durum.js';

const EN_FAZLA = 100;
const kayitlar = [];
let durumAl = () => null;
let ekBilgi = () => ({});
let kayitHatalari = () => [];
let panelAc = null;
let bantGosterildi = false;

export const hatalar = () => kayitlar.slice();

// Diğer modüller kurulumdan sonra bağlanır (döngüsel içe aktarma olmasın diye)
export function bagla({ durum, bilgi, kayitUyarilari, panel }) {
  if (durum) durumAl = durum;
  if (bilgi) ekBilgi = bilgi;
  if (kayitUyarilari) kayitHatalari = kayitUyarilari;
  if (panel) panelAc = panel;
}

export function hataKaydet(hata, { tur = 'hata', kaynak, ciddi = false } = {}) {
  const e = hata instanceof Error ? hata : new Error(typeof hata === 'string' ? hata : JSON.stringify(hata));
  const kayit = {
    zaman: new Date().toISOString(),
    tur, kaynak, ciddi,
    mesaj: e.message || String(e),
    yigin: e.stack || '',
    oyunZamani: durumAl()?.zaman?.dakika,
  };
  kayitlar.push(kayit);
  if (kayitlar.length > EN_FAZLA) kayitlar.shift();
  try { console.error('[hata]', kaynak || '', e); } catch { /* yok */ }
  return kayit;
}

export function kur() {
  window.addEventListener('error', olay => {
    // Kaynak dosya yükleme hatası (resim vb.) da buraya düşebilir
    const e = olay.error || new Error(olay.message || 'Bilinmeyen hata');
    hataKaydet(e, { tur: 'yakalanmamis', kaynak: olay.filename ? `${olay.filename}:${olay.lineno}` : undefined });
    bantGoster();
  });
  window.addEventListener('unhandledrejection', olay => {
    hataKaydet(olay.reason ?? 'Bilinmeyen söz hatası', { tur: 'soz' });
    bantGoster();
    olay.preventDefault?.();
  });
}

function cihazBilgisi() {
  const n = navigator;
  return {
    tarayici: n.userAgent,
    platform: n.userAgentData?.platform || n.platform || '?',
    dil: n.language,
    ekran: `${screen.width}x${screen.height} @${window.devicePixelRatio}x · pencere ${innerWidth}x${innerHeight}`,
    anaEkrandan: !!(window.matchMedia?.('(display-mode: standalone)').matches || n.standalone),
    saatDilimi: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cevrimici: n.onLine,
    serviceWorker: !!n.serviceWorker?.controller,
    sikistirma: typeof CompressionStream === 'function',
    ...ekBilgi(),
  };
}

export async function raporMetni() {
  const durum = durumAl();
  let kod = null;
  if (durum) {
    try { kod = await kodaCevir(zarfla(durum)); } catch (e) { kod = '(kayıt kodu üretilemedi: ' + e.message + ')'; }
  }
  return raporOlustur({ oyunSurumu: OYUN_SURUMU, kayitSurumu: KAYIT_SURUMU, cihaz: cihazBilgisi(), durum, hatalar: kayitlar, kayitHatalari: kayitHatalari(), kod });
}

export async function raporuKopyala() {
  const metin = await raporMetni();
  try { await navigator.clipboard.writeText(metin); return { tamam: true, metin }; } catch {
    const t = document.createElement('textarea');
    t.value = metin; t.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.append(t); t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    t.remove();
    return { tamam: ok, metin };
  }
}

function bantGoster() {
  if (bantGosterildi || !document.body) return;
  bantGosterildi = true;
  const b = document.createElement('div');
  b.className = 'bant hata-bant';
  b.innerHTML = '<span>Küçük bir sorun oldu; oyun devam ediyor.</span><button>Rapor</button>';
  b.querySelector('button').onclick = () => { b.remove(); hataPaneli(null); };
  document.body.append(b);
  setTimeout(() => b.remove(), 8000);
}

// Rapor düğmeli hata paneli. yenidenDene: "Devam et" seçilince çağrılır.
export function hataPaneli(hata, { yenidenDene, yenidenBaslat } = {}) {
  const govde = document.createElement('div');
  const p = document.createElement('p');
  p.className = 'panel-metin';
  p.textContent = hata
    ? 'Bir şey ters gitti ve son hamlen uygulanmadı. Oyunun bozulmadı: durum hamleden önceki haline döndürüldü.\n\nAşağıdaki düğmeyle hata raporunu kopyalayıp geliştiriciye gönderebilirsin.'
    : 'Oturum boyunca kaydedilen sorunlar. Raporu kopyalayıp geliştiriciye gönderebilirsin.';
  const ayrinti = document.createElement('p');
  ayrinti.className = 'soluk kucuk hata-ayrinti';
  ayrinti.textContent = hata ? (hata.message || String(hata)) : `${kayitlar.length} kayıt`;
  govde.append(p, ayrinti);

  const yigin = document.createElement('div');
  yigin.className = 'dugme-yigini';
  const kopyala = document.createElement('button');
  kopyala.className = 'dugme birincil';
  kopyala.textContent = 'Hata raporunu kopyala';
  kopyala.onclick = async () => {
    const s = await raporuKopyala();
    kopyala.textContent = s.tamam ? 'Kopyalandı ✓' : 'Kopyalanamadı';
  };
  yigin.append(kopyala);
  let panel;
  if (yenidenDene) {
    const d = document.createElement('button');
    d.className = 'dugme'; d.textContent = 'Devam et';
    d.onclick = () => panel?.kapat(); // kapanınca yenidenDene çalışır
    yigin.append(d);
  }
  if (yenidenBaslat) {
    const r = document.createElement('button');
    r.className = 'dugme'; r.textContent = 'Uygulamayı yeniden başlat';
    r.onclick = () => yenidenBaslat();
    yigin.append(r);
  }
  // Panel nasıl kapanırsa kapansın (düğme, çarpı, kaydırma) oyun kilitli kalmasın
  if (panelAc) panel = panelAc({ baslik: hata ? 'Bir sorun oldu' : 'Sorun kaydı', icerik: govde, altBilgi: yigin, kapaninca: () => yenidenDene?.() });
  else acilisHatasi(hata);
  return panel;
}

// Arayüz kurulamadan önceki hatalar için (açılış ekranında)
export function acilisHatasi(hata) {
  const m = document.getElementById('acilis-mesaj');
  if (!m) return;
  clearTimeout(window.__acilisZamanlayici);
  m.textContent = '';
  const p = document.createElement('div');
  p.textContent = 'Oyun açılamadı: ' + (hata?.message || hata || 'bilinmeyen hata');
  const b1 = document.createElement('button');
  b1.textContent = 'Hata raporunu kopyala';
  b1.onclick = async () => { const s = await raporuKopyala(); b1.textContent = s.tamam ? 'Kopyalandı ✓' : 'Kopyalanamadı'; };
  const b2 = document.createElement('button');
  b2.textContent = 'Yeniden dene';
  b2.onclick = () => location.reload();
  m.append(p, b1, document.createElement('br'), b2);
}

// Oyuncu hamlesi gibi işleri sarar: hata olursa kaydeder, paneli açar, çökmez.
export async function guvenli(kaynak, is, secenek = {}) {
  try {
    return await is();
  } catch (e) {
    hataKaydet(e, { kaynak, ciddi: true });
    hataPaneli(e, secenek);
    return undefined;
  }
}
