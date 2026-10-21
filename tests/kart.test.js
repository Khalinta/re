// Karakter derinliği (3.7): aile ağacı, ilişki ağı, hayat öyküsü, değerler — tutarlılık
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import { kisi } from '../js/core/insanlar.js';
import { aileAgaci, hayatOykusu, derinlik, iliskiAgi, bagTuru, gizliIliskiMi, kisiKarti, kartMetni } from '../js/core/kart.js';
import { kisiDedikodusu } from '../js/core/sohbet.js';
import { mekanBul } from '../js/core/mekan.js';
import { SIMDIKI_YIL } from '../js/core/npc.js';
import { Rng } from '../js/core/rng.js';

const oku = y => JSON.parse(readFileSync(new URL('../' + y, import.meta.url)));
const dunya = {};
for (const f of ['sehir', 'semtler', 'ulasim', 'kurumlar', 'sirketler', 'figurler', 'orgutler', 'mekanlar']) dunya[f] = oku(`data/dunya/${f}.json`);
const npc = {};
for (const f of ['isimler', 'memleket', 'kisilik', 'hayat', 'sohbet', 'gorunus', 'flort', 'dedikodu', 'derinlik']) npc[f] = oku(`data/npc/${f}.json`);
npc.hayatOlaylari = oku('data/npc/hayat_olaylari.json');
const veri = { sim: oku('data/simulasyon.json'), dunya, npc };
const SEED = 'KART';
const semtler = dunya.semtler.semtler.map(s => s.id);
const insanlar = [];
for (let i = 0; i < 1600; i++) insanlar.push(kisi(veri, SEED, i % 3 === 0 ? `n:${dunya.mekanlar.mekanlar[i % 52].id}:${i % 6}` : `n:${semtler[i % semtler.length]}:${i % 40}`));
const temiz = s => assert.ok(!/[{}«»]|undefined|null|NaN/.test(s), s);

test('aile ağacı tutarlı: yaşlar, doğum yılları, ölümler, soyadları', () => {
  for (const n of insanlar) {
    const a = aileAgaci(SEED, n, veri);
    const y = `${n.id} ${n.yas}`;
    for (const r of ['anne', 'baba']) {
      const p = a[r];
      if (!p) continue;
      const fark = n.dogumYili - p.dogumYili;
      assert.ok(fark >= (r === 'anne' ? 17 : 17) && fark <= 45, `${y}: ${r} ${fark} yaşında doğurmuş`);
      if (p.yasiyor) assert.equal(p.yas, SIMDIKI_YIL - p.dogumYili);
      else assert.ok(p.vefatYili > p.dogumYili && p.vefatYili < SIMDIKI_YIL, `${y}: ${r} vefat ${p.vefatYili}`);
      assert.equal(p.soyad, n.soyad);
    }
    for (const c of a.cocuklar) {
      assert.ok(c.yas >= 0 && n.yas - c.yas >= 18, `${y}: çocuk ${c.yas}`);
      if (a.es?.yasiyor) assert.ok(a.es.yas - c.yas >= 18, `${y}: eşe göre çocuk ${c.yas} (eş ${a.es.yas})`);
    }
    assert.equal(a.cocuklar.length, Math.min(n.aile.cocuk, a.cocuklar.length));
    assert.equal(new Set(a.cocuklar.map(c => c.dogumYili)).size, a.cocuklar.length, `${y}: aynı yıl iki çocuk`);
    for (const k of a.kardesler) {
      if (a.anne) { const f = k.dogumYili - a.anne.dogumYili; assert.ok(f >= 17 && f <= 45, `${y}: kardeşin annesi ${f} yaşında doğurmuş`); }
      assert.notEqual(k.dogumYili, n.dogumYili, `${y}: kardeş aynı yıl`);
      assert.equal(k.buyuk, k.dogumYili < n.dogumYili);
    }
    assert.equal(a.kardesler.length, n.aile.kardes);
    if (n.medeni === 'evli') assert.ok(a.es && a.es.yasiyor);
    if (n.medeni === 'dul') assert.ok(a.es && !a.es.yasiyor);
    if (n.medeni === 'bekar') assert.ok(!a.es);
    for (const x of [a.es, ...a.cocuklar, a.anne, a.baba, ...a.kardesler].filter(Boolean)) assert.ok(x.ad && typeof x.ad === 'string', `${y}: adsız ${x.rol}`);
  }
});

test('hayat öyküsü: sıralı, doğumla bugün arasında, evlilik çocuklardan ve boşanmadan önce, iki taraf da reşitken', () => {
  for (const n of insanlar) {
    const a = aileAgaci(SEED, n, veri);
    const o = hayatOykusu(SEED, n, a, veri);
    const y = `${n.id} ${n.yas}`;
    assert.ok(o.length >= 1 && o[0].metin.includes('doğdu') || o[0].once, y);
    let onceki = -Infinity;
    for (const x of o) {
      assert.ok(x.yil >= onceki, `${y}: sırasız`);
      onceki = x.yil;
      if (!x.once) assert.ok(x.yil >= n.dogumYili && x.yil <= SIMDIKI_YIL, `${y}: ${x.yil} ${x.metin}`);
      temiz(x.metin);
    }
    const ev = o.find(x => x.metin.includes('ile evlendi'));
    if (ev) {
      assert.ok(ev.yil - n.dogumYili >= 18 && ev.yil - a.es.dogumYili >= 18, `${y}: ${ev.yil - n.dogumYili} yaşında evlendi`);
      for (const x of o.filter(z => /doğdu\.$/.test(z.metin) && /^(Oğlu|Kızı)/.test(z.metin))) assert.ok(x.yil >= ev.yil, `${y}: çocuk evlilikten önce`);
      const bos = o.find(x => x.metin.includes('boşandı'));
      if (bos) assert.ok(bos.yil > ev.yil);
    }
    if (n.medeni === 'evli' || n.medeni === 'bosanmis' || n.medeni === 'dul') assert.ok(ev, `${y}: ${n.medeni} ama evlilik yok`);
    if (n.gocmus) assert.ok(o.some(x => x.metin.includes("Karaliman'a geldi")), `${y}: göç yok`);
  }
});

test('derinlik: kuşağa uygun seçimler, metinler eksiksiz; belirlenimli', () => {
  const D = npc.derinlik;
  for (const n of insanlar.slice(0, 600)) {
    const d = derinlik(SEED, n, veri);
    for (const v of Object.values(d)) (Array.isArray(v) ? v : [v]).forEach(x => temiz(String(x)));
    const ku = n.yas <= 29 ? 'genc' : n.yas <= 54 ? 'orta' : 'yasli';
    assert.ok(D.muzik[ku].includes(d.muzik) && D.hobi[ku].includes(d.hobi), `${n.yas}: ${d.muzik}/${d.hobi}`);
    assert.equal(d.degerler.length, 2);
    assert.notEqual(d.degerler[0], d.degerler[1]);
    if (n.medeni !== 'bosanmis') assert.notEqual(d.hassas, 'boşanması');
    assert.deepEqual(d, derinlik(SEED, n, veri));
  }
});

test('ilişki ağı: iki taraftan aynı tür; borçta biri borçlu öbürü alacaklı; gizli ilişki dedikoduyla aynı', () => {
  let bag = 0, gizli = 0;
  for (const n of insanlar.slice(0, 120)) {
    for (const x of iliskiAgi(veri, SEED, n.id)) {
      bag++;
      const ters = bagTuru(veri, SEED, x.id, n.id, x.nasil);
      const beklenen = { borclu: 'alacakli', alacakli: 'borclu' }[x.tur] ?? x.tur;
      assert.equal(ters, beklenen, `${n.id} ↔ ${x.id}: ${x.tur} / ${ters}`);
      temiz(x.gecmis);
      if (x.tur === 'gizli_iliski') { gizli++; assert.ok(gizliIliskiMi(veri, SEED, n, kisi(veri, SEED, x.id))); }
    }
  }
  assert.ok(bag > 300, String(bag));
  assert.ok(gizli > 0);
});

test('dedikodudaki "aralarında bir şey var" ile ilişki ağındaki gizli ilişki aynı çiftler', () => {
  const d = yeniDurum(veri.sim, { seed: SEED, baslangic: '2026-10-20', saat: 19, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' } });
  const m = mekanBul(dunya, 'cinaralti_kahvesi');
  let say = 0;
  for (let i = 0; i < 400 && say < 15; i++) {
    const n = kisi(veri, SEED, `n:eski_carsi:${i % 40}`);
    const x = kisiDedikodusu(d, veri, n, m, Rng.akis('A' + i, 'x'));
    if (!x || !/:ask(Evli)?:/.test(x.id)) { if (x) d.bilgi.dedikodular[x.id] = {}; continue; }
    const parca = x.id.slice(2).split(':ask');
    const tid = parca[0], uid = parca[1].replace(/^Evli/, '').slice(1);
    assert.ok(gizliIliskiMi(veri, SEED, kisi(veri, SEED, tid), kisi(veri, SEED, uid)), x.id);
    d.bilgi.dedikodular[x.id] = {};
    say++;
  }
  assert.ok(say > 0, 'hiç aşk dedikodusu çıkmadı');
});

test('kişi kartı: eksiksiz ve okunur; yapay zekâ metni çözülmüş', () => {
  const d = yeniDurum(veri.sim, { seed: SEED, baslangic: '2026-10-20', saat: 19, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' } });
  for (const n of insanlar.slice(0, 150)) {
    const k = kisiKarti(d, veri, n.id);
    assert.ok(k && k.ad && k.derinlik && k.aile && k.oyku.length);
    const m = kartMetni(k);
    temiz(m);
    assert.ok(m.length > 500 && m.length < 9000, String(m.length));
  }
});
