// Tanışma, sohbet ve flört (3.2 → 3.2b → 3.5'te kullanıcı testi sonrası baştan).
// İlkeler:
//  - Kişi KUŞAĞINA göre konuşur (genc < 30, orta < 55, yasli): cümle havuzları kuşağa (ve kuşak_üsluba) ayrılır,
//    yöresel ağız sözcükleri gençlerde çıkmaz, hitap konuşanla oyuncunun yaşına/cinsiyetine göre seçilir.
//  - Sohbet karşılıklıdır: kişi bazen sana soru sorar (sohbet.json → sorular), cevabını sen seçersin; söylediklerini
//    hatırlar (npcler[id].bilinen.oyuncu_*). Senin sözlerin "Sen" diye konuşma olarak yazılır.
//  - Flört (flort.json): ilgi = seed'den uyum + çekiciliğin + karizman + yakınlık + biriken çekim − yaş farkı;
//    yönelim ve ilişki durumu engel olabilir. Numara, buluşma teklifi → ertesi akşam buluşma olayı (olaylar/iliski.json).
//  - Dedikodu insanlar üzerine (dedikodu.json): tanıdıkların gerçek sırları, dertleri, gizli ilişkileri — ya da uydurma.
// Oturum: durum.sohbet = { npc, mekan, kalan (sabır), kullanilan: { konu }, bekleyen: { tur: 'soru'|'secim', id } }
import { Rng } from './rng.js';
import { npcKaydet, katmanYukselt, fizikTarifi, gununHali, dertMetni, sirMetni, hayalMetni } from './npc.js';
import { zamanGecir } from './simulasyon.js';
import { dilim, gunNo, gunDakikasi, tarihAl, yas as yasHesapla } from './zaman.js';
import { semtBul } from './dunya.js';
import { mekanBul, acikMi } from './mekan.js';
import { metinCoz } from './metin.js';
import { ek } from './tr.js';
import { aksiyonKaydet } from './durum.js';
import { bayrakKoy } from './bayrak.js';
import { kisi, mekandakiler, gorunus, tanisildiMi, tanidiklari, kisiOrada, sablonBul, anlatacagiDedikodu } from './insanlar.js';
import { kisiGuncel, bilinmeyenOlaylar, haberSablonu } from './npchayat.js';
import { gizliIliskiMi, derinlik, aileAgaci } from './kart.js';
import { sirriBiliyorMu, ozetEkle } from './hafiza.js';
import { partnerli, aciklik, sadakatTipi, partnerCezasi } from './sadakat.js';
import { askKonulari, askHamlesi, askSecenekler, askCevapla, askKarsilama, npcAtilim, kiskanclikYay, sonucSec, ozelUygula, sahteSurer, gerginKarsilama } from './ask.js';
import { derinKonular, derinHamle, derinSecenekler, derinCevapla, derinSoruAdaylari, derinSoruSor } from './zevk.js';
import { kancaTara, kancaEtiket, kancaSecenekleri, kancaHamlesi, anSecenekleri } from './kanca.js';

const sinir = (x, a, b) => Math.max(a, Math.min(b, x));
const kucukBas = s => s ? s[0].toLocaleLowerCase('tr') + s.slice(1) : s;
// Cümle ortasına alınacak metnin ilk harfi: özel adla başlıyorsa ("Demirspor'u…", "KoinPazar'da…") dokunulmaz
const ortaya = s => !s ? s : /^[^\s]*'/.test(s) || /^[A-ZÇĞİÖŞÜ][a-zçğıöşü]*[A-ZÇĞİÖŞÜ]/.test(s) ? s : kucukBas(s);
const deger = (rng, x) => Array.isArray(x) ? rng.aralik(x[0], x[1]) : (x ?? 0);

export function kusak(n, sb) {
  return n.yas <= sb.kusak.genc ? 'genc' : n.yas <= sb.kusak.orta ? 'orta' : 'yasli';
}

// "Erzurumlu" → "Erzurumluyum" (birinci tekil ek-fiil, ünlü uyumuyla)
export function benim(k) {
  const son = [...k.toLocaleLowerCase('tr')].reverse().find(c => 'aeıioöuü'.includes(c)) ?? 'e';
  const ek4 = { a: 'ım', ı: 'ım', e: 'im', i: 'im', o: 'um', u: 'um', ö: 'üm', ü: 'üm' }[son];
  return k + (/[aeıioöuü]$/i.test(k) ? 'y' : '') + ek4;
}

// Oyuncu hakkında konuşmalarda gereken bilgiler (eski kayıtlarda eksik olanlara makul varsayılanlar)
export function oyuncu(durum, veri) {
  const c = durum.karakter || {};
  const t = tarihAl(durum.zaman.baslangic, durum.zaman.dakika);
  const a = durum.hikaye ? veri.hikaye?.arketipler?.arketipler?.find(x => x.id === durum.hikaye.arketip) : null;
  const semt = durum.ev ? semtBul(veri.dunya, durum.ev.semt) : null;
  return {
    ad: c.ad ?? 'Sen', cinsiyet: c.cinsiyet ?? null, yas: c.dogum ? yasHesapla(c.dogum, t) : 30,
    cekicilik: c.fizik?.cekicilik ?? 5, karizma: c.fizik?.karizma ?? 5,
    memleket: c.yore && c.yore !== 'yerli' ? c.memleket : null, eskiMeslek: c.eskiMeslek ?? 'her işi yapan biri',
    semt: semt ? { ad: semt.ad, iyelik: semt.iyelik } : { ad: 'buralarda' },
    ozet: a?.ozet ?? ['Her şeyi geride bıraktım; burada yeniden başlıyorum.'],
  };
}

// ------------------------------------------------------------------ cümle seçimi

// Aynı cümle kısa sürede iki kez duyulmasın: kişi başına ve oyun genelinde son söylenenler tutulur
function sozSec(durum, k, adaylar, rng, hafiza) {
  if (!adaylar?.length) return null;
  const anahtar = t => t.length + ':' + t.slice(0, 24);
  durum.bilgi.sonSoz ??= [];
  const kisisel = new Set(k?.son || []), genel = new Set(durum.bilgi.sonSoz);
  const taze = adaylar.filter(t => !kisisel.has(anahtar(t)) && !genel.has(anahtar(t)));
  const yarim = k ? adaylar.filter(t => !kisisel.has(anahtar(t))) : [];
  // Hepsi yakında duyulduysa: bu kişiden (kişisizse genelde) en uzun zamandır duyulmayan
  const enEski = () => {
    const liste = k ? k.son : durum.bilgi.sonSoz;
    const son = t => liste.lastIndexOf(anahtar(t));
    const en = Math.min(...adaylar.map(son));
    return adaylar.filter(t => son(t) === en);
  };
  const t = rng.sec(taze.length ? taze : yarim.length ? yarim : enEski());
  if (k) k.son = [...(k.son || []), anahtar(t)].slice(-(hafiza?.kisi ?? 80));
  durum.bilgi.sonSoz = [...durum.bilgi.sonSoz, anahtar(t)].slice(-(hafiza?.genel ?? 220));
  return t;
}

// Kuşağa göre havuz: "genc_argo" + "genc" + "_" (dizi verilirse olduğu gibi)
function havuzu(grup, n, sb) {
  if (!grup) return [];
  if (Array.isArray(grup)) return grup;
  const ku = kusak(n, sb);
  return [...(grup[`${ku}_${n.uslup}`] || []), ...(grup[ku] || []), ...(grup._ || [])];
}

// Konuşanın oyuncuya hitabı: yaş farkına, kuşağa ve iki tarafın cinsiyetine göre; kişi başına sabit
export function hitapSec(durum, veri, n) {
  const h = veri.npc.sohbet.hitap, o = oyuncu(durum, veri);
  const r = Rng.akis(durum.seed, 'hitap|' + n.id);
  const fark = n.yas - o.yas, cins = o.cinsiyet ?? '_';
  let liste;
  if (n.uslup === 'kibar' && r.olasilik(0.4)) liste = h.kibar[cins];
  else if (fark >= 25) liste = h.yasliGence[cins];
  else if (fark >= 10) liste = h.kucuge[cins];
  else if (fark <= -10) liste = h.buyuge[cins];
  else liste = h.akran[kusak(n, veri.npc.sohbet)][n.cinsiyet + (o.cinsiyet ?? n.cinsiyet)];
  const x = r.sec(liste ?? h.kibar._);
  return x === '@ad' ? o.ad : x;
}

// Yöresel ağız tek tük ve yaşa göre: gençlerde (yerliyse) hiç, yaşlılarda daha sık
function agizla(cumle, n, veri, rng) {
  const sb = veri.npc.sohbet, a = veri.npc.memleket.agizlar[n.agiz];
  const ku = kusak(n, sb);
  const p = ku === 'genc' ? (n.gocmus ? sb.agiz.gencGocmus : sb.agiz.genc) : sb.agiz[ku];
  if (!a?.sonlar?.length || !rng.olasilik(p) || !/[^.][.!]$/.test(cumle)) return cumle; // "..." ile bitene ek yapışmaz
  return cumle.replace(/([.!])$/, `, ${rng.sec(a.sonlar)}$1`);
}

function degiskenler(durum, veri, n, rng, ekler = {}) {
  const v = veri.npc;
  const semt = semtBul(veri.dunya, n.semt);
  const gerilim = semt?.gerilimler?.length ? Rng.akis(durum.seed, `gerilim|${n.id}|${gunNo(durum.zaman.dakika)}`).sec(semt.gerilimler) : null;
  const mm = n.meslek.ad.replace(/^emekli /, '').replace(/ \(emekli\)$/, '');
  const o = oyuncu(durum, veri);
  const memleketLi = n.yore === 'yurtdisi' ? n.memleket : ek(n.memleket, 'li');
  return {
    s: {
      ad: n.hitapAdi, ilkAd: n.ad, hitapAdi: n.hitapAdi, hitap: hitapSec(durum, veri, n),
      meslek: n.meslek.ad, meslekEski: mm, adamim: n.cinsiyet === 'e' ? 'adamım' : 'kadınım', ebeveyn: n.cinsiyet === 'e' ? 'Baba' : 'Anne',
      memleketAd: n.memleket, memleketDen: ek(n.memleket, 'den'), memleketLi, memleketLiyim: benim(memleketLi),
      kokenAd: n.koken && v.memleket.yoreler[n.koken] ? v.memleket.yoreler[n.koken].ad : '',
      semtAd: semt?.ad ?? '', gerilimAd: gerilim?.ad ?? 'mahallenin hâli',
      ...ekler,
    },
    o: {
      ad: o.ad, eskiMeslek: o.eskiMeslek, semt: o.semt, ozet: rng.sec(o.ozet),
      memleket: o.memleket ?? 'Karaliman',
      memleketCumle: o.memleket ? `Aslen ${o.memleket}; ama artık buradayım.` : 'Buralıyım; Karaliman\'da doğdum büyüdüm.',
    },
  };
}

function soyle(durum, veri, n, k, grup, rng, ctxEk = {}, tur = 'konusma') {
  const t = sozSec(durum, k, havuzu(grup, n, veri.npc.sohbet), rng, veri.npc.sohbet.hafiza);
  if (!t) return [];
  const ctx = { durum, veri, baglam: { degisken: degiskenler(durum, veri, n, rng, ctxEk) } };
  const l = metinCoz(t, rng, ctx).map(p => tur === 'konusma' ? { tur: 'konusma', konusan: n.hitapAdi, metin: agizla(p.metin, n, veri, rng) } : { ...p, tur });
  kancaTara(durum, veri, n, k, l.map(p => p.metin).join(' ')); // söylediği bir şey konuşmayı açıyor mu (3.21)
  return l;
}
const anlat = (durum, veri, n, k, grup, rng, ctxEk = {}) => soyle(durum, veri, n, k, grup, rng, ctxEk, 'anlati');

// Oyuncunun kendi sözü
function sen(durum, veri, n, k, liste, rng, ctxEk = {}) {
  const t = sozSec(durum, null, liste, rng, veri.npc.sohbet.hafiza);
  if (!t) return [];
  const ctx = { durum, veri, baglam: { degisken: degiskenler(durum, veri, n, rng, ctxEk) } };
  return metinCoz(t, rng, ctx).map(p => ({ tur: 'konusma', konusan: 'Sen', metin: p.metin }));
}

// Kişi kartı konuşmaları (zevk.js) için konuşma araçları
const ARACLAR = {
  soyle, anlat, sen, randevu: (durum, veri, n, k) => randevuKur(durum, veri, n.id, n, k),
  dertAnlat: (durum, veri, rng, n, k, p) => dertAnlat(durum, veri, rng, n, k, p),
  // Yağmurdan sığınmak (3.22): bulunduğun semtte açık bir kapalı yere birlikte geçersiniz, sohbet sürer
  bulus: (durum, veri, n, k, p) => {
    const m = bulusmaKur(durum, veri, n.id, { turler: ['kafe', 'cay_ocagi', 'kahvehane', 'pastane', 'lokanta'], sure: 120, semt: durum.konum.semt });
    if (m) p.push({ tur: 'sistem', metin: `Şimdi ${ek(m.ad, 'de', { iyelik: m.iyelik })}sınız` });
  },
};

// Ara ara beden dili: kuşağa göre ("telefonunu ters çeviriyor" / "tespihini çekiyor")
function beden(durum, veri, n, k, rng, tur = null) {
  const b = veri.npc.sohbet.beden;
  if (!rng.olasilik(tur ? 0.7 : 0.35)) return [];
  const sacYok = n.fizik?.basortusu || n.fizik?.sac?.stil === 'kel';
  const grup = (tur ? b[tur] : [...b._, ...(b[kusak(n, veri.npc.sohbet)] || [])]).filter(x => !(sacYok && x.includes('saç')));
  return anlat(durum, veri, n, k, grup, rng);
}

const sabir = (veri, n, k) => {
  const s = veri.npc.sohbet.sabir;
  return Math.min(s.enCok, s.taban + n.eksenler.disadonuk + Math.floor((k?.iliski?.yakinlik ?? 0) / s.yakinlikBolen));
};

function oturumBaslat(durum, id, mekan, kalan) {
  durum.sohbet = { npc: id, mekan: mekan.id, kalan, kullanilan: {}, bekleyen: null, bas: durum.zaman.dakika };
}
export const oturumBitir = durum => { delete durum.sohbet; };

// Derdini anlatır (yakınlık yetiyorsa; "bir şey mi oldu?" diye sorulduysa ya da iki kadehten sonra eşik düşer). Döner: anlattı mı
function dertAnlat(durum, veri, rng, n, k, p) {
  const sb = veri.npc.sohbet, o = durum.sohbet, yak = k.iliski.yakinlik ?? 0;
  const d = veri.npc.hayat.dertler.find(x => x.id === n.dert);
  const esik = o?.acildi || (o?.icki ?? 0) >= 2 ? 0 : sb.esikler.dert;
  if (!d || yak < esik) { p.push(...soyle(durum, veri, n, k, sb.dert.kacamak, rng)); return false; }
  if (k.bilinen.dert) { p.push(...soyle(durum, veri, n, k, sb.dert.tekrar, rng)); kancaTara(durum, veri, n, k, '', n.dert); return false; }
  p.push(...anlat(durum, veri, n, k, sb.dert.giris, rng));
  p.push(...beden(durum, veri, n, k, rng, 'huzun'));
  const dertSozu = agizla(rng.sec(d.soz ?? [d.metin]), n, veri, rng);
  p.push({ tur: 'konusma', konusan: n.hitapAdi, metin: dertSozu });
  kancaTara(durum, veri, n, k, dertSozu, n.dert);
  k.bilinen.dert = true; k.iliski.yakinlik = yak + rng.aralik(...sb.yakinlik.dertDinlemek);
  k.iliski.guven = (k.iliski.guven ?? 0) + 2;
  k.anilar.push({ zaman: durum.zaman.dakika, metin: 'derdini dinledin' });
  ozetEkle(durum, n.id, `Oyuncuya derdini anlattı: ${d.metin}`);
  if (o) o.bekleyen = { tur: 'secim', id: 'dert_tepki' };
  return true;
}

// Ev arkadaşı (3.21): yanına taşınan kişiyle evde konuşulur. Evde mi: iş saatlerinde (hafta içi 09–18) değilse, gece 01–07 uyuyorsa yok
const evMekani = durum => ({ id: 'ev', ad: 'ev', tur: 'ev', semt: durum.ev?.semt, kalabalik: {} });
export function evArkadasiEvde(durum, veri) {
  const e = durum.evArkadasi;
  if (!e || durum.konum?.mekan !== 'ev' || gunNo(durum.zaman.dakika) < e.gun) return false;
  const n = kisiGuncel(durum, veri, e.id);
  if (!n || n.yok) return false;
  const sa = gunDakikasi(durum.zaman.dakika) / 60, hg = tarihAl(durum.zaman.baslangic, durum.zaman.dakika).getUTCDay();
  if (sa >= 1 && sa < 7) return false;
  if (n.durum === 'calisiyor' && hg >= 1 && hg <= 5 && sa >= 9 && sa < 18) return false;
  return true;
}
export function evdeKonus(durum, veri, rng) {
  const e = durum.evArkadasi, sb = veri.npc.sohbet;
  if (!evArkadasiEvde(durum, veri)) return { tamam: false, sebep: 'Şu an evde değil.' };
  const k = durum.npcler[e.id], n = kisiGuncel(durum, veri, e.id);
  const p = [{ tur: 'secim', metin: `${ek(n.hitapAdi, 'le')} konuş` }];
  zamanGecir(durum, sb.sure.otur, 'normal', veri.sim);
  oturumBaslat(durum, e.id, evMekani(durum), sabir(veri, n, k) + 2);
  durum.sohbet.evde = true;
  k.sonGorus = durum.zaman.dakika;
  if ((k.iliski.gerginlik ?? 0) >= sb.gerginlikEsigi) { gerginKarsilama(durum, veri, rng, n, k, p, ARACLAR); return { tamam: true, paragraflar: p }; }
  p.push(...soyle(durum, veri, n, k, sb.selam.yakin, rng));
  aksiyonKaydet(durum, 'evde:' + e.id);
  return { tamam: true, paragraflar: p };
}

// Olaydan buluşmaya (3.17): "Hemen yanına git" gibi seçeneklerde gerçekten onunla bir yerdesin ve konuşabilirsin.
// Mekan: onun semtinde şu an açık, istenen türde bir yer (yoksa şehirde); sure dakika boyunca orada kalır.
export function bulusmaKur(durum, veri, id, { turler = ['kafe', 'park', 'cay_ocagi'], sure = 120, semt = null } = {}) {
  const n = kisiGuncel(durum, veri, id);
  if (!n || n.yok) return null;
  const t = durum.zaman.dakika, hg = tarihAl(durum.zaman.baslangic, t).getUTCDay();
  const tumu = veri.dunya.mekanlar.mekanlar.filter(m => turler.includes(m.tur) && acikMi(m, t, hg));
  const yakin = tumu.filter(m => m.semt === (semt ?? n.semt));
  const aday = (yakin.length ? yakin : tumu).sort((a, b) => turler.indexOf(a.tur) - turler.indexOf(b.tur) || a.id.localeCompare(b.id));
  const m = aday.length ? Rng.akis(durum.seed, `bulus|${id}|${gunNo(t)}`).sec(aday.filter(x => x.tur === aday[0].tur)) : null;
  if (!m) return null;
  durum.konum = { semt: m.semt, mekan: m.id };
  const k = durum.npcler?.[id];
  if (!k) return null;
  k.sonGorus = t;
  delete k.ayrildi;
  durum.sohbet = { npc: id, mekan: m.id, kalan: sabir(veri, n, k) + 2, kullanilan: {}, bekleyen: null, bas: t, bulusma: t + sure };
  return m;
}

// ------------------------------------------------------------------ flört hesapları

export function yonelim(seed, n, veri) {
  const w = veri.npc.flort.kurallar.yonelim;
  return Rng.akis(seed, 'yonelim|' + n.id).agirlikliSec(Object.entries(w).map(([k, agirlik]) => ({ k, agirlik }))).k;
}

// Flört seçenekleri görünür mü: ikiniz de reşit, yaş farkı makul
export function flortUygun(durum, veri, n) {
  const o = oyuncu(durum, veri), kr = veri.npc.flort.kurallar;
  if (n.yas < 18 || o.yas < 18) return false;
  return Math.abs(n.yas - o.yas) <= kr.yasFarkiTaban + kr.yasFarkiOran * Math.min(n.yas, o.yas);
}

// Flörte engel: yalnızca yönelim (cinsiyetine ilgi duymaz). ~~İlişkisi olan ('evli') engeldi~~ → 3.13'ten beri
// evli/sevgilili olmak kapı değil: ne kadar açık olduğu sadakat.js'te hesaplanır ve ilgiye işler.
export function flortEngeli(durum, veri, n) {
  const o = oyuncu(durum, veri), y = yonelim(durum.seed, n, veri);
  if (o.cinsiyet && ((y === 'karsi' && o.cinsiyet === n.cinsiyet) || (y === 'ayni' && o.cinsiyet !== n.cinsiyet))) return 'yonelim';
  return null;
}

// Kişinin sana ilgisi (belirlenimli taban + değişenler)
export function ilgi(durum, veri, n, k) {
  const f = veri.npc.flort, w = f.ilgi, o = oyuncu(durum, veri);
  const uyum = Rng.akis(durum.seed, 'uyum|' + n.id).aralik(...f.kurallar.uyum);
  return uyum + (o.cekicilik - 5) * w.cekicilik + (o.karizma - 5) * w.karizma + (k?.iliski?.yakinlik ?? 0) * w.yakinlik
    + (n.eksenler.disadonuk - 3) * w.disadonuk + (k?.iliski?.cekim ?? 0) * w.cekim + Math.abs(n.yas - o.yas) * w.yasFarki
    + ((durum.durumlar?.ruh ?? 50) - 50) * w.ruh + (k?.iliski?.arzu ?? 0) * (w.arzu ?? 0) - partnerCezasi(durum, veri, n, k)
    + (durum.sohbet?.npc === n.id ? Math.min(3, durum.sohbet.icki ?? 0) * 4 : 0); // birlikte içtikçe (3.22)
}

// Buluşma: ertesi akşam 20.00'de olay (data/olaylar/iliski.json → randevu)
// Buluşma yeri kişiye göre (3.11): kuşağı, içip içmediği, dindarlığı; aynı kişiyle üst üste aynı yer seçilmez
const RANDEVU_YERLERI = [
  { olay: 'randevu', w: { genc: 2, orta: 2, yasli: 2 } }, // Kordon
  { olay: 'randevu_meyhane', w: { genc: 0.6, orta: 2, yasli: 1.5 }, icki: true },
  { olay: 'randevu_bar', w: { genc: 2.5, orta: 0.8, yasli: 0 }, icki: true },
  { olay: 'randevu_seyir', w: { genc: 1.5, orta: 1.2, yasli: 1 } },
  { olay: 'randevu_vapur', w: { genc: 1.5, orta: 1.5, yasli: 1.2 } },
  { olay: 'randevu_han', w: { genc: 1, orta: 1.5, yasli: 2 } },
];
function randevuYeri(durum, veri, n, k) {
  // Partneri olanla buluşma gizli olur (3.13); ateşli olan arada herkesin içinde de buluşur (risk)
  if (partnerli(n) && veri.olaylar?.randevu_gizli) {
    const tip = sadakatTipi(aciklik(durum, veri, n, k));
    if (!(tip === 'atesli' && Rng.akis(durum.seed, `acik|${n.id}|${k.randevuSayisi ?? 0}`).olasilik(0.3))) return 'randevu_gizli';
    k.iliski.risk = (k.iliski.risk ?? 0) + 3;
  }
  const ku = kusak(n, veri.npc.sohbet);
  const d = veri.npc.derinlik ? derinlik(durum.seed, n, veri) : {};
  const adaylar = RANDEVU_YERLERI.filter(x => x.olay === 'randevu' || veri.olaylar?.[x.olay]).map(x => {
    let a = x.w[ku];
    if (x.icki && (d.dindarlikI ?? 0) >= 3) a = 0; // ibadetini yapan meyhaneye, bara çağırmaz
    if (x.icki && d.kotuAliskanlikId === 'icki') a *= 2;
    if (x.olay === k.sonRandevu) a *= 0.05;
    return { olay: x.olay, agirlik: a };
  }).filter(x => x.agirlik > 0);
  return Rng.akis(durum.seed, `randevu|${n.id}|${k.randevuSayisi ?? 0}`).agirlikliSec(adaylar).olay;
}

export function randevuKur(durum, veri, id, n, k) {
  const dk = durum.zaman.dakika;
  const zaman = dk - gunDakikasi(dk) + 1440 + 20 * 60;
  const olay = randevuYeri(durum, veri, n, k);
  k.sonRandevu = olay;
  k.randevuSayisi = (k.randevuSayisi ?? 0) + 1;
  const kd = { ad: n.hitapAdi, cinsiyet: n.cinsiyet };
  if (olay === 'randevu_gizli') {
    k.sonGizliRandevu = gunNo(zaman);
    k.vicdanSoyledi = false;
    kd.esAd = (veri.npc.derinlik && aileAgaci(durum.seed, n, veri).es?.ad) || 'eşi';
    kd.partner = n.medeni === 'evli' ? 'eşi' : 'sevgilisi';
  }
  durum.zamanlayicilar.push({ zaman, olay, baglam: { npc: { kisi: id }, degisken: { kisi: kd } } });
  durum.zamanlayicilar.sort((a, b) => a.zaman - b.zaman);
  k.randevu = gunNo(zaman);
  k.anilar.push({ zaman: dk, metin: 'buluşmak için sözleştiniz' });
}

// ------------------------------------------------------------------ insanlar üzerine dedikodu


// n'nin anlatabileceği, oyuncunun duymadığı bir dedikodu: { id, metin, kisi, dogru } ya da null
export function kisiDedikodusu(durum, veri, n, mekan, rng) {
  const D = veri.npc.dedikodu, sb = veri.npc.sohbet;
  const duyulan = durum.bilgi?.dedikodular || {};
  const burada = new Set(mekan ? mekandakiler(durum, veri, mekan, mekan.kalabalik?.[dilim(durum.zaman.dakika).id] ?? 0) : []);
  const tanidik = tanidiklari(veri, durum.seed, n.id).map(x => x.id).filter(id => id !== n.id);
  if (!tanidik.length) return null;
  const yeniHaber = id => veri.npc.hayatOlaylari && bilinmeyenOlaylar(durum.npcler?.[id]).length > 0;
  const agirlikli = tanidik.map(id => ({ id, agirlik: 1 + (burada.has(id) ? 4 : 0) + (tanisildiMi(durum, id) ? 3 : 0) + (yeniHaber(id) ? 12 : 0) }));
  for (let deneme = 0; deneme < 6; deneme++) {
    const tid = rng.agirlikliSec(agirlikli).id;
    // Tanıdığının sen yokken yaşadığı bir şey: en taze dedikodu
    if (yeniHaber(tid)) {
      const x = bilinmeyenOlaylar(durum.npcler[tid])[0];
      const tk = kisiGuncel(durum, veri, tid);
      const sablon = haberSablonu(veri, x, null, rng, true).replace('{meslek', '{t.meslek');
      const metin = metinCoz(sablon, rng, { durum, veri, baglam: { degisken: { t: { ad: tk.hitapAdi, meslek: x.meslek ?? tk.meslek.ad } } } }).map(p => p.metin).join(' ');
      x.bilinen = true;
      return { id: `h:${tid}:${x.gun}:${x.id}`, metin, kisi: tid, dogru: true };
    }
    const t = kisiGuncel(durum, veri, tid); // hayatındaki değişikliklerle (boşandıysa boşanmış konuşulur)
    if (!t || t.yas < 16 || t.yok) continue;
    // Kimse kendi örgütünün insanları hakkında konuşmaz
    const orgutu = x => x.figur ? veri.dunya.figurler.figurler.find(f => f.id === x.figur)?.orgut : null;
    if (orgutu(n) && orgutu(n) === orgutu(t)) continue;
    const turler = [];
    if (t.sir && sirriBiliyorMu(veri, durum.seed, n.id, tid)) turler.push({ tur: 'sir', a: 3 }); // sırrı ancak bilen anlatır (3.8)
    if (t.dert) turler.push({ tur: 'dert', a: 2 });
    if (['bosanmis', 'dul'].includes(t.medeni)) turler.push({ tur: t.medeni, a: 1.5 });
    for (const g of t.gizli || []) if (D.turler[g]) turler.push({ tur: g, a: 2 });
    // Kişi kartından (3.11): hayali, alışkanlığı, parası, ailesiyle arası, kıskançlığı — hepsi gerçek
    const dr = veri.npc.derinlik ? derinlik(durum.seed, t, veri) : {};
    if (t.hayal && t.hayal !== 'hicbir_sey' && D.turler.hayal) turler.push({ tur: 'hayal', a: 1.5 });
    if (['icki', 'kumar', 'gec'].includes(dr.kotuAliskanlikId) && D.turler[dr.kotuAliskanlikId]) turler.push({ tur: dr.kotuAliskanlikId, a: 1.2 });
    if (['rahat', 'varlıklı'].includes(dr.para) && D.turler.varlikli) turler.push({ tur: 'varlikli', a: 1 });
    if (dr.para === 'borç içinde' && D.turler.borcIcinde) turler.push({ tur: 'borcIcinde', a: 1.5 });
    if (['kus', 'kopuk'].includes(t.aile?.iliski) && D.turler.aileKopuk) turler.push({ tur: 'aileKopuk', a: 1 });
    if (dr.kiskanclik >= 5 && D.turler.kiskanc) turler.push({ tur: 'kiskanc', a: 1 });
    // Seninle gizli ilişkisi görülmüşse (3.13): mahalle konuşur
    const gk = durum.npcler?.[tid];
    if (gk?.gizli && (gk.iliski?.risk ?? 0) >= 3 && D.turler.seninle) turler.push({ tur: 'seninle', a: 6 });
    const es = tanidik.find(u => u !== tid && gizliIliskiMi(veri, durum.seed, t, kisi(veri, durum.seed, u)));
    if (es) turler.push({ tur: ['evli', 'sevgilili'].includes(t.medeni) ? 'askEvli' : 'ask', a: 4, u: es });
    const yalan = rng.olasilik(D.oran.yalan);
    const sec = yalan || !turler.length ? { tur: 'yalan' } : rng.agirlikliSec(turler.map(x => ({ ...x, agirlik: x.a })));
    const anahtar = `p:${tid}:${sec.tur}${sec.u ? ':' + sec.u : ''}`;
    if (duyulan[anahtar]) continue;
    const tanisik = tanisildiMi(durum, tid);
    const u = sec.u ? kisi(veri, durum.seed, sec.u) : null;
    const tv = { ad: t.hitapAdi, sir: ortaya(sirMetni(t, veri) ?? ''), dert: ortaya(dertMetni(t, veri) ?? ''), hayal: ortaya(hayalMetni(t, veri) ?? ''), tarif: gorunus(t, veri) };
    let metin = sozSec(durum, null, D.turler[sec.tur], rng, sb.hafiza);
    const ctx = { durum, veri, baglam: { degisken: { t: tv, u: u ? { ad: u.hitapAdi } : {} } } };
    metin = metinCoz(metin, rng, ctx).map(p => p.metin).join(' ');
    if (burada.has(tid) && !tanisik) metin = metinCoz(rng.sec(D.burada), rng, ctx)[0].metin + ' ' + metin;
    return { id: anahtar, metin, kisi: tid, dogru: sec.tur !== 'yalan' };
  }
  return null;
}

export function dedikoduKaydet(durum, d, mekan, kaynak) {
  durum.bilgi.dedikodular ??= {};
  durum.bilgi.dedikodular[d.id] = { gun: gunNo(durum.zaman.dakika), mekan: mekan?.id, kaynak, metin: d.metin, kisi: d.kisi, dogru: d.dogru };
}

// ------------------------------------------------------------------ tanışma ve oturma

export function tanis(durum, veri, rng, mekan, kalabalik, id) {
  const sb = veri.npc.sohbet;
  if (!kisiOrada(durum, veri, mekan, kalabalik, id)) return { tamam: false, sebep: 'O artık burada değil.' };
  if (tanisildiMi(durum, id)) return { tamam: false, sebep: 'Zaten tanışıyorsunuz.' };
  const gun = gunNo(durum.zaman.dakika);
  durum.bilgi.retler ??= {};
  if (durum.bilgi.retler[id] === gun) return { tamam: false, sebep: 'Bugün bir kere denedin; üstüne gitme.' };
  const n = kisi(veri, durum.seed, id);
  const p = [{ tur: 'secim', metin: 'Tanış: ' + gorunus(n, veri) }];
  zamanGecir(durum, sb.sure.tanis, 'normal', veri.sim);
  const t = sb.tanisma;
  const ilgiPayi = flortUygun(durum, veri, n) && !flortEngeli(durum, veri, n) ? Math.max(0, ilgi(durum, veri, n, null)) * t.cekimEtkisi : 0;
  const olasilik = sinir(t.kabulTaban + (n.eksenler.disadonuk - 3) * t.eksenEtkisi.disadonuk + (n.eksenler.uyumlu - 3) * t.eksenEtkisi.uyumlu + (durum.durumlar.ruh - 50) * t.ruhEtkisi + ilgiPayi, 0.1, 0.95);
  p.push(...anlat(durum, veri, n, null, t.ac, rng));
  if (rng.olasilik(olasilik)) {
    const k = npcKaydet(durum, id, sablonBul(veri, durum.seed, id), { katman: 'tanidik', gun });
    k.tanisildi = gun;
    k.nerede = mekan.id;
    k.iliski.yakinlik = (k.iliski.yakinlik ?? 0) + rng.aralik(...sb.yakinlik.tanisma);
    k.bilinen = {};
    k.anilar.push({ zaman: durum.zaman.dakika, metin: `${ek(mekan.ad, 'de', { iyelik: mekan.iyelik })} tanıştınız` });
    katmanYukselt(durum, id, 'tanidik');
    if (n.fizik) p.push({ tur: 'anlati', metin: fizikTarifi(n, veri.npc.gorunus) });
    p.push(...soyle(durum, veri, n, k, t.kendini, rng));
    if (n.hitapAdi !== n.ad) p.push(...soyle(durum, veri, n, k, t.lakap, rng));
    p.push({ tur: 'sistem', metin: `${n.hitapAdi} tanıdıklarına eklendi` });
    oturumBaslat(durum, id, mekan, sabir(veri, n, k) - 1);
    // Tanışınca çoğu zaman o da sana bir şey sorar
    if (rng.olasilik(0.6)) p.push(...soruSor(durum, veri, n, k, rng));
  } else {
    durum.bilgi.retler[id] = gun;
    const ret = t.ret;
    p.push(...anlat(durum, veri, n, null, n.eksenler.uyumlu <= 2 && rng.olasilik(0.5) ? ret.sert : ret[kusak(n, sb)], rng));
  }
  aksiyonKaydet(durum, 'tanis:' + id, { mekan: mekan.id });
  return { tamam: true, paragraflar: p };
}

export function yaninaOtur(durum, veri, rng, mekan, kalabalik, id) {
  const sb = veri.npc.sohbet;
  if (!kisiOrada(durum, veri, mekan, kalabalik, id)) return { tamam: false, sebep: 'O artık burada değil.' };
  if (!tanisildiMi(durum, id)) return { tamam: false, sebep: 'Önce tanışmanız lazım.' };
  const k = durum.npcler[id], n = kisiGuncel(durum, veri, id);
  const p = [{ tur: 'secim', metin: `${ek(n.hitapAdi, 'in')} yanına otur` }];
  zamanGecir(durum, sb.sure.otur, 'normal', veri.sim);
  // Az önce konuştuğunla (3.13): o kalktıysa meşguldür; sen kalktıysan dönüşünü ilgisine göre karşılar
  const ara = k.ayrildi ? durum.zaman.dakika - k.ayrildi.zaman : Infinity;
  if (ara < sb.tekrarOturma.bekleme) {
    if (k.ayrildi.kim === 'o' || (k.donus ?? 0) >= 1) {
      p.push(...anlat(durum, veri, n, k, sb.tekrarOturma.mesgul, rng));
      return { tamam: true, paragraflar: p };
    }
    const sevindi = veri.npc.flort && flortUygun(durum, veri, n) ? ilgi(durum, veri, n, k) >= veri.npc.flort.esikler.iyi : (k.iliski.yakinlik ?? 0) >= 20;
    p.push(...soyle(durum, veri, n, k, sevindi ? sb.tekrarOturma.sevindi : sb.tekrarOturma.sikildi, rng));
    k.donus = (k.donus ?? 0) + 1;
    oturumBaslat(durum, id, mekan, sevindi ? sabir(veri, n, k) : Math.max(2, Math.floor(sabir(veri, n, k) / 2)));
    aksiyonKaydet(durum, 'otur:' + id);
    return { tamam: true, paragraflar: p };
  }
  k.donus = 0;
  // ~~Gerginse "Şimdi olmaz" deyip konuşmazdı~~ (3.19: barışmanın yolu kapanıyordu) → soğuk bir yüzleşme başlar
  if ((k.iliski.gerginlik ?? 0) >= sb.gerginlikEsigi) {
    oturumBaslat(durum, id, mekan, Math.max(3, Math.floor(sabir(veri, n, k) / 2)));
    k.sonGorus = durum.zaman.dakika;
    if (!gerginKarsilama(durum, veri, rng, n, k, p, ARACLAR)) { p.push(...anlat(durum, veri, n, k, sb.kacinir, rng)); oturumBitir(durum); }
    aksiyonKaydet(durum, 'otur:' + id);
    return { tamam: true, paragraflar: p };
  }
  const hal = veri.npc.gorunus ? gununHali(durum.seed, n, gunNo(durum.zaman.dakika), veri.npc.gorunus) : null;
  if (hal) p.push({ tur: 'anlati', metin: `${n.hitapAdi} ${hal.metin}.` });
  const yak = k.iliski.yakinlik ?? 0;
  const bugunGordu = k.ayrildi && gunNo(k.ayrildi.zaman) === gunNo(durum.zaman.dakika);
  p.push(...soyle(durum, veri, n, k, (k.iliski.gerginlik ?? 0) >= 4 ? sb.selam.soguk : bugunGordu ? sb.selam.bugun : yak >= 25 ? sb.selam.yakin : sb.selam.yeni, rng));
  oturumBaslat(durum, id, mekan, sabir(veri, n, k));
  k.sonGorus = durum.zaman.dakika;
  // Başka biriyle flörtünü duyduysa önce hesap sorar (3.14)
  if (askKarsilama(durum, veri, rng, n, k, p, ARACLAR)) { aksiyonKaydet(durum, 'otur:' + id); return { tamam: true, paragraflar: p }; }
  // Gizli buluşmadan sonra kararsız olanın vicdanı (bir kez)
  if (k.gizli && k.sonGizliRandevu && !k.vicdanSoyledi && sadakatTipi(aciklik(durum, veri, n, k)) === 'kararsiz') {
    p.push(...soyle(durum, veri, n, k, veri.npc.flort.vicdan, rng, { esAd: (veri.npc.derinlik && aileAgaci(durum.seed, n, veri).es?.ad) || 'o' }));
    k.vicdanSoyledi = true;
  }
  // Sen yokken hayatında bir şey olduysa önce onu anlatır (3.6)
  const haber = veri.npc.hayatOlaylari ? bilinmeyenOlaylar(k).find(x => haberSablonu(veri, x, kusak(n, sb), rng)) : null;
  if (haber) {
    const t = haberSablonu(veri, haber, kusak(n, sb), rng).replace('{meslek', '{s.yeniMeslek');
    p.push(...soyle(durum, veri, n, k, [t], rng, { yeniMeslek: haber.meslek ?? n.meslek.ad }));
    for (const x of bilinmeyenOlaylar(k)) x.bilinen = true;
    k.anilar.push({ zaman: durum.zaman.dakika, metin: 'sana hayatındaki değişikliği anlattı' });
    aksiyonKaydet(durum, 'otur:' + id);
    return { tamam: true, paragraflar: p };
  }
  // İlgisi yüksekse flörtü o başlatabilir
  const f = veri.npc.flort;
  if (f && flortUygun(durum, veri, n) && !flortEngeli(durum, veri, n) && ilgi(durum, veri, n, k) >= f.esikler.npcBaslatir && rng.olasilik(0.45)) {
    p.push(...soyle(durum, veri, n, k, f.npcBaslatir, rng));
    k.iliski.cekim = (k.iliski.cekim ?? 0) + 1;
  } else if (rng.olasilik(0.35)) p.push(...soruSor(durum, veri, n, k, rng));
  aksiyonKaydet(durum, 'otur:' + id);
  return { tamam: true, paragraflar: p };
}

// Oturum hâlâ geçerli mi: aynı mekandasın ve o kişi hâlâ orada
export function oturumGecerli(durum, veri) {
  const o = durum.sohbet;
  if (!o || durum.konum?.mekan !== o.mekan) return false;
  if (o.bulusma) return durum.zaman.dakika < o.bulusma; // seni çağırdı, buluştunuz (3.17): o kalkana kadar orada
  if (o.evde) return evArkadasiEvde(durum, veri); // ev arkadaşın (3.21)
  const m = mekanBul(veri.dunya, o.mekan);
  const kal = m.kalabalik?.[dilim(durum.zaman.dakika).id] ?? 0;
  return mekandakiler(durum, veri, m, kal).includes(o.npc);
}

// ------------------------------------------------------------------ karşılıklı: sorular ve seçimler

function soruTanimi(veri, bekleyen) {
  const sb = veri.npc.sohbet;
  if (bekleyen.tur === 'secim') return sb.secimler[bekleyen.id];
  return sb.sorular[bekleyen.id] ?? veri.npc.flort?.sorular?.[bekleyen.id];
}

function kosulTutar(durum, veri, n, k, kosul = {}) {
  const b = k.bilinen ?? {};
  if (kosul.bilmiyor && b['oyuncu_' + kosul.bilmiyor]) return false;
  if (kosul.biliyor && !b['oyuncu_' + kosul.biliyor]) return false;
  if (kosul.yakinlikMin !== undefined && (k.iliski.yakinlik ?? 0) < kosul.yakinlikMin) return false;
  if (kosul.hikaye && !durum.hikaye) return false;
  if (kosul.konusanCalisiyor && !(['calisiyor', 'kendi'].includes(n.durum) || n.mekan)) return false;
  return true;
}

// Kişi sana bir şey sorar (uygun bir soru varsa): sorunun cümlesi + bekleyen cevap
function soruSor(durum, veri, n, k, rng) {
  const sb = veri.npc.sohbet, f = veri.npc.flort;
  const gun = gunNo(durum.zaman.dakika);
  k.sorulan ??= {};
  const adaylar = [];
  for (const [id, s] of Object.entries(sb.sorular)) {
    if (k.sorulan[id] !== undefined && (s.tekrarGun === undefined || gun - k.sorulan[id] < s.tekrarGun)) continue;
    if (!kosulTutar(durum, veri, n, k, s.kosul)) continue;
    adaylar.push({ id, agirlik: s.agirlik ?? 1 });
  }
  if (f && flortUygun(durum, veri, n) && !flortEngeli(durum, veri, n)) {
    const ig = ilgi(durum, veri, n, k);
    if (ig >= f.esikler.iyi && !k.bilinen?.oyuncu_medeni && k.sorulan.yalniz_mi === undefined) adaylar.push({ id: 'yalniz_mi', agirlik: 4 });
    if (ig >= f.esikler.davet + 10 && k.numara && !(k.randevu >= gun) && (k.sorulan.bulusalim === undefined || gun - k.sorulan.bulusalim >= 4)) adaylar.push({ id: 'bulusalim', agirlik: 5 });
  }
  // Kişi kartından: müziğin, takımın, hobin (3.10)
  adaylar.push(...derinSoruAdaylari(durum, veri, n, k));
  if (!adaylar.length) return [];
  const id = rng.agirlikliSec(adaylar).id;
  if (id.startsWith('zevk:')) return derinSoruSor(durum, veri, rng, n, k, id, ARACLAR);
  const s = sb.sorular[id] ?? f.sorular[id];
  k.sorulan[id] = gun;
  durum.sohbet.bekleyen = { tur: 'soru', id };
  return soyle(durum, veri, n, k, s.soru, rng);
}

function kararVer(durum, veri, n, k, karar, rng) {
  const oz = x => n.ozellikler.includes(x);
  switch (karar) {
    case 'saka': return oz('sakaci') || (!oz('alingan') && !oz('asik_surat') && rng.olasilik(0.6));
    case 'durust': return (n.eksenler.uyumlu >= 3 || oz('yardimsever')) && !(oz('kuskucu') && rng.olasilik(0.5)) && !(oz('umursamaz') && rng.olasilik(0.5));
    case 'acik': return n.eksenler.acik >= 3 || rng.olasilik(0.5);
    case 'dengeli': return n.eksenler.dengeli >= 3 || rng.olasilik(0.5);
    case 'ilgi': return ilgi(durum, veri, n, k) >= veri.npc.flort.esikler.iyi;
    default: return true;
  }
}

function iliskiEkle(k, etki, rng, olumlu) {
  for (const [ad, x] of Object.entries(etki || {})) {
    let v = deger(rng, x);
    if (!olumlu && v > 0) v = Math.floor(v / 3);
    k.iliski[ad] = (k.iliski[ad] ?? 0) + v;
  }
  if (!olumlu) k.iliski.gerginlik = (k.iliski.gerginlik ?? 0) + 1;
}

function cevapla(durum, veri, rng, n, k, id, p) {
  const sb = veri.npc.sohbet, o = durum.sohbet;
  const def = soruTanimi(veri, o.bekleyen);
  const c = def?.cevaplar.find(x => x.id === id);
  if (!c) return { tamam: false, sebep: 'Bunu şimdi söyleyemezsin.' };
  p.push(...sen(durum, veri, n, k, c.soz, rng));
  let iyi = kararVer(durum, veri, n, k, c.karar, rng);
  // Hemşeri çıkmak
  if (c.karar === 'memleket') {
    const om = oyuncu(durum, veri).memleket;
    if (om && om === n.memleket) {
      p.push(...soyle(durum, veri, n, k, sb.memleket.hemseri, rng));
      k.iliski.yakinlik = (k.iliski.yakinlik ?? 0) + 3;
    }
    iyi = true;
    if (!om && c.id === 'durust') { // buralıyım dedin
      p.push(...soyle(durum, veri, n, k, sb.memleket.oyuncuBurali, rng));
      iliskiEkle(k, c.etki, rng, true);
      k.bilinen.oyuncu_memleket = true;
      o.bekleyen = null;
      return { tamam: true };
    }
  }
  const kaynak = c.tepkiKaynak ? (() => { const [s, cid] = c.tepkiKaynak.split('/'); return sb.sorular[s].cevaplar.find(x => x.id === cid).tepki; })() : c.tepki;
  p.push(...beden(durum, veri, n, k, rng));
  p.push(...soyle(durum, veri, n, k, (iyi ? kaynak.iyi : kaynak.kotu) ?? kaynak.iyi, rng));
  iliskiEkle(k, c.etki, rng, iyi);
  k.bilinen ??= {};
  if (c.ogren) k.bilinen['oyuncu_' + c.ogren] = true;
  if (c.ani) k.anilar.push({ zaman: durum.zaman.dakika, metin: c.ani });
  // Önemli cevaplar kişinin hafızasına (yapay zekâ sohbeti bunları bilir)
  if (['hikaye', 'is', 'memleket', 'semt', 'medeni', 'yalan'].includes(c.ogren)) ozetEkle(durum, n.id, `Oyuncu ona şunu söyledi: "${p.filter(x => x.konusan === 'Sen').map(x => x.metin).at(-1)}"`);
  if (c.bayrak) bayrakKoy(durum, c.bayrak, n.id);
  if (c.randevu && !(k.randevu >= gunNo(durum.zaman.dakika))) { randevuKur(durum, veri, n.id, n, k); p.push({ tur: 'sistem', metin: `Yarın akşam ${n.hitapAdi} ile buluşacaksın` }); }
  o.bekleyen = null;
  return { tamam: true };
}

// ------------------------------------------------------------------ konular

// Şu an yapılabilecek flört hamleleri (iltifat, takılma, numara, buluşma + romantik hamleler)
export function flortHamleleri(durum, veri, n, k) {
  const sb = veri.npc.sohbet, o = durum.sohbet, gun = gunNo(durum.zaman.dakika);
  if (!veri.npc.flort || !flortUygun(durum, veri, n) || k.bilinen?.flortEngel === 'yonelim') return [];
  const l = [];
  // 3.16: hiçbiri tek seferlik değil. İltifat/takılma oturumda iki kez (günlük sınırla); reddedilen numara ve buluşma
  // yeniden istenebilir (ısrar) — ne olacağı belli olmaz
  const tavan = { iltifat: 2, takil: 2, numara: 3, davet: 2 };
  for (const [konu, t] of Object.entries(sb.konular)) {
    if (!t.flort || (o.kullanilan[konu] ?? 0) >= (tavan[konu] ?? 1)) continue;
    let ad = t.baslik;
    if ((konu === 'iltifat' || konu === 'takil') && (k.iltifatGun?.[gun] ?? 0) >= veri.npc.flort.kurallar.gunlukIltifat) continue;
    if (konu === 'numara') {
      if (k.numara || sahteSurer(k) || k.seninNumaran >= gun - 1 || (k.numaraIsrar?.[gun] ?? 0) >= 2) continue;
      if (k.sahteNumara?.ogrendi === true) ad = 'Numarasını yine iste (öncekisi yanlış çıktı)';
      else if (k.numaraRet === gun) ad = 'Numarasını yine iste (ısrar et)';
    }
    if (konu === 'davet') {
      if (!k.numara || k.randevu >= gun || (k.davetRet === gun && k.davetIsrar === gun)) continue; // randevu: buluşma günü (geçtiyse yeniden teklif edilebilir)
      if (k.davetRet === gun) ad = 'Buluşma için ısrar et';
    }
    l.push({ konu, ad, dakika: t.sure });
  }
  if (veri.npc.flort.ask) l.push(...askKonulari(durum, veri, n, k, ilgi(durum, veri, n, k)));
  return l;
}

// Oturumdayken seçilebilecekler: bekleyen bir soru/seçim varsa yalnızca cevaplar; yoksa konular
export function sohbetKonulari(durum, veri) {
  const o = durum.sohbet;
  if (!o) return [];
  const sb = veri.npc.sohbet, k = durum.npcler?.[o.npc];
  if (!k) return [];
  const n = kisiGuncel(durum, veri, o.npc);
  if (o.bekleyen?.tur === 'flortMenu') return [...flortHamleleri(durum, veri, n, k), { konu: 'flort:vazgec', ad: 'Vazgeç', dakika: 0 }];
  if (o.bekleyen?.tur === 'zevk') return derinSecenekler(durum, veri, n, k, o.bekleyen);
  if (o.bekleyen?.tur === 'ask') return askSecenekler(durum, veri);
  if (o.bekleyen) {
    const def = soruTanimi(veri, o.bekleyen);
    const l = (def?.cevaplar || []).filter(c => !c.kosul || kosulTutar(durum, veri, n, k, c.kosul)).map(c => ({ konu: 'cevap:' + c.id, ad: c.ad, dakika: sb.sure.cevap }));
    // Derdini anlatınca ona özel teklifler de cevap olur (3.21)
    return o.bekleyen.id === 'dert_tepki' ? [...kancaSecenekleri(durum, veri, n, k).filter(x => !x.konu.endsWith(':takip')), ...l] : l;
  }
  const yak = k.iliski?.yakinlik ?? 0, gun = gunNo(durum.zaman.dakika);
  const liste = [];
  for (const [konu, t] of Object.entries(sb.konular)) {
    if (konu !== 'bitir' && o.kullanilan[konu]) continue;
    if (t.birKez && k.bilinen?.[konu]) continue;
    if (t.gunde && k.konuGun?.[konu] === gun) continue;
    if (konu === 'hayal' && yak < sb.esikler.dert) continue;
    if ((konu === 'dedikodu' || konu === 'tanidik') && yak < sb.esikler.dedikodu) continue;
    if (t.flort) continue; // flört hamleleri "Flört et…" altında (3.14)
    liste.push({ konu, ad: t.baslik, dakika: t.sure });
  }
  // Kişi kartından derin konular (3.10): oturum başına birkaç tane, "bitir"den önce
  // Seçenekler kalabalıklaşmasın (telefonda en çok ≈12): önce tanıdıklar, gündem, mahalle düşer; derin konulara 1–3 yer
  for (const dus of ['tanidik', 'gundem', 'semt']) {
    const i = liste.findIndex(x => x.konu === dus);
    if (liste.length > 10 && i >= 0) liste.splice(i, 1);
  }
  // Flört (3.14): bütün hamleler tek bir "Flört et…" girişinin altında; menü kalabalıklaşmaz, hiçbir hamle gizlenmez
  if (flortHamleleri(durum, veri, n, k).length) {
    const bi = liste.findIndex(x => x.konu === 'bitir');
    liste.splice(bi >= 0 ? bi : liste.length, 0, { konu: 'flort', ad: 'Flört et…', dakika: 0 });
  }
  const bitir = liste.findIndex(x => x.konu === 'bitir');
  const yer = Math.max(1, Math.min(veri.npc.zevk?.gosterim.oturumBasi ?? 0, 12 - liste.length));
  liste.splice(bitir >= 0 ? bitir : liste.length, 0, ...derinKonular(durum, veri, n, k, yer));
  // Az önce söylediği bir şeye özel cevaplar en başta (3.21); menü taşmasın diye en çok 4
  // O anın durumuna uygun seçenekler (3.22): en çok 3
  const ozel = [...kancaSecenekleri(durum, veri, n, k).slice(0, 3), ...anSecenekleri(durum, veri, n, k).slice(0, 3)];
  // Menü taşmasın (≈14): ana özel seçenekler varken önce tanıdıklar, gündem, mahalle, kendinden bahset düşer
  for (const dus of ['tanidik', 'gundem', 'semt', 'kendin']) {
    const i = liste.findIndex(x => x.konu === dus);
    if (liste.length + ozel.length > 14 && i >= 0) liste.splice(i, 1);
  }
  return [...ozel, ...liste];
}

export function sohbetHamlesi(durum, veri, rng, konu) {
  const o = durum.sohbet;
  if (!o) return { tamam: false, sebep: 'Kimseyle konuşmuyorsun.' };
  const sb = veri.npc.sohbet;
  const mekan = o.evde ? evMekani(durum) : mekanBul(veri.dunya, o.mekan);
  const id = o.npc, k = durum.npcler[id], n = kisiGuncel(durum, veri, id);
  if (!oturumGecerli(durum, veri)) { oturumBitir(durum); return { tamam: false, sebep: `${n.hitapAdi} artık burada değil.` }; }
  const fl = !o.bekleyen || o.bekleyen.tur === 'flortMenu' ? flortHamleleri(durum, veri, n, k) : [];
  if (!sohbetKonulari(durum, veri).some(x => x.konu === konu) && !fl.some(x => x.konu === konu)) return { tamam: false, sebep: 'Bunu şimdi açamazsın.' };
  if (konu === 'flort') { o.bekleyen = { tur: 'flortMenu' }; return { tamam: true, paragraflar: [] }; }
  if (konu === 'flort:vazgec') { o.bekleyen = null; return { tamam: true, paragraflar: [] }; }
  if (o.bekleyen?.tur === 'flortMenu') o.bekleyen = null;
  const gun = gunNo(durum.zaman.dakika);
  k.bilinen ??= {};

  if (konu.startsWith('cevap:')) {
    const p = [];
    zamanGecir(durum, sb.sure.cevap, 'dinlenme', veri.sim);
    const s = o.bekleyen?.tur === 'zevk' ? derinCevapla(durum, veri, rng, n, k, konu.slice(8), p, ARACLAR)
      : o.bekleyen?.tur === 'ask' ? askCevapla(durum, veri, rng, n, k, konu.slice(8), p, ARACLAR)
        : cevapla(durum, veri, rng, n, k, konu.slice(6), p);
    if (!s.tamam) return s;
    aksiyonKaydet(durum, 'sohbet:' + konu, { npc: id });
    return { tamam: true, paragraflar: p };
  }

  if (konu.startsWith('kanca:') || konu.startsWith('an:')) {
    const y = [...kancaSecenekleri(durum, veri, n, k), ...anSecenekleri(durum, veri, n, k)].find(x => x.konu === konu);
    const p = [{ tur: 'secim', metin: y.ad.replace(/^"|"$/g, '') }];
    zamanGecir(durum, y.dakika, 'dinlenme', veri.sim);
    o.kullanilan[konu] = (o.kullanilan[konu] || 0) + 1;
    if (o.bekleyen?.id === 'dert_tepki') o.bekleyen = null;
    k.sonGorus = durum.zaman.dakika;
    const flort = flortUygun(durum, veri, n) && !flortEngeli(durum, veri, n);
    kancaHamlesi(durum, veri, rng, n, k, konu, p, ARACLAR, { ig: flort ? ilgi(durum, veri, n, k) : 0, flort });
    if (durum.sohbet) durum.sohbet.kalan -= 1;
    aksiyonKaydet(durum, 'sohbet:' + konu, { npc: id });
    return { tamam: true, paragraflar: p };
  }

  const t = konu.startsWith('derin:') ? veri.npc.zevk.konular[konu.slice(6)] : konu.startsWith('ask:') ? veri.npc.flort.ask.konular[konu.slice(4)] ?? veri.npc.flort.ask.serbest[konu.slice(4)] : sb.konular[konu];
  const p = [{ tur: 'secim', metin: t.baslik }];
  zamanGecir(durum, t.sure, 'dinlenme', veri.sim);
  const yak = k.iliski.yakinlik ?? 0;
  const ar = (a, b) => rng.aralik(a, b);
  const yakinlikEkle = x => { k.iliski.yakinlik = (k.iliski.yakinlik ?? 0) + x; };
  o.kullanilan[konu] = (o.kullanilan[konu] || 0) + 1;
  let soruOlabilir = true;

  if (konu === 'bitir') {
    p.push(...anlat(durum, veri, n, k, sb.bitir.sen, rng));
    p.push(...soyle(durum, veri, n, k, sb.bitir.veda, rng));
    k.ayrildi = { zaman: durum.zaman.dakika, kim: 'sen' };
    oturumBitir(durum);
    aksiyonKaydet(durum, 'sohbet:bitir');
    return { tamam: true, paragraflar: p };
  }

  if (konu !== 'dert') p.push(...beden(durum, veri, n, k, rng, konu === 'dedikodu' ? 'gizli' : null));
  k.sonGorus = durum.zaman.dakika;
  if (konu.startsWith('derin:')) {
    soruOlabilir = derinHamle(durum, veri, rng, n, k, konu.slice(6), p, ARACLAR);
  } else if (konu.startsWith('ask:') && flortEngeli(durum, veri, n) && konu !== 'ask:ayril') {
    p.push(...anlat(durum, veri, n, k, veri.npc.flort.uygunsuz.yonelim, rng));
    k.bilinen.flortEngel = 'yonelim';
    soruOlabilir = false;
  } else if (konu.startsWith('ask:')) {
    soruOlabilir = askHamlesi(durum, veri, rng, n, k, konu.slice(4), ilgi(durum, veri, n, k), p, ARACLAR);
    if (!durum.sohbet) { aksiyonKaydet(durum, 'sohbet:' + konu, { npc: id }); return { tamam: true, paragraflar: p }; }
  } else if (konu === 'hal') {
    const hal = veri.npc.gorunus ? gununHali(durum.seed, n, gun, veri.npc.gorunus).tur : 'keyifli';
    p.push(...soyle(durum, veri, n, k, n.uslup === 'kibar' && rng.olasilik(0.3) ? sb.hal.kibar : sb.hal[hal], rng));
    kancaEtiket(durum, veri, n, k, 'hal:' + hal);
    yakinlikEkle(ar(0, 2));
  } else if (konu === 'is') {
    const sahipYer = n.mekan ? mekanBul(veri.dunya, n.mekan) : null;
    const grup = sahipYer ? sb.is.sahip : sb.is[n.durum] ?? sb.is.calisiyor;
    p.push(...soyle(durum, veri, n, k, grup, rng, sahipYer ? { mekanAd: sahipYer.ad } : {}));
    kancaEtiket(durum, veri, n, k, 'is:' + (sahipYer ? 'sahip' : n.durum));
    k.bilinen.is = true; yakinlikEkle(ar(1, 2));
  } else if (konu === 'memleket') {
    const tur = n.yore === 'yurtdisi' ? 'yurtdisi' : n.koken === 'mubadil' ? 'mubadil' : n.gocmus ? (n.aile.cocuk > 0 && n.yas >= 30 && rng.olasilik(0.5) ? 'gocmusCocuklu' : 'gocmus') : n.koken ? 'koken' : 'yerli';
    p.push(...soyle(durum, veri, n, k, sb.memleket[tur], rng));
    const om = oyuncu(durum, veri).memleket;
    if (om && om === n.memleket && k.bilinen.oyuncu_memleket) p.push(...soyle(durum, veri, n, k, sb.memleket.hemseri, rng));
    kancaEtiket(durum, veri, n, k, 'memleket');
    k.bilinen.memleket = true; yakinlikEkle(ar(1, 3));
  } else if (konu === 'semt') {
    const kizgin = (n.semt === mekan.semt && (semtBul(veri.dunya, n.semt)?.sosyo?.gelir ?? 3) <= 2) || n.ozellikler.includes('kavgaci');
    const tur = kizgin ? 'kizgin' : n.ozellikler.includes('umursamaz') || n.eksenler.acik <= 2 ? 'kayitsiz' : rng.olasilik(0.5) ? 'umutlu' : 'kizgin';
    p.push(...soyle(durum, veri, n, k, sb.semt[tur], rng));
    (k.konuGun ??= {}).semt = gun;
    yakinlikEkle(ar(1, 2));
  } else if (konu === 'gundem') {
    const son = (durum.dunya?.gundem || []).filter(g => gun - g.gun <= 7);
    if (son.length) { p.push(...soyle(durum, veri, n, k, sb.gundem.var, rng, { haber: rng.sec(son).metin })); kancaEtiket(durum, veri, n, k, 'gundem'); }
    else p.push(...soyle(durum, veri, n, k, sb.gundem.yok, rng));
    yakinlikEkle(ar(0, 2));
  } else if (konu === 'kendin') {
    // Ne anlatacağını sen seçersin
    o.bekleyen = { tur: 'secim', id: 'kendin' };
    p.push({ tur: 'anlati', metin: `${n.hitapAdi} sana dönüyor; anlatmanı bekliyor.` });
    soruOlabilir = false;
  } else if (konu === 'dert') {
    if (dertAnlat(durum, veri, rng, n, k, p)) soruOlabilir = false;
  } else if (konu === 'hayal') {
    const hz = veri.npc.hayat.hayaller.find(x => x.id === n.hayal);
    const figurHayali = n.figur ? veri.dunya.figurler.figurler.find(x => x.id === n.figur)?.istek : null;
    if ((!hz && !figurHayali) || yak < sb.esikler.hayal) p.push(...soyle(durum, veri, n, k, sb.hayal.kacamak, rng));
    else if (k.bilinen.hayal) p.push(...soyle(durum, veri, n, k, sb.hayal.tekrar, rng));
    else {
      p.push(...anlat(durum, veri, n, k, sb.hayal.giris, rng));
      p.push(figurHayali ? { tur: 'anlati', metin: `Laf arasında ağzından kaçıyor: ${figurHayali}` } : { tur: 'konusma', konusan: n.hitapAdi, metin: agizla(rng.sec(hz.soz ?? [hz.metin]), n, veri, rng) });
      kancaEtiket(durum, veri, n, k, 'hayal');
      k.bilinen.hayal = true; yakinlikEkle(ar(...sb.yakinlik.hayal));
      k.anilar.push({ zaman: durum.zaman.dakika, metin: 'hayalini anlattı' });
      ozetEkle(durum, id, 'Oyuncuya hayalini anlattı.');
    }
  } else if (konu === 'dedikodu') {
    const anlatir = n.ozellikler.some(x => ['geveze', 'merakli', 'yalanci'].includes(x)) || (!n.ozellikler.some(x => ['ketum', 'sadik'].includes(x)) && rng.olasilik(0.65));
    if (!anlatir) p.push(...soyle(durum, veri, n, k, sb.dedikodu.reddeder, rng));
    else {
      // Çoğunlukla insanlar hakkında; ara sıra mekanın/semtin meselesi
      const mk = anlatacagiDedikodu(durum, veri, n, mekan);
      const kd = !mk || rng.olasilik(0.7) ? kisiDedikodusu(durum, veri, n, mekan, rng) : null;
      if (kd) {
        p.push(...soyle(durum, veri, n, k, sb.dedikodu.anlatir, rng, { dedikodu: kd.metin }));
        dedikoduKaydet(durum, kd, mekan, id);
        kancaEtiket(durum, veri, n, k, 'dedikodu', { kisiAd: kisi(veri, durum.seed, kd.kisi)?.hitapAdi ?? 'ona' });
      } else if (mk) {
        p.push(...soyle(durum, veri, n, k, sb.dedikodu.anlatir, rng, { dedikodu: mk.d.metin }));
        durum.bilgi.dedikodular ??= {};
        durum.bilgi.dedikodular[mk.d.id] = { gun, mekan: mk.m.id, kaynak: id };
      } else p.push(...soyle(durum, veri, n, k, sb.dedikodu.yok, rng));
      if (kd || mk) { p.push({ tur: 'sistem', metin: 'Duyduklarına eklendi' }); yakinlikEkle(ar(1, 2)); }
    }
  } else if (konu === 'tanidik') {
    const liste = tanidiklari(veri, durum.seed, id).filter(x => (x.id.startsWith('m:') || x.id.startsWith('f:')) && !(k.anlattigiKisiler || []).includes(x.id));
    if (!liste.length) p.push(...soyle(durum, veri, n, k, sb.tanidik.yok, rng));
    else {
      const tid = rng.sec(liste).id, tn = kisi(veri, durum.seed, tid);
      const yer = tn.mekan ? mekanBul(veri.dunya, tn.mekan) : null;
      const yerMetin = yer ? `${ek(yer.ad, 'in', { iyelik: yer.iyelik })} sahibi` : tn.meslek.ad;
      const oz = Object.keys(sb.tanidikYorum).find(x => tn.ozellikler.includes(x)) ?? '_';
      const yorum = rng.sec(sb.tanidikYorum[oz]);
      p.push(...soyle(durum, veri, n, k, sb.tanidik.anlatir, rng, { tanidikAd: tn.hitapAdi, tanidikYer: yerMetin.charAt(0).toLocaleUpperCase('tr') + yerMetin.slice(1), tanidikYorum: yorum }));
      k.anlattigiKisiler = [...(k.anlattigiKisiler || []), tid];
      yakinlikEkle(ar(1, 2));
    }
  } else if (konu === 'saka') {
    p.push(...anlat(durum, veri, n, k, sb.saka.yap, rng));
    const sonuc = n.ozellikler.includes('sakaci') ? 'guldu'
      : (n.ozellikler.includes('alingan') || n.ozellikler.includes('asik_surat')) && rng.olasilik(0.45) ? 'kizdi'
        : rng.olasilik(0.5) ? 'guldu' : 'gulumsedi';
    p.push(...anlat(durum, veri, n, k, sb.saka[sonuc], rng));
    if (sonuc === 'guldu') { yakinlikEkle(ar(...sb.yakinlik.sakaGuldu)); if (rng.olasilik(0.3)) k.anilar.push({ zaman: durum.zaman.dakika, metin: 'birlikte güldünüz' }); }
    if (sonuc === 'kizdi') { k.iliski.gerginlik = (k.iliski.gerginlik ?? 0) + 3; o.son = 'kirildi'; }
  } else if (t.flort) {
    soruOlabilir = flortHamlesi(durum, veri, rng, n, k, konu, p);
  }

  k.sohbet = (k.sohbet ?? 0) + 1;
  if (k.sohbet >= sb.katmanEsikleri.onemli) katmanYukselt(durum, id, 'onemli');
  if (k.anilar.length > 12) k.anilar.splice(0, k.anilar.length - 12);
  o.kalan -= 1;
  if (durum.sohbet && o.kalan <= 0 && !o.bekleyen) {
    p.push(...soyle(durum, veri, n, k, sb.bitir.o, rng));
    p.push({ tur: 'sistem', metin: sb.sabirBitti.replace('{s.ad}', n.hitapAdi) });
    k.ayrildi = { zaman: durum.zaman.dakika, kim: 'o' };
    oturumBitir(durum);
  } else if (durum.sohbet && soruOlabilir && !o.bekleyen) {
    // Karşılıklılık: meraklı ve dışadönük olan daha çok sorar
    const p0 = sb.esikler.soruOlasiligi * (n.ozellikler.includes('merakli') ? 1.5 : 1) * (0.6 + n.eksenler.disadonuk * 0.15);
    if (rng.olasilik(Math.min(0.85, p0))) p.push(...soruSor(durum, veri, n, k, rng));
    else if (flortUygun(durum, veri, n) && !flortEngeli(durum, veri, n)) npcAtilim(durum, veri, rng, n, k, p, ARACLAR);
  }
  aksiyonKaydet(durum, 'sohbet:' + konu, { npc: id });
  return { tamam: true, paragraflar: p };
}

// İltifat, takılma, numara, buluşma teklifi. Döner: ardından kişi soru sorabilir mi
function flortHamlesi(durum, veri, rng, n, k, konu, p) {
  const F = veri.npc.flort, gun = gunNo(durum.zaman.dakika);
  const engel = flortEngeli(durum, veri, n);
  if (konu === 'iltifat' || konu === 'takil') (k.iltifatGun ??= {})[gun] = (k.iltifatGun[gun] ?? 0) + 1;
  const soz = konu === 'numara' && k.sahteNumara?.ogrendi === true && !k.numara ? F.numara.yanlisOyuncu
    : konu === 'numara' && k.numaraRet === gun ? F.numara.israrOyuncu
      : konu === 'davet' && k.davetRet === gun ? F.davet.israrOyuncu : F[konu].oyuncu;
  p.push(...sen(durum, veri, n, k, soz, rng));
  if (engel) {
    p.push(...anlat(durum, veri, n, k, F.uygunsuz[engel], rng));
    k.bilinen.flortEngel = engel;
    ozetEkle(durum, n.id, 'Oyuncu onunla flört etmeye çalıştı; o ilgilenmediğini söyledi.');
    k.bilinen.oyuncu_flort = true;
    return false;
  }
  // Partneri olan (3.13): ilk flörtte hayatında biri olduğunu kendi tarzıyla söyler; sonra açıklığına göre davranır
  const partner = partnerli(n), tip = partner ? sadakatTipi(aciklik(durum, veri, n, k)) : null;
  const ig = ilgi(durum, veri, n, k);
  const seviye = ig >= F.esikler.iyi ? 'iyi' : ig >= F.esikler.orta ? 'orta' : 'kotu';
  if (partner && !k.bilinen.partnerVar) {
    // Açık/ateşli tavır ancak gerçekten ilgiliyse; değilse yalnızca hayatında biri olduğunu anar
    const ton = ['acik', 'atesli'].includes(tip) && seviye !== 'iyi' ? 'sadik' : tip;
    p.push(...anlat(durum, veri, n, k, F.partner[ton], rng, { partner: n.medeni === 'evli' ? (n.cinsiyet === 'e' ? 'karım' : 'kocam') : 'sevgilim' }));
    k.bilinen.partnerVar = true;
  }
  if (konu === 'iltifat' || konu === 'takil') {
    if (partner && tip === 'sadik' && seviye === 'kotu') {
      // Sadık biri sınır çizer; ısrar edersen gerilir
      k.sinirSayisi = (k.sinirSayisi ?? 0) + 1;
      p.push(...anlat(durum, veri, n, k, k.sinirSayisi >= 3 ? F.partnerIsrar : F.partnerSinir, rng));
      if (k.sinirSayisi >= 3) { k.iliski.gerginlik = (k.iliski.gerginlik ?? 0) + 2; k.iliski.cekim = (k.iliski.cekim ?? 0) - 3; }
      return false;
    }
    p.push(...anlat(durum, veri, n, k, F[konu][seviye], rng));
    if (seviye === 'kotu' && durum.sohbet) durum.sohbet.son = 'kirildi';
    if (partner && seviye === 'iyi' && rng.olasilik(0.5)) p.push(...anlat(durum, veri, n, k, F.gizliIsaret[tip], rng));
    iliskiEkle(k, F.etki[seviye], rng, seviye !== 'kotu');
    if (partner && seviye !== 'kotu') k.iliski.risk = (k.iliski.risk ?? 0) + 1; // herkesin içinde
    ozetEkle(durum, n.id, `Oyuncu ona ${konu === 'iltifat' ? 'iltifat etti' : 'tatlı tatlı takıldı'}; ${seviye === 'iyi' ? 'hoşuna gitti' : seviye === 'orta' ? 'belli etmedi' : 'hoşlanmadı'}.`);
    if (seviye === 'iyi') { kiskanclikYay(durum, veri, n.id, rng); k.iliski.arzu = Math.min(100, (k.iliski.arzu ?? 0) + 3); durum.sohbet.kalan += veri.npc.sohbet.sabir.flortEki; if (rng.olasilik(0.4)) k.anilar.push({ zaman: durum.zaman.dakika, metin: 'aranızda bir elektrik vardı' }); }
    return seviye !== 'kotu';
  }
  if (konu === 'numara') {
    if (k.sahteNumara?.ogrendi === true && !k.numara) {
      // Yanlış numarayı yüzüne vurdun: çoğu zaman utanıp gerçeğini verir
      if (rng.olasilik(sinirla(0.55 + ig / 80, 0.3, 0.95))) {
        p.push(...anlat(durum, veri, n, k, F.numara.gercek._, rng));
        ozelUygula(durum, veri, rng, n, k, ['numara'], p, ARACLAR);
        k.iliski.cekim = (k.iliski.cekim ?? 0) + 2;
        return true;
      }
      p.push(...anlat(durum, veri, n, k, F.numara.israr.kizdi.metin._, rng));
      k.sahteNumara.ogrendi = 'kapandi'; k.numaraRet = gun; (k.numaraIsrar ??= {})[gun] = 2;
      return false;
    }
    if (k.numaraRet === gun && ig < F.esikler.numara) return numaraIsrar(durum, veri, rng, n, k, ig, p);
    if (ig >= F.esikler.numara) {
      p.push(...anlat(durum, veri, n, k, partner ? F.numaraGizli : F.numara.evet, rng));
      kiskanclikYay(durum, veri, n.id, rng);
      k.numara = true;
      if (partner) k.gizli = true;
      k.iliski.cekim = (k.iliski.cekim ?? 0) + 3;
      k.anilar.push({ zaman: durum.zaman.dakika, metin: 'numarasını verdi' });
      p.push({ tur: 'sistem', metin: `${n.hitapAdi} numarasını verdi` });
      return true;
    }
    p.push(...anlat(durum, veri, n, k, F.numara.hayir, rng));
    k.numaraRet = gun;
    k.iliski.cekim = (k.iliski.cekim ?? 0) - 1;
    return false;
  }
  if (konu === 'davet') {
    if (k.davetRet === gun && ig < F.esikler.davet) {
      // Israr: kabul edebilir, "bakarız" diyebilir, kızabilir
      k.davetIsrar = gun;
      const id = sonucSec(durum, k, n, F.davet.israr, ig, rng, null);
      p.push(...anlat(durum, veri, n, k, F.davet.israr[id].metin._, rng));
      if (id === 'kabul') { if (partner) k.gizli = true; randevuKur(durum, veri, n.id, n, k); p.push({ tur: 'sistem', metin: `Yarın akşam ${n.hitapAdi} ile buluşacaksın` }); }
      if (id === 'kizdi') { k.iliski.gerginlik = (k.iliski.gerginlik ?? 0) + 2; k.iliski.cekim = (k.iliski.cekim ?? 0) - 2; }
      return false;
    }
    if (ig >= F.esikler.davet) {
      p.push(...anlat(durum, veri, n, k, partner ? F.davetGizli : F.davet.evet, rng));
      if (partner) k.gizli = true;
      randevuKur(durum, veri, n.id, n, k);
      p.push({ tur: 'sistem', metin: `Yarın akşam ${n.hitapAdi} ile buluşacaksın` });
      return false;
    }
    p.push(...anlat(durum, veri, n, k, F.davet.hayir, rng));
    k.davetRet = gun;
    k.iliski.cekim = (k.iliski.cekim ?? 0) - 2;
    return false;
  }
  return true;
}

const sinirla = (x, a, b) => Math.max(a, Math.min(b, x));

// Reddettikten sonra numarasını yine istemek (3.16): verir, yanlış numara verir, seninkini ister, telefonunu kapıp
// kendini arar, kızar ya da kalkıp gider. Ne kadar ısrar edersen kızma/gitme o kadar olası
function numaraIsrar(durum, veri, rng, n, k, ig, p) {
  const F = veri.npc.flort, gun = gunNo(durum.zaman.dakika);
  const israr = ((k.numaraIsrar ??= {})[gun] = (k.numaraIsrar[gun] ?? 0) + 1);
  const sonuclar = { ...F.numara.israr };
  if (k.sahteNumara) delete sonuclar.sahte;
  const id = sonucSec(durum, k, n, sonuclar, ig - F.esikler.numara + 20, rng, null, { israr: israr - 1 });
  p.push(...anlat(durum, veri, n, k, F.numara.israr[id].metin._, rng));
  if (id === 'verdi' || id === 'kapti') { ozelUygula(durum, veri, rng, n, k, ['numara'], p, ARACLAR); return true; }
  if (id === 'sahte') {
    // Sen bilmiyorsun: ertesi gün yazınca anlaşılır
    k.sahteNumara = { gun };
    p.push({ tur: 'sistem', metin: `${n.hitapAdi} numarasını verdi` });
    const zaman = durum.zaman.dakika - gunDakikasi(durum.zaman.dakika) + 1440 + rng.aralik(11 * 60, 19 * 60);
    durum.zamanlayicilar.push({ zaman, olay: 'sahte_numara', baglam: { npc: { kisi: n.id }, degisken: { kisi: { ad: n.hitapAdi, cinsiyet: n.cinsiyet } } } });
    durum.zamanlayicilar.sort((a, b) => a.zaman - b.zaman);
    return false;
  }
  if (id === 'seninki') {
    k.seninNumaran = gun;
    if (rng.olasilik(sinirla((ig + 20) / 60, 0.15, 0.85))) {
      const zaman = durum.zaman.dakika + rng.aralik(4 * 60, 40 * 60);
      durum.zamanlayicilar.push({ zaman, olay: 'pecete_mesaj', baglam: { npc: { kisi: n.id }, degisken: { kisi: { ad: n.hitapAdi, cinsiyet: n.cinsiyet } } } });
      durum.zamanlayicilar.sort((a, b) => a.zaman - b.zaman);
    }
    return false;
  }
  k.iliski.gerginlik = (k.iliski.gerginlik ?? 0) + 2;
  k.iliski.cekim = (k.iliski.cekim ?? 0) - 3;
  if (id === 'kalkti') { k.ayrildi = { zaman: durum.zaman.dakika, kim: 'o' }; oturumBitir(durum); }
  return false;
}

// Geliştirici/test: bu kişinin sana ilgisi ve engeli
export function flortDurumu(durum, veri, id) {
  const k = durum.npcler?.[id], n = kisi(veri, durum.seed, id, k?.sablon);
  return { uygun: flortUygun(durum, veri, n), engel: flortEngeli(durum, veri, n), ilgi: Math.round(ilgi(durum, veri, n, k)), yonelim: yonelim(durum.seed, n, veri) };
}
