// Oyun durumu: kaydedilen her şey bu tek düz nesnededir (JSON'a çevrilebilir, fonksiyon/sınıf içermez).
// Şema sürümü kayıt sisteminde (1.6) migration için kullanılır.
import { Rng } from './rng.js';
import { OYUN_SURUMU } from '../surum.js';

export const KAYIT_SURUMU = 1;
export const AKSIYON_GECMISI_SINIRI = 50;
export const ANLATIM_GECMISI_SINIRI = 150;

// secenek: { seed, baslangic: 'YYYY-AA-GG', saat: 8, karakter, para }
export function yeniDurum(simCfg, { seed, baslangic, saat = 8, karakter = {}, para = 0 } = {}) {
  const durumlar = {};
  for (const [k, v] of Object.entries(simCfg.durumlar)) durumlar[k] = v.baslangic;
  return {
    kayitSurumu: KAYIT_SURUMU,
    oyunSurumu: OYUN_SURUMU,
    seed,
    olusturma: new Date().toISOString(),
    zaman: { baslangic, dakika: saat * 60 },
    karakter: { ad: 'Deniz', dogum: '1996-03-14', ...karakter },
    durumlar,
    para,
    beceriler: {},
    bayraklar: { kalici: {}, sureli: {}, npc: {} },
    sayaclar: {},
    zamanlayicilar: [],
    olayGecmisi: {},
    rng: {},
    aksiyonGecmisi: [],
    anlatim: [],
    gunluk: [],
  };
}

// Durumun içindeki kayıtlı RNG akışını verir; her çekişte akışın yeni hali duruma yazılır.
// Böylece kayıttan dönünce rastgelelik kaldığı yerden devam eder.
export function rngAl(durum, alan) {
  const r = durum.rng[alan] ? new Rng(durum.rng[alan]) : Rng.akis(durum.seed, alan);
  const ham = r.ham.bind(r);
  r.ham = () => { const x = ham(); durum.rng[alan] = r.getDurum(); return x; };
  return r;
}

export function aksiyonKaydet(durum, id, ayrinti) {
  durum.aksiyonGecmisi.push({ z: durum.zaman.dakika, id, ...(ayrinti ? { a: ayrinti } : {}) });
  if (durum.aksiyonGecmisi.length > AKSIYON_GECMISI_SINIRI) durum.aksiyonGecmisi.splice(0, durum.aksiyonGecmisi.length - AKSIYON_GECMISI_SINIRI);
}

export function anlatimKaydet(durum, paragraf) {
  durum.anlatim.push(paragraf);
  if (durum.anlatim.length > ANLATIM_GECMISI_SINIRI) durum.anlatim.splice(0, durum.anlatim.length - ANLATIM_GECMISI_SINIRI);
}

// Bir işi durumu bozmadan dener: iş hata fırlatırsa durum, işten önceki haline YERİNDE döndürülür
// (aynı nesne kalır; ona referans tutan kayıt sistemi yarım kalmış bir hali asla görmez).
export function geriAlinabilir(durum, is) {
  const yedek = structuredClone(durum);
  try {
    return is();
  } catch (e) {
    for (const k of Object.keys(durum)) delete durum[k];
    Object.assign(durum, yedek);
    try { e.geriAlindi = true; } catch { /* dondurulmuş hata */ }
    throw e;
  }
}
