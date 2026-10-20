import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dunyaDogrula } from '../js/core/dunya.js';
import { yolBul, yolSecenekleri, beklenenBekleme, trafikKatsayisi, topluUcret, taksiUcret, saatDakika } from '../js/core/ulasim.js';

const oku = f => JSON.parse(readFileSync(new URL('../data/dunya/' + f, import.meta.url)));
const dunya = { sehir: oku('sehir.json'), semtler: oku('semtler.json'), ulasim: oku('ulasim.json') };
const u = dunya.ulasim;
const semtIdler = dunya.sehir.semtler.map(s => s.id);
const hat = id => u.hatlar.find(h => h.id === id);
const S = s => saatDakika(s);

test('ulaşım verisi tutarlı (her komşuluğun yol süresi var, hatlar geçerli, her semte hat uğruyor)', () => {
  assert.deepEqual(dunyaDogrula(dunya), []);
});

test('ulaşım denetimi gerçekten hata yakalıyor', () => {
  const b = structuredClone(u);
  b.yollar.pop();
  b.yollar.push({ a: 'marina', b: 'yamacevler', yuruyus: 5, araba: 9 });
  b.hatlar.push({ id: 'x1', ad: 'X', tur: 'teleferik', duraklar: ['marina', 'yok'], sureler: [], ilkSefer: '25:00', sonSefer: '01:00', sefer: { sabah: 5 } });
  b.hatlar = b.hatlar.filter(h => h.id !== 'o55');
  const h = dunyaDogrula({ ...dunya, ulasim: b });
  for (const beklenen of ['yol süresi yok', 'komşu değiller', 'yürüyüş arabadan uzun', 'bilinmeyen tür "teleferik"', 'bilinmeyen durak "yok"', 'sureler durak sayısından', 'ilkSefer/sonSefer', 'sefer.gece', 'ilicakoy: hiçbir hat uğramıyor']) {
    assert.ok(h.some(x => x.includes(beklenen)), beklenen + '\n' + h.join('\n'));
  }
});

test('bekleme: çalışırken sefer aralığının yarısı, kapalıyken sonsuz, açılışa az kaldıysa açılışa kadar', () => {
  const m1 = hat('m1');
  assert.equal(beklenenBekleme(m1, S('08:00')), 2.5);
  assert.equal(beklenenBekleme(m1, S('08:00'), true), 2.5 * 1.3);
  assert.equal(beklenenBekleme(m1, S('00:20')), 6); // son sefer 24:30: gece yarısından sonra hâlâ çalışıyor
  assert.equal(beklenenBekleme(m1, S('01:00')), Infinity);
  assert.equal(beklenenBekleme(m1, S('05:40')), 20); // 06:00'da açılıyor
  assert.equal(beklenenBekleme(hat('v1'), S('23:30')), Infinity);
});

test('trafik saate göre değişiyor, gece yarısını geçen aralık doğru', () => {
  assert.equal(trafikKatsayisi(u, S('08:00')), 1.6);
  assert.equal(trafikKatsayisi(u, S('18:00')), 1.7);
  assert.equal(trafikKatsayisi(u, S('15:00')), 1);
  assert.equal(trafikKatsayisi(u, S('03:00')), 0.8);
  assert.equal(trafikKatsayisi(u, S('23:30') + 1440 * 5), 0.8); // oyun dakikası da olur
});

test('yürüyüş en kısa yol; aynı yer sıfır; bilinmeyen semt null', () => {
  const y = yolBul(u, 'tabakhane', 'marina', { kip: 'yuruyus' });
  assert.equal(y.toplamDakika, 40); // Tabakhane → İstasyon (15) → Marina (25)
  assert.deepEqual(y.adimlar.map(a => [a.tur, a.nereden, a.nereye, a.uzerinden]), [['yuruyus', 'tabakhane', 'marina', ['istasyon']]]);
  assert.equal(y.ucret, 0);
  assert.equal(yolBul(u, 'camlik', 'camlik').toplamDakika, 0);
  assert.equal(yolBul(u, 'camlik', 'atlantis'), null);
});

test('gündüz her semtten her semte toplu taşımayla gidilebiliyor ve hiçbir zaman yürümekten yavaş değil', () => {
  for (const t of [S('08:00'), S('14:00'), S('18:30'), S('22:00')]) {
    for (const a of semtIdler) for (const b of semtIdler) {
      const toplu = yolBul(u, a, b, { t });
      const yur = yolBul(u, a, b, { t, kip: 'yuruyus' });
      assert.ok(toplu && toplu.toplamDakika <= yur.toplamDakika, `${a}→${b} @${t}`);
      // adımlar kesintisiz: her adım bir öncekinin bittiği yerden başlar
      let yer = a;
      for (const adim of toplu.adimlar) { assert.equal(adim.nereden, yer); yer = adim.nereye; }
      assert.equal(yer, b);
    }
  }
});

test('gece 03:30\'da hiçbir hat çalışmıyor: yalnızca yürüyüş ve taksi', () => {
  for (const a of semtIdler) for (const b of semtIdler) {
    if (a === b) continue;
    const s = yolSecenekleri(u, a, b, { t: S('03:30') });
    assert.equal(s.toplu, null, `${a}→${b}`);
    assert.ok(s.yuruyus && s.taksi);
  }
});

test('gerçekçi rotalar: Tabakhane → Marina sabah dolmuş + M2; Aşağıliman → Sahilyolu öğlen 10 numara', () => {
  const r = yolBul(u, 'tabakhane', 'marina', { t: S('08:00') });
  assert.deepEqual(r.adimlar.map(a => a.hat), ['d1', 'm2']);
  assert.ok(r.toplamDakika < 30);
  const v = yolBul(u, 'asagi_liman', 'sahilyolu', { t: S('14:00') });
  assert.deepEqual(v.adimlar.map(a => a.hat), ['o10']);
});

test('taksi trafikte yavaşlıyor ve pahalanıyor; yürüyüşten hızlı', () => {
  const sabah = yolBul(u, 'kayalitepe', 'sahilyolu', { t: S('08:00'), kip: 'taksi' });
  const gece = yolBul(u, 'kayalitepe', 'sahilyolu', { t: S('03:00'), kip: 'taksi' });
  assert.ok(sabah.adimlar[0].dakika > gece.adimlar[0].dakika);
  assert.ok(sabah.ucret > gece.ucret);
  assert.ok(gece.toplamDakika < yolBul(u, 'kayalitepe', 'sahilyolu', { kip: 'yuruyus' }).toplamDakika);
  assert.equal(taksiUcret(u, 10, 28000), Math.round((0.0018 + 0.00045 * 10) * 28000));
});

test('ücret: Kent Kart aktarma indirimi (süre içinde ve en çok iki kez), dolmuşta indirim yok', () => {
  const adim = (hatTuru, binisAni) => ({ tur: 'hat', hatTuru, binisAni });
  const a = [adim('metro', 0), adim('otobus', 20), adim('dolmus', 30), adim('vapur', 40), adim('metro', 50)];
  const toplam = topluUcret(u, a, 28000);
  assert.deepEqual(a.map(x => x.ucret), [25, 13, 36, 15, 25]); // 3. Kent Kart binişi indirimsiz (en çok 2 aktarma)
  assert.equal(toplam, 114);
  const gec = [adim('metro', 0), adim('metro', 61)];
  topluUcret(u, gec, 28000);
  assert.deepEqual(gec.map(x => x.ucret), [25, 25]);
  // asgari ücret değişince ücretler ölçekleniyor
  assert.equal(topluUcret(u, [adim('metro', 0)], 56000), 50);
});

test('hafta sonu beklemeler uzuyor; sonuç her seferinde aynı (rastgelelik yok)', () => {
  const hi = yolBul(u, 'kayalitepe', 'camlik', { t: S('10:00') });
  const hs = yolBul(u, 'kayalitepe', 'camlik', { t: S('10:00'), haftaSonu: true });
  assert.ok(hs.toplamDakika >= hi.toplamDakika);
  assert.deepEqual(yolBul(u, 'kayalitepe', 'camlik', { t: S('10:00') }), hi);
});
