// Hava durumu modeli (adım 2.6). Günün havası seed + tarihten hesaplanır: kayda yazılmaz, aynı oyunda
// aynı gün hep aynı çıkar, geri yüklemede değişmez. İklim ortalamaları dünya kitabından (sehir.json).
// Yağış günden güne kalıcıdır (yağışlı günler art arda gelir); sıcaklık ay ortalamaları arasında yumuşak geçer.
import { Rng } from './rng.js';
import { gunMs, isoTarih, mevsim, dilim } from './zaman.js';

const GUN_MS = 86400000;
const AY_GUN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Gün için iki bağımsız ham sayı: biri yağış, biri sıcaklık sapması, biri rüzgâr...
const ham = (seed, ms, alan) => Rng.akis(seed, `hava|${alan}|${isoTarih(new Date(ms))}`).sayi();

// Ayın ortasında ay ortalaması; aralarda doğrusal geçiş
function ortSicaklik(aylik, ms) {
  const d = new Date(ms);
  const ay = d.getUTCMonth(), gun = d.getUTCDate();
  const orta = AY_GUN[ay] / 2;
  const komsu = gun < orta ? (ay + 11) % 12 : (ay + 1) % 12;
  const uzaklik = gun < orta ? (orta - gun) / ((AY_GUN[komsu] + AY_GUN[ay]) / 2) : (gun - orta) / ((AY_GUN[komsu] + AY_GUN[ay]) / 2);
  return aylik[ay].ortSicaklik * (1 - uzaklik) + aylik[komsu].ortSicaklik * uzaklik;
}

// Döner: { iso, durum, min, max, ruzgar: { yon, siddet }, yagis: { bas, bit } | null, sis: bool }
// durum: acik | parcali | bulutlu | yagmurlu | saganak | kar | sisli (sis yalnızca sabahları; gün durumu ayrıca)
export function gununHavasi(seed, iklim, ayar, iso) {
  const ms = gunMs(iso);
  const d = new Date(ms);
  const ay = iklim.aylik[d.getUTCMonth()];
  const ms_mevsim = mevsim(d);
  const p = ay.yagisliGun / AY_GUN[d.getUTCMonth()];
  // İki durumlu zincir: dün (kendi başına) yağışlıysa bugün yağma olasılığı artar, değilse azalır;
  // ortalama yağışlı gün sayısı iklimdekiyle aynı kalır: p·(p + k(1−p)) + (1−p)·p(1−k) = p
  const k = ayar.kalicilik;
  const dun = ham(seed, ms - GUN_MS, 'nem') < p;
  const yagisli = ham(seed, ms, 'nem2') < (dun ? p + k * (1 - p) : p * (1 - k));
  const bulut = ham(seed, ms, 'bulut');

  const sapma = (ham(seed, ms, 'isi') * 0.6 + ham(seed, ms - GUN_MS, 'isi') * 0.4 - 0.5) * 2 * ayar.sapma;
  const ort = ortSicaklik(iklim.aylik, ms) + sapma - (yagisli ? 1.5 : 0);

  const rz = ayar.ruzgar[ms_mevsim];
  const r = ham(seed, ms, 'ruzgar');
  const toplam = rz.poyraz + rz.lodos + rz.sakin;
  const yon = r * toplam < rz.poyraz ? 'poyraz' : r * toplam < rz.poyraz + rz.lodos ? 'lodos' : 'sakin';
  const firtina = yon !== 'sakin' && ham(seed, ms, 'firtina') < rz.firtina * (yagisli ? 2.5 : 1);
  const siddet = yon === 'sakin' ? 0 : firtina ? 3 : 1 + Math.floor(ham(seed, ms, 'siddet') * 2);

  let durum;
  if (yagisli) {
    const sert = ham(seed, ms, 'sert') < (ms_mevsim === 'yaz' ? 0.5 : 0.25) || firtina;
    durum = ort <= ayar.karEsigi ? 'kar' : sert ? 'saganak' : 'yagmurlu';
  } else durum = bulut < 0.4 ? 'acik' : bulut < 0.75 ? 'parcali' : 'bulutlu';

  const fark = ayar.gunlukFark[yagisli ? 'yagisli' : durum === 'acik' ? 'acik' : 'bulutlu'];
  const min = Math.round(ort - fark / 2), max = Math.round(ort + fark / 2);

  let yagis = null;
  if (yagisli) {
    const bas = Math.floor(ham(seed, ms, 'yagisBas') * 20) * 60;            // 00:00–19:00 arası başlar
    const sure = (2 + Math.floor(ham(seed, ms, 'yagisSure') * 10)) * 60;   // 2–11 saat
    yagis = { bas, bit: Math.min(bas + sure, 24 * 60) };
  }
  const sis = !yagisli && siddet <= 1 && ham(seed, ms, 'sis') < ayar.sisOlasiligi[ms_mevsim];
  return { iso, durum, min, max, ruzgar: { yon, siddet }, yagis, sis };
}

// Günün belirli bir anında: { durum, derece, yagiyor, firtina }
export function anlikHava(gun, gunDk) {
  const dk = ((gunDk % 1440) + 1440) % 1440;
  // Sıcaklık en düşük 05:00'te, en yüksek 15:00'te (kosinüs eğrisi)
  const faz = Math.cos(((dk / 60 - 15) / 24) * 2 * Math.PI);
  const derece = Math.round(gun.min + (gun.max - gun.min) * (faz + 1) / 2);
  const yagiyor = !!gun.yagis && dk >= gun.yagis.bas && dk < gun.yagis.bit;
  let durum = gun.durum;
  if (gun.yagis && !yagiyor) durum = 'bulutlu';
  if (gun.sis && dk >= 5 * 60 && dk < 10 * 60) durum = 'sisli';
  return { durum, derece, yagiyor, firtina: gun.ruzgar.siddet === 3, ruzgar: gun.ruzgar };
}

// Kısa özet: "14°, yağmurlu, poyraz"
export function havaOzeti(ayar, anlik) {
  const parca = [`${anlik.derece}°`, ayar.adlar[anlik.durum]];
  if (anlik.firtina) parca.push('fırtına');
  else if (anlik.ruzgar.siddet >= 2) parca.push(ayar.ruzgarAdlari[anlik.ruzgar.yon]);
  return parca.join(', ');
}

// Anlatım için metin (metin motorunun çeşit biçiminde): o anın durumuna ve dilimine göre
export function havaMetni(ayar, anlik, gunDk) {
  const m = [ayar.metinler[anlik.durum]?.[dilim(gunDk).id]].filter(Boolean);
  if (anlik.firtina) m.push(ayar.ruzgarMetinleri.firtina);
  else if (anlik.ruzgar.siddet >= 2) m.push(ayar.ruzgarMetinleri[anlik.ruzgar.yon]);
  return m;
}
