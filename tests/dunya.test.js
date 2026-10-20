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
