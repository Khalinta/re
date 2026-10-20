// İnsanlar dünyada (adım 3.2): bir mekanda şu an kimler var, onlarla tanışma ve sohbet, NPC'ler arası tanışıklık ağı.
// Kim nerede: seed + mekan + gün + dilimden belirlenimli (aynı saatte aynı yerde aynı insanlar).
// NPC kimlikleri: m:<mekan> (tohum sahip), f:<figür>, n:<mekan>:<k> (mekanın müdavimi), n:<semt>:<k> (semtin sakini).
import { Rng } from './rng.js';
import { npcUret, npcKaydet, katmanYukselt, sabitNpcSablonlari, npcTanimi, dertMetni, hayalMetni, fizikTarifi, cekicilikAdi, karizmaAdi, gununHali } from './npc.js';
import { zamanGecir } from './simulasyon.js';
import { dilim, gunNo } from './zaman.js';
import { semtBul } from './dunya.js';
import { mekanBul } from './mekan.js';
import { metinCoz } from './metin.js';
import { ek } from './tr.js';
import { aksiyonKaydet } from './durum.js';

const sinir = (x, a, b) => Math.max(a, Math.min(b, x));
const sabitlerOnbellek = new WeakMap();
function sabitler(dunya) {
  if (!sabitlerOnbellek.has(dunya)) sabitlerOnbellek.set(dunya, sabitNpcSablonlari(dunya));
  return sabitlerOnbellek.get(dunya);
}

// Kimlikten şablon: sabit NPC'ler dünya kitabından, havuzdakiler kimliğin kendisinden (belirlenimli)
export function sablonBul(veri, seed, id) {
  const s = sabitler(veri.dunya)[id];
  if (s) return s;
  const [on, yer] = id.split(':');
  if (on !== 'n') return null;
  const m = mekanBul(veri.dunya, yer);
  if (m) return { semt: m.semt, sakinTuru: Rng.akis(seed, 'havuz|' + id).sec(m.musteri), mekanMudavimi: m.id };
  if (semtBul(veri.dunya, yer)) return { semt: yer };
  return null;
}

const npcOnbellek = new Map();
export function kisi(veri, seed, id) {
  const anahtar = seed + '|' + id;
  if (!npcOnbellek.has(anahtar)) {
    if (npcOnbellek.size > 500) npcOnbellek.clear();
    const s = sablonBul(veri, seed, id);
    npcOnbellek.set(anahtar, s ? npcUret(seed, id, s, veri) : null);
  }
  return npcOnbellek.get(anahtar);
}

function mekanSahibi(m) {
  if (m.sahip?.tohum) return 'm:' + m.id;
  if (m.sahip?.figur) return 'f:' + m.sahip.figur;
  return null;
}

// Şu an mekanda göze çarpan, konuşulabilecek insanlar (kimlik listesi)
export function mekandakiler(durum, veri, m, kalabalik) {
  const sb = veri.npc.sohbet;
  const gun = gunNo(durum.zaman.dakika), dl = dilim(durum.zaman.dakika).id;
  const rng = Rng.akis(durum.seed, `mevcut|${m.id}|${gun}|${dl}`);
  const liste = [];
  const sahip = mekanSahibi(m);
  if (sahip && rng.olasilik(sb.mevcut.sahipOlasiligi)) liste.push(sahip);
  for (const f of m.mudavimler || []) if ('f:' + f !== sahip && rng.olasilik(sb.mevcut.mudavimOlasiligi)) liste.push('f:' + f);
  const hedef = sb.mevcut.kisi[kalabalik] ?? 0;
  for (let deneme = 0; liste.length < hedef + (sahip ? 1 : 0) && deneme < 20; deneme++) {
    const id = rng.olasilik(sb.havuz.mekandanOrani) ? `n:${m.id}:${rng.aralik(0, sb.havuz.mekan - 1)}` : `n:${m.semt}:${rng.aralik(0, sb.havuz.semt - 1)}`;
    if (!liste.includes(id)) liste.push(id);
  }
  return kalabalik === 0 ? liste.filter(id => id === sahip) : liste;
}

// Tanışmadan önceki kısa tarif: en göze çarpan şey + yaş + kim ("uzun boylu, geniş omuzlu, kırklarında bir adam")
export function gorunus(n, veri, ayrintili = false) {
  const sb = veri.npc.sohbet, g = veri.npc.gorunus;
  const f = n.fizik;
  const yasK = sb.yasKelimeleri.find(([y]) => n.yas <= y)[1];
  const kim = sb.kimler[n.cinsiyet][n.yas <= 19 ? 'genc' : 'diger'];
  let ayrinti;
  if (!f) ayrinti = 'yabancı biri';
  else if (f.cekicilik >= 8) ayrinti = cekicilikAdi(n, g);
  else if (['iri yarı', 'geniş omuzlu', 'çok zayıf', 'kilolu', 'göbekli', 'atletik'].includes(f.yapi)) ayrinti = `${f.boy}, ${f.yapi}`;
  else if (f.basortusu && Rng.akis(n.id, 'g').olasilik(0.5)) ayrinti = 'başörtülü';
  else if (f.sac.stil === 'kel') ayrinti = 'kel';
  else ayrinti = f.giyim;
  // Aynı yerde benzer tarifli biri varsa ikinci bir ayrıntı: saçı ya da giyimi
  if (ayrintili && f) {
    const ikinci = ayrinti === f.giyim ? (f.basortusu ? 'başörtülü' : f.sac.stil === 'kel' ? 'kel' : `${f.sac.renk} saçlı`) : f.giyim;
    ayrinti = `${ayrinti}, ${ikinci}`;
  }
  return n.yas <= 19 ? `${ayrinti} ${kim}` : `${ayrinti}, ${yasK} ${kim}`;
}

export const tanisildiMi = (durum, id) => durum.npcler?.[id]?.tanisildi !== undefined;
export const gorunenAd = (durum, veri, id) => {
  const n = kisi(veri, durum.seed, id);
  return tanisildiMi(durum, id) ? n.hitapAdi : gorunus(n, veri);
};

// ------------------------------------------------------------------ tanışıklık ağı (belirlenimli)

const cift = (seed, a, b) => Rng.akis(seed, 'tanis|' + [a, b].sort().join('|')).sayi();

// a, b'yi tanıyor mu? Döner: null ya da nasıl tanıdıkları
export function tanisiyorMu(veri, seed, a, b) {
  if (a === b) return null;
  const na = kisi(veri, seed, a), nb = kisi(veri, seed, b);
  if (!na || !nb) return null;
  if (na.figur && nb.figur) {
    const f = veri.dunya.figurler.figurler.find(x => x.id === na.figur);
    const fb = veri.dunya.figurler.figurler.find(x => x.id === nb.figur);
    if (f.iliskiler?.some(i => i.figur === nb.figur) || fb.iliskiler?.some(i => i.figur === na.figur)) return 'eski tanıdık';
  }
  const mekanOf = n => n.mekan ?? n.mekanMudavimi ?? (n.figur ? veri.dunya.mekanlar.mekanlar.find(m => m.sahip?.figur === n.figur)?.id : undefined);
  const ma = mekanOf(na), mb = mekanOf(nb);
  if (ma && ma === mb) return 'aynı mekanın insanları';
  if (na.figur && (veri.dunya.mekanlar.mekanlar.find(m => m.id === mb)?.mudavimler || []).includes(na.figur)) return 'müdavim';
  if (nb.figur && (veri.dunya.mekanlar.mekanlar.find(m => m.id === ma)?.mudavimler || []).includes(nb.figur)) return 'müdavim';
  if (na.semt === nb.semt) {
    const sahipMi = n => n.mekan !== undefined;
    if ((sahipMi(na) || sahipMi(nb)) && cift(seed, a, b) < 0.5) return 'mahalleden';
    if (cift(seed, a, b) < 0.15) return 'mahalleden';
  }
  return null;
}

// Bir NPC'nin tanıdığı (dünyadaki sabit ya da aynı semtteki) insanlar
export function tanidiklari(veri, seed, id) {
  const n = kisi(veri, seed, id);
  if (!n) return [];
  const adaylar = new Set(Object.keys(sabitler(veri.dunya)));
  const sb = veri.npc.sohbet.havuz;
  for (let k = 0; k < sb.semt; k++) adaylar.add(`n:${n.semt}:${k}`);
  for (const m of veri.dunya.mekanlar.mekanlar.filter(x => x.semt === n.semt)) for (let k = 0; k < sb.mekan; k++) adaylar.add(`n:${m.id}:${k}`);
  return [...adaylar].map(b => ({ id: b, nasil: tanisiyorMu(veri, seed, id, b) })).filter(x => x.nasil);
}

// ------------------------------------------------------------------ tanışma ve sohbet


// Bir kişi kendisi, örgütü, şirketi ya da mekanı hakkındaki dedikoduyu yaymaz
function kendiKonusuMu(veri, n, d) {
  if (!d.konu) return false;
  const [tur, kim] = d.konu.split(':');
  const f = n.figur ? veri.dunya.figurler.figurler.find(x => x.id === n.figur) : null;
  if (tur === 'figur' && (kim === n.figur || (f?.orgut && veri.dunya.figurler.figurler.find(x => x.id === kim)?.orgut === f.orgut))) return true;
  if (tur === 'orgut' && f?.orgut === kim) return true;
  if (tur === 'sirket' && f?.sirketler?.includes(kim)) return true;
  if (tur === 'mekan' && (kim === n.mekan || kim === n.mekanMudavimi)) return true;
  if (f?.orgut && tur === 'mekan' && veri.dunya.mekanlar.mekanlar.find(m => m.id === kim)?.gizli?.orgut === f.orgut) return true;
  return false;
}

export function kisiOrada(durum, veri, mekan, kalabalik, id) {
  return mekandakiler(durum, veri, mekan, kalabalik).includes(id);
}

// Bu kişinin anlatabileceği, oyuncunun henüz duymadığı bir dedikodu: önce bulunduğu mekan, sonra kendi semti
function anlatacagiDedikodu(durum, veri, n, mekan) {
  const duyulan = durum.bilgi.dedikodular || {};
  const yerler = [mekan, ...veri.dunya.mekanlar.mekanlar.filter(m => m.semt === n.semt && m.id !== mekan.id)];
  for (const m of yerler) {
    // Kendi örgütünün mekanında konuşulan sırları da anlatmaz
    if (n.figur && m.gizli?.orgut && m.gizli.orgut === veri.dunya.figurler.figurler.find(x => x.id === n.figur)?.orgut) continue;
    const d = (m.dedikodular || []).find(x => !duyulan[x.id] && !kendiKonusuMu(veri, n, x));
    if (d) return { d, m };
  }
  return null;
}

// ------------------------------------------------------------------ sohbet (3.2b)
// Konu seçmeli: oyuncu bir konu seçer, kişi kendi ağzından cevap verir. Bir oturum durum.sohbet'te tutulur:
// { npc, mekan, kalan (kişinin sabrı), kullanilan: { konu: true } }. Başka bir hamle yapılınca oturum biter.

// Aynı kişiden aynı cümle iki kez duyulmasın: kişi başına son 60, genelde son 100 cümle tutulur (kısa anahtarlarla)
function sozSec(durum, k, adaylar, rng, hafiza) {
  if (!adaylar?.length) return null;
  const anahtar = t => t.length + ':' + t.slice(0, 24);
  durum.bilgi.sonSoz ??= [];
  const kisisel = new Set(k?.son || []), genel = new Set(durum.bilgi.sonSoz);
  const taze = adaylar.filter(t => !kisisel.has(anahtar(t)) && !genel.has(anahtar(t)));
  const yarim = adaylar.filter(t => !kisisel.has(anahtar(t)));
  const t = rng.sec(taze.length ? taze : yarim.length ? yarim : adaylar);
  if (k) { k.son = [...(k.son || []), anahtar(t)].slice(-(hafiza?.kisi ?? 60)); }
  durum.bilgi.sonSoz = [...durum.bilgi.sonSoz, anahtar(t)].slice(-(hafiza?.genel ?? 100));
  return t;
}

// Üsluba özel cümleler + ortak cümleler
const havuzu = (grup, uslup) => grup ? [...(grup[uslup] || []), ...(grup._ || []), ...(Array.isArray(grup) ? grup : [])] : [];

function hitapSec(seed, n, veri) {
  const sb = veri.npc.sohbet;
  const r = Rng.akis(seed, 'hitap|' + n.id);
  const u = sb.uslupHitap[n.uslup];
  return u && r.olasilik(0.6) ? r.sec(u) : r.sec(sb.hitaplar[n.agiz] ?? sb.hitaplar.standart);
}

// Yöresel ağız tek tük: cümle sonuna ağzın bir sözcüğü (",da", ", gari", ", be")
function agizla(cumle, n, veri, rng) {
  const a = veri.npc.memleket.agizlar[n.agiz];
  if (!a?.sonlar?.length || !rng.olasilik(0.25) || !/[.!]$/.test(cumle)) return cumle;
  return cumle.replace(/([.!])$/, `, ${rng.sec(a.sonlar)}$1`);
}

function degiskenler(durum, veri, n, rng, ekler = {}) {
  const v = veri.npc;
  const semt = semtBul(veri.dunya, n.semt);
  const gerilim = semt?.gerilimler?.length ? Rng.akis(durum.seed, `gerilim|${n.id}|${gunNo(durum.zaman.dakika)}`).sec(semt.gerilimler) : null;
  const mm = n.meslek.ad.replace(/^emekli /, '').replace(/ \(emekli\)$/, '');
  return {
    ad: n.hitapAdi, ilkAd: n.ad, hitapAdi: n.hitapAdi, hitap: hitapSec(durum.seed, n, veri),
    meslek: n.meslek.ad, meslekEski: mm,
    memleketAd: n.memleket, memleketDen: ek(n.memleket, 'den'), memleketLi: ek(n.memleket, 'li'),
    kokenAd: n.koken && v.memleket.yoreler[n.koken] ? v.memleket.yoreler[n.koken].ad : '',
    semtAd: semt?.ad ?? '', gerilimAd: gerilim?.ad ?? 'mahallenin hâli', gerilimOzet: (gerilim?.aciklama ?? 'Her şey değişiyor').split('. ')[0].replace(/\.$/, ''),
    ...ekler,
  };
}

function soyle(durum, veri, n, k, grup, rng, ctxEk = {}, tur = 'konusma') {
  const t = sozSec(durum, k, havuzu(grup, n.uslup), rng, veri.npc.sohbet.hafiza);
  if (!t) return [];
  const ctx = { durum, veri, baglam: { degisken: { s: degiskenler(durum, veri, n, rng, ctxEk) } } };
  return metinCoz(t, rng, ctx).map(p => tur === 'konusma' ? { tur: 'konusma', konusan: n.hitapAdi, metin: agizla(p.metin, n, veri, rng) } : { ...p, tur });
}

function anlat(durum, veri, n, k, grup, rng, ctxEk = {}) { return soyle(durum, veri, n, k, grup, rng, ctxEk, 'anlati'); }

// Ara ara beden dili: "Remzi Usta bardağını masaya bırakıyor."
function beden(durum, veri, n, k, rng, tur = '_') {
  if (!rng.olasilik(tur === '_' ? 0.35 : 0.7)) return [];
  return anlat(durum, veri, n, k, veri.npc.sohbet.beden[tur], rng);
}

const sabir = (veri, n, k) => {
  const s = veri.npc.sohbet.sabir;
  return Math.min(s.enCok, s.taban + n.eksenler.disadonuk + Math.floor((k?.iliski?.yakinlik ?? 0) / s.yakinlikBolen));
};

function oturumBaslat(durum, id, mekan, kalan) {
  durum.sohbet = { npc: id, mekan: mekan.id, kalan, kullanilan: {} };
}
export const oturumBitir = durum => { delete durum.sohbet; };

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
  const olasilik = sinir(t.kabulTaban + (n.eksenler.disadonuk - 3) * t.eksenEtkisi.disadonuk + (n.eksenler.uyumlu - 3) * t.eksenEtkisi.uyumlu + (durum.durumlar.ruh - 50) * t.ruhEtkisi, 0.1, 0.95);
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
  } else {
    durum.bilgi.retler[id] = gun;
    p.push(...anlat(durum, veri, n, null, n.eksenler.uyumlu <= 2 ? t.ret.sert : n.uslup === 'kibar' ? t.ret.kibar : t.ret._, rng));
  }
  aksiyonKaydet(durum, 'tanis:' + id, { mekan: mekan.id });
  return { tamam: true, paragraflar: p };
}

// Tanıdık birinin yanına otur: selam, oturum başlar
export function yaninaOtur(durum, veri, rng, mekan, kalabalik, id) {
  const sb = veri.npc.sohbet;
  if (!kisiOrada(durum, veri, mekan, kalabalik, id)) return { tamam: false, sebep: 'O artık burada değil.' };
  if (!tanisildiMi(durum, id)) return { tamam: false, sebep: 'Önce tanışmanız lazım.' };
  const k = durum.npcler[id], n = kisi(veri, durum.seed, id);
  const p = [{ tur: 'secim', metin: `${ek(n.hitapAdi, 'in')} yanına otur` }];
  zamanGecir(durum, sb.sure.otur, 'normal', veri.sim);
  if ((k.iliski.gerginlik ?? 0) >= sb.gerginlikEsigi) {
    p.push(...anlat(durum, veri, n, k, sb.kacinir, rng));
    return { tamam: true, paragraflar: p };
  }
  const hal = veri.npc.gorunus ? gununHali(durum.seed, n, gunNo(durum.zaman.dakika), veri.npc.gorunus) : null;
  if (hal) p.push({ tur: 'anlati', metin: `${n.hitapAdi} ${hal.metin}.` });
  const yak = k.iliski.yakinlik ?? 0;
  p.push(...soyle(durum, veri, n, k, (k.iliski.gerginlik ?? 0) >= 4 ? sb.selam.soguk : yak >= 25 ? sb.selam.yakin : sb.selam.yeni, rng));
  oturumBaslat(durum, id, mekan, sabir(veri, n, k));
  aksiyonKaydet(durum, 'otur:' + id);
  return { tamam: true, paragraflar: p };
}

// Oturum hâlâ geçerli mi: aynı mekandasın ve o kişi hâlâ orada
export function oturumGecerli(durum, veri) {
  const o = durum.sohbet;
  if (!o || durum.konum?.mekan !== o.mekan) return false;
  const m = mekanBul(veri.dunya, o.mekan);
  const kal = m.kalabalik?.[dilim(durum.zaman.dakika).id] ?? 0;
  return mekandakiler(durum, veri, m, kal).includes(o.npc);
}

// Oturumdayken seçilebilecek konular: [{ konu, ad, dakika }]
export function sohbetKonulari(durum, veri) {
  const o = durum.sohbet;
  if (!o) return [];
  const sb = veri.npc.sohbet, k = durum.npcler?.[o.npc];
  const yak = k?.iliski?.yakinlik ?? 0;
  const liste = [];
  for (const [konu, t] of Object.entries(sb.konular)) {
    if (konu !== 'bitir' && o.kullanilan[konu]) continue;
    if (t.birKez && k?.bilinen?.[konu]) continue;
    if (konu === 'hayal' && yak < sb.esikler.dert) continue;
    if ((konu === 'dedikodu' || konu === 'tanidik') && yak < sb.esikler.dedikodu) continue;
    liste.push({ konu, ad: t.baslik, dakika: t.sure });
  }
  return liste;
}

export function sohbetHamlesi(durum, veri, rng, konu) {
  const o = durum.sohbet;
  if (!o) return { tamam: false, sebep: 'Kimseyle konuşmuyorsun.' };
  const sb = veri.npc.sohbet;
  const mekan = mekanBul(veri.dunya, o.mekan);
  const id = o.npc, n = kisi(veri, durum.seed, id), k = durum.npcler[id];
  if (!oturumGecerli(durum, veri)) { oturumBitir(durum); return { tamam: false, sebep: `${n.hitapAdi} artık burada değil.` }; }
  if (!sohbetKonulari(durum, veri).some(x => x.konu === konu)) return { tamam: false, sebep: 'Bunu şimdi açamazsın.' };
  const t = sb.konular[konu];
  const p = [{ tur: 'secim', metin: t.baslik }];
  zamanGecir(durum, t.sure, 'dinlenme', veri.sim);
  const yak = k.iliski.yakinlik ?? 0;
  const ar = (a, b) => rng.aralik(a, b);
  const yakinlikEkle = x => { k.iliski.yakinlik = (k.iliski.yakinlik ?? 0) + x; };
  k.bilinen ??= {};
  o.kullanilan[konu] = true;

  if (konu === 'bitir') {
    p.push(...anlat(durum, veri, n, k, sb.bitir.sen, rng));
    p.push(...soyle(durum, veri, n, k, sb.bitir.veda, rng));
    oturumBitir(durum);
    aksiyonKaydet(durum, 'sohbet:bitir');
    return { tamam: true, paragraflar: p };
  }

  p.push(...beden(durum, veri, n, k, rng, ['dert', 'dedikodu'].includes(konu) ? 'gizli' : '_'));
  if (konu === 'hal') {
    const hal = veri.npc.gorunus ? gununHali(durum.seed, n, gunNo(durum.zaman.dakika), veri.npc.gorunus).tur : 'keyifli';
    p.push(...soyle(durum, veri, n, k, n.uslup === 'kibar' && rng.olasilik(0.4) ? sb.hal.kibar : sb.hal[hal], rng));
    yakinlikEkle(ar(0, 2));
  } else if (konu === 'is') {
    const sahipYer = n.mekan ? mekanBul(veri.dunya, n.mekan) : null;
    const grup = sahipYer ? sb.is.sahip : sb.is[n.durum] ?? sb.is.calisiyor;
    p.push(...soyle(durum, veri, n, k, grup, rng, sahipYer ? { mekanAd: sahipYer.ad } : {}));
    k.bilinen.is = true; yakinlikEkle(ar(1, 2));
  } else if (konu === 'memleket') {
    const tur = n.yore === 'yurtdisi' ? 'yurtdisi' : n.koken === 'mubadil' ? 'mubadil' : n.gocmus ? (n.aile.cocuk > 0 && rng.olasilik(0.5) ? 'gocmusCocuklu' : 'gocmus') : n.koken ? 'koken' : 'yerli';
    p.push(...soyle(durum, veri, n, k, sb.memleket[tur], rng));
    k.bilinen.memleket = true; yakinlikEkle(ar(1, 3));
  } else if (konu === 'semt') {
    const kizgin = n.semt === mekan.semt && (semtBul(veri.dunya, n.semt)?.sosyo?.gelir ?? 3) <= 2 || n.ozellikler.includes('kavgaci');
    const tur = kizgin ? 'kizgin' : n.ozellikler.includes('umursamaz') || n.eksenler.acik <= 2 ? 'kayitsiz' : rng.olasilik(0.5) ? 'umutlu' : 'kizgin';
    p.push(...soyle(durum, veri, n, k, sb.semt[tur], rng));
    yakinlikEkle(ar(1, 2));
  } else if (konu === 'gundem') {
    const son = (durum.dunya?.gundem || []).filter(g => gunNo(durum.zaman.dakika) - g.gun <= 7);
    if (son.length) p.push(...soyle(durum, veri, n, k, sb.gundem.var, rng, { haber: rng.sec(son).metin }));
    else p.push(...soyle(durum, veri, n, k, sb.gundem.yok, rng));
    yakinlikEkle(ar(0, 2));
  } else if (konu === 'kendin') {
    p.push(...anlat(durum, veri, n, k, sb.kendin.anlat, rng));
    const oz = ['merakli', 'yardimsever', 'ketum', 'kuskucu'].find(x => n.ozellikler.includes(x)) ?? '_';
    p.push(...anlat(durum, veri, n, k, sb.kendin[oz], rng));
    yakinlikEkle(ar(...sb.yakinlik.kendin));
    k.iliski.guven = (k.iliski.guven ?? 0) + 1;
    k.anilar.push({ zaman: durum.zaman.dakika, metin: 'ona kendinden bahsettin' });
  } else if (konu === 'dert') {
    const d = veri.npc.hayat.dertler.find(x => x.id === n.dert);
    if (!d || yak < sb.esikler.dert) p.push(...soyle(durum, veri, n, k, sb.dert.kacamak, rng));
    else if (k.bilinen.dert) p.push(...soyle(durum, veri, n, k, sb.dert.tekrar, rng));
    else {
      p.push(...anlat(durum, veri, n, k, sb.dert.giris, rng));
      p.push(...beden(durum, veri, n, k, rng, 'huzun'));
      p.push({ tur: 'konusma', konusan: n.hitapAdi, metin: agizla(rng.sec(d.soz ?? [d.metin]), n, veri, rng) });
      p.push(...anlat(durum, veri, n, k, sb.dert.dinledin, rng));
      k.bilinen.dert = true; yakinlikEkle(ar(...sb.yakinlik.dertDinlemek));
      k.iliski.guven = (k.iliski.guven ?? 0) + 2;
      k.anilar.push({ zaman: durum.zaman.dakika, metin: 'derdini dinledin' });
    }
  } else if (konu === 'hayal') {
    const hz = veri.npc.hayat.hayaller.find(x => x.id === n.hayal);
    const figurHayali = n.figur ? veri.dunya.figurler.figurler.find(x => x.id === n.figur)?.istek : null;
    if ((!hz && !figurHayali) || yak < sb.esikler.hayal) p.push(...soyle(durum, veri, n, k, sb.hayal.kacamak, rng));
    else if (k.bilinen.hayal) p.push(...soyle(durum, veri, n, k, sb.hayal.tekrar, rng));
    else {
      p.push(...anlat(durum, veri, n, k, sb.hayal.giris, rng));
      p.push(figurHayali ? { tur: 'anlati', metin: `Laf arasında ağzından kaçıyor: ${figurHayali}` } : { tur: 'konusma', konusan: n.hitapAdi, metin: agizla(rng.sec(hz.soz ?? [hz.metin]), n, veri, rng) });
      k.bilinen.hayal = true; yakinlikEkle(ar(...sb.yakinlik.hayal));
      k.anilar.push({ zaman: durum.zaman.dakika, metin: 'hayalini anlattı' });
    }
  } else if (konu === 'dedikodu') {
    const anlatir = n.ozellikler.some(x => ['geveze', 'merakli', 'yalanci'].includes(x)) || (!n.ozellikler.some(x => ['ketum', 'sadik'].includes(x)) && rng.olasilik(0.6));
    const dk = anlatacagiDedikodu(durum, veri, n, mekan);
    if (!anlatir) p.push(...soyle(durum, veri, n, k, sb.dedikodu.reddeder, rng));
    else if (!dk) p.push(...soyle(durum, veri, n, k, sb.dedikodu.yok, rng));
    else {
      p.push(...soyle(durum, veri, n, k, sb.dedikodu.anlatir, rng, { dedikodu: dk.d.metin }));
      durum.bilgi.dedikodular ??= {};
      durum.bilgi.dedikodular[dk.d.id] = { gun: gunNo(durum.zaman.dakika), mekan: dk.m.id, kaynak: id };
      p.push({ tur: 'sistem', metin: 'Duyduklarına eklendi' });
      yakinlikEkle(ar(1, 2));
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
        : rng.olasilik(0.45) ? 'guldu' : 'gulumsedi';
    p.push(...anlat(durum, veri, n, k, sb.saka[sonuc], rng));
    if (sonuc === 'guldu') { yakinlikEkle(ar(...sb.yakinlik.sakaGuldu)); if (rng.olasilik(0.3)) k.anilar.push({ zaman: durum.zaman.dakika, metin: 'birlikte güldünüz' }); }
    if (sonuc === 'kizdi') k.iliski.gerginlik = (k.iliski.gerginlik ?? 0) + 3;
  }

  k.sohbet = (k.sohbet ?? 0) + 1;
  if (k.sohbet >= sb.katmanEsikleri.onemli) katmanYukselt(durum, id, 'onemli');
  if (k.anilar.length > 12) k.anilar.splice(0, k.anilar.length - 12);
  o.kalan -= 1;
  if (o.kalan <= 0) {
    p.push(...soyle(durum, veri, n, k, sb.bitir.o, rng));
    p.push({ tur: 'sistem', metin: sb.sabirBitti.replace('{s.ad}', n.hitapAdi) });
    oturumBitir(durum);
  }
  aksiyonKaydet(durum, 'sohbet:' + konu, { npc: id });
  return { tamam: true, paragraflar: p };
}

// Hayatım → Tanıdıklarım
export function tanidiklarim(durum, veri) {
  return Object.entries(durum.npcler || {})
    .filter(([, k]) => k.tanisildi !== undefined)
    .map(([id, k]) => {
      const n = kisi(veri, durum.seed, id);
      const g = veri.npc.gorunus;
      return { id, ad: n.hitapAdi, tamAd: n.tamAd, tanim: npcTanimi(n, veri), yakinlik: Math.round(k.iliski.yakinlik ?? 0), gerginlik: k.iliski.gerginlik ?? 0, katman: k.katman,
        nerede: k.nerede, dert: k.bilinen?.dert ? dertMetni(n, veri) : null, hayal: k.bilinen?.hayal ? (n.figur ? veri.dunya.figurler.figurler.find(x => x.id === n.figur)?.istek : hayalMetni(n, veri)) : null,
        tuhaflik: (k.sohbet ?? 0) >= 3 ? n.tuhaflik : null, anilar: k.anilar, sohbet: k.sohbet ?? 0,
        gorunus: n.fizik && g ? fizikTarifi(n, g) : null, cekicilik: n.fizik && g ? cekicilikAdi(n, g) : null, karizma: n.fizik && g ? karizmaAdi(n, g) : null };
    })
    .sort((a, b) => b.yakinlik - a.yakinlik);
}
