// Ekonomi (adım 2.7): AÜ oranlarını o günün ₺'sine çevirir. Fiyatlar fiyat endeksiyle, ücretler ücret
// endeksiyle büyür (kendi ilerleyen dünya, durum.dunya). Tanımlar data/ekonomi.json'da.

// Görünen fiyatlar "esnaf yuvarlaması"yla: 100 ₺ altı 1 ₺'ye, 1.000 ₺ altı 5 ₺'ye, üstü 50 ₺'ye
export function yuvarla(tl) {
  const adim = tl < 100 ? 1 : tl < 1000 ? 5 : 50;
  return Math.max(adim === 1 ? 1 : adim, Math.round(tl / adim) * adim);
}

const endeks = (durum, tur) => (tur === 'ucret' ? durum?.dunya?.ucretEndeksi : durum?.dunya?.fiyatEndeksi) ?? 1;

// Bugünkü asgari ücret (₺) ve fiyatların bugünkü taban birimi
export const asgariUcret = (eko, durum) => Math.round(eko.asgariUcret * endeks(durum, 'ucret'));
export const fiyatBirimi = (eko, durum) => eko.asgariUcret * endeks(durum, 'fiyat');

export const fiyat = (eko, durum, oran) => yuvarla(oran * fiyatBirimi(eko, durum));
export const ucret = (eko, durum, oran) => yuvarla(oran * eko.asgariUcret * endeks(durum, 'ucret'));

// Mekanda bir ürünün fiyatı (mekanın fiyat seviyesi 1–5)
export function urunFiyati(eko, durum, urun, seviye = 1) {
  const u = eko.urunler[urun];
  if (!u) throw new Error('Bilinmeyen ürün: ' + urun);
  return fiyat(eko, durum, u.oran * eko.seviyeCarpani[Math.max(1, Math.min(5, seviye)) - 1]);
}

// Mekanın bir hizmetinin fiyatı (ör. 'cay_kahve' → çay); karşılığı olmayan hizmet (dinlenme, oyun) bedava
export function hizmetFiyati(eko, durum, mekan, hizmet) {
  const urun = eko.hizmetUrun[hizmet];
  return urun ? urunFiyati(eko, durum, urun, mekan.fiyat) : 0;
}

// Semtte aylık kira ve fatura
export function kira(eko, durum, semt, tip) {
  const k = eko.konut[tip];
  if (!k) throw new Error('Bilinmeyen konut tipi: ' + tip);
  return { kira: fiyat(eko, durum, k.kira * (semt?.sosyo?.kiraKatsayisi ?? 1)), fatura: fiyat(eko, durum, k.fatura) };
}

// İş türünün aylık net maaş aralığı (şirketin ücret katsayısıyla)
export function maasAraligi(eko, durum, isTuru, sirket = null) {
  const a = eko.maaslar[isTuru];
  if (!a) throw new Error('Bilinmeyen iş türü: ' + isTuru);
  const c = sirket?.ucretKatsayisi ?? 1;
  return [ucret(eko, durum, a[0] * c), ucret(eko, durum, a[1] * c)].map(x => Math.max(x, asgariUcret(eko, durum)));
}

// Ulaşım ücretleri (ulasim.js) için: o günün fiyat birimi
export const ulasimBirimi = fiyatBirimi;

export function ekonomiDogrula(eko, { isTurleri, hizmetler, ulasim } = {}) {
  const h = [];
  if (!(eko.asgariUcret > 0)) h.push('asgariUcret pozitif olmalı');
  const c = eko.seviyeCarpani || [];
  if (c.length !== 5 || c.some((x, i) => !(x > 0) || (i && x <= c[i - 1]))) h.push('seviyeCarpani 5 artan pozitif sayı olmalı');
  for (const [k, v] of Object.entries(eko.konut || {})) if (!(v.kira > 0 && v.fatura > 0) || !v.ad) h.push(`konut ${k}: ad, kira, fatura gerekli`);
  const tipler = Object.values(eko.konut || {}).map(v => v.kira);
  if (tipler.some((x, i) => i && x <= tipler[i - 1])) h.push('konut tipleri küçükten büyüğe, kirası artarak sıralanmalı');
  for (const [k, v] of Object.entries({ ...eko.urunler, ...eko.yasam })) if (!(v.oran > 0) || !v.ad) h.push(`${k}: ad ve pozitif oran gerekli`);
  for (const [hz, u] of Object.entries(eko.hizmetUrun || {})) {
    if (!eko.urunler[u]) h.push(`hizmetUrun ${hz}: bilinmeyen ürün "${u}"`);
    if (hizmetler && !hizmetler[hz]) h.push(`hizmetUrun: bilinmeyen hizmet "${hz}"`);
  }
  const aralikDenetle = (ad, a) => { if (!Array.isArray(a) || a.length !== 2 || !(a[0] >= 0) || !(a[1] >= a[0])) h.push(`${ad}: [en az, en çok] olmalı`); };
  for (const [k, a] of Object.entries(eko.maaslar || {})) { aralikDenetle(`maas ${k}`, a); if (a[0] < 1) h.push(`maas ${k}: asgari ücretin altında olamaz`); }
  if (isTurleri) for (const k of Object.keys(isTurleri)) if (!eko.maaslar?.[k]) h.push(`iş türü ${k}: maaş aralığı yok`);
  for (const [k, a] of Object.entries(eko.bahsis || {})) aralikDenetle(`bahşiş ${k}`, a);
  const s = eko.suc || {};
  for (const k of ['tefeciFaizAylik', 'haracAylik', 'kefalet', 'adliParaCezasi']) aralikDenetle(`suc.${k}`, s[k]);
  for (const k of ['siradan', 'baglantili']) aralikDenetle(`suc.avukat.${k}`, s.avukat?.[k]);
  for (const k of ['alt', 'orta', 'ust']) aralikDenetle(`suc.rutbeGeliriAylik.${k}`, s.rutbeGeliriAylik?.[k]);
  // Abonman, ayda 30 ile 60 biniş arasına denk gelmeli (az binen için pahalı, her gün gidip gelen için kârlı)
  if (ulasim && !(eko.yasam.abonman.oran > ulasim.tarife.metro * 30 && eko.yasam.abonman.oran < ulasim.tarife.metro * 60 * 1.2)) h.push('abonman ile tek biniş ücreti uyumsuz');
  return h;
}
