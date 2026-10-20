// Oyun denetleyicisi: veriyi yükler, mevcut durumu tutar, aksiyonları çalıştırır, arayüze haber verir.
// Kayıt sistemi (1.6) ve olay motoru (1.8–1.9) buraya bağlanacak.
import { yeniDurum, rngAl, anlatimKaydet, aksiyonKaydet, geriAlinabilir } from './core/durum.js';
import { aksiyonDurumu, aksiyonMaliyeti, aksiyonUygula } from './core/aksiyon.js';
import { olaySec, olayBaslat, olaySecenekleri, olaySecenegiSec, vadesiGelenZamanlayici } from './core/olay.js';
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
  const [sim, aks, takvim, olayAyar, olayListe, yaylar] = await Promise.all([
    jsonAl('./data/simulasyon.json'),
    jsonAl('./data/aksiyonlar.json'),
    jsonAl('./data/takvim.json'),
    jsonAl('./data/olay_ayarlari.json'),
    jsonAl('./data/olaylar/_liste.json'),
    jsonAl('./data/yaylar.json'),
  ]);
  veri.yaylar = Object.fromEntries(yaylar.yaylar.map(y => [y.id, y]));
  veri.sim = sim;
  veri.aksiyonlar = aks.aksiyonlar;
  veri.takvim = takvim;
  veri.olayAyar = olayAyar;
  veri.olaylar = {};
  const dosyalar = await Promise.all(olayListe.dosyalar.map(d => jsonAl('./data/olaylar/' + d)));
  dosyalar.forEach((dosya, i) => {
    for (const o of dosya.olaylar) {
      if (veri.olaylar[o.id]) throw new Error(`Aynı olay kimliği iki kez: ${o.id} (${olayListe.dosyalar[i]})`);
      veri.olaylar[o.id] = o;
    }
  });
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
  return veri.aksiyonlar.map(a => ({ a, ...aksiyonDurumu(durum, a, veri.sim, veri), maliyet: aksiyonMaliyeti(durum, a, veri.sim) }));
}

export function aksiyonBul(id) { return veri.aksiyonlar.find(a => a.id === id); }

// Zaman ayracı: aksiyon ya da olay seçimi gün/dilim değiştirdiyse araya "— Salı, akşam —" girer
function ayracEkle(liste, onceDk, uykuSonrasi = false) {
  const gunDegisti = gunNo(durum.zaman.dakika) !== gunNo(onceDk);
  if (!gunDegisti && dilim(durum.zaman.dakika).id === dilim(onceDk).id) return;
  const i = uykuSonrasi ? liste.findIndex(p => p.tur === 'sistem') + 1 : liste.length;
  liste.splice(i, 0, ayrac(durum.zaman.dakika, gunDegisti));
}

// Oyuncu hamleleri geri alınabilir sarmalda çalışır: hata olursa durum hamleden önceki haline döner,
// arayüze bildirim gitmez (dolayısıyla yarım hal kaydedilmez), hata yukarı iletilir.
export function aksiyonYap(id) {
  return geriAlinabilir(durum, () => aksiyonYapIc(id));
}

function aksiyonYapIc(id) {
  const a = aksiyonBul(id);
  if (!a) throw new Error('Bilinmeyen aksiyon: ' + id);
  if (durum.aktifOlay) return { tamam: false, sebep: 'Önce şu an olanla ilgilen.' };
  const kontrol = aksiyonDurumu(durum, a, veri.sim, veri);
  if (!kontrol.tamam) return { tamam: false, sebep: kontrol.sebep };
  const onceDk = durum.zaman.dakika;
  const sonuc = aksiyonUygula(durum, a, veri.sim, rngAl(durum, 'aksiyon'), veri);
  const liste = [...sonuc.paragraflar];
  ayracEkle(liste, onceDk, a.ozel === 'uyku');
  liste.push(...olayDene(a.id));
  paragraflariKaydet(liste);
  bildir(liste);
  return { tamam: true, paragraflar: liste };
}

// Vakti gelmiş gecikmeli sonuç var mı? Varsa olayını başlat.
function zamanlayiciDene() {
  const { zamanlayici } = vadesiGelenZamanlayici(durum, veri);
  return zamanlayici ? olayuBaslat(zamanlayici.olay, zamanlayici.baglam || {}) : null;
}

// Aksiyondan sonra olay çıkar mı? Önce vakti gelen zamanlayıcılar, sonra aksiyona bağlı olaylar,
// sonra genel olaylar.
function olayDene(aksiyonId) {
  const zamanli = zamanlayiciDene();
  if (zamanli) return zamanli;
  const ayar = veri.olayAyar || {};
  const rng = rngAl(durum, 'olay');
  let olay = null;
  if (rng.olasilik(ayar.aksiyonaBagliOlasilik ?? 0.5)) olay = olaySec(durum, veri, rng, { tetik: 'aksiyon:' + aksiyonId });
  const sonOlay = durum.sonOlayZamani ?? -Infinity;
  if (!olay && durum.zaman.dakika - sonOlay >= (ayar.enAzAralikDk ?? 180) && rng.olasilik(ayar.aksiyonSonrasiOlasilik ?? 0.3)) {
    olay = olaySec(durum, veri, rng, { tetik: 'otomatik' });
  }
  return olay ? olayuBaslat(olay.id) : [];
}

function olayuBaslat(id, baglam = {}) {
  durum.sonOlayZamani = durum.zaman.dakika;
  aksiyonKaydet(durum, 'olayBasladi:' + id);
  const onceDk = durum.zaman.dakika;
  const s = olayBaslat(durum, id, veri, rngAl(durum, 'olay'), baglam);
  const liste = [...s.paragraflar];
  ayracEkle(liste, onceDk);
  if (s.bitti) liste.push(...zinciriSurdur(s.zincir));
  return liste;
}

// Olay bitince: zincirde sıradaki olay varsa o, yoksa vakti gelmiş bir zamanlayıcı
function zinciriSurdur(zincir) {
  const [ilk] = zincir || [];
  if (ilk) return olayuBaslat(ilk);
  return zamanlayiciDene() || [];
}

export const aktifOlayVar = () => !!durum?.aktifOlay;
export const olaySecenekleriAl = () => olaySecenekleri(durum, veri);

export function olaySeceneginiYap(sira) {
  return geriAlinabilir(durum, () => olaySeceneginiYapIc(sira));
}

function olaySeceneginiYapIc(sira) {
  const onceDk = durum.zaman.dakika;
  const ao = durum.aktifOlay;
  const secenek = ao ? veri.olaylar[ao.id]?.sahneler[ao.sahne]?.secenekler?.[sira] : null;
  if (ao) aksiyonKaydet(durum, 'olay:' + ao.id, { sahne: ao.sahne, secim: secenek?.metin });
  const s = olaySecenegiSec(durum, veri, rngAl(durum, 'olay'), sira);
  if (s.reddedildi) return { tamam: false, sebep: s.reddedildi };
  const liste = [...s.paragraflar];
  ayracEkle(liste, onceDk);
  if (s.bitti) liste.push(...zinciriSurdur(s.zincir));
  paragraflariKaydet(liste);
  bildir(liste);
  return { tamam: true, paragraflar: liste };
}

// Geliştirici paneli ve testler için: bir olayı koşulsuz başlat
export function olayiZorla(id, baglam = {}) {
  return geriAlinabilir(durum, () => {
    if (durum.aktifOlay) durum.aktifOlay = null;
    const liste = olayuBaslat(id, baglam);
    paragraflariKaydet(liste);
    bildir(liste);
    return liste;
  });
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
