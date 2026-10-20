import test from 'node:test';
import assert from 'node:assert/strict';
import { para, paraKisa, sayi, tarih, saat, sure, yuzde, onceMetni } from '../js/core/format.js';

const B = s => s.replace(/ /g, '\u00a0'); // beklenen metinde boşluklar bölünmez boşluk

test('para', () => {
  assert.equal(para(1250.5), B('1.250,50 ₺'));
  assert.equal(para(1250), B('1.250 ₺'));
  assert.equal(para(1250, { kurus: true }), B('1.250,00 ₺'));
  assert.equal(para(0.5), B('0,50 ₺'));
  assert.equal(para(-28000), B('-28.000 ₺'));
  assert.equal(para(1234567.891), B('1.234.567,89 ₺'));
  assert.equal(para(999), B('999 ₺'));
});

test('kısa para', () => {
  assert.equal(paraKisa(85000), B('85.000 ₺'));
  assert.equal(paraKisa(125000), B('125 bin ₺'));
  assert.equal(paraKisa(3250000), B('3,3 milyon ₺'));
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

test('göreli süre', () => {
  const t = 1_000_000_000_000;
  assert.equal(onceMetni(t - 20e3, t), 'az önce');
  assert.equal(onceMetni(t - 5 * 60e3, t), '5 dk önce');
  assert.equal(onceMetni(t - 3 * 3600e3, t), '3 saat önce');
  assert.equal(onceMetni(t - 30 * 3600e3, t), 'dün');
  assert.equal(onceMetni(t - 4 * 86400e3, t), '4 gün önce');
});
