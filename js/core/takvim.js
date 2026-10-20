// Okul ve üniversite takvimi (adım 2.6): takvim.json'daki yaklaşık kurallardan hesaplanır.
// Kural biçimi: "eylul_2_pazartesi" = eylülün 2. pazartesi; "kasim_2_hafta" = kasımın 2. pazartesisiyle başlayan hafta;
// "ocak_3_cuma_sonrasi" = ocağın 3. cumasından sonraki gün.
import { gunMs, isoTarih, ozelGun } from './zaman.js';

const AY = { ocak: 1, subat: 2, mart: 3, nisan: 4, mayis: 5, haziran: 6, temmuz: 7, agustos: 8, eylul: 9, ekim: 10, kasim: 11, aralik: 12 };
const GUN = { pazar: 0, pazartesi: 1, sali: 2, carsamba: 3, persembe: 4, cuma: 5, cumartesi: 6 };
const GUN_MS = 86400000;

// yılın ayındaki n. haftagünü (UTC gün başı, ms)
function ninci(yil, ay, n, haftaGunu) {
  const ilk = Date.UTC(yil, ay - 1, 1);
  const fark = (haftaGunu - new Date(ilk).getUTCDay() + 7) % 7;
  return ilk + (fark + (n - 1) * 7) * GUN_MS;
}

// "eylul_2_pazartesi" → ms; "kasim_2_hafta" → { bas, bit } (pazartesi–cuma)
function kural(k, yil) {
  const [ay, n, tur, ek] = k.split('_');
  if (tur === 'hafta') { const bas = ninci(yil, AY[ay], Number(n), 1); return { bas, bit: bas + 4 * GUN_MS }; }
  const t = ninci(yil, AY[ay], Number(n), GUN[tur]);
  return ek === 'sonrasi' ? t + GUN_MS : t;
}

// Eğitim yılı ağustosta değişir: 2026-10-20 → 2026–2027 yılı (2026)
const egitimYili = ms => { const d = new Date(ms); return d.getUTCMonth() + 1 >= 8 ? d.getUTCFullYear() : d.getUTCFullYear() - 1; };

// 'ders' | 'hafta_sonu' | 'tatil' (resmi tatil) | 'ara_tatil' | 'yariyil' | 'yaz'
export function okulDurumu(takvim, iso) {
  const k = takvim?.okul?.lise;
  if (!k) return null;
  const ms = gunMs(iso), y = egitimYili(ms);
  const bas = kural(k.baslangic, y), bit = kural(k.bitis, y + 1);
  if (ms < bas || ms > bit) return 'yaz';
  const yy = kural(k.yariyil.bas, y + 1);
  if (ms >= yy && ms < yy + k.yariyil.hafta * 7 * GUN_MS) return 'yariyil';
  for (const a of [kural(k.araTatil1, y), kural(k.araTatil2, y + 1)]) if (ms >= a.bas && ms <= a.bit) return 'ara_tatil';
  const g = new Date(ms).getUTCDay();
  if (g === 0 || g === 6) return 'hafta_sonu';
  if (ozelGun(takvim, new Date(ms)).some(o => o.tur === 'resmi')) return 'tatil';
  return 'ders';
}

// 'donem' (dersler sürüyor) | 'tatil'
export function universiteDurumu(takvim, iso) {
  const k = takvim?.okul?.universite;
  if (!k) return null;
  const ms = gunMs(iso), y = egitimYili(ms);
  const guz = ms >= kural(k.guzBas, y) && ms <= kural(k.guzBit, y + 1);
  const bahar = ms >= kural(k.baharBas, y + 1) && ms <= kural(k.baharBit, y + 1);
  return guz || bahar ? 'donem' : 'tatil';
}

export const okulDurumuTarih = (takvim, d) => okulDurumu(takvim, isoTarih(d));
