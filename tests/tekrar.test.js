// Tekrara karşı (3.15): havuzlar yeterince geniş, aynı kişiden aynı söz kısa sürede tekrar duyulmaz
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import { kisi, mekandakiler } from '../js/core/insanlar.js';
import { tanis, sohbetHamlesi, flortEngeli } from '../js/core/sohbet.js';
import { partnerli } from '../js/core/sadakat.js';
import { mekanBul } from '../js/core/mekan.js';
import { dilim } from '../js/core/zaman.js';
import { Rng } from '../js/core/rng.js';

const oku = y => JSON.parse(readFileSync(new URL('../' + y, import.meta.url)));
const dunya = {};
for (const f of ['sehir', 'semtler', 'ulasim', 'kurumlar', 'sirketler', 'figurler', 'orgutler', 'mekanlar']) dunya[f] = oku(`data/dunya/${f}.json`);
const npc = {};
for (const f of ['isimler', 'memleket', 'kisilik', 'hayat', 'sohbet', 'gorunus', 'flort', 'dedikodu', 'derinlik', 'zevk']) npc[f] = oku(`data/npc/${f}.json`);
npc.hayatOlaylari = oku('data/npc/hayat_olaylari.json');
const veri = { sim: oku('data/simulasyon.json'), takvim: oku('data/takvim.json'), dunya, npc, olaylar: {} };
const F = npc.flort, S = npc.sohbet;

test('havuzlar: flört, selam, şaka ve vedalar her kuşak için yeterince çeşitli', () => {
  const en = (dizi, n, ad) => assert.ok(dizi.length >= n, `${ad}: ${dizi.length} < ${n}`);
  en(F.iltifat.oyuncu, 12, 'iltifat.oyuncu');
  en(F.takil.oyuncu, 10, 'takil.oyuncu');
  for (const s of ['iyi', 'orta', 'kotu']) for (const ku of ['genc', 'orta', 'yasli']) en(F.iltifat[s][ku], s === 'iyi' ? 5 : 2, `iltifat.${s}.${ku}`);
  for (const ku of ['genc', 'orta', 'yasli']) {
    en(F.numara.evet[ku], 3, 'numara.evet.' + ku); en(F.davet.evet[ku], 3, 'davet.evet.' + ku); en(F.npcBaslatir[ku], 3, 'npcBaslatir.' + ku);
    en(S.selam.yeni[ku], 6, 'selam.yeni.' + ku); en(S.selam.yakin[ku], 6, 'selam.yakin.' + ku);
    en(S.bitir.veda[ku], 6, 'bitir.veda.' + ku); en(S.bitir.o[ku], 6, 'bitir.o.' + ku);
    en(S.saka.guldu[ku], 7, 'saka.guldu.' + ku);
  }
  en(S.saka.yap, 20, 'saka.yap'); en(S.bitir.sen, 6, 'bitir.sen'); en(S.selam.soguk._, 6, 'selam.soguk');
  // Aynı havuzda iki kez aynı cümle olmasın
  const gez = (o, yol) => { if (Array.isArray(o)) { const t = o.filter(x => typeof x === 'string'); assert.equal(new Set(t).size, t.length, yol); } else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) gez(v, yol + '.' + k); };
  gez(F, 'flort'); gez({ selam: S.selam, saka: S.saka, bitir: S.bitir }, 'sohbet');
});

function oturum(seed) {
  const d = yeniDurum(veri.sim, { seed, baslangic: '2026-10-20', saat: 21, para: 20000, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' }, karakter: { ad: 'Deniz', dogum: '1996-03-01', cinsiyet: 'e', fizik: { cekicilik: 8, karizma: 7 } } });
  const m = mekanBul(dunya, 'kizil_bar');
  d.konum = { semt: m.semt, mekan: m.id };
  const r = Rng.akis(seed, 'y');
  for (let g = 0; g < 30; g++) {
    d.zaman.dakika = g * 1440 + 21 * 60;
    const kal = m.kalabalik[dilim(d.zaman.dakika).id];
    for (const id of mekandakiler(d, veri, m, kal)) {
      const n = kisi(veri, seed, id);
      if (!(n.yas >= 20 && n.yas <= 40 && n.cinsiyet !== 'e' && !flortEngeli(d, veri, n) && !partnerli(n))) continue;
      d.bilgi.retler = {};
      tanis(d, veri, r, m, kal, id);
      if (d.sohbet?.npc === id) { d.sohbet.bekleyen = null; d.sohbet.kalan = 999; return { d, k: d.npcler[id], r }; }
    }
  }
  return null;
}

test('aynı kişiye üst üste iltifat: senin cümlelerin havuz bitmeden tekrar etmez, bitince en eskisinden döner', () => {
  const t = oturum('TEKRAR1');
  assert.ok(t);
  t.k.iliski.cekim = 60; t.k.iliski.yakinlik = 30;
  const benim = [], saat = t.d.zaman.dakika;
  for (let i = 0; i < 2 * F.iltifat.oyuncu.length; i++) {
    t.k.iltifatGun = {}; t.d.sohbet.bekleyen = null; t.d.sohbet.kalan = 999; t.d.sohbet.kullanilan = {}; t.d.zaman.dakika = saat;
    const s = sohbetHamlesi(t.d, veri, t.r, 'iltifat');
    assert.ok(s.tamam, i + ': ' + s.sebep);
    benim.push(s.paragraflar.find(p => p.konusan === 'Sen').metin);
  }
  const n = F.iltifat.oyuncu.length;
  for (let i = 0; i + n <= benim.length; i++) assert.equal(new Set(benim.slice(i, i + n)).size, n, 'pencere ' + i);
});

test('aynı kişinin tepkileri: 6 iltifatta aynı tepki iki kez gelmez', () => {
  const t = oturum('TEKRAR2');
  assert.ok(t);
  t.k.iliski.cekim = 80; t.k.iliski.yakinlik = 40;
  const onun = [], saat = t.d.zaman.dakika;
  for (let i = 0; i < 6; i++) {
    t.k.iltifatGun = {}; t.d.sohbet.bekleyen = null; t.d.sohbet.kalan = 999; t.d.sohbet.kullanilan = {}; t.d.zaman.dakika = saat;
    const s = sohbetHamlesi(t.d, veri, t.r, 'iltifat');
    onun.push(...s.paragraflar.filter(p => p.tur === 'anlati').map(p => p.metin));
  }
  assert.equal(new Set(onun).size, onun.length, onun.join('\n'));
});

test('ev hareketleri (3.18): saate uymayan cümle yok (gece güneşlenen kedi), son cümleler kısa sürede tekrar gelmiyor', async () => {
  const { aksiyonUygula } = await import('../js/core/aksiyon.js');
  const aks = oku('data/aksiyonlar.json').aksiyonlar;
  const pencere = aks.find(a => a.id === 'pencere'), dinlen = aks.find(a => a.id === 'dinlen');
  const d = yeniDurum(veri.sim, { seed: 'AKS', baslangic: '2026-10-20', saat: 23, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' }, karakter: { ad: 'Deniz', dogum: '1996-03-01', cinsiyet: 'e' } });
  const r = Rng.akis('AKS', 'x');
  const gunduz = pencere.metin.filter(x => x.dilim && !x.dilim.includes('gece')).map(x => x.metin);
  for (let i = 0; i < 20; i++) {
    d.zaman.dakika = i * 1440 + 23 * 60 + 10;
    const m = aksiyonUygula(d, pencere, veri.sim, r, veri).paragraflar.find(p => p.tur === 'anlati').metin;
    assert.ok(!gunduz.includes(m), m);
  }
  const l = [];
  for (let i = 0; i < 14; i++) { l.push(aksiyonUygula(d, dinlen, veri.sim, r, veri).paragraflar.find(p => p.tur === 'anlati').metin); }
  const pencereBoy = Math.floor(dinlen.metin.length * 0.6);
  for (let i = 0; i + pencereBoy <= l.length; i++) assert.equal(new Set(l.slice(i, i + pencereBoy)).size, pencereBoy, l.join('\n'));
});
