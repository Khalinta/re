// Metin motoru: varyasyonlar, ruh haline göre ton, koşullu çeşitler ve şablonlar.
//
// Metin biçimleri (olaylarda, aksiyonlarda, uyarılarda aynı):
//   "tek metin"
//   ["çeşit 1", "çeşit 2"]                         biri rastgele seçilir
//   [["paragraf 1", "paragraf 2"], "çeşit 2"]      bir çeşit birden çok paragraf olabilir
//   { "tur": "konusma", "konusan": "Yönetici", "metin": "..." }   paragraf nesnesi
//   { "ton": { "iyi": ..., "kotu": ..., "gergin": ..., "yorgun": ..., "varsayilan": ... } }
//        ruh haline göre: gergin (stres ≥ 75) > kotu (ruh ≤ 35) > yorgun (enerji ≤ 20) > iyi (ruh ≥ 65) > varsayilan
//        olmayan ton atlanır; hiçbiri uymazsa varsayilan
//   { "kosullu": [{ "kosul": ..., "metin": ... }, ...], "varsayilan": ... }   ilk tutan
//
// Şablon (her metin ve konuşanın adı için):
//   {karakter.ad}            değişken
//   {karakter.ad|in}         Türkçe ekle: "Deniz'in"  — ekler zincirlenir: {semt|de|ki}
//   {karakter.ad|bas}        süzgeçler: bas (ilk harf büyük), buyuk, kucuk
//   [[olmuş|olacak|olmalı]]  küçük çeşitleme: biri rastgele
// Değişkenler: karakter.*, saat, gun, tarih, dilim, mevsim, para, oyunGunu, yas + bağlamdan gelenler (baglam.degisken).
// Değer bir nesne olabilir: { "ad": "Çınaraltı Kahvesi", "iyelik": true } — ek doğru kaynaştırmayla gelir (Kahvesi'ne).
import { ek, basHarfBuyuk, buyuk, kucuk } from './tr.js';
import { kosulAcikla } from './kosul.js';
import { tarihAl, dilim, mevsim, MEVSIMLER, gunNo, yas } from './zaman.js';
import { saat, tarih, GUNLER, para } from './format.js';

const SUZGECLER = { bas: basHarfBuyuk, buyuk, kucuk };
const TON_SIRASI = [
  ['gergin', d => d.stres >= 75],
  ['kotu', d => d.ruh <= 35],
  ['yorgun', d => d.enerji <= 20],
  ['iyi', d => d.ruh >= 65],
];

export function tonSec(durumlar) {
  for (const [ton, f] of TON_SIRASI) if (f(durumlar)) return ton;
  return 'varsayilan';
}

// Şablonda kullanılabilecek değişkenler
export function degiskenler(ctx) {
  const d = ctx?.durum;
  if (!d) return { ...(ctx?.baglam?.degisken || {}) };
  const t = tarihAl(d.zaman.baslangic, d.zaman.dakika);
  return {
    karakter: d.karakter,
    saat: saat(d.zaman.dakika),
    gun: GUNLER[t.getUTCDay()],
    tarih: tarih(t, { gunAdi: false }),
    dilim: kucuk(dilim(d.zaman.dakika).ad),
    mevsim: kucuk(MEVSIMLER[mevsim(t)]),
    para: para(d.para),
    oyunGunu: gunNo(d.zaman.dakika) + 1,
    yas: d.karakter?.dogum ? yas(d.karakter.dogum, t) : undefined,
    ...(ctx.baglam?.degisken || {}),
  };
}

const yolAl = (n, yol) => yol.split('.').reduce((x, k) => (x == null ? undefined : x[k]), n);

// "{...}" ve "[[...]]" kalıplarını çözer. Bilinmeyen değişken «ad» olarak kalır ve uyarı verir.
export function sablonUygula(metin, ctx, rng, uyarilar = null) {
  if (typeof metin !== 'string' || (!metin.includes('{') && !metin.includes('[['))) return metin;
  const deg = degiskenler(ctx);
  let s = metin.replace(/\[\[([^\]]+)\]\]/g, (_, ic) => {
    const parca = ic.split('|');
    return rng ? rng.sec(parca) : parca[0];
  });
  s = s.replace(/\{([^{}]+)\}/g, (tum, ic) => {
    const [ad, ...ekler] = ic.split('|').map(x => x.trim());
    let v = yolAl(deg, ad);
    if (v === undefined || v === null) {
      if (uyarilar) uyarilar.push(`bilinmeyen değişken: ${ad}`); else console.warn('[şablon] bilinmeyen değişken:', ad);
      return `«${ad}»`;
    }
    let secenek = {};
    if (typeof v === 'object') { secenek = { iyelik: v.iyelik, okunus: v.okunus, ozel: v.ozel }; v = v.ad ?? ''; }
    let sonuc = String(v);
    const sekler = [];
    for (const e of ekler) {
      if (SUZGECLER[e]) continue;
      sekler.push(e);
    }
    if (sekler.length) sonuc = ek(v, sekler, secenek);
    for (const e of ekler) if (SUZGECLER[e]) sonuc = SUZGECLER[e](sonuc);
    return sonuc;
  });
  return s;
}

function paragrafYap(p, ctx, rng) {
  const sonuc = { tur: 'anlati', ...p };
  sonuc.metin = sablonUygula(p.metin, ctx, rng);
  if (p.konusan) sonuc.konusan = sablonUygula(p.konusan, ctx, rng);
  return sonuc;
}

// Metni paragraflara çevirir. ctx olmadan da çalışır (ton = varsayılan, koşullular atlanır).
export function metinCoz(metin, rng, ctx) {
  if (metin === undefined || metin === null) return [];
  if (typeof metin === 'string') return [paragrafYap({ metin }, ctx, rng)];
  if (Array.isArray(metin)) {
    if (!metin.length) return [];
    const cesit = metin.length === 1 ? metin[0] : rng.sec(metin);
    if (Array.isArray(cesit)) return cesit.flatMap(p => metinCoz(p, rng, ctx));
    return metinCoz(cesit, rng, ctx);
  }
  if (metin.ton) {
    const t = metin.ton;
    const durumlar = ctx?.durum?.durumlar;
    let secilen = t.varsayilan;
    if (durumlar) for (const [ton, f] of TON_SIRASI) if (t[ton] !== undefined && f(durumlar)) { secilen = t[ton]; break; }
    return metinCoz(secilen, rng, ctx);
  }
  if (metin.kosullu) {
    for (const k of metin.kosullu) if (ctx && kosulAcikla(k.kosul, ctx).tamam) return metinCoz(k.metin, rng, ctx);
    return metinCoz(metin.varsayilan, rng, ctx);
  }
  return [paragrafYap(metin, ctx, rng)];
}

// Veri doğrulaması: metin yapısı ve şablon söz dizimi (değişken adları bağlama bağlı olduğundan
// yalnızca bilinen kök adları uyarı olarak denetlenir)
const BILINEN_KOKLER = new Set(['karakter', 'saat', 'gun', 'tarih', 'dilim', 'mevsim', 'para', 'oyunGunu', 'yas', 'npc', 'mekan', 'semt', 'yer', 'kisi', 'sayi', 'tutar', 'nesne', 'olay']);
export function metinDogrula(metin, yol, { kosulDogrula } = {}) {
  const h = [];
  const gez = (m, y) => {
    if (m === undefined || m === null) return;
    if (typeof m === 'string') {
      const acik = (m.match(/\{/g) || []).length, kapali = (m.match(/\}/g) || []).length;
      if (acik !== kapali) h.push(`${y}: süslü parantezler eşleşmiyor`);
      for (const [, ic] of m.matchAll(/\{([^{}]+)\}/g)) {
        const kok = ic.split('|')[0].trim().split('.')[0];
        if (!BILINEN_KOKLER.has(kok)) h.push(`${y}: bilinmeyen değişken kökü "${kok}"`);
      }
      return;
    }
    if (Array.isArray(m)) { if (!m.length) h.push(`${y}: boş çeşit listesi`); m.forEach((x, i) => gez(x, `${y}[${i}]`)); return; }
    if (typeof m !== 'object') { h.push(`${y}: metin değil`); return; }
    if (m.ton) {
      const izinli = new Set(['iyi', 'kotu', 'gergin', 'yorgun', 'varsayilan']);
      for (const k of Object.keys(m.ton)) if (!izinli.has(k)) h.push(`${y}.ton: bilinmeyen ton "${k}"`);
      if (m.ton.varsayilan === undefined) h.push(`${y}.ton: varsayilan gerekli`);
      for (const [k, v] of Object.entries(m.ton)) gez(v, `${y}.ton.${k}`);
      return;
    }
    if (m.kosullu) {
      if (m.varsayilan === undefined) h.push(`${y}: kosullu metinde varsayilan gerekli`);
      m.kosullu.forEach((k, i) => { if (kosulDogrula) h.push(...kosulDogrula(k.kosul, `${y}.kosullu[${i}].kosul`)); gez(k.metin, `${y}.kosullu[${i}]`); });
      gez(m.varsayilan, `${y}.varsayilan`);
      return;
    }
    if (typeof m.metin !== 'string') h.push(`${y}: paragraf nesnesinde metin yok`);
    gez(m.metin, `${y}.metin`);
    if (m.konusan) gez(m.konusan, `${y}.konusan`);
  };
  gez(metin, yol);
  return h;
}
