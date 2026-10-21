// Karakter derinliği (adım 3.7): aile ağacı, insanlar arası ilişki ağı, yıl yıl hayat öyküsü, değerler,
// beğeniler, korkular, mizah/flört tarzı, para, sağlık, günlük rutin — ve hepsini bir araya getiren "kişi kartı".
// Her şey seed + kişi kimliğinden belirlenimli; kişinin NPC motorundaki bilgileriyle (yaş, aile, meslek, kancalar,
// dert, sır) tutarlı olacak şekilde türetilir. Kayıtta tutulan tek şey değişenlerdir (npchayat, sohbet).
// Veri: data/npc/derinlik.json → veri.npc.derinlik
import { Rng } from './rng.js';
import { SIMDIKI_YIL, donemBul, npcTanimi, fizikTarifi, dertMetni, hayalMetni, sirMetni } from './npc.js';
import { olayYili } from './dunya.js';
import { metinCoz } from './metin.js';
import { ek } from './tr.js';
import { kisi, tanidiklari } from './insanlar.js';
import { kisiGuncel, bilinenOlaylar } from './npchayat.js';

export const kusakOf = n => n.yas <= 29 ? 'genc' : n.yas <= 54 ? 'orta' : 'yasli';
const agirlikliSec = (r, liste) => r.agirlikliSec(liste.map(([k, a]) => ({ k, agirlik: a }))).k;

// derinlik.json'daki { agirlik, carpan: [{ kusak | eksen | yerli, x }] } öğelerinden kişiye göre seçim
function kosulluAgirlik(o, n) {
  let w = o.agirlik ?? 1;
  // kosul: kesin şart (tutmazsa hiç seçilmez)
  for (const [e, [en, ust]] of Object.entries(o.kosul?.eksen || {})) if (n.eksenler[e] < en || n.eksenler[e] > ust) return 0;
  if (o.kosul?.kusak && !o.kosul.kusak.includes(kusakOf(n))) return 0;
  for (const c of o.carpan || []) {
    let tut = true;
    if (c.kusak && c.kusak !== kusakOf(n)) tut = false;
    if (c.yerli !== undefined && c.yerli !== !n.gocmus) tut = false;
    for (const [e, [en, ust]] of Object.entries(c.eksen || {})) if (n.eksenler[e] < en || n.eksenler[e] > ust) tut = false;
    if (tut) w *= c.x;
  }
  return w;
}
function sec(r, liste, n, adet = 1) {
  const havuz = liste.map(o => ({ o, agirlik: kosulluAgirlik(o, n) })).filter(x => x.agirlik > 0);
  const sonuc = [];
  while (sonuc.length < adet && havuz.length) {
    const x = r.agirlikliSec(havuz);
    sonuc.push(x.o);
    havuz.splice(havuz.indexOf(x), 1);
  }
  return adet === 1 ? sonuc[0] : sonuc;
}

// ------------------------------------------------------------------ aile ağacı

const adUret = (r, veri, dogumYili, cinsiyet) => r.sec(donemBul(veri.npc.isimler, dogumYili)[cinsiyet === 'e' ? 'erkek' : 'kadin']);
const nereli = (r, D) => agirlikliSec(r, D.nerede);

// Döner: { es, cocuklar[], anne, baba, kardesler[], iliski } — yaşlar ve ölümler kişinin bilgileriyle tutarlı
export function aileAgaci(seed, n, veri) {
  const D = veri.npc.derinlik, a = n.aile;
  const r = Rng.akis(seed, 'aile|' + n.id);
  const yabanci = n.yore === 'yurtdisi';
  const isim = (yil, c) => yabanci ? r.sec(veri.npc.isimler.yabanci[n.ulke][c === 'e' ? 'erkek' : 'kadin']) : adUret(r, veri, yil, c);
  const sonuc = { iliski: a.iliski, cocuklar: [], kardesler: [] };
  // Ebeveynler (anne ve baba npc motorunda yaşlarıyla var)
  for (const [rol, c] of [['anne', 'k'], ['baba', 'e']]) {
    const x = a[rol];
    if (!x) continue;
    const dogum = n.dogumYili - (x.yas - n.yas);
    const p = { rol, ad: isim(dogum, c), soyad: n.soyad, cinsiyet: c, dogumYili: dogum, yasiyor: x.yasiyor !== false };
    if (p.yasiyor) { p.yas = SIMDIKI_YIL - dogum; p.nerede = n.gocmus && r.olasilik(0.7) ? ek(n.memleket, 'de') : nereli(r, D); }
    else { const tahmin = Math.min(SIMDIKI_YIL - 1, Math.max(n.dogumYili + 3, dogum + 45 + r.aralik(0, 35))); p.vefatYili = x.vefatYili ?? tahmin; } // vefatYili: hayat olayından (npchayat)
    sonuc[rol] = p;
  }
  // Eş / eski eş / sevgili
  if (a.es) {
    const dogum = SIMDIKI_YIL - a.es.yas;
    const durumu = { evli: 'eşi', bosanmis: 'eski eşi', dul: 'rahmetli eşi', sevgilili: 'sevgilisi' }[n.medeni] ?? 'eşi';
    const es = { rol: n.medeni === 'sevgilili' ? 'sevgili' : 'es', durumu, ad: a.es.ad, soyad: yabanci ? r.sec(veri.npc.isimler.yabanci[n.ulke].soyadlari) : r.sec(veri.npc.isimler.soyadlari), cinsiyet: a.es.cinsiyet, dogumYili: dogum, meslek: r.sec(D.esMeslek) };
    if (n.medeni === 'dul') { es.yasiyor = false; es.vefatYili = SIMDIKI_YIL - r.aralik(1, Math.max(1, Math.min(15, n.yas - 25))); }
    else { es.yasiyor = true; es.yas = a.es.yas; }
    sonuc.es = es;
  }
  // Çocuklar: en büyüğü ebeveynlerin en küçüğünden en az 18 yaş küçük
  const enGencEbeveyn = Math.min(n.yas, sonuc.es?.yasiyor === false ? n.yas : (a.es?.yas ?? n.yas));
  const cocukSoyad = n.cinsiyet === 'e' || !sonuc.es ? n.soyad : sonuc.es.soyad;
  let ust = enGencEbeveyn - 18;
  for (let i = 0; i < (a.cocuk ?? 0) && ust >= 0; i++) {
    const yas = Math.max(0, ust - r.aralik(i === 0 ? 0 : 1, i === 0 ? Math.min(12, ust) : 4));
    ust = yas - 1;
    const c = r.olasilik(0.5) ? 'e' : 'k';
    const ck = { rol: 'cocuk', ad: isim(SIMDIKI_YIL - yas, c), soyad: cocukSoyad, cinsiyet: c, dogumYili: SIMDIKI_YIL - yas, yas, yasiyor: true };
    if (yas >= 18) { ck.medeni = yas >= 26 && r.olasilik(0.5) ? 'evli' : 'bekar'; ck.nerede = nereli(r, D); }
    else ck.nerede = 'yanında';
    sonuc.cocuklar.push(ck);
  }
  // Kardeşler: annenin 17–45 yaşları arasında doğmuş olmalı
  const anneDogum = sonuc.anne?.dogumYili ?? n.dogumYili - 25;
  for (let i = 0; i < (a.kardes ?? 0); i++) {
    let dogum = n.dogumYili + (r.olasilik(0.5) ? 1 : -1) * r.aralik(1, 12);
    dogum = Math.max(anneDogum + 17, Math.min(anneDogum + 45, dogum, SIMDIKI_YIL));
    // Kardeşler (ve kişinin kendisi) farklı yıllarda doğar; ikizlik nadiren
    const dolu = new Set([n.dogumYili, ...sonuc.kardesler.map(x => x.dogumYili)]);
    for (let deneme = 0; dolu.has(dogum) && !r.olasilik(0.03) && deneme < 30; deneme++) dogum = Math.max(anneDogum + 17, Math.min(anneDogum + 45, dogum + (deneme % 2 ? -(deneme + 1) : deneme + 1)));
    if (dogum === n.dogumYili) dogum += dogum + 1 <= anneDogum + 45 ? 1 : -1;
    const c = r.olasilik(0.5) ? 'e' : 'k';
    const yas = SIMDIKI_YIL - dogum;
    const yasiyor = yas < 70 ? r.olasilik(0.97) : r.olasilik(0.6);
    const k = { rol: 'kardes', ad: isim(dogum, c), soyad: n.soyad, cinsiyet: c, dogumYili: dogum, yasiyor, buyuk: dogum < n.dogumYili };
    if (yasiyor) { k.yas = yas; k.medeni = yas >= 24 && r.olasilik(0.6) ? 'evli' : 'bekar'; k.nerede = nereli(r, D); }
    else k.vefatYili = Math.min(SIMDIKI_YIL - 1, dogum + r.aralik(20, Math.max(21, SIMDIKI_YIL - dogum - 1)));
    // Kardeşlerden birine küs (aile ilişkisi 'kus' ise)
    if ((a.iliski === 'kus' || n.sir === 'kus_kardes') && i === 0) k.kus = true;
    sonuc.kardesler.push(k);
  }
  sonuc.kardesler.sort((x, y) => x.dogumYili - y.dogumYili);
  derdeUydur(seed, n, veri, sonuc);
  return sonuc;
}

// Kişinin derdi ailesinden bahsediyorsa aile ağacı ona uyar (3.11): "oğlu iş bulamıyor" diyenin yetişkin bir oğlu,
// "çocukları başka şehirde" diyenin uzakta yaşayan çocukları, "okul masrafı" diyenin okul çağında bir çocuğu olur.
// Ayrı bir akıştan: ağacın geri kalanı değişmez.
function derdeUydur(seed, n, veri, sonuc) {
  const c = sonuc.cocuklar;
  if (!c.length) return;
  const r = Rng.akis(seed, 'aileDert|' + n.id);
  const yabanci = n.yore === 'yurtdisi';
  const ad = (yil, cins) => yabanci ? r.sec(veri.npc.isimler.yabanci[n.ulke][cins === 'e' ? 'erkek' : 'kadin']) : adUret(r, veri, yil, cins);
  if (n.dert === 'oglu_issiz') {
    const b = c[0];
    if (b.cinsiyet !== 'e') { b.cinsiyet = 'e'; b.ad = ad(b.dogumYili, 'e'); }
    if (b.yas < 22 && n.yas - 18 >= 22) { b.yas = 22 + r.aralik(0, Math.min(6, n.yas - 40)); b.dogumYili = SIMDIKI_YIL - b.yas; }
    if (b.yas >= 18) { b.nerede = "Karaliman'da"; b.medeni ??= 'bekar'; }
  }
  if (n.dert === 'evlat_uzakta') for (const x of c) if (x.yas >= 18 && ["Karaliman'da", 'yanında'].includes(x.nerede)) x.nerede = r.sec(["İstanbul'da", "Ankara'da", "İzmir'de", 'yurt dışında']);
  if (n.dert === 'cocuk_okul') {
    const s = c[c.length - 1];
    if (s.yas >= 18) { s.yas = r.aralik(7, 17); s.dogumYili = SIMDIKI_YIL - s.yas; s.nerede = 'yanında'; delete s.medeni; }
  }
}

// ------------------------------------------------------------------ insanlar arası ilişki ağı

// Gizli ilişki: dedikodu motoruyla aynı hesap (sohbet.js ayrıca kullanır)
const ciftSayi = (seed, a, b, etiket) => Rng.akis(seed, etiket + '|' + [a, b].sort().join('|')).sayi();
export function gizliIliskiMi(veri, seed, ta, ub) {
  if (!ta || !ub || ta.id === ub.id) return false;
  if (ciftSayi(seed, ta.id, ub.id, 'ask') >= veri.npc.dedikodu.askOlasiligi) return false;
  return ta.yas >= 18 && ub.yas >= 18 && Math.abs(ta.yas - ub.yas) <= 15 && ta.cinsiyet !== ub.cinsiyet;
}

// İki kişi arasındaki bağın türü: iki taraftan da aynı görünür
export function bagTuru(veri, seed, a, b, nasil) {
  const na = kisi(veri, seed, a), nb = kisi(veri, seed, b);
  if (!na || !nb) return null;
  if (gizliIliskiMi(veri, seed, na, nb)) return 'gizli_iliski';
  const r = Rng.akis(seed, 'bag|' + [a, b].sort().join('|'));
  const yetiskin = na.yas >= 18 && nb.yas >= 18;
  const fark = Math.abs(na.yas - nb.yas);
  const calisan = x => !['ogrenci', 'emekli', 'issiz', 'ev'].includes(x.durum);
  const w = {
    arkadas: fark <= 15 ? 4 : fark <= 30 ? 2 : 1,
    komsu: nasil === 'mahalleden' ? 4 : 0.5,
    is: nasil === 'aynı mekanın insanları' && (calisan(na) || calisan(nb) || na.mekan || nb.mekan) ? 3 : 0.5,
    kus: 1.2,
    rakip: na.meslek.ad === nb.meslek.ad && calisan(na) && calisan(nb) ? 2 : 0, // rakip ancak aynı işi yapanlar
    kanka: fark <= 8 ? 1.2 : 0,
    eski_sevgili: yetiskin && na.cinsiyet !== nb.cinsiyet && fark <= 10 ? 0.6 : 0,
    borc: na.yas >= 18 && nb.yas >= 18 ? 0.3 : 0,
  };
  const t = agirlikliSec(r, Object.entries(w).filter(([, x]) => x > 0));
  if (t !== 'borc') return t;
  // Borçta yön çiftten belirlenir: biri borçlu, öbürü alacaklı
  // Çalışmayan (öğrenci, işsiz) çoğunlukla borç alan taraftır
  const [x, y] = [a, b].sort();
  const nx = x === a ? na : nb, ny = x === a ? nb : na;
  const borclu = calisan(nx) !== calisan(ny) && r.olasilik(0.85) ? (calisan(nx) ? y : x) : (r.olasilik(0.5) ? x : y);
  return borclu === a ? 'borclu' : 'alacakli';
}

// Kişinin ilişki ağı: tanıdıklarının en anlamlıları, türü, iki yönlü hisleri ve kısa geçmişi
export function iliskiAgi(veri, seed, id, enCok = 10) {
  const D = veri.npc.derinlik.baglar.turler;
  const n = kisi(veri, seed, id);
  if (!n) return [];
  const liste = [];
  for (const t of tanidiklari(veri, seed, id)) {
    const tur = bagTuru(veri, seed, id, t.id, t.nasil);
    if (!tur) continue;
    const u = kisi(veri, seed, t.id);
    const [en, ust] = D[tur].his;
    const ortak = en + ciftSayi(seed, id, t.id, 'his') * (ust - en);
    const sapma = y => Math.round(ortak + (Rng.akis(seed, `his|${y}`).sayi() - 0.5) * 20);
    const yer = n.mekan || n.mekanMudavimi ? veri.dunya.mekanlar.mekanlar.find(m => m.id === (n.mekan ?? n.mekanMudavimi)) : null;
    const yerAd = yer ? ek(yer.ad, 'de', { iyelik: yer.iyelik }) : 'mahallede';
    const sablon = Rng.akis(seed, 'gecmis|' + [id, t.id].sort().join('|')).sec(D[tur].gecmis);
    const gecmis = metinCoz(sablon, null, { baglam: { degisken: { a: n.hitapAdi, b: u.hitapAdi, yer: yerAd } } }).map(p => p.metin).join(' ');
    const onem = { gizli_iliski: 10, kanka: 8, eski_sevgili: 7, kus: 6, borclu: 5, alacakli: 5, rakip: 4, arkadas: 3, is: 2, komsu: 1 }[tur];
    liste.push({ id: t.id, ad: u.hitapAdi, nasil: t.nasil, tur, turAd: D[tur].ad, onunHissi: sapma(id + '>' + t.id), karsiHis: sapma(t.id + '>' + id), gecmis, onem });
  }
  // En anlamlılar önce; aynı türden (arkadaş dışında) en çok iki kişi
  const sayac = {};
  return liste.sort((x, y) => y.onem - x.onem || x.id.localeCompare(y.id))
    .filter(x => x.tur === 'arkadas' || (sayac[x.tur] = (sayac[x.tur] ?? 0) + 1) <= 2).slice(0, enCok);
}

// ------------------------------------------------------------------ değerler, beğeniler, rutin

export function derinlik(seed, n, veri) {
  const D = veri.npc.derinlik;
  const r = Rng.akis(seed, 'derin|' + n.id);
  const ku = kusakOf(n);
  const dindarlik = agirlikliSec(r, D.dindarlik.kusak[ku].map((a, i) => [i, a]));
  const mekanTuru = r.sec(ku === 'yasli' ? (n.cinsiyet === 'k' ? ['komşularda', 'parkta', 'çarşıda'] : ['kahvede', 'parkta', 'camide']) : ku === 'genc' ? ['kafelerde', 'sahilde', 'barlarda', 'arkadaşlarıyla'] : ['kahvede', 'meyhanede', 'sahilde', 'çarşıda']);
  const rutinler = D.rutin[n.durum] ?? D.rutin.calisiyor;
  const gelir = n.gelir ?? 3;
  let paraI = Math.max(0, Math.min(5, gelir - 1 + r.aralik(-1, 1) + (n.durum === 'issiz' ? -1 : 0) + (n.gizli?.includes('borclu') ? -2 : 0)));
  const dertTanim = veri.npc.hayat.dertler.find(x => x.id === n.dert);
  if (dertTanim?.para) paraI = Math.min(paraI, 1); // parayla ilgili dert: varlıklı olamaz
  // Not: çekiliş sırası değişmemeli (aynı seed → aynı kişi); kimlikler (…Id) sohbette kullanılır (3.10)
  const degerler = sec(r, D.degerler, n, 2), gundem = sec(r, D.gundemBakisi, n), takim = sec(r, D.takim, n);
  const muzik = r.sec(D.muzik[ku]), yemek = r.sec(D.yemek);
  let ka;
  // Torunu olmayanın hobisi torunlar olmaz
  const hobi = r.sec(D.hobi[ku].filter(x => !(x.startsWith('torun') && !((n.aile?.cocuk ?? 0) > 0 && n.yas >= 50))));
  return {
    degerler: degerler.map(x => x.ad), degerIdler: degerler.map(x => x.id),
    dindarlik: D.dindarlik.adlar[dindarlik], dindarlikI: dindarlik,
    gundem: gundem.ad, gundemId: gundem.id,
    takim: takim.ad, takimId: takim.id,
    // Büyük takım tutanın kulübü: ayrı akıştan (yukarıdaki çekilişleri değiştirmesin)
    ...(takim.id === 'buyuk' ? { kulup: Rng.akis(seed, 'kulup|' + n.id).sec(D.kulupler) } : takim.id.startsWith('demirspor') ? { kulup: 'Demirspor' } : {}),
    muzik,
    yemek,
    hobi,
    korku: r.sec(D.korkular),
    hassas: r.sec([...D.hassasKonular._, ...(D.hassasKonular[ku] || [])].filter(x => !(x === 'boşanması' && n.medeni !== 'bosanmis') && !(x === 'çocuğu olmaması' && ((n.aile?.cocuk ?? 0) > 0 || n.yas < 32)))),
    mizah: sec(r, D.mizah, n).ad,
    flort: sec(r, D.flortTarzi, n).ad,
    guven: sec(r, D.guvenTarzi, n).ad,
    kiskanclik: Math.max(1, Math.min(5, 3 + (n.ozellikler.includes('kiskanc') ? 2 : 0) - (n.eksenler.dengeli >= 4 ? 1 : 0) + r.aralik(-1, 1))),
    kotuAliskanlik: (ka = sec(r, D.kotuAliskanlik, n)).ad, kotuAliskanlikId: ka.id,
    saglik: dertTanim?.saglik ? 'sağlık sorunları var' : agirlikliSec(r, D.saglik[ku]),
    para: D.para[paraI],
    rutin: r.sec(rutinler).replace('{mekanTuru}', mekanTuru),
  };
}

// ------------------------------------------------------------------ yıl yıl hayat öyküsü

export function hayatOykusu(seed, n, aile, veri) {
  const r = Rng.akis(seed, 'oyku|' + n.id);
  const D = veri.npc.derinlik;
  const o = [];
  const ekle = (yil, metin) => { if (yil >= n.dogumYili && yil <= SIMDIKI_YIL) o.push({ yil, metin }); };
  const dogumYeri = n.yore === 'yurtdisi' || n.gocmus ? n.memleket : 'Karaliman';
  ekle(n.dogumYili, `${ek(dogumYeri, 'de')} doğdu.`);
  const egitim = n.egitim;
  if (['lise', 'meslek_lisesi', 'universite', 'yuksek_lisans'].includes(egitim) && n.yas >= 18) ekle(n.dogumYili + 18, egitim === 'meslek_lisesi' ? 'Meslek lisesini bitirdi.' : 'Liseyi bitirdi.');
  if (['ilkokul', 'ortaokul'].includes(egitim) && n.yas >= 15) ekle(n.dogumYili + (egitim === 'ilkokul' ? 11 : 14), 'Okulu bıraktı; çalışmaya başladı.');
  if (['universite', 'yuksek_lisans'].includes(egitim) && n.yas >= 22) ekle(n.dogumYili + 22 + r.aralik(0, 2), `${agirlikliSec(r, D.universiteYeri)} üniversiteyi bitirdi.`);
  if (n.durum === 'ogrenci' && n.yas >= 18) ekle(n.dogumYili + 18 + r.aralik(0, 1), 'Üniversiteye başladı.');
  if (n.gocmus) {
    const gocYas = n.durum === 'ogrenci' ? 18 : r.aralik(Math.min(16, n.yas), Math.max(Math.min(16, n.yas), Math.min(n.yas, 35)));
    ekle(n.dogumYili + gocYas, n.yore === 'yurtdisi' ? `${ek(n.memleket, 'den')} Türkiye'ye, Karaliman'a geldi.` : `${ek(n.memleket, 'den')} Karaliman'a geldi.`);
  }
  if (!['ogrenci'].includes(n.durum) && n.yas >= 19) ekle(n.dogumYili + ({ okumamis: 13, ilkokul: 14, ortaokul: 16, lise: 19, meslek_lisesi: 18, universite: 23, yuksek_lisans: 26 }[egitim] ?? 18) + r.aralik(0, 2), 'İlk işine başladı.');
  // Evlilik, çocuklar, ayrılık
  const es = aile.es;
  if (es && es.rol === 'es') {
    const ilkCocuk = aile.cocuklar.length ? Math.min(...aile.cocuklar.map(c => c.dogumYili)) : null;
    const enErken = Math.max(n.dogumYili + 18, es.dogumYili + 18);
    let evlilik = ilkCocuk ? ilkCocuk - r.aralik(0, 3) : n.dogumYili + r.aralik(22, 32);
    evlilik = Math.max(enErken, Math.min(evlilik, ilkCocuk ?? SIMDIKI_YIL - 1, SIMDIKI_YIL - 1));
    ekle(evlilik, `${es.ad} ile evlendi.`);
    for (const c of [...aile.cocuklar].sort((x, y) => x.dogumYili - y.dogumYili)) ekle(Math.max(evlilik, c.dogumYili), `${c.cinsiyet === 'e' ? 'Oğlu' : 'Kızı'} ${c.ad} doğdu.`);
    const sonCocuk = aile.cocuklar.length ? Math.max(...aile.cocuklar.map(c => c.dogumYili)) : evlilik;
    if (n.medeni === 'bosanmis') ekle(Math.min(SIMDIKI_YIL, Math.max(evlilik + 1, sonCocuk) + r.aralik(0, Math.max(0, SIMDIKI_YIL - Math.max(evlilik + 1, sonCocuk)))), `${es.ad} ile boşandı.`);
    if (es.vefatYili) { es.vefatYili = Math.max(es.vefatYili, evlilik + 1); ekle(es.vefatYili, `Eşi ${es.ad} vefat etti.`); }
  } else if (es && es.rol === 'sevgili') ekle(SIMDIKI_YIL - r.aralik(0, 3), `${es.ad} ile görüşmeye başladı.`);
  for (const p of [aile.anne, aile.baba]) if (p?.vefatYili) ekle(Math.max(p.vefatYili, n.dogumYili), `${p.rol === 'anne' ? 'Annesi' : 'Babası'} ${p.ad} vefat etti.`);
  for (const k of aile.kardesler) if (k.vefatYili) ekle(Math.max(k.vefatYili, n.dogumYili + 1), `${k.buyuk ? (k.cinsiyet === 'e' ? 'Ağabeyi' : 'Ablası') : 'Kardeşi'} ${k.ad} vefat etti.`);
  if (n.durum === 'emekli' && n.yas >= 50) ekle(SIMDIKI_YIL - r.aralik(1, Math.max(1, Math.min(20, n.yas - 50))), 'Emekli oldu.');
  // Şehrin tarihindeki izleri
  const cizelge = veri.dunya?.sehir?.zamanCizelgesi || [];
  for (const kk of n.kancalar || []) {
    const olay = cizelge.find(x => (x.kancalar || []).includes(kk));
    if (!olay) continue;
    const yil = olayYili(olay);
    if (yil >= n.dogumYili) ekle(yil, `${olay.ad}: o sırada ${yil - n.dogumYili} yaşındaydı.`);
    else o.push({ yil, metin: `${olay.ad}: ailesi o günleri yaşadı.`, once: true });
  }
  if (n.dert) ekle(SIMDIKI_YIL, `Son zamanlarda: ${dertMetni(n, veri)}`);
  return o.sort((x, y) => x.yil - y.yil);
}

// ------------------------------------------------------------------ kişi kartı

// Zamanla değişebilen alanlar (kişinin hayatı değişince: boşanma, iş, taşınma). Bu olgular söylendiği andaki
// kart değeriyle (iz) saklanır; kart değişince 'eskiden doğruydu' sayılır ve yerine yenisi söylenebilir.
// Geçmişe dair olgular (yaş, anne/baba adı, memleket, çocuk/kardeş sayısı, serbest olgular) değişmez.
export const DEGISEBILIR = { medeni: k => k.medeni, meslek: k => `${k.durum}|${k.meslek}`, semt: k => k.semt };
export const olguIzi = (kart, alan) => DEGISEBILIR[alan]?.(kart) ?? null;
// Olgu bugün de geçerli mi? (izi olmayan eski kayıtlar geçerli sayılır)
export const olguGuncelMi = (kart, o) => !DEGISEBILIR[o.alan] || o.iz == null || o.iz === olguIzi(kart, o.alan);


// Bir kişinin bütün bilgisi (oyuncuyla ilişkisi dahil). Yapay zekâ sohbeti (3.9) ve geliştirici paneli kullanır.
export function kisiKarti(durum, veri, id) {
  const k = durum.npcler?.[id];
  const n = kisiGuncel(durum, veri, id) ?? kisi(veri, durum.seed, id);
  if (!n) return null;
  const v = veri.npc;
  const aile = aileAgaci(durum.seed, n, veri);
  const kart = {
    id, ad: n.hitapAdi, tamAd: n.tamAd, yas: n.yas, cinsiyet: n.cinsiyet, kusak: kusakOf(n),
    tanim: npcTanimi(n, veri), memleket: n.memleket, yore: n.yore, koken: n.koken, agiz: n.agiz, uslup: n.uslup, tik: n.tik,
    egitim: n.egitim, meslek: n.meslek.ad, durum: n.durum, medeni: n.medeni, semt: n.semt,
    gorunus: n.fizik && v.gorunus ? fizikTarifi(n, v.gorunus) : null,
    eksenler: n.eksenler, ozellikler: n.ozellikler.map(o => v.kisilik.ozellikler.find(x => x.id === o)?.ad).filter(Boolean),
    gizliler: (n.gizli || []).map(g => v.kisilik.gizliler[g]?.ad).filter(Boolean),
    tuhaflik: n.tuhaflik, alisanliklar: n.alisanliklar,
    dert: dertMetni(n, veri), hayal: hayalMetni(n, veri), sir: sirMetni(n, veri),
    derinlik: derinlik(durum.seed, n, veri),
    aile, oyku: hayatOykusu(durum.seed, n, aile, veri), ag: iliskiAgi(veri, durum.seed, id),
    hayatOlaylari: bilinenOlaylar(durum, veri, id),
    olgular: [], // konuşmalarda kesinleşmiş olgular (3.8); aşağıda, güncel kartla süzülerek
    oyuncuyla: k ? { iliski: k.iliski, tur: k.iliskiTuru ?? null, numara: !!k.numara, bildikleri: Object.keys(k.bilinen || {}).filter(x => x.startsWith('oyuncu_')).map(x => x.slice(7)), anilar: (k.anilar || []).map(a => a.metin) } : null,
  };
  kart.olgular = (k?.hafiza?.olgular || []).filter(x => olguGuncelMi(kart, x)).map(x => x.metin);
  return kart;
}

// Kartın düz metin hali (yapay zekâya verilecek; geliştirici panelinde de görünür)
export function kartMetni(kart) {
  const d = kart.derinlik, a = kart.aile;
  const kimse = x => `${x.ad} ${x.soyad ?? ''}`.trim();
  const aileSatir = [
    a.es ? `${a.es.durumu}: ${kimse(a.es)}${a.es.yasiyor ? ` (${a.es.yas})` : ` (vefat ${a.es.vefatYili})`}` : null,
    ...a.cocuklar.map(c => `${c.cinsiyet === 'e' ? 'oğlu' : 'kızı'}: ${c.ad} (${c.yas}${c.nerede ? ', ' + c.nerede : ''})`),
    ...['anne', 'baba'].map(r => a[r] ? `${r === 'anne' ? 'annesi' : 'babası'}: ${a[r].ad} (${a[r].yasiyor ? a[r].yas + (a[r].nerede ? ', ' + a[r].nerede : '') : 'vefat ' + a[r].vefatYili})` : null),
    ...a.kardesler.map(k => `${k.buyuk ? (k.cinsiyet === 'e' ? 'ağabeyi' : 'ablası') : 'kardeşi'}: ${k.ad} (${k.yasiyor ? k.yas : 'vefat ' + k.vefatYili}${k.kus ? ', küsler' : ''})`),
  ].filter(Boolean);
  return [
    `${kart.tamAd} — ${kart.tanim}`,
    `Konuşma: ${kart.kusak} kuşak, üslup ${kart.uslup}, ağız ${kart.agiz}; sık kullandığı söz: "${kart.tik}".`,
    kart.gorunus ? `Görünüş: ${kart.gorunus}` : null,
    `Kişilik: ${kart.ozellikler.join(', ')}. Dışadönüklük ${kart.eksenler.disadonuk}/5, uyum ${kart.eksenler.uyumlu}/5, sorumluluk ${kart.eksenler.sorumlu}/5, duygusal denge ${kart.eksenler.dengeli}/5, açıklık ${kart.eksenler.acik}/5.${kart.gizliler.length ? ' Gizli: ' + kart.gizliler.join(', ') + '.' : ''}`,
    `Değerleri: ${d.degerler.join('; ')}. İnanç: ${d.dindarlik}. Gündem: ${d.gundem}. Futbol: ${d.takim}.`,
    `Sever: ${d.muzik} dinlemek, ${d.yemek}, ${d.hobi}. Korkusu: ${d.korku}. Hassas konusu: ${d.hassas}.`,
    `Mizah: ${d.mizah}. Flört: ${d.flort}. Güven: ${d.guven}. Kıskançlık ${d.kiskanclik}/5. Kötü alışkanlık: ${d.kotuAliskanlik}.`,
    `Para: ${d.para}. Sağlık: ${d.saglik}. Rutin: ${d.rutin}`,
    `Medeni hali: ${kart.medeni}. Aile (${a.iliski}): ${aileSatir.join('; ') || 'yok'}.`,
    `Hayat öyküsü: ${kart.oyku.map(x => `${x.yil} ${x.metin}`).join(' ')}`,
    kart.dert ? `Derdi: ${kart.dert}` : null,
    kart.hayal ? `Hayali: ${kart.hayal}` : null,
    kart.sir ? `Sırrı (kolay kolay anlatmaz): ${kart.sir}` : null,
    kart.tuhaflik ? `Tuhaflığı: ${kart.tuhaflik}` : null,
    kart.ag.length ? `Tanıdıkları: ${kart.ag.map(x => `${x.ad} (${x.turAd}; ona hissi ${x.onunHissi}) — ${x.gecmis}`).join(' ')}` : null,
    kart.hayatOlaylari.length ? `Son zamanlarda: ${kart.hayatOlaylari.map(x => x.metin).join(' ')}` : null,
    kart.olgular.length ? `Konuşmalarda ortaya çıkmış, değişmez olgular: ${kart.olgular.join('; ')}.` : null,
  ].filter(Boolean).join('\n');
}
