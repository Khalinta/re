// Aşk, arzu, kıskançlık (adım 3.14). Yakınlıktan ayrı bir "arzu" (k.iliski.arzu, 0–100) karşılaştıkça alevlenir,
// görüşmeyince söner. Sohbette yeni hamleler: göz göze gelmek, dokunmak, açık konuşmak (isteğini söylemek), "buradan
// çıkalım" (kabul ederse aynı gece birlikte_gece olayı), ayrılmak. Kişi arzusu yüksekse kendisi de yaklaşır.
// Başka biriyle flörtün duyulabilir: sevgilin/flörtün o kişiyi tanıyorsa ya da oradaysa kıskanır; bir sonraki
// karşılaşmada hesap sorar. Her şey kişinin flört tarzına (utangaç, açık sözlü, alaycı, romantik, temkinli, oyunbaz)
// ve kıskançlığına göre. Cinsel sahneler sansürsüz ama betimlemesiz (K64); 18 yaş altı yok (flortUygun).
// Veri: data/npc/flort.json → ask. sohbet.js konuşma araçlarını (soyle, anlat, sen) verir.
import { gunNo, gunDakikasi } from './zaman.js';
import { derinlik } from './kart.js';
import { tanisiyorMu, kisi, mekandakiler } from './insanlar.js';
import { mekanBul } from './mekan.js';
import { dilim } from './zaman.js';
import { ozetEkle } from './hafiza.js';
import { partnerli } from './sadakat.js';

const A = veri => veri.npc.flort?.ask;
const sinir = (x, a, b) => Math.max(a, Math.min(b, x));
export const arzu = k => k?.iliski?.arzu ?? 0;
export function arzuEkle(k, x) { k.iliski.arzu = sinir(arzu(k) + x, 0, 100); }
const tarzi = (durum, veri, n) => (veri.npc.derinlik ? derinlik(durum.seed, n, veri).flortId : null) ?? 'acik';
const havuz = (grup, tarz) => !grup ? [] : Array.isArray(grup) ? grup : [...(grup[tarz] || []), ...(grup._ || [])];
const sevgiliMi = k => ['flort', 'sevgili'].includes(k.iliskiTuru);

// Bu oturumda açılabilecek romantik hamleler. ig: kişinin ilgisi (sohbet.js ilgi)
export function askKonulari(durum, veri, n, k, ig) {
  const X = A(veri);
  if (!X) return [];
  const o = durum.sohbet, gun = gunNo(durum.zaman.dakika), saat = gunDakikasi(durum.zaman.dakika) / 60;
  const ar = arzu(k), l = [];
  const ekle = (id, kosul) => { if (kosul && !o.kullanilan['ask:' + id]) l.push({ konu: 'ask:' + id, ad: X.konular[id].baslik, dakika: X.konular[id].sure }); };
  ekle('goz', true);
  ekle('dokun', ig >= X.esikler.dokun || ar >= 15 || sevgiliMi(k));
  ekle('acik', ar >= X.esikler.acik || sevgiliMi(k));
  ekle('cik', ar >= X.esikler.cik && (k.numara || sevgiliMi(k)) && (saat >= 18 || saat < 4) && k.cikRet !== gun);
  ekle('ayril', sevgiliMi(k));
  return l;
}

// Başarı puanı: ilgi + arzu
const skor = (ig, k) => ig + arzu(k) * 0.4;

// Romantik hamle. ar: { soyle, anlat, sen }. Döner: ardından kişi soru sorabilir mi
export function askHamlesi(durum, veri, rng, n, k, konu, ig, p, ar) {
  const X = A(veri), tarz = tarzi(durum, veri, n), s = skor(ig, k), gun = gunNo(durum.zaman.dakika);
  const anlat = grup => p.push(...ar.anlat(durum, veri, n, k, havuz(grup, tarz), rng));
  const soyle = anlat; // havuzlar anlatım: sözler tırnak içinde, hareketle birlikte
  const sen = liste => p.push(...ar.sen(durum, veri, n, k, liste, rng));
  const partner = partnerli(n);
  k.bilinen ??= {};
  if (konu === 'goz') {
    const sev = s >= X.esikler.gozIyi ? 'iyi' : s >= X.esikler.gozOrta ? 'orta' : 'kotu';
    anlat(X.goz.sen);
    anlat(X.goz[sev]);
    arzuEkle(k, { iyi: 5, orta: 2, kotu: 0 }[sev]);
    k.iliski.cekim = (k.iliski.cekim ?? 0) + { iyi: 2, orta: 1, kotu: -1 }[sev];
    if (sev !== 'kotu') kiskanclikYay(durum, veri, n.id, rng);
    return sev !== 'kotu';
  }
  if (konu === 'dokun') {
    const sans = sinir((s - 5) / 40, 0.08, 0.95);
    anlat(X.dokun.sen);
    if (rng.olasilik(sans)) {
      anlat(!k.ilkTemas ? X.dokun.ilk : X.dokun.evet);
      if (!k.ilkTemas) { k.ilkTemas = gun; k.anilar.push({ zaman: durum.zaman.dakika, metin: 'ilk kez dokundun ona; çekmedi' }); }
      arzuEkle(k, 8);
      k.iliski.cekim = (k.iliski.cekim ?? 0) + 3;
      if (!k.iliskiTuru) k.iliskiTuru = 'flort';
      if (partner) k.iliski.risk = (k.iliski.risk ?? 0) + 1;
      kiskanclikYay(durum, veri, n.id, rng);
      return true;
    }
    anlat(X.dokun.hayir);
    arzuEkle(k, -2);
    k.iliski.cekim = (k.iliski.cekim ?? 0) - 2;
    return false;
  }
  if (konu === 'acik') {
    sen(X.acik.oyuncu[(k.iliski.gece ?? 0) > 0 ? 'yakin' : 'ilk']);
    const bonus = { acik: 0.15, oyunbaz: 0.1, alayci: 0.05, romantik: -0.05, temkinli: -0.1, utangac: -0.15 }[tarz] ?? 0;
    const p0 = sinir((s - 15) / 35 + bonus, 0.05, 0.95);
    if (rng.olasilik(p0)) {
      soyle(X.acik.evet);
      arzuEkle(k, 10);
      k.iliski.cekim = (k.iliski.cekim ?? 0) + 4;
      if (!k.iliskiTuru) k.iliskiTuru = 'flort';
      ozetEkle(durum, n.id, 'Oyuncu ona açıkça istediğini söyledi; o da karşılık verdi.');
      kiskanclikYay(durum, veri, n.id, rng);
    } else if (s >= X.esikler.kizdi) {
      anlat(X.acik.kacamak);
      arzuEkle(k, 3);
    } else {
      soyle(X.acik.kizdi);
      arzuEkle(k, -6);
      k.iliski.gerginlik = (k.iliski.gerginlik ?? 0) + 3;
    }
    return false;
  }
  if (konu === 'cik') {
    sen(X.cik.oyuncu);
    const p0 = sinir((s - 30) / 30, 0.05, 0.92);
    if (rng.olasilik(p0)) {
      anlat(partner ? X.cik.gizli : X.cik.evet);
      // Aynı gece: sohbetten hemen sonra olay (vakti gelmiş zamanlayıcı)
      const olay = partner ? 'birlikte_gece_gizli' : 'birlikte_gece';
      durum.zamanlayicilar.unshift({ zaman: durum.zaman.dakika, olay, baglam: { npc: { kisi: n.id }, degisken: { kisi: { ad: n.hitapAdi } } } });
      if (partner) { k.iliski.risk = (k.iliski.risk ?? 0) + 2; k.gizli = true; }
      arzuEkle(k, 6);
      delete durum.sohbet;
      return false;
    }
    anlat(X.cik.hayir);
    arzuEkle(k, 2);
    k.cikRet = gun;
    return false;
  }
  if (konu === 'ayril') {
    sen(X.ayril.oyuncu);
    const oz = n.ozellikler || [];
    const tepki = arzu(k) >= 40 ? 'aglar' : oz.includes('kavgaci') || oz.includes('gururlu') || oz.includes('alingan') ? 'kizar' : 'rahat';
    soyle(X.ayril[tepki]);
    k.iliskiTuru = 'eski';
    k.gizli = false;
    k.iliski.gerginlik = (k.iliski.gerginlik ?? 0) + (tepki === 'kizar' ? 6 : 3);
    k.iliski.yakinlik = (k.iliski.yakinlik ?? 0) - 10;
    k.iliski.arzu = Math.floor(arzu(k) / 2);
    k.anilar.push({ zaman: durum.zaman.dakika, metin: 'ondan ayrıldın' });
    ozetEkle(durum, n.id, 'Oyuncu onunla ayrıldı.');
    delete durum.sohbet;
    return false;
  }
  return true;
}

// ------------------------------------------------------------------ kıskançlık

// Başka biriyle flört ettin (flirtId). Sevgilin/flörtün bunu duyabilir: o kişiyi tanıyorsa, şu an oradaysa daha çok
export function kiskanclikYay(durum, veri, flirtId, rng) {
  const m = durum.sohbet?.mekan ? mekanBul(veri.dunya, durum.sohbet.mekan) : null;
  const burada = m ? mekandakiler(durum, veri, m, m.kalabalik?.[dilim(durum.zaman.dakika).id] ?? 0) : [];
  for (const [id, k] of Object.entries(durum.npcler || {})) {
    if (id === flirtId || !sevgiliMi(k) || arzu(k) < 12 || k.duydugu && !k.duydugu.konustu) continue;
    const p = 0.08 + (tanisiyorMu(veri, durum.seed, id, flirtId) ? 0.35 : 0) + (burada.includes(id) ? 0.4 : 0);
    if (!rng.olasilik(p)) continue;
    const n = kisi(veri, durum.seed, id, k.sablon);
    const ks = veri.npc.derinlik ? derinlik(durum.seed, n, veri).kiskanclik : 3;
    k.duydugu = { kisi: flirtId, gun: gunNo(durum.zaman.dakika), konustu: false };
    k.iliski.gerginlik = (k.iliski.gerginlik ?? 0) + Math.ceil(ks / 2);
  }
}

// Yanına oturunca: duyduysa hesap sorar (bekleyen: kıskançlık sorusu). Döner: oldu mu
export function askKarsilama(durum, veri, rng, n, k, p, ar) {
  const X = A(veri);
  if (!X || !k.duydugu || k.duydugu.konustu || !durum.sohbet) return false;
  const rakip = kisi(veri, durum.seed, k.duydugu.kisi);
  const ks = veri.npc.derinlik ? derinlik(durum.seed, n, veri).kiskanclik : 3;
  const sev = ks >= 4 ? 'yuksek' : ks >= 3 ? 'orta' : 'dusuk';
  p.push(...ar.anlat(durum, veri, n, k, havuz(X.kiskanclik[sev], tarzi(durum, veri, n)), rng, { rakipAd: rakip?.hitapAdi ?? 'o' }));
  k.duydugu.konustu = true;
  durum.sohbet.bekleyen = { tur: 'ask', alan: 'kiskanclik' };
  return true;
}

export function askSecenekler(durum, veri) {
  const X = A(veri), dk = veri.npc.sohbet.sure.cevap;
  return Object.entries(X.kiskanclikCevap).map(([id, c]) => ({ konu: 'cevap:a:' + id, ad: c.ad, dakika: dk }));
}

export function askCevapla(durum, veri, rng, n, k, id, p, ar) {
  const X = A(veri), c = X.kiskanclikCevap[id];
  if (!c) return { tamam: false, sebep: 'Bunu şimdi söyleyemezsin.' };
  const ks = veri.npc.derinlik ? derinlik(durum.seed, n, veri).kiskanclik : 3;
  const tarz = tarzi(durum, veri, n), guven = k.iliski.guven ?? 0, ar0 = arzu(k);
  p.push(...ar.sen(durum, veri, n, k, c.soz, rng));
  let iyi;
  if (id === 'inkar') iyi = rng.olasilik(sinir(0.35 + guven / 60 - ks * 0.07, 0.05, 0.9));
  else if (id === 'ozur') iyi = ar0 >= 25 || rng.olasilik(0.5);
  else if (id === 'sahip') iyi = ['acik', 'oyunbaz', 'alayci'].includes(tarz) || ks <= 2;
  else iyi = guven >= 8 || ar0 >= 40;
  p.push(...ar.anlat(durum, veri, n, k, havuz(iyi ? c.iyi : c.kotu, tarz), rng));
  for (const [ad, x] of Object.entries(iyi ? c.etkiIyi : c.etkiKotu)) {
    if (ad === 'arzu') arzuEkle(k, x); else k.iliski[ad] = (k.iliski[ad] ?? 0) + x;
  }
  if ((k.iliski.gerginlik ?? 0) >= 12 && !iyi) {
    p.push(...ar.anlat(durum, veri, n, k, havuz(X.ayril.kizar, tarz), rng));
    k.iliskiTuru = 'eski';
    k.anilar.push({ zaman: durum.zaman.dakika, metin: 'kıskançlık yüzünden ayrıldınız' });
    delete durum.sohbet;
    return { tamam: true };
  }
  durum.sohbet.bekleyen = null;
  return { tamam: true };
}

// Arzusu yüksekse kişi kendisi yaklaşır (oturumda bir kez)
export function npcAtilim(durum, veri, rng, n, k, p, ar) {
  const X = A(veri), o = durum.sohbet;
  if (!X || !o || o.atilim || arzu(k) < X.esikler.atilim || !rng.olasilik(0.35)) return false;
  p.push(...ar.anlat(durum, veri, n, k, havuz(X.npcHamle, tarzi(durum, veri, n)), rng));
  arzuEkle(k, 2);
  o.atilim = true;
  return true;
}

// ------------------------------------------------------------------ zaman

// Her gün: arzu söner (sevgilide yavaş); sevgilini uzun süre görmezsen gerilir, özler
export function askGunu(durum, veri, gun) {
  for (const k of Object.values(durum.npcler || {})) {
    if (!k.iliski) continue;
    const sonucu = Math.max(k.sonGorus ?? -Infinity, ...(k.anilar || []).map(a => a.zaman ?? a.z ?? -Infinity));
    const gecen = gun - Math.floor(sonucu / 1440);
    if (arzu(k) > 0) arzuEkle(k, -({ sevgili: 1, flort: 2 }[k.iliskiTuru] ?? 3));
    if (k.iliskiTuru === 'sevgili' && gecen > 7 && (k.iliski.gerginlik ?? 0) < 8) k.iliski.gerginlik = (k.iliski.gerginlik ?? 0) + 1;
  }
}

