import test from 'node:test';
import assert from 'node:assert/strict';
import { Rng, seedUret, seedDuzenle } from '../js/core/rng.js';

test('aynı seed + alan => aynı dizi', () => {
  const a = Rng.akis('7Q2M-K9XD', 'npc:417');
  const b = Rng.akis('7Q2M-K9XD', 'npc:417');
  for (let i = 0; i < 100; i++) assert.equal(a.ham(), b.ham());
});

test('farklı alanlar bağımsız', () => {
  const a = Rng.akis('X', 'npc:1').ham();
  const b = Rng.akis('X', 'npc:2').ham();
  assert.notEqual(a, b);
});

test('durum kaydedilip geri yüklenebilir', () => {
  const a = Rng.akis('X', 'olay');
  a.ham(); a.ham();
  const d = a.getDurum();
  const beklenen = [a.ham(), a.ham(), a.ham()];
  const b = new Rng(d);
  assert.deepEqual([b.ham(), b.ham(), b.ham()], beklenen);
});

test('aralık sınırları ve dağılım', () => {
  const r = Rng.akis('dagilim');
  const sayac = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 60000; i++) {
    const x = r.aralik(1, 6);
    assert.ok(x >= 1 && x <= 6);
    sayac[x - 1]++;
  }
  for (const s of sayac) assert.ok(s > 9400 && s < 10600, 'dengesiz zar: ' + sayac);
});

test('ağırlıklı seçim', () => {
  const r = Rng.akis('agirlik');
  const ogeler = [{ id: 'a', agirlik: 1 }, { id: 'b', agirlik: 3 }, { id: 'c', agirlik: 0 }];
  const say = { a: 0, b: 0, c: 0 };
  for (let i = 0; i < 40000; i++) say[r.agirlikliSec(ogeler).id]++;
  assert.equal(say.c, 0);
  assert.ok(say.b / say.a > 2.7 && say.b / say.a < 3.3);
  assert.equal(r.agirlikliSec([{ agirlik: 0 }]), undefined);
});

test('karıştırma tüm öğeleri korur', () => {
  const r = Rng.akis('k');
  assert.deepEqual(r.karistir([1, 2, 3, 4, 5]).sort(), [1, 2, 3, 4, 5]);
});

test('seed kodu', () => {
  const s = seedUret();
  assert.match(s, /^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
  assert.equal(seedUret('abc'), seedUret('abc'));
  assert.equal(seedDuzenle(' 7q2m-k9xd '), '7Q2M-K9XD');
});
