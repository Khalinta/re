// Kayıt dönüştürme (migration): eski sürüm kayıtları güncel şemaya taşınır.
//
// KURAL: Kayıt şeması her değiştiğinde
//   1) js/core/durum.js içindeki KAYIT_SURUMU bir artırılır,
//   2) aşağıya { n: durum => yeniDurum } adımı eklenir (n -> n+1),
//   3) tests/ornekler/ altına eski sürüm örnek kaydı kalır; test, onun güncel şemaya sorunsuz taşındığını denetler.
// Adımlar asla silinmez ya da değiştirilmez; yalnızca yenisi eklenir.
import { KAYIT_SURUMU } from './durum.js';
import { dunyaBaslangici } from './ilerleme.js';

export const ADIMLAR = {
  // 1 → 2 (0.1.10, adım 2.6): kendi ilerleyen dünya. Geçmiş günler sonradan işlenmez; dünya kayıt anından başlar.
  1: d => ({ ...d, dunya: dunyaBaslangici(d.zaman), kayitSurumu: 2 }),
};

export function tasi(d, adimlar = ADIMLAR, hedef = KAYIT_SURUMU) {
  let x = structuredClone(d);
  if (!Number.isInteger(x.kayitSurumu)) x.kayitSurumu = 1;
  while (x.kayitSurumu < hedef) {
    const adim = adimlar[x.kayitSurumu];
    if (!adim) throw new Error(`Kayıt sürümü ${x.kayitSurumu} için dönüştürme adımı yok`);
    const onceki = x.kayitSurumu;
    x = adim(x);
    if (x.kayitSurumu !== onceki + 1) x.kayitSurumu = onceki + 1;
  }
  return x;
}
