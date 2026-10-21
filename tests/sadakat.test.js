// Sadakat, gizli ilişki ve tekrar yanına oturmak (3.13)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import { kisi, mekandakiler, tanisildiMi } from '../js/core/insanlar.js';
import { tanis, yaninaOtur, sohbetKonulari, sohbetHamlesi, flortHamleleri, flortEngeli, kisiDedikodusu, randevuKur, ilgi } from '../js/core/sohbet.js';
import { acikligTaban, aciklik, sadakatTipi, partnerli, gizliIliskiGunu } from '../js/core/sadakat.js';
import { derinlik } from '../js/core/kart.js';
import { kisiGuncel, bilinenOlaylar } from '../js/core/npchayat.js';
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
const semtler = dunya.semtler.semtler.map(s => s.id);

function oturum(seed, kosul, { cinsiyet = 'e', mekanId = 'kordon_mekan' } = {}) {
  const d = yeniDurum(veri.sim, { seed, baslangic: '2026-10-20', saat: 20, para: 20000, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' }, karakter: { ad: 'Deniz', dogum: '1996-03-01', cinsiyet, fizik: { cekicilik: 8, karizma: 7 } } });
  const m = mekanBul(dunya, mekanId);
  d.konum = { semt: m.semt, mekan: m.id };
  const r = Rng.akis(seed, 'y');
  for (let g = 0; g < 30; g++) {
    d.zaman.dakika = g * 1440 + 20 * 60;
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
const esle = (d, n) => n.yas >= 20 && n.yas <= 40 && n.cinsiyet !== d.karakter.cinsiyet && !flortEngeli(d, veri, n);

test('sadakat tipleri: kişinin kartından; dört tip de var; sadakat değeri ve inanç sadık yapar, kötü evlilik açar', () => {
  const tipler = {};
  let sadakatliSadik = 0, sadakatli = 0, gergin = 0, gerginAcik = 0;
  for (let i = 0; i < 3000; i++) {
    const n = kisi(veri, 'SAD', `n:${semtler[i % semtler.length]}:${i % 45}`);
    if (!partnerli(n)) { assert.equal(acikligTaban('SAD', n, veri), 100); continue; }
    const a = acikligTaban('SAD', n, veri), tip = sadakatTipi(a);
    tipler[tip] = (tipler[tip] ?? 0) + 1;
    const d = derinlik('SAD', n, veri);
    if (d.degerIdler.includes('sadakat')) { sadakatli++; if (tip === 'sadik') sadakatliSadik++; }
    if (n.sir === 'sevmiyor' || n.dert === 'evlilik_soguk') { gergin++; if (a >= 45) gerginAcik++; }
  }
  for (const t of ['sadik', 'kararsiz', 'acik', 'atesli']) assert.ok(tipler[t] > 10, JSON.stringify(tipler));
  assert.ok(sadakatliSadik / sadakatli > 0.6, `${sadakatliSadik}/${sadakatli}`);
  assert.ok(gerginAcik / gergin > 0.4, `${gerginAcik}/${gergin}`);
});

test('kapı yok: evli/sevgilili flörtte hayatındaki kişiyi anar, flört seçenekleri kalır; sadık sınır çizer, ısrar gerer', () => {
  let sadikGorulen = 0, acikGorulen = 0;
  for (let i = 0; i < 80 && (sadikGorulen < 2 || acikGorulen < 2); i++) {
    const t = oturum('KAPI' + i, (n, d) => partnerli(n) && esle(d, n));
    if (!t) continue;
    const tip = sadakatTipi(aciklik(t.d, veri, t.n, t.k));
    const once = t.k.iliski.gerginlik ?? 0;
    let sinir = 0;
    for (let j = 0; j < 4 && t.d.sohbet; j++) {
      t.d.sohbet.kullanilan = {}; t.d.sohbet.bekleyen = null; t.k.iltifatGun = {};
      const s = sohbetHamlesi(t.d, veri, t.r, j % 2 ? 'takil' : 'iltifat');
      assert.ok(s.tamam, s.sebep);
      s.paragraflar.forEach(p => temiz(p.metin));
      if (s.paragraflar.some(p => npc.flort.partnerSinir.includes(p.metin) || npc.flort.partnerIsrar.includes(p.metin))) sinir++;
    }
    assert.ok(t.k.bilinen.partnerVar);
    t.k.iltifatGun = {};
    if (t.d.sohbet) { t.d.sohbet.kullanilan = {}; t.d.sohbet.bekleyen = null; }
    if (t.d.sohbet) assert.ok((sohbetKonulari(t.d, veri).some(x => x.konu === 'flort') && flortHamleleri(t.d, veri, t.n, t.k).length) || t.k.sinirSayisi >= 3, 'flört seçenekleri kapandı');
    if (tip === 'sadik' && sinir) { sadikGorulen++; if (t.k.sinirSayisi >= 3) assert.ok((t.k.iliski.gerginlik ?? 0) > once); }
    if (tip !== 'sadik') acikGorulen++;
  }
  assert.ok(sadikGorulen >= 1 && acikGorulen >= 1, `${sadikGorulen} sadık, ${acikGorulen} açık`);
});

test('gizli ilişki: numara ve buluşma gizli olur; gizli buluşma ve "öğrendi" olayı baştan sona; ondan ayrılırsa boşanmış olur', () => {
  let tamam = false;
  for (let i = 0; i < 60 && !tamam; i++) {
    const t = oturum('GIZ' + i, (n, d) => n.medeni === 'evli' && esle(d, n));
    if (!t) continue;
    t.k.iliski.cekim = 80; t.k.iliski.yakinlik = 50;
    if (ilgi(t.d, veri, t.n, t.k) < npc.flort.esikler.davet) continue;
    t.d.sohbet.kullanilan = {};
    sohbetHamlesi(t.d, veri, t.r, 'numara');
    assert.ok(t.k.numara && t.k.gizli);
    t.d.sohbet.kullanilan = {}; t.d.sohbet.bekleyen = null;
    sohbetHamlesi(t.d, veri, t.r, 'davet');
    const z = t.d.zamanlayicilar.find(x => x.olay.startsWith('randevu'));
    assert.ok(z, 'buluşma kurulmadı');
    // Ateşli olan arada herkesin içinde de buluşur; gizli olanı ayrıca dene
    for (const [olay, baglam] of [[z.olay, z.baglam], ['randevu_gizli', { ...z.baglam, degisken: { kisi: { ...z.baglam.degisken.kisi, esAd: z.baglam.degisken.kisi.esAd ?? 'Ayşe' } } }]]) {
      for (let s = 0; s < 3; s++) {
        const dd = structuredClone(t.d);
        dd.aktifOlay = null;
        const rr = Rng.akis(`gr${i}${s}`, 'x');
        let x = olayBaslat(dd, olay, veri, rr, baglam);
        x.paragraflar.forEach(p => temiz(p.metin));
        for (let j = 0; !x.bitti && j < 8; j++) { const l = olaySecenekleri(dd, veri).filter(y => !y.devreDisi); x = olaySecenegiSec(dd, veri, rr, l[(s + j) % l.length].sira); x.paragraflar.forEach(p => temiz(p.metin)); }
        assert.ok(x.bitti);
      }
    }
    // Öğrendi: ayrıl seçeneği başarıyla → boşanmış
    const b = { npc: { kisi: t.id }, degisken: { kisi: { ad: t.n.hitapAdi, esAd: 'Ayşe', partner: 'eşi' } } };
    let ayrildi = false;
    for (let s = 0; s < 30 && !ayrildi; s++) {
      const dd = structuredClone(t.d);
      dd.aktifOlay = null;
      const rr = Rng.akis('or' + s, 'x');
      let x = olayBaslat(dd, 'gizli_ortaya_cikti', veri, rr, b);
      x.paragraflar.forEach(p => temiz(p.metin));
      for (let j = 0; !x.bitti && j < 6; j++) { const l = olaySecenekleri(dd, veri); x = olaySecenegiSec(dd, veri, rr, l[j === 0 ? s % l.length : 0].sira); x.paragraflar.forEach(p => temiz(p.metin)); }
      if (dd.npcler[t.id].degisim?.partnerdenAyrildi) {
        ayrildi = true;
        assert.equal(kisiGuncel(dd, veri, t.id).medeni, 'bosanmis');
        assert.ok(bilinenOlaylar(dd, veri, t.id).some(o => o.metin === 'Senin için ilişkisini bitirdi.'));
        assert.equal(dd.npcler[t.id].iliskiTuru, 'sevgili');
      }
    }
    assert.ok(ayrildi, 'kimse ayrılmadı');
    tamam = true;
  }
  assert.ok(tamam, 'uygun evli biri bulunamadı');
});

test('risk birikirse ortaya çıkar; mahalle dedikodusu seninle ilgili konuşur', () => {
  const d = yeniDurum(veri.sim, { seed: 'RISK', baslangic: '2026-10-20', ev: { semt: 'camlik', tip: 'oda', ad: 'oda' }, karakter: { ad: 'Deniz', dogum: '1996-03-01', cinsiyet: 'e' } });
  d.npcler ??= {};
  let id = null;
  for (let i = 0; i < 400 && !id; i++) { const x = `n:eski_carsi:${i % 40}`; if (partnerli(kisi(veri, 'RISK', x))) id = x; }
  d.npcler[id] = { iliski: { risk: 20, cekim: 40 }, anilar: [], tanisildi: 0, gizli: true };
  let cikti = false;
  for (let g = 1; g < 200 && !cikti; g++) cikti = gizliIliskiGunu(d, veri, g, Rng.akis('rk' + g, 'x')).includes(id);
  assert.ok(cikti);
  // dedikodu: konuşan bu kişinin tanıdığı olmalı; birkaç kişiyle dene
  const m = mekanBul(dunya, 'cinaralti_kahvesi');
  let seninle = false;
  for (let i = 0; i < 40 && !seninle; i++) {
    const n = kisi(veri, 'RISK', `n:eski_carsi:${i}`);
    for (let j = 0; j < 30 && !seninle; j++) {
      const x = kisiDedikodusu(d, veri, n, m, Rng.akis(`s${i}${j}`, 'x'));
      if (!x) continue;
      if (x.id.endsWith(':seninle')) { seninle = true; temiz(x.metin); }
      (d.bilgi.dedikodular ??= {})[x.id] = {};
    }
  }
  assert.ok(seninle, 'gizli ilişki dedikodusu çıkmadı');
});

test('tekrar yanına oturmak: sen kalktıysan ilgisine göre karşılar, ikinci dönüşte meşgul; o kalktıysa meşgul; aynı gün başka selam', () => {
  const t = oturum('OTUR', n => n.yas >= 18);
  const { d, id, m, kal, r } = t;
  sohbetHamlesi(d, veri, r, 'bitir');
  assert.equal(d.sohbet, undefined);
  const s1 = yaninaOtur(d, veri, r, m, kal, id);
  assert.ok(s1.tamam && d.sohbet?.npc === id);
  const sb = npc.sohbet.tekrarOturma;
  const soz = s1.paragraflar.filter(p => p.tur === 'konusma').map(p => p.metin.replace(/, [a-zçğıöşü]+([.!?])$/, '$1'));
  const havuz = [...Object.values(sb.sevindi).flat(), ...Object.values(sb.sikildi).flat()];
  assert.ok(soz.some(x => havuz.some(h => x.startsWith(h.slice(0, 12)))), soz.join(' | '));
  sohbetHamlesi(d, veri, r, 'bitir');
  const s2 = yaninaOtur(d, veri, r, m, kal, id);
  assert.equal(d.sohbet, undefined, 'ikinci dönüşte de oturdu');
  assert.ok(s2.paragraflar.some(p => sb.mesgul.some(x => p.metin === x.replace('{s.ad}', t.n.hitapAdi))));
  // Saatler sonra aynı gün: "bugün" selamı
  d.zaman.dakika += 150;
  if (tanisildiMi(d, id) && mekandakiler(d, veri, m, kal).includes(id)) {
    const s3 = yaninaOtur(d, veri, r, m, kal, id);
    s3.paragraflar.forEach(p => temiz(p.metin));
  }
});

test('buluşma: partneri olanla gizli buluşma kurulur, eşinin adı bağlamda', () => {
  for (let i = 0; i < 40; i++) {
    const t = oturum('BUL' + i, (n, d) => n.medeni === 'evli' && esle(d, n));
    if (!t) continue;
    t.d.zamanlayicilar = [];
    randevuKur(t.d, veri, t.id, t.n, t.k);
    const z = t.d.zamanlayicilar[0];
    if (z.olay === 'randevu_gizli') { assert.ok(z.baglam.degisken.kisi.esAd && z.baglam.degisken.kisi.esAd !== 'eşi'); return; }
    assert.equal(sadakatTipi(aciklik(t.d, veri, t.n, t.k)), 'atesli');
  }
  assert.fail('gizli buluşma kurulmadı');
});
