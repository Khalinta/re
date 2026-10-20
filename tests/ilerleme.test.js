import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import { dunyaIlerlet, mekanKapanisi, dunyaBaslangici } from '../js/core/ilerleme.js';
import { tasi } from '../js/core/migration.js';
import { KAYIT_SURUMU } from '../js/core/durum.js';
import { tarihAl } from '../js/core/zaman.js';

const oku = y => JSON.parse(readFileSync(new URL(y, import.meta.url)));
const sim = oku('../data/simulasyon.json');
const veri = { sim, takvim: oku('../data/takvim.json'), ilerleme: oku('../data/dunya/ilerleme.json'),
  dunya: { sehir: oku('../data/dunya/sehir.json'), mekanlar: oku('../data/dunya/mekanlar.json') } };

function yasat(seed, gun, adim = 1) {
  const d = yeniDurum(sim, { seed, baslangic: '2026-10-20' });
  const haberler = [];
  for (let g = 0; g < gun; g += adim) { d.zaman.dakika += adim * 1440; haberler.push(...dunyaIlerlet(d, veri)); }
  return { d, haberler };
}

test('bir yıl: fiyatlar her ay artar, ücretler yalnızca ocak ve temmuzda ve enflasyonun gerisinde', () => {
  const { d, haberler } = yasat('yil', 400);
  const w = d.dunya;
  assert.ok(w.fiyatEndeksi > 1.25 && w.fiyatEndeksi < 1.55, String(w.fiyatEndeksi));
  assert.ok(w.ucretEndeksi < w.fiyatEndeksi && w.ucretEndeksi > w.fiyatEndeksi * 0.8, `${w.ucretEndeksi} / ${w.fiyatEndeksi}`);
  const zamlar = haberler.filter(h => h.zam);
  assert.ok(zamlar.length >= 2 && zamlar.every(h => ['01', '07'].includes(h.iso.slice(5, 7)) && h.iso.endsWith('-01')), zamlar.map(h => h.iso).join());
  assert.equal(haberler.filter(h => h.enflasyon).length, 13);
});

test('Demirspor sezonda her pazar oynar, puan durumu tutarlı', () => {
  const { d, haberler } = yasat('mac', 200);
  const maclar = haberler.filter(h => h.tur === 'spor');
  assert.ok(maclar.length > 15);
  for (const m of maclar) {
    assert.equal(new Date(m.iso + 'T00:00:00Z').getUTCDay(), 0, m.iso);
    const ay = Number(m.iso.slice(5, 7));
    assert.ok(ay >= 8 || ay <= 5, m.iso);
    assert.ok(!m.metin.includes('«'), m.metin);
  }
  const ds = d.dunya.demirspor;
  assert.equal(ds.puan, ds.g * 3 + ds.b);
});

test('gündem: haberler tekrar süresine uyuyor, koşullu haberler doğru günde, şablonlar çözülüyor', () => {
  const { haberler } = yasat('gundem', 380);
  const g = haberler.filter(h => h.id);
  assert.ok(g.length > 60, String(g.length));
  const son = {};
  for (const h of g) {
    const tekrar = veri.ilerleme.gundem.find(x => x.id === h.id).tekrar;
    if (son[h.id] !== undefined) assert.ok(h.gun - son[h.id] >= tekrar, h.id);
    son[h.id] = h.gun;
    assert.ok(!h.metin.includes('«') && !h.metin.includes('{'), h.metin);
  }
  for (const h of g.filter(x => x.id === 'cumhuriyet_kutlama')) assert.ok(h.iso.endsWith('-10-29'));
  for (const h of g.filter(x => x.id === 'yaz_sicak')) assert.ok(['06', '07', '08'].includes(h.iso.slice(5, 7)), h.iso);
});

test('mekanlar arada bir kapanır ve süresi bitince açılır; yalnızca sıradan sahipli olanlar', () => {
  const { d } = yasat('kapanma', 300);
  const tohumlu = new Set(veri.dunya.mekanlar.mekanlar.filter(m => m.sahip.tohum).map(m => m.id));
  for (const id of Object.keys(d.dunya.mekanKapali)) assert.ok(tohumlu.has(id), id);
  const d2 = yeniDurum(sim, { seed: 'k', baslangic: '2026-10-20' });
  d2.dunya.mekanKapali.kizil_bar = { bitisGun: 2, sebep: 'tadilat' };
  d2.zaman.dakika = 1 * 1440 + 600;
  assert.equal(mekanKapanisi(d2, 'kizil_bar'), 'tadilat');
  d2.zaman.dakika = 3 * 1440 + 600;
  assert.equal(mekanKapanisi(d2, 'kizil_bar'), null);
});

test('dünya belirlenimli: aynı seed aynı dünya; gün gün ilerlemek ile toptan atlamak aynı sonucu verir', () => {
  const a = yasat('ayni', 90, 1).d.dunya;
  const b = yasat('ayni', 90, 1).d.dunya;
  const c = yasat('ayni', 90, 30).d.dunya;
  assert.deepEqual(a, b);
  assert.deepEqual(a, c);
  assert.notDeepEqual(a, yasat('baska', 90).d.dunya);
});

test('kayıt sürümü 1 → 2: dünya kayıt anından başlar', () => {
  const eski = oku('./ornekler/kayit-v1.json');
  const v1 = JSON.parse(eski.veri);
  const v2 = tasi(v1, undefined, 2);
  assert.equal(v2.kayitSurumu, 2);
  assert.deepEqual(v2.dunya, dunyaBaslangici(v1.zaman));
  assert.equal(v2.dunya.sonAy, tarihAl(v1.zaman.baslangic, v1.zaman.dakika).toISOString().slice(0, 7));
});

test('kayıt sürümü 1 → güncel: konum ve ev eklenir, oyuncu evde', () => {
  const v1 = JSON.parse(oku('./ornekler/kayit-v1.json').veri);
  const son = tasi(v1);
  assert.equal(son.kayitSurumu, KAYIT_SURUMU);
  assert.deepEqual(son.konum, { semt: son.ev.semt, mekan: 'ev' });
  assert.deepEqual(son.bilgi, { dedikodular: {}, gidilen: {} });
  assert.ok(son.dunya);
});
