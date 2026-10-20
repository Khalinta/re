import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { yeniDurum, rngAl } from '../js/core/durum.js';
import { olayUygunluk, olaySec, olayBaslat, olaySecenekleri, olaySecenegiSec, kontrolOlasiligi, zorlukIfadesi, metinCoz, olayDogrula } from '../js/core/olay.js';
import { etkileriUygula, etkiDogrula, sureDk } from '../js/core/etki.js';
import { kosulDogrula } from '../js/core/kosul.js';
import { metinDogrula } from '../js/core/metin.js';
import { bayrakAl } from '../js/core/bayrak.js';
import { zarfla, zarfAc } from '../js/core/kayitbicim.js';
import { Rng } from '../js/core/rng.js';

const oku = y => JSON.parse(readFileSync(new URL(y, import.meta.url)));
const sim = oku('../data/simulasyon.json');
const takvim = oku('../data/takvim.json');
const yeni = (saat = 8) => yeniDurum(sim, { seed: 'OLAY-0001', baslangic: '2026-10-20', saat, para: 2000 });

const DENEME = {
  id: 'deneme',
  baslik: 'Deneme',
  kosul: { para: { min: 100 } },
  bekleme: { gun: 2 },
  tekrar: true,
  sahneler: {
    giris: {
      metin: ['A çeşidi', ['B1', { tur: 'konusma', konusan: 'Ahmet', metin: 'B2' }]],
      etki: [{ sayac: { girildi: 1 } }],
      secenekler: [
        { metin: 'Öde', maliyet: { para: 300, dakika: 30 }, etki: [{ bayrak: 'odedi' }], sonuc: 'Ödedin.', git: 'son' },
        { metin: 'Pahalı', maliyet: { para: 99999 } },
        { metin: 'Gizli', kosul: { bayrak: 'yok' }, gizle: true },
        { metin: 'Kilitli', kosul: { bayrak: 'yok' }, kosulSebep: 'Olmaz.' },
        { metin: 'Dene', kontrol: { beceri: 'ikna', zorluk: 50 }, basari: { sonuc: 'Oldu', etki: [{ bayrak: 'ikna_etti' }] }, basarisiz: { sonuc: 'Olmadı', git: 'ikinci' } },
        { metin: 'Zar', sonuclar: [{ agirlik: 1, sonuc: 'yazı', etki: [{ sayac: { yazi: 1 } }] }, { agirlik: 1, sonuc: 'tura', etki: [{ sayac: { tura: 1 } }] }, { agirlik: 100, kosul: { bayrak: 'yok' }, sonuc: 'asla' }] },
        { metin: 'Zincir', etki: [{ olay: 'ikinci_olay' }] },
      ],
    },
    ikinci: { metin: 'İkinci sahne', git: 'son' },
    son: { metin: 'Son.', etki: [{ zamanla: { sure: { hafta: 3 }, olay: 'ikinci_olay' } }], son: true },
  },
};
const IKINCI = { id: 'ikinci_olay', tetik: 'zincir', tekrar: true, sahneler: { giris: { metin: 'Zincirdeki olay.', son: true } } };
const veri = { sim, takvim, olaylar: { deneme: DENEME, ikinci_olay: IKINCI } };

test('metin varyasyonları: tek, çeşitli, çok paragraflı çeşit', () => {
  const r = Rng.akis('m');
  assert.deepEqual(metinCoz('x', r), [{ tur: 'anlati', metin: 'x' }]);
  const gorulen = new Set();
  for (let i = 0; i < 50; i++) gorulen.add(metinCoz(DENEME.sahneler.giris.metin, r).map(p => p.metin).join('+'));
  assert.deepEqual([...gorulen].sort(), ['A çeşidi', 'B1+B2']);
});

test('uygunluk: tetik, koşul, bekleme, tekrar sınırı; nedenleri açıklar', () => {
  const d = yeni();
  assert.equal(olayUygunluk(d, DENEME, veri).uygun, true);
  assert.match(olayUygunluk(d, IKINCI, veri).nedenler[0], /tetik "zincir"/);
  d.para = 50;
  assert.match(olayUygunluk(d, DENEME, veri).nedenler.join(), /koşul: para ≥ 100 \(şu an 50\)/);
  d.para = 2000;
  d.olayGecmisi.deneme = { son: d.zaman.dakika, kez: 1 };
  assert.match(olayUygunluk(d, DENEME, veri).nedenler.join(), /bekleme süresi dolmadı/);
  d.zaman.dakika += 1440 * 2;
  assert.equal(olayUygunluk(d, DENEME, veri).uygun, true);
  assert.match(olayUygunluk(d, { ...DENEME, tekrar: false }, veri).nedenler.join(), /bir kez olur/);
  assert.match(olayUygunluk(d, { ...DENEME, tekrar: 1 }, veri).nedenler.join(), /en çok 1 kez/);
});

test('ağırlıklı seçim ve ağırlık çarpanları', () => {
  const d = yeni();
  const A = { id: 'a', agirlik: 1, sahneler: { giris: { metin: 'a', son: true } } };
  const B = { id: 'b', agirlik: { temel: 1, carpanlar: [{ kosul: { para: { min: 1000 } }, carpan: 9 }] }, sahneler: { giris: { metin: 'b', son: true } } };
  const v = { sim, olaylar: { a: A, b: B } };
  const r = Rng.akis('agirlik');
  const say = { a: 0, b: 0 };
  for (let i = 0; i < 4000; i++) say[olaySec(d, v, r).id]++;
  assert.ok(say.b / say.a > 7 && say.b / say.a < 11, JSON.stringify(say));
  assert.equal(olaySec(d, { olaylar: {} }, r), null);
});

test('olay akışı: başlat → seçenekler → bedel → sahne geçişi → son → geçmiş ve zamanlayıcı', () => {
  const d = yeni();
  const r = rngAl(d, 'olay');
  const s = olayBaslat(d, 'deneme', veri, r);
  assert.equal(s.bitti, false);
  assert.equal(d.aktifOlay.sahne, 'giris');
  assert.equal(d.sayaclar.girildi, 1, 'giriş etkisi uygulandı');
  assert.deepEqual(d.olayGecmisi.deneme, { son: 480, kez: 1 });
  const sec = olaySecenekleri(d, veri);
  assert.deepEqual(sec.map(x => x.metin), ['Öde', 'Pahalı', 'Kilitli', 'Dene', 'Zar', 'Zincir'], 'gizli seçenek listede yok');
  assert.equal(sec.find(x => x.metin === 'Pahalı').devreDisi, true);
  assert.equal(sec.find(x => x.metin === 'Kilitli').sebep, 'Olmaz.');
  assert.ok(sec.find(x => x.metin === 'Dene').alt, 'kontrollü seçenekte zorluk ifadesi var');
  const kilitli = olaySecenegiSec(d, veri, r, sec.find(x => x.metin === 'Kilitli').sira);
  assert.ok(kilitli.reddedildi);
  const o = olaySecenegiSec(d, veri, r, 0);
  assert.equal(o.bitti, true);
  assert.equal(d.aktifOlay, null);
  assert.equal(d.para, 1700);
  assert.equal(d.zaman.dakika, 480 + 30);
  assert.equal(bayrakAl(d, 'odedi'), true);
  assert.deepEqual(o.paragraflar.map(p => p.metin).filter(m => ['Öde', 'Ödedin.', 'Son.'].includes(m)), ['Öde', 'Ödedin.', 'Son.']);
  assert.equal(d.zamanlayicilar.length, 1);
  assert.equal(d.zamanlayicilar[0].zaman, 510 + sureDk({ hafta: 3 }));
  assert.equal(d.zamanlayicilar[0].kaynak, 'deneme');
});

test('beceri kontrolü: olasılık beceriye bağlı, deneyim kazandırır, iki dal da çalışır', () => {
  const ctx = d => ({ durum: d, veri });
  const d = yeni();
  const k = { beceri: 'ikna', zorluk: 50 };
  assert.equal(kontrolOlasiligi(k, ctx(d)), 0.05, 'beceri 0, zorluk 50 => en düşük');
  d.beceriler.ikna = 50;
  assert.equal(kontrolOlasiligi(k, ctx(d)), 0.5);
  d.beceriler.ikna = 100;
  assert.equal(kontrolOlasiligi(k, ctx(d)), 0.95);
  assert.equal(kontrolOlasiligi({ sans: 0.3, bonus: [{ kosul: { para: { min: 1 } }, deger: 20 }] }, ctx(d)), 0.5);
  assert.equal(zorlukIfadesi(0.9), 'Elinden gelir.');
  assert.equal(zorlukIfadesi(0.1), 'Neredeyse imkânsız gibi.');
  const sonuclar = new Set();
  for (let i = 0; i < 40; i++) {
    const x = yeni(); x.beceriler.ikna = 50; x.seed = 'S' + i;
    const r = rngAl(x, 'olay');
    olayBaslat(x, 'deneme', veri, r);
    const s = olaySecenegiSec(x, veri, r, 4);
    sonuclar.add(s.paragraflar.map(p => p.metin).includes('Oldu') ? 'basari' : 'basarisiz');
    assert.ok(x.beceriler.ikna > 50, 'deneyim');
    if (bayrakAl(x, 'ikna_etti')) assert.equal(s.bitti, true);
    else assert.ok(s.paragraflar.some(p => p.metin === 'İkinci sahne'), 'başarısızlık ikinci sahneye gider');
  }
  assert.deepEqual([...sonuclar].sort(), ['basari', 'basarisiz']);
});

test('ağırlıklı sonuçlar: koşulu tutmayan dal hiç seçilmez', () => {
  let yazi = 0, tura = 0;
  for (let i = 0; i < 200; i++) {
    const d = yeni(); d.seed = 'Z' + i;
    const r = rngAl(d, 'olay');
    olayBaslat(d, 'deneme', veri, r);
    const s = olaySecenegiSec(d, veri, r, 5);
    assert.ok(!s.paragraflar.some(p => p.metin === 'asla'));
    yazi += d.sayaclar.yazi ?? 0; tura += d.sayaclar.tura ?? 0;
  }
  assert.equal(yazi + tura, 200);
  assert.ok(yazi > 70 && tura > 70);
});

test('zincir: olay etkisiyle sıradaki olay bildirilir', () => {
  const d = yeni();
  const r = rngAl(d, 'olay');
  olayBaslat(d, 'deneme', veri, r);
  const s = olaySecenegiSec(d, veri, r, 6);
  assert.equal(s.bitti, true);
  assert.deepEqual(s.zincir, ['ikinci_olay']);
});

test('olay ortasında kayıt: kayıttan dönünce aynı sahne ve seçenekler', () => {
  const d = yeni();
  olayBaslat(d, 'deneme', veri, rngAl(d, 'olay'));
  const geri = zarfAc(zarfla(d));
  assert.deepEqual(geri.aktifOlay, d.aktifOlay);
  assert.deepEqual(olaySecenekleri(geri, veri), olaySecenekleri(d, veri));
  const a = olaySecenegiSec(d, veri, rngAl(d, 'olay'), 4);
  const b = olaySecenegiSec(geri, veri, rngAl(geri, 'olay'), 4);
  assert.deepEqual(a.paragraflar, b.paragraflar, 'kayıttan dönen oyun aynı rastgele sonucu verir');
});

test('etkiler: çoklu sistem, NPC anısı ve ilişkisi, itibar, suç alanları, genel yol', () => {
  const d = yeni();
  const s = etkileriUygula([
    { para: -150, durum: { stres: 10 } },
    { iliski: { npc: 'patron', saygi: 10, guven: 5, tur: 'is' } },
    { ani: { npc: 'patron', metin: 'mutfağı yangından kurtardı', duygu: 1 } },
    { itibar: { genel: 2, semt: { eski_carsi: 3 }, sektor: { hizmet: 1 } } },
    { aranma: 7 }, { karaPara: 5000 }, { sabika: { tur: 'hirsizlik' } },
    { orgut: { id: 'demirciler', uye: true, guven: 10 } }, { orgut: { id: 'demirciler', guven: 5, rutbe: 1 } },
    { deger: { yol: 'ozel.sayi', ekle: 3 } }, { deger: { yol: 'ozel.ad', yaz: 'x' } },
    { gunluk: 'Uzun bir gündü.' },
    { zaman: { saat: 2 } },
  ], { durum: d, veri, baglam: { npc: { patron: 417 } } });
  assert.equal(d.para, 1850);
  assert.deepEqual(s.notlar, ['−150 ₺']);
  assert.deepEqual(d.npcler[417].iliski, { saygi: 10, guven: 5 });
  assert.equal(d.npcler[417].iliskiTuru, 'is');
  assert.equal(d.npcler[417].anilar[0].metin, 'mutfağı yangından kurtardı');
  assert.deepEqual(d.itibar, { genel: 2, semt: { eski_carsi: 3 }, sektor: { hizmet: 1 } });
  assert.equal(d.suc.aranma, 5, 'aranma 0–5 arası');
  assert.equal(d.suc.orgutler.demirciler.guven, 15);
  assert.equal(d.suc.orgutler.demirciler.rutbe, 1);
  assert.deepEqual(d.ozel, { sayi: 3, ad: 'x' });
  assert.equal(d.gunluk.length, 1);
  assert.equal(d.zaman.dakika, 480 + 120);
  assert.throws(() => etkileriUygula([{ ucmak: 1 }], { durum: d }), /Bilinmeyen etki/);
  assert.deepEqual(zarfAc(zarfla(d)).suc, d.suc, 'yeni alanlar kayda sorunsuz girer');
});

test('doğrulayıcı: kırık sahne bağlantıları, bilinmeyen etki, ulaşılmayan sahne', () => {
  const ara = { kosulDogrula, etkiDogrula, olaylar: veri.olaylar };
  assert.deepEqual(olayDogrula(DENEME, ara), []);
  const kirik = { id: 'k', tetik: 'aksiyon:YANLIS', sahneler: { giris: { metin: 'x', secenekler: [{ metin: 'a', git: 'yok', etki: [{ uc: 1 }] }, { metin: 'b', kontrol: { zorluk: 1 } }, { metin: 'c', etki: [{ olay: 'olmayan' }] }] }, yetim: { metin: 'y', son: true } } };
  const h = olayDogrula(kirik, ara);
  for (const beklenen of ['geçersiz tetik', 'gidilecek sahne "yok"', 'bilinmeyen etki "uc"', 'basari/basarisiz yok', 'zincirlenen olay "olmayan"', '"yetim" sahnesine hiçbir yerden']) {
    assert.ok(h.some(x => x.includes(beklenen)), beklenen + '\n' + h.join('\n'));
  }
});

test('veri: bütün olay dosyaları listede, kimlikler eşsiz, hepsi doğrulamadan geçiyor', () => {
  const liste = oku('../data/olaylar/_liste.json').dosyalar;
  const klasor = readdirSync(new URL('../data/olaylar/', import.meta.url)).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  assert.deepEqual([...klasor].sort(), [...liste].sort(), 'data/olaylar/_liste.json güncel değil');
  const olaylar = {};
  for (const f of liste) for (const o of oku('../data/olaylar/' + f).olaylar) {
    assert.ok(!olaylar[o.id], 'aynı kimlik iki kez: ' + o.id);
    olaylar[o.id] = o;
  }
  const aksiyonlar = oku('../data/aksiyonlar.json').aksiyonlar.map(a => a.id);
  const yaylar = Object.fromEntries(oku('../data/yaylar.json').yaylar.map(y => [y.id, y]));
  for (const o of Object.values(olaylar)) {
    assert.deepEqual(olayDogrula(o, { kosulDogrula, etkiDogrula, metinDogrula, olaylar, yaylar }), [], o.id);
    const t = o.tetik || '';
    if (t.startsWith('aksiyon:')) assert.ok(aksiyonlar.includes(t.slice(8)), `${o.id}: tetik aksiyonu yok: ${t}`);
  }
});

test('örnek olaylar uçtan uca oynanabilir (her seçenek, çok sayıda seed)', () => {
  const olaylar = Object.fromEntries(oku('../data/olaylar/ev.json').olaylar.map(o => [o.id, o]));
  const v = { sim, takvim, olaylar };
  for (const o of Object.values(olaylar)) {
    for (let sira = 0; sira < o.sahneler.giris.secenekler.length; sira++) {
      for (let i = 0; i < 10; i++) {
        const d = yeni(14); d.seed = `E${i}`; d.para = 5000;
        const r = rngAl(d, 'olay');
        olayBaslat(d, o.id, v, r);
        let s = olaySecenegiSec(d, v, r, sira);
        let guvenlik = 0;
        while (!s.bitti && guvenlik++ < 10) s = olaySecenegiSec(d, v, r, olaySecenekleri(d, v).find(x => !x.devreDisi).sira);
        assert.equal(d.aktifOlay, null, `${o.id} seçenek ${sira} bitmedi`);
        assert.ok(s.paragraflar.some(p => p.tur === 'anlati' && p.metin.length > 20), `${o.id} seçenek ${sira}: anlatı yok`);
      }
    }
  }
});
