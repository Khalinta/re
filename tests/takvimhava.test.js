import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { okulDurumu, universiteDurumu } from '../js/core/takvim.js';
import { gununHavasi, anlikHava, havaOzeti, havaMetni } from '../js/core/hava.js';
import { ozelGun } from '../js/core/zaman.js';
import { yolBul } from '../js/core/ulasim.js';

const oku = y => JSON.parse(readFileSync(new URL(y, import.meta.url)));
const takvim = oku('../data/takvim.json');
const iklim = oku('../data/dunya/sehir.json').cografya.iklim;
const ayar = oku('../data/hava.json');
const ulasim = oku('../data/dunya/ulasim.json');
const gun = iso => new Date(iso + 'T00:00:00Z');
const gunler = (bas, n) => Array.from({ length: n }, (_, i) => new Date(Date.parse(bas + 'T00:00:00Z') + i * 864e5).toISOString().slice(0, 10));

test('bayramlar: Ramazan 3, Kurban 4 gün resmi tatil; arifeler ve Ramazan dönemi', () => {
  const adlar = iso => ozelGun(takvim, gun(iso)).map(o => o.ad);
  assert.deepEqual(adlar('2027-03-09'), ['Ramazan Bayramı']);
  assert.ok(adlar('2027-03-08').includes('Ramazan Bayramı Arifesi') && adlar('2027-03-08').includes('Ramazan'));
  assert.ok(adlar('2027-05-19').includes('Kurban Bayramı'));
  assert.ok(!adlar('2027-05-20').includes('Kurban Bayramı'));
  for (const d of takvim.degisken) {
    assert.equal(new Set(d.tarihler).size, d.tarihler.length, d.ad);
    assert.deepEqual([...d.tarihler].sort(), d.tarihler, d.ad);
  }
  const yil = y => takvim.degisken.find(d => d.ad === 'Kurban Bayramı').tarihler.filter(t => t.startsWith(String(y))).length;
  for (let y = 2027; y <= 2036; y++) assert.equal(yil(y), 4, String(y));
});

test('okul takvimi: ders, hafta sonu, ara tatil, yarıyıl, yaz; resmi tatilde okul yok', () => {
  assert.equal(okulDurumu(takvim, '2026-10-20'), 'ders');
  assert.equal(okulDurumu(takvim, '2026-10-24'), 'hafta_sonu');
  assert.equal(okulDurumu(takvim, '2026-10-29'), 'tatil');
  assert.equal(okulDurumu(takvim, '2026-11-10'), 'ara_tatil');
  assert.equal(okulDurumu(takvim, '2027-01-27'), 'yariyil');
  assert.equal(okulDurumu(takvim, '2027-07-15'), 'yaz');
  assert.equal(okulDurumu(takvim, '2027-09-01'), 'yaz');
  assert.equal(universiteDurumu(takvim, '2026-11-02'), 'donem');
  assert.equal(universiteDurumu(takvim, '2027-08-10'), 'tatil');
  // Bir eğitim yılında 170–190 ders günü olmalı
  const ders = gunler('2026-08-15', 365).filter(d => okulDurumu(takvim, d) === 'ders').length;
  assert.ok(ders >= 160 && ders <= 190, String(ders));
});

test('hava: aynı seed ve gün hep aynı; iklime uygun yağış ve sıcaklık', () => {
  assert.deepEqual(gununHavasi('x', iklim, ayar, '2026-12-03'), gununHavasi('x', iklim, ayar, '2026-12-03'));
  assert.notDeepEqual(gunler('2026-12-01', 30).map(d => gununHavasi('x', iklim, ayar, d).durum), gunler('2026-12-01', 30).map(d => gununHavasi('y', iklim, ayar, d).durum));
  let yagisli = 0, ocak = [], agustos = [];
  for (const seed of ['a', 'b', 'c', 'd', 'e']) {
    for (const d of gunler('2027-01-01', 365)) {
      const g = gununHavasi(seed, iklim, ayar, d);
      if (g.yagis) yagisli++;
      if (d.startsWith('2027-01')) ocak.push((g.min + g.max) / 2);
      if (d.startsWith('2027-08')) agustos.push((g.min + g.max) / 2);
      assert.ok(g.min <= g.max);
      assert.equal(g.durum === 'kar', g.durum === 'kar' && (g.min + g.max) / 2 <= ayar.karEsigi + 1);
    }
  }
  const beklenen = iklim.aylik.reduce((a, m) => a + m.yagisliGun, 0);
  assert.ok(Math.abs(yagisli / 5 - beklenen) < beklenen * 0.15, `${yagisli / 5} / ${beklenen}`);
  const ort = l => l.reduce((a, b) => a + b, 0) / l.length;
  assert.ok(Math.abs(ort(ocak) - iklim.aylik[0].ortSicaklik) < 2.5, String(ort(ocak)));
  assert.ok(Math.abs(ort(agustos) - iklim.aylik[7].ortSicaklik) < 2.5, String(ort(agustos)));
});

test('anlık hava: öğleden sonra sıcak, sabaha karşı serin; yağış saatleri; özet ve metin', () => {
  const g = { iso: '2027-01-10', durum: 'yagmurlu', min: 4, max: 10, ruzgar: { yon: 'poyraz', siddet: 3 }, yagis: { bas: 600, bit: 900 }, sis: false };
  assert.equal(anlikHava(g, 15 * 60).derece, 10);
  assert.equal(anlikHava(g, 5 * 60).derece, 4);
  assert.equal(anlikHava(g, 11 * 60).yagiyor, true);
  assert.equal(anlikHava(g, 16 * 60).durum, 'bulutlu');
  assert.equal(havaOzeti(ayar, anlikHava(g, 11 * 60)), '9°, yağmurlu, fırtına');
  assert.equal(havaMetni(ayar, anlikHava(g, 11 * 60), 11 * 60).length, 2);
});

test('fırtınada vapur çalışmaz', () => {
  const normal = yolBul(ulasim, 'asagi_liman', 'marina', { t: 14 * 60 });
  assert.ok(normal.adimlar.some(a => a.hat === 'v1'));
  const firtina = yolBul(ulasim, 'asagi_liman', 'marina', { t: 14 * 60, firtina: true });
  assert.ok(!firtina.adimlar.some(a => a.hat === 'v1'));
});

test('koşul dili: okul ve üniversite durumu', async () => {
  const { kosulAcikla } = await import('../js/core/kosul.js');
  const ctx = iso => ({ durum: { zaman: { baslangic: iso, dakika: 600 } }, veri: { takvim } });
  assert.equal(kosulAcikla({ okul: 'ders' }, ctx('2026-10-20')).tamam, true);
  assert.equal(kosulAcikla({ okul: ['yaz', 'yariyil'] }, ctx('2027-07-20')).tamam, true);
  assert.equal(kosulAcikla({ universite: 'donem' }, ctx('2027-08-01')).tamam, false);
});
