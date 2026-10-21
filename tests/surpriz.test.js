// Kullanıcı geri bildirimi 1 (3.16): farklı zevke de tepki, numara ısrarı, yanlış numara, tahmin edilemeyen hamleler
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import { kisi, mekandakiler } from '../js/core/insanlar.js';
import { tanis, sohbetKonulari, sohbetHamlesi, flortEngeli, flortHamleleri, flortUygun } from '../js/core/sohbet.js';
import { partnerli } from '../js/core/sadakat.js';
import { derinlik } from '../js/core/kart.js';
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
const S = npc.flort.ask.serbest;

function oturum(seed, kosul, mekanId = 'kizil_bar', saat = 21) {
  const d = yeniDurum(veri.sim, { seed, baslangic: '2026-10-20', saat, para: 20000, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' }, karakter: { ad: 'Deniz', dogum: '1996-03-01', cinsiyet: 'e', fizik: { cekicilik: 8, karizma: 7 } } });
  const m = mekanBul(dunya, mekanId);
  d.konum = { semt: m.semt, mekan: m.id };
  const r = Rng.akis(seed, 'y');
  for (let g = 0; g < 30; g++) {
    d.zaman.dakika = g * 1440 + saat * 60;
    const kal = m.kalabalik[dilim(d.zaman.dakika).id];
    for (const id of mekandakiler(d, veri, m, kal)) {
      const n = kisi(veri, seed, id);
      if (!kosul(n, d)) continue;
      d.bilgi.retler = {};
      tanis(d, veri, r, m, kal, id);
      if (d.sohbet?.npc === id) { d.sohbet.bekleyen = null; d.sohbet.kalan = 999; return { d, id, n, k: d.npcler[id], r, saat: d.zaman.dakika }; }
    }
  }
  return null;
}
const bekar = (n, d) => n.yas >= 20 && n.yas <= 40 && n.cinsiyet !== d.karakter.cinsiyet && !flortEngeli(d, veri, n) && !partnerli(n);
const tazele = t => { t.d.sohbet.bekleyen = null; t.d.sohbet.kalan = 999; t.d.zaman.dakika = t.saat; };
const metin = s => s.paragraflar.map(p => p.metin).join(' ');

test('farklı hobi: "ortak değil" diye düz geçmiyor; etkilenen, meraklanan, takılan, ilgilenmeyen var', () => {
  const H = npc.zevk.hobi;
  const kategori = {};
  for (const [id, x] of Object.entries(H.tur)) for (const [c, l] of Object.entries(x.tepki || {})) for (const s of l) kategori[s] = c;
  for (const c of ['etkilendi', 'merak', 'alay', 'ilgisiz']) for (const s of H.tepki[c]._) kategori[s] = c;
  const gorulen = new Set();
  for (let i = 0; i < 50 && gorulen.size < 4; i++) {
    const t = oturum('HOBI' + i, (n, d) => derinlik(d.seed, n, veri).hobi !== 'gitar çalmak' && n.yas >= 20, 'kordon_mekan', 19);
    if (!t) continue;
    t.d.karakter.zevk = { muzik: [], hobi: ['gitar çalmak'] };
    if (i % 2) t.k.iliski.cekim = 70;
    t.d.sohbet.bekleyen = { tur: 'zevk', alan: 'hobi', soran: 'npc' };
    const s = sohbetHamlesi(t.d, veri, t.r, 'cevap:z:h:gitar çalmak');
    assert.ok(s.tamam, s.sebep);
    s.paragraflar.forEach(p => temiz(p.metin));
    const tepki = s.paragraflar.filter(p => p.konusan !== 'Sen').map(p => p.metin.replace(/, (be|da|ha|gari|ula|yav)([.!?])$/, '$2'));
    for (const x of tepki) if (kategori[x]) gorulen.add(kategori[x]);
    assert.ok(!tepki.some(x => /^Ben anlamam/.test(x)), tepki.join(' | '));
  }
  assert.ok(gorulen.size >= 3, [...gorulen].join());
});

test('reddedilen numara yeniden istenebilir; ısrarın sonucu belli değil (verir, yanlış verir, seninkini ister, kızar...)', () => {
  const sonuc = new Set();
  for (let i = 0; i < 60 && sonuc.size < 4; i++) {
    const t = oturum('ISRAR' + i, bekar);
    if (!t) continue;
    t.k.iliski.cekim = -20; // ilgisi numara eşiğinin altında
    const ilk = sohbetHamlesi(t.d, veri, t.r, 'numara');
    if (!ilk.tamam || t.k.numara) continue;
    tazele(t);
    const tekrar = flortHamleleri(t.d, veri, t.n, t.k).find(x => x.konu === 'numara');
    assert.ok(tekrar && /ısrar/.test(tekrar.ad), JSON.stringify(tekrar));
    const s = sohbetHamlesi(t.d, veri, t.r, 'numara');
    assert.ok(s.tamam, s.sebep);
    s.paragraflar.forEach(p => temiz(p.metin));
    sonuc.add(t.k.numara ? 'verdi' : t.k.sahteNumara ? 'sahte' : t.k.seninNumaran !== undefined ? 'seninki' : !t.d.sohbet ? 'kalkti' : 'kizdi');
  }
  assert.ok(sonuc.size >= 3, [...sonuc].join());
});

test('yanlış numara: ertesi gün anlaşılıyor; yüzüne vurunca çoğu zaman gerçeğini veriyor', () => {
  let bulundu = false;
  for (let i = 0; i < 120 && !bulundu; i++) {
    const t = oturum('SAHTE' + i, bekar);
    if (!t) continue;
    t.k.iliski.cekim = -20;
    sohbetHamlesi(t.d, veri, t.r, 'numara');
    if (t.k.numara) continue;
    for (let j = 0; j < 2 && t.d.sohbet && !t.k.sahteNumara && !t.k.numara; j++) { tazele(t); sohbetHamlesi(t.d, veri, t.r, 'numara'); }
    if (!t.k.sahteNumara) continue;
    bulundu = true;
    assert.ok(!flortHamleleri(t.d, veri, t.n, t.k).some(x => x.konu === 'numara'), 'yanlış numarayı bilmeden yeniden isteyemezsin');
    const z = t.d.zamanlayicilar.find(x => x.olay === 'sahte_numara');
    assert.ok(z && z.zaman > t.d.zaman.dakika);
    t.d.aktifOlay = null;
    let s = olayBaslat(t.d, 'sahte_numara', veri, t.r, z.baglam);
    s.paragraflar.forEach(p => temiz(p.metin));
    s = olaySecenegiSec(t.d, veri, t.r, olaySecenekleri(t.d, veri)[0].sira);
    assert.ok(s.bitti && t.k.sahteNumara.ogrendi === true);
    // Ertesi gün yine karşılaştınız
    t.d.zaman.dakika = t.saat + 2 * 1440;
    t.d.sohbet = { npc: t.id, mekan: t.d.konum.mekan, kalan: 999, kullanilan: {}, bekleyen: null, bas: t.d.zaman.dakika };
    const h = flortHamleleri(t.d, veri, t.n, t.k).find(x => x.konu === 'numara');
    assert.ok(h && /yanlış/.test(h.ad), JSON.stringify(h));
    const y = sohbetHamlesi(t.d, veri, t.r, 'numara');
    assert.ok(y.tamam && /dönerci|teyze/.test(metin(y)), metin(y));
  }
  assert.ok(bulundu, 'hiç yanlış numara verilmedi');
});

test('yeni hamleler: öp, fısılda, iddia, telefon, peçete, içini dök; dans yalnızca bar/meyhane/kulüpte; sonuçlar her seferinde farklı olabiliyor', () => {
  const sonuc = {};
  for (let i = 0; i < 40; i++) {
    const t = oturum('YENI' + i, bekar);
    if (!t) continue;
    t.k.iliski.cekim = 40; t.k.iliski.yakinlik = 15; t.k.iliski.arzu = 30;
    const l = flortHamleleri(t.d, veri, t.n, t.k).map(x => x.konu);
    for (const x of ['opmek', 'fisilda', 'iddia', 'telefon', 'pecete', 'itiraf', 'dans']) assert.ok(l.includes('ask:' + x), x + ': ' + l.join());
    const hamle = ['opmek', 'fisilda', 'iddia', 'dans', 'itiraf'][i % 5];
    const s = sohbetHamlesi(t.d, veri, t.r, 'ask:' + hamle);
    assert.ok(s.tamam, s.sebep);
    s.paragraflar.forEach(p => temiz(p.metin));
    const bul = Object.entries(S[hamle].sonuclar).find(([, x]) => Object.values(x.metin).flat().some(m => metin(s).includes(m.slice(0, 30))));
    assert.ok(bul, metin(s));
    (sonuc[hamle] ??= new Set()).add(bul[0]);
  }
  for (const [h, x] of Object.entries(sonuc)) assert.ok(x.size >= 2, `${h}: hep aynı sonuç (${[...x]})`);
  const kafe = oturum('KAFE', bekar, 'kule_kafe', 15);
  kafe.k.iliski.cekim = 40; kafe.k.iliski.arzu = 30;
  assert.ok(!flortHamleleri(kafe.d, veri, kafe.n, kafe.k).some(x => x.konu === 'ask:dans'));
});

test('peçete: kalkıp gidiyorsun; bazen sonradan yazıyor, yazınca numarası sende', () => {
  let yazdi = 0, yazmadi = 0;
  for (let i = 0; i < 40 && !(yazdi && yazmadi); i++) {
    const t = oturum('PECETE' + i, bekar);
    if (!t) continue;
    t.k.iliski.cekim = i % 2 ? 50 : -10;
    const s = sohbetHamlesi(t.d, veri, t.r, 'ask:pecete');
    assert.ok(s.tamam && !t.d.sohbet && t.k.ayrildi?.kim === 'sen');
    const z = t.d.zamanlayicilar.find(x => x.olay === 'pecete_mesaj');
    if (!z) { yazmadi++; continue; }
    yazdi++;
    t.d.aktifOlay = null;
    const b = olayBaslat(t.d, 'pecete_mesaj', veri, t.r, z.baglam);
    b.paragraflar.forEach(p => temiz(p.metin + (p.konusan ?? '')));
    const e = olaySecenegiSec(t.d, veri, t.r, olaySecenekleri(t.d, veri)[0].sira);
    assert.ok(e.bitti && t.k.numara);
  }
  assert.ok(yazdi && yazmadi, `${yazdi}/${yazmadi}`);
});

test('kişinin sürprizleri: arzusu yüksekken bazen kendisi numara yazar, öper, "evim on dakika" der', () => {
  let goruldu = 0;
  for (let i = 0; i < 60 && goruldu < 3; i++) {
    const t = oturum('SURP' + i, bekar);
    if (!t) continue;
    t.k.iliski.cekim = 60; t.k.iliski.arzu = 80;
    for (let j = 0; j < 6 && t.d.sohbet && !t.d.sohbet.surpriz; j++) {
      tazele(t); t.d.sohbet.kullanilan = {};
      const s = sohbetHamlesi(t.d, veri, t.r, 'ask:goz');
      s.paragraflar.forEach(p => temiz(p.metin));
    }
    if (t.d.sohbet?.surpriz) goruldu++;
    if (t.d.sohbet?.bekleyen?.alan === 'teklif') {
      const c = sohbetKonulari(t.d, veri).map(x => x.konu);
      assert.deepEqual(c.sort(), ['cevap:a:git', 'cevap:a:yavas']);
      const s = sohbetHamlesi(t.d, veri, t.r, 'cevap:a:git');
      assert.ok(s.tamam && !t.d.sohbet && t.d.zamanlayicilar.some(x => x.olay === 'birlikte_gece'));
    }
  }
  assert.ok(goruldu >= 1);
});

test('18 yaş altı ve flörte uygun olmayan: hiçbir yeni hamle, sürpriz ya da "etkilendi" yok', () => {
  let sinandi = 0;
  for (let i = 0; i < 20; i++) {
    const t = oturum('GENC' + i, (n, d) => !flortUygun(d, veri, n), 'kordon_mekan', 17);
    if (!t) continue;
    sinandi++;
    t.k.iliski.cekim = 80; t.k.iliski.arzu = 80;
    assert.deepEqual(flortHamleleri(t.d, veri, t.n, t.k), []);
    for (let j = 0; j < 5 && t.d.sohbet; j++) {
      tazele(t); t.d.sohbet.kullanilan = {};
      sohbetHamlesi(t.d, veri, t.r, 'saka');
      assert.ok(!t.d.sohbet?.surpriz && !t.k.numara && t.k.ilkOpucuk === undefined);
    }
  }
  assert.ok(sinandi >= 5, String(sinandi));
});
