// Konuşma kancaları (3.21): söylenene özel cevaplar ("ev arkadaşı arıyorum" → "Benim yanıma taşın"), takip, ev arkadaşı
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import { kisi, mekandakiler } from '../js/core/insanlar.js';
import { tanis, sohbetKonulari, sohbetHamlesi, oturumGecerli } from '../js/core/sohbet.js';
import { baglamAksiyonlari, insanHamlesi } from '../js/core/konum.js';
import { mekanBul } from '../js/core/mekan.js';
import { dilim } from '../js/core/zaman.js';
import { Rng } from '../js/core/rng.js';

const oku = y => JSON.parse(readFileSync(new URL('../' + y, import.meta.url)));
const dunya = {};
for (const f of ['sehir', 'semtler', 'ulasim', 'kurumlar', 'sirketler', 'figurler', 'orgutler', 'mekanlar']) dunya[f] = oku(`data/dunya/${f}.json`);
const npc = {};
for (const f of ['isimler', 'memleket', 'kisilik', 'hayat', 'sohbet', 'gorunus', 'flort', 'dedikodu', 'derinlik', 'zevk', 'kanca']) npc[f] = oku(`data/npc/${f}.json`);
npc.hayatOlaylari = oku('data/npc/hayat_olaylari.json');
const veri = { sim: oku('data/simulasyon.json'), takvim: oku('data/takvim.json'), dunya, npc, gezi: oku('data/gezi.json'), ekonomi: oku('data/ekonomi.json'), olaylar: {} };
const temiz = s => assert.ok(!/[{}«»]|undefined|null|NaN|\[object/.test(s), s);
const KL = npc.kanca.kancalar;
const EV_SOZU = 'Kiralar uçtu. Ev arkadaşı aramaktan yoruldum; herkes üç kişilik odaya beş kişi sığdırıyor.';

test('veri: her kancanın cevapları, sonuçları ve metinleri var; dertler hayat.json\'da', () => {
  const dertler = new Set(npc.hayat.dertler.map(d => d.id));
  for (const [id, k] of Object.entries(KL)) {
    if (k.desen) new RegExp(k.desen, 'i');
    for (const d of k.dertler || []) assert.ok(dertler.has(d), id + ': ' + d);
    assert.ok(k.olgu && Object.keys(k.yanitlar).length >= 2, id);
    for (const [yid, y] of Object.entries(k.yanitlar)) {
      assert.ok(y.ad && y.soz?.length && Object.keys(y.sonuclar).length, id + '/' + yid);
      for (const x of Object.values(y.sonuclar)) assert.ok(Object.values(x.metin).flat().length, id + '/' + yid);
    }
  }
  assert.ok(new RegExp(KL.ev_arkadasi.desen, 'i').test(EV_SOZU));
});

function oturum(seed, para = 3000) {
  const d = yeniDurum(veri.sim, { seed, baslangic: '2026-10-20', saat: 19, para, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' }, karakter: { ad: 'Deniz', dogum: '1996-03-01', cinsiyet: 'e', fizik: { cekicilik: 6, karizma: 6 } } });
  const m = mekanBul(dunya, 'kordon_mekan');
  d.konum = { semt: m.semt, mekan: m.id };
  const r = Rng.akis(seed, 'y');
  for (let g = 0; g < 20; g++) {
    d.zaman.dakika = g * 1440 + 19 * 60;
    const kal = m.kalabalik[dilim(d.zaman.dakika).id];
    for (const id of mekandakiler(d, veri, m, kal)) {
      if (kisi(veri, seed, id).yas < 20) continue;
      d.bilgi.retler = {};
      tanis(d, veri, r, m, kal, id);
      if (d.sohbet?.npc === id) { d.sohbet.bekleyen = null; d.sohbet.kalan = 99; return { d, id, k: d.npcler[id], n: kisi(veri, seed, id), r, saat: d.zaman.dakika }; }
    }
  }
  return null;
}
// Mahalleyi konuşurken söylediği cümle: yalnızca ev arkadaşı sözü kalsın
const veriEv = { ...veri, npc: { ...npc, sohbet: { ...npc.sohbet, semt: { kizgin: { _: [EV_SOZU] }, kayitsiz: { _: [EV_SOZU] }, umutlu: { _: [EV_SOZU] } } } } };

test('Defne örneği: "ev arkadaşı aramaktan yoruldum" deyince — tanışalı beş dakika da olsa — "Benim yanıma taşın" teklif edilebiliyor', () => {
  const t = oturum('KANCA1');
  assert.ok(t);
  const s = sohbetHamlesi(t.d, veriEv, t.r, 'semt');
  assert.ok(s.tamam && s.paragraflar.some(p => p.metin === EV_SOZU), s.paragraflar.map(p => p.metin).join(' | '));
  t.d.sohbet.bekleyen = null;
  const l = sohbetKonulari(t.d, veriEv).map(x => x.konu);
  assert.ok(l[0].startsWith('kanca:ev_arkadasi:'), l.join());
  for (const y of ['yanima', 'ilan', 'soracagim']) assert.ok(l.includes('kanca:ev_arkadasi:' + y), y);
  const c = sohbetHamlesi(t.d, veriEv, t.r, 'kanca:ev_arkadasi:yanima');
  assert.ok(c.tamam); c.paragraflar.forEach(p => temiz(p.metin));
  assert.ok(t.k.kancalar.ev_arkadasi);
});

test('teklif kabul edilince ertesi gün yanına taşınıyor; evdeyken onunla konuşabiliyorsun', () => {
  let kabul = null;
  for (let i = 0; i < 30 && !kabul; i++) {
    const t = oturum('KANCA_EV' + i);
    if (!t) continue;
    Object.assign(t.k.iliski, { yakinlik: 40, guven: 15 });
    sohbetHamlesi(t.d, veriEv, t.r, 'semt');
    t.d.sohbet.bekleyen = null;
    sohbetHamlesi(t.d, veriEv, t.r, 'kanca:ev_arkadasi:yanima');
    if (t.d.evArkadasi) kabul = t;
  }
  assert.ok(kabul, 'hiç kabul etmedi');
  const { d, id, r } = kabul;
  delete d.sohbet;
  d.konum = { semt: d.ev.semt, mekan: 'ev' };
  assert.ok(!baglamAksiyonlari(d, veri).some(a => a.id === 'npc:evde'), 'taşınmadan önce evde yok');
  d.zaman.dakika = (Math.floor(d.zaman.dakika / 1440) + 1) * 1440 + 20 * 60; // ertesi akşam
  assert.ok(baglamAksiyonlari(d, veri).some(a => a.id === 'npc:evde'));
  const s = insanHamlesi(d, veriEv, r, 'evde');
  assert.ok(s.tamam && d.sohbet?.npc === id && d.sohbet.evde && oturumGecerli(d, veri), JSON.stringify(s.sebep));
  s.paragraflar.forEach(p => temiz(p.metin));
  assert.ok(baglamAksiyonlari(d, veri).some(a => a.id === 'sohbet:hal'));
  d.sohbet.bekleyen = null;
  assert.ok(sohbetHamlesi(d, veriEv, r, 'hal').tamam);
  d.zaman.dakika = (Math.floor(d.zaman.dakika / 1440) + 2) * 1440 + 3 * 60; // gece üç: uyuyor
  assert.ok(!oturumGecerli(d, veri));
});

test('dert anlatınca derde özel teklifler cevap olur; sonraki görüşmede "… sor" ile takip', () => {
  let bulundu = false;
  for (let i = 0; i < 60 && !bulundu; i++) {
    const t = oturum('KANCA_DERT' + i);
    if (!t) continue;
    const kid = Object.entries(KL).find(([, x]) => x.dertler?.includes(t.n.dert))?.[0];
    if (!kid || !KL[kid].takip) continue;
    bulundu = true;
    t.k.iliski.yakinlik = 30;
    const s = sohbetHamlesi(t.d, veri, t.r, 'dert');
    assert.ok(s.tamam && t.d.sohbet.bekleyen?.id === 'dert_tepki');
    const l = sohbetKonulari(t.d, veri).map(x => x.konu);
    assert.ok(l.some(x => x.startsWith(`kanca:${kid}:`)) && l.includes('cevap:teselli'), l.join());
    // Bir sonraki görüşme
    delete t.d.sohbet;
    t.d.sohbet = { npc: t.id, mekan: t.d.konum.mekan, kalan: 99, kullanilan: {}, bekleyen: null, bas: t.d.zaman.dakika };
    const l2 = sohbetKonulari(t.d, veri).map(x => x.konu);
    assert.ok(l2.includes(`kanca:${kid}:takip`), l2.join());
    const tk = sohbetHamlesi(t.d, veri, t.r, `kanca:${kid}:takip`);
    tk.paragraflar.forEach(p => temiz(p.metin));
    assert.ok(sohbetKonulari(t.d, veri).some(x => x.konu.startsWith(`kanca:${kid}:`) && !x.konu.endsWith('takip')));
  }
  assert.ok(bulundu);
});

test('borç vermek: para cebinden çıkar; gururlu reddederse geri döner; parası yetmezse seçenek yok', () => {
  const t = oturum('KANCA_PARA', 2000);
  assert.ok(t);
  t.d.sohbet.kancalar = ['para_derdi'];
  const once = t.d.para;
  assert.ok(sohbetKonulari(t.d, veri).some(x => x.konu === 'kanca:para_derdi:borc'));
  sohbetHamlesi(t.d, veri, t.r, 'kanca:para_derdi:borc');
  assert.ok(t.d.para === once - 500 || t.d.para === once, String(t.d.para));
  if (t.d.para === once - 500) assert.equal(t.k.alacak, 500);
  t.d.para = 100; t.d.sohbet.kullanilan = {}; t.d.sohbet.kancalar = ['para_derdi']; t.k.kancalar.para_derdi.cozuldu = false;
  assert.ok(!sohbetKonulari(t.d, veri).some(x => x.konu === 'kanca:para_derdi:borc'));
});
