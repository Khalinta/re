// Sohbet ve flört (3.5): yaşa göre konuşma, hitap, karşılıklı sorular, flört, insanlar üzerine dedikodu
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import * as konum from '../js/core/konum.js';
import { mekandakiler, kisi } from '../js/core/insanlar.js';
import { tanis, yaninaOtur, sohbetKonulari, sohbetHamlesi, hitapSec, kusak, flortUygun, flortEngeli, ilgi, kisiDedikodusu, benim } from '../js/core/sohbet.js';
import { olayBaslat, olaySecenekleri, olaySecenegiSec } from '../js/core/olay.js';
import { mekanBul } from '../js/core/mekan.js';
import { Rng } from '../js/core/rng.js';
import { dilim } from '../js/core/zaman.js';
import { SIMDIKI_YIL } from '../js/core/npc.js';

const oku = y => JSON.parse(readFileSync(new URL('../' + y, import.meta.url)));
const dunya = {};
for (const f of ['sehir', 'semtler', 'ulasim', 'kurumlar', 'sirketler', 'figurler', 'orgutler', 'mekanlar']) dunya[f] = oku(`data/dunya/${f}.json`);
const npc = {};
for (const f of ['isimler', 'memleket', 'kisilik', 'hayat', 'sohbet', 'gorunus', 'flort', 'dedikodu']) npc[f] = oku(`data/npc/${f}.json`);
const veri = { sim: oku('data/simulasyon.json'), takvim: oku('data/takvim.json'), dunya, npc, hava: oku('data/hava.json'), ekonomi: oku('data/ekonomi.json'), gezi: oku('data/gezi.json'), olaylar: {} };
for (const o of oku('data/olaylar/iliski.json').olaylar) veri.olaylar[o.id] = o;
const sb = npc.sohbet;

function durumYap(seed, { yas = 26, cinsiyet = 'e', cekicilik = 7, karizma = 6 } = {}) {
  const d = yeniDurum(veri.sim, { seed, baslangic: '2026-10-20', saat: 19, para: 5000, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' },
    karakter: { ad: 'Deniz', dogum: `${SIMDIKI_YIL - yas}-01-01`, cinsiyet, fizik: { cekicilik, karizma }, eskiMeslek: 'garson' } });
  return d;
}
const kal = (m, dk) => m.kalabalik?.[dilim(dk).id] ?? 0;
const temiz = ps => { for (const p of ps) assert.ok(!/[«»{}]|undefined|null|NaN/.test(p.metin) && !/[«»{}]|undefined/.test(p.konusan ?? ''), `${p.konusan ?? ''}: ${p.metin}`); };

// Bir mekanda, koşula uyan biriyle tanışır (tanışana kadar gün/saat dener)
function tanisilmis(seed, mekanId, kosul = () => true, ayar) {
  const d = durumYap(seed, ayar);
  const m = mekanBul(dunya, mekanId);
  d.konum = { semt: m.semt, mekan: m.id };
  const r = Rng.akis(seed, 'test');
  for (let g = 0; g < 80; g++) for (const saat of [10, 14, 20]) {
    d.zaman.dakika = g * 1440 + saat * 60;
    const an = d.zaman.dakika;
    for (const id of mekandakiler(d, veri, m, kal(m, an))) {
      if (!kosul(kisi(veri, d.seed, id))) continue;
      d.bilgi.retler = {};
      tanis(d, veri, r, m, kal(m, an), id);
      if (d.npcler?.[id]?.tanisildi !== undefined) { d.zaman.dakika = an; return { d, id, an, m, r, n: kisi(veri, d.seed, id) }; }
    }
  }
  return null;
}

// Oturumu konular bitene ya da kişi kalkana kadar sürdürür; bekleyen soruları cevaplar
function konus(t, adim = 25, sec = l => l[0]) {
  const { d, r, an } = t;
  const cikti = [];
  for (let i = 0; i < adim && d.sohbet; i++) {
    d.zaman.dakika = an;
    const l = sohbetKonulari(d, veri).filter(x => x.konu !== 'bitir');
    if (!l.length) break;
    const s = sohbetHamlesi(d, veri, r, sec(l, i).konu);
    assert.ok(s.tamam, s.sebep);
    temiz(s.paragraflar);
    cikti.push(...s.paragraflar);
  }
  return cikti;
}

const kusakHavuzlari = ku => {
  const set = new Set();
  const gez = x => {
    if (Array.isArray(x) || !x || typeof x !== 'object') return;
    for (const [k, v] of Object.entries(x)) {
      if ((k === ku || k.startsWith(ku + '_')) && Array.isArray(v)) v.forEach(s => typeof s === 'string' && set.add(s.split('{')[0].slice(0, 30)));
      else gez(v);
    }
  };
  gez(sb); gez(npc.flort);
  return set;
};

test('yaşa göre konuşma: gençler yaşlıların cümlelerini kurmuyor, yaşlılar gençlerinkini; gençlerde yöresel "be" yok', () => {
  const yasliCumle = kusakHavuzlari('yasli'), gencCumle = kusakHavuzlari('genc');
  for (const s of [...yasliCumle]) if (gencCumle.has(s)) { yasliCumle.delete(s); gencCumle.delete(s); }
  let genc = 0, yasli = 0;
  for (let i = 0; i < 40; i++) {
    for (const [mid, kosul] of [['merkez_kantin', n => n.yas <= 29], ['fabrika_kahvesi_mekan', n => n.yas >= 55], ['kizil_bar', n => n.yas <= 29], ['ustalar_kahvesi_mekan', n => n.yas >= 55]]) {
      const t = tanisilmis('YAS' + i + mid, mid, kosul);
      if (!t) continue;
      t.d.npcler[t.id].iliski.yakinlik = 30;
      const ku = kusak(t.n, sb);
      const sozler = konus(t, 30, (l, j) => l[j % l.length]).filter(p => p.tur === 'konusma' && p.konusan === t.n.hitapAdi).map(p => p.metin);
      for (const s of sozler) {
        const bas = s.slice(0, 30);
        if (ku === 'genc') { genc++; assert.ok(![...yasliCumle].some(y => y.length > 12 && bas.startsWith(y.slice(0, 20))), `genç (${t.n.yas}) yaşlı gibi: ${s}`); if (!t.n.gocmus) assert.ok(!/, (be|yahu|gari|da|ula|ha)[.!]$/.test(s), `yerli gençte ağız: ${s}`); }
        if (ku === 'yasli') { yasli++; assert.ok(![...gencCumle].some(y => y.length > 12 && bas.startsWith(y.slice(0, 20))), `yaşlı (${t.n.yas}) genç gibi: ${s}`); }
      }
    }
  }
  assert.ok(genc > 100 && yasli > 50, `${genc} genç, ${yasli} yaşlı cümlesi denetlendi`);
});

test('hitap: yaşlı gence "evladım/kızım", genç büyüğüne "abi/abla", akranlar kuşağın dilinden', () => {
  const d = durumYap('HITAP', { yas: 24, cinsiyet: 'k' });
  const h = sb.hitap;
  let sayi = 0;
  for (let i = 0; i < 300; i++) {
    const n = kisi(veri, d.seed, `n:camlik:${i % 40}`) && kisi(veri, 'H' + i, `n:${['camlik', 'bezhane', 'kayalitepe'][i % 3]}:${i % 40}`);
    if (!n) continue;
    const dd = durumYap('H' + i, { yas: 24, cinsiyet: 'k' });
    const x = hitapSec(dd, veri, n);
    const fark = n.yas - 24;
    if (n.uslup === 'kibar') continue;
    if (fark >= 25) assert.ok(h.yasliGence.k.includes(x), `${n.yas}: ${x}`);
    else if (fark <= -10) assert.ok(h.buyuge.k.includes(x), `${n.yas}: ${x}`);
    else if (Math.abs(fark) < 10 && n.yas <= 29) assert.ok([...h.akran.genc[n.cinsiyet + 'k'].filter(y => y !== '@ad'), 'Deniz'].includes(x), `${n.yas} ${n.cinsiyet}: ${x}`);
    sayi++;
  }
  assert.ok(sayi > 150);
  assert.equal(benim('Erzurumlu'), 'Erzurumluyum');
  assert.equal(benim('Rizeli'), 'Rizeliyim');
  assert.equal(benim('Karalimanlı'), 'Karalimanlıyım');
});

test('karşılıklı sohbet: kişi sana soru soruyor, cevabın seçenek oluyor, söylediğini hatırlıyor', () => {
  let soruSayisi = 0, oturum = 0, hikayeAnlatildi = 0;
  for (let i = 0; i < 40; i++) {
    const t = tanisilmis('KARSI' + i, ['cinaralti_kahvesi', 'merkez_kantin', 'kordon_mekan'][i % 3]);
    if (!t) continue;
    t.d.hikaye = { arketip: 'kumar', tip: 'zirveden', degisken: {} };
    veri.hikaye = { arketipler: { arketipler: [{ id: 'kumar', ozet: ['Masada her şeyimi kaybettim.'] }] } };
    t.d.npcler[t.id].iliski.yakinlik = 12;
    oturum++;
    const cikti = konus(t, 30, l => l.find(x => x.konu === 'cevap:durust') ?? l[0]);
    const k = t.d.npcler[t.id];
    if (Object.keys(k.sorulan || {}).length) soruSayisi++;
    assert.ok(cikti.some(p => p.konusan === 'Sen') || !Object.keys(k.sorulan || {}).length, 'cevap verilince "Sen" konuşuyor');
    if (k.bilinen.oyuncu_hikaye) { hikayeAnlatildi++; assert.ok(cikti.some(p => p.konusan === 'Sen' && p.metin.includes('Masada her şeyimi kaybettim'))); }
  }
  delete veri.hikaye;
  assert.ok(oturum > 25);
  assert.ok(soruSayisi / oturum > 0.6, `soru soran oturum oranı ${soruSayisi}/${oturum}`);
  assert.ok(hikayeAnlatildi > 3, `geçmişini anlatma ${hikayeAnlatildi}`);
});

test('flört: yaş ve ilişki uygunluğu; engel açıkça söylenir ve flört seçenekleri kapanır', () => {
  const d = durumYap('UYGUN', { yas: 25 });
  for (let i = 0; i < 400; i++) {
    const n = kisi(veri, d.seed, `n:${['camlik', 'eski_carsi', 'bezhane', 'marina'][i % 4]}:${i % 40}`);
    const u = flortUygun(d, veri, n);
    if (n.yas < 18 || Math.abs(n.yas - 25) > 16) assert.equal(u, false, `${n.yas}`);
    if (n.yas >= 18 && Math.abs(n.yas - 25) <= 4) assert.equal(u, true, `${n.yas}`);
  }
  const t = tanisilmis('EVLI', 'kordon_mekan', n => ['evli', 'sevgilili'].includes(n.medeni) && n.yas >= 20 && n.yas <= 32, { yas: 26 });
  assert.ok(t, 'evli genç bulunamadı');
  if (t.d.sohbet?.bekleyen) konus({ ...t }, 1);
  t.d.zaman.dakika = t.an;
  const s = sohbetHamlesi(t.d, veri, t.r, 'iltifat');
  assert.ok(s.tamam, s.sebep);
  assert.equal(flortEngeli(t.d, veri, t.n), 'evli');
  assert.ok(t.d.npcler[t.id].bilinen.flortEngel);
  if (t.d.sohbet) assert.ok(!sohbetKonulari(t.d, veri).some(x => ['iltifat', 'takil', 'numara', 'davet'].includes(x.konu)));
});

test('flört: ilgi yüksekse iltifat karşılık bulur, numara verilir, buluşma kurulur ve buluşma oynanır', () => {
  let numara = 0, bulusma = 0, ret = 0;
  for (let i = 0; i < 60; i++) {
    const ayar = { yas: 24, cinsiyet: i % 2 ? 'e' : 'k', cekicilik: 8, karizma: 7 };
    const t = tanisilmis('FLORT' + i, ['kordon_mekan', 'kizil_bar', 'merkez_kantin'][i % 3], n => n.yas >= 19 && n.yas <= 30 && n.cinsiyet !== ayar.cinsiyet, ayar);
    if (!t) continue;
    const { d, id, r } = t;
    if (flortEngeli(d, veri, t.n)) continue;
    const k = d.npcler[id];
    k.iliski.yakinlik = 25; k.iliski.cekim = 30;
    const once = ilgi(d, veri, t.n, k);
    for (const konu of ['iltifat', 'numara', 'davet']) {
      if (!d.sohbet) yaninaOtur(d, veri, r, t.m, kal(t.m, t.an), id);
      d.zaman.dakika = t.an;
      if (!d.sohbet) break;
      if (d.sohbet.bekleyen) { const c = sohbetKonulari(d, veri)[0]; sohbetHamlesi(d, veri, r, c.konu); }
      if (!sohbetKonulari(d, veri).some(x => x.konu === konu)) continue;
      const s = sohbetHamlesi(d, veri, r, konu);
      assert.ok(s.tamam, s.sebep);
      temiz(s.paragraflar);
      assert.ok(s.paragraflar.some(p => p.konusan === 'Sen'), 'senin sözün yazılı');
    }
    if (k.numara) numara++;
    const z = d.zamanlayicilar.find(x => x.olay.startsWith('randevu'));
    if (once < npc.flort.esikler.numara) { assert.ok(!k.numara || k.iliski.cekim > 30); ret++; }
    if (z) {
      bulusma++;
      assert.equal(z.baglam.npc.kisi, id);
      d.zaman.dakika = z.zaman;
      const rr = Rng.akis('R' + i, 'randevu');
      let s = olayBaslat(d, z.olay, veri, rr, z.baglam);
      temiz(s.paragraflar);
      for (let j = 0; !s.bitti && j < 10; j++) {
        const l = olaySecenekleri(d, veri).filter(x => !x.devreDisi);
        s = olaySecenegiSec(d, veri, rr, l[j === 0 ? 0 : l.length - 1 - (j % l.length)].sira);
        temiz(s.paragraflar);
      }
      assert.ok(s.bitti);
    }
  }
  assert.ok(numara >= 5, `numara ${numara}`);
  assert.ok(bulusma >= 3, `buluşma ${bulusma}`);
});

test('insanlar üzerine dedikodu: şablonlar çözülü, konuşan kendini anlatmaz; doğru olanlar kişinin gerçek sırrı/derdi', () => {
  const d = durumYap('DEDI');
  const m = mekanBul(dunya, 'cinaralti_kahvesi');
  d.konum = { semt: m.semt, mekan: m.id };
  let say = 0, turler = new Set();
  for (let i = 0; i < 250; i++) {
    const n = kisi(veri, d.seed, `n:eski_carsi:${i % 40}`);
    const r = Rng.akis('DD' + i, 'x');
    const x = kisiDedikodusu(d, veri, n, m, r);
    if (!x) continue;
    say++;
    assert.ok(!/[«»{}]|undefined|null/.test(x.metin), x.metin);
    assert.notEqual(x.kisi, n.id);
    const t = kisi(veri, d.seed, x.kisi);
    const tur = x.id.split(':')[3];
    turler.add(tur);
    if (tur === 'sir') assert.ok(x.metin.includes(npc.hayat.sirlar.find(s => s.id === t.sir).metin.slice(1, 15)), x.metin);
    if (tur === 'yalan') assert.equal(x.dogru, false);
    d.bilgi.dedikodular[x.id] = { metin: x.metin };
  }
  assert.ok(say > 100, String(say));
  for (const tur of ['sir', 'dert', 'yalan']) assert.ok(turler.has(tur), tur);
});

test('kulak ver: kalabalıkta insanlar hakkında konuşulanları duyarsın; Duyduklarım\'da metniyle görünür', () => {
  const d = durumYap('KULAK');
  const m = mekanBul(dunya, 'cinaralti_kahvesi');
  d.konum = { semt: m.semt, mekan: m.id };
  d.zaman.dakika = 19 * 60;
  const r = Rng.akis('KULAK', 'x');
  for (let i = 0; i < 12; i++) { d.zaman.dakika = 19 * 60 + i * 1440; konum.mekanAksiyonuYap(d, veri, r, 'kulak'); }
  const l = konum.duyulanlar(d, veri);
  assert.ok(l.some(x => x.id.startsWith('p:')), 'insan dedikodusu duyulmadı');
  for (const x of l) assert.ok(x.metin && !/[{}]/.test(x.metin), x.metin);
});

test('yaş dağılımı: mekan müdavimlerinin en az dörtte biri 30 yaşın altında', () => {
  let genc = 0, hepsi = 0;
  for (const m of dunya.mekanlar.mekanlar) for (let i = 0; i < 6; i++) {
    const n = kisi(veri, 'DAGILIM', `n:${m.id}:${i}`);
    if (!n) continue;
    hepsi++; if (n.yas < 30) genc++;
  }
  assert.ok(genc / hepsi >= 0.25, `${genc}/${hepsi}`);
});
