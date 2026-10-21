// İnsanlar dünyada (adım 3.2): bir mekanda şu an kimler var, NPC'ler arası tanışıklık ağı, Tanıdıklarım.
// Tanışma ve sohbet 3.5'te core/sohbet.js'e taşındı.
// Kim nerede: seed + mekan + gün + dilimden belirlenimli (aynı saatte aynı yerde aynı insanlar).
// NPC kimlikleri: m:<mekan> (tohum sahip), f:<figür>, n:<mekan>:<k> (mekanın müdavimi), n:<semt>:<k> (semtin sakini).
import { Rng } from './rng.js';
import { npcUret, sabitNpcSablonlari, npcTanimi, dertMetni, hayalMetni, fizikTarifi, cekicilikAdi, karizmaAdi } from './npc.js';
import { dilim, gunNo } from './zaman.js';
import { semtBul } from './dunya.js';
import { mekanBul } from './mekan.js';
import { ogrendiklerim } from './zevk.js';
import { kisiGuncel, bilinenOlaylar } from './npchayat.js';

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
// yedek: kayıttaki şablon (başlangıç hikayesinin k:<rol> kişileri gibi kimlikten çıkarılamayanlar için)
export function kisi(veri, seed, id, yedek = null) {
  const anahtar = seed + '|' + id;
  if (!npcOnbellek.has(anahtar)) {
    if (npcOnbellek.size > 500) npcOnbellek.clear();
    const s = sablonBul(veri, seed, id) ?? yedek;
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
  // Şehirden taşınan ya da vefat eden tanıdıklar artık görülmez (3.6)
  const sonuc = liste.filter(id => !durum.npcler?.[id]?.degisim?.yok);
  return kalabalik === 0 ? sonuc.filter(id => id === sahip) : sonuc;
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
export function anlatacagiDedikodu(durum, veri, n, mekan) {
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

// Hayatım → Tanıdıklarım
export function tanidiklarim(durum, veri) {
  return Object.entries(durum.npcler || {})
    .filter(([, k]) => k.tanisildi !== undefined)
    .map(([id, k]) => {
      const n = kisiGuncel(durum, veri, id);
      const g = veri.npc.gorunus;
      return { id, ad: n.hitapAdi, tamAd: n.tamAd, tanim: npcTanimi(n, veri), yakinlik: Math.round(k.iliski.yakinlik ?? 0), gerginlik: k.iliski.gerginlik ?? 0, katman: k.katman,
        nerede: k.nerede, gecmis: k.gecmis ? (durum.hikaye?.baglantilar?.find(b => b.id === id)?.etiket ?? null) : null, disarida: !!k.disarida, dert: k.bilinen?.dert ? dertMetni(n, veri) : null, hayal: k.bilinen?.hayal ? (n.figur ? veri.dunya.figurler.figurler.find(x => x.id === n.figur)?.istek : hayalMetni(n, veri)) : null,
        tuhaflik: (k.sohbet ?? 0) >= 3 ? n.tuhaflik : null, anilar: k.anilar, sohbet: k.sohbet ?? 0,
        numara: !!k.numara, iliskiTuru: k.iliskiTuru ?? null, flortEngel: k.bilinen?.flortEngel === 'yonelim' ? 'yonelim' : k.bilinen?.partnerVar && ['evli', 'sevgilili'].includes(n.medeni) ? 'evli' : null, gizli: !!k.gizli && ['evli', 'sevgilili'].includes(n.medeni), randevu: k.randevu ?? null,
        haberler: bilinenOlaylar(durum, veri, id), yok: (k.hayat || []).some(x => x.bilinen && ['tasindi', 'vefat'].includes(x.id)) ? k.degisim?.yok : null,
        ogrendiklerim: ogrendiklerim(durum, veri, id, n),
        gorunus: n.fizik && g ? fizikTarifi(n, g) : null, cekicilik: n.fizik && g ? cekicilikAdi(n, g) : null, karizma: n.fizik && g ? karizmaAdi(n, g) : null };
    })
    .sort((a, b) => b.yakinlik - a.yakinlik);
}
