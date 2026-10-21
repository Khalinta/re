// Kişi kartı yazılı sohbette (adım 3.10): müzik, futbol, hobi, günlük hayat, aile, geçmiş, hayat görüşü.
// İlkeler:
//  - Kişinin söyledikleri kişi kartından gelir (kart.js: derinlik, aile ağacı, hayat öyküsü): isimler, yıllar, yerler
//    karttakiyle aynıdır; hiçbir şey uydurulmaz.
//  - Oyuncunun zevkleri (müzik, takım, hobi) ilk söylediğinde kaydedilir (durum.karakter.zevk) ve sonra hep aynı kalır:
//    bir kişiye rap sevdiğini söyleyen öbürüne arabesk sevdiğini söyleyemez.
//  - Ortak nokta yakınlaştırır (anı olur, kişinin hafızasına girer); zıtlık (rakip takım, katılmadığın görüş) gerer.
//  - Hassas konu (kartta): yakınlık düşükken geçiştirilir, eşik aşılınca kişi açılır ve güven artar.
//  - Haftanın maçı seed + haftadan belirlenimli: herkes aynı sonucu konuşur.
// Oturumda bekleyen: { tur: 'zevk', alan: 'muzik'|'futbol'|'hobi'|'deger', soran: 'npc'|'oyuncu', deger? }
// Veri: data/npc/zevk.json. sohbet.js konuşma araçlarını (soyle, anlat, sen) parametre olarak verir.
import { Rng } from './rng.js';
import { gunNo, tarihAl } from './zaman.js';
import { ek } from './tr.js';
import { derinlik, aileAgaci, hayatOykusu, iliskiHali } from './kart.js';
import { ozetEkle } from './hafiza.js';
import { benim, kusak, oyuncu } from './sohbet.js';

const SAYI = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on', 'on bir', 'on iki'];
const sayiYaz = x => SAYI[x] ?? String(x);
const kucukBas = s => s ? s[0].toLocaleLowerCase('tr') + s.slice(1) : s;
const kusakOf = (veri, yas) => kusak({ yas }, veri.npc.sohbet);
const ZEVK = veri => veri.npc.zevk;

// Kuşağa göre havuz (dizi ya da { genc, orta, yasli, _ })
const havuz = (grup, ku) => !grup ? [] : Array.isArray(grup) ? grup : [...(grup[ku] || []), ...(grup._ || [])];

// Oyuncunun zevkleri (ilk söylediğinde kaydedilir, sonra değişmez)
export function oyuncuZevki(durum) {
  durum.karakter ??= {};
  return (durum.karakter.zevk ??= { muzik: [], hobi: [] });
}

// ------------------------------------------------------------------ haftanın maçı

// Son hafta sonunun maçı (seed + haftadan; herkes aynı sonucu bilir). Lig arasında null.
export function haftaninMaci(durum, veri, kulup) {
  const F = ZEVK(veri).futbol;
  const t = tarihAl(durum.zaman.baslangic, durum.zaman.dakika);
  const gunSayisi = Math.floor(t.getTime() / 86400000);
  const hafta = Math.floor((gunSayisi - 4) / 7); // pazartesiden pazartesiye (1970-01-05 pazartesi)
  const pazar = new Date((hafta * 7 + 4 - 1) * 86400000);
  if (!F.sezon.includes(pazar.getUTCMonth() + 1)) return null;
  const r = Rng.akis(durum.seed, `mac|${kulup}|${hafta}`);
  const sonuc = r.agirlikliSec([{ s: 'g', agirlik: 38 }, { s: 'b', agirlik: 27 }, { s: 'm', agirlik: 35 }]).s;
  const a = sonuc === 'b' ? r.aralik(0, 2) : r.aralik(1, 3);
  const b = sonuc === 'b' ? a : r.aralik(0, a - 1);
  return { sonuc, skor: sonuc === 'm' ? `${b}-${a}` : `${a}-${b}`, rakip: r.sec(F.rakipler) };
}

// ------------------------------------------------------------------ konular

const KONULAR = ['muzik', 'futbol', 'hobi', 'rutin', 'aile', 'gecmis', 'deger'];

// Ailede anlatılacak parçalar ve hassas konuyla eşleşmeleri
const HASSAS_PARCA = { 'boşanması': 'es', 'çocuğu olmaması': 'cocuk', 'annesi': 'ebeveyn', 'babası': 'ebeveyn', 'kardeşiyle arası': 'kardes' };

function aileParcalari(n, aile) {
  const p = ['es'];
  if (aile.cocuklar.length || n.medeni === 'evli' || n.yas >= 35) p.push('cocuk');
  p.push('ebeveyn', 'kardes');
  return p;
}

const oyku = (durum, veri, n) => hayatOykusu(durum.seed, n, aileAgaci(durum.seed, n, veri), veri).filter((x, i) => i > 0 && !x.metin.startsWith('Son zamanlarda'));

function hassasParca(durum, veri, n, d) {
  const parca = HASSAS_PARCA[d.hassas];
  if (!parca) return null;
  const aile = aileAgaci(durum.seed, n, veri);
  if (parca === 'kardes' && !aile.kardesler.length) return null;
  if (parca === 'ebeveyn' && !(d.hassas === 'annesi' ? aile.anne : aile.baba)) return null;
  if (parca === 'es' && !aile.es) return null;
  return parca;
}

// Bu konu şimdi açılabilir mi?
function konuUygun(durum, veri, n, k, konu, d) {
  const Z = ZEVK(veri), t = Z.konular[konu], b = k.bilinen ?? {};
  if ((k.iliski?.yakinlik ?? 0) < t.esik) return false;
  if (t.birKez && b[konu]) return false;
  if (konu === 'futbol' && t.haftada && k.futbolHafta === Math.floor(gunNo(durum.zaman.dakika) / 7)) return false;
  if (konu === 'aile') {
    const anlatilan = k.aileAnlatilan || [];
    const kalan = aileParcalari(n, aileAgaci(durum.seed, n, veri)).filter(x => !anlatilan.includes(x));
    return kalan.length > 0;
  }
  if (konu === 'gecmis') return (k.oykuSira ?? 0) < oyku(durum, veri, n).length;
  if (konu === 'deger') return (k.degerSira ?? 0) < d.degerIdler.length;
  return true;
}

// Bir oturumda görünen derin konular: en çok 'oturumBasi' (ve menüde kalan yer) kadar, çoğunlukla konuşulmamışlar
export function derinKonular(durum, veri, n, k, yer = null) {
  const Z = ZEVK(veri), o = durum.sohbet;
  if (!Z || !o) return [];
  const d = derinlik(durum.seed, n, veri);
  const adaylar = KONULAR.filter(x => !o.kullanilan['derin:' + x] && konuUygun(durum, veri, n, k, x, d));
  const r = Rng.akis(durum.seed, `derin|${n.id}|${o.bas}`);
  // Konuşulmamışlar öne çıkar ama konuşulmuşlar da (geçmişin devamı, ailenin kalanı) arada gelir
  const sirali = adaylar.map(x => ({ x, s: (k.derinKonusulan?.[x] ? 0.3 : 0) + r.sayi() })).sort((a, b) => a.s - b.s).map(a => a.x);
  return sirali.slice(0, yer ?? Z.gosterim.oturumBasi).map(x => ({ konu: 'derin:' + x, ad: Z.konular[x].baslik, dakika: Z.konular[x].sure }));
}

// ------------------------------------------------------------------ değişkenler

function kisiDegiskenleri(durum, veri, n, d) {
  const oz = oyuncuZevki(durum);
  const s = { muzik: d.muzik, hobi: d.hobi, yemek: d.yemek, kulup: d.kulup ?? '' };
  if (d.kulup) s.kulupLiyim = benim(ek(d.kulup, 'li'));
  if (oz.takim && oz.takim !== 'yok') { s.oKulup = oz.takim; s.oKulupLisin = sinEki(ek(oz.takim, 'li')); }
  return s;
}
// "Beşiktaşlı" → "Beşiktaşlısın"
function sinEki(k) {
  const son = [...k.toLocaleLowerCase('tr')].reverse().find(c => 'aeıioöuü'.includes(c)) ?? 'e';
  return k + { a: 'sın', ı: 'sın', e: 'sin', i: 'sin', o: 'sun', u: 'sun', ö: 'sün', ü: 'sün' }[son];
}

// ------------------------------------------------------------------ seçenekler (oyuncunun cevabı)

const sec = (id, ad) => ({ id, ad });

function muzikSecenekleri(durum, veri, n, k, b) {
  const Z = ZEVK(veri), oz = oyuncuZevki(durum), d = derinlik(durum.seed, n, veri);
  const ad = g => Z.muzik.tur[g]?.ad ?? g;
  if (oz.muzikYok) return [sec('m:yok', 'Pek dinlemediğini söyle'), sec('m:gec', 'Geçiştir')];
  const l = [];
  if (b.soran === 'oyuncu' && (oz.muzik.includes(d.muzik) || oz.muzik.length < 3)) l.push(sec('m:' + d.muzik, `"Ben de severim"`));
  for (const g of oz.muzik) if (!l.some(x => x.id === 'm:' + g)) l.push(sec('m:' + g, `${ad(g)} sevdiğini söyle`));
  if (!oz.muzik.length) {
    const ku = kusakOf(veri, oyuncu(durum, veri).yas);
    const r = Rng.akis(durum.seed, 'oyuncuMuzik|' + n.id);
    const oneri = veri.npc.derinlik.muzik[ku].filter(g => g !== d.muzik && Z.muzik.tur[g]);
    while (l.length < 4 && oneri.length) { const g = oneri.splice(r.aralik(0, oneri.length - 1), 1)[0]; l.push(sec('m:' + g, `${ad(g)} sevdiğini söyle`)); }
    l.push(sec('m:yok', 'Pek dinlemediğini söyle'));
  }
  l.push(sec('m:gec', 'Geçiştir'));
  return l;
}

function futbolSecenekleri(durum, veri) {
  const F = ZEVK(veri).futbol, oz = oyuncuZevki(durum);
  if (oz.takim === 'yok') return [sec('f:yok', 'Futbolla aran olmadığını söyle'), sec('f:gec', 'Geçiştir')];
  if (oz.takim) return [sec('f:' + oz.takim, F.kulupler[oz.takim].secim), sec('f:gec', 'Geçiştir')];
  return [...Object.entries(F.kulupler).map(([k, v]) => sec('f:' + k, v.secim)), sec('f:yok', 'Futbolla aran yok'), sec('f:gec', 'Geçiştir')];
}

function hobiSecenekleri(durum, veri, n, b) {
  const Z = ZEVK(veri), oz = oyuncuZevki(durum), d = derinlik(durum.seed, n, veri);
  const ad = x => Z.hobi.tur[x]?.ad ?? x;
  const l = [];
  if (b.soran === 'oyuncu') {
    if (oz.hobi.includes(d.hobi) || oz.hobi.length < 4) l.push(sec('h:ayni', '"Ben de severim"'));
    if (!oz.hobi.includes(d.hobi)) l.push(sec('h:dene', 'Hiç denemediğini söyle'), sec('h:degil', '"Bana göre değil"'));
    const kendi = oz.hobi.find(x => x !== d.hobi);
    if (kendi) l.push(sec('h:' + kendi, `${ad(kendi)} sevdiğini söyle`));
    return l;
  }
  for (const x of oz.hobi.slice(0, 3)) l.push(sec('h:' + x, `${ad(x)} sevdiğini söyle`));
  if (!oz.hobi.length) {
    const ku = kusakOf(veri, oyuncu(durum, veri).yas);
    const r = Rng.akis(durum.seed, 'oyuncuHobi|' + n.id);
    const oneri = veri.npc.derinlik.hobi[ku].filter(x => Z.hobi.tur[x] && !x.startsWith('torun'));
    while (l.length < 3 && oneri.length) { const x = oneri.splice(r.aralik(0, oneri.length - 1), 1)[0]; l.push(sec('h:' + x, `${ad(x)} sevdiğini söyle`)); }
  }
  l.push(sec('h:vakit', 'Vaktin olmadığını söyle'));
  return l;
}

// Bekleyen bir zevk sorusunun seçenekleri: [{ konu: 'cevap:z:…', ad, dakika }]
export function derinSecenekler(durum, veri, n, k, b) {
  const dk = veri.npc.sohbet.sure.cevap;
  const l = b.alan === 'muzik' ? muzikSecenekleri(durum, veri, n, k, b)
    : b.alan === 'futbol' ? futbolSecenekleri(durum, veri)
      : b.alan === 'hobi' ? hobiSecenekleri(durum, veri, n, b)
        : b.alan === 'deger' ? [sec('d:katil', 'Katıldığını söyle'), sec('d:katilma', 'Katılmadığını söyle')] : [];
  return l.map(x => ({ konu: 'cevap:z:' + x.id, ad: x.ad, dakika: dk }));
}

// ------------------------------------------------------------------ yardımcılar

function etkiEkle(k, ad, aralik, rng) {
  const v = Array.isArray(aralik) ? rng.aralik(aralik[0], aralik[1]) : aralik;
  k.iliski[ad] = (k.iliski[ad] ?? 0) + v;
}
function ani(durum, k, metin) {
  if ((k.anilar || []).some(a => a.metin === metin)) return;
  k.anilar.push({ zaman: durum.zaman.dakika, metin });
}
const konusuldu = (k, konu) => { (k.derinKonusulan ??= {})[konu] = true; };

// ------------------------------------------------------------------ konu hamleleri

// Oyuncu derin bir konu açtı. ar: { soyle, anlat, sen }. Döner: soruOlabilir
export function derinHamle(durum, veri, rng, n, k, konu, p, ar) {
  const Z = ZEVK(veri), d = derinlik(durum.seed, n, veri), ku = kusak(n, veri.npc.sohbet);
  const s = kisiDegiskenleri(durum, veri, n, d);
  const yak = k.iliski.yakinlik ?? 0;
  k.bilinen ??= {};
  konusuldu(k, konu);
  const soyle = (grup, ek2 = {}) => p.push(...ar.soyle(durum, veri, n, k, havuz(grup, ku), rng, { ...s, ...ek2 }));
  const anlat = (grup, ek2 = {}) => p.push(...ar.anlat(durum, veri, n, k, havuz(grup, ku), rng, { ...s, ...ek2 }));

  if (konu === 'muzik') {
    const tur = Z.muzik.tur[d.muzik];
    soyle(Z.muzik.giris);
    soyle(tur?.soz);
    k.bilinen.muzik = true;
    etkiEkle(k, 'yakinlik', Z.etki.konu, rng);
    if (!k.bilinen.oyuncu_muzik) { durum.sohbet.bekleyen = { tur: 'zevk', alan: 'muzik', soran: 'oyuncu' }; return false; }
    return true;
  }
  if (konu === 'futbol') {
    k.futbolHafta = Math.floor(gunNo(durum.zaman.dakika) / 7);
    const T = Z.futbol.takim[d.takimId];
    const ilgisiz = ['ilgisiz', 'nefret'].includes(d.takimId);
    if (!k.bilinen.futbol || ilgisiz) soyle(T);
    else {
      const mac = haftaninMaci(durum, veri, d.kulup);
      if (!mac) soyle(Z.futbol.mac.ligArasi);
      else soyle(Z.futbol.mac[d.takimId === 'buyuk' ? 'buyuk' : d.takimId][mac.sonuc], { skor: mac.skor, rakip: mac.rakip });
    }
    k.bilinen.futbol = true;
    etkiEkle(k, 'yakinlik', ilgisiz ? [0, 1] : Z.etki.konu, rng);
    if (!ilgisiz && !k.bilinen.oyuncu_takim) { durum.sohbet.bekleyen = { tur: 'zevk', alan: 'futbol', soran: 'oyuncu' }; return false; }
    return true;
  }
  if (konu === 'hobi') {
    const H = Z.hobi.tur[d.hobi];
    soyle(H?.soz);
    if (H?.davet && n.eksenler.disadonuk >= 3 && yak >= 6 && rng.olasilik(0.5)) soyle(H.davet);
    k.bilinen.hobi = true;
    etkiEkle(k, 'yakinlik', Z.etki.konu, rng);
    durum.sohbet.bekleyen = { tur: 'zevk', alan: 'hobi', soran: 'oyuncu' };
    return false;
  }
  if (konu === 'rutin') {
    soyle(Z.rutin.giris);
    anlat(Z.rutin.anlati, { rutin: kucukBas(d.rutin) });
    if (d.kotuAliskanlikId !== 'yok' && rng.olasilik(0.6)) soyle(Z.rutin.aliskanlik[d.kotuAliskanlikId]);
    if (rng.olasilik(0.6)) soyle(Z.rutin.yemek[d.yemek] ?? Z.rutin.yemek._);
    k.bilinen.rutin = true;
    etkiEkle(k, 'yakinlik', Z.etki.konu, rng);
    return true;
  }
  if (konu === 'aile') return aileAnlat(durum, veri, rng, n, k, d, soyle);
  if (konu === 'gecmis') {
    const liste = oyku(durum, veri, n), i = k.oykuSira ?? 0;
    soyle(Z.gecmis.giris);
    anlat(Z.gecmis.anlati);
    const parca = liste.slice(i, i + 3);
    for (const x of parca) p.push({ tur: 'anlati', metin: `${x.yil}: ${x.metin}` });
    k.oykuSira = i + parca.length;
    soyle(Z.gecmis.kapanis);
    etkiEkle(k, 'yakinlik', Z.etki.gecmis, rng);
    k.iliski.guven = (k.iliski.guven ?? 0) + 1;
    if (k.oykuSira >= liste.length) ani(durum, k, 'sana bütün hayatını anlattı');
    ozetEkle(durum, n.id, `Oyuncuya geçmişini anlattı: ${parca.map(x => `${x.yil}: ${x.metin}`).join(' ')}`);
    return true;
  }
  if (konu === 'deger') {
    const i = k.degerSira ?? 0, id = d.degerIdler[i];
    soyle(Z.deger.soz[id]);
    k.degerSira = i + 1;
    durum.sohbet.bekleyen = { tur: 'zevk', alan: 'deger', soran: 'oyuncu', deger: id };
    return false;
  }
  return true;
}

function aileAnlat(durum, veri, rng, n, k, d, soyle) {
  const A = ZEVK(veri).aile;
  const aile = aileAgaci(durum.seed, n, veri);
  const yak = k.iliski.yakinlik ?? 0, acilma = ZEVK(veri).esikler.acilma;
  const anlatilan = (k.aileAnlatilan ??= []);
  const hassas = hassasParca(durum, veri, n, d);
  const kalan = aileParcalari(n, aile).filter(x => !anlatilan.includes(x));
  if (!kalan.length) { soyle(A.bitti); return true; }
  if (!anlatilan.length) soyle(A.acilis[aile.iliski] ?? A.acilis.iyi);
  let acildi = false;
  for (const parca of kalan.slice(0, 3)) {
    if (parca === hassas && yak < acilma) { soyle(A.hassasKacis[d.hassas === 'annesi' ? 'anne' : d.hassas === 'babası' ? 'baba' : parca]); k.bilinen.hassasKacti = true; continue; }
    const v = aileDegiskenleri(aile);
    const satir = aileSatiri(A, parca, aile, n, durum, v, kusak(n, veri.npc.sohbet));
    if (satir) soyle(satir.grup, v);
    if (satir?.ek) soyle(satir.ek, v);
    if (parca === hassas) {
      // Ailesiyle arası iyi olanın hassas konusu kavga değil, kırgınlık ya da kayıptır (açılıştaki sözle çelişmesin)
      const iyi = aile.iliski === 'iyi' ? '_iyi' : '';
      const derin = parca === 'ebeveyn'
        ? (d.hassas === 'annesi' ? (aile.anne.yasiyor ? 'anne_sag' : 'anne_olu') : (aile.baba.yasiyor ? 'baba_sag' : 'baba_olu')) + iyi
        : parca === 'kardes' ? (aile.kardesler.some(x => x.kus) ? 'kardes_kus' : 'kardes' + iyi) : parca;
      soyle(A.hassasDerin.giris, v);
      soyle(A.hassasDerin[derin], v);
      k.iliski.guven = (k.iliski.guven ?? 0) + 3;
      etkiEkle(k, 'yakinlik', ZEVK(veri).etki.aileAcildi, rng);
      ani(durum, k, 'ailesiyle ilgili kimseye anlatmadığı bir şeyi sana anlattı');
      ozetEkle(durum, n.id, `Oyuncuya ailesiyle ilgili hassas bir şeyi açtı (${d.hassas}).`);
      acildi = true;
    }
    anlatilan.push(parca);
  }
  if (!acildi) etkiEkle(k, 'yakinlik', ZEVK(veri).etki.konu, rng);
  ozetEkle(durum, n.id, 'Oyuncuya ailesinden bahsetti.');
  return true;
}

function aileDegiskenleri(aile) {
  const v = {};
  if (aile.es) {
    v.esAd = aile.es.ad; v.esMeslek = aile.es.meslek;
    if (!aile.es.yasiyor && aile.es.vefatYili) v.esVefatDe = ek(String(aile.es.vefatYili), 'de');
  }
  const c = aile.cocuklar;
  if (c.length) {
    v.cocukSayi = sayiYaz(c.length);
    v.cocukAdlari = c.length === 1 ? c[0].ad : c.slice(0, -1).map(x => x.ad).join(', ') + ' ve ' + c.at(-1).ad;
    v.cocukAd = c[0].ad; v.cocukYas = String(c[0].yas ?? ''); v.cocukRol = c[0].cinsiyet === 'e' ? 'oğlum' : 'kızım';
    const buyuk = [...c].sort((a, b) => a.dogumYili - b.dogumYili)[0];
    v.buyukAd = buyuk.ad; v.buyukNerede = buyuk.nerede ?? '';
  }
  const { anne, baba } = aile;
  if (anne) v.anneAd = anne.ad;
  if (baba) v.babaAd = baba.ad;
  if (anne?.yasiyor) v.anneNerede = anne.nerede;
  if (baba?.yasiyor) v.babaNerede = baba.nerede;
  if (anne?.yasiyor && baba?.yasiyor && anne.nerede === baba.nerede) v.ebeveynNerede = anne.nerede;
  const olu = anne && !anne.yasiyor && baba?.yasiyor ? anne : baba && !baba.yasiyor && anne?.yasiyor ? baba : null;
  if (olu) {
    const sag = olu === anne ? baba : anne;
    v.olenEbeveyn = olu === anne ? 'Annem' : 'Babam';
    v.olenYilDe = ek(String(olu.vefatYili), 'de');
    v.sagEbeveyn = sag === anne ? 'Annem' : 'Babam';
    v.sagNerede = sag.nerede;
  }
  const k = aile.kardesler;
  v.kardesSayi = sayiYaz(k.length + 1);
  const buyukler = k.filter(x => x.buyuk).length;
  v.siram = buyukler === 0 ? 'en büyüğüyüm' : buyukler === k.length ? 'en küçüğüyüm' : 'ortancayım';
  const kus = k.find(x => x.kus);
  if (kus) v.kusAd = kus.ad;
  const olen = k.find(x => !x.yasiyor && x.vefatYili);
  if (olen) { v.olenKardesAd = olen.ad; v.olenKardesYilDe = ek(String(olen.vefatYili), 'de'); }
  return v;
}

// Bir aile parçası için cümle grubu (kartın gerçeğine göre)
function aileSatiri(A, parca, aile, n, durum, v, ku) {
  if (parca === 'es') {
    if (n.medeni === 'evli' && aile.es) {
      const ton = iliskiHali(durum.seed, n);
      return { grup: A.es[ton] };
    }
    if (n.medeni === 'sevgilili' && aile.es) return { grup: A.es.sevgilili };
    if (n.medeni === 'dul' && aile.es && v.esVefatDe) return { grup: A.es.dul };
    if (n.medeni === 'bosanmis' && aile.es) return { grup: A.es.bosanmis };
    return { grup: ku === 'genc' ? A.es.bekarGenc : A.es.bekar };
  }
  if (parca === 'cocuk') {
    const c = aile.cocuklar;
    if (!c.length) return n.medeni === 'evli' ? { grup: A.cocuk.yokEvli } : null;
    const buyuk = [...c].sort((a, b) => a.dogumYili - b.dogumYili)[0];
    const ek2 = buyuk.yas >= 18 && buyuk.nerede && !['yanında', "Karaliman'da"].includes(buyuk.nerede) && c.length > 1 ? A.cocuk.buyukUzakta
      : buyuk.yas >= 18 && buyuk.nerede === 'yanında' ? A.cocuk.buyukYaninda : null;
    return { grup: c.length === 1 ? A.cocuk.bir : A.cocuk.cok, ek: ek2 };
  }
  if (parca === 'ebeveyn') {
    const { anne, baba } = aile;
    if (anne?.yasiyor && baba?.yasiyor) {
      if (!v.ebeveynNerede) return { grup: A.ebeveyn.ikisiSagAyri };
      return { grup: Math.min(anne.yas, baba.yas) >= 65 ? A.ebeveyn.ikisiSagYasli : A.ebeveyn.ikisiSag };
    }
    if (v.olenEbeveyn) return { grup: A.ebeveyn.biriOlu };
    if (anne && baba && !anne.yasiyor && !baba.yasiyor) return { grup: A.ebeveyn.ikisiOlu };
    return null;
  }
  if (parca === 'kardes') {
    if (!aile.kardesler.length) return { grup: A.kardes.tek };
    return { grup: A.kardes.var, ek: v.olenKardesAd ? A.kardes.olen : null };
  }
  return null;
}

// ------------------------------------------------------------------ oyuncunun cevabı

// secId: 'm:rap' | 'f:Galatasaray' | 'h:ayni' | 'd:katil' ...
export function derinCevapla(durum, veri, rng, n, k, secId, p, ar) {
  const o = durum.sohbet, b = o.bekleyen;
  if (!derinSecenekler(durum, veri, n, k, b).some(x => x.konu === 'cevap:z:' + secId)) return { tamam: false, sebep: 'Bunu şimdi söyleyemezsin.' };
  const Z = ZEVK(veri), d = derinlik(durum.seed, n, veri), ku = kusak(n, veri.npc.sohbet), oz = oyuncuZevki(durum);
  const [alan, deger] = [secId.slice(0, 1), secId.slice(2)];
  k.bilinen ??= {};
  const vars = () => kisiDegiskenleri(durum, veri, n, d);
  const soyle = (grup, ek2 = {}) => p.push(...ar.soyle(durum, veri, n, k, havuz(grup, ku), rng, { ...vars(), ...ek2 }));
  const sen = (liste, ek2 = {}) => p.push(...ar.sen(durum, veri, n, k, liste, rng, { ...vars(), ...ek2 }));
  const oz2 = n.ozellikler || [];

  if (alan === 'm') {
    const T = Z.muzik.tur;
    if (deger === 'gec') { sen(Z.muzik.oyuncu.gecistir); soyle(Z.genel.gecistir); }
    else if (deger === 'yok') {
      if (!oz.muzik.length) oz.muzikYok = true;
      sen(Z.muzik.oyuncu.dinlemem); soyle(Z.muzik.tepki.dinlemez);
      k.bilinen.oyuncu_muzik = true;
    } else {
      if (!oz.muzik.includes(deger)) oz.muzik.push(deger);
      const ortak = deger === d.muzik;
      const ek2 = { oDinler: T[deger]?.dinler ?? deger };
      sen(ortak ? Z.muzik.oyuncu.benDe : b.soran === 'npc' ? Z.muzik.oyuncu.secim : Z.muzik.oyuncu.benim, ek2);
      if (ortak) {
        soyle(Z.muzik.tepki.ortak);
        etkiEkle(k, 'yakinlik', Z.etki.ortak, rng);
        ani(durum, k, `müzik zevkiniz aynı (${T[deger]?.ad ?? deger})`);
        ozetEkle(durum, n.id, `Oyuncu da onun sevdiği müziği seviyor (${T[deger]?.ad ?? deger}).`);
      } else {
        const acik = n.eksenler.acik >= 4 || oz2.includes('merakli');
        soyle(acik ? Z.muzik.tepki.farkliAcik : Z.muzik.tepki.farkliKapali);
        if (acik) etkiEkle(k, 'yakinlik', Z.etki.farkli, rng);
        if (b.soran === 'npc') { soyle(Z.muzik.tur[d.muzik]?.soz); k.bilinen.muzik = true; }
      }
      k.bilinen.oyuncu_muzik = true;
    }
  } else if (alan === 'f') {
    const F = Z.futbol.tepki, npcIlgisiz = ['ilgisiz', 'nefret'].includes(d.takimId);
    if (deger === 'gec') { sen(Z.futbol.oyuncu.gecistir); soyle(Z.genel.gecistir); }
    else if (deger === 'yok') {
      oz.takim ??= 'yok';
      sen(Z.futbol.oyuncu.ilgisiz);
      if (npcIlgisiz) { soyle(Z.genel.ortakIlgisiz); etkiEkle(k, 'yakinlik', [1, 2], rng); } else soyle(F.oyuncuIlgisiz);
      k.bilinen.oyuncu_takim = true;
    } else {
      oz.takim ??= deger;
      sen(Z.futbol.kulupler[deger].oyuncu);
      const siki = d.takimId === 'demirspor_siki';
      if (npcIlgisiz) soyle(F.npcIlgisiz);
      else if (deger === d.kulup) {
        soyle(siki ? F.ortakSiki : F.ortak);
        etkiEkle(k, 'yakinlik', siki ? Z.etki.ortakSiki : Z.etki.ortak, rng);
        ani(durum, k, `ikiniz de ${deger} tutuyorsunuz`);
        ozetEkle(durum, n.id, `Oyuncu da ${deger} tutuyor.`);
      } else if (deger === 'Demirspor') { soyle(F.istanbulluyaYerli); etkiEkle(k, 'yakinlik', [1, 2], rng); }
      else if (d.kulup === 'Demirspor') {
        if (siki) { soyle(F.yerliyeIstanbullu); if (!oz2.includes('sakaci')) k.iliski.gerginlik = (k.iliski.gerginlik ?? 0) + 1; }
        else soyle(F.yerliyeIstanbulluYumusak);
      } else if (oz2.includes('kavgaci') || oz2.includes('alingan')) { soyle(F.rakipKizgin); k.iliski.gerginlik = (k.iliski.gerginlik ?? 0) + Z.etki.rakipGerginlik; }
      else { soyle(F.rakip); etkiEkle(k, 'yakinlik', [0, 1], rng); }
      if (b.soran === 'npc' && !k.bilinen.futbol && !npcIlgisiz && deger !== d.kulup) { soyle(Z.futbol.takim[d.takimId]); k.bilinen.futbol = true; }
      k.bilinen.oyuncu_takim = true;
    }
  } else if (alan === 'h') {
    const H = Z.hobi;
    const hobiAd = x => (H.tur[x]?.ad ?? x).toLocaleLowerCase('tr');
    if (deger === 'ayni') {
      if (!oz.hobi.includes(d.hobi)) oz.hobi.push(d.hobi);
      sen(H.oyuncu.benDe, { oHobiSev: H.tur[d.hobi]?.sev ?? d.hobi });
      soyle(H.tepki.ortak);
      etkiEkle(k, 'yakinlik', Z.etki.ortak, rng);
      ani(durum, k, `ikiniz de ${hobiAd(d.hobi)} seviyorsunuz`);
      ozetEkle(durum, n.id, `Oyuncu da ${hobiAd(d.hobi)} seviyor.`);
    } else if (deger === 'dene') {
      sen(H.oyuncu.denemedim);
      const acik = n.eksenler.disadonuk >= 3 || n.eksenler.acik >= 4;
      soyle(acik ? H.tepki.denemedimAcik : H.tepki.denemedimKapali);
      if (acik) etkiEkle(k, 'yakinlik', [1, 2], rng);
    } else if (deger === 'degil') { sen(H.oyuncu.banaGoreDegil); soyle(H.tepki.banaGoreDegil); }
    else if (deger === 'vakit') { sen(H.oyuncu.vakitYok); soyle(H.tepki.vakitYok); }
    else {
      if (!oz.hobi.includes(deger) && oz.hobi.length < 4) oz.hobi.push(deger);
      sen(H.oyuncu.benim, { oHobiSev: H.tur[deger]?.sev ?? deger, oHobiAd: H.tur[deger]?.ad ?? deger });
      if (deger === d.hobi) {
        soyle(H.tepki.ortak);
        etkiEkle(k, 'yakinlik', Z.etki.ortak, rng);
        ani(durum, k, `ikiniz de ${hobiAd(deger)} seviyorsunuz`);
      } else {
        soyle(H.tepki.farkli);
        etkiEkle(k, 'yakinlik', Z.etki.farkli, rng);
        if (b.soran === 'npc' && !k.bilinen.hobi) { soyle(H.tur[d.hobi]?.soz); k.bilinen.hobi = true; }
      }
    }
    k.bilinen.oyuncu_hobi = true;
  } else if (alan === 'd') {
    const D = Z.deger;
    if (deger === 'katil') {
      sen(D.oyuncu.katil);
      soyle(D.tepki.katildi);
      etkiEkle(k, 'yakinlik', Z.etki.degerKatildi, rng);
      k.iliski.guven = (k.iliski.guven ?? 0) + 1;
      ani(durum, k, 'hayat üzerine anlaştınız');
    } else {
      sen(D.oyuncu.katilma);
      const saygili = n.eksenler.acik >= 4 || n.eksenler.dengeli >= 4 || oz2.includes('sakin');
      soyle(saygili ? D.tepki.saygili : D.tepki.kizdi);
      if (!saygili) k.iliski.gerginlik = (k.iliski.gerginlik ?? 0) + Z.etki.degerKatilmadiGerginlik;
    }
    (k.bilinen.degerler ??= []).push(b.deger);
  }
  o.bekleyen = null;
  return { tamam: true };
}

// ------------------------------------------------------------------ kişi soruyor

// soruSor için adaylar: [{ id: 'zevk:muzik', agirlik }]
export function derinSoruAdaylari(durum, veri, n, k) {
  const Z = ZEVK(veri);
  if (!Z) return [];
  const b = k.bilinen ?? {}, d = derinlik(durum.seed, n, veri), w = Z.esikler.soruAgirlik ?? 1.5;
  const l = [];
  if (!b.oyuncu_muzik) l.push({ id: 'zevk:muzik', agirlik: w });
  if (!b.oyuncu_takim && !['ilgisiz', 'nefret'].includes(d.takimId)) l.push({ id: 'zevk:futbol', agirlik: w * (d.takimId === 'demirspor_siki' ? 2 : 1) });
  if (!b.oyuncu_hobi && (k.iliski?.yakinlik ?? 0) >= 2) l.push({ id: 'zevk:hobi', agirlik: w });
  return l;
}

export function derinSoruSor(durum, veri, rng, n, k, id, ar) {
  const Z = ZEVK(veri), alan = id.slice(5), ku = kusak(n, veri.npc.sohbet);
  durum.sohbet.bekleyen = { tur: 'zevk', alan, soran: 'npc' };
  (k.sorulan ??= {})[id] = gunNo(durum.zaman.dakika);
  return ar.soyle(durum, veri, n, k, havuz(Z[alan].soru, ku), rng, {});
}

// ------------------------------------------------------------------ kişi paneli

// Oyuncunun bu kişi hakkında öğrendikleri (Hayatım → Tanıdıklarım)
export function ogrendiklerim(durum, veri, id, n) {
  const k = durum.npcler?.[id], Z = ZEVK(veri);
  if (!k?.bilinen || !Z) return [];
  const b = k.bilinen, d = derinlik(durum.seed, n, veri), l = [];
  if (b.muzik) l.push(['Müzik', Z.muzik.tur[d.muzik]?.ad ?? d.muzik]);
  if (b.futbol) l.push(['Futbol', d.kulup && d.takimId === 'buyuk' ? `${d.kulup} tutar` : d.takim]);
  if (b.hobi) l.push(['Boş vakti', Z.hobi.tur[d.hobi]?.ad ?? d.hobi]);
  if (b.rutin) l.push(['Günleri', d.rutin]);
  if (b.degerler?.length) l.push(['Hayat görüşü', b.degerler.map(x => d.degerler[d.degerIdler.indexOf(x)]).filter(Boolean).join('; ')]);
  return l;
}

// Oyuncunun kendi zevkleri (Hayatım → Karakter)
export function zevkOzeti(durum, veri) {
  const oz = durum.karakter?.zevk, Z = ZEVK(veri);
  if (!oz || !Z) return [];
  const l = [];
  if (oz.muzik?.length) l.push(['Müzik', oz.muzik.map(g => Z.muzik.tur[g]?.ad ?? g).join(', ')]);
  else if (oz.muzikYok) l.push(['Müzik', 'pek dinlemezsin']);
  if (oz.takim) l.push(['Futbol', oz.takim === 'yok' ? 'futbolla aran yok' : oz.takim]);
  if (oz.hobi?.length) l.push(['Boş vakit', oz.hobi.map(x => Z.hobi.tur[x]?.ad ?? x).join(', ')]);
  return l;
}
