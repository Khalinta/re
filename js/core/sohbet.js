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
import { npcKaydet, katmanYukselt, fizikTarifi, gununHali, dertMetni, sirMetni } from './npc.js';
import { zamanGecir } from './simulasyon.js';
import { dilim, gunNo, gunDakikasi, tarihAl, yas as yasHesapla } from './zaman.js';
import { semtBul } from './dunya.js';
import { mekanBul } from './mekan.js';
import { metinCoz } from './metin.js';
import { ek } from './tr.js';
import { aksiyonKaydet } from './durum.js';
import { bayrakKoy } from './bayrak.js';
import { kisi, mekandakiler, gorunus, tanisildiMi, tanidiklari, kisiOrada, sablonBul, anlatacagiDedikodu } from './insanlar.js';
import { kisiGuncel, bilinmeyenOlaylar, haberSablonu } from './npchayat.js';

const sinir = (x, a, b) => Math.max(a, Math.min(b, x));
const kucukBas = s => s ? s[0].toLocaleLowerCase('tr') + s.slice(1) : s;
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
  const yarim = adaylar.filter(t => !kisisel.has(anahtar(t)));
  const t = rng.sec(taze.length ? taze : yarim.length ? yarim : adaylar);
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
  if (!a?.sonlar?.length || !rng.olasilik(p) || !/[.!]$/.test(cumle)) return cumle;
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
  return metinCoz(t, rng, ctx).map(p => tur === 'konusma' ? { tur: 'konusma', konusan: n.hitapAdi, metin: agizla(p.metin, n, veri, rng) } : { ...p, tur });
}
const anlat = (durum, veri, n, k, grup, rng, ctxEk = {}) => soyle(durum, veri, n, k, grup, rng, ctxEk, 'anlati');

// Oyuncunun kendi sözü
function sen(durum, veri, n, k, liste, rng) {
  const t = sozSec(durum, null, liste, rng, veri.npc.sohbet.hafiza);
  if (!t) return [];
  const ctx = { durum, veri, baglam: { degisken: degiskenler(durum, veri, n, rng) } };
  return metinCoz(t, rng, ctx).map(p => ({ tur: 'konusma', konusan: 'Sen', metin: p.metin }));
}

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

// Flörte engel: ilişkisi var / yönelimi uymuyor
export function flortEngeli(durum, veri, n) {
  if (['evli', 'sevgilili'].includes(n.medeni)) return 'evli';
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
    + ((durum.durumlar?.ruh ?? 50) - 50) * w.ruh;
}

// Buluşma: ertesi akşam 20.00'de olay (data/olaylar/iliski.json → randevu)
function randevuKur(durum, veri, id, n, k) {
  const dk = durum.zaman.dakika;
  const zaman = dk - gunDakikasi(dk) + 1440 + 20 * 60;
  durum.zamanlayicilar.push({ zaman, olay: 'randevu', baglam: { npc: { kisi: id }, degisken: { kisi: { ad: n.hitapAdi } } } });
  durum.zamanlayicilar.sort((a, b) => a.zaman - b.zaman);
  k.randevu = gunNo(zaman);
  k.anilar.push({ zaman: dk, metin: 'buluşmak için sözleştiniz' });
}

// ------------------------------------------------------------------ insanlar üzerine dedikodu

const ciftSayi = (seed, a, b) => Rng.akis(seed, 'ask|' + [a, b].sort().join('|')).sayi();

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
    const t = kisi(veri, durum.seed, tid);
    if (!t || t.yas < 16) continue;
    // Kimse kendi örgütünün insanları hakkında konuşmaz
    const orgutu = x => x.figur ? veri.dunya.figurler.figurler.find(f => f.id === x.figur)?.orgut : null;
    if (orgutu(n) && orgutu(n) === orgutu(t)) continue;
    const turler = [];
    if (t.sir) turler.push({ tur: 'sir', a: 3 });
    if (t.dert) turler.push({ tur: 'dert', a: 2 });
    if (['bosanmis', 'dul'].includes(t.medeni)) turler.push({ tur: t.medeni, a: 1.5 });
    for (const g of t.gizli || []) if (D.turler[g]) turler.push({ tur: g, a: 2 });
    const es = tanidik.find(u => u !== tid && ciftSayi(durum.seed, tid, u) < D.askOlasiligi && (() => {
      const nu = kisi(veri, durum.seed, u);
      return nu && nu.yas >= 18 && t.yas >= 18 && Math.abs(nu.yas - t.yas) <= 15 && nu.cinsiyet !== t.cinsiyet;
    })());
    if (es) turler.push({ tur: ['evli', 'sevgilili'].includes(t.medeni) ? 'askEvli' : 'ask', a: 4, u: es });
    const yalan = rng.olasilik(D.oran.yalan);
    const sec = yalan || !turler.length ? { tur: 'yalan' } : rng.agirlikliSec(turler.map(x => ({ ...x, agirlik: x.a })));
    const anahtar = `p:${tid}:${sec.tur}${sec.u ? ':' + sec.u : ''}`;
    if (duyulan[anahtar]) continue;
    const tanisik = tanisildiMi(durum, tid);
    const u = sec.u ? kisi(veri, durum.seed, sec.u) : null;
    const tv = { ad: t.hitapAdi, sir: kucukBas(sirMetni(t, veri) ?? ''), dert: kucukBas(dertMetni(t, veri) ?? ''), tarif: gorunus(t, veri) };
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
  if ((k.iliski.gerginlik ?? 0) >= sb.gerginlikEsigi) {
    p.push(...anlat(durum, veri, n, k, sb.kacinir, rng));
    return { tamam: true, paragraflar: p };
  }
  const hal = veri.npc.gorunus ? gununHali(durum.seed, n, gunNo(durum.zaman.dakika), veri.npc.gorunus) : null;
  if (hal) p.push({ tur: 'anlati', metin: `${n.hitapAdi} ${hal.metin}.` });
  const yak = k.iliski.yakinlik ?? 0;
  p.push(...soyle(durum, veri, n, k, (k.iliski.gerginlik ?? 0) >= 4 ? sb.selam.soguk : yak >= 25 ? sb.selam.yakin : sb.selam.yeni, rng));
  oturumBaslat(durum, id, mekan, sabir(veri, n, k));
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
  if (!adaylar.length) return [];
  const id = rng.agirlikliSec(adaylar).id;
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
  if (c.bayrak) bayrakKoy(durum, c.bayrak, n.id);
  if (c.randevu && !(k.randevu >= gunNo(durum.zaman.dakika))) { randevuKur(durum, veri, n.id, n, k); p.push({ tur: 'sistem', metin: `Yarın akşam ${n.hitapAdi} ile buluşacaksın` }); }
  o.bekleyen = null;
  return { tamam: true };
}

// ------------------------------------------------------------------ konular

// Oturumdayken seçilebilecekler: bekleyen bir soru/seçim varsa yalnızca cevaplar; yoksa konular
export function sohbetKonulari(durum, veri) {
  const o = durum.sohbet;
  if (!o) return [];
  const sb = veri.npc.sohbet, k = durum.npcler?.[o.npc];
  if (!k) return [];
  const n = kisiGuncel(durum, veri, o.npc);
  if (o.bekleyen) {
    const def = soruTanimi(veri, o.bekleyen);
    return (def?.cevaplar || []).filter(c => !c.kosul || kosulTutar(durum, veri, n, k, c.kosul)).map(c => ({ konu: 'cevap:' + c.id, ad: c.ad, dakika: sb.sure.cevap }));
  }
  const yak = k.iliski?.yakinlik ?? 0, gun = gunNo(durum.zaman.dakika);
  const flort = veri.npc.flort && flortUygun(durum, veri, n) && !k.bilinen?.flortEngel;
  const liste = [];
  for (const [konu, t] of Object.entries(sb.konular)) {
    if (konu !== 'bitir' && o.kullanilan[konu]) continue;
    if (t.birKez && k.bilinen?.[konu]) continue;
    if (t.gunde && k.konuGun?.[konu] === gun) continue;
    if (konu === 'hayal' && yak < sb.esikler.dert) continue;
    if ((konu === 'dedikodu' || konu === 'tanidik') && yak < sb.esikler.dedikodu) continue;
    if (t.flort) {
      if (!flort) continue;
      if ((konu === 'iltifat' || konu === 'takil') && (k.iltifatGun?.[gun] ?? 0) >= veri.npc.flort.kurallar.gunlukIltifat) continue;
      if (konu === 'numara' && (k.numara || k.numaraRet === gun)) continue;
      if (konu === 'davet' && (!k.numara || k.randevu >= gun || k.davetRet === gun)) continue; // randevu: buluşma günü (geçtiyse yeniden teklif edilebilir)
    }
    liste.push({ konu, ad: t.baslik, dakika: t.sure });
  }
  // Seçenekler kalabalıklaşmasın: 10'u aşarsa önce tanıdıklar, gündem, mahalle düşer
  for (const dus of ['tanidik', 'gundem', 'semt']) {
    const i = liste.findIndex(x => x.konu === dus);
    if (liste.length > 10 && i >= 0) liste.splice(i, 1);
  }
  return liste;
}

export function sohbetHamlesi(durum, veri, rng, konu) {
  const o = durum.sohbet;
  if (!o) return { tamam: false, sebep: 'Kimseyle konuşmuyorsun.' };
  const sb = veri.npc.sohbet;
  const mekan = mekanBul(veri.dunya, o.mekan);
  const id = o.npc, k = durum.npcler[id], n = kisiGuncel(durum, veri, id);
  if (!oturumGecerli(durum, veri)) { oturumBitir(durum); return { tamam: false, sebep: `${n.hitapAdi} artık burada değil.` }; }
  if (!sohbetKonulari(durum, veri).some(x => x.konu === konu)) return { tamam: false, sebep: 'Bunu şimdi açamazsın.' };
  const gun = gunNo(durum.zaman.dakika);
  k.bilinen ??= {};

  if (konu.startsWith('cevap:')) {
    const p = [];
    zamanGecir(durum, sb.sure.cevap, 'dinlenme', veri.sim);
    const s = cevapla(durum, veri, rng, n, k, konu.slice(6), p);
    if (!s.tamam) return s;
    aksiyonKaydet(durum, 'sohbet:' + konu, { npc: id });
    return { tamam: true, paragraflar: p };
  }

  const t = sb.konular[konu];
  const p = [{ tur: 'secim', metin: t.baslik }];
  zamanGecir(durum, t.sure, 'dinlenme', veri.sim);
  const yak = k.iliski.yakinlik ?? 0;
  const ar = (a, b) => rng.aralik(a, b);
  const yakinlikEkle = x => { k.iliski.yakinlik = (k.iliski.yakinlik ?? 0) + x; };
  o.kullanilan[konu] = true;
  let soruOlabilir = true;

  if (konu === 'bitir') {
    p.push(...anlat(durum, veri, n, k, sb.bitir.sen, rng));
    p.push(...soyle(durum, veri, n, k, sb.bitir.veda, rng));
    oturumBitir(durum);
    aksiyonKaydet(durum, 'sohbet:bitir');
    return { tamam: true, paragraflar: p };
  }

  if (konu !== 'dert') p.push(...beden(durum, veri, n, k, rng, konu === 'dedikodu' ? 'gizli' : null));
  if (konu === 'hal') {
    const hal = veri.npc.gorunus ? gununHali(durum.seed, n, gun, veri.npc.gorunus).tur : 'keyifli';
    p.push(...soyle(durum, veri, n, k, n.uslup === 'kibar' && rng.olasilik(0.3) ? sb.hal.kibar : sb.hal[hal], rng));
    yakinlikEkle(ar(0, 2));
  } else if (konu === 'is') {
    const sahipYer = n.mekan ? mekanBul(veri.dunya, n.mekan) : null;
    const grup = sahipYer ? sb.is.sahip : sb.is[n.durum] ?? sb.is.calisiyor;
    p.push(...soyle(durum, veri, n, k, grup, rng, sahipYer ? { mekanAd: sahipYer.ad } : {}));
    k.bilinen.is = true; yakinlikEkle(ar(1, 2));
  } else if (konu === 'memleket') {
    const tur = n.yore === 'yurtdisi' ? 'yurtdisi' : n.koken === 'mubadil' ? 'mubadil' : n.gocmus ? (n.aile.cocuk > 0 && n.yas >= 30 && rng.olasilik(0.5) ? 'gocmusCocuklu' : 'gocmus') : n.koken ? 'koken' : 'yerli';
    p.push(...soyle(durum, veri, n, k, sb.memleket[tur], rng));
    const om = oyuncu(durum, veri).memleket;
    if (om && om === n.memleket && k.bilinen.oyuncu_memleket) p.push(...soyle(durum, veri, n, k, sb.memleket.hemseri, rng));
    k.bilinen.memleket = true; yakinlikEkle(ar(1, 3));
  } else if (konu === 'semt') {
    const kizgin = (n.semt === mekan.semt && (semtBul(veri.dunya, n.semt)?.sosyo?.gelir ?? 3) <= 2) || n.ozellikler.includes('kavgaci');
    const tur = kizgin ? 'kizgin' : n.ozellikler.includes('umursamaz') || n.eksenler.acik <= 2 ? 'kayitsiz' : rng.olasilik(0.5) ? 'umutlu' : 'kizgin';
    p.push(...soyle(durum, veri, n, k, sb.semt[tur], rng));
    (k.konuGun ??= {}).semt = gun;
    yakinlikEkle(ar(1, 2));
  } else if (konu === 'gundem') {
    const son = (durum.dunya?.gundem || []).filter(g => gun - g.gun <= 7);
    if (son.length) p.push(...soyle(durum, veri, n, k, sb.gundem.var, rng, { haber: rng.sec(son).metin }));
    else p.push(...soyle(durum, veri, n, k, sb.gundem.yok, rng));
    yakinlikEkle(ar(0, 2));
  } else if (konu === 'kendin') {
    // Ne anlatacağını sen seçersin
    o.bekleyen = { tur: 'secim', id: 'kendin' };
    p.push({ tur: 'anlati', metin: `${n.hitapAdi} sana dönüyor; anlatmanı bekliyor.` });
    soruOlabilir = false;
  } else if (konu === 'dert') {
    const d = veri.npc.hayat.dertler.find(x => x.id === n.dert);
    if (!d || yak < sb.esikler.dert) p.push(...soyle(durum, veri, n, k, sb.dert.kacamak, rng));
    else if (k.bilinen.dert) p.push(...soyle(durum, veri, n, k, sb.dert.tekrar, rng));
    else {
      p.push(...anlat(durum, veri, n, k, sb.dert.giris, rng));
      p.push(...beden(durum, veri, n, k, rng, 'huzun'));
      p.push({ tur: 'konusma', konusan: n.hitapAdi, metin: agizla(rng.sec(d.soz ?? [d.metin]), n, veri, rng) });
      k.bilinen.dert = true; yakinlikEkle(ar(...sb.yakinlik.dertDinlemek));
      k.iliski.guven = (k.iliski.guven ?? 0) + 2;
      k.anilar.push({ zaman: durum.zaman.dakika, metin: 'derdini dinledin' });
      o.bekleyen = { tur: 'secim', id: 'dert_tepki' };
      soruOlabilir = false;
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
    const anlatir = n.ozellikler.some(x => ['geveze', 'merakli', 'yalanci'].includes(x)) || (!n.ozellikler.some(x => ['ketum', 'sadik'].includes(x)) && rng.olasilik(0.65));
    if (!anlatir) p.push(...soyle(durum, veri, n, k, sb.dedikodu.reddeder, rng));
    else {
      // Çoğunlukla insanlar hakkında; ara sıra mekanın/semtin meselesi
      const mk = anlatacagiDedikodu(durum, veri, n, mekan);
      const kd = !mk || rng.olasilik(0.7) ? kisiDedikodusu(durum, veri, n, mekan, rng) : null;
      if (kd) {
        p.push(...soyle(durum, veri, n, k, sb.dedikodu.anlatir, rng, { dedikodu: kd.metin }));
        dedikoduKaydet(durum, kd, mekan, id);
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
    if (sonuc === 'kizdi') k.iliski.gerginlik = (k.iliski.gerginlik ?? 0) + 3;
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
    oturumBitir(durum);
  } else if (durum.sohbet && soruOlabilir && !o.bekleyen) {
    // Karşılıklılık: meraklı ve dışadönük olan daha çok sorar
    const p0 = sb.esikler.soruOlasiligi * (n.ozellikler.includes('merakli') ? 1.5 : 1) * (0.6 + n.eksenler.disadonuk * 0.15);
    if (rng.olasilik(Math.min(0.85, p0))) p.push(...soruSor(durum, veri, n, k, rng));
  }
  aksiyonKaydet(durum, 'sohbet:' + konu, { npc: id });
  return { tamam: true, paragraflar: p };
}

// İltifat, takılma, numara, buluşma teklifi. Döner: ardından kişi soru sorabilir mi
function flortHamlesi(durum, veri, rng, n, k, konu, p) {
  const F = veri.npc.flort, gun = gunNo(durum.zaman.dakika);
  const engel = flortEngeli(durum, veri, n);
  if (konu === 'iltifat' || konu === 'takil') (k.iltifatGun ??= {})[gun] = (k.iltifatGun[gun] ?? 0) + 1;
  p.push(...sen(durum, veri, n, k, F[konu].oyuncu, rng));
  if (engel) {
    p.push(...anlat(durum, veri, n, k, F.uygunsuz[engel], rng));
    k.bilinen.flortEngel = engel;
    k.bilinen.oyuncu_flort = true;
    return false;
  }
  const ig = ilgi(durum, veri, n, k);
  const seviye = ig >= F.esikler.iyi ? 'iyi' : ig >= F.esikler.orta ? 'orta' : 'kotu';
  if (konu === 'iltifat' || konu === 'takil') {
    p.push(...anlat(durum, veri, n, k, F[konu][seviye], rng));
    iliskiEkle(k, F.etki[seviye], rng, seviye !== 'kotu');
    if (seviye === 'iyi') { durum.sohbet.kalan += veri.npc.sohbet.sabir.flortEki; if (rng.olasilik(0.4)) k.anilar.push({ zaman: durum.zaman.dakika, metin: 'aranızda bir elektrik vardı' }); }
    return seviye !== 'kotu';
  }
  if (konu === 'numara') {
    if (ig >= F.esikler.numara) {
      p.push(...anlat(durum, veri, n, k, F.numara.evet, rng));
      k.numara = true;
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
    if (ig >= F.esikler.davet) {
      p.push(...anlat(durum, veri, n, k, F.davet.evet, rng));
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

// Geliştirici/test: bu kişinin sana ilgisi ve engeli
export function flortDurumu(durum, veri, id) {
  const k = durum.npcler?.[id], n = kisi(veri, durum.seed, id, k?.sablon);
  return { uygun: flortUygun(durum, veri, n), engel: flortEngeli(durum, veri, n), ilgi: Math.round(ilgi(durum, veri, n, k)), yonelim: yonelim(durum.seed, n, veri) };
}
