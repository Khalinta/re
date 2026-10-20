import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum, rngAl } from '../js/core/durum.js';
import { aksiyonUygula } from '../js/core/aksiyon.js';
import { zarfla } from '../js/core/kayitbicim.js';
import { kodaCevir, koddanZarf, iceAktarilaniCoz, dosyaIcerigi, dosyaAdi } from '../js/core/aktarim.js';

const sim = JSON.parse(readFileSync(new URL('../data/simulasyon.json', import.meta.url)));
const aks = JSON.parse(readFileSync(new URL('../data/aksiyonlar.json', import.meta.url))).aksiyonlar;
function oynanmis(n = 40) {
  const d = yeniDurum(sim, { seed: 'AKTR-0001', baslangic: '2026-10-20', saat: 8, para: 2000 });
  const sira = ['cay', 'pencere', 'yuruyus', 'dus', 'telefon_kaydir', 'yemek_hazirla', 'dinlen', 'ev_topla'];
  for (let i = 0; i < n; i++) aksiyonUygula(d, aks.find(a => a.id === sira[i % sira.length]), sim, rngAl(d, 'aksiyon'));
  return d;
}

test('kod gidiş-dönüş: aynı durum geri gelir', async () => {
  const d = oynanmis();
  const z = zarfla(d);
  const kod = await kodaCevir(z);
  assert.match(kod, /^YND1\.[A-Za-z0-9_-]+$/);
  const { durum } = await iceAktarilaniCoz(kod);
  assert.deepEqual(durum, d);
});

test('sıkıştırma işe yarıyor (kod, ham JSON\'dan belirgin kısa)', async () => {
  const z = zarfla(oynanmis(120));
  const kod = await kodaCevir(z);
  const ham = JSON.stringify(z).length;
  assert.ok(kod.length < ham * 0.6, `kod ${kod.length}, ham ${ham}`);
});

test('sıkıştırmasız (YND0) biçim de açılır', async () => {
  const d = oynanmis(5);
  const kod = await kodaCevir(zarfla(d), { sikistir: false });
  assert.match(kod, /^YND0\./);
  assert.deepEqual((await iceAktarilaniCoz(kod)).durum, d);
});

test('araya giren boşluk ve satır sonları sorun olmaz', async () => {
  const d = oynanmis(5);
  const kod = await kodaCevir(zarfla(d));
  const bolunmus = '  ' + kod.match(/.{1,40}/g).join('\n ') + '\n';
  assert.deepEqual((await iceAktarilaniCoz(bolunmus)).durum, d);
});

test('eksik kopyalanan kod açıkça reddedilir', async () => {
  const kod = await kodaCevir(zarfla(oynanmis(10)));
  for (const kesik of [kod.slice(0, kod.length - 10), kod.slice(0, 40), kod.slice(0, kod.length / 2)]) {
    await assert.rejects(iceAktarilaniCoz(kesik), e => e.name === 'KayitHatasi');
  }
});

test('tek karakteri değişmiş kod reddedilir (sağlama)', async () => {
  const kod = await kodaCevir(zarfla(oynanmis(10)), { sikistir: false });
  const i = Math.floor(kod.length * 0.7);
  const degismis = kod.slice(0, i) + (kod[i] === 'A' ? 'B' : 'A') + kod.slice(i + 1);
  await assert.rejects(iceAktarilaniCoz(degismis), e => e.name === 'KayitHatasi');
});

test('yanlış girdiler anlaşılır hata verir', async () => {
  await assert.rejects(iceAktarilaniCoz(''), e => e.tur === 'bos');
  await assert.rejects(iceAktarilaniCoz('merhaba'), e => e.tur === 'kod');
  await assert.rejects(iceAktarilaniCoz('YND1.#$%'), e => e.tur === 'kod');
  await assert.rejects(iceAktarilaniCoz('{"bicim":"baska"}'), e => e.name === 'KayitHatasi');
  await assert.rejects(koddanZarf('XYZ.abc'), e => e.tur === 'kod');
});

test('dosya içeriği: hem sarmallı dosya hem çıplak zarf içe aktarılır', async () => {
  const d = oynanmis(5);
  const z = zarfla(d);
  assert.deepEqual((await iceAktarilaniCoz(dosyaIcerigi(z))).durum, d);
  assert.deepEqual((await iceAktarilaniCoz(JSON.stringify(z))).durum, d);
});

test('eski sürüm örnek kaydı kodla taşınıp açılır', async () => {
  const z = JSON.parse(readFileSync(new URL('./ornekler/kayit-v1.json', import.meta.url)));
  const { durum } = await iceAktarilaniCoz(await kodaCevir(z));
  assert.equal(durum.seed, 'ORNK-V001');
});

test('dosya adı', () => {
  const z = zarfla(oynanmis(1));
  assert.equal(dosyaAdi(z, 2, new Date(Date.UTC(2026, 9, 20, 11, 5))), 'yeniden-deniz-yuva2-2026-10-20-1405.json');
});
