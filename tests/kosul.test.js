import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import { bayrakKoy, bayrakAl, bayrakKaldir, sureliTemizle, sayacEkle, sayacAl, bayrakKalanSure } from '../js/core/bayrak.js';
import { kosulTutar, kosulAcikla, nedenTutmadi, aciklamaMetni, kosulDogrula, kuralTut, yolAl } from '../js/core/kosul.js';
import { zarfla, zarfAc } from '../js/core/kayitbicim.js';

const sim = JSON.parse(readFileSync(new URL('../data/simulasyon.json', import.meta.url)));
const takvim = JSON.parse(readFileSync(new URL('../data/takvim.json', import.meta.url)));
// 20 Ekim 2026 Salı, 08:00
const yeni = (saat = 8, baslangic = '2026-10-20') => yeniDurum(sim, { seed: 'KOSL-0001', baslangic, saat, para: 2000 });
const ctx = (d, baglam = {}) => ({ durum: d, veri: { sim, takvim }, baglam });
const tutar = (k, d, b) => kosulTutar(k, ctx(d, b));

test('kural eşleme', () => {
  assert.equal(kuralTut(5, 5).tamam, true);
  assert.equal(kuralTut(5, { min: 3, max: 5 }).tamam, true);
  assert.equal(kuralTut(6, { min: 3, max: 5 }).tamam, false);
  assert.equal(kuralTut(undefined, { min: 0 }).tamam, false, 'yok olan değer sayısal kuralı geçemez');
  assert.equal(kuralTut('asci', ['asci', 'garson']).tamam, true);
  assert.equal(kuralTut('asci', { degil: 'asci' }).tamam, false);
  assert.equal(kuralTut(undefined, { var: false }).tamam, true);
  assert.equal(kuralTut('2026-11-02', { min: '2026-11-01' }).tamam, true);
  assert.equal(yolAl({ a: { b: { c: 3 } } }, 'a.b.c'), 3);
  assert.equal(yolAl({ a: null }, 'a.b.c'), undefined);
});

test('bayraklar: kalıcı, süreli, NPC\'ye özel; sayaçlar', () => {
  const d = yeni();
  bayrakKoy(d, 'mutfak_yangini');
  assert.equal(bayrakAl(d, 'mutfak_yangini'), true);
  bayrakKoy(d, 'kirgin', 2, { sure: 60 * 24 });
  assert.equal(bayrakAl(d, 'kirgin'), 2);
  assert.equal(bayrakKalanSure(d, 'kirgin'), 1440);
  d.zaman.dakika += 1440;
  assert.equal(bayrakAl(d, 'kirgin'), undefined, 'süresi dolan bayrak yok sayılır');
  sureliTemizle(d);
  assert.deepEqual(d.bayraklar.sureli, {});
  bayrakKoy(d, 'sirrini_biliyor', true, { npc: 417 });
  assert.equal(bayrakAl(d, 'sirrini_biliyor', { npc: 417 }), true);
  assert.equal(bayrakAl(d, 'sirrini_biliyor'), undefined, 'NPC bayrağı genel bayrağa karışmaz');
  bayrakKaldir(d, 'sirrini_biliyor', { npc: 417 });
  assert.deepEqual(d.bayraklar.npc, {}, 'boşalan NPC bölümü silinir');
  assert.equal(sayacEkle(d, 'kahve'), 1);
  assert.equal(sayacEkle(d, 'kahve', 2), 3);
  assert.equal(sayacEkle(d, 'borc', 500, { npc: 'npc:12' }), 500);
  assert.equal(sayacAl(d, 'borc', { npc: 'npc:12' }), 500);
  assert.equal(sayacAl(d, 'yok'), 0);
  // Kayıt gidiş-dönüşünde bozulmuyor
  assert.deepEqual(zarfAc(zarfla(d)).bayraklar, d.bayraklar);
});

test('durum, para, beceri', () => {
  const d = yeni();
  d.durumlar.enerji = 12;
  assert.equal(tutar({ durum: { enerji: { min: 20 } } }, d), false);
  assert.equal(tutar({ durum: { enerji: { max: 20 }, aclik: { max: 90 } } }, d), true);
  assert.equal(tutar({ para: { min: 2000 } }, d), true);
  assert.equal(tutar({ para: { min: 2001 } }, d), false);
  assert.equal(tutar({ beceri: { yemek: { min: 1 } } }, d), false);
  d.beceriler.yemek = 35;
  assert.equal(tutar({ beceri: { yemek: { min: 30 } } }, d), true);
});

test('ve / veya / değil, dizi kısayolu, çok anahtarlı nesne', () => {
  const d = yeni();
  const ac = { durum: { aclik: { min: 70 } } };
  const zengin = { para: { min: 1000 } };
  assert.equal(tutar({ ve: [ac, zengin] }, d), false);
  assert.equal(tutar({ veya: [ac, zengin] }, d), true);
  assert.equal(tutar({ degil: ac }, d), true);
  assert.equal(tutar([zengin, { degil: ac }], d), true);
  assert.equal(tutar({ para: { min: 1000 }, durum: { aclik: { min: 70 } } }, d), false);
  assert.equal(tutar(undefined, d), true);
  assert.equal(tutar(false, d), false);
  assert.equal(tutar({ veya: [{ ve: [ac, zengin] }, { degil: { degil: zengin } }] }, d), true);
});

test('zaman: dilim, saat (gece yarısını aşan), gün, hafta sonu, mevsim, tarih, oyun günü', () => {
  const d = yeni(8); // Salı 08:00
  assert.equal(tutar({ zamanDilimi: 'sabah' }, d), true);
  assert.equal(tutar({ zamanDilimi: ['ogle', 'aksam'] }, d), false);
  assert.equal(tutar({ saat: { min: '07:30', max: '09:00' } }, d), true);
  assert.equal(tutar({ saat: { min: '22:00', max: '03:00' } }, d), false);
  const gece = yeni(1);
  assert.equal(tutar({ saat: { min: '22:00', max: '03:00' } }, gece), true);
  assert.equal(tutar({ gun: 'sali' }, d), true);
  assert.equal(tutar({ haftaSonu: true }, d), false);
  const ctsi = yeni(8, '2026-10-24');
  assert.equal(tutar({ haftaSonu: true }, ctsi), true);
  assert.equal(tutar({ gun: ['cumartesi', 'pazar'] }, ctsi), true);
  assert.equal(tutar({ mevsim: 'sonbahar' }, d), true);
  assert.equal(tutar({ tarih: { min: '2026-10-20', max: '2026-10-31' } }, d), true);
  assert.equal(tutar({ oyunGunu: 1 }, d), true);
  d.zaman.dakika += 1440 * 6;
  assert.equal(tutar({ oyunGunu: { min: 7 } }, d), true);
});

test('tatil ve özel günler', () => {
  const bayram = yeni(10, '2026-10-29');
  assert.equal(tutar({ tatil: true }, bayram), true);
  assert.equal(tutar({ tatil: 'Cumhuriyet Bayramı' }, bayram), true);
  assert.equal(tutar({ tatil: true }, yeni()), false);
  assert.equal(tutar({ tatil: false }, yeni()), true);
  const ogretmen = yeni(10, '2026-11-24');
  assert.equal(tutar({ tatil: true }, ogretmen), false, 'özel gün resmi tatil değildir');
  assert.equal(tutar({ tatil: 'Öğretmenler Günü' }, ogretmen), true);
});

test('yaş ve geçmiş bileşenleri', () => {
  const d = yeni();
  d.karakter.dogum = '1996-03-14';
  assert.equal(tutar({ yas: { min: 30 } }, d), true);
  assert.equal(tutar({ yas: { min: 31 } }, d), false);
  d.karakter.gecmis = { eskiMeslek: 'asci', kusurlar: ['kumar', 'ofke'], baslangicTipi: 'zirveden' };
  assert.equal(tutar({ gecmis: { eskiMeslek: 'asci' } }, d), true);
  assert.equal(tutar({ gecmis: { kusurlar: 'kumar' } }, d), true);
  assert.equal(tutar({ gecmis: { kusurlar: ['tembellik', 'ofke'] } }, d), true);
  assert.equal(tutar({ gecmis: { kusurlar: 'tembellik' } }, d), false);
  assert.equal(tutar({ gecmis: { baslangicTipi: ['dipten', 'zirveden'] } }, d), true);
});

test('bayrak ve sayaç koşulları, NPC rol bağlamı', () => {
  const d = yeni();
  bayrakKoy(d, 'borclu');
  bayrakKoy(d, 'ofkeli', 3, { npc: 417 });
  sayacEkle(d, 'kahve', 4);
  assert.equal(tutar({ bayrak: 'borclu' }, d), true);
  assert.equal(tutar({ bayrak: { ad: 'borclu', var: false } }, d), false);
  assert.equal(tutar({ degil: { bayrak: 'yok_boyle' } }, d), true);
  assert.equal(tutar({ bayrak: { ad: 'ofkeli', npc: 'patron', deger: { min: 2 } } }, d, { npc: { patron: 417 } }), true);
  assert.equal(tutar({ sayac: { kahve: { min: 3 } } }, d), true);
  assert.equal(tutar({ sayac: { ad: 'kahve', kural: { min: 5 } } }, d), false);
});

test('olay geçmişi', () => {
  const d = yeni();
  assert.equal(tutar({ olay: { id: 'mutfak_yangini' } }, d), false);
  d.olayGecmisi.mutfak_yangini = { son: d.zaman.dakika, kez: 2 };
  assert.equal(tutar({ olay: { id: 'mutfak_yangini', kez: { min: 2 } } }, d), true);
  d.zaman.dakika += 1440 * 31;
  assert.equal(tutar({ olay: { id: 'mutfak_yangini', gecenGun: { min: 30 } } }, d), true);
});

test('ilişki (NPC sistemi gelince) ve mekan: alanlar yokken hata vermeden "tutmaz"', () => {
  const d = yeni();
  assert.equal(tutar({ iliski: { npc: 'patron', guven: { min: 10 } } }, d), false);
  assert.equal(tutar({ mekanTuru: 'lokanta' }, d), false);
  d.npcler = { 417: { iliski: { guven: 30, yakinlik: 10 }, iliskiTuru: 'is' } };
  d.konum = { mekan: 'lokanta_ustam', mekanTuru: 'lokanta', semt: 'eski_carsi' };
  assert.equal(tutar({ iliski: { npc: 'patron', guven: { min: 10 }, tur: 'is' } }, d, { npc: { patron: 417 } }), true);
  assert.equal(tutar({ mekanTuru: ['lokanta', 'kahvehane'], semt: 'eski_carsi' }, d), true);
});

test('suç dünyası kısa yazımları ve genel yol kontrolü', () => {
  const d = yeni();
  assert.equal(tutar({ aranma: 0 }, d), true, 'alan yokken aranma 0');
  assert.equal(tutar({ sabika: false }, d), true);
  assert.equal(tutar({ orgut: false }, d), true);
  d.suc = { aranma: 3, karaPara: 45000, sabika: [{ tur: 'hirsizlik' }], orgutler: { demirciler: { uye: true, rutbe: 2, guven: 55 } } };
  assert.equal(tutar({ aranma: { min: 2 } }, d), true);
  assert.equal(tutar({ karaPara: { min: 50000 } }, d), false);
  assert.equal(tutar({ sabika: 'hirsizlik' }, d), true);
  assert.equal(tutar({ sabika: { min: 2 } }, d), false);
  assert.equal(tutar({ orgut: true }, d), true);
  assert.equal(tutar({ orgut: { id: 'demirciler', rutbe: { min: 2 }, guven: { min: 50 } } }, d), true);
  assert.equal(tutar({ orgut: { id: 'liman', uye: false } }, d), true);
  assert.equal(tutar({ deger: 'suc.orgutler.demirciler.rutbe', min: 2 }, d), true);
  assert.equal(tutar({ deger: 'suc.olmayan' }, d), false);
});

test('açıklayıcı: neden tetiklenmedi', () => {
  const d = yeni();
  d.durumlar.enerji = 12;
  const k = { ve: [{ durum: { enerji: { min: 20 } } }, { para: { min: 500 } }, { veya: [{ zamanDilimi: 'aksam' }, { haftaSonu: true }] }, { degil: { para: { min: 100 } } }] };
  const ag = kosulAcikla(k, ctx(d));
  assert.equal(ag.tamam, false);
  const nedenler = nedenTutmadi(ag);
  assert.equal(nedenler.length, 3);
  assert.match(nedenler[0], /Enerji ≥ 20 \(şu an 12\)/);
  assert.match(nedenler[1], /hiçbiri tutmadı: dilim = aksam \(şu an sabah\) \| hafta sonu olmalı \(bugün sali\)/);
  assert.match(nedenler[2], /tutmaması gerekirken tuttu: para ≥ 100/);
  const metin = aciklamaMetni(ag);
  assert.match(metin, /✗ hepsi/);
  assert.match(metin, /  ✓ para ≥ 500 \(şu an 2000\)/);
});

test('bilinmeyen koşul çökmez, tutmaz ve açıklanır', () => {
  const ag = kosulAcikla({ ucanHali: true }, ctx(yeni()));
  assert.equal(ag.tamam, false);
  assert.match(ag.aciklama, /bilinmeyen koşul: ucanHali/);
});

test('doğrulayıcı yazım hatalarını yakalar', () => {
  assert.deepEqual(kosulDogrula({ ve: [{ durum: { enerji: { min: 20 } } }, { zamanDilimi: ['sabah'] }, { degil: { bayrak: 'x' } }] }), []);
  const h = kosulDogrula({ ve: [
    { durumm: {} },
    { durum: { enerji: { minn: 3 } } },
    { zamanDilimi: 'öğlen' },
    { gun: 'salı' },
    { saat: { min: '8' } },
    { veya: [] },
    { olay: {} },
    { bayrak: { deger: 3 } },
    { deger: 'suc.aranma', minn: 2 },
  ] });
  assert.equal(h.length, 9, h.join('\n'));
  assert.deepEqual(kosulDogrula({ deger: 'suc.aranma', min: 2 }), []);
  assert.ok(h.some(x => x.includes('bilinmeyen koşul "durumm"')));
  assert.ok(h.some(x => x.includes('Türkçe karakter kullanma')));
});
