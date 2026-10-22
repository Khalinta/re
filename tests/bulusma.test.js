// Oynarken gelen geri bildirim (3.17): çağırana gidince gerçekten onunla bir yerdesin; olmayan parayla ödeme yok
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import { kisi, mekandakiler } from '../js/core/insanlar.js';
import { tanis, sohbetKonulari, sohbetHamlesi, oturumGecerli } from '../js/core/sohbet.js';
import { olayBaslat, olaySecenekleri, olaySecenegiSec } from '../js/core/olay.js';
import { olayKisisi } from '../js/core/olaykisi.js';
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
const dosyalar = oku('data/olaylar/_liste.json').dosyalar;
for (const f of dosyalar) for (const o of oku('data/olaylar/' + f).olaylar) veri.olaylar[o.id] = o;
const temiz = s => assert.ok(!/[{}«»]|undefined|null|NaN|\[object/.test(s), s);

// Bir tanıdık edin, sonra eve dön
function tanidikli(seed, para = 5000) {
  const d = yeniDurum(veri.sim, { seed, baslangic: '2026-10-20', saat: 18, para, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' }, karakter: { ad: 'Deniz', dogum: '1996-03-01', cinsiyet: 'e', fizik: { cekicilik: 6, karizma: 6 } } });
  const m = mekanBul(dunya, 'kordon_mekan');
  d.konum = { semt: m.semt, mekan: m.id };
  const r = Rng.akis(seed, 'y');
  for (let g = 0; g < 20; g++) {
    d.zaman.dakika = g * 1440 + 18 * 60;
    const kal = m.kalabalik[dilim(d.zaman.dakika).id];
    for (const id of mekandakiler(d, veri, m, kal)) {
      if (kisi(veri, seed, id).yas < 18) continue;
      d.bilgi.retler = {};
      tanis(d, veri, r, m, kal, id);
      if (d.sohbet?.npc === id) {
        delete d.sohbet;
        Object.assign(d.npcler[id], { numara: true });
        d.npcler[id].iliski.yakinlik = 30;
        d.konum = { semt: 'camlik', mekan: 'ev' };
        d.zaman.dakika = (g + 1) * 1440 + 15 * 60; // ertesi gün öğleden sonra; kişi bir yerde olsun diye
        return { d, id, r };
      }
    }
  }
  return null;
}

test('"Hemen yanına git": olaydan sonra onunla bir mekandasın ve konuşabiliyorsun; "Kalk" deyince ayrılıyorsun', () => {
  for (const olay of ['tanidik_dert_haberi', 'tanidik_dogum_gunu', 'tanidik_sokakta']) {
    let sinandi = 0;
    for (let i = 0; i < 10 && !sinandi; i++) {
      const t = tanidikli('BUL' + olay + i);
      if (!t) continue;
      const baglam = olayKisisi(t.d, veri, {}, t.r);
      assert.ok(baglam);
      t.d.aktifOlay = null;
      const b = olayBaslat(t.d, olay, veri, t.r, baglam);
      b.paragraflar.forEach(p => temiz(p.metin));
      const s = olaySecenegiSec(t.d, veri, t.r, olaySecenekleri(t.d, veri)[0].sira);
      assert.ok(s.bitti && !s.reddedildi, s.reddedildi);
      s.paragraflar.forEach(p => temiz(p.metin));
      if (!t.d.sohbet) continue; // açık mekan yoksa buluşma olmaz (gece yarısı)
      sinandi++;
      const kid = baglam.npc.kisi;
      assert.equal(t.d.sohbet.npc, kid);
      assert.notEqual(t.d.konum.mekan, 'ev');
      assert.ok(oturumGecerli(t.d, veri), olay);
      const konular = sohbetKonulari(t.d, veri).map(x => x.konu);
      assert.ok(konular.includes('hal') && konular.includes('bitir'), konular.join());
      assert.ok(s.paragraflar.some(p => /birliktesin/.test(p.metin)));
      assert.ok(sohbetHamlesi(t.d, veri, t.r, 'hal').tamam);
      t.d.sohbet.bekleyen = null;
      assert.ok(sohbetHamlesi(t.d, veri, t.r, 'bitir').tamam && !t.d.sohbet);
    }
    assert.ok(sinandi, olay);
  }
});

test('para: cebindeki para yetmiyorsa para isteyen olay seçeneği kapalı (fatura eksiye düşürmüyor)', () => {
  const t = tanidikli('PARA1', 100);
  assert.ok(t);
  t.d.para = 100;
  t.d.aktifOlay = null;
  olayBaslat(t.d, 'fatura_soku', veri, t.r, {});
  const l = olaySecenekleri(t.d, veri);
  const ode = l.find(x => /Öde/.test(x.metin));
  assert.ok(ode.devreDisi && /yok/.test(ode.sebep), JSON.stringify(ode));
  assert.ok(l.some(x => !x.devreDisi));
});

test('her olay sahnesinde parasız seçilebilecek en az bir seçenek var; hiçbir seçenek parayı iki kez kesmiyor', () => {
  for (const f of dosyalar) for (const o of oku('data/olaylar/' + f).olaylar) for (const [sid, s] of Object.entries(o.sahneler || {})) {
    const l = s.secenekler || [];
    if (!l.length) continue;
    const parali = x => (x.maliyet?.para ?? 0) > 0 || (x.etki || []).some(e => typeof e.para === 'number' && e.para < 0);
    assert.ok(l.some(x => !parali(x)), `${o.id}/${sid}: her seçenek para istiyor`);
    for (const x of l) assert.ok(!(x.maliyet?.para && (x.etki || []).some(e => typeof e.para === 'number' && e.para < 0)), `${o.id}/${sid}/${x.metin}: para iki kez`);
  }
});

test('mesaj olaylarının başlığı ne olacağını söylemez (kişinin adı); kıskançlığı telefonda konuşunca yanına oturduğunda yeniden sormaz', () => {
  const t = tanidikli('KIS1');
  assert.ok(t);
  const k = t.d.npcler[t.id];
  k.duydugu = { kisi: 'x', gun: 0, konustu: false };
  const baglam = olayKisisi(t.d, veri, { kiskanc: true }, t.r);
  assert.ok(baglam);
  t.d.aktifOlay = null;
  const b = olayBaslat(t.d, 'kiskanc_mesaj', veri, t.r, baglam);
  const baslik = b.paragraflar.find(p => p.tur === 'olayBaslik').metin;
  assert.equal(baslik, baglam.degisken.kisi.ad);
  olaySecenegiSec(t.d, veri, t.r, olaySecenekleri(t.d, veri)[0].sira);
  assert.equal(k.duydugu.konustu, true);
  for (const f of dosyalar) for (const o of oku('data/olaylar/' + f).olaylar) assert.ok(!/^(Kıskançlık|Kavga|Bitti|Kırgınlık|Öğrendi)$/.test(o.baslik ?? ''), o.id + ': ' + o.baslik);
});
