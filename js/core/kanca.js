// Konuşma kancaları (3.21): kişi bir şey söyleyince ("ev arkadaşı aramaktan yoruldum", anlattığı dert) o konuya özel
// cevaplar sohbetin başına gelir — kim olursa olsun, aranız ne olursa olsun teklif edebilirsin; sonucu kişiye ve
// aranıza göre (yakınlık, güven, ilgi, ilişki türü) ağırlıklı çekilir. Kişi söylediğini hatırlar (k.kancalar); sonraki
// görüşmede "takip" ile sorulabilir ve cevaplar yeniden açılır. Veri: data/npc/kanca.json.
import { gunNo } from './zaman.js';
import { sonucSec, ozelUygula, arzuEkle } from './ask.js';
import { ozetEkle } from './hafiza.js';
import { para as paraYaz } from './format.js';

const K = veri => veri.npc.kanca?.kancalar;
const havuz = (grup, tarz) => !grup ? [] : Array.isArray(grup) ? grup : [...(grup[tarz] || []), ...(grup._ || [])];
const desenler = new WeakMap();
function desen(def) {
  if (!def.desen) return null;
  if (!desenler.has(def)) desenler.set(def, new RegExp(def.desen, 'i'));
  return desenler.get(def);
}

// Söylenen bir cümle (ya da anlatılan dert) bir kanca açıyor mu? Açıyorsa oturuma ve kişinin hafızasına yaz
export function kancaTara(durum, veri, n, k, metin, dertId = null) {
  const L = K(veri), o = durum.sohbet;
  if (!L || !o || o.npc !== n.id || !k) return;
  for (const [id, def] of Object.entries(L)) {
    const tuttu = (dertId && def.dertler?.includes(dertId)) || (metin && desen(def)?.test(metin));
    if (!tuttu) continue;
    o.kancalar = [...(o.kancalar || []).filter(x => x !== id), id].slice(-2);
    const onceki = k.kancalar?.[id];
    (k.kancalar ??= {})[id] = { gun: gunNo(durum.zaman.dakika), cozuldu: onceki?.cozuldu && !dertId ? onceki.cozuldu : false, dusunuyor: onceki?.dusunuyor };
    if (!onceki) ozetEkle(durum, n.id, def.olgu);
  }
}

const tutar = (durum, k, c = {}) => !(c.para && durum.para < c.para) && !(c.yakinlik && (k.iliski.yakinlik ?? 0) < c.yakinlik)
  && !(c.evArkadasiYok && (durum.evArkadasi || k.evArkadasi));

// Sohbette gösterilecek kanca cevapları (etkin olanlar) ve önceki görüşmelerden takip soruları
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
  // Takip: daha önce söylediği, çözülmemiş bir şeyi sormak (bu oturumda açık değilse, son 20 gün)
  for (const [id, x] of Object.entries(k.kancalar || {})) {
    const def = L[id];
    if (!def?.takip || x.cozuldu || (o.kancalar || []).includes(id) || gun - x.gun > 20 || o.kullanilan[`kanca:${id}:takip`]) continue;
    l.push({ konu: `kanca:${id}:takip`, ad: def.takip.ad, dakika: 5 });
  }
  return l;
}

// Bir kanca cevabı ya da takip sorusu. ar: { soyle, anlat, sen, randevu }; ig: kişinin ilgisi; flort: flörte uygun mu
export function kancaHamlesi(durum, veri, rng, n, k, konu, p, ar, { ig = 0, flort = false } = {}) {
  const L = K(veri), [, id, yid] = konu.split(':'), def = L?.[id];
  if (!def) return true;
  if (yid === 'takip') {
    p.push(...ar.soyle(durum, veri, n, k, havuz(def.takip.soz, null), rng));
    durum.sohbet.kancalar = [...(durum.sohbet.kancalar || []).filter(x => x !== id), id].slice(-2);
    return false;
  }
  const y = def.yanitlar[yid];
  if (y.para) { durum.para -= y.para; }
  p.push(...ar.sen(durum, veri, n, k, y.soz, rng));
  if (y.para) p.push({ tur: 'sistem', metin: '−' + paraYaz(y.para) });
  const skor = (k.iliski.yakinlik ?? 0) + 2 * (k.iliski.guven ?? 0) + Math.max(0, ig) / 2 + (k.kancalar?.[id]?.dusunuyor ? 15 : 0);
  const sid = sonucSec(durum, k, n, y.sonuclar, skor, rng, null, { flort });
  if (!sid) return true;
  const x = y.sonuclar[sid];
  p.push(...ar.anlat(durum, veri, n, k, havuz(x.metin, null), rng));
  for (const [ad, v] of Object.entries(x.etki || {})) {
    if (ad === 'arzu') arzuEkle(k, v); else k.iliski[ad] = (k.iliski[ad] ?? 0) + v;
  }
  const gun = gunNo(durum.zaman.dakika), kayit = (k.kancalar ??= {})[id] ??= { gun };
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
    else genel.push(oz); // randevu, numara...
  }
  if (genel.length) ozelUygula(durum, veri, rng, n, k, genel, p, ar);
  ozetEkle(durum, n.id, `Oyuncu "${def.olgu}" dediğinde: ${y.ad.replace(/"/g, '')} (${sid}).`);
  return !!durum.sohbet;
}
