import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yuvarla, fiyat, urunFiyati, hizmetFiyati, kira, maasAraligi, asgariUcret, ekonomiDogrula } from '../js/core/ekonomi.js';

const oku = y => JSON.parse(readFileSync(new URL(y, import.meta.url)));
const eko = oku('../data/ekonomi.json');
const semtler = oku('../data/dunya/semtler.json');
const mekanlar = oku('../data/dunya/mekanlar.json');
const sirketler = oku('../data/dunya/sirketler.json');
const semt = id => semtler.semtler.find(s => s.id === id);
const bugun = { dunya: { fiyatEndeksi: 1, ucretEndeksi: 1 } };

test('ekonomi dosyası tutarlı (her iş türünün maaşı, her ücretli hizmetin ürünü var)', () => {
  assert.deepEqual(ekonomiDogrula(eko, { isTurleri: sirketler.isTurleri, hizmetler: mekanlar.hizmetler, ulasim: oku('../data/dunya/ulasim.json') }), []);
});

test('esnaf yuvarlaması', () => {
  assert.deepEqual([14.4, 99.6, 101, 997, 1024, 28370].map(yuvarla), [14, 100, 100, 995, 1000, 28350]);
});

test('örnek fiyatlar: çay kahvehanede 15 ₺; pahalı mekanda katlanıyor', () => {
  assert.equal(urunFiyati(eko, bugun, 'cay', 1), 15);
  assert.ok(urunFiyati(eko, bugun, 'cay', 5) > urunFiyati(eko, bugun, 'cay', 3) * 2);
  const cinar = mekanlar.mekanlar.find(m => m.id === 'cinaralti_kahvesi');
  assert.equal(hizmetFiyati(eko, bugun, cinar, 'cay_kahve'), 15);
  assert.equal(hizmetFiyati(eko, bugun, cinar, 'oyun'), 0);
});

test('fiyatlar endeksle, maaşlar ücret endeksiyle büyür; zam arasında alım gücü düşer', () => {
  const sonra = { dunya: { fiyatEndeksi: 1.12, ucretEndeksi: 1 } };
  assert.ok(urunFiyati(eko, sonra, 'yemek', 2) > urunFiyati(eko, bugun, 'yemek', 2));
  assert.equal(asgariUcret(eko, sonra), asgariUcret(eko, bugun));
  assert.equal(asgariUcret(eko, { dunya: { fiyatEndeksi: 1.12, ucretEndeksi: 1.1 } }), 30800);
});

test('geçim: asgari ücretli, ucuz semtte oda tutarsa ayın sonunu az farkla getirir; Marina\'da 1+1 imkânsız', () => {
  const au = asgariUcret(eko, bugun);
  const temel = ['mutfak', 'telefon', 'abonman'].reduce((t, k) => t + fiyat(eko, bugun, eko.yasam[k].oran), 0);
  const oda = kira(eko, bugun, semt('tabakhane'), 'oda');
  const kalan = au - oda.kira - oda.fatura - temel;
  assert.ok(kalan > 0 && kalan < au * 0.2, String(kalan));
  const marina = kira(eko, bugun, semt('marina'), '1+1');
  assert.ok(marina.kira > au * 2.5);
  // Kira semt karakteriyle aynı sırada
  const k = id => kira(eko, bugun, semt(id), '1+1').kira;
  assert.ok(k('yamacevler') > k('marina') && k('marina') > k('sahilyolu') && k('sahilyolu') > k('cumhuriyet') && k('cumhuriyet') > k('tabakhane'));
});

test('maaşlar asgari ücretin altına inmez; şirket katsayısı uygulanır', () => {
  const au = asgariUcret(eko, bugun);
  for (const t of Object.keys(eko.maaslar)) assert.ok(maasAraligi(eko, bugun, t)[0] >= au, t);
  const yesil = sirketler.sirketler.find(s => s.id === 'yesil_temizlik'); // 0,85
  assert.equal(maasAraligi(eko, bugun, 'temizlik', yesil)[0], au);
  const kanatli = sirketler.sirketler.find(s => s.id === 'kanatli_otomotiv'); // 1,15
  assert.ok(maasAraligi(eko, bugun, 'usta', kanatli)[1] > maasAraligi(eko, bugun, 'usta')[1]);
});
