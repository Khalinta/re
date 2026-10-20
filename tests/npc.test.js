import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { npcUret, npcTanimi, sabitNpcSablonlari, npcVeriDogrula, npcKaydet, katmanYukselt, npcAl, SIMDIKI_YIL } from '../js/core/npc.js';
import { yeniDurum } from '../js/core/durum.js';
import { olayYili } from '../js/core/dunya.js';

const oku = y => JSON.parse(readFileSync(new URL('../' + y, import.meta.url)));
const dunya = {};
for (const f of ['sehir', 'semtler', 'figurler', 'mekanlar']) dunya[f] = oku(`data/dunya/${f}.json`);
const npc = { isimler: oku('data/npc/isimler.json'), memleket: oku('data/npc/memleket.json'), kisilik: oku('data/npc/kisilik.json'), hayat: oku('data/npc/hayat.json') };
const veri = { dunya, npc };
const semtler = dunya.sehir.semtler.map(s => s.id);
const kalabalik = (() => {
  const l = [];
  for (let i = 0; i < 3000; i++) { const semt = semtler[i % semtler.length]; l.push(npcUret('TEST-SEED', `n:${semt}:${i}`, { semt }, veri)); }
  return l;
})();

test('NPC verisi tutarlı (her sakin türünün mesleği ve yaşı, kancalar zaman çizelgesinde)', () => {
  assert.deepEqual(npcVeriDogrula(veri), []);
});

test('belirlenimli: aynı seed + kimlik aynı NPC; başka kimlik başka NPC', () => {
  assert.deepEqual(npcUret('A', 'n:x:1', { semt: 'camlik' }, veri), npcUret('A', 'n:x:1', { semt: 'camlik' }, veri));
  assert.notDeepEqual(npcUret('A', 'n:x:1', { semt: 'camlik' }, veri), npcUret('A', 'n:x:2', { semt: 'camlik' }, veri));
  assert.notDeepEqual(npcUret('A', 'n:x:1', { semt: 'camlik' }, veri), npcUret('B', 'n:x:1', { semt: 'camlik' }, veri));
});

test('tutarlılık kuralları (3000 NPC): yaş, eğitim, meslek, aile, kişilik, kancalar', () => {
  const zitlar = Object.fromEntries(npc.kisilik.ozellikler.map(o => [o.id, o]));
  const olayYas = k => olayYili(dunya.sehir.zamanCizelgesi.find(o => (o.kancalar || []).includes(k)));
  for (const n of kalabalik) {
    const y = `${n.id} ${n.tamAd}`;
    const [a, b] = npc.hayat.yasAraligi[n.sakinTuru];
    assert.ok(n.yas >= a && n.yas <= b, `${y}: yaş ${n.yas} (${n.sakinTuru})`);
    assert.equal(n.yas, SIMDIKI_YIL - n.dogumYili);
    if (n.durum === 'emekli') assert.ok(n.yas >= 50, `${y}: ${n.yas} yaşında emekli`);
    if (n.durum === 'ogrenci') assert.ok(n.yas <= 27);
    if (n.sakinTuru === 'akademisyen') assert.equal(n.egitim, 'yuksek_lisans');
    if (n.yas < 20) assert.equal(n.aile.cocuk, 0);
    assert.ok(n.aile.cocuk <= Math.max(0, Math.floor((n.yas - 18) / 2)), `${y}: ${n.yas} yaşında ${n.aile.cocuk} çocuk`);
    if (n.medeni === 'evli') assert.ok(n.aile.es?.ad && n.aile.es.yas >= 18, y);
    for (const o of n.ozellikler) {
      for (const [e, [en, ust]] of Object.entries(zitlar[o].kosul || {})) assert.ok(n.eksenler[e] >= en && n.eksenler[e] <= ust, `${y}: ${o}`);
      for (const z of zitlar[o].zit || []) assert.ok(!n.ozellikler.includes(z), `${y}: ${o} ile ${z}`);
    }
    for (const k of n.kancalar) {
      const kural = npc.hayat.kancalar.find(x => x.kanca === k);
      assert.ok(olayYas(k) - n.dogumYili >= kural.olaydaYas, `${y}: ${k} olayında çok küçük`);
    }
    const dert = npc.hayat.dertler.find(d => d.id === n.dert);
    if (dert?.kanca) assert.ok(n.kancalar.includes(dert.kanca), `${y}: ${n.dert}`);
    if (n.hayal === 'koy') assert.ok(n.gocmus);
    if (n.yore === 'yurtdisi') assert.ok(Object.values(npc.isimler.yabanci).some(x => x.erkek.includes(n.ad) || x.kadin.includes(n.ad)), `${y}: yabancı ad`);
    else assert.ok(npc.isimler.donemler.some(d => d.erkek.includes(n.ad) || d.kadin.includes(n.ad)), `${y}: ad havuzda değil`);
    assert.ok(n.ad && n.soyad && n.meslek.ad && n.dert && n.hayal && n.sir && n.tuhaflik, y);
    assert.ok(!npcTanimi(n, veri).includes('undefined'));
  }
});

test('dağılımlar semt karakterine uyuyor', () => {
  const pay = (semt, f) => { const l = kalabalik.filter(n => n.semt === semt); return l.filter(f).length / l.length; };
  assert.ok(pay('tabakhane', n => n.yore === 'yurtdisi') > 0.15);
  assert.ok(pay('yamacevler', n => n.yore === 'yurtdisi') < 0.03);
  assert.ok(pay('camlik', n => n.durum === 'ogrenci') > 0.4);
  assert.ok(pay('yamacevler', n => ['universite', 'yuksek_lisans'].includes(n.egitim)) > pay('tabakhane', n => ['universite', 'yuksek_lisans'].includes(n.egitim)));
  assert.ok(pay('asagi_liman', n => n.koken === 'mubadil') > 0.2);
  assert.ok(pay('tersaneonu', n => n.kancalar.includes('tersane_issizi')) > 0.2);
  // Herkesin aynı adı taşımadığı: 3000 kişide en az 300 farklı ad + soyad
  assert.ok(new Set(kalabalik.map(n => n.tamAd)).size > 2500);
  // Gizli özellikler nadir ama var
  const ihbarci = kalabalik.filter(n => n.gizli.includes('ihbarci')).length / kalabalik.length;
  assert.ok(ihbarci > 0.005 && ihbarci < 0.08, String(ihbarci));
});

test('dünyadaki sabit NPC\'ler: figürler ve mekan sahipleri adlarını, yaşlarını, mesleklerini korur', () => {
  const s = sabitNpcSablonlari(dunya);
  assert.equal(Object.keys(s).length, dunya.figurler.figurler.length + dunya.mekanlar.mekanlar.filter(m => m.sahip.tohum).length);
  const remzi = npcUret('X', 'm:cinaralti_kahvesi', s['m:cinaralti_kahvesi'], veri);
  assert.equal(remzi.hitapAdi, 'Remzi Usta');
  assert.equal(remzi.ad, 'Remzi');
  assert.equal(remzi.lakap, 'Usta');
  assert.equal(remzi.yas, 66);
  assert.equal(remzi.meslek.ad, "Çınaraltı Kahvesi'nin sahibi");
  const haci = npcUret('X', 'f:mahir_sarikaya', s['f:mahir_sarikaya'], veri);
  assert.equal(haci.ad, 'Mahir'); assert.equal(haci.soyad, 'Sarıkaya'); assert.equal(haci.unvan, 'Hacı');
  assert.equal(haci.dogumYili, 1952);
  for (const [id, sb] of Object.entries(s)) {
    const n = npcUret('X', id, sb, veri);
    assert.ok(n.ad && n.semt === sb.semt, id);
  }
});

test('kayıt: yalnızca değişenler; katman yalnızca yükselir; arka plan seed\'den geri gelir', () => {
  const d = yeniDurum(oku('data/simulasyon.json'), { seed: 'KAYIT', baslangic: '2026-10-20' });
  npcKaydet(d, 'n:camlik:1', { semt: 'camlik' }, { gun: 3 });
  assert.deepEqual(Object.keys(d.npcler['n:camlik:1']).sort(), ['anilar', 'iliski', 'ilk', 'katman', 'sablon']);
  katmanYukselt(d, 'n:camlik:1', 'onemli');
  katmanYukselt(d, 'n:camlik:1', 'tanidik');
  assert.equal(d.npcler['n:camlik:1'].katman, 'onemli');
  const n = npcAl(d, veri, 'n:camlik:1');
  assert.equal(n.tamAd, npcUret('KAYIT', 'n:camlik:1', { semt: 'camlik' }, veri).tamAd);
  assert.ok(JSON.stringify(d.npcler).length < 200);
});
