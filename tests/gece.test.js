// Romantizm ve cinselliğin derinleşmesi (3.20): gece aşamaları (kapı → gece → sonra → sabah), yeni hamleler
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import { kisi, mekandakiler } from '../js/core/insanlar.js';
import { tanis, sohbetHamlesi, flortEngeli, flortHamleleri } from '../js/core/sohbet.js';
import { partnerli } from '../js/core/sadakat.js';
import { olayBaslat, olaySecenekleri, olaySecenegiSec } from '../js/core/olay.js';
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
for (const f of oku('data/olaylar/_liste.json').dosyalar) for (const o of oku('data/olaylar/' + f).olaylar) veri.olaylar[o.id] = o;
const temiz = s => assert.ok(!/[{}«»]|undefined|null|NaN|\[object/.test(s), s);

function oturum(seed, cins = 'e') {
  const d = yeniDurum(veri.sim, { seed, baslangic: '2026-10-20', saat: 21, para: 20000, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' }, karakter: { ad: 'Deniz', dogum: '1996-03-01', cinsiyet: cins, fizik: { cekicilik: 8, karizma: 7 } } });
  const m = mekanBul(dunya, 'kizil_bar');
  d.konum = { semt: m.semt, mekan: m.id };
  const r = Rng.akis(seed, 'y');
  for (let g = 0; g < 30; g++) {
    d.zaman.dakika = g * 1440 + 21 * 60;
    const kal = m.kalabalik[dilim(d.zaman.dakika).id];
    for (const id of mekandakiler(d, veri, m, kal)) {
      const n = kisi(veri, seed, id);
      if (!(n.yas >= 20 && n.yas <= 40 && n.cinsiyet !== cins && !flortEngeli(d, veri, n) && !partnerli(n))) continue;
      d.bilgi.retler = {};
      tanis(d, veri, r, m, kal, id);
      if (d.sohbet?.npc === id) { d.sohbet.bekleyen = null; d.sohbet.kalan = 999; return { d, id, n, k: d.npcler[id], r, saat: d.zaman.dakika }; }
    }
  }
  return null;
}

test('gece aşamaları: giriş → kapı → gece → sonra → sabah; her seçenek temiz metinle akıyor', () => {
  const sahneler = new Set(), secilen = new Set();
  for (let i = 0; i < 16; i++) {
    const t = oturum('GECE' + i);
    if (!t) continue;
    t.k.iliski.arzu = i % 2 ? 70 : 30; t.k.iliski.gece = i % 3 ? 1 : 0; t.k.iliskiTuru = 'flort';
    delete t.d.sohbet;
    t.d.aktifOlay = null;
    let s = olayBaslat(t.d, 'birlikte_gece', veri, t.r, { npc: { kisi: t.id }, degisken: { kisi: { ad: t.n.hitapAdi, cinsiyet: t.n.cinsiyet } } });
    s.paragraflar.forEach(p => temiz(p.metin));
    for (let j = 0; !s.bitti && j < 8; j++) {
      sahneler.add(t.d.aktifOlay.sahne);
      const l = olaySecenekleri(t.d, veri).filter(x => !x.devreDisi);
      const x = l[(i + j) % l.length];
      secilen.add(x.metin);
      s = olaySecenegiSec(t.d, veri, t.r, x.sira);
      s.paragraflar.forEach(p => temiz(p.metin));
    }
    assert.ok(s.bitti);
  }
  for (const x of ['giris', 'kapi', 'gece', 'sonra', 'sabah']) assert.ok(sahneler.has(x), [...sahneler].join());
  assert.ok(secilen.size >= 12, [...secilen].join(' | '));
});

test('"Kontrolü ona bırak": pegging yalnızca kadın kişi + erkek oyuncu iken çıkabilir', () => {
  const sec = veri.olaylar.birlikte_gece.sahneler.gece.secenekler.find(x => x.metin === 'Kontrolü ona bırak');
  for (const d of sec.sonuclar) if (JSON.stringify(d.sonuc).includes('Pegging')) {
    const k = JSON.stringify(d.kosul);
    assert.ok(k.includes('"baglam":"kisi.cinsiyet","esit":"k"') && k.includes('"deger":"karakter.cinsiyet","esit":"e"'), k);
  }
});

test('yeni hamleler: "Seni seviyorum" (flört/sevgiliyle, 3 günde bir), gelecek (sevgiliyle), sarıl, fantezi (bir geceden sonra)', () => {
  const t = oturum('YENI320');
  assert.ok(t);
  const l0 = flortHamleleri(t.d, veri, t.n, t.k).map(x => x.konu);
  for (const x of ['seviyorum', 'gelecek', 'saril', 'fantezi']) assert.ok(!l0.includes('ask:' + x), x);
  Object.assign(t.k.iliski, { yakinlik: 30, arzu: 50, cekim: 40, gece: 1 }); t.k.iliskiTuru = 'sevgili';
  const l = flortHamleleri(t.d, veri, t.n, t.k).map(x => x.konu);
  for (const x of ['seviyorum', 'gelecek', 'saril', 'fantezi']) assert.ok(l.includes('ask:' + x), x + ': ' + l.join());
  const s = sohbetHamlesi(t.d, veri, t.r, 'ask:seviyorum');
  assert.ok(s.tamam); s.paragraflar.forEach(p => temiz(p.metin));
  t.d.sohbet.kullanilan = {}; t.d.sohbet.bekleyen = null;
  assert.ok(!flortHamleleri(t.d, veri, t.n, t.k).some(x => x.konu === 'ask:seviyorum'), 'aynı gün ikinci kez');
});
