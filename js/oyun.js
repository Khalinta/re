// Oyun denetleyicisi: veriyi yükler, mevcut durumu tutar, aksiyonları çalıştırır, arayüze haber verir.
// Kayıt sistemi (1.6) ve olay motoru (1.8–1.9) buraya bağlanacak.
import { yeniDurum, rngAl, anlatimKaydet, aksiyonKaydet, geriAlinabilir } from './core/durum.js';
import { zamanGecir } from './core/simulasyon.js';
import { aksiyonDurumu, aksiyonMaliyeti, aksiyonUygula } from './core/aksiyon.js';
import { olaySec, olayBaslat, olaySecenekleri, olaySecenegiSec, vadesiGelenZamanlayici, olayUygunluk } from './core/olay.js';
import { tarihAl, dilim, gunNo, bugunTurkiye, ozelGun, mevsim, MEVSIMLER, isoTarih, gunDakikasi, yas as yasHesapla } from './core/zaman.js';
import { seedUret } from './core/rng.js';
import { saat, tarih, tarihKisa, GUNLER, AYLAR, sure as sureYaz } from './core/format.js';
import { kucuk, ek } from './core/tr.js';
import { dunyaDogrula } from './core/dunya.js';
import { metinCoz } from './core/metin.js';
import { dunyaIlerlet } from './core/ilerleme.js';
import { ekonomiDogrula } from './core/ekonomi.js';
import * as konum from './core/konum.js';
import * as insanlar from './core/insanlar.js';
import * as sohbet from './core/sohbet.js';
import { npcVeriDogrula } from './core/npc.js';
import { npcHayatGunu } from './core/npchayat.js';
import { istekHazirla, cevabiUygula } from './core/yz.js';
import { hazirMi as yzHazirMi } from './yz/ayar.js';
import { zevkOzeti } from './core/zevk.js';
import { olayKisisi } from './core/olaykisi.js';
import { gizliIliskiGunu, ortayaCiktiKur } from './core/sadakat.js';
import { askGunu } from './core/ask.js';
import { aileAgaci as kartAile } from './core/kart.js';
import { semtBul } from './core/dunya.js';
import { gununHavasi, anlikHava, havaOzeti } from './core/hava.js';
import { karakterUret, hikayeyiUygula, hikayeVeriDogrula } from './core/hikaye.js';
import { fizikTarifi, cekicilikAdi, karizmaAdi } from './core/npc.js';

export const veri = {};
let durum = null;
const dinleyiciler = new Set();

async function jsonAl(yol) {
  const y = await fetch(yol);
  if (!y.ok) throw new Error(`${yol} yüklenemedi (${y.status})`);
  return y.json();
}

export async function veriYukle() {
  const [sim, aks, takvim, olayAyar, olayListe, yaylar, sehir, semtler, ulasim, kurumlar, sirketler, figurler, orgutler, mekanlar, ilerleme, hava, ekonomi, gezi, isimler, memleket, kisilik, hayat, sohbetVeri, gorunusVeri, arketipler, bilesenler, flort, dedikodu, hayatOlaylari, derinlik, zevk, kanca] = await Promise.all([
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
    jsonAl('./data/npc/isimler.json'),
    jsonAl('./data/npc/memleket.json'),
    jsonAl('./data/npc/kisilik.json'),
    jsonAl('./data/npc/hayat.json'),
    jsonAl('./data/npc/sohbet.json'),
    jsonAl('./data/npc/gorunus.json'),
    jsonAl('./data/hikaye/arketipler.json'),
    jsonAl('./data/hikaye/bilesenler.json'),
    jsonAl('./data/npc/flort.json'),
    jsonAl('./data/npc/dedikodu.json'),
    jsonAl('./data/npc/hayat_olaylari.json'),
    jsonAl('./data/npc/derinlik.json'),
    jsonAl('./data/npc/zevk.json'),
    jsonAl('./data/npc/kanca.json'),
  ]);
  veri.npc = { isimler, memleket, kisilik, hayat, sohbet: sohbetVeri, gorunus: gorunusVeri, flort, dedikodu, hayatOlaylari, derinlik, zevk, kanca };
  veri.gezi = gezi;
  veri.ekonomi = ekonomi;
  const ekoSorunlari = ekonomiDogrula(ekonomi, { isTurleri: sirketler.isTurleri, hizmetler: mekanlar.hizmetler, ulasim });
  if (ekoSorunlari.length) console.error('[ekonomi] tutarsızlık:', ekoSorunlari);
  veri.ilerleme = ilerleme;
  veri.hava = hava;
  veri.dunya = { sehir, semtler, ulasim, kurumlar, sirketler, figurler, orgutler, mekanlar };
  const dunyaSorunlari = dunyaDogrula(veri.dunya);
  if (dunyaSorunlari.length) console.error('[dünya kitabı] tutarsızlık:', dunyaSorunlari);
  const npcSorunlari = npcVeriDogrula(veri);
  if (npcSorunlari.length) console.error('[npc] tutarsızlık:', npcSorunlari);
  veri.hikaye = { arketipler, bilesenler };
  const hikayeSorunlari = hikayeVeriDogrula(veri);
  if (hikayeSorunlari.length) console.error('[hikaye] tutarsızlık:', hikayeSorunlari);
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
const dunyayiIlerlet = () => {
  const haberler = dunyaIlerlet(durum, veri);
  // Tanıdıkların kendi hayatı (3.6): geçen her gün için
  const bugun = gunNo(durum.zaman.dakika);
  if (durum.dunya) {
    for (let g = (durum.dunya.npcGun ?? bugun) + 1; g <= bugun; g++) {
      npcHayatGunu(durum, veri, g);
      askGunu(durum, veri, g);
      // Gizli ilişkiler (3.13): risk birikmişse ortaya çıkabilir → ertesi gün olay
      for (const id of gizliIliskiGunu(durum, veri, g, rngAl(durum, 'gizli'))) {
        const n = insanlar.kisi(veri, durum.seed, id, durum.npcler[id]?.sablon);
        ortayaCiktiKur(durum, id, n, kartAile(durum.seed, n, veri).es?.ad);
      }
    }
    durum.dunya.npcGun = bugun;
  }
  return haberler;
};

function paragraflariKaydet(liste) {
  // Konuştuğun kişi bu arada gittiyse (saat geçti, mekan kapandı) sohbet açık kalmasın (3.18, otomatik deneme)
  if (durum.sohbet && !durum.aktifOlay && !sohbet.oturumGecerli(durum, veri)) {
    const id = durum.sohbet.npc, k = durum.npcler?.[id];
    if (k && durum.konum?.mekan === durum.sohbet.mekan) {
      k.ayrildi = { zaman: durum.zaman.dakika, kim: 'o' };
      liste.push({ tur: 'sistem', metin: `${insanlar.gorunenAd(durum, veri, id)} kalkıp gitti` });
    }
    sohbet.oturumBitir(durum);
  }
  for (const p of liste) anlatimKaydet(durum, p);
  return liste;
}

// Yeni oyun ekranı: seçime göre kim olacağını önceden gösterir (aynı seed ile yeniOyun aynı karakteri üretir)
export function karakterOnizle(seed, secim = {}, baslangic = bugunTurkiye()) {
  const k = karakterUret(seed, secim, veri, { baslangic });
  const c = k.karakter;
  return {
    seed, tamAd: c.tamAd, cinsiyet: c.cinsiyet, yas: yasHesapla(c.dogum, tarihAl(baslangic, 0)), memleket: c.yore === 'yerli' ? 'Karalimanlı' : ek(c.memleket, 'li'),
    eskiMeslek: c.eskiMeslek, ozet: k.hikaye.zincir.at(-1).metin, ilk: k.hikaye.zincir[0].metin, tip: k.hikaye.tip,
    gorunus: c.fizik ? fizikTarifi({ ...c }, veri.npc.gorunus).split('. ')[0] + '.' : '', para: k.para, borc: k.hikaye.borclar.reduce((t, b) => t + (b.aylik ? 0 : b.tutar), 0),
  };
}

// secim: { tip, cinsiyet, ad } (yeni oyun ekranından); verilmeyenler seed'den
export function yeniOyun({ seed = seedUret(), baslangic = bugunTurkiye(), secim = {} } = {}) {
  seed = seed || seedUret();
  baslangic = baslangic || bugunTurkiye();
  const k = karakterUret(seed, secim, veri, { baslangic });
  durum = yeniDurum(veri.sim, { seed, baslangic, saat: 8, karakter: k.karakter, para: k.para, ev: k.ev });
  hikayeyiUygula(durum, k);
  const t = tarihAl(baslangic, durum.zaman.dakika);
  const semt = semtBul(veri.dunya, durum.ev.semt);
  const rng = rngAl(durum, 'metin');
  const ctx = { durum, veri, baglam: { degisken: { semt, ev: { ad: durum.ev.ad, iyelik: /[ıiuü]$/.test(durum.ev.ad) } } } }; // "pansiyon odası" → odasında
  const hk = durum.hikaye;
  const giris = paragraflariKaydet([
    ayrac(durum.zaman.dakika, true),
    ...metinCoz(`${tarih(t)}. ${MEVSIMLER[mevsim(t)]}. {sehir.ad}, {semt.ad}. {ev|de|bas} uyanıyorsun.`, rng, ctx),
    { tur: 'anlati', metin: semt.ozet },
    ...hk.zincir.map(z => ({ tur: 'anlati', metin: z.metin })),
    { tur: 'sistem', metin: 'Geçmişin, borçların ve hayatındaki insanlar: Hayatım → Karakter.' },
  ]);
  // İlk sabahın etkileşimli sahneleri (data/olaylar/acilis.json)
  if (veri.olaylar.acilis) {
    const s = olayBaslat(durum, 'acilis', veri, rngAl(durum, 'olay'), { degisken: { semt: { ad: semt.ad, iyelik: semt.iyelik } } });
    giris.push(...paragraflariKaydet(s.paragraflar));
  }
  bildir(giris);
  return durum;
}

// Kayıttan gelen durumu etkin oyun yapar (anlatım geçmişini arayüz kendisi geri koyar)
export function durumYukle(d) {
  durum = d;
  // 0.1.32'ye kadar bazı olaylar olmayan parayla ödeme yaptırıyordu (3.17); eksi kalan kasa sıfırlanır
  if (typeof durum.para === 'number' && durum.para < 0) durum.para = 0;
  bildir([]);
  return durum;
}

// Bulunulan yere göre aksiyonlar: evdeyken ev aksiyonları, mekandayken mekanın hizmetleri, her yerde gezinme
const yerdeMi = a => !a.yer || (a.yer === 'ev' ? durum.konum.mekan === konum.EVDE : a.yer === 'disarisi' ? durum.konum.mekan === konum.EVDE || !durum.konum.mekan : true);
export function aksiyonListesi() {
  const sabit = veri.aksiyonlar.filter(a => a.kisayol || yerdeMi(a))
    .map(a => ({ a, ...aksiyonDurumu(durum, a, veri.sim, veri), maliyet: aksiyonMaliyeti(durum, a, veri.sim) }));
  const baglam = konum.baglamAksiyonlari(durum, veri).map(x => ({ a: { id: x.id, ad: x.ad, alt: x.alt }, tamam: x.tamam, sebep: x.sebep, maliyet: x.maliyet }));
  if (durum.sohbet && baglam.some(x => x.a.id.startsWith('sohbet:'))) return [...sabit.filter(x => x.a.kisayol), ...baglam];
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
  // Sohbet konusu dışındaki her hamle açık sohbeti bitirir
  if (durum.sohbet && !id.startsWith('sohbet:')) {
    const k = durum.npcler?.[durum.sohbet.npc];
    if (k) k.ayrildi = { zaman: durum.zaman.dakika, kim: 'sen' }; // başka bir şeye geçtin: sen kalktın sayılır (3.13)
    sohbet.oturumBitir(durum);
  }
  // "Flört et…" menüsünü açıp kapamak hamle değil: zaman geçmez, olay çıkmaz
  if (id === 'sohbet:flort' || id === 'sohbet:flort:vazgec') { const s = sohbet.sohbetHamlesi(durum, veri, rngAl(durum, 'aksiyon'), id.slice(7)); bildir([]); return s; }
  if (id.startsWith('sohbet:')) return konumHamlesi(() => sohbet.sohbetHamlesi(durum, veri, rngAl(durum, 'aksiyon'), id.slice(7)), 'sohbet');
  if (id.startsWith('gezi:') || id.startsWith('mekan:') || id.startsWith('npc:')) return konumHamlesi(() => {
    const rng = rngAl(durum, 'aksiyon');
    if (id.startsWith('npc:')) return konum.insanHamlesi(durum, veri, rng, id.slice(4));
    if (id === 'gezi:cik') return konum.disariCik(durum, veri, rng);
    if (id === 'gezi:eve') return konum.eveGir(durum, veri, rng);
    if (id === 'gezi:evegit') return eveGit(rng);
    if (id.startsWith('gezi:gir:')) return konum.mekanaGir(durum, veri, rng, id.slice(9));
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
    if (durum.sohbet) sohbet.oturumBitir(durum);
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
export const tanidiklarim = () => insanlar.tanidiklarim(durum, veri);

// ------------------------------------------------------------------ Claude ile serbest sohbet (3.9)
export const serbestSohbetVar = () => !!(durum?.sohbet && !durum.sohbet.bekleyen && yzHazirMi() && sohbet.oturumGecerli(durum, veri));
export const serbestOneriler = () => durum?.sohbet?.oneriler ?? [];

// Oyuncunun yazdığı söz → kişinin cevabı (yapay zekâ). Ağ beklenirken oyun durumu değişmez; cevap gelince
// tek bir geri alınabilir hamleyle uygulanır. Döner: { tamam, sebep? }
export async function serbestKonus(metin) {
  metin = String(metin || '').trim().slice(0, 600);
  if (!metin) return { tamam: false, sebep: 'Bir şey yaz.' };
  if (!serbestSohbetVar()) return { tamam: false, sebep: 'Şu an serbest konuşamazsın.' };
  const id = durum.sohbet.npc, oturum = durum.sohbet;
  const istek = istekHazirla(durum, veri, id, metin);
  const sozum = { tur: 'konusma', konusan: 'Sen', metin };
  paragraflariKaydet([sozum]);
  bildir([sozum]);
  const { sohbetIstegi } = await import('./yz/istemci.js');
  const s = await sohbetIstegi(istek);
  if (durum.sohbet !== oturum) return { tamam: false, sebep: 'Sohbet bu arada bitti.' };
  if (s.hata) {
    const p = [{ tur: 'sistem', metin: `${s.mesaj} Hazır seçeneklerle devam edebilirsin.` }];
    paragraflariKaydet(p); bildir(p);
    return { tamam: false, sebep: s.mesaj, hata: s.hata };
  }
  return geriAlinabilir(durum, () => {
    const onceDk = durum.zaman.dakika;
    zamanGecir(durum, 3 + Math.min(6, Math.floor(metin.length / 80)), 'dinlenme', veri.sim);
    const u = cevabiUygula(durum, veri, id, metin, s.cevap, { randevuKur: sohbet.randevuKur });
    if (u.reddedilen.length) console.info('[yz] uygulanmayanlar:', u.reddedilen);
    aksiyonKaydet(durum, 'sohbet:serbest', { npc: id, model: s.model });
    dunyayiIlerlet();
    const liste = [...u.paragraflar];
    ayracEkle(liste, onceDk);
    paragraflariKaydet(liste);
    bildir(liste);
    return { tamam: true, paragraflar: liste };
  });
}
// Geliştirici paneli: bir kişinin flört açısından durumu
export function kisiBilgisi(id) {
  const n = insanlar.kisi(veri, durum.seed, id, durum.npcler?.[id]?.sablon);
  return { yas: n.yas, cinsiyet: n.cinsiyet, medeni: n.medeni, ...sohbet.flortDurumu(durum, veri, id) };
}

// Hayatım → Karakter: kim olduğun (hikâye motorundan önce başlamış oyunlarda hikaye: null)
export function karakterBilgisi() {
  const c = durum.karakter, g = veri.npc.gorunus;
  const n = c.fizik ? { ...c, ozellikler: c.ozellikler ?? [] } : null;
  return {
    karakter: c, hikaye: durum.hikaye ?? null,
    yas: c.dogum ? yasHesapla(c.dogum, tarihAl(durum.zaman.baslangic, durum.zaman.dakika)) : null,
    gorunus: n ? fizikTarifi(n, g) : null, cekicilik: n ? cekicilikAdi(n, g) : null, karizma: n ? karizmaAdi(n, g) : null,
    ozellikler: (c.ozellikler || []).map(o => veri.npc.kisilik.ozellikler.find(x => x.id === o)?.ad).filter(Boolean),
    egitim: veri.npc.hayat.egitimAdlari?.[c.egitim] ?? c.egitim,
    zevk: zevkOzeti(durum, veri),
  };
}
export const mekandakiler = mekan => insanlar.mekandakiler(durum, veri, mekan, konum.mekanKalabaligi(durum, mekan)).map(id => ({ id, ad: insanlar.gorunenAd(durum, veri, id), tanidik: insanlar.tanisildiMi(durum, id) }));

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
  return olay ? olayuBaslat(olay.id, olay.baglam ?? {}) : [];
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
    // Kişili olay (3.12): bağlamda kişi yoksa tanıdıklardan biri seçilir (seçiciye uyan yoksa herhangi bir tanıdık)
    const o = veri.olaylar[id];
    if (o?.kisi && !baglam.npc?.kisi) baglam = { ...baglam, ...(olayKisisi(durum, veri, o.kisi, rngAl(durum, 'olay')) ?? olayKisisi(durum, veri, {}, rngAl(durum, 'olay')) ?? {}) };
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
