// Geliştirici aracı: güncel şemayla örnek kayıt üretir -> tests/ornekler/kayit-v<N>.json
// Kayıt şeması her değiştiğinde ESKİ örnek silinmez; yeni sürüm için de bir örnek üretilir.
// Testler tüm eski örneklerin güncel şemaya taşınabildiğini denetler.
import { readFileSync, writeFileSync } from 'node:fs';
import { yeniDurum, rngAl, KAYIT_SURUMU } from '../js/core/durum.js';
import { aksiyonUygula } from '../js/core/aksiyon.js';
import { zarfla } from '../js/core/kayitbicim.js';

const sim = JSON.parse(readFileSync(new URL('../data/simulasyon.json', import.meta.url)));
const aks = JSON.parse(readFileSync(new URL('../data/aksiyonlar.json', import.meta.url))).aksiyonlar;
const d = yeniDurum(sim, { seed: 'ORNK-V001', baslangic: '2026-10-20', saat: 8, para: 2000 });
d.olusturma = '2026-10-20T05:00:00.000Z';
for (const id of ['cay', 'yuruyus', 'yemek_hazirla', 'dus', 'telefon_kaydir', 'uyu', 'pencere']) {
  aksiyonUygula(d, aks.find(a => a.id === id), sim, rngAl(d, 'aksiyon'));
}
const yol = new URL(`../tests/ornekler/kayit-v${KAYIT_SURUMU}.json`, import.meta.url);
writeFileSync(yol, JSON.stringify(zarfla(d, { sayac: 7, simdi: Date.UTC(2026, 9, 20, 12) }), null, 1));
console.log('yazıldı:', yol.pathname);
