import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dunyaDogrula, semtBul, kancaOlaylari, tumKancalar, olayYili } from '../js/core/dunya.js';
import { ek } from '../js/core/tr.js';

const sehir = JSON.parse(readFileSync(new URL('../data/dunya/sehir.json', import.meta.url)));
const dunya = { sehir };

test('dünya kitabı tutarlı (kimlikler, tarihler, semt başvuruları, iklim)', () => {
  assert.deepEqual(dunyaDogrula(dunya), []);
});

test('denetim gerçekten hata yakalıyor', () => {
  const bozuk = structuredClone(sehir);
  bozuk.semtler.push({ id: 'Eski Çarşı', ad: '', yaka: 'guney' });
  bozuk.zamanCizelgesi.push({ id: 'gelecek', tarih: '2031-01-01', ad: 'x', aciklama: 'y', semtler: ['olmayan_semt'] });
  bozuk.zamanCizelgesi.unshift({ id: 'sirasiz', tarih: '2030', ad: 'x', aciklama: 'y' });
  const h = dunyaDogrula({ sehir: bozuk });
  for (const b of ['id biçimi: "Eski Çarşı"', 'yaka bati/dogu/kuzey', 'dünyanın şimdisinden', 'bilinmeyen semt "olmayan_semt"', 'tarih sırasında değil']) {
    assert.ok(h.some(x => x.includes(b)), b + '\n' + h.join('\n'));
  }
});

test('yardımcılar: semt bulma, hikaye kancaları', () => {
  assert.equal(semtBul(dunya, 'tabakhane').ad, 'Tabakhane');
  assert.equal(semtBul(dunya, 'yok'), null);
  assert.deepEqual(kancaOlaylari(dunya, 'tersane_issizi').map(o => o.id), ['tersane_kapanis']);
  assert.equal(olayYili(kancaOlaylari(dunya, 'sel_magduru')[0]), 2003);
  const k = tumKancalar(dunya);
  for (const beklenen of ['kripto_magduru', 'sel_magduru', 'unutulan_unlu', 'deryapi_magduru', 'sakat_sporcu']) assert.ok(k.includes(beklenen), beklenen);
});

test('şehir ve semt adları ek motoruyla doğru çekimleniyor', () => {
  assert.equal(ek(sehir.ad, 'de'), "Karaliman'da");
  assert.equal(ek(sehir.ad, 'in'), "Karaliman'ın");
  const beklenen = { eski_carsi: "Eski Çarşı'da", asagi_liman: "Aşağıliman'da", tersaneonu: "Tersaneönü'nde", marina: "Marina'da", tabakhane: "Tabakhane'de", istasyon: "İstasyon'da", cumhuriyet: "Cumhuriyet'te", camlik: "Çamlık'ta", sahilyolu: "Sahilyolu'nda", yamacevler: "Yamaçevler'de", bezhane: "Bezhane'de", kayalitepe: "Kayalıtepe'de", kuzey_sanayi: "Kuzey Sanayi'de", ilicakoy: "Ilıcaköy'de" };
  for (const s of sehir.semtler) {
    assert.equal(ek(s.ad, 'de', { iyelik: s.iyelik }), beklenen[s.id], s.id);
  }
});

// ---------- Semt ayrıntıları (adım 2.2) ----------
import { semtKomsulari, semtIliskisi, sakinTuruSec } from '../js/core/dunya.js';
import { Rng } from '../js/core/rng.js';

const semtler = JSON.parse(readFileSync(new URL('../data/dunya/semtler.json', import.meta.url)));
const tam = { sehir, semtler };

test('semt ayrıntıları tutarlı (her semtin ayrıntısı, ölçekler, sakin türleri, komşuluk, olay başvuruları)', () => {
  assert.deepEqual(dunyaDogrula(tam), []);
});

test('semt denetimi gerçekten hata yakalıyor', () => {
  const b = structuredClone(semtler);
  const t = b.semtler.find(s => s.id === 'tabakhane');
  t.sosyo.gelir = 9;
  t.sakinler.push({ tur: 'uzayli', agirlik: 1 });
  t.unluYerler.push({ id: 'yeni_cesme', ad: 'Yeni Çeşmesi', tur: 'tarihi', aciklama: 'x' });
  t.gerilimler[0].olaylar.push('olmayan_olay');
  t.komsular.push('marina');
  t.iliskiler.push({ semt: 'tabakhane', tur: 'ask', aciklama: 'x' });
  delete t.atmosfer.gece;
  b.semtler = b.semtler.filter(s => s.id !== 'ilicakoy');
  const h = dunyaDogrula({ sehir, semtler: b });
  for (const beklenen of ['sosyo.gelir 1–5', 'bilinmeyen sakin türü "uzayli"', '"Yeni Çeşmesi" iyelikli olabilir', 'olmayan olay "olmayan_olay"',
    'komşuluk tek yönlü (marina → tabakhane yok)', 'ilişki geçersiz semt "tabakhane"', 'bilinmeyen ilişki türü "ask"', 'atmosfer.gece yok', 'semt ilicakoy: semtler.json\'da ayrıntısı yok']) {
    assert.ok(h.some(x => x.includes(beklenen)), beklenen + '\n' + h.join('\n'));
  }
});

test('semt yardımcıları: birleşik kayıt, komşular, ilişki, sakin seçimi', () => {
  const t = semtBul(tam, 'tabakhane');
  assert.equal(t.ad, 'Tabakhane');
  assert.equal(t.yaka, 'bati');
  assert.equal(t.sosyo.gelir, 1);
  assert.ok(semtKomsulari(tam, 'tabakhane').some(s => s.id === 'bezhane'));
  assert.equal(semtIliskisi(tam, 'yamacevler', 'marina').tur, 'kucumseme');
  assert.equal(semtIliskisi(tam, 'yamacevler', 'kuzey_sanayi'), null);
  const rng = Rng.akis('semt-testi');
  const sayim = {};
  for (let i = 0; i < 400; i++) { const tur = sakinTuruSec(tam, 'camlik', rng); sayim[tur] = (sayim[tur] || 0) + 1; }
  assert.ok(sayim.ogrenci > 150, JSON.stringify(sayim)); // ağırlık 6/11
  assert.equal(sakinTuruSec(tam, 'yok', rng), null);
});

test('her semte yürüyerek ulaşılabiliyor (komşuluk ağı bağlı)', () => {
  const gorulen = new Set(['eski_carsi']);
  const kuyruk = ['eski_carsi'];
  while (kuyruk.length) for (const k of semtBul(tam, kuyruk.shift()).komsular) if (!gorulen.has(k)) { gorulen.add(k); kuyruk.push(k); }
  assert.equal(gorulen.size, sehir.semtler.length);
});

test('kira katsayıları semtlerin karakteriyle uyumlu', () => {
  const k = id => semtBul(tam, id).sosyo.kiraKatsayisi;
  assert.ok(k('yamacevler') > k('marina') && k('marina') > k('sahilyolu') && k('sahilyolu') > k('cumhuriyet') && k('cumhuriyet') > k('camlik'));
  for (const ucuz of ['tabakhane', 'kayalitepe', 'kuzey_sanayi']) assert.ok(k(ucuz) < 0.7, ucuz);
  // Gelir ile kira aynı yönde
  const s = sehir.semtler.map(x => semtBul(tam, x.id));
  const ort = g => { const l = s.filter(x => x.sosyo.gelir === g).map(x => x.sosyo.kiraKatsayisi); return l.reduce((a, b) => a + b, 0) / l.length; };
  assert.ok(ort(5) > ort(4) && ort(4) > ort(2));
});

test('ünlü yer adları ek motoruyla doğru çekimleniyor', () => {
  const yer = id => semtler.semtler.flatMap(s => s.unluYerler).find(y => y.id === id);
  const de = id => ek(yer(id).ad, 'de', { iyelik: yer(id).iyelik });
  assert.equal(de('saat_kulesi'), "Saat Kulesi'nde");
  assert.equal(de('bedesten'), "Bedesten'de");
  assert.equal(de('debbag_camii'), "Debbağ Camii'nde");
  assert.equal(de('kaletepe_surlari'), "Kaletepe Surları'nda");
  assert.equal(de('marina_avm'), "Marina AVM'de");
  assert.equal(de('kordon'), "Kordon'da");
});
