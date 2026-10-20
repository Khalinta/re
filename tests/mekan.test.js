import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dunyaDogrula } from '../js/core/dunya.js';
import { mekanBul, acikMi, kalabalik, semtMekanlari, konuDedikodulari, figurMekanlari } from '../js/core/mekan.js';
import { orgutUyeleri } from '../js/core/toplum.js';
import { saatDakika as S } from '../js/core/ulasim.js';
import { ek } from '../js/core/tr.js';

const oku = f => JSON.parse(readFileSync(new URL(`../data/dunya/${f}.json`, import.meta.url)));
const dunya = {};
for (const f of ['sehir', 'semtler', 'ulasim', 'kurumlar', 'sirketler', 'figurler', 'orgutler', 'mekanlar']) dunya[f] = oku(f);
const semtIdler = dunya.sehir.semtler.map(s => s.id);
const mekanlar = dunya.mekanlar.mekanlar;
const PAZAR = 0, PAZARTESI = 1, SALI = 2, CARSAMBA = 3, CUMARTESI = 6;

test('mekanlar tutarlı (sahipler, saatler, müşteriler, dedikodu konuları, gizli bağlar)', () => {
  assert.deepEqual(dunyaDogrula(dunya), []);
});

test('mekan denetimi gerçekten hata yakalıyor', () => {
  const b = structuredClone(dunya);
  const m = id => b.mekanlar.mekanlar.find(x => x.id === id);
  m('hunkar_lokantasi').sahip = { figur: 'yok_biri', tohum: m('hunkar_lokantasi').sahip.tohum };
  m('gar_palas_lobi').gizli = undefined;
  m('kizil_bar').saatler = { acilis: '22:00', kapanis: '21:00' };
  m('kizil_bar').kapaliGunler = [0, 1, 2, 3, 4, 5, 6];
  m('sahaf_kemal').yer = 'kordon';
  m('sefa_bakkal').dedikodular[0].konu = 'figur:hayalet';
  m('sefa_bakkal').musteri.push('uzayli');
  b.mekanlar.mekanlar = b.mekanlar.mekanlar.filter(x => !['koy_kahvesi_mekan', 'eski_ilica_hamami'].includes(x.id));
  const h = dunyaDogrula(b);
  for (const beklenen of ['sahip tam olarak bir tane', 'karakaslar paravanı; gizli.orgut aynı olmalı', 'açılış/kapanış biçimi', 'en az bir gün açık', '"kordon" camlik semtinin ünlü yerlerinden değil',
    'konu geçersiz "figur:hayalet"', 'bilinmeyen müşteri türü "uzayli"', 'semt ilicakoy: en az iki mekan']) {
    assert.ok(h.some(x => x.includes(beklenen)), beklenen + '\n' + h.join('\n'));
  }
});

test('açık mı: kapalı günler, gece yarısını geçen saatler, haftada bir kurulan pazar, sürekli açık yerler', () => {
  const hunkar = mekanBul(dunya, 'hunkar_lokantasi');
  assert.equal(acikMi(hunkar, S('12:00'), SALI), true);
  assert.equal(acikMi(hunkar, S('12:00'), PAZAR), false);
  assert.equal(acikMi(hunkar, S('18:00'), SALI), false);
  const kavala = mekanBul(dunya, 'kavala_meyhanesi'); // 17:00–02:00, pazartesi kapalı
  assert.equal(acikMi(kavala, S('01:00'), PAZAR), true);       // cumartesi gecesinin devamı
  assert.equal(acikMi(kavala, S('01:00'), SALI), false);       // pazartesi gecesi kapalıydı
  assert.equal(acikMi(kavala, S('03:00'), PAZAR), false);
  assert.equal(acikMi(kavala, S('20:00'), PAZARTESI), false);
  const pazar = mekanBul(dunya, 'carsamba_pazari');
  assert.equal(acikMi(pazar, S('10:00'), CARSAMBA), true);
  assert.equal(acikMi(pazar, S('10:00'), CUMARTESI), false);
  assert.equal(acikMi(mekanBul(dunya, 'gece_doner'), S('04:00'), PAZARTESI), true);
  assert.equal(acikMi(mekanBul(dunya, 'neon_kulup'), S('03:30'), PAZAR), true); // cumartesi 22:00–04:00
  assert.equal(kalabalik(mekanBul(dunya, 'neon_kulup'), S('03:30'), PAZAR), 3);
  assert.equal(kalabalik(hunkar, S('20:00'), SALI), null);
});

test('her semtte sabah ve akşam açık bir yer var; gece en azından istasyonda bir şey açık', () => {
  for (const s of semtIdler) {
    assert.ok(semtMekanlari(dunya, s, { t: S('09:30'), haftaGunu: SALI }).length, `${s} sabah`);
    assert.ok(semtMekanlari(dunya, s, { t: S('20:00'), haftaGunu: SALI }).length, `${s} akşam`);
  }
  assert.ok(semtMekanlari(dunya, 'istasyon', { t: S('04:00'), haftaGunu: CARSAMBA }).length >= 2);
  assert.ok(semtMekanlari(dunya, 'eski_carsi', { hizmet: 'yemek' }).some(m => m.id === 'hunkar_lokantasi'));
});

test('her örgüt keşfedilebilir: gizli bağlı bir mekanı ve onu ele veren doğru bir dedikodu var', () => {
  for (const o of dunya.orgutler.orgutler) {
    assert.ok(mekanlar.some(m => m.gizli?.orgut === o.id), `${o.id} mekanı`);
    const konular = new Set([`orgut:${o.id}`, ...orgutUyeleri(dunya, o.id).map(f => `figur:${f.id}`)]);
    assert.ok(mekanlar.some(m => m.dedikodular.some(d => d.dogru && konular.has(d.konu))), `${o.id} dedikodusu`);
  }
});

test('dedikodular: doğru ve yanlışlar karışık; bir konu birden çok yerde konuşulabiliyor', () => {
  const hepsi = mekanlar.flatMap(m => m.dedikodular);
  const yanlis = hepsi.filter(d => !d.dogru).length;
  assert.ok(yanlis / hepsi.length >= 0.25 && yanlis / hepsi.length <= 0.5, `${yanlis}/${hepsi.length}`);
  assert.ok(new Set(konuDedikodulari(dunya, 'figur:kaan_tanriverdi').map(d => d.mekan)).size >= 2);
  assert.ok(figurMekanlari(dunya, 'riza_kocabas').length >= 2);
});

test('gizli bağlar mekanların açık metinlerinde sızmıyor', () => {
  const adlar = dunya.orgutler.orgutler.map(o => o.ad);
  for (const m of mekanlar) for (const a of adlar) assert.ok(![m.ad, m.tasvir, m.gecmis].some(x => x.includes(a)), `${m.id}: ${a}`);
});

test('mekan adları ek motoruyla doğru çekimleniyor', () => {
  const de = id => { const m = mekanBul(dunya, id); return ek(m.ad, 'de', { iyelik: m.iyelik }); };
  assert.equal(de('cinaralti_kahvesi'), "Çınaraltı Kahvesi'nde");
  assert.equal(de('lacivert_restoran'), "Lacivert'te");
  assert.equal(de('muhtarlik'), "Kayalıtepe Muhtarlığı'nda");
  assert.equal(de('usta_rifki'), "Usta Rıfkı Oto Tamir'de");
  assert.equal(de('neon_kulup'), "Neon'da");
  assert.equal(de('fener_cay_ocagi'), "Fener Çay Ocağı'nda");
});
