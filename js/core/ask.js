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
  const tekrar = { goz: 2, dokun: 2 }; // aynı oturumda iki kez olabilir
  const ekle = (id, kosul) => { if (kosul && (o.kullanilan['ask:' + id] ?? 0) < (tekrar[id] ?? 1)) l.push({ konu: 'ask:' + id, ad: X.konular[id].baslik, dakika: X.konular[id].sure }); };
  ekle('goz', true);
  ekle('dokun', ig >= X.esikler.dokun || ar >= 15 || sevgiliMi(k));
  ekle('acik', ar >= X.esikler.acik || sevgiliMi(k));
  ekle('cik', ar >= X.esikler.cik && (k.numara || sevgiliMi(k)) && (saat >= 18 || saat < 4) && k.cikRet !== gun);
  ekle('ayril', sevgiliMi(k));
  // 3.16: tahmin edilemeyen hamleler (öp, fısılda, iddia, dans, telefon, peçete, içini dök)
  const m = mekanBul(veri.dunya, o.mekan);
  for (const [id, h] of Object.entries(X.serbest || {})) {
    if (id.startsWith('_') || o.kullanilan['ask:' + id]) continue;
    const c = h.kosul || {}, sa = h.sart;
    // sart (3.20): hepsi tutmalı — ilişki türü, en az gece/yakınlık/arzu, iki kullanım arası gün
    if (sa && ((sa.tur && !sa.tur.includes(k.iliskiTuru)) || (sa.gece && (k.iliski.gece ?? 0) < sa.gece) || (sa.yakinlik && (k.iliski.yakinlik ?? 0) < sa.yakinlik)
      || (sa.arzu && ar < sa.arzu) || (sa.aralik && gun - (k.serbestGun?.[id] ?? -Infinity) < sa.aralik))) continue;
    if (c.numaraYok && (k.numara || sahteSurer(k))) continue;
    if (c.mekan && !c.mekan.includes(m?.tur)) continue;
    const acik = sa || sevgiliMi(k) || (c.ilgi !== undefined && ig >= c.ilgi) || (c.arzu !== undefined && ar >= c.arzu) || (c.yakinlik !== undefined && (k.iliski.yakinlik ?? 0) >= c.yakinlik);
    if (acik) l.push({ konu: 'ask:' + id, ad: h.baslik, dakika: h.sure });
  }
  return l;
}

// Yanlış numara verdi ve sen henüz fark etmedin (3.16)
export const sahteSurer = k => !!k.sahteNumara && !k.sahteNumara.ogrendi;
const aksamMi = durum => { const sa = gunDakikasi(durum.zaman.dakika) / 60; return sa >= 18 || sa < 4; };

// Süzgeçleri tutan sonuçlardan ağırlıklı seçim: a + b·(skor/10) + tarz + partner (+ ısrar)
export function sonucSec(durum, k, n, sonuclar, s, rng, tarz, ek = {}) {
  const partner = partnerli(n);
  const adaylar = [];
  for (const [id, x] of Object.entries(sonuclar)) {
    if (x.aksam && !aksamMi(durum)) continue;
    if (x.numaraYok && (k.numara || sahteSurer(k))) continue;
    if (x.sadecePartner && !partner) continue;
    if (x.partnerYok && partner) continue;
    if (x.ilkOpucuk && k.ilkOpucuk !== undefined) continue;
    if (x.randevuYok && k.randevu >= gunNo(durum.zaman.dakika)) continue;
    if (x.flortKosul && !ek.flort) continue;
    const w = (x.a ?? 1) + (x.b ?? 0) * s / 10 + (x.tarz?.[tarz] ?? 0) + (partner ? x.partner ?? 0 : 0) + (x.israrEk ?? 0) * (ek.israr ?? 0) + (x.iliski?.[k.iliskiTuru] ?? 0);
    if (w > 0) adaylar.push({ id, agirlik: w });
  }
  return adaylar.length ? rng.agirlikliSec(adaylar).id : null;
}

// Bir sonucun özel işleri. Döner: oturum sürüyor mu
export function ozelUygula(durum, veri, rng, n, k, ozel = [], p, ar, s = 0) {
  const gun = gunNo(durum.zaman.dakika), partner = partnerli(n);
  for (const o of ozel) {
    if (o === 'opucuk') {
      if (durum.sohbet) durum.sohbet.son = 'opucuk';
      if (k.ilkOpucuk === undefined) { k.ilkOpucuk = gun; k.anilar.push({ zaman: durum.zaman.dakika, metin: 'ilk kez öpüştünüz' }); }
      if (!k.iliskiTuru) k.iliskiTuru = 'flort';
      if (partner) k.iliski.risk = (k.iliski.risk ?? 0) + 2;
    } else if (o === 'flort') { if (!k.iliskiTuru) k.iliskiTuru = 'flort'; }
    else if (o === 'sevgili') {
      if (k.iliskiTuru !== 'sevgili') k.anilar.push({ zaman: durum.zaman.dakika, metin: 'birbirinize "seni seviyorum" dediniz' });
      k.iliskiTuru = 'sevgili';
    }
    else if (o === 'risk') k.iliski.risk = (k.iliski.risk ?? 0) + 1;
    else if (o === 'kiskanclik') kiskanclikYay(durum, veri, n.id, rng);
    else if (o === 'numara' && !k.numara) {
      k.numara = true;
      if (k.sahteNumara) k.sahteNumara.ogrendi = true;
      if (partner) k.gizli = true;
      k.anilar.push({ zaman: durum.zaman.dakika, metin: 'numarasını verdi' });
      p.push({ tur: 'sistem', metin: `${n.hitapAdi} numarasını verdi` });
    } else if (o === 'randevu' && ar.randevu && !(k.randevu >= gun)) {
      if (partner) k.gizli = true;
      ar.randevu(durum, veri, n, k);
      p.push({ tur: 'sistem', metin: `Yarın akşam ${n.hitapAdi} ile buluşacaksın` });
    } else if (o === 'cik') {
      const olay = partner ? 'birlikte_gece_gizli' : 'birlikte_gece';
      durum.zamanlayicilar.unshift({ zaman: durum.zaman.dakika, olay, baglam: { npc: { kisi: n.id }, degisken: { kisi: { ad: n.hitapAdi, cinsiyet: n.cinsiyet } } } });
      if (partner) { k.iliski.risk = (k.iliski.risk ?? 0) + 2; k.gizli = true; }
      delete durum.sohbet;
    } else if (o === 'kalkar' || o === 'senKalk') {
      k.ayrildi = { zaman: durum.zaman.dakika, kim: o === 'kalkar' ? 'o' : 'sen' };
      delete durum.sohbet;
    } else if (o === 'pecete') {
      // Arar mı? Kimse bilmez: ilgisi yüksekse çoğunlukla, düşükse ara sıra
      if (rng.olasilik(sinir((s + 10) / 50, 0.12, 0.9))) {
        const zaman = durum.zaman.dakika + rng.aralik(3 * 60, 30 * 60);
        durum.zamanlayicilar.push({ zaman, olay: 'pecete_mesaj', baglam: { npc: { kisi: n.id }, degisken: { kisi: { ad: n.hitapAdi, cinsiyet: n.cinsiyet } } } });
        durum.zamanlayicilar.sort((a, b) => a.zaman - b.zaman);
      }
      k.peceteGun = gun;
    }
  }
  return !!durum.sohbet;
}

function etkiUygula(k, etki = {}, partner) {
  for (const [ad, x] of Object.entries(etki)) {
    if (ad === 'arzu') arzuEkle(k, x); else k.iliski[ad] = (k.iliski[ad] ?? 0) + x;
  }
  if (partner && (etki.arzu ?? 0) > 0) k.iliski.risk = (k.iliski.risk ?? 0) + 1; // herkesin gözü önünde
}

function serbestHamle(durum, veri, rng, n, k, h, s, tarz, p, ar, hamle) {
  (k.serbestGun ??= {})[hamle] = gunNo(durum.zaman.dakika);
  p.push(...ar.anlat(durum, veri, n, k, h.oyuncu, rng));
  const id = sonucSec(durum, k, n, h.sonuclar, s, rng, tarz);
  if (!id) return true;
  const x = h.sonuclar[id];
  p.push(...ar.anlat(durum, veri, n, k, havuz(x.metin, tarz), rng));
  etkiUygula(k, x.etki, partnerli(n));
  if ((x.etki?.gerginlik ?? 0) > 0 && durum.sohbet) durum.sohbet.son = 'kirildi';
  const surer = ozelUygula(durum, veri, rng, n, k, x.ozel, p, ar, s);
  ozetEkle(durum, n.id, `Oyuncu: "${h.baslik}". Sonuç: ${id}.`);
  return surer && (x.etki?.arzu ?? 0) > 0;
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
  if (X.serbest?.[konu]) return serbestHamle(durum, veri, rng, n, k, X.serbest[konu], s, tarz, p, ar, konu);
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
      durum.zamanlayicilar.unshift({ zaman: durum.zaman.dakika, olay, baglam: { npc: { kisi: n.id }, degisken: { kisi: { ad: n.hitapAdi, cinsiyet: n.cinsiyet } } } });
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

// Gerginlik eşiği aşılınca (3.19): kapı kapanmaz, yüzleşme başlar. Oturum açılmış olmalı.
function gerginNeden(durum, k) {
  if (k.duydugu && !k.duydugu.konustu) return 'kiskanc';
  const son = Math.max(k.sonGorus ?? -Infinity, ...(k.anilar || []).map(a => a.zaman ?? a.z ?? -Infinity));
  if (k.iliskiTuru === 'sevgili' && gunNo(durum.zaman.dakika) - Math.floor(son / 1440) > 7) return 'ihmal';
  if ((k.sinirSayisi ?? 0) >= 3) return 'israr';
  return 'genel';
}
export function gerginKarsilama(durum, veri, rng, n, k, p, ar) {
  const G = A(veri)?.gergin;
  if (!G || !durum.sohbet) return false;
  const neden = gerginNeden(durum, k);
  p.push(...ar.anlat(durum, veri, n, k, G.giris[neden], rng));
  if (neden === 'kiskanc') k.duydugu.konustu = true;
  durum.sohbet.bekleyen = { tur: 'ask', alan: 'gergin', neden };
  return true;
}

export function askSecenekler(durum, veri) {
  const X = A(veri), dk = veri.npc.sohbet.sure.cevap;
  if (durum.sohbet?.bekleyen?.alan === 'gergin') {
    const k = durum.npcler?.[durum.sohbet.npc];
    return Object.entries(X.gergin.secenekler).filter(([, c]) => !c.sevgili || sevgiliMi(k)).map(([id, c]) => ({ konu: 'cevap:a:' + id, ad: c.ad, dakika: dk }));
  }
  if (durum.sohbet?.bekleyen?.alan === 'teklif') return Object.entries(X.teklif).map(([id, c]) => ({ konu: 'cevap:a:' + id, ad: c.ad, dakika: dk }));
  return Object.entries(X.kiskanclikCevap).map(([id, c]) => ({ konu: 'cevap:a:' + id, ad: c.ad, dakika: dk }));
}

export function askCevapla(durum, veri, rng, n, k, id, p, ar) {
  const X = A(veri);
  if (durum.sohbet?.bekleyen?.alan === 'gergin') {
    const G = X.gergin, c = G.secenekler[id];
    if (!c || (c.sevgili && !sevgiliMi(k))) return { tamam: false, sebep: 'Bunu şimdi söyleyemezsin.' };
    p.push(...ar.sen(durum, veri, n, k, c.soz, rng));
    const g0 = k.iliski.gerginlik ?? 0, guven = k.iliski.guven ?? 0, yak = k.iliski.yakinlik ?? 0;
    if (id === 'git') {
      p.push(...ar.anlat(durum, veri, n, k, G.sonuc.git._, rng));
      k.iliski.gerginlik = g0 - 1;
      k.ayrildi = { zaman: durum.zaman.dakika, kim: 'sen' };
      delete durum.sohbet;
      return { tamam: true };
    }
    const sans = sinir(({ ozur: 0.5, dinle: 0.55, saril: 0.25 + arzu(k) / 120 })[id] + guven / 40 + yak / 120 - (g0 - 8) / 30, 0.1, 0.9);
    const iyi = rng.olasilik(sans);
    p.push(...ar.anlat(durum, veri, n, k, G.sonuc[id][iyi ? 'iyi' : 'kotu'], rng));
    k.iliski.gerginlik = Math.max(0, g0 + (iyi ? -({ ozur: 5, dinle: 4, saril: 6 })[id] : 1));
    if (iyi && id === 'dinle') k.iliski.guven = guven + 1;
    if (iyi && id === 'saril') arzuEkle(k, 4);
    if ((k.iliski.gerginlik ?? 0) < veri.npc.sohbet.gerginlikEsigi) {
      if (iyi) p.push(...ar.anlat(durum, veri, n, k, G.baristi, rng));
      if (iyi) k.anilar.push({ zaman: durum.zaman.dakika, metin: 'kavgadan sonra barıştınız' });
      durum.sohbet.bekleyen = null;
    } else if (!iyi && (k.iliski.gerginlik ?? 0) >= veri.npc.sohbet.gerginlikEsigi + 4) {
      p.push(...ar.anlat(durum, veri, n, k, G.bitti, rng));
      k.ayrildi = { zaman: durum.zaman.dakika, kim: 'o' };
      delete durum.sohbet;
    }
    return { tamam: true };
  }
  if (durum.sohbet?.bekleyen?.alan === 'teklif') {
    const t = X.teklif[id];
    if (!t) return { tamam: false, sebep: 'Bunu şimdi söyleyemezsin.' };
    p.push(...ar.sen(durum, veri, n, k, t.soz, rng));
    if (t.cevap) p.push(...ar.anlat(durum, veri, n, k, havuz(t.cevap, tarzi(durum, veri, n)), rng));
    etkiUygula(k, t.etki, false);
    durum.sohbet.bekleyen = null;
    ozelUygula(durum, veri, rng, n, k, t.ozel, p, ar);
    return { tamam: true };
  }
  const c = X.kiskanclikCevap[id];
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
  if (X?.surpriz && o && !o.surpriz && arzu(k) >= 25 && rng.olasilik(0.12 + arzu(k) / 400)) return npcSurpriz(durum, veri, rng, n, k, p, ar);
  if (!X || !o || o.atilim || arzu(k) < X.esikler.atilim || !rng.olasilik(0.35)) return false;
  p.push(...ar.anlat(durum, veri, n, k, havuz(X.npcHamle, tarzi(durum, veri, n)), rng));
  arzuEkle(k, 2);
  o.atilim = true;
  return true;
}

// Kişinin kendiliğinden, beklenmedik hamlesi (oturumda bir kez): numarasını telefonuna yazar, seni öper, yarın için
// sözünü alır, "evim on dakika" der (sen karar verirsin), masanın altında bacağını dayar
function npcSurpriz(durum, veri, rng, n, k, p, ar) {
  const X = A(veri), o = durum.sohbet, tarz = tarzi(durum, veri, n);
  const adaylar = Object.entries(X.surpriz).filter(([, x]) => !(x.arzu > arzu(k))).map(([id, x]) => ({ id, ...x, a: 1, b: 0 }));
  const id = sonucSec(durum, k, n, Object.fromEntries(adaylar.map(x => [x.id, x])), 0, rng, tarz);
  if (!id) return false;
  const x = X.surpriz[id];
  o.surpriz = true;
  p.push(...ar.anlat(durum, veri, n, k, havuz(x.metin, tarz), rng));
  etkiUygula(k, x.etki, partnerli(n));
  if (x.teklif) { o.bekleyen = { tur: 'ask', alan: 'teklif' }; return true; }
  ozelUygula(durum, veri, rng, n, k, x.ozel, p, ar);
  arzuEkle(k, 3);
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

