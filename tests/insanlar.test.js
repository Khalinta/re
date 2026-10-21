import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum } from '../js/core/durum.js';
import * as konum from '../js/core/konum.js';
import { mekandakiler, kisi, gorunus, tanisiyorMu, tanidiklari } from '../js/core/insanlar.js';
import { tanis, yaninaOtur, sohbetKonulari, sohbetHamlesi } from '../js/core/sohbet.js';
import { mekanBul } from '../js/core/mekan.js';
import { Rng } from '../js/core/rng.js';

const oku = y => JSON.parse(readFileSync(new URL('../' + y, import.meta.url)));
const dunya = {};
for (const f of ['sehir', 'semtler', 'ulasim', 'kurumlar', 'sirketler', 'figurler', 'orgutler', 'mekanlar']) dunya[f] = oku(`data/dunya/${f}.json`);
const npc = {};
for (const f of ['isimler', 'memleket', 'kisilik', 'hayat', 'sohbet', 'gorunus', 'flort', 'dedikodu']) npc[f] = oku(`data/npc/${f}.json`);
const veri = { sim: oku('data/simulasyon.json'), takvim: oku('data/takvim.json'), dunya, npc, hava: oku('data/hava.json'), ekonomi: oku('data/ekonomi.json'), gezi: oku('data/gezi.json') };
const yeni = (saat = 9) => yeniDurum(veri.sim, { seed: 'INSAN', baslangic: '2026-10-20', saat, para: 2000, ev: { semt: 'eski_carsi', tip: 'oda', ad: 'oda' } });
const cinar = mekanBul(dunya, 'cinaralti_kahvesi');

test('mekandakiler: aynı saatte aynı insanlar; başka gün başkaları; boş mekanda yalnızca sahibi', () => {
  const d = yeni();
  const a = mekandakiler(d, veri, cinar, 3), b = mekandakiler(d, veri, cinar, 3);
  assert.deepEqual(a, b);
  assert.ok(a.length >= 3);
  for (const id of a) assert.ok(kisi(veri, d.seed, id), id);
  d.zaman.dakika += 1440;
  assert.notDeepEqual(mekandakiler(d, veri, cinar, 3), a);
  for (let g = 0; g < 10; g++) { d.zaman.dakika += 1440; for (const id of mekandakiler(d, veri, cinar, 0)) assert.equal(id, 'm:cinaralti_kahvesi'); }
});

test('sahibi ve müdavim figürler mekanda görülür; semtin insanları semtin başka yerlerinde de karşına çıkar', () => {
  const d = yeni();
  const sayim = {};
  const nerede = {};
  for (let g = 0; g < 40; g++) {
    for (const m of dunya.mekanlar.mekanlar.filter(x => x.semt === 'eski_carsi')) {
      for (const id of mekandakiler(d, veri, m, 2)) { sayim[id] = (sayim[id] || 0) + 1; (nerede[id] ??= new Set()).add(m.id); }
    }
    d.zaman.dakika += 1440;
  }
  assert.ok(sayim['m:cinaralti_kahvesi'] > 25);
  assert.ok(sayim['f:ohannes_saatciyan'] > 10);
  assert.ok(Object.entries(nerede).some(([id, s]) => id.startsWith('n:eski_carsi:') && s.size >= 2));
});

test('görünüş tarifi düzgün', () => {
  const d = yeni();
  for (let k = 0; k < 40; k++) {
    const g = gorunus(kisi(veri, d.seed, `n:camlik:${k}`), veri);
    assert.ok(g.length > 8 && !g.includes('undefined'), g);
  }
});

test('tanışıklık ağı: müdavimler mekan sahibini tanır; figürler ilişkili olduklarını tanır; simetrik', () => {
  const s = 'AG';
  assert.ok(tanisiyorMu(veri, s, 'n:cinaralti_kahvesi:2', 'm:cinaralti_kahvesi'));
  assert.ok(tanisiyorMu(veri, s, 'f:haluk_tanriverdi', 'f:cemal_sanli'));
  assert.ok(tanisiyorMu(veri, s, 'f:ohannes_saatciyan', 'm:cinaralti_kahvesi')); // Çınaraltı müdavimi
  for (const [a, b] of [['n:camlik:1', 'n:camlik:2'], ['m:sefa_bakkal', 'n:tabakhane:3'], ['f:volkan_serter', 'f:hasan_karakas']]) {
    assert.equal(tanisiyorMu(veri, s, a, b), tanisiyorMu(veri, s, b, a));
  }
  const t = tanidiklari(veri, s, 'm:cinaralti_kahvesi');
  assert.ok(t.length >= 6 && t.length < 120, String(t.length));
});


// Bir kişiyle (orada olduğu bir anda) tanışana kadar dener; döner: { d, id, an }
function tanisilmis(seed = 'INSAN', mekanId = 'cinaralti_kahvesi', kosul = () => true) {
  const d = yeniDurum(veri.sim, { seed, baslangic: '2026-10-20', saat: 9, para: 2000, ev: { semt: 'eski_carsi', tip: 'oda', ad: 'oda' } });
  const m = mekanBul(dunya, mekanId);
  d.konum = { semt: m.semt, mekan: m.id };
  const r = Rng.akis(seed, 'tanis');
  for (let g = 0; g < 60; g++) {
    for (const saat of [9, 13, 19]) {
      const an = g * 1440 + saat * 60;
      d.zaman.dakika = an;
      const kal = m.kalabalik[saat < 12 ? 'sabah' : saat < 17 ? 'ogle' : 'aksam'];
      for (const id of mekandakiler(d, veri, m, kal)) {
        if (!kosul(kisi(veri, d.seed, id))) continue;
        d.bilgi.retler = {};
        tanis(d, veri, r, m, kal, id);
        if (d.npcler?.[id]?.tanisildi !== undefined) return { d, id, an, m, kal, r };
      }
    }
  }
  return null;
}
const metinler = p => p.map(x => x.metin);
const temiz = p => { for (const x of p) assert.ok(!/[«{}]|undefined|null/.test(x.metin), x.metin); };

test('tanışma: kişi kendini kendi ağzından tanıtır, görünüşü anlatılır, sohbet oturumu başlar', () => {
  const t = tanisilmis();
  assert.ok(t);
  const { d, id } = t;
  const son = d.anlatim.length ? d.anlatim : [];
  void son;
  assert.ok(d.sohbet && d.sohbet.npc === id && d.sohbet.kalan >= 1);
  if (d.sohbet.bekleyen) { const c = sohbetKonulari(d, veri); assert.ok(c.length && c.every(x => x.konu.startsWith('cevap:'))); sohbetHamlesi(d, veri, t.r, c[0].konu); }
  const konular = sohbetKonulari(d, veri).map(x => x.konu);
  for (const k of ['hal', 'is', 'memleket', 'kendin', 'bitir']) assert.ok(konular.includes(k), k);
  assert.ok(!konular.includes('hayal')); // yakınlık düşük
});

test('sohbet: cevaplar konuşanın ağzından, şablonlar çözülü; bir kez sorulan konu oturumda tekrar açılmaz; sabır bitince kişi kalkar', () => {
  const { d, id, an, r } = tanisilmis('SOHBET');
  const ad = kisi(veri, d.seed, id).hitapAdi;
  let bitti = false, n = 0;
  while (d.sohbet && n < 60) {
    d.zaman.dakika = an;
    const secenek = sohbetKonulari(d, veri).filter(x => x.konu !== 'bitir');
    if (!secenek.length) break;
    const s = sohbetHamlesi(d, veri, r, secenek[0].konu);
    assert.ok(s.tamam, s.sebep);
    temiz(s.paragraflar);
    if (['hal', 'is', 'memleket', 'semt', 'gundem'].includes(secenek[0].konu)) assert.ok(s.paragraflar.some(p => p.tur === 'konusma' && p.konusan === ad), secenek[0].konu);
    if (!d.sohbet) bitti = true;
    else if (!secenek[0].konu.startsWith('cevap:')) assert.ok(!sohbetKonulari(d, veri).some(x => x.konu === secenek[0].konu));
    n++;
  }
  assert.ok(bitti, 'kişinin sabrı hiç bitmedi');
});

test('çeşitlilik: aynı kişiyle günlerce konuşunca cümleler tekrar etmiyor; farklı insanlar farklı konuşuyor', () => {
  const { d, id, an, r } = tanisilmis('CESIT');
  const duyulan = [];
  for (let gun = 0; gun < 8; gun++) {
    d.zaman.dakika = an;
    d.sohbet = { npc: id, mekan: d.konum.mekan, kalan: 9, kullanilan: {} };
    for (const konu of ['hal', 'semt', 'gundem', 'saka', 'is']) {
      if (!d.sohbet) break;
      d.sohbet.bekleyen = null;
      d.zaman.dakika = an;
      const s = sohbetHamlesi(d, veri, r, konu);
      if (s.tamam) duyulan.push(...metinler(s.paragraflar.filter(p => p.tur !== 'secim' && p.tur !== 'sistem')));
    }
  }
  const tekrar = duyulan.length - new Set(duyulan).size;
  assert.ok(tekrar / duyulan.length < 0.25, `${tekrar}/${duyulan.length} tekrar`);
});

test('dert eşiği: yakınlık düşükken kaçamak; yüksekken birinci ağızdan anlatır ve tekrar sorulunca aynısını anlatmaz', () => {
  const { d, id, an, r } = tanisilmis('DERT', 'cinaralti_kahvesi', n => !!n.dert);
  const k = d.npcler[id];
  k.iliski.yakinlik = 2;
  d.zaman.dakika = an;
  d.sohbet = { npc: id, mekan: d.konum.mekan, kalan: 9, kullanilan: {} };
  sohbetHamlesi(d, veri, r, 'dert');
  assert.ok(!k.bilinen.dert);
  k.iliski.yakinlik = 30;
  d.sohbet = { npc: id, mekan: d.konum.mekan, kalan: 9, kullanilan: {} };
  d.zaman.dakika = an;
  const s = sohbetHamlesi(d, veri, r, 'dert');
  assert.ok(k.bilinen.dert);
  const dert = veri.npc.hayat.dertler.find(x => x.id === kisi(veri, d.seed, id).dert);
  assert.ok(s.paragraflar.some(p => p.tur === 'konusma' && dert.soz.some(z => p.metin.startsWith(z.slice(0, 15)))));
  d.sohbet = { npc: id, mekan: d.konum.mekan, kalan: 9, kullanilan: {} };
  d.zaman.dakika = an;
  const t = sohbetHamlesi(d, veri, r, 'dert');
  assert.ok(!t.paragraflar.some(p => dert.soz.some(z => p.metin.startsWith(z.slice(0, 15)))));
});

test('şaka ters gidebilir; gerginlik eşiği aşılınca kişi yanına oturmana izin vermez', () => {
  const { d, id, an, m, kal, r } = tanisilmis('SAKA');
  const k = d.npcler[id];
  k.iliski.gerginlik = 9;
  d.sohbet = null; delete d.sohbet;
  d.zaman.dakika = an;
  const s = yaninaOtur(d, veri, r, m, kal, id);
  assert.ok(s.tamam && !d.sohbet);
});

test('kimse kendisi, örgütü ya da mekanı hakkındaki dedikoduyu anlatmaz', () => {
  const t = tanisilmis('SIR', 'gar_palas_lobi', n => n.figur === 'selda_karakas') || tanisilmis('SIR2', 'gar_palas_lobi', n => n.figur === 'selda_karakas');
  assert.ok(t, 'Selda ile tanışılamadı');
  const { d, id, an, r } = t;
  d.npcler[id].iliski.yakinlik = 50;
  const gizliler = new Set(dunya.mekanlar.mekanlar.filter(m => m.gizli?.orgut === 'karakaslar').flatMap(m => m.dedikodular.map(x => x.id)));
  for (let i = 0; i < 25; i++) {
    d.zaman.dakika = an;
    d.sohbet = { npc: id, mekan: d.konum.mekan, kalan: 9, kullanilan: {} };
    sohbetHamlesi(d, veri, r, 'dedikodu');
  }
  for (const [did, b] of Object.entries(d.bilgi.dedikodular || {})) if (b.kaynak === id) {
    if (did.startsWith('p:')) { // insanlar hakkında: kendisi ya da örgütünün insanları değil
      assert.notEqual(b.kisi, id);
      assert.ok(!['f:hasan_karakas'].includes(b.kisi), did);
      continue;
    }
    assert.ok(!gizliler.has(did), did);
    const dd = dunya.mekanlar.mekanlar.flatMap(m => m.dedikodular).find(x => x.id === did);
    assert.ok(!['orgut:karakaslar', 'figur:selda_karakas', 'figur:hasan_karakas'].includes(dd.konu), did);
  }
});

test('ağızsı ağzı olmayan veri: bütün sohbet cümleleri tanınan yer tutucularla yazılmış', () => {
  const izinli = new Set(['ad', 'ilkAd', 'hitapAdi', 'hitap', 'meslek', 'meslekEski', 'memleketAd', 'memleketDen', 'memleketLi', 'memleketLiyim', 'kokenAd', 'semtAd', 'gerilimAd', 'haber', 'dedikodu', 'tanidikAd', 'tanidikYer', 'tanidikYorum', 'mekanAd', 'adamim', 'partner', 'esAd', 'rakipAd']);
  const oyuncuIzinli = new Set(['ad', 'eskiMeslek', 'semt', 'ozet', 'memleket', 'memleketCumle']);
  const gez = x => {
    if (typeof x === 'string') {
      for (const [, v] of x.matchAll(/\{s\.([a-zA-Z]+)/g)) assert.ok(izinli.has(v), `${v}: ${x}`);
      for (const [, v] of x.matchAll(/\{o\.([a-zA-Z]+)/g)) assert.ok(oyuncuIzinli.has(v), `o.${v}: ${x}`);
      for (const [, v] of x.matchAll(/\{([a-z]+)\./g)) assert.ok(['s', 'o', 't', 'u'].includes(v), `${v}: ${x}`);
    } else if (Array.isArray(x)) x.forEach(gez); else if (x && typeof x === 'object') Object.values(x).forEach(gez);
  };
  gez(veri.npc.sohbet); gez(veri.npc.flort); gez(veri.npc.dedikodu);
});

test('konum: mekanda insan seçenekleri; sohbet açıkken yalnızca konular', () => {
  const { d } = tanisilmis('KONUM');
  const ids = konum.baglamAksiyonlari(d, veri).map(a => a.id);
  assert.ok(ids.length && ids.every(x => x.startsWith('sohbet:')), ids.join());
  assert.ok(ids.includes('sohbet:bitir'));
});
