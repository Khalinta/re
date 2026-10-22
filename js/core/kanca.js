// Konuşma kancaları (3.21) ve o anın durumu (3.22).
// Kanca: kişi bir şey söyleyince ("ev arkadaşı aramaktan yoruldum", anlattığı dert, bugünkü hali, bir dedikodu, hayali,
// bir haber, işi, memleketi) o şeye özel cevaplar sohbetin başına gelir — kim olursa olsun, aranız ne olursa olsun.
// Kişi söylediğini hatırlar (k.kancalar); sonraki görüşmede "takip" ile sorulabilir.
// An: konuşulandan bağımsız, o anın durumuna uygun seçenekler — yağmur, gece geç saat, bar ya da çay ocağı, kişinin
// bugünkü hali (sormadan da belli), az önce olanlar (kırdın mı, öpüştünüz mü), kalkmak üzere olması.
// Sonuçlar ağırlıklı çekiliş (ask.js sonucSec); metinler kişiye göre değişebilir: anahtar "oz:<özellik>", flört tarzı,
// kuşak (genc/orta/yasli), "icki:N" (kaçıncı kadeh) — tutan anahtar yoksa "_". Veri: data/npc/kanca.json.
import { gunNo, gunDakikasi, tarihAl, isoTarih } from './zaman.js';
import { sonucSec, ozelUygula, arzuEkle } from './ask.js';
import { ozetEkle } from './hafiza.js';
import { para as paraYaz } from './format.js';
import { bayrakKoy } from './bayrak.js';
import { gununHali } from './npc.js';
import { derinlik } from './kart.js';
import { gununHavasi, anlikHava } from './hava.js';

const K = veri => veri.npc.kanca?.kancalar;
const AN = veri => veri.npc.kanca?.an;
const desenler = new WeakMap();
function desen(def) {
  if (!def.desen) return null;
  if (!desenler.has(def)) desenler.set(def, new RegExp(def.desen, 'i'));
  return desenler.get(def);
}
const kusak = (n, veri) => { const ku = veri.npc.sohbet.kusak; return n.yas <= ku.genc ? 'genc' : n.yas <= ku.orta ? 'orta' : 'yasli'; };

// Kişiye ve ana göre metin havuzu
function kisiyeGore(grup, durum, veri, n) {
  if (!grup) return [];
  if (Array.isArray(grup)) return grup;
  const tarz = veri.npc.derinlik ? derinlik(durum.seed, n, veri).flortId : null;
  const icki = durum.sohbet?.icki ?? 0;
  const tutan = Object.keys(grup).filter(a => a !== '_' && ((a.startsWith('oz:') && n.ozellikler?.includes(a.slice(3))) || a === tarz || a === kusak(n, veri) || a === `icki:${icki}`));
  return tutan.length ? tutan.flatMap(a => grup[a]) : grup._ || [];
}

function kaydet(durum, n, k, id, def, deg) {
  const o = durum.sohbet;
  o.kancalar = [...(o.kancalar || []).filter(x => x !== id), id].slice(-2);
  if (deg) (o.kancaDeg ??= {})[id] = deg;
  const onceki = k.kancalar?.[id];
  (k.kancalar ??= {})[id] = { gun: gunNo(durum.zaman.dakika), cozuldu: false, dusunuyor: onceki?.dusunuyor };
  if (!onceki) ozetEkle(durum, n.id, def.olgu);
}

// Söylenen bir cümle (ya da anlatılan dert) bir kanca açıyor mu?
export function kancaTara(durum, veri, n, k, metin, dertId = null) {
  const L = K(veri), o = durum.sohbet;
  if (!L || !o || o.npc !== n.id || !k) return;
  for (const [id, def] of Object.entries(L)) {
    if ((dertId && def.dertler?.includes(dertId)) || (metin && desen(def)?.test(metin))) kaydet(durum, n, k, id, def);
  }
}
// Konuşmanın türü bir kanca açıyor mu (hal:yorgun, dedikodu, hayal, gundem, is:calisiyor, memleket...). deg: metindeki değişkenler
export function kancaEtiket(durum, veri, n, k, etiket, deg = null) {
  const L = K(veri), o = durum.sohbet;
  if (!L || !o || o.npc !== n.id || !k) return;
  for (const [id, def] of Object.entries(L)) if (def.etiket?.includes(etiket)) kaydet(durum, n, k, id, def, deg);
}

const tutar = (durum, k, c = {}) => !(c.para && durum.para < c.para) && !(c.yakinlik && (k.iliski.yakinlik ?? 0) < c.yakinlik)
  && !(c.evArkadasiYok && (durum.evArkadasi || k.evArkadasi));

export function kancaSecenekleri(durum, veri, n, k) {
  const L = K(veri), o = durum.sohbet;
  if (!L || !o || !k) return [];
  const l = [], gun = gunNo(durum.zaman.dakika);
  for (const id of o.kancalar || []) {
    const def = L[id];
    if (!def || k.kancalar?.[id]?.cozuldu) continue;
    for (const [yid, y] of Object.entries(def.yanitlar)) {
      const konu = `kanca:${id}:${yid}`;
      if (o.kullanilan[konu] || !tutar(durum, k, y.kosul)) continue;
      l.push({ konu, ad: y.ad, dakika: y.dakika ?? 5, para: y.para });
    }
  }
  for (const [id, x] of Object.entries(k.kancalar || {})) {
    const def = L[id];
    if (!def?.takip || x.cozuldu || (o.kancalar || []).includes(id) || gun - x.gun > 20 || o.kullanilan[`kanca:${id}:takip`]) continue;
    l.push({ konu: `kanca:${id}:takip`, ad: def.takip.ad, dakika: 5 });
  }
  return l;
}

// ------------------------------------------------------------------ an (o anın durumu)

function ortam(durum, veri, n) {
  const o = durum.sohbet, dk = durum.zaman.dakika, sa = gunDakikasi(dk) / 60;
  const m = o.evde ? { tur: 'ev' } : veri.dunya.mekanlar.mekanlar.find(x => x.id === o.mekan);
  let yagmur = false;
  if (veri.hava) {
    const h = anlikHava(gununHavasi(durum.seed, veri.dunya.sehir.cografya.iklim, veri.hava, isoTarih(tarihAl(durum.zaman.baslangic, dk))), gunDakikasi(dk));
    yagmur = !!(h?.yagiyor || h?.firtina);
  }
  const hal = veri.npc.gorunus ? gununHali(durum.seed, n, gunNo(dk), veri.npc.gorunus).tur : null;
  return { mekanTur: m?.tur, gece: sa >= 22 || sa < 4, yagmur, hal };
}
const icmeyen = (durum, veri, n) => veri.npc.derinlik ? (derinlik(durum.seed, n, veri).dindarlikI ?? 0) >= 3 : false;

export function anSecenekleri(durum, veri, n, k) {
  const A = AN(veri), o = durum.sohbet;
  if (!A || !o || !k) return [];
  const or = ortam(durum, veri, n), l = [];
  for (const [id, a] of Object.entries(A)) {
    if (id.startsWith('_')) continue;
    const c = a.kosul || {}, konu = 'an:' + id;
    if ((o.kullanilan[konu] ?? 0) >= (a.tekrar ?? 1)) continue;
    if (c.hal && (!c.hal.includes(or.hal) || o.kullanilan['hal'])) continue; // "Nasıl olduğunu sor" denmişse hal kancaları açık
    if (c.mekanTur && !c.mekanTur.includes(or.mekanTur)) continue;
    if (c.yagmur && !or.yagmur) continue;
    if (c.gece && !or.gece) continue;
    if (c.son && o.son !== c.son) continue;
    if (c.kalanMax !== undefined && o.kalan > c.kalanMax) continue;
    if (c.para && durum.para < c.para) continue;
    l.push({ konu, ad: a.ad, dakika: a.dakika ?? 5, para: a.para, oncelik: a.oncelik ?? 1 });
  }
  // Önce ana özgü olanlar (özür, az önce olan, kalkmak üzere, yağmur, gece), sonra mekan alışkanlıkları
  return l.sort((a, b) => b.oncelik - a.oncelik);
}

// ------------------------------------------------------------------ uygulama

// Bir cevap ya da an seçeneği. ar: { soyle, anlat, sen, randevu, dertAnlat, bulus }; ig: ilgi; flort: flörte uygun mu
export function kancaHamlesi(durum, veri, rng, n, k, konu, p, ar, { ig = 0, flort = false } = {}) {
  const o = durum.sohbet;
  let y, id, etiket, deg = {};
  if (konu.startsWith('an:')) {
    id = konu.slice(3); y = AN(veri)?.[id]; etiket = y?.ad;
  } else {
    const [, kid, yid] = konu.split(':'), def = K(veri)?.[kid];
    if (!def) return true;
    if (yid === 'takip') {
      p.push(...ar.soyle(durum, veri, n, k, kisiyeGore(def.takip.soz, durum, veri, n), rng));
      o.kancalar = [...(o.kancalar || []).filter(x => x !== kid), kid].slice(-2);
      return false;
    }
    id = kid; y = def.yanitlar[yid]; etiket = def.olgu; deg = o.kancaDeg?.[kid] || {};
  }
  if (!y) return true;
  if (y.para) durum.para -= y.para;
  p.push(...ar.sen(durum, veri, n, k, y.soz, rng, deg));
  if (y.para) p.push({ tur: 'sistem', metin: '−' + paraYaz(y.para) });
  const skor = (k.iliski.yakinlik ?? 0) + 2 * (k.iliski.guven ?? 0) + Math.max(0, ig) / 2 + (k.kancalar?.[id]?.dusunuyor ? 15 : 0);
  let sid;
  if (konu === 'an:icki') { o.icki = (o.icki ?? 0) + 1; sid = icmeyen(durum, veri, n) ? 'icmez' : 'icer'; if (sid === 'icmez') o.icki -= 1; }
  else sid = sonucSec(durum, k, n, Object.fromEntries(Object.entries(y.sonuclar).filter(([, x]) => !x.icmeyen)), skor, rng, null, { flort });
  if (!sid) return true;
  const x = y.sonuclar[sid];
  p.push(...ar.anlat(durum, veri, n, k, kisiyeGore(x.metin, durum, veri, n), rng, deg));
  for (const [ad, v] of Object.entries(x.etki || {})) {
    if (ad === 'arzu') arzuEkle(k, v); else k.iliski[ad] = (k.iliski[ad] ?? 0) + v;
  }
  if (k.iliski.gerginlik < 0) k.iliski.gerginlik = 0;
  const gun = gunNo(durum.zaman.dakika), kayit = konu.startsWith('kanca:') ? ((k.kancalar ??= {})[id] ??= { gun }) : {};
  const genel = [];
  for (const oz of x.ozel || []) {
    if (oz === 'cozuldu') kayit.cozuldu = gun;
    else if (oz === 'dusunuyor') kayit.dusunuyor = gun;
    else if (oz === 'evArkadasi') {
      durum.evArkadasi = { id: n.id, gun: gun + 1 };
      k.evArkadasi = true;
      k.anilar.push({ zaman: durum.zaman.dakika, metin: 'yanına taşınmasını teklif ettin; kabul etti' });
      p.push({ tur: 'sistem', metin: `${n.hitapAdi} yarın yanına taşınıyor` });
    } else if (oz.startsWith('alacak:')) k.alacak = (k.alacak ?? 0) + Number(oz.slice(7));
    else if (oz.startsWith('iade:')) { const t = Number(oz.slice(5)); durum.para += t; p.push({ tur: 'sistem', metin: '+' + paraYaz(t) }); }
    else if (oz.startsWith('ani:')) k.anilar.push({ zaman: durum.zaman.dakika, metin: oz.slice(4) });
    else if (oz.startsWith('kalan:')) { if (durum.sohbet) durum.sohbet.kalan += Number(oz.slice(6)); }
    else if (oz.startsWith('bayrak:')) bayrakKoy(durum, oz.slice(7), true, { sure: 30 * 1440 });
    else if (oz === 'icki') { /* sayıldı */ }
    else if (oz === 'derdiniAc') { if (durum.sohbet) durum.sohbet.acildi = true; ar.dertAnlat?.(durum, veri, rng, n, k, p); }
    else if (oz === 'sigin') ar.bulus?.(durum, veri, n, k, p);
    else if (oz === 'eveBirak') {
      k.ayrildi = { zaman: durum.zaman.dakika, kim: 'sen' };
      delete durum.sohbet;
      durum.konum = { semt: n.semt, mekan: null };
      k.gitti = durum.zaman.dakika - gunDakikasi(durum.zaman.dakika) + (gunDakikasi(durum.zaman.dakika) >= 12 * 60 ? 1440 : 0) + 8 * 60; // evinde; sabaha kadar ortalarda yok
      k.anilar.push({ zaman: durum.zaman.dakika, metin: 'gece onu eve bıraktın' });
    } else genel.push(oz); // randevu, numara, cik, senKalk...
  }
  if (genel.length) ozelUygula(durum, veri, rng, n, k, genel, p, ar);
  ozetEkle(durum, n.id, `"${etiket}": oyuncu ${String(y.ad).replace(/"/g, '')} (${sid}).`);
  return !!durum.sohbet;
}
