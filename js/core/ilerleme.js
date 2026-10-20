// Kendi ilerleyen dünya (adım 2.6): oyuncudan bağımsız olarak gün gün işlenir, sonuçları kayda yazılır (durum.dunya).
// - fiyat endeksi: her ayın ilk günü aylık enflasyon
// - ücret endeksi: ocak ve temmuzda zam (enflasyonun biraz gerisinde)
// - Demirspor: sezonda her pazar maç, puan durumu
// - gündem: şehirde olup bitenler (haber akışının kaynağı)
// - mekanların geçici kapanması
// Rastgelelik kayıtlı 'dunya' akışından gelir: aynı seed ve aynı gidişatta aynı dünya.
import { rngAl } from './durum.js';
import { tarihAl, gunNo, isoTarih } from './zaman.js';
import { kosulAcikla } from './kosul.js';
import { metinCoz } from './metin.js';

export const GUNDEM_SINIRI = 60;

export function dunyaBaslangici(zaman) {
  const t = tarihAl(zaman.baslangic, zaman.dakika);
  return {
    sonGun: gunNo(zaman.dakika),
    fiyatEndeksi: 1, ucretEndeksi: 1,
    sonAy: isoTarih(t).slice(0, 7),
    gundem: [], gundemSon: {},
    mekanKapali: {},
    demirspor: { sezon: null, puan: 0, g: 0, b: 0, m: 0, son: null },
  };
}

const dk2 = x => Math.round(x * 10000) / 10000;

// Belirli bir oyun gününün (gn) 12:00'si için dünya hesapları; durum.zaman değiştirilmez
function gunuIsle(durum, veri, gn, ayar, rng) {
  const w = durum.dunya;
  const t = tarihAl(durum.zaman.baslangic, gn * 1440 + 12 * 60);
  const iso = isoTarih(t);
  const ay = t.getUTCMonth() + 1;
  const haberler = [];
  const haber = (tur, metin, ek = {}) => haberler.push({ gun: gn, iso, tur, metin, ...ek });

  // Ay değişimi: enflasyon, zam
  const buAy = iso.slice(0, 7);
  if (buAy !== w.sonAy) {
    const e = ayar.enflasyon;
    const oran = e.aylikMin + rng.sayi() * (e.aylikMax - e.aylikMin);
    w.fiyatEndeksi = dk2(w.fiyatEndeksi * (1 + oran));
    const yuzde = (oran * 100).toFixed(1).replace('.', ',');
    haber('ekonomi', `Aylık enflasyon açıklandı: %${yuzde}. Çarşıda herkes aynı şeyi söylüyor: 'Bizim enflasyon başka.'`, { enflasyon: dk2(oran) });
    if (ayar.ucretZammi.aylar.includes(ay)) {
      const z = ayar.ucretZammi;
      const hedef = w.fiyatEndeksi * (z.enflasyonaOranMin + rng.sayi() * (z.enflasyonaOranMax - z.enflasyonaOranMin));
      if (hedef > w.ucretEndeksi) {
        const artis = hedef / w.ucretEndeksi - 1;
        w.ucretEndeksi = dk2(hedef);
        haber('ekonomi', `Asgari ücrete %${(artis * 100).toFixed(0)} zam yapıldı. Kimine göre az, kimine göre hiç.`, { zam: dk2(artis) });
      }
    }
    w.sonAy = buAy;
  }

  // Geçici kapanmaların süresi dolanlar açılır, yenileri kapanır
  for (const [id, k] of Object.entries(w.mekanKapali)) if (k.bitisGun < gn) delete w.mekanKapali[id];
  const mk = ayar.mekanKapanma;
  for (const m of veri.dunya?.mekanlar?.mekanlar || []) {
    if (!m.sahip?.tohum || w.mekanKapali[m.id] || !rng.olasilik(mk.gunlukOlasilik)) continue;
    const sure = rng.aralik(mk.sureGun[0], mk.sureGun[1]);
    w.mekanKapali[m.id] = { bitisGun: gn + sure - 1, sebep: rng.sec(mk.sebepler) };
  }

  // Demirspor
  const ds = ayar.demirspor;
  const sezonda = ay >= ds.sezonBasAyi || ay <= ds.sezonBitAyi;
  const sezon = ay >= ds.sezonBasAyi ? t.getUTCFullYear() : t.getUTCFullYear() - 1;
  if (sezonda && w.demirspor.sezon !== sezon) w.demirspor = { sezon, puan: 0, g: 0, b: 0, m: 0, son: null };
  if (sezonda && t.getUTCDay() === ds.macGunu) {
    const sonuc = rng.agirlikliSec(Object.entries(ds.sonucAgirlik).map(([s, a]) => ({ s, agirlik: a }))).s;
    const gol = () => rng.aralik(0, 3);
    let a = gol(), b = gol();
    if (sonuc === 'galibiyet' && a <= b) a = b + 1;
    if (sonuc === 'maglubiyet' && b <= a) b = a + 1;
    if (sonuc === 'beraberlik') b = a;
    const k = { galibiyet: 'g', beraberlik: 'b', maglubiyet: 'm' }[sonuc];
    w.demirspor[k]++;
    w.demirspor.puan += { g: 3, b: 1, m: 0 }[k];
    const rakip = rng.sec(ds.rakipler);
    const skor = `${a}-${b}`;
    w.demirspor.son = { gun: gn, rakip, skor, sonuc };
    const metin = metinCoz(ds.metinler[sonuc], rng, { durum, veri, baglam: { degisken: { rakip, skor } } }).map(p => p.metin).join(' ');
    haber('spor', metin, { sonuc });
  }

  // Gündem: günde en çok bir haber
  if (rng.olasilik(ayar.gundemOlasiligi)) {
    const ctx = { durum: { ...durum, zaman: { ...durum.zaman, dakika: gn * 1440 + 12 * 60 } }, veri };
    const adaylar = ayar.gundem.filter(g => (w.gundemSon[g.id] ?? -Infinity) + (g.tekrar ?? 14) <= gn
      && (g.kosul === undefined || kosulAcikla(g.kosul, ctx).tamam));
    if (adaylar.length) {
      const g = rng.agirlikliSec(adaylar);
      w.gundemSon[g.id] = gn;
      haber(g.tur, metinCoz(g.metin, rng, ctx).map(p => p.metin).join(' '), { id: g.id });
    }
  }

  w.gundem.push(...haberler);
  if (w.gundem.length > GUNDEM_SINIRI) w.gundem.splice(0, w.gundem.length - GUNDEM_SINIRI);
  return haberler;
}

// Son işlenen günden bugüne kadar olan her günü işler. Döner: yeni haberler.
export function dunyaIlerlet(durum, veri) {
  const ayar = veri.ilerleme;
  if (!ayar || !durum.dunya) return [];
  const bugun = gunNo(durum.zaman.dakika);
  const rng = rngAl(durum, 'dunya');
  const yeni = [];
  for (let gn = durum.dunya.sonGun + 1; gn <= bugun; gn++) {
    yeni.push(...gunuIsle(durum, veri, gn, ayar, rng));
    durum.dunya.sonGun = gn;
  }
  return yeni;
}

// Mekan bugün (geçici olarak) kapalı mı? Döner: sebep ya da null
export function mekanKapanisi(durum, mekanId) {
  const k = durum.dunya?.mekanKapali?.[mekanId];
  return k && k.bitisGun >= gunNo(durum.zaman.dakika) ? k.sebep : null;
}
