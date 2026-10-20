import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum, rngAl, geriAlinabilir } from '../js/core/durum.js';
import { aksiyonUygula } from '../js/core/aksiyon.js';
import { raporOlustur } from '../js/core/rapor.js';
import { zarfla } from '../js/core/kayitbicim.js';
import { kodaCevir, iceAktarilaniCoz } from '../js/core/aktarim.js';

const sim = JSON.parse(readFileSync(new URL('../data/simulasyon.json', import.meta.url)));
const aks = JSON.parse(readFileSync(new URL('../data/aksiyonlar.json', import.meta.url))).aksiyonlar;
const A = id => aks.find(a => a.id === id);
const yeni = () => yeniDurum(sim, { seed: 'RAPR-0001', baslangic: '2026-10-20', saat: 8, para: 2000 });

test('geri alma: iş hata verirse durum aynı nesnede eski haline döner', () => {
  const d = yeni();
  aksiyonUygula(d, A('cay'), sim, rngAl(d, 'aksiyon'));
  const once = structuredClone(d);
  const referans = d;
  assert.throws(() => geriAlinabilir(d, () => {
    d.para -= 500;
    d.durumlar.enerji = 3;
    d.bayraklar.kalici.yarim = true;
    d.yeniAlan = { x: 1 };
    throw new Error('yarıda patladı');
  }), e => e.geriAlindi === true && /yarıda/.test(e.message));
  assert.equal(d, referans, 'aynı nesne');
  assert.deepEqual(d, once, 'tüm değişiklikler geri alındı (yeni alan dahil)');
  assert.equal(geriAlinabilir(d, () => { d.para += 1; return 'tamam'; }), 'tamam');
  assert.equal(d.para, once.para + 1, 'başarılı iş kalıcı');
});

test('rapor: sürüm, seed, cihaz, hatalar (yığınla), son hamleler, durum özeti, kayıt kodu', async () => {
  const d = yeni();
  for (const id of ['cay', 'yuruyus', 'dus']) aksiyonUygula(d, A(id), sim, rngAl(d, 'aksiyon'));
  d.aksiyonGecmisi.push({ z: d.zaman.dakika, id: 'olay:apartman_tesisati', a: { sahne: 'giris', secim: 'Ver, uzatma' } });
  d.aktifOlay = { id: 'kapida_kedi', sahne: 'giris', baglam: {} };
  d.zamanlayicilar.push({ zaman: d.zaman.dakika + 1440, olay: 'yonetici_kapida' });
  d.yaylar = { apartman_borcu: { asama: 'borclu', gecmis: ['borclu'] } };
  let e; try { null.x(); } catch (x) { e = x; }
  const kod = await kodaCevir(zarfla(d));
  const r = raporOlustur({
    oyunSurumu: '9.9.9', kayitSurumu: 1,
    cihaz: { tarayici: 'iPhone Safari', ekran: '390x844 @3x', anaEkrandan: true },
    durum: d,
    hatalar: [{ zaman: '2026-10-20T09:00:00Z', tur: 'hata', kaynak: 'aksiyon:dus', ciddi: true, mesaj: e.message, yigin: e.stack, oyunZamani: d.zaman.dakika }],
    kayitHatalari: [{ zaman: 'x', mesaj: 'Ana kayıt yazılamadı', hata: 'disk dolu' }],
    kod,
  });
  for (const beklenen of [
    '=== YENİDEN HATA RAPORU ===', 'Oyun sürümü: 9.9.9', 'Seed: RAPR-0001',
    'tarayici: iPhone Safari', 'anaEkrandan: true',
    'CİDDİ hata @aksiyon:dus', 'rapor.test.js', // yığın satırı
    'Ana kayıt yazılamadı: disk dolu',
    'Etkin olay: kapida_kedi / giris', 'yonetici_kapida@', 'apartman_borcu=borclu',
    '  cay', '  yuruyus', 'olay:apartman_tesisati {"sahne":"giris","secim":"Ver, uzatma"}',
    '--- Kayıt kodu', 'YND1.', '=== RAPOR SONU ===',
  ]) assert.ok(r.includes(beklenen), 'raporda yok: ' + beklenen);
  // Rapordaki kayıt kodu, durumu birebir geri verir (sorunu yeniden oluşturmak için)
  const kodSatiri = r.split('\n').find(s => s.startsWith('YND1.'));
  assert.deepEqual((await iceAktarilaniCoz(kodSatiri)).durum, d);
});

test('rapor: oyun hiç açılamadıysa da üretilir', () => {
  const r = raporOlustur({ oyunSurumu: '1', cihaz: { tarayici: 'x' }, durum: null, hatalar: [{ zaman: 't', mesaj: 'veri yüklenemedi', yigin: '' }] });
  assert.match(r, /Seed: \(oyun yok\)/);
  assert.match(r, /veri yüklenemedi/);
  assert.doesNotMatch(r, /Durum özeti/);
});
