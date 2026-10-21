// Tekrarsız metin seçimi (3.18): bir havuzdan son seçilenler bir süre tekrar gelmez (hepsi yakında kullanıldıysa en
// eskisi döner). Öğe "metin" ya da { dilim: ['sabah', ...], metin } olabilir: dilimli öğe yalnızca o saatlerde çıkar.
// Hafıza kayıtta: durum.bilgi.cesit[anahtar] (son seçilenlerin kısa izleri).
import { dilim } from './zaman.js';

const iz = x => JSON.stringify(typeof x === 'string' ? x : x.metin).slice(0, 40);
const dilimli = x => x && typeof x === 'object' && !Array.isArray(x) && Array.isArray(x.dilim);

// Havuz düz bir seçenek listesi mi (dizi içinde dizi, ton/kosullu nesne değil)
export const cesitHavuzu = l => Array.isArray(l) && l.length > 1 && l.every(x => typeof x === 'string' || dilimli(x));

// Havuzun kimliği: ilk cümlesinin başı (havuza cümle eklemek hafızayı bozmaz)
export const havuzAnahtari = l => (typeof l[0] === 'string' ? l[0] : l[0].metin).slice(0, 24);

export function cesitSec(durum, anahtar, liste, rng, oran = 0.6) {
  const dl = dilim(durum.zaman.dakika).id;
  const uygun = liste.filter(x => !dilimli(x) || x.dilim.includes(dl));
  if (!uygun.length) return typeof liste[0] === 'string' ? liste[0] : liste[0].metin;
  durum.bilgi ??= {};
  const son = ((durum.bilgi.cesit ??= {})[anahtar] ??= []);
  const taze = uygun.filter(x => !son.includes(iz(x)));
  const x = taze.length ? rng.sec(taze) : [...uygun].sort((a, b) => son.indexOf(iz(a)) - son.indexOf(iz(b)))[0];
  son.push(iz(x));
  const sinir = Math.max(1, Math.floor(liste.length * oran));
  if (son.length > sinir) son.splice(0, son.length - sinir);
  return typeof x === 'string' ? x : x.metin;
}
