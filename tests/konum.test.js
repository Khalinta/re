import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import * as konum from '../js/core/konum.js';
import { olayYeriTutuyor } from '../js/core/olay.js';
import { Rng } from '../js/core/rng.js';

const oku = y => JSON.parse(readFileSync(new URL(y, import.meta.url)));
const dunya = {};
for (const f of ['sehir', 'semtler', 'ulasim', 'kurumlar', 'sirketler', 'figurler', 'orgutler', 'mekanlar']) dunya[f] = oku(`../data/dunya/${f}.json`);
const veri = { sim: oku('../data/simulasyon.json'), takvim: oku('../data/takvim.json'), dunya, hava: oku('../data/hava.json'),
  ekonomi: oku('../data/ekonomi.json'), gezi: oku('../data/gezi.json'), ilerleme: oku('../data/dunya/ilerleme.json') };
const rng = () => Rng.akis('test', 'konum');
// 2026-10-20 salı, saat 10:00, ev Tabakhane'de
const yeni = (saat = 10) => yeniDurum(veri.sim, { seed: 'konum', baslangic: '2026-10-20', saat, para: 2000, ev: { semt: 'tabakhane', tip: 'oda', ad: 'oda' } });
const idler = d => konum.baglamAksiyonlari(d, veri).map(a => a.id);

test('ev seçimi seed\'e bağlı ve aday semtlerden', () => {
  assert.deepEqual(konum.evSec('a', veri.gezi), konum.evSec('a', veri.gezi));
  for (const s of ['a', 'b', 'c', 'd']) assert.ok(veri.gezi.evAdaylari.includes(konum.evSec(s, veri.gezi).semt));
});

test('yere göre aksiyonlar: evde dışarı çık; sokakta eve dön; mekanda hizmetler ve kulak ver', () => {
  const d = yeni();
  assert.deepEqual(idler(d), ['gezi:cik']);
  assert.equal(konum.disariCik(d, veri, rng()).tamam, true);
  assert.deepEqual(d.konum, { semt: 'tabakhane', mekan: null });
  assert.deepEqual(idler(d), ['gezi:eve']);
  const g = konum.mekanaGir(d, veri, rng(), 'sefa_bakkal');
  assert.equal(g.tamam, true, g.sebep);
  assert.ok(g.paragraflar.some(p => p.metin.includes('veresiye defteri')), 'ilk ziyarette tasvir');
  assert.deepEqual(idler(d), ['mekan:alisveris', 'mekan:ekmek', 'mekan:kulak', 'gezi:cik']);
  assert.equal(konum.konumMetni(d, veri), 'Sefa Bakkal · Tabakhane');
  assert.equal(konum.eveGir(d, veri, rng()).tamam, true);
  assert.equal(d.konum.mekan, 'ev');
});

test('kapalı mekana girilmez; başka semtteki mekana yürüyerek girilmez', () => {
  const d = yeni(10);
  konum.disariCik(d, veri, rng());
  const r = konum.mekanaGir(d, veri, rng(), 'dere_kahvesi'); // 10:00'da açılıyor; 10:03'te açık
  assert.equal(r.tamam, true);
  const d2 = yeni(8);
  konum.disariCik(d2, veri, rng());
  assert.match(konum.mekanaGir(d2, veri, rng(), 'dere_kahvesi').sebep, /Kapalı/);
  assert.match(konum.mekanaGir(d2, veri, rng(), 'kavala_meyhanesi').sebep, /başka bir semtte/);
});

test('mekanda harcama: fiyat mekanın seviyesinden, para ve durumlar değişir; para yetmezse olmaz', () => {
  const d = yeni(12);
  konum.disariCik(d, veri, rng());
  konum.mekanaGir(d, veri, rng(), 'debbag_iskembecisi');
  const once = { para: d.para, aclik: d.durumlar.aclik, dk: d.zaman.dakika };
  const r = konum.mekanAksiyonuYap(d, veri, rng(), 'yemek');
  assert.equal(r.tamam, true);
  assert.equal(once.para - d.para, 180);
  assert.ok(d.durumlar.aclik < once.aclik);
  assert.equal(d.zaman.dakika - once.dk, 35);
  d.para = 50;
  assert.match(konum.mekanAksiyonuYap(d, veri, rng(), 'yemek').sebep, /yok/);
});

test('kulak ver: kalabalık yerde zamanla mekanın bütün dedikoduları duyulur, tekrar etmez', () => {
  const d = yeni(9);
  konum.disariCik(d, veri, rng());
  konum.mekanaGir(d, veri, rng(), 'debbag_iskembecisi');
  const r = rng();
  for (let i = 0; i < 12; i++) { d.zaman.dakika = 9 * 60; konum.mekanAksiyonuYap(d, veri, r, 'kulak'); }
  const duyulan = konum.duyulanlar(d, veri);
  assert.equal(duyulan.length, dunya.mekanlar.mekanlar.find(m => m.id === 'debbag_iskembecisi').dedikodular.length);
  assert.equal(new Set(duyulan.map(x => x.id)).size, duyulan.length);
});

test('yolculuk: süre ve ücret düşülür, konum değişir; para yetmezse ya da aynı semtse olmaz', () => {
  const d = yeni(8);
  const r = konum.yolculukYap(d, veri, rng(), 'marina', 'toplu');
  assert.equal(r.tamam, true, r.sebep);
  assert.deepEqual(d.konum, { semt: 'marina', mekan: null });
  assert.ok(d.para < 2000 && d.zaman.dakika > 8 * 60 + 15);
  assert.ok(r.paragraflar.some(p => p.tur === 'sistem' && p.metin.includes('M2')));
  assert.equal(konum.yolculukYap(d, veri, rng(), 'marina', 'toplu').tamam, false);
  d.para = 10;
  assert.match(konum.yolculukYap(d, veri, rng(), 'yamacevler', 'taksi').sebep, /yok/);
  const y = konum.yolculukYap(d, veri, rng(), 'tersaneonu', 'yuruyus');
  assert.equal(y.tamam, true);
  assert.deepEqual(idler(d), ['gezi:evegit']);
});

test('gece yarısından sonra toplu taşıma yok ama yürüyüş ve taksi var', () => {
  const d = yeni(3);
  const s = konum.yolculukSecenekleri(d, veri, 'camlik');
  assert.equal(s.toplu, null);
  assert.ok(s.yuruyus && s.taksi);
  assert.equal(konum.yolculukYap(d, veri, rng(), 'camlik', 'toplu').tamam, false);
});

test('olayların yeri: ev olayları yalnızca evde', () => {
  const d = yeni();
  const olay = { id: 'x', yer: 'ev' };
  assert.equal(olayYeriTutuyor(d, olay), true);
  konum.disariCik(d, veri, rng());
  assert.equal(olayYeriTutuyor(d, olay), false);
  assert.equal(olayYeriTutuyor(d, { id: 'y', yer: 'sokak' }), true);
  assert.equal(olayYeriTutuyor({ zaman: {} }, olay), true); // konumsuz eski durum
});
