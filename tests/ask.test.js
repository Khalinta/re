// Aşk, arzu, kıskançlık, birlikte gece (3.14)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import { kisi, mekandakiler, tanidiklari } from '../js/core/insanlar.js';
import { tanis, yaninaOtur, sohbetKonulari, sohbetHamlesi, flortEngeli, flortHamleleri } from '../js/core/sohbet.js';
import { arzu, askGunu, kiskanclikYay } from '../js/core/ask.js';
import { partnerli } from '../js/core/sadakat.js';
import { olayKisisi } from '../js/core/olaykisi.js';
import { olayBaslat, olaySecenekleri, olaySecenegiSec, vadesiGelenZamanlayici } from '../js/core/olay.js';
import { mekanBul } from '../js/core/mekan.js';
import { dilim, gunDakikasi } from '../js/core/zaman.js';
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

function oturum(seed, kosul, mekanId = 'kizil_bar') {
  const d = yeniDurum(veri.sim, { seed, baslangic: '2026-10-20', saat: 21, para: 20000, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' }, karakter: { ad: 'Deniz', dogum: '1996-03-01', cinsiyet: 'e', fizik: { cekicilik: 8, karizma: 7 } } });
  const m = mekanBul(dunya, mekanId);
  d.konum = { semt: m.semt, mekan: m.id };
  const r = Rng.akis(seed, 'y');
  for (let g = 0; g < 30; g++) {
    d.zaman.dakika = g * 1440 + 21 * 60;
    const kal = m.kalabalik[dilim(d.zaman.dakika).id];
    for (const id of mekandakiler(d, veri, m, kal)) {
      const n = kisi(veri, seed, id);
      if (!kosul(n, d)) continue;
      d.bilgi.retler = {};
      tanis(d, veri, r, m, kal, id);
      if (d.sohbet?.npc === id) { d.sohbet.bekleyen = null; d.sohbet.kalan = 99; return { d, id, n, k: d.npcler[id], m, kal, r }; }
    }
  }
  return null;
}
const uygun = (d, n) => n.yas >= 20 && n.yas <= 40 && n.cinsiyet !== d.karakter.cinsiyet && !flortEngeli(d, veri, n);
const bekar = (n, d) => uygun(d, n) && !partnerli(n);
function oyna(d, olay, baglam, sec, rng) {
  d.aktifOlay = null;
  let s = olayBaslat(d, olay, veri, rng, baglam);
  s.paragraflar.forEach(p => temiz(p.metin));
  for (let j = 0; !s.bitti && j < 8; j++) {
    const l = olaySecenekleri(d, veri).filter(x => !x.devreDisi);
    s = olaySecenegiSec(d, veri, rng, l[sec(j, l.length)].sira);
    s.paragraflar.forEach(p => temiz(p.metin));
  }
  assert.ok(s.bitti, olay);
  return s;
}

test('"Flört et…": ana menüde tek giriş; açınca bütün hamleler (iltifat, numara, göz göze…); seçince menü kapanır', () => {
  const t = oturum('MENU', bekar);
  const ana = sohbetKonulari(t.d, veri);
  assert.ok(ana.some(x => x.konu === 'flort') && !ana.some(x => ['iltifat', 'takil', 'numara', 'ask:goz'].includes(x.konu)));
  assert.ok(ana.length <= 12, ana.map(x => x.konu).join());
  sohbetHamlesi(t.d, veri, t.r, 'flort');
  const alt = sohbetKonulari(t.d, veri).map(x => x.konu);
  for (const x of ['iltifat', 'takil', 'numara', 'ask:goz', 'flort:vazgec']) assert.ok(alt.includes(x), alt.join());
  sohbetHamlesi(t.d, veri, t.r, 'flort:vazgec');
  assert.equal(t.d.sohbet.bekleyen, null);
  sohbetHamlesi(t.d, veri, t.r, 'flort');
  const s = sohbetHamlesi(t.d, veri, t.r, 'ask:goz');
  assert.ok(s.tamam && s.paragraflar.length);
  assert.notEqual(t.d.sohbet?.bekleyen?.tur, 'flortMenu');
});

test('arzu: göz göze ve dokunmak arzuyu artırır, ilk dokunuş anı olur; açık konuşmak ve "buradan çıkalım" arzuyla açılır', () => {
  let cikti = 0;
  for (let i = 0; i < 40 && cikti < 2; i++) {
    const t = oturum('ARZU' + i, bekar);
    if (!t) continue;
    t.k.iliski.cekim = 60; t.k.iliski.yakinlik = 30;
    const once = arzu(t.k);
    for (const konu of ['ask:goz', 'ask:dokun', 'ask:acik']) {
      if (!t.d.sohbet) break;
      t.d.sohbet.kullanilan = {}; t.d.sohbet.bekleyen = null;
      if (!flortHamleleri(t.d, veri, t.n, t.k).some(x => x.konu === konu)) continue;
      const s = sohbetHamlesi(t.d, veri, t.r, konu);
      assert.ok(s.tamam, s.sebep);
      s.paragraflar.forEach(p => temiz(p.metin));
    }
    assert.ok(arzu(t.k) >= once, 'arzu düştü');
    if (t.k.ilkTemas !== undefined) assert.ok(t.k.anilar.some(a => a.metin.includes('ilk kez dokundun')));
    // "Buradan çıkalım": arzu yüksek, akşam
    t.k.iliski.arzu = 80; t.k.numara = true;
    if (!t.d.sohbet) continue;
    t.d.sohbet.kullanilan = {}; t.d.sohbet.bekleyen = null;
    assert.ok(flortHamleleri(t.d, veri, t.n, t.k).some(x => x.konu === 'ask:cik'));
    sohbetHamlesi(t.d, veri, t.r, 'ask:cik');
    const z = t.d.zamanlayicilar.find(x => x.olay === 'birlikte_gece');
    if (z) { cikti++; assert.equal(t.d.sohbet, undefined, 'kabul edince oturum kapanır'); assert.ok(z.zaman <= t.d.zaman.dakika, 'gece hemen başlamalı'); }
  }
  assert.ok(cikti >= 1, 'kimse çıkmayı kabul etmedi');
});

test('birlikte gece: her yoldan oynanır; sabaha çıkar, evine dönersin, gece sayılır; gizlisi de', () => {
  const t = oturum('GECE', bekar);
  const b = { npc: { kisi: t.id }, degisken: { kisi: { ad: t.n.hitapAdi } } };
  for (const olay of ['birlikte_gece', 'birlikte_gece_gizli']) {
    for (let s = 0; s < 4; s++) {
      const d = structuredClone(t.d);
      d.npcler[t.id].iliski.arzu = 30 + s * 15;
      const dk = d.zaman.dakika;
      oyna(d, olay, b, (j, n) => (s + j) % n, Rng.akis(olay + s, 'x'));
      const k = d.npcler[t.id];
      if ((k.iliski.gece ?? 0) > 0) {
        const saat = gunDakikasi(d.zaman.dakika) / 60;
        assert.ok(d.zaman.dakika - dk >= 6 * 60 && saat >= 4 && saat <= 12, `sabah olmadı: ${saat}`);
        assert.deepEqual(d.konum, { semt: 'camlik', mekan: 'ev' });
        assert.ok(k.anilar.some(a => a.metin.includes('birlikte bir gece')));
      }
    }
  }
});

test('kıskançlık: başka biriyle flörtün duyulur (tanıyorsa, oradaysa), yanına oturunca hesap sorar; her cevap işler', () => {
  let goruldu = 0;
  for (let i = 0; i < 40 && goruldu < 2; i++) {
    const t = oturum('KISK' + i, bekar);
    if (!t) continue;
    // Bu kişinin tanıdıklarından biri senin sevgilin olsun
    const tan = tanidiklari(veri, t.d.seed, t.id).map(x => x.id).find(x => x.startsWith('n:') && kisi(veri, t.d.seed, x).yas >= 20);
    if (!tan) continue;
    t.d.npcler[tan] = { iliski: { arzu: 50, yakinlik: 30, guven: 5 }, anilar: [], tanisildi: 0, iliskiTuru: 'sevgili', numara: true };
    let duydu = false;
    for (let j = 0; j < 30 && !duydu; j++) { kiskanclikYay(t.d, veri, t.id, Rng.akis('ky' + i + j, 'x')); duydu = !!t.d.npcler[tan].duydugu; }
    assert.ok(duydu, 'tanıyan sevgili hiç duymadı');
    // Yanına oturunca
    const sv = t.d.npcler[tan];
    const r = Rng.akis('ko' + i, 'x');
    t.d.sohbet = undefined;
    const tn = kisi(veri, t.d.seed, tan);
    // oturumu doğrudan başlatıp karşılamayı dene: yaninaOtur kişinin mekanda olmasını ister; mekan dışı ise bırak
    const m = mekanBul(dunya, 'cinaralti_kahvesi');
    if (!mekandakiler(t.d, veri, m, 3).includes(tan)) { goruldu++; assert.ok(sv.duydugu.kisi === t.id); continue; }
    const s = yaninaOtur(t.d, veri, r, m, 3, tan);
    s.paragraflar.forEach(p => temiz(p.metin));
    assert.equal(t.d.sohbet?.bekleyen?.tur, 'ask');
    const c = sohbetKonulari(t.d, veri);
    assert.equal(c.length, 4);
    const x = sohbetHamlesi(t.d, veri, r, c[i % 4].konu);
    assert.ok(x.tamam, x.sebep);
    x.paragraflar.forEach(p => temiz(p.metin));
    void tn;
    goruldu++;
  }
  assert.ok(goruldu >= 1);
});

test('zaman: arzu söner (sevgilide yavaş); sevgilini uzun süre görmezsen gerilir', () => {
  const d = yeniDurum(veri.sim, { seed: 'ZAM', baslangic: '2026-10-20', ev: { semt: 'camlik', tip: 'oda', ad: 'oda' } });
  d.npcler = { a: { iliski: { arzu: 50 }, anilar: [], iliskiTuru: 'sevgili', sonGorus: 0 }, b: { iliski: { arzu: 50 }, anilar: [], sonGorus: 0 } };
  for (let g = 1; g <= 10; g++) askGunu(d, veri, g);
  assert.equal(d.npcler.a.iliski.arzu, 40);
  assert.equal(d.npcler.b.iliski.arzu, 20);
  assert.ok((d.npcler.a.iliski.gerginlik ?? 0) >= 2);
  assert.equal(d.npcler.b.iliski.gerginlik, undefined);
});

test('telefon olayları: özlem, gece çağrısı (gidersen gece başlar), kıskançlık mesajı, kavga, ayrılık, eskinin dönüşü', () => {
  const t = oturum('TEL', bekar);
  const d = t.d;
  const k = t.k;
  k.numara = true; k.iliskiTuru = 'sevgili'; k.iliski.arzu = 70; k.iliski.gerginlik = 8;
  d.sohbet = undefined;
  for (const [olay, ayar] of [['ozledim', {}], ['gece_cagri', {}], ['sevgili_kavga', {}], ['senden_ayriliyor', { arzu: 10 }], ['kiskanc_mesaj', { duydugu: true }], ['eski_doner', { tur: 'eski', arzu: 20, yakinlik: 10 }]]) {
    const o = veri.olaylar[olay];
    for (let s = 0; s < o.sahneler.giris.secenekler.length; s++) {
      const dd = structuredClone(d);
      const kk = dd.npcler[t.id];
      if (ayar.arzu !== undefined) kk.iliski.arzu = ayar.arzu;
      if (ayar.tur) kk.iliskiTuru = ayar.tur;
      if (ayar.yakinlik) kk.iliski.yakinlik = ayar.yakinlik;
      if (ayar.duydugu) kk.duydugu = { kisi: 'n:camlik:1', gun: 0, konustu: false };
      const b = olayKisisi(dd, veri, o.kisi, Rng.akis('s' + olay, 'x'));
      assert.ok(b && b.npc.kisi === t.id, `${olay}: kişi seçilmedi`);
      oyna(dd, olay, b, (j, n) => j === 0 ? s % n : 0, Rng.akis(olay + s, 'x'));
      if (olay === 'gece_cagri' && s === 0) {
        const { zamanlayici } = vadesiGelenZamanlayici(dd, veri);
        assert.equal(zamanlayici?.olay, 'birlikte_gece');
        assert.equal(zamanlayici.baglam.npc.kisi, t.id);
      }
    }
  }
});

test('ayrılmak: senin elinde; eski sevgili olur, sonra eskinin dönüşü olayı seçilebilir', () => {
  const t = oturum('AYR', bekar);
  t.k.iliskiTuru = 'sevgili'; t.k.iliski.arzu = 50;
  assert.ok(flortHamleleri(t.d, veri, t.n, t.k).some(x => x.konu === 'ask:ayril'));
  const s = sohbetHamlesi(t.d, veri, t.r, 'ask:ayril');
  s.paragraflar.forEach(p => temiz(p.metin));
  assert.equal(t.k.iliskiTuru, 'eski');
  assert.equal(t.d.sohbet, undefined);
  t.k.numara = true; t.k.iliski.yakinlik = 10; t.k.iliski.arzu = 20;
  assert.ok(olayKisisi(t.d, veri, veri.olaylar.eski_doner.kisi, Rng.akis('e', 'x')));
});
