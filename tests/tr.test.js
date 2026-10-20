import test from 'node:test';
import assert from 'node:assert/strict';
import { ek, buyuk, kucuk, basHarfBuyuk, baslik, sirala, sayiSonSozcuk } from '../js/core/tr.js';

const ornekler = [
  // [kelime, ek, beklenen, seçenek]
  ['Ahmet', 'in', "Ahmet'in"],
  ['Ayşe', 'in', "Ayşe'nin"],
  ['Kadıköy', 'e', "Kadıköy'e"],
  ['Gaziantep', 'de', "Gaziantep'te"],
  [3, 'i', "3'ü"],
  [2026, 'de', "2026'da"],
  ['Ankara', 'e', "Ankara'ya"],
  ['Ankara', 'de', "Ankara'da"],
  ['İstanbul', 'de', "İstanbul'da"],
  ['İzmir', 'den', "İzmir'den"],
  ['Kars', 'den', "Kars'tan"],
  ['Muş', 'de', "Muş'ta"],
  ['Iğdır', 'e', "Iğdır'a"],
  ['Van', 'in', "Van'ın"],
  ['Bursa', 'in', "Bursa'nın"],
  ['Ali', 'i', "Ali'yi"],
  ['Ali', 'le', "Ali'yle"],
  ['Ahmet', 'le', "Ahmet'le"],
  ['Ahmet', 'e', "Ahmet'e"],
  ['Ahmet', 'i', "Ahmet'i"],
  ['Zeynep', 'i', "Zeynep'i"],
  ['Zeynep', 'de', "Zeynep'te"],
  ['Mehmet', 'den', "Mehmet'ten"],
  ['Oğuz', 'un', "Oğuz'un"],
  ['Oğuz', 'in', "Oğuz'un"],
  ['Gül', 'in', "Gül'ün"],
  ['Ömür', 'e', "Ömür'e"],
  ['Umut', 'u', "Umut'u"],
  ['Umut', 'i', "Umut'u"],
  ['Şişli', 'de', "Şişli'de"],
  ['Erzincan', 'den', "Erzincan'dan"],
  ['Rize', 'e', "Rize'ye"],
  ['Ordu', 'in', "Ordu'nun"],
  ['Kemal', 'e', "Kemal'e"],
  ['Kemal', 'in', "Kemal'in"],
  ['Celal', 'i', "Celal'i"],
  ['Hilal', 'den', "Hilal'den"],
  ['Kadıköy', ['de', 'ki'], "Kadıköy'deki"],
  ['Ankara', ['de', 'ki', 'ler'], "Ankara'dakiler"],
  ['Beşiktaş', ['li', 'ler', 'in'], 'Beşiktaşlıların'],
  ['Ankara', 'li', 'Ankaralı'],
  ['Kadıköy', 'li', 'Kadıköylü'],
  ['İngiliz', 'ce', 'İngilizce'],
  ['Yılmaz', 'ler', 'Yılmazlar'],
  ['AVM', 'ler', "AVM'ler"],
  ['Kadıköy', ['ler', 'e'], 'Kadıköylere'],
  ['Çınaraltı Kahvesi', 'e', "Çınaraltı Kahvesi'ne", { iyelik: true }],
  ['Kız Kulesi', 'de', "Kız Kulesi'nde", { iyelik: true }],
  ['Kız Kulesi', 'den', "Kız Kulesi'nden", { iyelik: true }],
  ['Dolmabahçe Sarayı', 'i', "Dolmabahçe Sarayı'nı", { iyelik: true }],
  ['Eski Çarşı', 'e', "Eski Çarşı'ya"],
  // Sayılar
  [1, 'e', "1'e"],
  [2, 'de', "2'de"],
  [4, 'den', "4'ten"],
  [5, 'i', "5'i"],
  [6, 'de', "6'da"],
  [7, 'e', "7'ye"],
  [8, 'in', "8'in"],
  [9, 'u', "9'u"],
  [10, 'da', "10'da"],
  [10, 'de', "10'da"],
  [20, 'ye', "20'ye"],
  [20, 'e', "20'ye"],
  [30, 'dan', "30'dan"],
  [30, 'den', "30'dan"],
  [40, 'de', "40'ta"],
  [50, 'e', "50'ye"],
  [60, 'de', "60'ta"],
  [70, 'i', "70'i"],
  [80, 'den', "80'den"],
  [90, 'in', "90'ın"],
  [100, 'de', "100'de"],
  [1000, 'e', "1000'e"],
  [1000000, 'den', "1000000'dan"],
  [0, 'dan', "0'dan"],
  [0, 'den', "0'dan"],
  ['1.250', 'ye', "1.250'ye"],
  ['1.250', 'e', "1.250'ye"],
  ['%50', 'si', "%50'si"],
  ['3,5', 'e', "3,5'e"],
  [1990, 'larda', "1990'larda"],
  [1990, ['ler', 'de'], "1990'larda"],
  [1980, ['ler', 'de'], "1980'lerde"],
  // Kısaltmalar
  ['THY', 'e', "THY'ye"],
  ['ABD', 'de', "ABD'de"],
  ['ABD', 'e', "ABD'ye"],
  ['TBMM', 'de', "TBMM'de"],
  ['SGK', 'e', "SGK'ye"],
  ['AVM', 'de', "AVM'de"],
  ['PTT', 'den', "PTT'den"],
  ['NATO', 'e', "NATO'ya"],
  ['ODTÜ', 'de', "ODTÜ'de"],
  ['TOKİ', 'in', "TOKİ'nin"],
  ['İETT', 'e', "İETT'ye"],
  ['KPSS', 'e', "KPSS'ye"],
  ['MEB', 'e', "MEB'e"],
  // Cins isimler: kesme yok, yumuşama var
  ['kitap', 'i', 'kitabı'],
  ['kitap', 'de', 'kitapta'],
  ['ağaç', 'i', 'ağacı'],
  ['renk', 'i', 'rengi'],
  ['çocuk', 'si', 'çocuğu'],
  ['ekmek', 'i', 'ekmeği'],
  ['dolap', 'e', 'dolaba'],
  ['top', 'u', 'topu'],
  ['saç', 'i', 'saçı'],
  ['sepet', 'e', 'sepete'],
  ['kanat', 'i', 'kanadı'],
  ['saat', 'i', 'saati'],
  ['saat', 'e', 'saate'],
  ['hukuk', 'u', 'hukuku'],
  ['rol', 'ü', 'rolü'],
  ['kalp', 'i', 'kalbi'],
  ['dip', 'i', 'dibi'],
  ['anne', 'si', 'annesi'],
  ['baba', 'si', 'babası'],
  ['ev', 'si', 'evi'],
  ['ev', 'ler', 'evler'],
  ['kapı', 'ler', 'kapılar'],
  ['simit', 'ci', 'simitçi'],
  ['çay', 'ci', 'çaycı'],
  ['göz', 'lük', 'gözlük'],
  ['su', 'siz', 'susuz'],
  ['araba', 'im', 'arabam'],
  ['ev', 'im', 'evim'],
  ['ev', 'imiz', 'evimiz'],
  ['okul', 'iniz', 'okulunuz'],
  ['iş', 'dir', 'iştir'],
  ['para', 'le', 'parayla'],
  ['kalem', 'le', 'kalemle'],
  ['müdür', 'e', 'müdüre'],
  ['su', 'in', 'suyun'],
  ['su', 'e', 'suya'],
  ['ufuk', 'u', 'ufuğu'],
  ['Ufuk', 'u', "Ufuk'u"],
  [15, 'inci', "15'inci"],
  [6, 'inci', "6'ncı"],
  [2026, ['de', 'ki'], "2026'daki"],
  ['Kemal', 'le', "Kemal'le"],
  ['Bordeaux', 'e', "Bordeaux'ya", { okunus: 'bordo' }],
];

// Kısa ek adları dışında yazılmış "da", "u" gibi biçimler kalıp olarak yorumlanır;
// doğrudan sabit yazılmış ekler (ör. 'da') harmoniye girmez, o yüzden onları kalıba çeviriyoruz.
const SABIT = { da: 'DA', dan: 'DAn', ye: '(y)A', u: '(y)I', 'ü': '(y)I', un: '(n)In', larda: 'lArDA' };

for (const [kelime, e, beklenen, secenek] of ornekler) {
  const ekler = Array.isArray(e) ? e : (SABIT[e] ?? e);
  test(`ek(${JSON.stringify(kelime)}, ${JSON.stringify(e)}) = ${beklenen}`, () => {
    assert.equal(ek(kelime, ekler, secenek), beklenen);
  });
}

test('sayıların son sözcüğü', () => {
  assert.equal(sayiSonSozcuk(2026), 'altı');
  assert.equal(sayiSonSozcuk(40), 'kırk');
  assert.equal(sayiSonSozcuk(100), 'yüz');
  assert.equal(sayiSonSozcuk(3000), 'bin');
  assert.equal(sayiSonSozcuk(5000000), 'milyon');
  assert.equal(sayiSonSozcuk(0), 'sıfır');
});

test('tr-TR büyük/küçük harf (i/İ, ı/I)', () => {
  assert.equal(buyuk('istanbul ılgaz'), 'İSTANBUL ILGAZ');
  assert.equal(kucuk('İSTANBUL ILGAZ'), 'istanbul ılgaz');
  assert.equal(basHarfBuyuk('iğdır'), 'İğdır');
  assert.equal(baslik('ıSPARTA iNEGÖL'), 'Isparta İnegöl');
});

test('Türkçe alfabe sıralaması', () => {
  const s = sirala(['Zeynep', 'Çağla', 'Ceren', 'Ömer', 'Oya', 'İlker', 'Irmak', 'Şule', 'Selin', 'Ümit', 'Utku', 'Ğ', 'Gül']);
  assert.deepEqual(s, ['Ceren', 'Çağla', 'Gül', 'Ğ', 'Irmak', 'İlker', 'Oya', 'Ömer', 'Selin', 'Şule', 'Utku', 'Ümit', 'Zeynep']);
});
