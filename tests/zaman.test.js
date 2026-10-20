import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tarihAl, dilim, sonrakiAn, mevsim, yas, ozelGun, gunNo, bugunTurkiye, gunDakikasi } from '../js/core/zaman.js';
import { tarih, saat } from '../js/core/format.js';

const takvim = JSON.parse(readFileSync(new URL('../data/takvim.json', import.meta.url)));

test('dakikadan takvim tarihine', () => {
  assert.equal(tarih(tarihAl('2026-10-20', 8 * 60)), '20 Ekim 2026, Salı');
  assert.equal(tarih(tarihAl('2026-10-20', 1440 * 12)), '1 Kasım 2026, Pazar');
  assert.equal(tarih(tarihAl('2026-12-31', 1440)), '1 Ocak 2027, Cuma');
  assert.equal(tarih(tarihAl('2028-02-28', 1440)), '29 Şubat 2028, Salı'); // artık yıl
  assert.equal(saat(gunDakikasi(1440 * 3 + 425)), '07:05');
  assert.equal(gunNo(1439), 0);
  assert.equal(gunNo(1440), 1);
});

test('dilimler', () => {
  const s = (h, m = 0) => dilim(h * 60 + m).id;
  assert.equal(s(5, 59), 'gece');
  assert.equal(s(6), 'sabah');
  assert.equal(s(11, 59), 'sabah');
  assert.equal(s(12), 'ogle');
  assert.equal(s(17), 'aksam');
  assert.equal(s(22), 'gece');
  assert.equal(dilim(1440 * 5 + 13 * 60).id, 'ogle');
});

test('sonraki an', () => {
  assert.equal(sonrakiAn(23 * 60, 7), 1440 + 7 * 60);
  assert.equal(sonrakiAn(3 * 60, 7), 7 * 60);
  assert.equal(sonrakiAn(7 * 60, 7), 1440 + 7 * 60);
});

test('mevsim, yaş, Türkiye bugünü', () => {
  assert.equal(mevsim(tarihAl('2026-10-20', 0)), 'sonbahar');
  assert.equal(mevsim(tarihAl('2026-12-01', 0)), 'kis');
  assert.equal(mevsim(tarihAl('2027-02-28', 0)), 'kis');
  assert.equal(mevsim(tarihAl('2027-03-01', 0)), 'ilkbahar');
  assert.equal(mevsim(tarihAl('2027-07-15', 0)), 'yaz');
  assert.equal(yas('1996-03-14', tarihAl('2026-03-13', 0)), 29);
  assert.equal(yas('1996-03-14', tarihAl('2026-03-14', 0)), 30);
  // UTC 22:30 = Türkiye'de ertesi gün 01:30
  assert.equal(bugunTurkiye(Date.UTC(2026, 9, 20, 22, 30)), '2026-10-21');
});

test('özel günler', () => {
  assert.deepEqual(ozelGun(takvim, tarihAl('2026-10-29', 0)).map(o => o.ad), ['Cumhuriyet Bayramı']);
  assert.deepEqual(ozelGun(takvim, tarihAl('2026-10-28', 0)), []);
  assert.equal(ozelGun({ degisken: [{ ad: 'Deneme', tarihler: ['2026-11-05'] }] }, tarihAl('2026-11-05', 0))[0].ad, 'Deneme');
});
