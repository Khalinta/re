// Kayıt yöneticisi (tarayıcı): depoları kurar, otomatik kaydı yönetir, arka plana atılınca kaydeder,
// kalıcı depolama iznini ister. Mantığın asıl kısmı js/core/kayitdeposu.js'te (testli).
import { KayitDeposu } from './core/kayitdeposu.js';
import { gunNo } from './core/zaman.js';
import { idbAc, IdbDepo, LsDepo, LsTamDepo, kaliciDurum, kaliciIste } from './depolama.js';

const META = 'yeniden.meta';
let depo = null;
let anaTuru = '';
let meta = {};
let mevcut = null;           // kaydedilecek durum nesnesine referans
let calisan = null;          // devam eden kayıt sözü
let kirli = false;           // kayıt sürerken yeni değişiklik oldu mu
let oturumdaIlkKayit = true;
let askida = false;          // true iken otomatik kayıt yapılmaz (ör. bozuk yuva için karar bekleniyor)
export const hatalar = [];
const dinleyiciler = new Set();

function metaYukle() { try { meta = JSON.parse(localStorage.getItem(META) || '{}'); } catch { meta = {}; } }
function metaYaz() { try { localStorage.setItem(META, JSON.stringify(meta)); } catch { /* önemsiz */ } }

function hataBildir(mesaj, e) {
  hatalar.push({ zaman: new Date().toISOString(), mesaj, hata: String(e?.message || e), yigin: e?.stack || '' });
  if (hatalar.length > 50) hatalar.shift();
  console.error('[kayıt]', mesaj, e);
}

export function dinle(f) { dinleyiciler.add(f); return () => dinleyiciler.delete(f); }
const bildir = olay => dinleyiciler.forEach(f => { try { f(olay); } catch (e) { console.error(e); } });

export async function baslat() {
  metaYukle();
  let ana;
  try { ana = new IdbDepo(await idbAc()); anaTuru = 'indexeddb'; } catch (e) {
    hataBildir('IndexedDB açılamadı; localStorage kullanılacak', e);
    ana = new LsTamDepo(); anaTuru = 'localstorage';
  }
  depo = new KayitDeposu({ ana, yansi: new LsDepo(), hataBildir });

  // İlk açılışta kalıcı depolama iznini iste (bir kez); sonucu ayarlarda gösterilir
  if (!meta.kaliciIstendi) {
    meta.kaliciIstendi = new Date().toISOString();
    meta.kalici = (await kaliciIste()).kalici;
    metaYaz();
  } else {
    meta.kalici = (await kaliciDurum()).kalici;
  }

  // Arka plana atılınca / kapanırken anında kaydet
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') hemenKaydet(); });
  window.addEventListener('pagehide', () => hemenKaydet());
  return depo;
}

export const depoAl = () => depo;
export const aktifYuva = () => (meta.aktifYuva >= 1 && meta.aktifYuva <= 3 ? meta.aktifYuva : 1);
export function aktifYuvaYap(n) { meta.aktifYuva = n; metaYaz(); }
export const depolamaBilgisi = () => ({ anaTuru, kalici: !!meta.kalici, kaliciIstendi: !!meta.kaliciIstendi });
export const askiyaAl = (deger = true) => { askida = deger; };

export async function kaliciTekrarIste() {
  meta.kalici = (await kaliciIste()).kalici;
  metaYaz();
  return meta.kalici;
}

export function kaliciUyariGosterilsinMi() {
  if (meta.kalici || meta.kaliciUyariGosterildi) return false;
  meta.kaliciUyariGosterildi = true;
  metaYaz();
  return true;
}

export async function yukle(n = aktifYuva()) {
  const sonuc = await depo.yukle(n);
  if (sonuc) { mevcut = sonuc.durum; oturumdaIlkKayit = true; }
  return sonuc;
}

// Otomatik kayıt: her aksiyondan sonra çağrılır. Kayıt sürerken gelen istekler birleştirilir.
export function otomatikKaydet(durum) {
  mevcut = durum;
  if (askida) return Promise.resolve();
  if (calisan) { kirli = true; return calisan; }
  calisan = (async () => {
    try {
      do {
        kirli = false;
        await tekKayit();
      } while (kirli);
    } finally { calisan = null; }
  })();
  return calisan;
}

async function tekKayit() {
  if (!mevcut) return;
  const n = aktifYuva();
  const gun = gunNo(mevcut.zaman.dakika);
  meta.yedekGunu ??= {};
  // Yedek: oturumun ilk kaydında ve oyun içinde her yeni günde
  const yedekle = oturumdaIlkKayit || meta.yedekGunu[n] === undefined || gun > meta.yedekGunu[n];
  try {
    const s = await depo.kaydet(n, mevcut, { yedekle });
    oturumdaIlkKayit = false;
    if (yedekle) { meta.yedekGunu[n] = gun; metaYaz(); }
    bildir({ tur: 'kaydedildi', sonuc: s });
  } catch (e) {
    hataBildir('Otomatik kayıt başarısız', e);
    bildir({ tur: 'hata', hata: e });
  }
}

// Arka plana atılırken, güncellemeden önce: bekleyen kaydı bitir
export async function hemenKaydet() {
  if (!mevcut || askida) return;
  if (calisan) { kirli = true; return calisan; }
  return otomatikKaydet(mevcut);
}

// Yuva değiştirirken / yeni oyunda: yedek gün sayacını sıfırla
export function yuvaHazirla(n) {
  meta.yedekGunu ??= {};
  delete meta.yedekGunu[n];
  oturumdaIlkKayit = true;
  metaYaz();
}
