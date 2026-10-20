import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum, rngAl } from '../js/core/durum.js';
import { metinCoz, sablonUygula, tonSec, metinDogrula } from '../js/core/metin.js';
import { kosulDogrula } from '../js/core/kosul.js';
import { etkileriUygula } from '../js/core/etki.js';
import { kosulTutar } from '../js/core/kosul.js';
import { olayBaslat, olaySecenegiSec, vadesiGelenZamanlayici } from '../js/core/olay.js';
import { Rng } from '../js/core/rng.js';

const sim = JSON.parse(readFileSync(new URL('../data/simulasyon.json', import.meta.url)));
const yeni = (saat = 8) => yeniDurum(sim, { seed: 'METN-0001', baslangic: '2026-10-20', saat, para: 2000, karakter: { ad: 'Ayşe', dogum: '1990-05-01' } });
const ctx = (d, baglam) => ({ durum: d, veri: { sim }, baglam });

test('şablon: değişkenler ve Türkçe ekler', () => {
  const d = yeni();
  const c = ctx(d, { degisken: { mekan: { ad: 'Çınaraltı Kahvesi', iyelik: true }, semt: 'Kadıköy', kisi: 'Ahmet', sayi: 3 } });
  const u = [];
  assert.equal(sablonUygula('{karakter.ad|in} çantası', c, null, u), "Ayşe'nin çantası");
  assert.equal(sablonUygula('{kisi|e} söyle, {semt|de|ki} evde {sayi|i} al', c, null, u), "Ahmet'e söyle, Kadıköy'deki evde 3'ü al");
  assert.equal(sablonUygula('{mekan|e} gittin', c, null, u), "Çınaraltı Kahvesi'ne gittin");
  assert.equal(sablonUygula('Saat {saat}, {gun}. Cebinde {para}.', c, null, u), 'Saat 08:00, Salı. Cebinde 2.000 ₺.');
  assert.equal(sablonUygula('{dilim|bas} oldu. {yas} yaşındasın.', c, null, u), 'Sabah oldu. 36 yaşındasın.');
  assert.equal(sablonUygula('{karakter.ad|buyuk}', c, null, u), 'AYŞE');
  assert.deepEqual(u, []);
  assert.equal(sablonUygula('{yok.boyle}', c, null, u), '«yok.boyle»');
  assert.deepEqual(u, ['bilinmeyen değişken: yok.boyle']);
  assert.equal(sablonUygula('düz metin', c), 'düz metin');
});

test('şablon: [[a|b]] küçük çeşitleme', () => {
  const r = Rng.akis('cesit');
  const gorulen = new Set();
  for (let i = 0; i < 60; i++) gorulen.add(sablonUygula('Hava [[soğuk|ayaz|keskin]].', ctx(yeni()), r));
  assert.deepEqual([...gorulen].sort(), ['Hava ayaz.', 'Hava keskin.', 'Hava soğuk.']);
});

test('ton: ruh haline göre çeşit, öncelik ve varsayılan', () => {
  const d = yeni();
  const m = { ton: { iyi: 'İYİ', kotu: 'KÖTÜ', gergin: 'GERGİN', varsayilan: 'NORMAL' } };
  const r = Rng.akis('ton');
  const metin = () => metinCoz(m, r, ctx(d))[0].metin;
  d.durumlar.ruh = 50; d.durumlar.stres = 40;
  assert.equal(metin(), 'NORMAL');
  d.durumlar.ruh = 80; assert.equal(metin(), 'İYİ');
  d.durumlar.ruh = 20; assert.equal(metin(), 'KÖTÜ');
  d.durumlar.stres = 90; assert.equal(metin(), 'GERGİN', 'gergin, kötüden önce gelir');
  d.durumlar.stres = 40; d.durumlar.ruh = 50; d.durumlar.enerji = 10;
  assert.equal(metin(), 'NORMAL', 'yorgun tonu yazılmamışsa varsayılan');
  assert.equal(tonSec(d.durumlar), 'yorgun');
  assert.equal(metinCoz(m, r)[0].metin, 'NORMAL', 'bağlamsız çağrıda varsayılan');
});

test('koşullu metin ve konuşan adında şablon', () => {
  const sabah = yeni(7), aksam = yeni(19);
  const m = { kosullu: [{ kosul: { saat: { max: '08:30' } }, metin: 'Sabahın köründe.' }], varsayilan: [[{ tur: 'konusma', konusan: '{kisi}', metin: '{karakter.ad|e} selam.' }]] };
  const r = Rng.akis('k');
  assert.equal(metinCoz(m, r, ctx(sabah))[0].metin, 'Sabahın köründe.');
  const p = metinCoz(m, r, ctx(aksam, { degisken: { kisi: 'Hüsnü Usta' } }))[0];
  assert.deepEqual(p, { tur: 'konusma', konusan: 'Hüsnü Usta', metin: "Ayşe'ye selam." });
});

test('metin doğrulayıcı', () => {
  assert.deepEqual(metinDogrula(['a {karakter.ad|in}', { ton: { iyi: 'x', varsayilan: 'y' } }], 'm', { kosulDogrula }), []);
  const h = metinDogrula([{ ton: { mutlu: 'x' } }, 'kırık {karakter.ad', '{bilinmez}', { kosullu: [{ kosul: { durumm: 1 }, metin: 'a' }] }, []], 'm', { kosulDogrula });
  for (const b of ['bilinmeyen ton "mutlu"', 'varsayilan gerekli', 'süslü parantezler eşleşmiyor', 'bilinmeyen değişken kökü "bilinmez"', 'bilinmeyen koşul "durumm"', 'boş çeşit listesi']) {
    assert.ok(h.some(x => x.includes(b)), b + '\n' + h.join('\n'));
  }
});

test('yay: aşama ve sonuç etkileri, koşulları', () => {
  const d = yeni();
  const c = ctx(d);
  assert.equal(kosulTutar({ yay: { id: 'x', durum: 'yok' } }, c), true);
  etkileriUygula([{ yay: { id: 'x', asama: 'bir' } }], c);
  assert.equal(kosulTutar({ yay: { id: 'x' } }, c), true, 'sürüyor');
  assert.equal(kosulTutar({ yay: { id: 'x', asama: 'bir' } }, c), true);
  etkileriUygula([{ yay: { id: 'x', asama: 'iki' } }], c);
  assert.equal(kosulTutar({ yay: { id: 'x', asama: ['iki', 'uc'] } }, c), true);
  assert.deepEqual(d.yaylar.x.gecmis, ['bir', 'iki']);
  etkileriUygula([{ yayBitir: { id: 'x', sonuc: 'iyi' } }], c);
  assert.equal(kosulTutar({ yay: { id: 'x', durum: 'bitti', sonuc: 'iyi' } }, c), true);
  assert.equal(kosulTutar({ yay: { id: 'x', asama: 'iki' } }, c), false, 'biten yayın aşaması yok sayılır');
});

const ZVERI = {
  sim,
  olaylar: {
    kaynak: { id: 'kaynak', sahneler: { giris: { metin: 'k', etki: [{ zamanla: { sure: { gun: 2 }, olay: 'sonra', kosul: { bayrak: 'borclu' } } }, { zamanla: { sure: { gun: 1 }, olay: 'gunduz' } }], son: true } } },
    sonra: { id: 'sonra', tetik: 'zamanlayici', sahneler: { giris: { metin: 'sonra oldu', son: true } } },
    gunduz: { id: 'gunduz', tetik: 'zamanlayici', kosul: { zamanDilimi: ['ogle'] }, sahneler: { giris: { metin: 'öğlen oldu', son: true } } },
  },
};

test('zamanlayıcı: vakti gelmeden çalışmaz; olay koşulu tutana kadar bekler; zamanlayıcı koşulu tutmazsa iptal', () => {
  const d = yeni(8);
  const r = rngAl(d, 'olay');
  etkileriUygula([{ bayrak: 'borclu' }], ctx(d));
  olayBaslat(d, 'kaynak', ZVERI, r);
  assert.equal(d.zamanlayicilar.length, 2);
  assert.equal(vadesiGelenZamanlayici(d, ZVERI).zamanlayici, null, 'henüz vakti gelmedi');
  d.zaman.dakika += 1440; // ertesi gün 08:00: 'gunduz' vakti geldi ama öğle değil
  assert.equal(vadesiGelenZamanlayici(d, ZVERI).zamanlayici, null, 'olay koşulu (öğle) tutmuyor, bekler');
  assert.equal(d.zamanlayicilar.length, 2);
  d.zaman.dakika += 5 * 60; // 13:00
  assert.equal(vadesiGelenZamanlayici(d, ZVERI).zamanlayici.olay, 'gunduz');
  assert.equal(d.zamanlayicilar.length, 1);
  d.bayraklar.kalici = {}; // borç kapandı
  d.zaman.dakika += 1440;
  const s = vadesiGelenZamanlayici(d, ZVERI);
  assert.equal(s.zamanlayici, null);
  assert.equal(s.iptaller[0].olay, 'sonra', 'koşulu kalmayan zamanlayıcı iptal');
  assert.equal(d.zamanlayicilar.length, 0);
});

test('örnek yay uçtan uca: tesisat → kapıda → toplantı', () => {
  const ev = JSON.parse(readFileSync(new URL('../data/olaylar/ev.json', import.meta.url))).olaylar;
  const v = { sim, olaylar: Object.fromEntries(ev.map(o => [o.id, o])) };
  const d = yeni(10);
  const r = rngAl(d, 'olay');
  olayBaslat(d, 'apartman_tesisati', v, r);
  olaySecenegiSec(d, v, r, 2); // param yok
  assert.equal(d.yaylar.apartman_borcu.asama, 'borclu');
  d.zaman.dakika += 1440 * 6;
  const z1 = vadesiGelenZamanlayici(d, v).zamanlayici;
  assert.equal(z1.olay, 'yonetici_kapida');
  olayBaslat(d, z1.olay, v, r);
  olaySecenegiSec(d, v, r, 2); // kapıyı açma
  assert.equal(d.yaylar.apartman_borcu.asama, 'kaciyor');
  d.zaman.dakika += 1440 * 5 + 5 * 60; // öğleden sonra
  const z2 = vadesiGelenZamanlayici(d, v).zamanlayici;
  assert.equal(z2.olay, 'apartman_toplantisi');
  olayBaslat(d, z2.olay, v, r);
  olaySecenegiSec(d, v, r, 2); // fatura nerede
  assert.equal(d.yaylar.apartman_borcu.bitti.sonuc, 'kavga');
  assert.equal(d.aktifOlay, null);
});
