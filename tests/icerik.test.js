// İnsanların içeriği (3.11): dert/hayal/sır çeşitliliği ve aileyle tutarlılık, hayat olayları, dedikodu, buluşma yerleri
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import { kisi, tanidiklari } from '../js/core/insanlar.js';
import { kisiDedikodusu, randevuKur } from '../js/core/sohbet.js';
import { kisiKarti, derinlik } from '../js/core/kart.js';
import { hayatOlayiTetikle, kisiGuncel, haberSablonu } from '../js/core/npchayat.js';
import { olayBaslat, olaySecenekleri, olaySecenegiSec } from '../js/core/olay.js';
import { mekanBul } from '../js/core/mekan.js';
import { metinCoz } from '../js/core/metin.js';
import { Rng } from '../js/core/rng.js';
import { SIMDIKI_YIL } from '../js/core/npc.js';

const oku = y => JSON.parse(readFileSync(new URL('../' + y, import.meta.url)));
const dunya = {};
for (const f of ['sehir', 'semtler', 'ulasim', 'kurumlar', 'sirketler', 'figurler', 'orgutler', 'mekanlar']) dunya[f] = oku(`data/dunya/${f}.json`);
const npc = {};
for (const f of ['isimler', 'memleket', 'kisilik', 'hayat', 'sohbet', 'gorunus', 'flort', 'dedikodu', 'derinlik', 'zevk']) npc[f] = oku(`data/npc/${f}.json`);
npc.hayatOlaylari = oku('data/npc/hayat_olaylari.json');
const veri = { sim: oku('data/simulasyon.json'), takvim: oku('data/takvim.json'), dunya, npc, hava: oku('data/hava.json'), ekonomi: oku('data/ekonomi.json'), gezi: oku('data/gezi.json'), olaylar: {} };
for (const o of oku('data/olaylar/iliski.json').olaylar) veri.olaylar[o.id] = o;
const H = npc.hayat;
const temiz = s => assert.ok(!/[{}«»]|undefined|null|NaN|\[object/.test(s), s);
const SEED = 'ICERIK';
const semtler = dunya.semtler.semtler.map(s => s.id);
const ids = Array.from({ length: 3000 }, (_, i) => i % 3 === 0 ? `n:${dunya.mekanlar.mekanlar[i % 52].id}:${i % 7}` : `n:${semtler[i % semtler.length]}:${i % 45}`);
const yeni = () => yeniDurum(veri.sim, { seed: SEED, baslangic: '2026-10-20', saat: 19, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' } });

test('çeşitlilik: dert, hayal, sır havuzları büyük; hiçbir sır insanların %12\'sinden fazlasında yok', () => {
  assert.ok(H.dertler.length >= 60 && H.hayaller.length >= 45 && H.sirlar.length >= 45);
  const say = { dert: {}, hayal: {}, sir: {} };
  for (const id of ids) {
    const n = kisi(veri, SEED, id);
    for (const a of ['dert', 'hayal', 'sir']) if (n[a]) say[a][n[a]] = (say[a][n[a]] ?? 0) + 1;
  }
  for (const a of ['dert', 'hayal', 'sir']) {
    const enCok = Math.max(...Object.values(say[a]));
    assert.ok(Object.keys(say[a]).length >= 35, `${a}: ${Object.keys(say[a]).length} farklı`);
    assert.ok(enCok / ids.length < 0.12, `${a}: en sık olan %${Math.round(100 * enCok / ids.length)}`);
  }
  for (const d of H.dertler.filter(x => x.olay)) assert.equal(say.dert[d.id], undefined, `${d.id} yalnızca hayat olayıyla gelir`);
});

test('tutarlılık: dert/hayal/sır kişinin ailesiyle, yaşıyla, kökeniyle çelişmez', () => {
  const d = yeni();
  const bul = (l, id) => l.find(x => x.id === id);
  let denetlenen = 0;
  for (const id of ids) {
    const n = kisi(veri, SEED, id);
    const k = kisiKarti(d, veri, id);
    const a = k.aile;
    for (const [alan, liste] of [['dert', H.dertler], ['hayal', H.hayaller], ['sir', H.sirlar]]) {
      const x = n[alan] && bul(liste, n[alan]);
      if (!x) continue;
      denetlenen++;
      const ne = `${id} ${alan}=${x.id} (${n.yas}, ${n.medeni})`;
      if (x.cocukMin) assert.ok(a.cocuklar.length >= x.cocukMin, ne);
      if (x.kardesMin) assert.ok(a.kardesler.length >= x.kardesMin, ne);
      if (x.anneSag) assert.ok(a.anne?.yasiyor, ne);
      if (x.babaSag) assert.ok(a.baba?.yasiyor, ne);
      if (x.babaOlu) assert.ok(a.baba && !a.baba.yasiyor, ne);
      if (x.yore) assert.ok(x.yore.includes(n.yore), ne);
      if (x.medeni) assert.ok(x.medeni.includes(n.medeni), ne);
    }
    if (n.dert === 'oglu_issiz' && n.yas >= 40) assert.ok(a.cocuklar[0].cinsiyet === 'e' && a.cocuklar[0].yas >= 22, `${id}: ${JSON.stringify(a.cocuklar[0])}`);
    if (n.dert === 'evlat_uzakta') assert.ok(a.cocuklar.filter(c => c.yas >= 18).every(c => !["Karaliman'da", 'yanında'].includes(c.nerede)), id);
    if (n.dert === 'cocuk_okul') assert.ok(a.cocuklar.some(c => c.yas < 18), id);
    if (n.sir === 'kus_kardes') assert.ok(a.kardesler.some(c => c.kus), id);
    if (n.dert === 'saglik' || n.dert === 'ameliyat') assert.equal(k.derinlik.saglik, 'sağlık sorunları var');
    if (bul(H.dertler, n.dert)?.para) assert.ok(!['rahat', 'varlıklı', 'biraz birikimi var'].includes(k.derinlik.para), `${id} ${n.dert}: ${k.derinlik.para}`);
  }
  assert.ok(denetlenen > 6000, `${denetlenen}`);
});

test('hayat olayları: kişi kartı değişikliği yansıtır (anne/baba vefatı, küslük, emeklilik, kendi işi); metinler temiz', () => {
  const d = yeni();
  const O = npc.hayatOlaylari.olaylar;
  assert.ok(O.length >= 35);
  const gorulen = new Set();
  for (const id of ids.slice(0, 1500)) {
    const n = kisi(veri, SEED, id);
    if (n.yas < 18 || id.startsWith('f:')) continue;
    (d.npcler ??= {})[id] = { iliski: {}, anilar: [], tanisildi: 0 };
    for (const o of O) {
      if (gorulen.has(o.id)) continue;
      const g = kisiGuncel(d, veri, id);
      // olayın koşulu tutuyor mu (npchayat ile aynı denetim, burada kabaca)
      const kk = o.kosul || {};
      if (kk.anneSag && !g.aile.anne?.yasiyor) continue;
      if (kk.babaSag && !g.aile.baba?.yasiyor) continue;
      if (kk.kardesMin && (g.aile.kardes ?? 0) < kk.kardesMin) continue;
      if (kk.cocukMin && (g.aile.cocuk ?? 0) < kk.cocukMin) continue;
      if (kk.aileIliski && !kk.aileIliski.includes(g.aile.iliski)) continue;
      if (kk.durum && !kk.durum.includes(g.durum)) continue;
      if (kk.medeni && !kk.medeni.includes(g.medeni)) continue;
      if (kk.yasMin && g.yas < kk.yasMin) continue;
      if (kk.yasMax && g.yas > kk.yasMax) continue;
      if (kk.hayalVar && !g.hayal) continue;
      const x = hayatOlayiTetikle(d, veri, id, o.id);
      const sonra = kisiKarti(d, veri, id);
      if (o.id === 'anne_vefat') { assert.ok(!sonra.aile.anne.yasiyor && sonra.aile.anne.vefatYili === SIMDIKI_YIL, JSON.stringify(sonra.aile.anne)); assert.ok(sonra.oyku.some(y => y.metin.startsWith('Annesi'))); }
      if (o.id === 'baba_vefat') assert.ok(!sonra.aile.baba.yasiyor);
      if (o.id === 'kardesle_kustu') assert.ok(sonra.aile.kardesler.some(c => c.kus));
      if (o.id === 'kardesle_baristi') assert.ok(!sonra.aile.kardesler.some(c => c.kus) && sonra.sir !== H.sirlar.find(y => y.id === 'kus_kardes').metin);
      if (o.id === 'emekli_oldu') assert.ok(sonra.durum === 'emekli' && sonra.meslek.startsWith('emekli '), sonra.meslek);
      if (o.id === 'kendi_isi') assert.equal(sonra.durum, 'kendi');
      if (o.id === 'hayalini_yapti') assert.equal(sonra.hayal, null);
      const r = Rng.akis('h' + o.id, 'x');
      for (const ku of ['genc', 'orta', 'yasli']) {
        const s = haberSablonu(veri, x, ku, r);
        if (s) metinCoz(s.replace('{meslek', '{s.meslek'), r, { durum: d, veri, baglam: { degisken: { s: { hitap: 'abi', ebeveyn: 'Baba', meslek: x.meslek ?? 'işçi' } } } }).forEach(p => temiz(p.metin));
      }
      const dd = haberSablonu(veri, x, null, r, true);
      metinCoz(dd.replace('{meslek', '{t.meslek'), r, { durum: d, veri, baglam: { degisken: { t: { ad: 'Ayşe', meslek: x.meslek ?? 'işçi' } } } }).forEach(p => temiz(p.metin));
      gorulen.add(o.id);
      delete d.npcler[id].degisim; d.npcler[id].hayat = [];
      break;
    }
  }
  const eksik = O.map(o => o.id).filter(x => !gorulen.has(x));
  assert.ok(eksik.length <= 2, `denenemeyen olaylar: ${eksik}`);
});

test('dedikodu: yeni türler (hayal, içki, kumar, para, aile, kıskançlık) çıkar; özel adla başlayan metin bozulmaz; doğrular karttan', () => {
  const d = yeni();
  const m = mekanBul(dunya, 'cinaralti_kahvesi');
  const turler = new Set();
  for (let i = 0; i < 2500; i++) {
    const n = kisi(veri, SEED, ids[i % ids.length]);
    const x = kisiDedikodusu(d, veri, n, m, Rng.akis('D' + i, 'x'));
    if (!x) continue;
    temiz(x.metin);
    assert.ok(!/\bdemirspor'|\bkoinPazar/.test(x.metin), x.metin);
    if (!x.id.startsWith('p:')) continue;
    const tur = x.id.slice(('p:' + x.kisi + ':').length).split(':')[0];
    turler.add(tur);
    const t = kisi(veri, SEED, x.kisi), dr = derinlik(SEED, t, veri);
    if (tur === 'icki') assert.equal(dr.kotuAliskanlikId, 'icki');
    if (tur === 'varlikli') assert.ok(['rahat', 'varlıklı'].includes(dr.para));
    if (tur === 'aileKopuk') assert.ok(['kus', 'kopuk'].includes(t.aile.iliski));
    if (tur === 'hayal') assert.ok(t.hayal && t.hayal !== 'hicbir_sey');
    (d.bilgi.dedikodular ??= {})[x.id] = {};
  }
  for (const t of ['sir', 'dert', 'hayal', 'yalan', 'icki', 'varlikli', 'borcIcinde', 'aileKopuk']) assert.ok(turler.has(t), `${t} hiç çıkmadı (${[...turler]})`);
  assert.ok(Object.values(npc.dedikodu.turler).reduce((t, l) => t + l.length, 0) >= 80);
});

test('buluşma yerleri: kişiye göre seçilir, ibadetini yapan meyhaneye/bara çağırmaz, hepsi baştan sona oynanır', () => {
  const d = yeniDurum(veri.sim, { seed: 'RNDV', baslangic: '2026-10-20', saat: 19, para: 50000, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' }, karakter: { ad: 'Deniz', dogum: '1998-03-01', cinsiyet: 'e' } });
  const sayi = {};
  for (let i = 0; i < 400; i++) {
    const id = `n:${semtler[i % semtler.length]}:${i % 40}`;
    const n = kisi(veri, 'RNDV', id);
    if (n.yas < 18) continue;
    const k = ((d.npcler ??= {})[id] ??= { iliski: {}, anilar: [] });
    d.zamanlayicilar = [];
    randevuKur(d, veri, id, n, k);
    const z = d.zamanlayicilar[0];
    sayi[z.olay] = (sayi[z.olay] ?? 0) + 1;
    const dr = derinlik('RNDV', n, veri);
    if (dr.dindarlikI >= 3) assert.ok(!['randevu_meyhane', 'randevu_bar'].includes(z.olay), `${n.yas} ${dr.dindarlik}: ${z.olay}`);
    if (n.yas >= 55) assert.notEqual(z.olay, 'randevu_bar');
    // Üst üste aynı yer pek çıkmaz
    d.zamanlayicilar = [];
    randevuKur(d, veri, id, n, k);
    if (i < 6) {
      for (const ol of [z.olay, d.zamanlayicilar[0].olay]) {
        const rr = Rng.akis('R' + i + ol, 'x');
        d.aktifOlay = null;
        let s = olayBaslat(d, ol, veri, rr, z.baglam);
        s.paragraflar.forEach(p => temiz(p.metin));
        for (let j = 0; !s.bitti && j < 10; j++) {
          const l = olaySecenekleri(d, veri).filter(x => !x.devreDisi);
          s = olaySecenegiSec(d, veri, rr, l[(i + j) % l.length].sira);
          s.paragraflar.forEach(p => temiz(p.metin));
        }
        assert.ok(s.bitti, ol);
      }
    }
  }
  assert.ok(Object.keys(sayi).length >= 5, JSON.stringify(sayi));
});

test('tanıdıklar arası: dedikodu konuşanın tanıdıkları hakkında; hayatı değişen kişi güncel haliyle konuşulur', () => {
  const d = yeni();
  const m = mekanBul(dunya, 'cinaralti_kahvesi');
  const n = kisi(veri, SEED, 'n:eski_carsi:3');
  const tan = tanidiklari(veri, SEED, n.id).map(x => x.id);
  // tanıdıklarından evli birini boşa
  const evli = tan.find(x => kisi(veri, SEED, x)?.medeni === 'evli');
  if (evli) { (d.npcler ??= {})[evli] = { iliski: {}, anilar: [], tanisildi: 0, degisim: { medeni: 'bosanmis' } }; }
  for (let i = 0; i < 300; i++) {
    const x = kisiDedikodusu(d, veri, n, m, Rng.akis('T' + i, 'x'));
    if (!x) continue;
    assert.ok(tan.includes(x.kisi));
    if (evli && x.kisi === evli) assert.ok(!x.id.endsWith(':askEvli'), 'boşanmış kişi hâlâ evli diye konuşuldu');
    (d.bilgi.dedikodular ??= {})[x.id] = {};
  }
});
