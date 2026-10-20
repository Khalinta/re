import test from 'node:test';
import assert from 'node:assert/strict';
import { para, paraKisa, sayi, tarih, saat, sure, yuzde } from '../js/core/format.js';

test('para', () => {
  assert.equal(para(1250.5), '1.250,50 ₺');
  assert.equal(para(1250), '1.250 ₺');
  assert.equal(para(1250, { kurus: true }), '1.250,00 ₺');
  assert.equal(para(0.5), '0,50 ₺');
  assert.equal(para(-28000), '-28.000 ₺');
  assert.equal(para(1234567.891), '1.234.567,89 ₺');
  assert.equal(para(999), '999 ₺');
});

test('kısa para', () => {
  assert.equal(paraKisa(85000), '85.000 ₺');
  assert.equal(paraKisa(125000), '125 bin ₺');
  assert.equal(paraKisa(3250000), '3,3 milyon ₺');
});

test('sayı', () => {
  assert.equal(sayi(1000000), '1.000.000');
  assert.equal(sayi(3.14159, 2), '3,14');
  assert.equal(sayi(-0.001), '0');
  assert.equal(yuzde(0.025), '%2,5');
});

test('tarih', () => {
  assert.equal(tarih(new Date(Date.UTC(2026, 9, 20))), '20 Ekim 2026, Salı');
  assert.equal(tarih(new Date(Date.UTC(2027, 0, 1))), '1 Ocak 2027, Cuma');
  assert.equal(tarih(new Date(Date.UTC(2026, 9, 29)), { gunAdi: false }), '29 Ekim 2026');
});

test('saat ve süre', () => {
  assert.equal(saat(425), '07:05');
  assert.equal(saat(0), '00:00');
  assert.equal(saat(1439), '23:59');
  assert.equal(saat(1440 + 60), '01:00');
  assert.equal(sure(135), '2 saat 15 dakika');
  assert.equal(sure(45), '45 dakika');
  assert.equal(sure(2880), '2 gün');
  assert.equal(sure(1500), '1 gün 1 saat');
});
