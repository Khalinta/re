// Oyun denetleyicisi: veriyi yükler, mevcut durumu tutar, aksiyonları çalıştırır, arayüze haber verir.
// Kayıt sistemi (1.6) ve olay motoru (1.8–1.9) buraya bağlanacak.
import { yeniDurum, rngAl, anlatimKaydet } from './core/durum.js';
import { aksiyonDurumu, aksiyonMaliyeti, aksiyonUygula } from './core/aksiyon.js';
import { tarihAl, dilim, gunNo, bugunTurkiye, ozelGun, mevsim, MEVSIMLER } from './core/zaman.js';
import { seedUret } from './core/rng.js';
import { saat, tarih, tarihKisa, GUNLER, AYLAR } from './core/format.js';
import { kucuk } from './core/tr.js';

export const veri = {};
let durum = null;
const dinleyiciler = new Set();

async function jsonAl(yol) {
  const y = await fetch(yol);
  if (!y.ok) throw new Error(`${yol} yüklenemedi (${y.status})`);
  return y.json();
}

export async function veriYukle() {
  const [sim, aks, takvim] = await Promise.all([
    jsonAl('./data/simulasyon.json'),
    jsonAl('./data/aksiyonlar.json'),
    jsonAl('./data/takvim.json'),
  ]);
  veri.sim = sim;
  veri.aksiyonlar = aks.aksiyonlar;
  veri.takvim = takvim;
}

export const durumAl = () => durum;
export function dinle(f) { dinleyiciler.add(f); return () => dinleyiciler.delete(f); }
const bildir = (paragraflar = []) => dinleyiciler.forEach(f => f(durum, paragraflar));

// Zaman ayracı metni: "Salı, sabah" — gün değiştiyse "21 Ekim, Çarşamba · sabah", özel gün varsa eklenir
function ayrac(dk, gunDegisti) {
  const t = tarihAl(durum.zaman.baslangic, dk);
  const dl = kucuk(dilim(dk).ad);
  const ozel = ozelGun(veri.takvim, t).map(o => o.ad);
  let metin = gunDegisti ? `${t.getUTCDate()} ${AYLAR[t.getUTCMonth()]}, ${GUNLER[t.getUTCDay()]} · ${dl}` : `${GUNLER[t.getUTCDay()]}, ${dl}`;
  if (gunDegisti && ozel.length) metin += ' · ' + ozel.join(', ');
  return { tur: 'ayrac', metin };
}

function paragraflariKaydet(liste) {
  for (const p of liste) anlatimKaydet(durum, p);
  return liste;
}

export function yeniOyun({ seed = seedUret(), baslangic = bugunTurkiye() } = {}) {
  durum = yeniDurum(veri.sim, { seed, baslangic, saat: 8, para: 2000 });
  const t = tarihAl(baslangic, durum.zaman.dakika);
  const giris = paragraflariKaydet([
    ayrac(durum.zaman.dakika, true),
    { tur: 'anlati', metin: `${tarih(t)}. ${MEVSIMLER[mevsim(t)]}. Küçük bir odada uyanıyorsun.` },
    { tur: 'anlati', metin: 'Kim olduğun, buraya nasıl geldiğin henüz yazılmadı; hikaye motoru Faz 3\'te gelecek. Şimdilik günü kendi temponla yaşayabilirsin: ye, uyu, yürü, dinlen. Zaman her şeyde akıyor.' },
    { tur: 'icses', metin: 'Yeniden başlamak için bir sebep lazım değil. Bir sabah yeter.' },
  ]);
  bildir(giris);
  return durum;
}

// Kayıttan gelen durumu etkin oyun yapar (anlatım geçmişini arayüz kendisi geri koyar)
export function durumYukle(d) {
  durum = d;
  bildir([]);
  return durum;
}

export function aksiyonListesi() {
  return veri.aksiyonlar.map(a => ({ a, ...aksiyonDurumu(durum, a, veri.sim), maliyet: aksiyonMaliyeti(durum, a, veri.sim) }));
}

export function aksiyonBul(id) { return veri.aksiyonlar.find(a => a.id === id); }

export function aksiyonYap(id) {
  const a = aksiyonBul(id);
  if (!a) throw new Error('Bilinmeyen aksiyon: ' + id);
  const kontrol = aksiyonDurumu(durum, a, veri.sim);
  if (!kontrol.tamam) return { tamam: false, sebep: kontrol.sebep };
  const onceDk = durum.zaman.dakika;
  const sonuc = aksiyonUygula(durum, a, veri.sim, rngAl(durum, 'aksiyon'));
  const liste = [...sonuc.paragraflar];
  const gunDegisti = gunNo(durum.zaman.dakika) !== gunNo(onceDk);
  if (gunDegisti || dilim(durum.zaman.dakika).id !== dilim(onceDk).id) {
    // Uyku gibi uzun aksiyonlarda ayraç uyanıştan önce gelsin
    const i = a.ozel === 'uyku' ? liste.findIndex(p => p.tur === 'sistem') + 1 : liste.length;
    liste.splice(i, 0, ayrac(durum.zaman.dakika, gunDegisti));
  }
  paragraflariKaydet(liste);
  bildir(liste);
  return { tamam: true, paragraflar: liste };
}

// Durum çubuğunun beklediği biçim (bkz. ui/durumcubugu.js)
export function durumCubuguVerisi() {
  const t = tarihAl(durum.zaman.baslangic, durum.zaman.dakika);
  const d = durum.durumlar;
  return {
    saat: saat(durum.zaman.dakika), gunKisa: tarihKisa(t), tarihUzun: tarih(t), dilim: dilim(durum.zaman.dakika).ad,
    para: durum.para, enerji: d.enerji, ruh: d.ruh,
    ayrinti: Object.entries(veri.sim.durumlar).map(([k, v]) => ({ ad: v.ad, deger: d[k], ters: v.ters, aciklama: String(Math.round(d[k])) })),
  };
}
