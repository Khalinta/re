// Claude ile serbest sohbet — çekirdek (3.9): bağlam, şema, cevabın kurallarla uygulanması (ağ yok)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import { mekandakiler, kisi } from '../js/core/insanlar.js';
import { tanis, flortEngeli, flortUygun, randevuKur } from '../js/core/sohbet.js';
import { istekHazirla, cevabiUygula, cevabiCoz, CEVAP_SEMASI, SISTEM, maliyet, MODELLER } from '../js/core/yz.js';
import { kisiKarti } from '../js/core/kart.js';
import { mekanBul } from '../js/core/mekan.js';
import { dilim } from '../js/core/zaman.js';
import { Rng } from '../js/core/rng.js';

const oku = y => JSON.parse(readFileSync(new URL('../' + y, import.meta.url)));
const dunya = {};
for (const f of ['sehir', 'semtler', 'ulasim', 'kurumlar', 'sirketler', 'figurler', 'orgutler', 'mekanlar']) dunya[f] = oku(`data/dunya/${f}.json`);
const npc = {};
for (const f of ['isimler', 'memleket', 'kisilik', 'hayat', 'sohbet', 'gorunus', 'flort', 'dedikodu', 'derinlik']) npc[f] = oku(`data/npc/${f}.json`);
npc.hayatOlaylari = oku('data/npc/hayat_olaylari.json');
const veri = { sim: oku('data/simulasyon.json'), dunya, npc };

function oturum(seed, kosul = () => true) {
  const d = yeniDurum(veri.sim, { seed, baslangic: '2026-10-20', saat: 20, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' }, karakter: { ad: 'Deniz', dogum: '2000-03-01', cinsiyet: 'e', fizik: { cekicilik: 7, karizma: 6 } } });
  const m = mekanBul(dunya, 'kordon_mekan');
  d.konum = { semt: m.semt, mekan: m.id };
  const r = Rng.akis(seed, 'y');
  for (let g = 0; g < 40; g++) {
    d.zaman.dakika = g * 1440 + 20 * 60;
    const kal = m.kalabalik[dilim(d.zaman.dakika).id];
    for (const id of mekandakiler(d, veri, m, kal)) {
      if (!kosul(kisi(veri, seed, id))) continue;
      d.bilgi.retler = {};
      tanis(d, veri, r, m, kal, id);
      if (d.sohbet?.npc === id) { d.sohbet.bekleyen = null; return { d, id, n: kisi(veri, seed, id) }; }
    }
  }
  return null;
}
const cevap = (ek = {}) => ({ eylem: 'Gülümsüyor.', konusma: 'Hadi ya, gerçekten mi?', sonuclar: { yakinlik: 2, guven: 1, cekim: 0, gerginlik: 0 }, olaylar: [], olgular: [], oyuncuHakkinda: [], ozet: 'Havadan sudan konuştular.', oneriler: ['Evet!', 'Şaka yaptım', 'Sen ne dersin?'], ...ek });

test('şema: her nesnede additionalProperties false ve bütün alanlar zorunlu', () => {
  const gez = s => {
    if (s.type === 'object') { assert.equal(s.additionalProperties, false); assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort()); Object.values(s.properties).forEach(gez); }
    if (s.type === 'array') gez(s.items);
  };
  gez(CEVAP_SEMASI);
  assert.ok(SISTEM.length > 1500 && !/\{|\}/.test(SISTEM), 'sistem metni sabit (değişken yok, önbelleğe alınabilir)');
});

test('istek: kişi kartı, hafıza, sahne ve konuşma eksiksiz; oyuncunun gizli geçmişi kişiye söylenmedikçe yok', () => {
  const t = oturum('YZ1');
  assert.ok(t);
  t.d.hikaye = { arketip: 'kumar', tip: 'zirveden', degisken: {} };
  const ist = istekHazirla(t.d, veri, t.id, 'Merhaba, burası hep böyle kalabalık mı?');
  const k = kisiKarti(t.d, veri, t.id);
  assert.equal(ist.sistem.length, 2);
  assert.ok(ist.sistem[1].includes(k.tamAd) && ist.sistem[1].includes('Hayat öyküsü'));
  assert.ok(ist.kullanici.includes('OYUNCU: Merhaba') && ist.kullanici.includes('SAHNE') && ist.kullanici.includes('Kordon'));
  assert.ok(!/kumar/i.test(ist.kullanici.split('=== SAHNE')[0].split('=== HAFIZA')[1] || ''), 'anlatılmamış geçmiş hafızada yok');
  for (const x of [...ist.sistem, ist.kullanici]) assert.ok(!/undefined|NaN|«/.test(x), x.slice(0, 200));
  assert.ok(ist.sistem[1].length + ist.kullanici.length < 30000, 'bağlam makul boyutta');
});

test('cevap uygulanır: konuşma kişinin ağzından, ilişki değişimi −5…+5 ile sınırlı, hafızaya özet girer', () => {
  const t = oturum('YZ2');
  const k = t.d.npcler[t.id];
  const once = { ...k.iliski };
  const u = cevabiUygula(t.d, veri, t.id, 'Selam', cevap({ sonuclar: { yakinlik: 50, guven: -40, cekim: 3, gerginlik: 0 }, oyuncuHakkinda: ['Kordon yakınında oturuyor.'] }), { randevuKur });
  assert.ok(u.paragraflar.some(p => p.tur === 'konusma' && p.konusan === t.n.hitapAdi && p.metin === 'Hadi ya, gerçekten mi?'));
  assert.equal(k.iliski.yakinlik - (once.yakinlik ?? 0), 5);
  assert.equal(k.iliski.guven - (once.guven ?? 0), -5);
  assert.ok(k.hafiza.ozetler.some(x => x.metin.includes('Havadan sudan')) && k.hafiza.ozetler.some(x => x.metin.includes('Kordon yakınında')));
  assert.deepEqual(t.d.sohbet.oneriler, ['Evet!', 'Şaka yaptım', 'Sen ne dersin?']);
  assert.equal(t.d.sohbet.yz.length, 2);
});

test('olaylar oyunun kurallarıyla: engel varken buluşma kurulmaz; kartla çelişen olgu reddedilir; uyumlu olgu kalıcı olur; gitti → oturum biter', () => {
  const t = oturum('YZ3', n => ['evli', 'sevgilili'].includes(n.medeni) && n.yas >= 20 && n.yas <= 32) || oturum('YZ3b', n => ['evli', 'sevgilili'].includes(n.medeni) && n.yas >= 20 && n.yas <= 32);
  assert.ok(t, 'ilişkisi olan biri bulunamadı');
  assert.equal(flortEngeli(t.d, veri, t.n), 'evli');
  const kart = kisiKarti(t.d, veri, t.id);
  assert.ok(istekHazirla(t.d, veri, t.id, 'Çıkalım mı?').kullanici.includes('Bir akşam buluşmayı kabul etmesi: OLAMAZ'), 'model kuralı önceden bilmeli');
  const u = cevabiUygula(t.d, veri, t.id, 'Yarın akşam çıkalım mı?', cevap({
    olaylar: ['bulusmayi_kabul_etti'],
    olgular: [
      { hakkinda: 'kendi', alan: 'yas', deger: String(kart.yas + 9), metin: `${kart.yas + 9} yaşında.` },
      { hakkinda: 'kendi', alan: 'yeni', deger: '', metin: 'Bir kedisi var, adı Duman.' },
      { hakkinda: 'Hiç Olmayan Biri', alan: 'yeni', deger: '', metin: 'X.' },
    ],
  }), { randevuKur });
  assert.ok(!t.d.zamanlayicilar.some(z => z.olay.startsWith('randevu')), 'engel varken buluşma kuruldu');
  assert.ok(u.reddedilen.some(x => x.startsWith('buluşma')) && u.reddedilen.some(x => x.includes('yas')) && u.reddedilen.some(x => x.includes('tanıdıkları')));
  assert.ok(kisiKarti(t.d, veri, t.id).olgular.includes('Bir kedisi var, adı Duman.'));
  cevabiUygula(t.d, veri, t.id, 'Tamam, görüşürüz.', cevap({ olaylar: ['kalkip_gitti'] }), { randevuKur });
  assert.equal(t.d.sohbet, undefined);
});

test('ilgisi yüksek ve engel yoksa buluşmayı kabul edebilir; numara verir', () => {
  for (let i = 0; i < 40; i++) {
    const t = oturum('YZ4' + i, n => n.yas >= 19 && n.yas <= 32 && n.cinsiyet === 'k' && !['evli', 'sevgilili'].includes(n.medeni));
    if (!t || !flortUygun(t.d, veri, t.n) || flortEngeli(t.d, veri, t.n)) continue;
    t.d.npcler[t.id].iliski.cekim = 60;
    t.d.npcler[t.id].iliski.yakinlik = 40;
    cevabiUygula(t.d, veri, t.id, 'Numaranı alabilir miyim? Yarın akşam?', cevap({ olaylar: ['numara_verdi', 'bulusmayi_kabul_etti'] }), { randevuKur });
    assert.ok(t.d.npcler[t.id].numara);
    assert.ok(t.d.zamanlayicilar.some(z => z.olay.startsWith('randevu') && z.baglam.npc.kisi === t.id));
    return;
  }
  assert.fail('uygun kişi bulunamadı');
});

test('cevap çözümleme ve maliyet', () => {
  assert.equal(cevabiCoz('bozuk'), null);
  const c = cevabiCoz(JSON.stringify({ konusma: 'Selam', olaylar: ['numara_verdi', 'uydurma'], olgular: [{ alan: 'yeni', metin: 'x' }, { alan: 'olmayan' }] }));
  assert.deepEqual(c.olaylar, ['numara_verdi']);
  assert.equal(c.olgular.length, 1);
  assert.equal(c.eylem, '');
  const m = maliyet('claude-opus-5-5', { input_tokens: 1e6, output_tokens: 1e6 });
  assert.equal(m, MODELLER[0].girdi + MODELLER[0].cikti);
  assert.ok(maliyet('claude-haiku-5-5', { input_tokens: 4000, output_tokens: 300 }) < 0.001);
});
