// O anın durumuna göre sohbet (3.22): kişinin bugünkü hali, söylediği şeyin türü, mekan, saat, yağmur, az önce olanlar
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import { kisi, mekandakiler } from '../js/core/insanlar.js';
import { tanis, sohbetKonulari, sohbetHamlesi, ilgi, flortEngeli } from '../js/core/sohbet.js';
import { gununHali } from '../js/core/npc.js';
import { derinlik } from '../js/core/kart.js';
import { havaSimdi } from '../js/core/konum.js';
import { partnerli } from '../js/core/sadakat.js';
import { mekanBul } from '../js/core/mekan.js';
import { dilim, gunNo } from '../js/core/zaman.js';
import { Rng } from '../js/core/rng.js';

const oku = y => JSON.parse(readFileSync(new URL('../' + y, import.meta.url)));
const dunya = {};
for (const f of ['sehir', 'semtler', 'ulasim', 'kurumlar', 'sirketler', 'figurler', 'orgutler', 'mekanlar']) dunya[f] = oku(`data/dunya/${f}.json`);
const npc = {};
for (const f of ['isimler', 'memleket', 'kisilik', 'hayat', 'sohbet', 'gorunus', 'flort', 'dedikodu', 'derinlik', 'zevk', 'kanca']) npc[f] = oku(`data/npc/${f}.json`);
npc.hayatOlaylari = oku('data/npc/hayat_olaylari.json');
const veri = { sim: oku('data/simulasyon.json'), takvim: oku('data/takvim.json'), hava: oku('data/hava.json'), dunya, npc, olaylar: {} };
for (const f of oku('data/olaylar/_liste.json').dosyalar) for (const o of oku('data/olaylar/' + f).olaylar) veri.olaylar[o.id] = o;
const temiz = s => assert.ok(!/[{}«»]|undefined|null|NaN|\[object/.test(s), s);

function oturum(seed, mekanId, saat, kosul = () => true, gunler = 30) {
  const d = yeniDurum(veri.sim, { seed, baslangic: '2026-10-20', saat, para: 5000, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' }, karakter: { ad: 'Deniz', dogum: '1996-03-01', cinsiyet: 'e', fizik: { cekicilik: 7, karizma: 7 } } });
  const m = mekanBul(dunya, mekanId);
  d.konum = { semt: m.semt, mekan: m.id };
  const r = Rng.akis(seed, 'y');
  for (let g = 0; g < gunler; g++) {
    d.zaman.dakika = g * 1440 + saat * 60;
    const kal = m.kalabalik[dilim(d.zaman.dakika).id];
    for (const id of mekandakiler(d, veri, m, kal)) {
      const n = kisi(veri, seed, id);
      if (n.yas < 20 || !kosul(n, d)) continue;
      d.bilgi.retler = {};
      tanis(d, veri, r, m, kal, id);
      if (d.sohbet?.npc === id) { d.sohbet.bekleyen = null; d.sohbet.kalan = 99; return { d, id, n, k: d.npcler[id], r, saat: d.zaman.dakika }; }
    }
  }
  return null;
}
const konular = t => sohbetKonulari(t.d, veri).map(x => x.konu);
const hepsiTemiz = s => s.paragraflar.forEach(p => temiz(p.metin));

test('"Nasıl olduğunu sor": bugünkü haline özel cevaplar (yorgunsa çay, gerginse "kim sinirlendirdi", dalgınsa "aklın nerede")', () => {
  const gorulen = new Set();
  for (let i = 0; i < 40 && gorulen.size < 3; i++) {
    const t = oturum('HAL' + i, 'kordon_mekan', 17);
    if (!t) continue;
    const hal = gununHali(t.d.seed, t.n, gunNo(t.d.zaman.dakika), npc.gorunus).tur;
    if (!['yorgun', 'gergin', 'dalgin'].includes(hal) || t.n.uslup === 'kibar') continue;
    assert.ok(konular(t).includes('an:bir_sey_mi'), 'hal yüzünden belli: ' + konular(t).join());
    const s = sohbetHamlesi(t.d, veri, t.r, 'hal');
    hepsiTemiz(s);
    t.d.sohbet.bekleyen = null;
    const l = konular(t);
    assert.ok(l.some(x => x.startsWith('kanca:hal_' + hal + ':')), hal + ': ' + l.join());
    gorulen.add(hal);
    const y = l.find(x => x.startsWith('kanca:hal_'));
    hepsiTemiz(sohbetHamlesi(t.d, veri, t.r, y));
  }
  assert.ok(gorulen.size >= 2, [...gorulen].join());
});

test('"Bir şey mi oldu?" açılırsa derdini yakınlık düşük olsa da anlatabilir; dert teklifleri gelir', () => {
  let anlatti = 0;
  for (let i = 0; i < 60 && !anlatti; i++) {
    const t = oturum('ACIL' + i, 'kordon_mekan', 17, n => !!n.dert);
    if (!t) continue;
    if (!konular(t).includes('an:bir_sey_mi')) continue;
    const s = sohbetHamlesi(t.d, veri, t.r, 'an:bir_sey_mi');
    hepsiTemiz(s);
    if (t.k.bilinen?.dert) { anlatti++; assert.equal(t.d.sohbet.bekleyen?.id, 'dert_tepki'); }
  }
  assert.ok(anlatti, 'hiç açılmadı');
});

test('barda içki: üç kez ısmarlanabilir, her kadehte ilgisi artar ve metin değişir; dindar biri içmez', () => {
  let icen = null, icmeyen = null;
  for (let i = 0; i < 40 && !(icen && icmeyen); i++) {
    const t = oturum('ICKI' + i, 'kizil_bar', 22);
    if (!t) continue;
    const dindar = (derinlik(t.d.seed, t.n, veri).dindarlikI ?? 0) >= 3;
    if (dindar && !icmeyen) icmeyen = t; else if (!dindar && !icen) icen = t;
  }
  assert.ok(icen);
  const once = ilgi(icen.d, veri, icen.n, icen.k);
  const metinler = [];
  for (let j = 0; j < 3; j++) {
    icen.d.sohbet.bekleyen = null; icen.d.zaman.dakika = icen.saat;
    assert.ok(konular(icen).includes('an:icki'), j + ': ' + konular(icen).join());
    const s = sohbetHamlesi(icen.d, veri, icen.r, 'an:icki');
    hepsiTemiz(s);
    metinler.push(s.paragraflar.filter(p => p.tur === 'anlati').map(p => p.metin).join(' '));
  }
  assert.equal(icen.d.sohbet.icki, 3);
  assert.ok(!konular(icen).includes('an:icki'), 'dördüncü yok');
  assert.ok(ilgi(icen.d, veri, icen.n, icen.k) > once);
  assert.ok(metinler[2].includes('Üçüncü kadeh'), metinler.join(' / '));
  if (icmeyen) {
    const s = sohbetHamlesi(icmeyen.d, veri, icmeyen.r, 'an:icki');
    assert.ok(s.paragraflar.some(p => /içmem/.test(p.metin)));
  }
});

test('gece geç: "seni eve bırakayım" — ya kapıda "yukarı gelmek ister misin?" ya da onun mahallesinde sokaktasın', () => {
  const sonuc = new Set();
  for (let i = 0; i < 50 && sonuc.size < 2; i++) {
    const t = oturum('BIRAK' + i, 'kizil_bar', 23, (n, d) => n.yas <= 40 && n.cinsiyet !== d.karakter.cinsiyet && !flortEngeli(d, veri, n) && !partnerli(n));
    if (!t) continue;
    if (i % 2) Object.assign(t.k.iliski, { arzu: 70, cekim: 60, yakinlik: 30 });
    assert.ok(konular(t).includes('an:birak'));
    const s = sohbetHamlesi(t.d, veri, t.r, 'an:birak');
    hepsiTemiz(s);
    assert.ok(!t.d.sohbet);
    if (t.d.zamanlayicilar.some(x => x.olay === 'birlikte_gece')) sonuc.add('kapida');
    else { assert.deepEqual(t.d.konum, { semt: t.n.semt, mekan: null }); sonuc.add('birakti'); }
  }
  assert.equal(sonuc.size, 2, [...sonuc].join());
});

test('yağmur yağarken parkta: "bir yere sığınalım" — en yakın kapalı yere birlikte geçip konuşmaya devam ediyorsunuz', () => {
  let oldu = false;
  for (let i = 0; i < 4 && !oldu; i++) {
    const t = oturum('YAGMUR' + i, 'kordon_mekan', 15, () => true, 1);
    if (!t) continue;
    for (let g = 0; g < 120 && !oldu; g++) {
      t.d.zaman.dakika = g * 1440 + 15 * 60;
      if (!havaSimdi(t.d, veri)?.yagiyor) continue;
      t.d.sohbet = { npc: t.id, mekan: 'kordon_mekan', kalan: 99, kullanilan: {}, bekleyen: null, bas: t.d.zaman.dakika, bulusma: t.d.zaman.dakika + 600 };
      t.d.konum = { semt: 'sahilyolu', mekan: 'kordon_mekan' };
      assert.ok(konular(t).includes('an:sigin'), konular(t).join());
      const s = sohbetHamlesi(t.d, veri, t.r, 'an:sigin');
      hepsiTemiz(s);
      assert.ok(t.d.sohbet && t.d.konum.mekan !== 'kordon_mekan', JSON.stringify(t.d.konum));
      oldu = true;
    }
  }
  assert.ok(oldu, '120 günde yağmur yağmadı');
});

test('az önce kırdıysan "özür dilerim" çıkar; dedikoduda o kişinin adıyla "ona söyleyeceğim"', () => {
  const t = oturum('OZUR', 'kordon_mekan', 17);
  assert.ok(t);
  t.k.iliski.gerginlik = 4; t.d.sohbet.son = 'kirildi';
  assert.ok(konular(t).includes('an:ozur'));
  hepsiTemiz(sohbetHamlesi(t.d, veri, t.r, 'an:ozur'));
  assert.ok(t.k.iliski.gerginlik < 4);
  // dedikodu: kancayı doğrudan aç
  t.d.sohbet.kancalar = ['dedikodu']; t.d.sohbet.kancaDeg = { dedikodu: { kisiAd: 'Kemal' } }; t.d.sohbet.bekleyen = null;
  const s = sohbetHamlesi(t.d, veri, t.r, 'kanca:dedikodu:soyleyecegim');
  hepsiTemiz(s);
  assert.ok(s.paragraflar.some(p => p.metin.includes("Kemal'e")), s.paragraflar.map(p => p.metin).join(' | '));
});

test('eve bıraktığın kişi o gece hiçbir mekanda yok, sabah yine çıkabilir; aynı saatlerde iki yerde birden görülmez', () => {
  let t = null;
  for (let i = 0; i < 40 && !t; i++) {
    const x = oturum('GITTI' + i, 'kizil_bar', 23);
    if (!x) continue;
    sohbetHamlesi(x.d, veri, x.r, 'an:birak');
    if (x.k.gitti) t = x;
  }
  assert.ok(t, 'eve bırakılmadı');
  const bar = mekanBul(dunya, 'kizil_bar');
  for (const dk of [t.d.zaman.dakika + 30, t.d.zaman.dakika + 180]) {
    t.d.zaman.dakika = dk;
    assert.ok(!mekandakiler(t.d, veri, bar, 3).includes(t.id));
  }
  assert.ok(t.k.gitti <= (Math.floor(t.saat / 1440) + 1) * 1440 + 8 * 60 + 1);
  // sonYer: aynı gün ve dilimde başka bir mekanda değil
  const k = t.k; delete k.gitti;
  k.sonYer = { mekan: 'baska_mekan', gun: gunNo(t.d.zaman.dakika), dilim: dilim(t.d.zaman.dakika).id };
  assert.ok(!mekandakiler(t.d, veri, bar, 3).includes(t.id));
});
