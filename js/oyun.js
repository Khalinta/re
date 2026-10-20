// Oyun denetleyicisi: veriyi yükler, mevcut durumu tutar, aksiyonları çalıştırır, arayüze haber verir.
// Kayıt sistemi (1.6) ve olay motoru (1.8–1.9) buraya bağlanacak.
import { yeniDurum, rngAl, anlatimKaydet, aksiyonKaydet, geriAlinabilir } from './core/durum.js';
import { zamanGecir } from './core/simulasyon.js';
import { aksiyonDurumu, aksiyonMaliyeti, aksiyonUygula } from './core/aksiyon.js';
import { olaySec, olayBaslat, olaySecenekleri, olaySecenegiSec, vadesiGelenZamanlayici, olayUygunluk } from './core/olay.js';
import { tarihAl, dilim, gunNo, bugunTurkiye, ozelGun, mevsim, MEVSIMLER, isoTarih, gunDakikasi } from './core/zaman.js';
import { seedUret } from './core/rng.js';
import { saat, tarih, tarihKisa, GUNLER, AYLAR, sure as sureYaz } from './core/format.js';
import { kucuk } from './core/tr.js';
import { dunyaDogrula } from './core/dunya.js';
import { metinCoz } from './core/metin.js';
import { dunyaIlerlet } from './core/ilerleme.js';
import { ekonomiDogrula } from './core/ekonomi.js';
import * as konum from './core/konum.js';
import { semtBul } from './core/dunya.js';
import { gununHavasi, anlikHava, havaOzeti } from './core/hava.js';

export const veri = {};
let durum = null;
const dinleyiciler = new Set();

async function jsonAl(yol) {
  const y = await fetch(yol);
  if (!y.ok) throw new Error(`${yol} yüklenemedi (${y.status})`);
  return y.json();
}

export async function veriYukle() {
  const [sim, aks, takvim, olayAyar, olayListe, yaylar, sehir, semtler, ulasim, kurumlar, sirketler, figurler, orgutler, mekanlar, ilerleme, hava, ekonomi, gezi] = await Promise.all([
    jsonAl('./data/simulasyon.json'),
    jsonAl('./data/aksiyonlar.json'),
    jsonAl('./data/takvim.json'),
    jsonAl('./data/olay_ayarlari.json'),
    jsonAl('./data/olaylar/_liste.json'),
    jsonAl('./data/yaylar.json'),
    jsonAl('./data/dunya/sehir.json'),
    jsonAl('./data/dunya/semtler.json'),
    jsonAl('./data/dunya/ulasim.json'),
    jsonAl('./data/dunya/kurumlar.json'),
    jsonAl('./data/dunya/sirketler.json'),
    jsonAl('./data/dunya/figurler.json'),
    jsonAl('./data/dunya/orgutler.json'),
    jsonAl('./data/dunya/mekanlar.json'),
    jsonAl('./data/dunya/ilerleme.json'),
    jsonAl('./data/hava.json'),
    jsonAl('./data/ekonomi.json'),
    jsonAl('./data/gezi.json'),
  ]);
  veri.gezi = gezi;
  veri.ekonomi = ekonomi;
  const ekoSorunlari = ekonomiDogrula(ekonomi, { isTurleri: sirketler.isTurleri, hizmetler: mekanlar.hizmetler, ulasim });
  if (ekoSorunlari.length) console.error('[ekonomi] tutarsızlık:', ekoSorunlari);
  veri.ilerleme = ilerleme;
  veri.hava = hava;
  veri.dunya = { sehir, semtler, ulasim, kurumlar, sirketler, figurler, orgutler, mekanlar };
  const dunyaSorunlari = dunyaDogrula(veri.dunya);
  if (dunyaSorunlari.length) console.error('[dünya kitabı] tutarsızlık:', dunyaSorunlari);
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

// O anın havası (seed + tarihten; kayda yazılmaz)
export function havaAl(dk = durum.zaman.dakika) {
  const iso = isoTarih(tarihAl(durum.zaman.baslangic, dk));
  return anlikHava(gununHavasi(durum.seed, veri.dunya.sehir.cografya.iklim, veri.hava, iso), gunDakikasi(dk));
}

// Zaman ayracı metni: "Salı, sabah · 14°, yağmurlu" — gün değiştiyse "21 Ekim, Çarşamba · sabah · …", özel gün varsa eklenir
// (birden çok günlük dönemler — Ramazan — ayraçta gösterilmez)
function ayrac(dk, gunDegisti) {
  const t = tarihAl(durum.zaman.baslangic, dk);
  const dl = kucuk(dilim(dk).ad);
  const ozel = ozelGun(veri.takvim, t).filter(o => o.tur !== 'donem').map(o => o.ad);
  let metin = gunDegisti ? `${t.getUTCDate()} ${AYLAR[t.getUTCMonth()]}, ${GUNLER[t.getUTCDay()]} · ${dl}` : `${GUNLER[t.getUTCDay()]}, ${dl}`;
  if (veri.hava) metin += ' · ' + havaOzeti(veri.hava, havaAl(dk));
  if (gunDegisti && ozel.length) metin += ' · ' + ozel.join(', ');
  return { tur: 'ayrac', metin };
}

// Zaman ilerledikten sonra: geçen günlerde dünyada olanlar işlenir (gündem, enflasyon, maçlar...)
const dunyayiIlerlet = () => dunyaIlerlet(durum, veri);

function paragraflariKaydet(liste) {
  for (const p of liste) anlatimKaydet(durum, p);
  return liste;
}

export function yeniOyun({ seed = seedUret(), baslangic = bugunTurkiye() } = {}) {
  seed = seed || seedUret();
  baslangic = baslangic || bugunTurkiye();
  durum = yeniDurum(veri.sim, { seed, baslangic, saat: 8, para: 2000, ev: konum.evSec(seed, veri.gezi) });
  const t = tarihAl(baslangic, durum.zaman.dakika);
  const semt = semtBul(veri.dunya, durum.ev.semt);
  const ctx = { durum, veri, baglam: { degisken: { semt } } };
  const giris = paragraflariKaydet([
    ayrac(durum.zaman.dakika, true),
    ...metinCoz(`${tarih(t)}. ${MEVSIMLER[mevsim(t)]}. {sehir.ad|de}, {semt|de} küçük bir odada uyanıyorsun.`, rngAl(durum, 'metin'), ctx),
    { tur: 'anlati', metin: semt.ozet },
    { tur: 'anlati', metin: 'Kim olduğun, buraya nasıl geldiğin henüz yazılmadı; hikaye motoru Faz 3\'te gelecek. Şimdilik şehri kendi temponla yaşayabilirsin: dışarı çık, semtleri gez, bir kahveye otur, kulak ver. Zaman her şeyde akıyor.' },
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

// Bulunulan yere göre aksiyonlar: evdeyken ev aksiyonları, mekandayken mekanın hizmetleri, her yerde gezinme
const yerdeMi = a => !a.yer || (a.yer === 'ev' ? durum.konum.mekan === konum.EVDE : a.yer === 'disarisi' ? durum.konum.mekan === konum.EVDE || !durum.konum.mekan : true);
export function aksiyonListesi() {
  const sabit = veri.aksiyonlar.filter(a => a.kisayol || yerdeMi(a))
    .map(a => ({ a, ...aksiyonDurumu(durum, a, veri.sim, veri), maliyet: aksiyonMaliyeti(durum, a, veri.sim) }));
  const baglam = konum.baglamAksiyonlari(durum, veri).map(x => ({ a: { id: x.id, ad: x.ad, alt: x.alt }, tamam: x.tamam, sebep: x.sebep, maliyet: x.maliyet }));
  return [...baglam.filter(x => x.a.id.startsWith('mekan:')), ...sabit, ...baglam.filter(x => !x.a.id.startsWith('mekan:'))];
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
  if (id.startsWith('gezi:') || id.startsWith('mekan:')) return konumHamlesi(() => {
    const rng = rngAl(durum, 'aksiyon');
    if (id === 'gezi:cik') return konum.disariCik(durum, veri, rng);
    if (id === 'gezi:eve') return konum.eveGir(durum, veri, rng);
    if (id === 'gezi:evegit') return eveGit(rng);
    return konum.mekanAksiyonuYap(durum, veri, rng, id.slice(6));
  });
  const a = aksiyonBul(id);
  if (!a) throw new Error('Bilinmeyen aksiyon: ' + id);
  if (durum.aktifOlay) return { tamam: false, sebep: 'Önce şu an olanla ilgilen.' };
  const kontrol = aksiyonDurumu(durum, a, veri.sim, veri);
  if (!kontrol.tamam) return { tamam: false, sebep: kontrol.sebep };
  const onceDk = durum.zaman.dakika;
  const sonuc = aksiyonUygula(durum, a, veri.sim, rngAl(durum, 'aksiyon'), veri);
  dunyayiIlerlet();
  const liste = [...sonuc.paragraflar];
  ayracEkle(liste, onceDk, a.ozel === 'uyku');
  liste.push(...olayDene(a.id));
  paragraflariKaydet(liste);
  bildir(liste);
  return { tamam: true, paragraflar: liste };
}

// Gezinme ve mekan hamleleri: aksiyon gibi ayraç, dünya ilerlemesi ve olay denemesi
function konumHamlesi(is, aksiyonId = 'gezi') {
  if (durum.aktifOlay) return { tamam: false, sebep: 'Önce şu an olanla ilgilen.' };
  const onceDk = durum.zaman.dakika;
  const sonuc = is();
  if (!sonuc.tamam) return sonuc;
  dunyayiIlerlet();
  const liste = [...sonuc.paragraflar];
  ayracEkle(liste, onceDk);
  liste.push(...olayDene(aksiyonId));
  paragraflariKaydet(liste);
  bildir(liste);
  return { tamam: true, paragraflar: liste };
}

function eveGit(rng) {
  const yol = konum.enHizliYol(durum, veri, durum.ev.semt);
  if (!yol) return { tamam: false, sebep: 'Eve gidecek yol bulamadın.' };
  const y = konum.yolculukYap(durum, veri, rng, durum.ev.semt, yol.kip);
  if (!y.tamam) return y;
  const e = konum.eveGir(durum, veri, rng);
  return { tamam: true, paragraflar: [...y.paragraflar, ...e.paragraflar.filter(p => p.tur !== 'secim')] };
}

// Şehir ekranından: başka semte git (kip: toplu | yuruyus | taksi), istenirse oradaki bir mekana gir
export function yolculuk(hedef, kip, mekanId = null) {
  return geriAlinabilir(durum, () => konumHamlesi(() => {
    const rng = rngAl(durum, 'aksiyon');
    const parcalar = [];
    if (hedef !== durum.konum.semt) {
      const y = konum.yolculukYap(durum, veri, rng, hedef, kip);
      if (!y.tamam) return y;
      parcalar.push(...y.paragraflar);
    }
    if (mekanId) {
      const g = konum.mekanaGir(durum, veri, rng, mekanId);
      if (!g.tamam) {
        if (!parcalar.length) return g;
        parcalar.push({ tur: 'sistem', metin: g.sebep });
      } else parcalar.push(...(parcalar.length ? g.paragraflar.filter(p => p.tur !== 'secim') : g.paragraflar));
    }
    return { tamam: true, paragraflar: parcalar };
  }));
}

export const mekanaGir = mekanId => yolculuk(durum.konum.semt, null, mekanId);
export const yolculukSecenekleri = hedef => konum.yolculukSecenekleri(durum, veri, hedef);
export const konumMetni = () => konum.konumMetni(durum, veri);
export const duyulanlar = () => konum.duyulanlar(durum, veri);

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
  dunyayiIlerlet();
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
    hava: veri.hava ? havaOzeti(veri.hava, havaAl()) : null,
    konum: durum.konum ? konum.konumMetni(durum, veri) : null,
    para: durum.para, enerji: d.enerji, ruh: d.ruh,
    ayrinti: Object.entries(veri.sim.durumlar).map(([k, v]) => ({ ad: v.ad, deger: d[k], ters: v.ters, aciklama: String(Math.round(d[k])) })),
  };
}

// ------------------------------------------------------------- geliştirici paneli
// Paneldeki her değişiklik geri alınabilir sarmalda yapılır ve bildirilir (yani kaydedilir).

export function gelistiriciDegistir(is, not) {
  return geriAlinabilir(durum, () => {
    const sonuc = is(durum);
    const liste = not ? paragraflariKaydet([{ tur: 'sistem', metin: '[geliştirici] ' + not }]) : [];
    bildir(liste);
    return sonuc;
  });
}

// Zamanı ileri alır. simule: true ise durumlar da değişir (açlık, enerji...), değilse sadece saat ilerler.
export function zamanAtla(dakika, { simule = false } = {}) {
  return gelistiriciDegistir(() => {
    const onceDk = durum.zaman.dakika;
    if (simule) zamanGecir(durum, dakika, 'normal', veri.sim);
    else durum.zaman.dakika += dakika;
    dunyayiIlerlet();
    const liste = [];
    ayracEkle(liste, onceDk);
    paragraflariKaydet(liste);
    if (liste.length) bildir(liste);
  }, `${sureYaz(dakika)} atlandı${simule ? ' (simüle edildi)' : ''}`);
}

export function olayListesi(tetik = '*') {
  return Object.values(veri.olaylar).map(o => ({ o, ...olayUygunluk(durum, o, veri, { tetik }) }));
}

export function aktifOlayiIptal() {
  return gelistiriciDegistir(d => { d.aktifOlay = null; }, 'etkin olay iptal edildi');
}

export function zamanlayiciCalistir(i) {
  return geriAlinabilir(durum, () => {
    const [z] = durum.zamanlayicilar.splice(i, 1);
    if (!z) return [];
    if (durum.aktifOlay) durum.aktifOlay = null;
    const liste = olayuBaslat(z.olay, z.baglam || {});
    paragraflariKaydet(liste);
    bildir(liste);
    return liste;
  });
}
