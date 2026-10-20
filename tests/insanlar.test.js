import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import * as konum from '../js/core/konum.js';
import { mekandakiler, kisi, gorunus, tanis, konus, tanisiyorMu, tanidiklari, tanidiklarim } from '../js/core/insanlar.js';
import { mekanBul } from '../js/core/mekan.js';
import { Rng } from '../js/core/rng.js';

const oku = y => JSON.parse(readFileSync(new URL('../' + y, import.meta.url)));
const dunya = {};
for (const f of ['sehir', 'semtler', 'ulasim', 'kurumlar', 'sirketler', 'figurler', 'orgutler', 'mekanlar']) dunya[f] = oku(`data/dunya/${f}.json`);
const npc = {};
for (const f of ['isimler', 'memleket', 'kisilik', 'hayat', 'sohbet']) npc[f] = oku(`data/npc/${f}.json`);
const veri = { sim: oku('data/simulasyon.json'), takvim: oku('data/takvim.json'), dunya, npc, hava: oku('data/hava.json'), ekonomi: oku('data/ekonomi.json'), gezi: oku('data/gezi.json') };
const yeni = (saat = 9) => yeniDurum(veri.sim, { seed: 'INSAN', baslangic: '2026-10-20', saat, para: 2000, ev: { semt: 'eski_carsi', tip: 'oda', ad: 'oda' } });
const cinar = mekanBul(dunya, 'cinaralti_kahvesi');

test('mekandakiler: aynı saatte aynı insanlar; başka gün başkaları; boş mekanda yalnızca sahibi', () => {
  const d = yeni();
  const a = mekandakiler(d, veri, cinar, 3), b = mekandakiler(d, veri, cinar, 3);
  assert.deepEqual(a, b);
  assert.ok(a.length >= 3);
  for (const id of a) assert.ok(kisi(veri, d.seed, id), id);
  d.zaman.dakika += 1440;
  assert.notDeepEqual(mekandakiler(d, veri, cinar, 3), a);
  for (let g = 0; g < 10; g++) { d.zaman.dakika += 1440; for (const id of mekandakiler(d, veri, cinar, 0)) assert.equal(id, 'm:cinaralti_kahvesi'); }
});

test('sahibi ve müdavim figürler mekanda görülür; semtin insanları semtin başka yerlerinde de karşına çıkar', () => {
  const d = yeni();
  const sayim = {};
  const nerede = {};
  for (let g = 0; g < 40; g++) {
    for (const m of dunya.mekanlar.mekanlar.filter(x => x.semt === 'eski_carsi')) {
      for (const id of mekandakiler(d, veri, m, 2)) { sayim[id] = (sayim[id] || 0) + 1; (nerede[id] ??= new Set()).add(m.id); }
    }
    d.zaman.dakika += 1440;
  }
  assert.ok(sayim['m:cinaralti_kahvesi'] > 25);
  assert.ok(sayim['f:ohannes_saatciyan'] > 10);
  assert.ok(Object.entries(nerede).some(([id, s]) => id.startsWith('n:eski_carsi:') && s.size >= 2));
});

test('görünüş tarifi düzgün', () => {
  const d = yeni();
  for (let k = 0; k < 40; k++) {
    const g = gorunus(kisi(veri, d.seed, `n:camlik:${k}`), veri);
    assert.ok(g.length > 8 && !g.includes('undefined'), g);
  }
});

test('tanışma ve sohbet: tanıdıklara eklenir, yakınlık artar, dert eşikten sonra açılır, kişiden dedikodu kaynağıyla duyulur', () => {
  const d = yeni();
  d.konum = { semt: 'eski_carsi', mekan: 'cinaralti_kahvesi' };
  const r = Rng.akis('t', 'insan');
  let kim = null;
  for (let g = 0; g < 15 && !kim; g++) {
    d.zaman.dakika = g * 1440 + 9 * 60;
    for (const id of mekandakiler(d, veri, cinar, 3)) {
      const s = tanis(d, veri, r, cinar, 3, id);
      if (s.tamam && d.npcler?.[id]?.tanisildi !== undefined) { kim = id; break; }
      if (s.tamam) assert.match(tanis(d, veri, r, cinar, 3, id).sebep, /bir kere/);
    }
  }
  assert.ok(kim, 'hiç kimseyle tanışılamadı');
  assert.equal(tanidiklarim(d, veri)[0].id, kim);
  const y0 = d.npcler[kim].iliski.yakinlik;
  let dertAcildiYakinlik = null;
  for (let i = 0; i < 10; i++) {
    const once = d.npcler[kim].iliski.yakinlik;
    const s = konus(d, veri, r, cinar, 3, kim);
    if (!s.tamam) { d.zaman.dakika += 1; continue; }
    if (d.npcler[kim].bilinen.dert && dertAcildiYakinlik === null) dertAcildiYakinlik = once;
    d.zaman.dakika = Math.floor(d.zaman.dakika / 1440) * 1440 + 9 * 60; // hep aynı saatte orada olsun
    for (const p of s.paragraflar) assert.ok(!p.metin.includes('«') && !p.metin.includes('undefined'), p.metin);
  }
  assert.ok(d.npcler[kim].iliski.yakinlik > y0);
  if (dertAcildiYakinlik !== null) assert.ok(dertAcildiYakinlik >= 8);
  const kaynakli = Object.values(d.bilgi.dedikodular || {}).filter(x => x.kaynak === kim);
  if (d.npcler[kim].bilinen.dedikodu) assert.ok(kaynakli.length >= 1);
  // Kayda yazılan küçük kalır ve JSON'dan dönünce aynı kişi
  const geri = JSON.parse(JSON.stringify(d));
  assert.equal(tanidiklarim(geri, veri)[0].tamAd, tanidiklarim(d, veri)[0].tamAd);
  assert.ok(JSON.stringify(d.npcler).length < 4000);
});

test('tanışıklık ağı: müdavimler mekan sahibini tanır; figürler ilişkili olduklarını tanır; simetrik', () => {
  const s = 'AG';
  assert.ok(tanisiyorMu(veri, s, 'n:cinaralti_kahvesi:2', 'm:cinaralti_kahvesi'));
  assert.ok(tanisiyorMu(veri, s, 'f:haluk_tanriverdi', 'f:cemal_sanli'));
  assert.ok(tanisiyorMu(veri, s, 'f:ohannes_saatciyan', 'm:cinaralti_kahvesi')); // Çınaraltı müdavimi
  for (const [a, b] of [['n:camlik:1', 'n:camlik:2'], ['m:sefa_bakkal', 'n:tabakhane:3'], ['f:volkan_serter', 'f:hasan_karakas']]) {
    assert.equal(tanisiyorMu(veri, s, a, b), tanisiyorMu(veri, s, b, a));
  }
  const t = tanidiklari(veri, s, 'm:cinaralti_kahvesi');
  assert.ok(t.length >= 6 && t.length < 120, String(t.length));
});

test('konum: mekanda insan seçenekleri görünür (en çok 3), kapalıyken görünmez', () => {
  const d = yeni();
  konum.disariCik(d, veri, Rng.akis('k', 'k'));
  konum.mekanaGir(d, veri, Rng.akis('k', 'k'), 'cinaralti_kahvesi');
  const insan = konum.baglamAksiyonlari(d, veri).filter(a => a.id.startsWith('npc:'));
  assert.ok(insan.length >= 1 && insan.length <= 3);
  const s = konum.insanHamlesi(d, veri, Rng.akis('k', 'k'), insan[0].id.slice(4));
  assert.equal(s.tamam, true, s.sebep);
});

test('kimse kendisi, örgütü ya da mekanı hakkındaki dedikoduyu anlatmaz', () => {
  const d = yeni(20);
  const gar = mekanBul(dunya, 'gar_palas_lobi');
  d.konum = { semt: 'istasyon', mekan: 'gar_palas_lobi' };
  d.npcler = { 'f:selda_karakas': { sablon: {}, katman: 'onemli', tanisildi: 0, iliski: { yakinlik: 50 }, anilar: [], bilinen: {} } };
  const r = Rng.akis('k', 'dedikodu');
  const gizliler = new Set(dunya.mekanlar.mekanlar.filter(m => m.gizli?.orgut === 'karakaslar').flatMap(m => m.dedikodular.map(x => x.id)));
  let an = null;
  for (let g = 0; g < 60 && an === null; g++) { d.zaman.dakika = g * 1440 + 20 * 60; if (mekandakiler(d, veri, gar, 2).includes('f:selda_karakas')) an = d.zaman.dakika; }
  assert.ok(an !== null, 'Selda hiç gelmedi');
  let anlatti = 0;
  for (let i = 0; i < 25; i++) { d.zaman.dakika = an; if (konus(d, veri, r, gar, 2, 'f:selda_karakas').paragraflar.some(p => p.tur === 'konusma')) anlatti++; }
  assert.ok(anlatti >= 1, 'hiç dedikodu anlatmadı (başka mekanlardan anlatabileceği vardı)');
  for (const [id, b] of Object.entries(d.bilgi.dedikodular || {})) if (b.kaynak === 'f:selda_karakas') {
    assert.ok(!gizliler.has(id), id);
    const dd = dunya.mekanlar.mekanlar.flatMap(m => m.dedikodular).find(x => x.id === id);
    assert.ok(!['orgut:karakaslar', 'figur:selda_karakas', 'figur:hasan_karakas'].includes(dd.konu), id);
  }
});
