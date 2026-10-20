// İnsanlar dünyada (adım 3.2): bir mekanda şu an kimler var, onlarla tanışma ve sohbet, NPC'ler arası tanışıklık ağı.
// Kim nerede: seed + mekan + gün + dilimden belirlenimli (aynı saatte aynı yerde aynı insanlar).
// NPC kimlikleri: m:<mekan> (tohum sahip), f:<figür>, n:<mekan>:<k> (mekanın müdavimi), n:<semt>:<k> (semtin sakini).
import { Rng } from './rng.js';
import { npcUret, npcKaydet, katmanYukselt, sabitNpcSablonlari, npcTanimi, dertMetni, hayalMetni } from './npc.js';
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

// "önlüğünü çıkarmamış, ellilerinde bir adam"
export function gorunus(n, veri) {
  const sb = veri.npc.sohbet;
  const r = Rng.akis(n.tamAd + '|' + n.id, 'gorunus');
  const yasK = sb.yasKelimeleri.find(([y]) => n.yas <= y)[1];
  const ayrinti = r.sec(sb.gorunus[n.sakinTuru] ?? sb.gorunus._varsayilan);
  const kim = sb.kimler[n.cinsiyet][n.yas <= 22 ? 'genc' : 'diger'];
  return n.yas <= 22 ? `${ayrinti} ${kim}` : `${ayrinti}, ${yasK} ${kim}`;
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

function npcDegiskeni(durum, veri, n, rng, ekler = {}) {
  const v = veri.npc;
  const nereli = n.yore === 'yurtdisi' ? `${ek(n.memleket, 'den')} gelmiş` : n.gocmus ? ek(n.memleket, 'li') : 'doğma büyüme Karalimanlı';
  const koken = n.koken === 'mubadil' ? 'Dedesinin dedesi Selanik\'ten gelmiş; evde hâlâ o anahtar duruyor.' : n.koken ? `Ailesi aslen ${v.memleket.yoreler[n.koken].ad} tarafından; o da 'ben buralıyım' diyor.` : '';
  const semt = semtBul(veri.dunya, n.semt);
  return {
    hitapAdi: n.hitapAdi, tik: n.tik, meslek: n.meslek.ad, memleket: nereli,
    memleketCumle: n.gocmus ? `${ek(n.memleket, 'den')} gelmiş; buraya alışmış ama memleket lafı açılınca sesi değişiyor.` : `Doğma büyüme Karalimanlı. ${koken}`.trim(),
    semtSozu: semt?.gerilimler?.length ? rng.sec(semt.gerilimler).aciklama.split('. ')[0].replace(/\.$/, '') : 'burada her şey eskisi gibi değil',
    dertMetni: dertMetni(n, veri), hayalMetni: n.figur ? figurIstegi(veri, n) ?? hayalMetni(n, veri) : hayalMetni(n, veri),
    ...ekler,
  };
}

const yaz = (metin, rng, ctx) => metinCoz(metin, rng, ctx);

// Tanınan kişinin (figür) hayali kendi hikâyesinden: "istek"
function figurIstegi(veri, n) {
  const f = veri.dunya.figurler.figurler.find(x => x.id === n.figur);
  return f?.istek ?? null;
}

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

export function tanis(durum, veri, rng, mekan, kalabalik, id) {
  const sb = veri.npc.sohbet;
  if (!kisiOrada(durum, veri, mekan, kalabalik, id)) return { tamam: false, sebep: 'O artık burada değil.' };
  if (tanisildiMi(durum, id)) return { tamam: false, sebep: 'Zaten tanışıyorsunuz.' };
  const gun = gunNo(durum.zaman.dakika);
  durum.bilgi.retler ??= {};
  if (durum.bilgi.retler[id] === gun) return { tamam: false, sebep: 'Bugün bir kere denedin; üstüne gitme.' };
  const n = kisi(veri, durum.seed, id);
  const ctx = { durum, veri, baglam: { degisken: { npc: npcDegiskeni(durum, veri, n, rng) } } };
  const p = [{ tur: 'secim', metin: 'Tanış: ' + gorunus(n, veri) }];
  zamanGecir(durum, sb.sure.tanis, 'normal', veri.sim);
  const t = sb.tanisma;
  const olasilik = sinir(t.kabulTaban + (n.eksenler.disadonuk - 3) * t.eksenEtkisi.disadonuk + (n.eksenler.uyumlu - 3) * t.eksenEtkisi.uyumlu + (durum.durumlar.ruh - 50) * t.ruhEtkisi, 0.1, 0.95);
  p.push(...yaz(t.ac, rng, ctx));
  if (rng.olasilik(olasilik)) {
    const k = npcKaydet(durum, id, sablonBul(veri, durum.seed, id), { katman: 'tanidik', gun });
    k.tanisildi = gun;
    k.nerede = mekan.id;
    k.iliski.yakinlik = (k.iliski.yakinlik ?? 0) + rng.aralik(...sb.yakinlik.tanisma);
    k.bilinen = { is: true };
    k.anilar.push({ zaman: durum.zaman.dakika, metin: `${ek(mekan.ad, 'de', { iyelik: mekan.iyelik })} tanıştınız` });
    katmanYukselt(durum, id, 'tanidik');
    p.push(...yaz(t.kabul, rng, ctx));
    p.push(...yaz(sb.konular.find(x => x.id === 'is').metin, rng, ctx));
    p.push({ tur: 'sistem', metin: `${n.hitapAdi} tanıdıklarına eklendi` });
  } else {
    durum.bilgi.retler[id] = gun;
    p.push(...yaz(n.eksenler.uyumlu <= 2 ? t.retSert : t.ret, rng, ctx));
  }
  aksiyonKaydet(durum, 'tanis:' + id, { mekan: mekan.id });
  return { tamam: true, paragraflar: p };
}

// Bu kişinin anlatabileceği, oyuncunun henüz duymadığı bir dedikodu: önce bulunduğu mekan, sonra kendi mekanı ve semti
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

export function konus(durum, veri, rng, mekan, kalabalik, id) {
  const sb = veri.npc.sohbet;
  if (!kisiOrada(durum, veri, mekan, kalabalik, id)) return { tamam: false, sebep: 'O artık burada değil.' };
  if (!tanisildiMi(durum, id)) return { tamam: false, sebep: 'Önce tanışmanız lazım.' };
  const k = durum.npcler[id];
  const n = kisi(veri, durum.seed, id);
  k.bilinen ??= {};
  const yak = k.iliski.yakinlik ?? 0;
  const dedikodu = anlatacagiDedikodu(durum, veri, n, mekan);
  const tanidikList = tanidiklari(veri, durum.seed, id).filter(x => x.id.startsWith('m:') || x.id.startsWith('f:'));
  const adaylar = sb.konular.filter(c => c.esik <= yak
    && !(c.id === 'dedikodu' && !dedikodu) && !(c.id === 'tanidik' && !tanidikList.length)
    && !(c.id === 'dert' && !n.dert) && !(c.id === 'hayal' && !n.hayal));
  const yeni = adaylar.filter(c => !k.bilinen[c.id] || c.id === 'dedikodu');
  const konu = rng.sec(yeni.length ? yeni : adaylar);
  const ekler = {};
  if (konu.id === 'dedikodu') ekler.dedikodu = dedikodu.d.metin;
  if (konu.id === 'tanidik') {
    const t = rng.sec(tanidikList);
    const tn = kisi(veri, durum.seed, t.id);
    const yer = tn.mekan ? mekanBul(veri.dunya, tn.mekan) : null;
    ekler.tanidikCumle = yer ? `'${ek(tn.hitapAdi, 'i')} tanır mısın? ${ek(yer.ad, 'in', { iyelik: yer.iyelik })} sahibi. İyi insandır; ama bilmiş ol, ${tn.ozellikler.includes('geveze') ? 'biraz gevezedir' : tn.ozellikler.includes('ketum') ? 'ağzı sıkıdır' : 'kimseye kolay açılmaz'}.'` : `'${tn.hitapAdi}... duymuşsundur. Bu şehirde herkes onu bir yerden tanır.'`;
    k.anlattigiKisiler = [...new Set([...(k.anlattigiKisiler || []), t.id])];
  }
  const ctx = { durum, veri, baglam: { degisken: { npc: npcDegiskeni(durum, veri, n, rng, ekler) } } };
  const p = [{ tur: 'secim', metin: `${ek(n.hitapAdi, 'le')} sohbet et` }];
  zamanGecir(durum, sb.sure.konus, 'dinlenme', veri.sim);
  p.push(...yaz(konu.metin, rng, ctx).map(x => ({ ...x, tur: konu.id === 'dedikodu' ? 'konusma' : x.tur, konusan: konu.id === 'dedikodu' ? n.hitapAdi : x.konusan })));
  if (konu.id === 'dedikodu') {
    durum.bilgi.dedikodular ??= {};
    durum.bilgi.dedikodular[dedikodu.d.id] = { gun: gunNo(durum.zaman.dakika), mekan: dedikodu.m.id, kaynak: id };
    p.push({ tur: 'sistem', metin: 'Duyduklarına eklendi' });
  }
  p.push(...yaz(sb.konusmaSonu, rng, ctx));
  k.bilinen[konu.id] = true;
  k.sohbet = (k.sohbet ?? 0) + 1;
  k.iliski.yakinlik = yak + rng.aralik(...sb.yakinlik.sohbet) + (konu.id === 'dert' ? rng.aralik(...sb.yakinlik.dertDinlemek) : 0);
  if (k.sohbet >= sb.katmanEsikleri.onemli) katmanYukselt(durum, id, 'onemli');
  if (konu.id === 'dert' || konu.id === 'hayal') k.anilar.push({ zaman: durum.zaman.dakika, metin: konu.id === 'dert' ? 'derdini dinledin' : 'hayalini anlattı' });
  if (k.anilar.length > 12) k.anilar.splice(0, k.anilar.length - 12);
  aksiyonKaydet(durum, 'konus:' + id, { konu: konu.id });
  return { tamam: true, paragraflar: p };
}

// Hayatım → Tanıdıklarım
export function tanidiklarim(durum, veri) {
  return Object.entries(durum.npcler || {})
    .filter(([, k]) => k.tanisildi !== undefined)
    .map(([id, k]) => {
      const n = kisi(veri, durum.seed, id);
      return { id, ad: n.hitapAdi, tamAd: n.tamAd, tanim: npcTanimi(n, veri), yakinlik: Math.round(k.iliski.yakinlik ?? 0), katman: k.katman,
        nerede: k.nerede, dert: k.bilinen?.dert ? dertMetni(n, veri) : null, hayal: k.bilinen?.hayal ? hayalMetni(n, veri) : null,
        tuhaflik: (k.sohbet ?? 0) >= 2 ? n.tuhaflik : null, anilar: k.anilar, sohbet: k.sohbet ?? 0 };
    })
    .sort((a, b) => b.yakinlik - a.yakinlik);
}
