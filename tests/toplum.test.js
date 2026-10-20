import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dunyaDogrula } from '../js/core/dunya.js';
import { karakolBul, semtOrgutleri, isVerenler, orgutParavanlari, orgutUyeleri, figurBul, sirketBul, kurumBul, figurYasi } from '../js/core/toplum.js';
import { ek } from '../js/core/tr.js';

const oku = f => JSON.parse(readFileSync(new URL(`../data/dunya/${f}.json`, import.meta.url)));
const dunya = {};
for (const f of ['sehir', 'semtler', 'ulasim', 'kurumlar', 'sirketler', 'figurler', 'orgutler']) dunya[f] = oku(f);
const semtIdler = dunya.sehir.semtler.map(s => s.id);

test('kurumlar, şirketler, figürler ve örgütler tutarlı (bütün başvurular gerçek kayıtlara gidiyor)', () => {
  assert.deepEqual(dunyaDogrula(dunya), []);
});

test('toplum denetimi gerçekten hata yakalıyor', () => {
  const b = structuredClone(dunya);
  b.kurumlar.kurumlar.find(k => k.id === 'sahil_karakolu').kapsar.push('istasyon');
  b.kurumlar.kurumlar.find(k => k.id === 'kuzey_karakolu').kapsar = ['kayalitepe', 'kuzey_sanayi', 'bezhane'];
  b.sirketler.sirketler.find(s => s.id === 'deryapi').isVerir = ['insaat'];
  Object.assign(b.sirketler.sirketler.find(s => s.id === 'pruva_yazilim'), { sahip: 'yok_biri', paravan: 'mafya', isVerir: ['astronot'] });
  b.figurler.figurler.find(f => f.id === 'cevat_kalyoncu').rutbe = 'abi';
  b.figurler.figurler.find(f => f.id === 'deniz_ural').dogumYili = 2015;
  b.orgutler.orgutler.find(o => o.id === 'tepeliler').iliskiler = b.orgutler.orgutler.find(o => o.id === 'tepeliler').iliskiler.filter(i => i.orgut !== 'karakaslar');
  b.orgutler.orgutler.find(o => o.id === 'sarraflar').bolgeler[0].faaliyetler.push('ucak_kacirma');
  b.orgutler.orgutler.find(o => o.id === 'karakaslar').lider = 'selda_karakas';
  const h = dunyaDogrula(b);
  for (const beklenen of ['semt istasyon: iki karakola bağlı', 'semt ilicakoy: hiçbir karakola bağlı değil', 'batık şirket iş veremez', 'bilinmeyen sahip "yok_biri"',
    'bilinmeyen örgüt "mafya"', 'bilinmeyen iş türü "astronot"', '"abi" kalyoncular örgütünde bir rütbe değil', 'figür deniz_ural: yaş 18–95',
    'örgüt karakaslar: tepeliler ilişkisi tek yönlü', 'bilinmeyen faaliyet "ucak_kacirma"', 'lider selda_karakas örgütün en üst rütbesinde değil']) {
    assert.ok(h.some(x => x.includes(beklenen)), beklenen + '\n' + h.join('\n'));
  }
});

test('her semtin bir karakolu var', () => {
  for (const s of semtIdler) assert.ok(karakolBul(dunya, s), s);
  assert.equal(karakolBul(dunya, 'tabakhane').id, 'gar_karakolu');
});

test('semtteki örgütler güce göre; çekişmeli semtler', () => {
  assert.equal(semtOrgutleri(dunya, 'asagi_liman')[0].orgut, 'kalyoncular');
  assert.deepEqual(semtOrgutleri(dunya, 'tabakhane').map(o => o.orgut).sort(), ['karakaslar', 'tepeliler']);
  assert.deepEqual(semtOrgutleri(dunya, 'camlik'), []);
  // Her örgütün en az bir semtte gücü ≥ 4 (bir "evi" var)
  for (const o of dunya.orgutler.orgutler) assert.ok(o.bolgeler.some(b => b.guc >= 4), o.id);
});

test('iş verenler: yalnızca faaliyetteki şirketler ve kurumlar; her iş türünün en az bir işvereni var', () => {
  const kurye = isVerenler(dunya, 'kurye').map(x => x.kayit.id);
  assert.ok(kurye.includes('hizir_kurye') && kurye.includes('korfez_kargo'));
  assert.ok(!isVerenler(dunya, 'insaat').some(x => x.kayit.id === 'deryapi'));
  assert.ok(isVerenler(dunya, 'saglik').some(x => x.tur === 'kurum'));
  assert.deepEqual(isVerenler(dunya, 'denizci', { semt: 'asagi_liman' }).map(x => x.kayit.id).sort(), ['balikci_kooperatifi', 'kalyon_su_urunleri']);
  for (const t of Object.keys(dunya.sirketler.isTurleri)) assert.ok(isVerenler(dunya, t).length, t);
});

test('örgütlerin paravanları ve üyeleri', () => {
  assert.deepEqual(orgutParavanlari(dunya, 'kalyoncular').map(s => s.id).sort(), ['kalyon_su_urunleri', 'marti_lojistik']);
  assert.deepEqual(orgutUyeleri(dunya, 'kalyoncular').map(f => f.id).sort(), ['cevat_kalyoncu', 'ismail_kalyoncu', 'tufan_kalyoncu']);
  for (const o of dunya.orgutler.orgutler) assert.ok(orgutParavanlari(dunya, o.id).length >= 1, o.id);
});

test('gizli bağlar kamuya açık metinlerde sızmıyor', () => {
  const orgutAdi = id => dunya.orgutler.orgutler.find(o => o.id === id).ad;
  for (const s of dunya.sirketler.sirketler.filter(x => x.paravan)) {
    const ad = orgutAdi(s.paravan);
    assert.ok(!s.aciklama.includes(ad) && !(s.kosullar || '').includes(ad), s.id);
  }
  for (const f of dunya.figurler.figurler.filter(x => x.orgut)) assert.ok(!f.kamuoyu.includes(orgutAdi(f.orgut)), f.id);
  // Gizli bilgiler figürlerin 'gercek' alanında; kurum açıklamalarında kişi adı geçmiyor
  for (const k of dunya.kurumlar.kurumlar) for (const f of dunya.figurler.figurler) assert.ok(!k.aciklama.includes(f.ad), `${k.id} ${f.id}`);
});

test('tarih tutarlılığı: figürler yaşadıkları olaylarda yetişkin, şirket sahipleri şirketten genç değil', () => {
  assert.ok(figurYasi(figurBul(dunya, 'ismail_kalyoncu'), 1979) >= 18); // grev
  assert.ok(figurYasi(figurBul(dunya, 'riza_kocabas'), 1979) >= 18);
  for (const s of dunya.sirketler.sirketler.filter(x => x.sahip && x.kurulus >= 1980)) {
    assert.ok(s.kurulus - figurBul(dunya, s.sahip).dogumYili >= 18, s.id);
  }
});

test('kurum ve şirket adları ek motoruyla doğru çekimleniyor', () => {
  const de = x => ek(x.ad, 'de', { iyelik: x.iyelik });
  assert.equal(de(kurumBul(dunya, 'gar_karakolu')), "Gar Karakolu'nda");
  assert.equal(de(kurumBul(dunya, 'kapali_cezaevi')), "Karaliman Kapalı Cezaevi'nde");
  assert.equal(de(kurumBul(dunya, 'demirspor')), "Karaliman Demirspor'da");
  assert.equal(de(sirketBul(dunya, 'gar_palas')), "Gar Palas Oteli'nde");
  assert.equal(de(sirketBul(dunya, 'sanli_yapi')), "Şanlı Yapı'da");
  assert.equal(de(sirketBul(dunya, 'altin_oto')), "Altın Oto Galeri'de");
  assert.equal(de(sirketBul(dunya, 'korfezbank')), "Körfezbank'ta");
});
