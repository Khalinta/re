// Sadakat ve gizli ilişki (adım 3.13). Evli ya da sevgilisi olan biri artık "kapıyı kapatmaz": ne kadar açık olduğu
// kişinin kartından gelir (ilişkisinin hali, değerleri, inancı, kişiliği, flört tarzı, sırları, derdi) ve sana duyduğu
// çekimle aşınır. Tipler: sadik (sınır çizer ama küsmez), kararsiz (vicdan, karışık sinyal), acik ("burada olmaz"),
// atesli (peşinden gelir). Partneri olan biriyle yakınlaşma gizli ilişkidir: buluşmalar gizli olur, her görünür
// karşılaşma riski artırır (iliski.risk); risk birikince dedikodu çıkar, sonunda eşi öğrenir (tanidik.json).
import { Rng } from './rng.js';
import { derinlik, iliskiHali } from './kart.js';
import { gunNo } from './zaman.js';
import { kisiGuncel } from './npchayat.js';

export const partnerli = n => ['evli', 'sevgilili'].includes(n?.medeni);

const HAL = { mutlu: -15, alisilmis: 10, gergin: 30 };
const SIR = { gizli_ask: 30, ikinci_aile: 25, sevmiyor: 25, ayrilacak: 25, eski_ask: 10 };
const DERT = { evlilik_soguk: 20, sevgili_uzak: 15, kayinvalide: 5, yalnizlik: 10 };
const DEGER = { sadakat: -30, inanc: -15, gelenek: -10, aile: -10, macera: 15, ozgurluk: 10 };
const OZELLIK = { sadik: -25, kurnaz: 5, yalanci: 5, hayalperest: 5, kaygili: -5, gosterisci: 5 };
const FLORT = { oyunbaz: 10, acik: 5, temkinli: -10, utangac: -5, alayci: 3 };

// Kişinin kendi yapısından gelen açıklık (0–100), oyuncudan bağımsız
export function acikligTaban(seed, n, veri) {
  if (!partnerli(n)) return 100;
  const d = veri.npc.derinlik ? derinlik(seed, n, veri) : {};
  let a = Rng.akis(seed, 'sadakat|' + n.id).aralik(5, 35);
  a += HAL[iliskiHali(seed, n)] ?? 0;
  a += SIR[n.sir] ?? 0;
  a += DERT[n.dert] ?? 0;
  for (const x of d.degerIdler || []) a += DEGER[x] ?? 0;
  if ((d.dindarlikI ?? 0) >= 3) a -= 10 * (d.dindarlikI - 2);
  for (const x of n.ozellikler || []) a += OZELLIK[x] ?? 0;
  a += FLORT[d.flortId] ?? 0;
  if (n.eksenler?.acik >= 4) a += 5;
  if (n.eksenler?.dengeli <= 2) a += 5;
  return Math.max(0, Math.min(100, a));
}

// Şu anki açıklık: sana duyduğu çekim ve yakınlık direnci aşındırır
export function aciklik(durum, veri, n, k) {
  if (!partnerli(n)) return 100;
  const a = acikligTaban(durum.seed, n, veri) + (k?.iliski?.cekim ?? 0) * 0.3 + Math.max(0, k?.iliski?.yakinlik ?? 0) * 0.1;
  return Math.max(0, Math.min(100, a));
}

export const sadakatTipi = a => a < 20 ? 'sadik' : a < 45 ? 'kararsiz' : a < 70 ? 'acik' : 'atesli';

// İlgiye eklenen ceza: sadık biri için büyük, ateşli biri için yok (hatta yasak heyecan: küçük bir artı)
export function partnerCezasi(durum, veri, n, k) {
  if (!partnerli(n)) return 0;
  const a = aciklik(durum, veri, n, k);
  return a >= 80 ? -3 : Math.max(0, 40 - a * 0.6);
}

// Gizli ilişkinin riski görünür karşılaşmalarla artar; her gün biraz ortaya çıkma ihtimali (npcHayatGunu çağırır)
export function gizliIliskiGunu(durum, veri, gun, rng) {
  const cikan = [];
  for (const [id, k] of Object.entries(durum.npcler || {})) {
    if (!k.gizli || k.ortaya !== undefined) continue;
    if (!partnerli(kisiGuncel(durum, veri, id))) { k.gizli = false; continue; } // ayrıldıysa artık gizli değil
    const risk = k.iliski?.risk ?? 0;
    if (risk <= 0) continue;
    if (!rng.olasilik(Math.min(0.15, risk * 0.006))) continue;
    k.ortaya = gun;
    cikan.push(id);
  }
  return cikan;
}

// Gizli ilişki ortaya çıktı: ertesi gün olay (eşi öğrendi). Bağlamda eşinin adı da var.
export function ortayaCiktiKur(durum, id, n, esAd) {
  const z = (gunNo(durum.zaman.dakika) + 1) * 1440 + 11 * 60;
  durum.zamanlayicilar.push({ zaman: z, olay: 'gizli_ortaya_cikti', baglam: { npc: { kisi: id }, degisken: { kisi: { ad: n.hitapAdi, esAd: esAd ?? 'eşi', partner: n.medeni === 'evli' ? 'eşi' : 'sevgilisi' } } } });
  durum.zamanlayicilar.sort((a, b) => a.zaman - b.zaman);
}
