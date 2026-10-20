import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { karakterUret, hikayeyiUygula, hikayeVeriDogrula, arketipYasAraligi, OYUNCU } from '../js/core/hikaye.js';
import { SIMDIKI_YIL } from '../js/core/npc.js';
import { olayYili } from '../js/core/dunya.js';
import { yeniDurum } from '../js/core/durum.js';
import { bayrakAl } from '../js/core/bayrak.js';
import { tanidiklarim } from '../js/core/insanlar.js';

const oku = y => JSON.parse(readFileSync(new URL('../' + y, import.meta.url)));
const dunya = {};
for (const f of ['sehir', 'semtler', 'figurler', 'mekanlar', 'orgutler']) dunya[f] = oku(`data/dunya/${f}.json`);
const veri = {
  dunya, ekonomi: oku('data/ekonomi.json'), sim: oku('data/simulasyon.json'),
  npc: { isimler: oku('data/npc/isimler.json'), memleket: oku('data/npc/memleket.json'), kisilik: oku('data/npc/kisilik.json'), hayat: oku('data/npc/hayat.json'), gorunus: oku('data/npc/gorunus.json') },
  hikaye: { arketipler: oku('data/hikaye/arketipler.json'), bilesenler: oku('data/hikaye/bilesenler.json') },
};
const A = veri.hikaye.arketipler.arketipler;
const N = 2500;
const karakterler = Array.from({ length: N }, (_, i) => karakterUret('HK-' + i, {}, veri));
// Her arketipten de en az 40 tane (nadirler rastgele dağılımda az çıkar)
const arketipBasina = A.flatMap(a => Array.from({ length: 40 }, (_, i) => karakterUret(`HA-${a.id}-${i}`, { arketip: a.id }, veri)));
const hepsi = [...karakterler, ...arketipBasina];
const metinleri = k => [...k.hikaye.zincir.map(z => z.metin), ...k.hikaye.iplikler.map(i => i.metin), ...k.hikaye.sirlar, ...k.hikaye.anilar];

test('hikâye verisi tutarlı (arketipler, kancalar, semtler, NPC kimlikleri, şablon değişkenleri)', () => {
  assert.deepEqual(hikayeVeriDogrula(veri), []);
});

test('belirlenimli: aynı seed aynı karakter; başka seed başka karakter', () => {
  assert.deepEqual(karakterUret('AYNI', {}, veri), karakterUret('AYNI', {}, veri));
  assert.notDeepEqual(karakterUret('AYNI', {}, veri).karakter, karakterUret('BASKA', {}, veri).karakter);
});

test(`tutarlılık (${hepsi.length} karakter): yaş, yıllar, kancalar, şablonlar`, () => {
  const cizelge = dunya.sehir.zamanCizelgesi;
  for (const k of hepsi) {
    const a = A.find(x => x.id === k.hikaye.arketip);
    const y = `${k.hikaye.arketip} ${k.karakter.tamAd}`;
    const dogumYili = Number(k.karakter.dogum.slice(0, 4));
    const yas = SIMDIKI_YIL - dogumYili;
    const [en, ust] = arketipYasAraligi(a, dunya);
    assert.ok(yas >= en && yas <= ust, `${y}: yaş ${yas}, aralık ${en}–${ust}`);
    assert.ok(yas >= 18, `${y}: reşit değil`);
    for (const kk of a.kancalar || []) {
      const olay = cizelge.find(o => (o.kancalar || []).includes(kk.kanca));
      assert.ok(olayYili(olay) - dogumYili >= kk.olaydaYas, `${y}: ${kk.kanca} olayında ${olayYili(olay) - dogumYili} yaşında`);
      assert.ok(k.karakter.kancalar.includes(kk.kanca));
    }
    // Zincir: eskiden yeniye, gelecekte değil, doğumdan sonra, yaş alt sınırları tutuyor
    let onceki = -Infinity;
    k.hikaye.zincir.forEach((z, i) => {
      assert.ok(z.yil >= onceki && z.yil <= SIMDIKI_YIL, `${y}: zincir[${i}] yılı ${z.yil}`);
      assert.ok(z.yil - dogumYili >= 0, `${y}: zincir[${i}] doğumdan önce`);
      const kural = a.zincir[i];
      if (kural.yasMin !== undefined) assert.ok(z.yil - dogumYili >= kural.yasMin, `${y}: zincir[${i}] ${z.yil - dogumYili} yaşında (en az ${kural.yasMin})`);
      if (kural.yil !== undefined) assert.equal(z.yil, kural.yil, `${y}: zincir[${i}] sabit yıl kaydı`);
      onceki = z.yil;
    });
    assert.equal(k.hikaye.zincir.length, a.zincir.length);
    for (const m of metinleri(k)) {
      assert.ok(!/[{}«»]|\[\[/.test(m), `${y}: çözülmemiş şablon: ${m}`);
      assert.ok(m.length > 10 && /^[A-ZÇĞİÖŞÜ0-9'"]/.test(m), `${y}: metin büyük harfle başlamalı: ${m}`);
    }
    assert.deepEqual(k._uyarilar, [], y);
  }
});

test('karakter ve aile tutarlı: medeni hal, çocuk, eski eş, ebeveynler', () => {
  for (const k of hepsi) {
    const y = `${k.hikaye.arketip} ${k.karakter.tamAd}`;
    const c = k.karakter, aile = c.aile;
    const bag = new Set(k.hikaye.baglantilar.map(b => b.rol));
    assert.ok(['bekar', 'bosanmis', 'dul'].includes(aile.medeni), `${y}: ${aile.medeni}`);
    if (bag.has('eski_es')) assert.equal(aile.medeni, 'bosanmis');
    assert.equal(aile.cocuk > 0, bag.has('cocuk'), `${y}: çocuk ${aile.cocuk}`);
    if (bag.has('anne')) assert.equal(aile.anne.yasiyor, true);
    if (bag.has('baba')) assert.equal(aile.baba.yasiyor, true);
    if (bag.has('kardes')) assert.ok(aile.kardes >= 1);
    if (k.hikaye.arketip === 'yetistirme_yurdu') assert.equal(aile.anne.bilinmiyor, true);
    if (/kardeş/.test(metinleri(k).join(' ')) && !aile.anne.bilinmiyor) assert.ok(aile.kardes >= 1, `${y}: kardeşten söz ediliyor ama kardeşi yok`);
    if (Number(c.dogum.slice(0, 4)) >= 1995) assert.notEqual(c.egitim, 'ilkokul', `${y}: kuşağına göre eğitim`);
    assert.notEqual(c.yore, 'yurtdisi');
    assert.equal(c.cinsiyet === 'k' && k.hikaye.arketip === 'sakat_sporcu', false);
    const a = A.find(x => x.id === k.hikaye.arketip);
    if (a.egitim) assert.ok(a.egitim.includes(c.egitim), `${y}: eğitim ${c.egitim}`);
    assert.ok(a.eskiMeslek.includes(c.eskiMeslek));
    assert.ok(c.fizik && c.fizik.cekicilik >= 1 && c.fizik.cekicilik <= 10);
    assert.ok(c.ad && c.soyad);
  }
});

test('bağlantılar gerçek NPC: aile soyadı ortak, yaş farkı, cinsiyet kuralı, şehir içi/dışı', () => {
  for (const k of hepsi) {
    const a = A.find(x => x.id === k.hikaye.arketip);
    const y = `${k.hikaye.arketip} ${k.karakter.tamAd}`;
    for (const b of k._baglantilar) {
      const kural = a.baglantilar.find(x => x.rol === b.rol);
      if (b.figur) { assert.ok(b.id.startsWith('f:')); continue; }
      assert.equal(b.id, 'k:' + b.rol);
      const s = b.sablon;
      if (kural.aile) assert.equal(s.soyad, k.karakter.soyad, `${y}: ${b.rol} soyadı`);
      if (kural.cinsiyet === 'ayni') assert.equal(s.cinsiyet, k.karakter.cinsiyet);
      if (kural.cinsiyet === 'karsi') assert.notEqual(s.cinsiyet, k.karakter.cinsiyet);
      if (kural.cinsiyet === 'e' || kural.cinsiyet === 'k') assert.equal(s.cinsiyet, kural.cinsiyet);
      const yas = SIMDIKI_YIL - Number(k.karakter.dogum.slice(0, 4));
      if (kural.cocukMu) assert.ok(s.yas >= 1 && yas - s.yas >= 20, `${y}: çocuk ${s.yas}, sen ${yas}`);
      else if (s.yas > 17 && s.yas < 92) assert.ok(s.yas - yas >= kural.yasFarki[0] && s.yas - yas <= kural.yasFarki[1], `${y}: ${b.rol} yaş farkı`);
      if (b.nerede === 'karaliman') assert.ok(dunya.semtler.semtler.some(x => x.id === s.semt), `${y}: ${b.rol} semti ${s.semt}`);
      else assert.equal(s.semt, undefined);
    }
  }
});

test('para ve borçlar: AÜ oranlarından ₺, alacaklı NPC\'ler var, nakit en az alt sınır', () => {
  const AU = veri.ekonomi.asgariUcret;
  for (const k of hepsi) {
    const a = A.find(x => x.id === k.hikaye.arketip);
    assert.ok(k.para >= veri.hikaye.bilesenler.paraEnAz * AU * 0.95, `${k.hikaye.arketip}: para ${k.para}`);
    assert.ok(k.para <= Math.max(...a.para) * AU * 1.05);
    for (const b of k.hikaye.borclar) {
      const kural = a.borclar.find(x => x.ad === b.ad);
      assert.ok(b.tutar >= kural.miktar[0] * AU * 0.95 && b.tutar <= kural.miktar[1] * AU * 1.05, `${b.ad}: ${b.tutar}`);
    }
    assert.ok(k.hikaye.iplikler.length >= 1);
    assert.ok(k.hikaye.gucluYanlar.length >= 1 && k.hikaye.kusurlar.length >= 1, k.hikaye.arketip);
    assert.ok(k.hikaye.icSes.ornekler.length >= 2);
  }
});

test('çeşitlilik: her arketip çıkıyor, nadirler nadir, aynı arketip farklı hikâyeler', () => {
  const sayim = {};
  for (const k of karakterler) sayim[k.hikaye.arketip] = (sayim[k.hikaye.arketip] ?? 0) + 1;
  for (const a of A) assert.ok(sayim[a.id] > 0, `${a.id} hiç çıkmadı`);
  const nadir = A.filter(a => a.nadir).reduce((t, a) => t + sayim[a.id], 0);
  assert.ok(nadir / N < 0.05, `nadirler %${Math.round(nadir / N * 100)}`);
  for (const a of A) {
    const ornek = arketipBasina.filter(k => k.hikaye.arketip === a.id);
    const farkli = new Set(ornek.map(k => k.hikaye.zincir.map(z => z.metin).join('|')));
    assert.ok(farkli.size >= 10, `${a.id}: 40 karakterde yalnızca ${farkli.size} farklı hikâye`);
  }
  const tonlar = new Set(karakterler.map(k => k.hikaye.icSes.ton));
  assert.equal(tonlar.size, Object.keys(veri.hikaye.bilesenler.icSes).length);
});

test('seçim: tip, cinsiyet ve ad tutuluyor', () => {
  for (let i = 0; i < 200; i++) {
    const k = karakterUret('SC-' + i, { tip: i % 2 ? 'dipten' : 'zirveden', cinsiyet: 'k', ad: 'Nazlı' }, veri);
    assert.equal(k.hikaye.tip, i % 2 ? 'dipten' : 'zirveden');
    assert.equal(k.karakter.cinsiyet, 'k');
    assert.equal(k.karakter.ad, 'Nazlı');
  }
});

test('hikâye yeni oyuna işlenir: bağlantılar Tanıdıklarım\'da, bayraklar kalıcı, oyuncu NPC kaydında değil', () => {
  const k = karakterUret('UYGULA', { arketip: 'tahliye' }, veri);
  const d = yeniDurum(veri.sim, { seed: 'UYGULA', baslangic: '2026-10-20', karakter: k.karakter, para: k.para, ev: k.ev });
  hikayeyiUygula(d, k);
  assert.equal(d.hikaye.arketip, 'tahliye');
  assert.equal(bayrakAl(d, 'sabika'), true);
  assert.equal(d.npcler?.[OYUNCU], undefined);
  const t = tanidiklarim(d, veri);
  assert.equal(t.length, k.hikaye.baglantilar.length);
  for (const x of t) assert.ok(x.ad && x.tanim, x.id);
  assert.ok(JSON.stringify(d).length < 40000);
});
