// Gündelik olaylar (3.12): ev, sokak, tanıdıklar; her olay her seçenekle baştan sona oynanır, metinler temiz
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import { olayBaslat, olaySecenekleri, olaySecenegiSec, olaySec, olayUygunluk } from '../js/core/olay.js';
import { olayKisisi } from '../js/core/olaykisi.js';
import { Rng } from '../js/core/rng.js';

const oku = y => JSON.parse(readFileSync(new URL('../' + y, import.meta.url)));
const dunya = {};
for (const f of ['sehir', 'semtler', 'ulasim', 'kurumlar', 'sirketler', 'figurler', 'orgutler', 'mekanlar']) dunya[f] = oku(`data/dunya/${f}.json`);
const npc = {};
for (const f of ['isimler', 'memleket', 'kisilik', 'hayat', 'sohbet', 'gorunus', 'flort', 'dedikodu', 'derinlik', 'zevk']) npc[f] = oku(`data/npc/${f}.json`);
npc.hayatOlaylari = oku('data/npc/hayat_olaylari.json');
const veri = { sim: oku('data/simulasyon.json'), takvim: oku('data/takvim.json'), dunya, npc, olaylar: {} };
const gunluk = oku('data/olaylar/gunluk.json').olaylar, tanidik = oku('data/olaylar/tanidik.json').olaylar;
for (const f of oku('data/olaylar/_liste.json').dosyalar) for (const o of oku('data/olaylar/' + f).olaylar) veri.olaylar[o.id] = o;
const temiz = s => assert.ok(!/[{}«»]|undefined|null|NaN|\[object/.test(s), s);

function durumYap(seed, tanidiklar = 0) {
  const d = yeniDurum(veri.sim, { seed, baslangic: '2026-10-20', saat: 14, para: 20000, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' }, karakter: { ad: 'Deniz', dogum: '1998-03-01', cinsiyet: 'e' } });
  d.npcler ??= {};
  for (let i = 0; i < tanidiklar; i++) {
    d.npcler[`n:camlik:${i}`] = { iliski: { yakinlik: 10 + i * 3, gerginlik: i % 3 === 0 ? 5 : 0 }, anilar: [], tanisildi: 0, numara: i % 2 === 0, ...(i === 4 ? { iliskiTuru: 'flort' } : {}) };
  }
  return d;
}

// Bir olayı belirli bir seçenek yoluyla sonuna kadar oynat
function oyna(d, id, baglam, yol, rng) {
  d.aktifOlay = null;
  let s = olayBaslat(d, id, veri, rng, baglam);
  s.paragraflar.forEach(p => temiz(p.metin));
  for (let j = 0; !s.bitti && j < 8; j++) {
    const l = olaySecenekleri(d, veri);
    assert.ok(l.length, `${id}: seçeneksiz sahne`);
    const acik = l.filter(x => !x.devreDisi);
    const x = (acik.length ? acik : l)[yol(j, acik.length || l.length)];
    s = olaySecenegiSec(d, veri, rng, x.sira);
    s.paragraflar.forEach(p => temiz(p.metin));
  }
  assert.ok(s.bitti, id);
  return s;
}

test('veri: yeterli sayıda olay (doğrulama olay.test.js\'te, bütün dosyalar için)', () => {
  assert.ok(gunluk.length >= 25 && tanidik.length >= 10, `${gunluk.length} + ${tanidik.length}`);
});

test('her gündelik olay her seçenekle oynanır; metinler temiz; para ve durumlar sınırda', () => {
  for (const o of gunluk) {
    const ilk = o.sahneler.giris.secenekler.length;
    for (let s = 0; s < ilk; s++) {
      const d = durumYap('G' + o.id + s, 6);
      d.konum = { semt: 'camlik', mekan: o.yer === 'ev' ? 'ev' : null };
      oyna(d, o.id, {}, (j, n) => j === 0 ? s % n : 0, Rng.akis('g' + o.id + s, 'x'));
      for (const v of Object.values(d.durumlar)) assert.ok(v >= 0 && v <= 100);
    }
  }
});

test('tanıdık olayları: kişi seçiciye uyan biri seçilir; metinde adı ve hitabı; ilişkiye işler', () => {
  const d = durumYap('TAN', 8);
  for (const o of tanidik.filter(x => x.kisi)) {
    const b = olayKisisi(d, veri, o.kisi, Rng.akis('k' + o.id, 'x'));
    if (!b) continue;
    const k = d.npcler[b.npc.kisi];
    if (o.kisi.numara) assert.ok(k.numara, o.id);
    if (o.kisi.yakinlikMin) assert.ok(k.iliski.yakinlik >= o.kisi.yakinlikMin, o.id);
    if (o.kisi.tur) assert.ok(o.kisi.tur.includes(k.iliskiTuru), o.id);
    for (let s = 0; s < o.sahneler.giris.secenekler.length; s++) {
      const dd = structuredClone(d);
      const once = JSON.stringify(dd.npcler[b.npc.kisi].iliski);
      const son = oyna(dd, o.id, b, (j, n) => j === 0 ? s % n : 0, Rng.akis('t' + o.id + s, 'x'));
      void son;
      assert.notEqual(JSON.stringify(dd.npcler[b.npc.kisi].iliski), once, `${o.id}/${s}: ilişki değişmedi`);
    }
  }
  // Kimse uymuyorsa kişili olay çıkmaz
  const bos = durumYap('BOS', 0);
  for (const o of tanidik.filter(x => x.kisi)) assert.equal(olayKisisi(bos, veri, o.kisi, Rng.akis('b', 'x')), null);
  for (let i = 0; i < 50; i++) { const x = olaySec(bos, veri, Rng.akis('s' + i, 'x')); assert.ok(!x?.kisi, x?.id); }
});

test('otomatik seçim kişili olayı bağlamıyla döndürür; devam olayları (borç, cüzdan) zamanlayıcıyla gelir', () => {
  const d = durumYap('SEC', 8);
  let kisili = 0;
  for (let i = 0; i < 400; i++) {
    d.zaman.dakika = (i % 30) * 1440 + (i % 24) * 60;
    d.konum = { semt: 'camlik', mekan: i % 2 ? null : 'ev' };
    const x = olaySec(d, veri, Rng.akis('o' + i, 'x'));
    if (x?.kisi) { kisili++; assert.ok(x.baglam?.npc?.kisi && d.npcler[x.baglam.npc.kisi]); assert.ok(olayUygunluk(d, x, veri, { baglam: x.baglam }).uygun); }
  }
  assert.ok(kisili > 5, `${kisili}`);
  // Borç ver → 12 gün sonra devamı (bağlamla)
  const b = olayKisisi(d, veri, tanidik.find(o => o.id === 'tanidik_borc').kisi, Rng.akis('bb', 'x'));
  oyna(d, 'tanidik_borc', b, () => 0, Rng.akis('bor', 'x'));
  const z = d.zamanlayicilar.find(x => x.olay === 'tanidik_borc_doner');
  assert.ok(z && z.baglam.npc.kisi === b.npc.kisi && z.baglam.degisken.kisi.ad);
  oyna(d, 'tanidik_borc_doner', z.baglam, () => 0, Rng.akis('don', 'x'));
  // Cüzdanı geri ver → teşekkür (evde değilken)
  const d2 = durumYap('CUZ', 0);
  d2.konum = { semt: 'camlik', mekan: null };
  oyna(d2, 'cuzdan', {}, () => 0, Rng.akis('cz', 'x'));
  const z2 = d2.zamanlayicilar.find(x => x.olay === 'cuzdan_tesekkur');
  assert.ok(z2 && z2.kosul && z2.kosulTutmazsa === 'bekle');
});

test('yer ve zaman: evdeki olay sokakta, gece olayı öğlen, bayram olayı sıradan günde çıkmaz', () => {
  const d = durumYap('YER', 0);
  const uygun = (id, ayar) => { Object.assign(d, ayar.d || {}); d.konum = ayar.konum; d.zaman.dakika = ayar.dk; return olayUygunluk(d, veri.olaylar[id], veri).uygun; };
  assert.equal(uygun('gece_kavga_sesi', { konum: { semt: 'camlik', mekan: 'ev' }, dk: 14 * 60 }), false);
  assert.equal(uygun('gece_kavga_sesi', { konum: { semt: 'camlik', mekan: 'ev' }, dk: 1440 + 2 * 60 }), true);
  assert.equal(uygun('cuzdan', { konum: { semt: 'camlik', mekan: 'ev' }, dk: 14 * 60 }), false);
  assert.equal(uygun('bayram_cocuklari', { konum: { semt: 'camlik', mekan: 'ev' }, dk: 14 * 60 }), false);
});
