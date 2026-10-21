// Kişi kartı yazılı sohbette (3.10): müzik, futbol, hobi, günlük hayat, aile, geçmiş, hayat görüşü
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import { mekandakiler, kisi } from '../js/core/insanlar.js';
import { tanis, sohbetKonulari, sohbetHamlesi, oturumGecerli } from '../js/core/sohbet.js';
import { haftaninMaci, oyuncuZevki, ogrendiklerim, zevkOzeti } from '../js/core/zevk.js';
import { derinlik, aileAgaci, kisiKarti } from '../js/core/kart.js';
import { mekanBul } from '../js/core/mekan.js';
import { dilim } from '../js/core/zaman.js';
import { Rng } from '../js/core/rng.js';

const oku = y => JSON.parse(readFileSync(new URL('../' + y, import.meta.url)));
const dunya = {};
for (const f of ['sehir', 'semtler', 'ulasim', 'kurumlar', 'sirketler', 'figurler', 'orgutler', 'mekanlar']) dunya[f] = oku(`data/dunya/${f}.json`);
const npc = {};
for (const f of ['isimler', 'memleket', 'kisilik', 'hayat', 'sohbet', 'gorunus', 'flort', 'dedikodu', 'derinlik', 'zevk']) npc[f] = oku(`data/npc/${f}.json`);
npc.hayatOlaylari = oku('data/npc/hayat_olaylari.json');
const veri = { sim: oku('data/simulasyon.json'), dunya, npc };
const Z = npc.zevk;
const temiz = s => assert.ok(!/[{}«»]|undefined|null|NaN|\[object/.test(s), s);

// Bir mekânda biriyle tanışılmış bir oturum (bekleyen soru temizlenmiş)
function oturum(seed, kosul = () => true, mekanId = 'kordon_mekan') {
  const d = yeniDurum(veri.sim, { seed, baslangic: '2026-10-20', saat: 20, ev: { semt: 'camlik', tip: 'oda', ad: 'oda' }, karakter: { ad: 'Deniz', dogum: '1998-03-01', cinsiyet: 'e', fizik: { cekicilik: 6, karizma: 6 } } });
  const m = mekanBul(dunya, mekanId);
  d.konum = { semt: m.semt, mekan: m.id };
  const r = Rng.akis(seed, 'y');
  for (let g = 0; g < 30; g++) {
    d.zaman.dakika = g * 1440 + 20 * 60;
    const kal = m.kalabalik[dilim(d.zaman.dakika).id];
    for (const id of mekandakiler(d, veri, m, kal)) {
      if (!kosul(kisi(veri, seed, id))) continue;
      d.bilgi.retler = {};
      tanis(d, veri, r, m, kal, id);
      if (d.sohbet?.npc === id) { d.sohbet.bekleyen = null; return { d, id, k: d.npcler[id], n: kisi(veri, seed, id) }; }
    }
  }
  return null;
}
// Bir konuyu aç (oturumda görünmüyorsa zorla görünür yap) ve bekleyen soruyu 'sec' ile cevapla
function konus(t, konu, r, sec = l => l[0]) {
  const o = t.d.sohbet;
  o.kullanilan = {};
  o.bas = (o.bas ?? 0) + 1; // farklı derin konu çekilişi
  let tur = 0;
  while (!sohbetKonulari(t.d, veri).some(x => x.konu === 'derin:' + konu) && tur++ < 300) o.bas++;
  const dk = t.d.zaman.dakika;
  const s = sohbetHamlesi(t.d, veri, r, 'derin:' + konu);
  assert.ok(s.tamam, `${konu}: ${s.sebep} [${sohbetKonulari(t.d, veri).map(x => x.konu)}] yak ${t.k.iliski.yakinlik} sira ${t.k.oykuSira} bekleyen ${JSON.stringify(t.d.sohbet?.bekleyen)}`);
  const p = [...s.paragraflar];
  while (t.d.sohbet?.bekleyen) {
    const l = sohbetKonulari(t.d, veri);
    const c = sohbetHamlesi(t.d, veri, r, sec(l).konu);
    assert.ok(c.tamam, c.sebep);
    p.push(...c.paragraflar);
  }
  p.forEach(x => temiz(x.metin));
  t.d.sohbet ??= { npc: t.id, mekan: t.d.konum.mekan, kalan: 99, kullanilan: {}, bekleyen: null, bas: 0 };
  t.d.sohbet.kalan = 99;
  t.d.zaman.dakika = dk; // kişi kapanış saatinde gitmesin (testte zaman ilerlemez)
  return p;
}

test('veri: her müzik, hobi, takım, değer ve yemeğin karşılığı var', () => {
  const D = npc.derinlik;
  for (const ku of ['genc', 'orta', 'yasli']) {
    for (const g of D.muzik[ku]) assert.ok(Z.muzik.tur[g]?.soz && Z.muzik.tur[g].dinler, g);
    for (const h of D.hobi[ku]) assert.ok(Z.hobi.tur[h]?.soz?.length && Z.hobi.tur[h].sev, h);
  }
  for (const t of D.takim) assert.ok(Z.futbol.takim[t.id], t.id);
  for (const t of D.degerler) assert.ok(Z.deger.soz[t.id]?.length, t.id);
  for (const k of D.kulupler) assert.ok(Z.futbol.kulupler[k], k);
  for (const a of D.kotuAliskanlik.filter(x => x.id !== 'yok')) assert.ok(Z.rutin.aliskanlik[a.id], a.id);
});

test('haftanın maçı belirlenimli: herkes aynı sonucu bilir; lig arasında maç yok', () => {
  const d = yeniDurum(veri.sim, { seed: 'MAC', baslangic: '2026-10-20' });
  const a = haftaninMaci(d, veri, 'Demirspor'), b = haftaninMaci(d, veri, 'Demirspor');
  assert.deepEqual(a, b);
  assert.ok(npc.zevk.futbol.rakipler.includes(a.rakip) && /^\d-\d$/.test(a.skor));
  const [x, y] = a.skor.split('-').map(Number);
  assert.ok(a.sonuc === 'g' ? x > y : a.sonuc === 'm' ? x < y : x === y, JSON.stringify(a));
  d.zaman.dakika = 250 * 1440; // 2027 haziran sonu
  assert.equal(haftaninMaci(d, veri, 'Demirspor'), null);
});

test('müzik: kişi kartındaki türü söyler; ortaksa yakınlaşırsınız; oyuncunun zevki kaydolur ve başkasına da aynı kalır', () => {
  let ortakOldu = 0;
  for (let i = 0; i < 25; i++) {
    const t = oturum('MZK' + i);
    if (!t) continue;
    const d = derinlik(t.d.seed, t.n, veri);
    const r = Rng.akis('m' + i, 'x');
    const once = t.k.iliski.yakinlik;
    const p = konus(t, 'muzik', r, l => l.find(x => x.konu === 'cevap:z:m:' + d.muzik) ?? l[0]);
    assert.ok(p.some(x => Z.muzik.tur[d.muzik].soz._?.includes(x.metin) || Object.values(Z.muzik.tur[d.muzik].soz).flat().some(s => x.metin.startsWith(s.slice(0, 12)))), `${d.muzik}: ${p.map(x => x.metin).join(' | ')}`);
    const oz = oyuncuZevki(t.d);
    if (oz.muzik.includes(d.muzik)) { ortakOldu++; assert.ok(t.k.iliski.yakinlik - once >= 3 && t.k.anilar.some(a => a.metin.includes('zevkiniz aynı'))); }
    assert.ok(ogrendiklerim(t.d, veri, t.id, t.n).some(([a]) => a === 'Müzik'));
  }
  assert.ok(ortakOldu > 5, `ortak ${ortakOldu}`);
  // Tutarlılık: "pek dinlemem" diyen başkasına rap sevdiğini söyleyemez
  const t = oturum('MZK-T');
  oyuncuZevki(t.d).muzikYok = true;
  t.d.sohbet.bekleyen = { tur: 'zevk', alan: 'muzik', soran: 'npc' };
  assert.deepEqual(sohbetKonulari(t.d, veri).map(x => x.konu), ['cevap:z:m:yok', 'cevap:z:m:gec']);
});

test('futbol: takım kartla aynı; oyuncunun takımı bir kez seçilir; rakip takım gerer, aynı takım yakınlaştırır', () => {
  let ayni = 0, rakip = 0, gecen = 0;
  for (let i = 0; i < 40; i++) {
    const t = oturum('FTB' + i);
    if (!t) continue;
    const d = derinlik(t.d.seed, t.n, veri);
    const r = Rng.akis('f' + i, 'x');
    const secim = i % 3 === 0 && d.kulup ? d.kulup : i % 2 ? 'Galatasaray' : 'Fenerbahçe';
    const once = { ...t.k.iliski };
    konus(t, 'futbol', r, l => l.find(x => x.konu === 'cevap:z:f:' + secim) ?? l[0]);
    if (['ilgisiz', 'nefret'].includes(d.takimId)) { assert.equal(t.k.bilinen.oyuncu_takim, undefined); continue; }
    assert.equal(oyuncuZevki(t.d).takim, secim);
    if (d.kulup === secim) { ayni++; assert.ok(t.k.iliski.yakinlik - (once.yakinlik ?? 0) >= 3); }
    if (d.takimId === 'buyuk' && d.kulup !== secim && (t.n.ozellikler.includes('kavgaci') || t.n.ozellikler.includes('alingan'))) { rakip++; assert.ok((t.k.iliski.gerginlik ?? 0) > (once.gerginlik ?? 0)); }
    // İkinci kez: yalnızca kendi takımın (ya da geçiştirmek) seçilebilir
    t.d.sohbet.bekleyen = { tur: 'zevk', alan: 'futbol', soran: 'npc' };
    assert.deepEqual(sohbetKonulari(t.d, veri).map(x => x.konu), ['cevap:z:f:' + secim, 'cevap:z:f:gec']);
    t.d.sohbet.bekleyen = null;
    // Haftaya: maç konuşulur (kişi o gün oradaysa)
    t.d.zaman.dakika += 7 * 1440;
    if (!oturumGecerli(t.d, veri)) continue;
    const p = konus(t, 'futbol', r);
    const mac = haftaninMaci(t.d, veri, d.kulup);
    if (mac && d.takimId !== 'buyuk') { gecen++; assert.ok(p.some(x => x.metin.includes(mac.skor)), p.map(x => x.metin).join(' | ')); }
  }
  assert.ok(ayni > 0 && gecen > 0, `${ayni} aynı, ${rakip} rakip, ${gecen} maç`);
});

test('aile: isimler, yaşlar, yıllar kişi kartıyla aynı; hassas konu düşük yakınlıkta geçiştirilir, yüksekte açılır', () => {
  let acildi = 0, kacti = 0, isim = 0;
  for (let i = 0; i < 80 && (acildi < 3 || kacti < 3); i++) {
    const t = oturum('AIL' + i);
    if (!t) continue;
    const d = derinlik(t.d.seed, t.n, veri), aile = aileAgaci(t.d.seed, t.n, veri);
    const hassasAile = ['boşanması', 'çocuğu olmaması', 'annesi', 'babası', 'kardeşiyle arası'].includes(d.hassas);
    const yuksek = i % 2 === 0;
    t.k.iliski.yakinlik = yuksek ? 40 : 9;
    const once = t.k.iliski.guven ?? 0;
    const p = [];
    for (let j = 0; j < 3 && t.d.sohbet; j++) { try { p.push(...konus(t, 'aile', Rng.akis('a' + i + j, 'x'))); } catch { break; } }
    const metin = p.map(x => x.metin).join(' ');
    // Karttaki isimler: söylenen her aile adı kartta var; kartta olmayan bir eş adı söylenmez
    if (aile.es && ['evli', 'sevgilili'].includes(t.n.medeni) && !(hassasAile && !yuksek && d.hassas === 'boşanması')) { assert.ok(metin.includes(aile.es.ad), `${t.n.medeni} ${aile.es.ad}: ${metin}`); isim++; }
    if (!aile.cocuklar.length) assert.ok(!/çocuğum var|oğlum|kızım/.test(metin), metin);
    for (const c of aile.cocuklar) if (metin.includes(`${c.ad}; `)) assert.ok(metin.includes(`${c.yas} yaşında`) || aile.cocuklar.length > 1);
    if (!aile.kardesler.length && /kardeşiz/.test(metin)) assert.fail(metin);
    if (aile.kardesler.length) assert.ok(!/Tek çocuğum/.test(metin));
    if (aile.anne && !aile.anne.yasiyor) assert.ok(!/Annem [^ ]+, babam [^;]+; ikisi de/.test(metin), metin);
    if (hassasAile && t.d.npcler[t.id].bilinen.hassasKacti && !yuksek) kacti++;
    if (hassasAile && yuksek && t.k.anilar.some(a => a.metin.includes('kimseye anlatmadığı'))) { acildi++; assert.ok((t.k.iliski.guven ?? 0) >= once + 3); }
    if (aile.iliski === 'iyi') assert.ok(!/aramız hiç iyi olmadı|anlaşamadık|konuşmuyoruz sayılır|Ne söylesem yanlış/.test(metin), metin);
  }
  assert.ok(acildi >= 1 && kacti >= 1 && isim > 5, `${acildi} açıldı, ${kacti} kaçtı, ${isim} isim`);
});

test('geçmiş: hayat öyküsü yıl sırasıyla, üçer üçer anlatılır ve biter; değerler iki kez konuşulur', () => {
  const t = oturum('GEC', n => n.yas >= 45);
  t.k.iliski.yakinlik = 50;
  const kart = kisiKarti(t.d, veri, t.id);
  const oyku = kart.oyku.filter((x, i) => i > 0 && !x.metin.startsWith('Son zamanlarda'));
  const yillar = [];
  for (let i = 0; i < 20 && (t.k.oykuSira ?? 0) < oyku.length; i++) {
    const p = konus(t, 'gecmis', Rng.akis('g' + i, 'x'));
    yillar.push(...p.filter(x => /^\d{4}: /.test(x.metin)).map(x => Number(x.metin.slice(0, 4))));
  }
  assert.deepEqual(yillar, oyku.map(x => x.yil));
  assert.ok(!sohbetKonulari(t.d, veri).some(x => x.konu === 'derin:gecmis'), 'bitince konu kalkar');
  // Değerler
  konus(t, 'deger', Rng.akis('d1', 'x'), l => l.find(x => x.konu.endsWith('katil')));
  konus(t, 'deger', Rng.akis('d2', 'x'), l => l.find(x => x.konu.endsWith('katilma')));
  assert.equal(t.k.bilinen.degerler.length, 2);
  assert.ok(!sohbetKonulari(t.d, veri).some(x => x.konu === 'derin:deger'));
});

test('menü kalabalıklaşmaz; kişi de müziğini/takımını sorar; öğrendiklerin ve zevklerin panellerde', () => {
  let soran = 0;
  for (let i = 0; i < 30; i++) {
    const t = oturum('MEN' + i);
    if (!t) continue;
    const l = sohbetKonulari(t.d, veri);
    assert.ok(l.length <= 12 && l.filter(x => x.konu.startsWith('derin:')).length <= Z.gosterim.oturumBasi, l.map(x => x.konu).join());
    const r = Rng.akis('s' + i, 'x');
    for (let j = 0; j < 4 && t.d.sohbet; j++) {
      const s = sohbetHamlesi(t.d, veri, r, 'hal') ;
      if (!s.tamam) { t.d.sohbet.kullanilan = {}; continue; }
      if (t.d.sohbet?.bekleyen?.tur === 'zevk') { soran++; const c = sohbetKonulari(t.d, veri); sohbetHamlesi(t.d, veri, r, c[0].konu); }
      if (t.d.sohbet) { t.d.sohbet.kullanilan = {}; t.d.sohbet.bekleyen = null; t.d.sohbet.kalan = 99; }
    }
  }
  assert.ok(soran > 0, 'kişi hiç zevk sormadı');
  const t = oturum('PAN');
  konus(t, 'muzik', Rng.akis('p', 'x'));
  konus(t, 'hobi', Rng.akis('p2', 'x'), l => l.find(x => x.konu.endsWith(':ayni')) ?? l[0]);
  assert.ok(zevkOzeti(t.d, veri).length >= 1);
  ogrendiklerim(t.d, veri, t.id, t.n).forEach(([, v]) => temiz(v));
});

test('çok kişiyle bütün derin konular: metinler temiz, bozuk ek yok', () => {
  for (let i = 0; i < 30; i++) {
    const t = oturum('TUM' + i, () => true, i % 2 ? 'kordon_mekan' : 'cinaralti_kahvesi');
    if (!t) continue;
    t.k.iliski.yakinlik = 30;
    for (const konu of ['muzik', 'futbol', 'hobi', 'rutin', 'aile', 'gecmis', 'deger']) {
      if (!t.d.sohbet) break;
      const r = Rng.akis(`t${i}${konu}`, 'x');
      try { konus(t, konu, r, l => l[r.aralik(0, l.length - 1)]); } catch (e) { if (!String(e.message).includes('açamazsın')) throw e; }
    }
  }
});
