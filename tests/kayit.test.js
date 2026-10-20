import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yeniDurum, rngAl, KAYIT_SURUMU } from '../js/core/durum.js';
import { aksiyonUygula } from '../js/core/aksiyon.js';
import { zarfla, zarfAc, dogrula, KayitHatasi, saglamaHesapla } from '../js/core/kayitbicim.js';
import { tasi } from '../js/core/migration.js';
import { KayitDeposu } from '../js/core/kayitdeposu.js';

const sim = JSON.parse(readFileSync(new URL('../data/simulasyon.json', import.meta.url)));
const aksiyonlar = JSON.parse(readFileSync(new URL('../data/aksiyonlar.json', import.meta.url))).aksiyonlar;
const yeni = () => yeniDurum(sim, { seed: 'KAYT-0001', baslangic: '2026-10-20', saat: 8, para: 2000 });
const oynat = (d, n = 5) => { for (let i = 0; i < n; i++) aksiyonUygula(d, aksiyonlar.find(a => a.id === 'pencere'), sim, rngAl(d, 'aksiyon')); return d; };

// Bellek içi sahte depolar; hata enjekte edilebilir
function sahteAna() {
  const yuva = new Map(), yedek = new Map();
  let id = 0;
  return {
    yuva, yedek, bozuk: false, yazmaHatasi: false, okumaHatasi: false,
    async yuvaAl(n) { if (this.okumaHatasi) throw new Error('okuma'); return yuva.has(n) ? structuredClone(yuva.get(n)) : null; },
    async yuvaYaz(n, z) { if (this.yazmaHatasi) throw new Error('disk dolu'); yuva.set(n, structuredClone(z)); },
    async yuvaSil(n) { yuva.delete(n); },
    async yedekEkle(n, z) { yedek.set(++id, { id, yuva: n, zarf: structuredClone(z) }); return id; },
    async yedekler(n) { return [...yedek.values()].filter(y => y.yuva === n).map(y => structuredClone(y)); },
    async yedekSil(i) { yedek.delete(i); },
  };
}
function sahteYansi() {
  const m = new Map();
  return {
    m, yazmaHatasi: false,
    yuvaAl(n) { return m.has(n) ? JSON.parse(m.get(n)) : null; },
    yuvaYaz(n, z) { if (this.yazmaHatasi) throw new Error('kota'); m.set(n, JSON.stringify(z)); },
    yuvaSil(n) { m.delete(n); },
  };
}
let saat = 1_700_000_000_000;
const depoKur = () => {
  const ana = sahteAna(), yansi = sahteYansi(), hatalar = [];
  const depo = new KayitDeposu({ ana, yansi, simdi: () => (saat += 1000), hataBildir: (m) => hatalar.push(m) });
  return { ana, yansi, depo, hatalar };
};

test('zarfla / zarfAc gidiş-dönüş birebir aynı durum', () => {
  const d = oynat(yeni());
  const z = zarfla(d);
  assert.deepEqual(zarfAc(z), d);
  assert.deepEqual(zarfAc(JSON.stringify(z)), d);
});

test('tek bayt bozulması yakalanır', () => {
  const z = zarfla(oynat(yeni()));
  const bozuk = { ...z, veri: z.veri.replace('"para":', '"para" :') };
  assert.throws(() => zarfAc(bozuk), KayitHatasi);
  assert.throws(() => zarfAc('{bozuk json'), KayitHatasi);
  assert.throws(() => zarfAc({ bicim: 'baska' }), KayitHatasi);
  assert.throws(() => zarfAc(null), KayitHatasi);
});

test('geçersiz durum asla zarflanmaz', () => {
  const d = yeni();
  d.durumlar.enerji = NaN;
  assert.throws(() => zarfla(d), /geçersiz/);
  const d2 = yeni(); delete d2.zaman;
  assert.ok(dogrula(d2).length > 0);
  assert.deepEqual(dogrula(yeni()), []);
});

test('daha yeni sürüm kaydı reddedilir (veri bozulmadan)', () => {
  const z = zarfla(yeni());
  const d = JSON.parse(z.veri); d.kayitSurumu = KAYIT_SURUMU + 1;
  z.veri = JSON.stringify(d);
  z.saglama = saglamaHesapla(z.veri);
  assert.throws(() => zarfAc(z), e => e.tur === 'yeni_surum');
});

test('migration: adımlar sırayla uygulanır, eksik adım hata verir', () => {
  const adimlar = { 1: d => ({ ...d, yeniAlan: 'x', kayitSurumu: 2 }), 2: d => ({ ...d, yeniAlan: d.yeniAlan + 'y', kayitSurumu: 3 }) };
  const sonuc = tasi({ kayitSurumu: 1, a: 1 }, adimlar, 3);
  assert.deepEqual(sonuc, { kayitSurumu: 3, a: 1, yeniAlan: 'xy' });
  assert.throws(() => tasi({ kayitSurumu: 1 }, {}, 2), /dönüştürme adımı yok/);
  const orijinal = { kayitSurumu: 1, a: 1 };
  tasi(orijinal, adimlar, 3);
  assert.deepEqual(orijinal, { kayitSurumu: 1, a: 1 }, 'orijinal değişmemeli');
});

test('eski sürüm örnek kayıtları güncel şemaya sorunsuz açılır', () => {
  const v1 = readFileSync(new URL('./ornekler/kayit-v1.json', import.meta.url), 'utf8');
  const d = zarfAc(v1);
  assert.equal(d.kayitSurumu, KAYIT_SURUMU);
  assert.deepEqual(dogrula(d), []);
});

test('depo: kaydet ve yükle, iki depoya da yazar, sayaç artar', async () => {
  const { depo, ana, yansi } = depoKur();
  const d = oynat(yeni());
  const s = await depo.kaydet(1, d);
  assert.deepEqual(s, { ana: true, yansi: true });
  await depo.kaydet(1, oynat(d, 1));
  assert.equal(ana.yuva.get(1).sayac, 2);
  assert.equal(JSON.parse(yansi.m.get(1)).sayac, 2);
  const y = await depo.yukle(1);
  assert.deepEqual(y.durum, d);
  assert.equal(await depo.yukle(2), null);
});

test('depo: ana bozuksa yansıdan yüklenir ve ana onarılır', async () => {
  const { depo, ana } = depoKur();
  const d = oynat(yeni());
  await depo.kaydet(1, d);
  ana.yuva.get(1).veri = ana.yuva.get(1).veri.slice(0, 100); // yarım yazılmış
  const y = await depo.yukle(1);
  assert.equal(y.kaynak, 'yansi');
  assert.deepEqual(y.durum, d);
  assert.ok(y.sorunlar.length);
  assert.deepEqual(zarfAc(ana.yuva.get(1)), d, 'ana onarılmalı');
});

test('depo: ana yazılamazsa (disk dolu) yansı kurtarır; ikisi de yazılamazsa hata ve eski kayıt korunur', async () => {
  const { depo, ana, yansi, hatalar } = depoKur();
  const d1 = oynat(yeni());
  await depo.kaydet(1, d1);
  ana.yazmaHatasi = true;
  const d2 = oynat(structuredClone(d1), 2);
  const s = await depo.kaydet(1, d2);
  assert.deepEqual(s, { ana: false, yansi: true });
  assert.ok(hatalar.length);
  ana.yazmaHatasi = false;
  assert.deepEqual((await depo.yukle(1)).durum, d2, 'yansıdaki daha yeni kayıt seçilmeli');
  ana.yazmaHatasi = true; yansi.yazmaHatasi = true;
  await assert.rejects(depo.kaydet(1, oynat(structuredClone(d2), 1)), e => e.tur === 'yazilamadi');
  ana.yazmaHatasi = false; yansi.yazmaHatasi = false;
  assert.deepEqual((await depo.yukle(1)).durum, d2, 'başarısız yazma eski kaydı bozmamalı');
});

test('depo: ana eski kalmışsa (uygulama kapanırken IndexedDB yetişmedi) yansıdaki yeni kayıt seçilir', async () => {
  const { depo, ana } = depoKur();
  const d1 = oynat(yeni());
  await depo.kaydet(1, d1);
  const eski = structuredClone(ana.yuva.get(1));
  const d2 = oynat(structuredClone(d1), 3);
  await depo.kaydet(1, d2);
  ana.yuva.set(1, eski);
  const yeniDepo = new KayitDeposu({ ana, yansi: depo.yansi });
  const y = await yeniDepo.yukle(1);
  assert.deepEqual(y.durum, d2);
  assert.equal(ana.yuva.get(1).sayac, 2, 'ana güncellenmeli');
});

test('depo: iki depo da bozuksa otomatik yedekten kurtarır', async () => {
  const { depo, ana, yansi } = depoKur();
  const d1 = oynat(yeni());
  await depo.kaydet(1, d1, { yedekle: true });
  await depo.kaydet(1, oynat(structuredClone(d1), 2));
  ana.yuva.get(1).saglama = 'bozuk';
  yansi.m.set(1, '{"yarım');
  const y = await depo.yukle(1);
  assert.equal(y.kaynak, 'otomatikYedek');
  assert.deepEqual(y.durum, d1);
});

test('depo: yansı JSON olarak bozuksa bile çökmeden atlanır', async () => {
  const { depo, yansi } = depoKur();
  yansi.yuvaAl = () => { throw new SyntaxError('Unexpected token'); };
  const d = oynat(yeni());
  await depo.kaydet(1, d);
  assert.deepEqual((await depo.yukle(1)).durum, d);
});

test('depo: hiçbir şey kurtarılamazsa açık hata verir (sessizce yeni oyun açmaz)', async () => {
  const { depo, ana, yansi } = depoKur();
  await depo.kaydet(1, yeni());
  ana.yuva.get(1).saglama = 'x';
  yansi.m.set(1, 'çöp');
  await assert.rejects(depo.yukle(1), e => e.tur === 'kurtarilamadi');
});

test('depo: yuva başına en fazla 5 yedek, en yenileri kalır', async () => {
  const { depo } = depoKur();
  const d = yeni();
  for (let i = 0; i < 8; i++) { oynat(d, 1); await depo.kaydet(1, d, { yedekle: true }); }
  const liste = await depo.yedekListesi(1);
  assert.equal(liste.length, 5);
  assert.deepEqual(liste.map(x => x.sayac), [8, 7, 6, 5, 4]);
  await depo.kaydet(2, d, { yedekle: true });
  assert.equal((await depo.yedekListesi(2)).length, 1, 'yuvalar birbirini etkilemez');
});

test('depo: yedekten dönmeden önce mevcut hal yedeklenir', async () => {
  const { depo } = depoKur();
  const d1 = oynat(yeni());
  await depo.kaydet(1, d1, { yedekle: true });
  const d2 = oynat(structuredClone(d1), 4);
  await depo.kaydet(1, d2);
  const [ilk] = await depo.yedekListesi(1);
  const donulen = await depo.yedektenDon(1, ilk.id);
  assert.deepEqual(donulen, d1);
  assert.deepEqual((await depo.yukle(1)).durum, d1);
  const liste = await depo.yedekListesi(1);
  const ozetler = await Promise.all(liste.map(async x => x.ozet.dakika));
  assert.ok(ozetler.includes(d2.zaman.dakika), 'dönmeden önceki hal (d2) yedeklerde olmalı');
});

test('depo: silinen yuva yedeklerden geri getirilebilir', async () => {
  const { depo } = depoKur();
  const d = oynat(yeni());
  await depo.kaydet(3, d);
  await depo.yuvaSil(3);
  assert.equal(await depo.yukle(3), null);
  const [y] = await depo.yedekListesi(3);
  assert.deepEqual(await depo.yedektenDon(3, y.id), d);
});

test('depo: yuva özetleri', async () => {
  const { depo, ana, yansi } = depoKur();
  await depo.kaydet(1, oynat(yeni()));
  await depo.kaydet(2, yeni());
  ana.yuva.get(2).saglama = 'x'; yansi.m.set(2, '{}');
  const o = await depo.yuvaOzetleri();
  assert.equal(o.length, 3);
  assert.equal(o[0].bos, false); assert.equal(o[0].ozet.ad, 'Deniz');
  assert.equal(o[1].bozuk, true);
  assert.equal(o[2].bos, true);
});

test('stres: 300 ardışık kayıt, rastgele aralıklarla ana bozuluyor — son geçerli kayıt hiç kaybolmuyor', async () => {
  const { depo, ana } = depoKur();
  const d = yeni();
  let sonGecerli = null;
  for (let i = 0; i < 300; i++) {
    oynat(d, 1);
    ana.yazmaHatasi = i % 7 === 3;
    await depo.kaydet(1, d, { yedekle: i % 50 === 0 });
    sonGecerli = structuredClone(d);
    if (i % 11 === 5 && ana.yuva.get(1)) ana.yuva.get(1).veri = '{';
    const y = await depo.yukle(1);
    assert.deepEqual(y.durum, sonGecerli, 'adım ' + i);
  }
});

test('depo: içe aktarma dolu yuvanın mevcut halini önce yedekler', async () => {
  const { depo } = depoKur();
  const eski = oynat(yeni(), 3);
  await depo.kaydet(1, eski);
  const gelen = oynat(yeni(), 9);
  await depo.iceAktar(1, gelen);
  assert.deepEqual((await depo.yukle(1)).durum, gelen);
  const yedekler = await depo.yedekListesi(1);
  assert.ok(yedekler.some(y => y.ozet.dakika === eski.zaman.dakika), 'eski hal yedekte olmalı');
  assert.equal((await depo.enIyiZarf(1)).ozet.dakika, gelen.zaman.dakika);
  assert.equal(await depo.enIyiZarf(2), null);
});
