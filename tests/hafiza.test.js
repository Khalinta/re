// Hafıza ve olgu kilidi (3.8)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import { kisi, tanisiyorMu, tanidiklari } from '../js/core/insanlar.js';
import { kisiKarti, kartMetni, bagTuru } from '../js/core/kart.js';
import { olguDenetle, olguEkle, ozetEkle, hafizaMetni, sirriBiliyorMu, SINIR } from '../js/core/hafiza.js';
import { kisiDedikodusu } from '../js/core/sohbet.js';
import { mekanBul } from '../js/core/mekan.js';
import { Rng } from '../js/core/rng.js';

const oku = y => JSON.parse(readFileSync(new URL('../' + y, import.meta.url)));
const dunya = {};
for (const f of ['sehir', 'semtler', 'ulasim', 'kurumlar', 'sirketler', 'figurler', 'orgutler', 'mekanlar']) dunya[f] = oku(`data/dunya/${f}.json`);
const npc = {};
for (const f of ['isimler', 'memleket', 'kisilik', 'hayat', 'sohbet', 'gorunus', 'flort', 'dedikodu', 'derinlik']) npc[f] = oku(`data/npc/${f}.json`);
npc.hayatOlaylari = oku('data/npc/hayat_olaylari.json');
const veri = { sim: oku('data/simulasyon.json'), dunya, npc };
const SEED = 'HAFIZA';
const yeni = () => yeniDurum(veri.sim, { seed: SEED, baslangic: '2026-10-20', saat: 19, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' } });
const ids = Array.from({ length: 200 }, (_, i) => `n:${['camlik', 'eski_carsi', 'bezhane', 'kayalitepe'][i % 4]}:${i % 40}`);

test('olgu denetimi: kartla çelişen reddedilir, uyan kabul edilir', () => {
  const d = yeni();
  let red = 0, kabul = 0;
  for (const id of ids) {
    const k = kisiKarti(d, veri, id);
    const dogru = [
      { alan: 'medeni', deger: { bekar: 'bekâr', sevgilili: 'sevgilisi var', evli: 'evli', bosanmis: 'boşanmış', dul: 'dul' }[k.medeni] },
      { alan: 'yas', deger: k.yas },
      { alan: 'cocuk', deger: k.aile.cocuklar.length },
      { alan: 'kardes', deger: k.aile.kardesler.length },
      { alan: 'memleket', deger: k.yore === 'yerli' ? 'Karaliman' : k.memleket },
      { alan: 'meslek', deger: k.durum === 'issiz' ? 'işsiz' : k.meslek },
      ...(k.aile.anne ? [{ alan: 'anne', deger: k.aile.anne.ad }] : []),
      { alan: 'yeni', metin: 'Bir kedisi var, adı Pamuk.' },
    ];
    for (const o of dogru) { assert.ok(olguDenetle(k, o).tamam, `${id} ${o.alan}=${o.deger}: ${olguDenetle(k, o).sebep}`); kabul++; }
    const yanlis = [
      { alan: 'yas', deger: k.yas + 7 },
      { alan: 'cocuk', deger: k.aile.cocuklar.length + 2 },
      { alan: 'medeni', deger: k.medeni === 'evli' ? 'bekâr' : 'evli' },
      { alan: 'meslek', deger: k.durum === 'issiz' ? 'öğretmen' : 'işsiz' },
      ...(k.aile.anne ? [{ alan: 'anne', deger: 'Zümrüt' + (k.aile.anne.ad === 'Zümrüt' ? 'x' : '') }] : []),
      { alan: 'bilmem', deger: 'x' },
    ];
    for (const o of yanlis) { assert.equal(olguDenetle(k, o).tamam, false, `${id} ${o.alan}=${o.deger} kabul edildi`); red++; }
  }
  assert.ok(red > 1000 && kabul > 1500);
});

test('olgu kilidi: ilk söylenen kalır, kişi kartına girer, aynı olgu iki kez yazılmaz, hafıza sınırlı', () => {
  const d = yeni();
  const id = ids[3];
  const k = kisiKarti(d, veri, id);
  assert.ok(olguEkle(d, veri, id, { alan: 'yeni', metin: 'Bir kedisi var, adı Pamuk.' }, 'sohbet').tamam);
  assert.ok(olguEkle(d, veri, id, { alan: 'yeni', metin: 'bir kedisi var adı pamuk' }, 'sohbet').zaten);
  assert.ok(olguEkle(d, veri, id, { alan: 'semt', deger: 'Çamlık', metin: 'Çamlık\'ta oturuyor.' }, 'sohbet').tamam);
  assert.ok(olguEkle(d, veri, id, { alan: 'semt', deger: 'Bezhane', metin: 'Bezhane\'de oturuyor.' }, 'sohbet').zaten);
  assert.equal(olguEkle(d, veri, id, { alan: 'yas', deger: k.yas + 10 }, 'sohbet').tamam, false);
  const m = kartMetni(kisiKarti(d, veri, id));
  assert.ok(m.includes('Pamuk') && m.includes("Çamlık'ta oturuyor") && !m.includes('Bezhane\'de oturuyor'));
  for (let i = 0; i < 100; i++) { olguEkle(d, veri, id, { alan: 'yeni', metin: `Olgu ${i}` }, 'x'); ozetEkle(d, id, `Özet ${i}`); }
  assert.equal(d.npcler[id].hafiza.olgular.length, SINIR.olgu);
  assert.equal(d.npcler[id].hafiza.ozetler.length, SINIR.ozet);
  const h = hafizaMetni(d, veri, id);
  assert.ok(h.includes('Özet 99') && !h.includes('Özet 0 '));
});

test('sırlar: kim biliyor belirlenimli; tanımayan bilmez; kanka ve gizli ilişki bilir; dedikoduda sırrı yalnızca bilen anlatır', () => {
  let bilen = 0, bilmeyen = 0;
  for (const id of ids.slice(0, 60)) {
    for (const t of tanidiklari(veri, SEED, id).slice(0, 15)) {
      const tur = bagTuru(veri, SEED, id, t.id, t.nasil);
      const b = sirriBiliyorMu(veri, SEED, id, t.id);
      assert.equal(b, sirriBiliyorMu(veri, SEED, id, t.id));
      if (tur === 'kanka' || tur === 'gizli_iliski') assert.ok(b, `${id} ${tur}`);
      if (b) bilen++; else bilmeyen++;
    }
    const yabanci = ids.find(x => x !== id && !tanisiyorMu(veri, SEED, id, x));
    if (yabanci) assert.equal(sirriBiliyorMu(veri, SEED, id, yabanci), false);
  }
  assert.ok(bilen > 0 && bilmeyen > bilen, `${bilen} bilen, ${bilmeyen} bilmeyen`);
  const d = yeni();
  const m = mekanBul(dunya, 'cinaralti_kahvesi');
  let sir = 0;
  for (let i = 0; i < 400; i++) {
    const n = kisi(veri, SEED, `n:eski_carsi:${i % 40}`);
    const x = kisiDedikodusu(d, veri, n, m, Rng.akis('S' + i, 'x'));
    if (!x) continue;
    d.bilgi.dedikodular[x.id] = {};
    if (x.id.endsWith(':sir')) { sir++; assert.ok(sirriBiliyorMu(veri, SEED, n.id, x.kisi), x.id); }
  }
  assert.ok(sir > 0);
});
