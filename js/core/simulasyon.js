// Durum simülasyonu: zaman geçtikçe enerji, açlık, hijyen, stres, ruh hali ve sağlık değişir.
// Saf mantık: durumu (düz JS nesnesi) ve ayarları (data/simulasyon.json) alır, durumu değiştirir.
import { gunDakikasi, saatKac, sonrakiAn } from './zaman.js';

export const sinirla = (x, alt = 0, ust = 100) => Math.max(alt, Math.min(ust, x));

function esikTutuyor(e, d) {
  if (e.ustu !== undefined) return d[e.durum] > e.ustu ? d[e.durum] - e.ustu : 0;
  if (e.alti !== undefined) return d[e.durum] < e.alti ? e.alti - d[e.durum] : 0;
  return 0;
}

// Ruh halinin yöneldiği değer: temel değer + etkenler
export function ruhHedefi(d, cfg) {
  let hedef = cfg.ruh.temel;
  for (const e of cfg.ruh.etkenler) hedef += esikTutuyor(e, d) * e.carpan;
  return sinirla(hedef);
}

// Bir saatlik (ya da oranlı daha kısa) dilim uygular
function adim(d, saat, tur, cfg) {
  const oran = cfg.saatlik[tur] || cfg.saatlik.normal;
  for (const [k, v] of Object.entries(oran)) d[k] = sinirla(d[k] + v * saat);

  // Ruh hali hedefe doğru kayar (ani değil)
  const hedef = ruhHedefi(d, cfg);
  d.ruh = sinirla(d.ruh + (hedef - d.ruh) * Math.min(1, cfg.ruh.yaklasmaSaatlik * saat));

  // Sağlık
  let s = 0;
  let sorun = false;
  for (const e of cfg.saglik.etkenler) {
    if (esikTutuyor(e, d) > 0) { s += e.saatlik; sorun = true; }
  }
  if (!sorun) s += cfg.saglik.iyilesmeSaatlik;
  d.saglik = sinirla(d.saglik + s * saat);
}

// Zamanı ilerletir. tur: 'normal' | 'dinlenme' | 'agir' | 'uyku'
// Döner: geçilen eşik uyarıları [{ id, durum, metin }]
export function zamanGecir(durum, dakika, tur, cfg) {
  const d = durum.durumlar;
  const once = { ...d };
  let kalan = Math.max(0, Math.round(dakika));
  while (kalan > 0) {
    const parca = Math.min(60, kalan);
    adim(d, parca / 60, tur, cfg);
    kalan -= parca;
  }
  durum.zaman.dakika += Math.max(0, Math.round(dakika));
  for (const k of Object.keys(d)) d[k] = Math.round(d[k] * 100) / 100;
  return esikleriBul(once, d, cfg);
}

export function esikleriBul(once, sonra, cfg) {
  const sonuc = [];
  for (const u of cfg.uyarilar) {
    const a = once[u.durum], b = sonra[u.durum];
    if (u.yukari !== undefined && a < u.yukari && b >= u.yukari) sonuc.push(u);
    if (u.asagi !== undefined && a > u.asagi && b <= u.asagi) sonuc.push(u);
  }
  return sonuc;
}

const saatDk = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

// Şu an yatılırsa ne kadar uyunur?
// Gece (18:00–05:00 arası yatış): sabah uyanma saatine kadar; en az enAzGeceUykusuDk, en çok enCokGeceUykusuDk.
// Gündüz: gunduzUykusuDk kadar.
export function uykuPlani(dakika, cfg) {
  const u = cfg.uyku;
  const s = saatKac(dakika);
  const gece = s >= u.geceBaslangicSaat || s < u.geceBitisSaat;
  if (!gece) return { sure: u.gunduzUykusuDk, gece: false };
  let uyanis = sonrakiAn(dakika, u.uyanma.saat, u.uyanma.dakika);
  if (uyanis - dakika < u.enAzGeceUykusuDk) uyanis = dakika + u.enAzGeceUykusuDk;
  if (uyanis - dakika > u.enCokGeceUykusuDk) uyanis = dakika + u.enCokGeceUykusuDk;
  return { sure: uyanis - dakika, gece: true };
}

// Uyku düzeni: düzenli saatte, yeterli süre uyumak düzeni artırır; geç ya da gündüz uyumak düşürür.
export function uykuDuzeniGuncelle(durum, baslangicDk, sure, cfg) {
  const u = cfg.uyku;
  const m = gunDakikasi(baslangicDk);
  const erken = saatDk(u.duzenliBaslangic.en_erken), gec = saatDk(u.duzenliBaslangic.en_gec);
  const saatUygun = erken > gec ? (m >= erken || m <= gec) : (m >= erken && m <= gec);
  const sureUygun = sure >= u.duzenliSureDk.en_az && sure <= u.duzenliSureDk.en_cok;
  const d = durum.durumlar;
  if (saatUygun && sureUygun) d.uyku = sinirla(d.uyku + u.duzenArtis);
  else if (sure >= 180) d.uyku = sinirla(d.uyku - u.duzenAzalis);
  return saatUygun && sureUygun;
}
