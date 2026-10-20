// Bayraklar ve sayaçlar.
//
//   durum.bayraklar = {
//     kalici: { ad: deger },                          // hep kalır
//     sureli: { ad: { deger, bitis } },                // bitis (oyun dakikası) geçince yok sayılır ve temizlenir
//     npc:    { npcId: { ad: deger } },                // NPC'ye özel (ör. "borc_istedi", "sirrini_biliyor")
//   }
//   durum.sayaclar = { ad: sayı }                      // NPC'ye özel sayaçlar bayraklar.npc altında sayı olarak durur
//
// Değer: true, sayı ya da kısa metin olabilir. Kaldırılan bayrak "yok"tur (undefined).

const npcBolumu = (d, npc, olustur) => {
  const kok = d.bayraklar.npc;
  if (!kok[npc] && olustur) kok[npc] = {};
  return kok[npc];
};

// secenek: { sure: dakika (süreli bayrak), npc: npcId }
export function bayrakKoy(d, ad, deger = true, { sure, npc } = {}) {
  if (npc !== undefined) { npcBolumu(d, npc, true)[ad] = deger; return; }
  if (sure !== undefined) {
    d.bayraklar.sureli[ad] = { deger, bitis: d.zaman.dakika + Math.max(0, Math.round(sure)) };
    delete d.bayraklar.kalici[ad];
    return;
  }
  d.bayraklar.kalici[ad] = deger;
  delete d.bayraklar.sureli[ad];
}

export function bayrakAl(d, ad, { npc } = {}) {
  if (npc !== undefined) return npcBolumu(d, npc, false)?.[ad];
  if (ad in d.bayraklar.kalici) return d.bayraklar.kalici[ad];
  const s = d.bayraklar.sureli[ad];
  if (s && s.bitis > d.zaman.dakika) return s.deger;
  return undefined;
}

// Süreli bayrağın kalan süresi (dakika); süreli değilse ya da yoksa null
export function bayrakKalanSure(d, ad) {
  const s = d.bayraklar.sureli[ad];
  return s && s.bitis > d.zaman.dakika ? s.bitis - d.zaman.dakika : null;
}

export function bayrakKaldir(d, ad, { npc } = {}) {
  if (npc !== undefined) {
    const b = npcBolumu(d, npc, false);
    if (b) { delete b[ad]; if (!Object.keys(b).length) delete d.bayraklar.npc[npc]; }
    return;
  }
  delete d.bayraklar.kalici[ad];
  delete d.bayraklar.sureli[ad];
}

// Süresi dolmuş bayrakları siler (zaman geçtikçe çağrılır; kayıt şişmesin)
export function sureliTemizle(d) {
  for (const [ad, s] of Object.entries(d.bayraklar.sureli)) if (s.bitis <= d.zaman.dakika) delete d.bayraklar.sureli[ad];
}

export function sayacAl(d, ad, { npc } = {}) {
  const v = npc !== undefined ? npcBolumu(d, npc, false)?.[ad] : d.sayaclar[ad];
  return typeof v === 'number' ? v : 0;
}

export function sayacEkle(d, ad, miktar = 1, { npc } = {}) {
  const yeni = sayacAl(d, ad, { npc }) + miktar;
  if (npc !== undefined) npcBolumu(d, npc, true)[ad] = yeni;
  else d.sayaclar[ad] = yeni;
  return yeni;
}

export function sayacYaz(d, ad, deger, { npc } = {}) {
  if (npc !== undefined) npcBolumu(d, npc, true)[ad] = deger;
  else d.sayaclar[ad] = deger;
}
