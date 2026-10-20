import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum, rngAl } from '../js/core/durum.js';
import { zamanGecir, uykuPlani, ruhHedefi } from '../js/core/simulasyon.js';
import { aksiyonDurumu, aksiyonUygula } from '../js/core/aksiyon.js';

const sim = JSON.parse(readFileSync(new URL('../data/simulasyon.json', import.meta.url)));
const aksiyonlar = JSON.parse(readFileSync(new URL('../data/aksiyonlar.json', import.meta.url))).aksiyonlar;
const A = id => aksiyonlar.find(a => a.id === id);
const yeni = (saat = 8) => yeniDurum(sim, { seed: 'TEST-0001', baslangic: '2026-10-20', saat, para: 2000 });

test('yeni durum başlangıç değerleri ve JSON uyumu', () => {
  const d = yeni();
  assert.equal(d.zaman.dakika, 480);
  assert.equal(d.durumlar.enerji, sim.durumlar.enerji.baslangic);
  assert.deepEqual(JSON.parse(JSON.stringify(d)), d);
});

test('uyanıkken saatler geçince enerji düşer, açlık artar', () => {
  const d = yeni();
  const e = d.durumlar.enerji, a = d.durumlar.aclik;
  zamanGecir(d, 180, 'normal', sim);
  assert.equal(d.zaman.dakika, 480 + 180);
  assert.ok(d.durumlar.enerji < e);
  assert.ok(d.durumlar.aclik > a);
  for (const v of Object.values(d.durumlar)) assert.ok(v >= 0 && v <= 100);
});

test('değerler 0-100 dışına çıkmaz (uzun süre aç kalmak)', () => {
  const d = yeni();
  zamanGecir(d, 1440 * 3, 'agir', sim);
  for (const v of Object.values(d.durumlar)) assert.ok(v >= 0 && v <= 100, String(v));
  assert.equal(d.durumlar.aclik, 100);
  assert.ok(d.durumlar.saglik < sim.durumlar.saglik.baslangic, 'açlık sağlığı düşürmeli');
});

test('ruh hali açlık ve stresle düşer', () => {
  const iyi = { ...yeni().durumlar, aclik: 20, stres: 20 };
  const kotu = { ...iyi, aclik: 95, stres: 90 };
  assert.ok(ruhHedefi(kotu, sim) < ruhHedefi(iyi, sim) - 20);
});

test('eşik uyarısı geçişte bir kez çıkar', () => {
  const d = yeni();
  d.durumlar.aclik = 68;
  const u1 = zamanGecir(d, 60, 'normal', sim);
  assert.ok(u1.some(u => u.id === 'acikti'));
  const u2 = zamanGecir(d, 60, 'normal', sim);
  assert.ok(!u2.some(u => u.id === 'acikti'));
});

test('uyku planı: gece sabaha kadar, gündüz kısa', () => {
  assert.deepEqual(uykuPlani(23 * 60, sim), { sure: 8 * 60, gece: true });
  assert.deepEqual(uykuPlani(3 * 60, sim), { sure: 6 * 60, gece: true }); // en az 6 saat
  assert.deepEqual(uykuPlani(14 * 60, sim), { sure: 120, gece: false });
  assert.deepEqual(uykuPlani(19 * 60, sim), { sure: 600, gece: true }); // erken yatış en çok 10 saat
});

test('gece uyumak enerjiyi doldurur, düzenli uyku düzeni artırır', () => {
  const d = yeni(23);
  d.durumlar.enerji = 20; d.durumlar.stres = 30;
  const duzen = d.durumlar.uyku;
  const r = rngAl(d, 'aksiyon');
  const s = aksiyonUygula(d, A('uyu'), sim, r);
  assert.equal(d.zaman.dakika, 1440 + 7 * 60);
  assert.ok(d.durumlar.enerji > 90);
  assert.ok(d.durumlar.uyku > duzen);
  assert.ok(s.paragraflar.some(p => p.tur === 'sistem' && p.metin.includes('8 saat')));
});

test('stresli uyku daha az dinlendirir', () => {
  const sakin = yeni(23), stresli = yeni(23);
  sakin.durumlar.enerji = stresli.durumlar.enerji = 10;
  sakin.durumlar.stres = 30; stresli.durumlar.stres = 90;
  aksiyonUygula(sakin, A('uyu'), sim, rngAl(sakin, 'x'));
  aksiyonUygula(stresli, A('uyu'), sim, rngAl(stresli, 'x'));
  assert.ok(stresli.durumlar.enerji < sakin.durumlar.enerji);
});

test('aksiyon: para ve zaman harcanır, etki uygulanır, geçmişe yazılır', () => {
  const d = yeni(12);
  d.durumlar.aclik = 80;
  const s = aksiyonUygula(d, A('yemek_hazirla'), sim, rngAl(d, 'aksiyon'));
  assert.equal(d.para, 2000 - A('yemek_hazirla').para);
  assert.equal(d.zaman.dakika, 12 * 60 + 45);
  assert.ok(d.durumlar.aclik < 50);
  assert.equal(d.aksiyonGecmisi.at(-1).id, 'yemek_hazirla');
  assert.equal(s.paragraflar[0].tur, 'secim');
  assert.ok(s.paragraflar.some(p => p.tur === 'anlati' && p.metin.length > 10));
  // Yemekten sonra "acıktın" uyarısı çıkmamalı
  assert.ok(!s.paragraflar.some(p => p.tur === 'icses'));
});

test('aksiyon kısıtları: para, enerji, dilim, uykusuzluk', () => {
  const d = yeni(8);
  d.para = 10;
  assert.equal(aksiyonDurumu(d, A('yemek_hazirla'), sim).tamam, false);
  d.para = 2000; d.durumlar.enerji = 3;
  assert.equal(aksiyonDurumu(d, A('yuruyus'), sim).tamam, false);
  const gece = yeni(23);
  assert.equal(aksiyonDurumu(gece, A('yuruyus'), sim).tamam, false);
  const dinc = yeni(14); dinc.durumlar.enerji = 95;
  assert.equal(aksiyonDurumu(dinc, A('uyu'), sim).tamam, false);
});

test('aynı seed ve aynı aksiyonlar => aynı sonuç (determinizm)', () => {
  const oyna = () => {
    const d = yeni();
    const sira = ['cay', 'pencere', 'yuruyus', 'dus', 'telefon_kaydir', 'yemek_hazirla', 'pencere', 'dinlen'];
    const metinler = sira.map(id => aksiyonUygula(d, A(id), sim, rngAl(d, 'aksiyon')).paragraflar.map(p => p.metin).join('|'));
    return { d, metinler };
  };
  const a = oyna(), b = oyna();
  assert.deepEqual(a.metinler, b.metinler);
  assert.deepEqual(a.d.durumlar, b.d.durumlar);
});

test('veri dosyası tutarlılığı: her aksiyonun metni ve geçerli türü var', () => {
  for (const a of aksiyonlar) {
    assert.ok(a.id && a.ad, 'id/ad eksik');
    if (a.ozel === 'uyku') { for (const k of ['gece', 'gunduz', 'stresli', 'uyanis']) assert.ok(a.metin[k]?.length, a.id + '.' + k); continue; }
    assert.ok(Array.isArray(a.metin) && a.metin.length >= 2, a.id + ' en az 2 metin çeşidi');
    assert.ok(a.sure > 0, a.id + ' süre');
    if (a.tur) assert.ok(sim.saatlik[a.tur], a.id + ' tür');
    for (const k of Object.keys(a.etki || {})) assert.ok(sim.durumlar[k], a.id + ' bilinmeyen durum ' + k);
  }
  for (const u of sim.uyarilar) assert.ok(sim.durumlar[u.durum] && u.metin.length, u.id);
});
