// Tanıdıkların kendi hayatı (3.6)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import { mekandakiler, kisi, tanidiklarim } from '../js/core/insanlar.js';
import { tanis, yaninaOtur, kisiDedikodusu } from '../js/core/sohbet.js';
import { npcHayatGunu, kisiGuncel, hayatOlayiTetikle, bilinmeyenOlaylar } from '../js/core/npchayat.js';
import { mekanBul } from '../js/core/mekan.js';
import { Rng } from '../js/core/rng.js';
import { dilim } from '../js/core/zaman.js';

const oku = y => JSON.parse(readFileSync(new URL('../' + y, import.meta.url)));
const dunya = {};
for (const f of ['sehir', 'semtler', 'ulasim', 'kurumlar', 'sirketler', 'figurler', 'orgutler', 'mekanlar']) dunya[f] = oku(`data/dunya/${f}.json`);
const npc = {};
for (const f of ['isimler', 'memleket', 'kisilik', 'hayat', 'sohbet', 'gorunus', 'flort', 'dedikodu']) npc[f] = oku(`data/npc/${f}.json`);
npc.hayatOlaylari = oku('data/npc/hayat_olaylari.json');
const veri = { sim: oku('data/simulasyon.json'), takvim: oku('data/takvim.json'), dunya, npc, gezi: oku('data/gezi.json') };
const kal = (m, dk) => m.kalabalik?.[dilim(dk).id] ?? 0;

// Bir mekandaki insanlarla (kim varsa) tanışmış bir durum
function tanidikliDurum(seed, mekanlar = ['cinaralti_kahvesi', 'kordon_mekan', 'merkez_kantin', 'kizil_bar', 'hunkar_lokantasi']) {
  const d = yeniDurum(veri.sim, { seed, baslangic: '2026-10-20', saat: 19, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' }, karakter: { ad: 'Deniz', dogum: '1998-01-01', cinsiyet: 'e' } });
  const r = Rng.akis(seed, 't');
  for (const mid of mekanlar) {
    const m = mekanBul(dunya, mid);
    d.konum = { semt: m.semt, mekan: m.id };
    for (let g = 0; g < 6; g++) for (const saat of [10, 19]) {
      d.zaman.dakika = g * 1440 + saat * 60;
      for (const id of mekandakiler(d, veri, m, kal(m, d.zaman.dakika))) { d.bilgi.retler = {}; tanis(d, veri, r, m, kal(m, d.zaman.dakika), id); delete d.sohbet; }
    }
  }
  d.zaman.dakika = 0;
  return d;
}

test('tanıdıkların hayatı akıyor: makul sıklıkta, tutarlı geçişlerle; taşınan ve vefat eden bir daha bir şey yaşamıyor', () => {
  const d = tanidikliDurum('HAYAT');
  const ids = Object.keys(d.npcler).filter(id => d.npcler[id].tanisildi !== undefined && !id.startsWith('f:'));
  assert.ok(ids.length >= 15, String(ids.length));
  const once = Object.fromEntries(ids.map(id => [id, kisiGuncel(d, veri, id)]));
  let sayi = 0;
  for (let g = 1; g <= 730; g++) {
    const yasayan = new Set(ids.filter(id => !d.npcler[id].degisim?.yok));
    for (const o of npcHayatGunu(d, veri, g)) {
      sayi++;
      assert.ok(yasayan.has(o.npc), `${o.npc}: gittikten sonra ${o.id}`);
    }
  }
  const yillik = sayi / ids.length / 2;
  assert.ok(yillik > 0.8 && yillik < 5, `kişi başına yılda ${yillik.toFixed(2)} olay`);
  for (const id of ids) {
    const k = d.npcler[id], ilk = once[id];
    const sira = (k.hayat || []).map(x => x.id);
    // evlenmeden önce sevgili; boşanmadan önce evli
    let medeni = ilk.medeni;
    for (const x of sira) {
      if (x === 'evlendi') assert.equal(medeni, 'sevgilili', `${id}: ${sira}`);
      if (x === 'bosandi') assert.equal(medeni, 'evli', `${id}: ${sira}`);
      if (x === 'ayrildi') assert.equal(medeni, 'sevgilili', `${id}: ${sira}`);
      medeni = { evlendi: 'evli', bosandi: 'bosanmis', ayrildi: 'bekar', sevgili_buldu: 'sevgilili' }[x] ?? medeni;
    }
    if (sira.includes('vefat')) assert.ok(ilk.yas >= 76);
    if (sira.includes('cocuk_oldu')) assert.ok(ilk.yas >= 22 && ilk.yas <= 42);
    const g = kisiGuncel(d, veri, id);
    assert.equal(g.medeni, medeni);
  }
});

test('belirlenimli: aynı seed, aynı hayatlar', () => {
  const a = tanidikliDurum('BEL', ['cinaralti_kahvesi']), b = tanidikliDurum('BEL', ['cinaralti_kahvesi']);
  for (let g = 1; g <= 200; g++) { npcHayatGunu(a, veri, g); npcHayatGunu(b, veri, g); }
  assert.deepEqual(a.npcler, b.npcler);
});

test('seninle flörtleşen ya da sevgilin olan biri başkasıyla evlenmiyor', () => {
  const d = tanidikliDurum('ASK');
  const ids = Object.keys(d.npcler).filter(id => !id.startsWith('f:'));
  for (const id of ids) d.npcler[id].iliskiTuru = 'sevgili';
  for (let g = 1; g <= 730; g++) npcHayatGunu(d, veri, g);
  for (const id of ids) for (const x of d.npcler[id].hayat || []) assert.ok(!['evlendi', 'sevgili_buldu', 'ayrildi', 'bosandi', 'tasindi'].includes(x.id), `${id}: ${x.id}`);
});

test('öğrenme: yanına oturunca kendisi anlatır; başkaları dedikodusunu yapar; Tanıdıklarım\'da görünür; taşınan mekanda görülmez', () => {
  const d = tanidikliDurum('OGREN', ['cinaralti_kahvesi']);
  const m = mekanBul(dunya, 'cinaralti_kahvesi');
  d.konum = { semt: m.semt, mekan: m.id };
  const r = Rng.akis('OGREN', 'x');
  // Bugün mekanda olan bir tanıdığa iş buldur: oturunca anlatsın
  let anlatti = false;
  for (let g = 0; g < 30 && !anlatti; g++) {
    d.zaman.dakika = g * 1440 + 19 * 60;
    const burada = mekandakiler(d, veri, m, kal(m, d.zaman.dakika)).filter(id => d.npcler[id]?.tanisildi !== undefined && !id.startsWith('f:'));
    const id = burada[0];
    if (!id) continue;
    d.npcler[id].degisim = { meslek: { ad: 'işsiz', durum: 'issiz' } };
    const o = hayatOlayiTetikle(d, veri, id, 'is_buldu');
    const n = kisiGuncel(d, veri, id);
    if (n.yas > 60 || n.yas < 18) continue;
    delete d.sohbet;
    const s = yaninaOtur(d, veri, r, m, kal(m, d.zaman.dakika), id);
    if (!s.tamam || !d.sohbet) continue;
    assert.ok(s.paragraflar.some(p => p.tur === 'konusma' && p.metin.toLocaleLowerCase('tr').includes(o.meslek.toLocaleLowerCase('tr'))), JSON.stringify(s.paragraflar));
    assert.equal(bilinmeyenOlaylar(d.npcler[id]).length, 0);
    const t = tanidiklarim(d, veri).find(x => x.id === id);
    assert.ok(t.haberler.some(x => x.metin.includes(o.meslek)));
    assert.ok(t.tanim.includes(o.meslek), t.tanim);
    anlatti = true;
  }
  assert.ok(anlatti);
  // Başkasının hayatındaki değişikliği dedikodu olarak duymak
  const ids = Object.keys(d.npcler).filter(id => d.npcler[id].tanisildi !== undefined && !id.startsWith('f:'));
  const hedef = ids.find(id => !bilinmeyenOlaylar(d.npcler[id]).length && kisiGuncel(d, veri, id).yas >= 20);
  hayatOlayiTetikle(d, veri, hedef, 'tasindi');
  let duydu = false;
  for (let i = 0; i < 60 && !duydu; i++) {
    const anlatan = kisi(veri, d.seed, ids[i % ids.length]);
    if (anlatan.id === hedef) continue;
    const x = kisiDedikodusu(d, veri, anlatan, m, Rng.akis('DD' + i, 'x'));
    if (x?.id.startsWith('h:' + hedef)) { duydu = true; assert.ok(x.metin.includes(kisi(veri, d.seed, hedef).hitapAdi)); }
  }
  assert.ok(duydu, 'taşınma haberi dedikoduyla gelmedi');
  for (let g = 30; g < 60; g++) { d.zaman.dakika = g * 1440 + 19 * 60; assert.ok(!mekandakiler(d, veri, m, 3).includes(hedef)); }
  assert.equal(tanidiklarim(d, veri).find(x => x.id === hedef).yok, 'tasindi');
});
