// Kayıt biçimi: oyun durumu bir "zarf" içinde saklanır.
//
//   zarf = { bicim: 'yeniden-kayit', kayitSurumu, oyunSurumu, sayac, kayitZamani, ozet, saglama, veri }
//
// - veri: durumun JSON metni. Sağlama bu metin üzerinden hesaplanır; bir bayt bile bozulursa anlaşılır.
// - sayac: aynı yuvadaki her kayıtta bir artar. İki depodan hangisinin daha yeni olduğu buna bakılarak seçilir
//   (cihaz saati değişse bile doğru çalışır).
// - ozet: yuva listesinde göstermek için küçük bilgi (veriyi açmaya gerek kalmasın).
import { cyrb128 } from './rng.js';
import { KAYIT_SURUMU } from './durum.js';
import { tasi } from './migration.js';

export const BICIM = 'yeniden-kayit';

export class KayitHatasi extends Error {
  constructor(mesaj, tur = 'bozuk') { super(mesaj); this.name = 'KayitHatasi'; this.tur = tur; }
}

export function saglamaHesapla(metin) {
  const [a, b] = cyrb128(metin);
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

// Durumun beklenen şekilde olup olmadığını denetler. Döner: sorun listesi (boşsa sağlam).
export function dogrula(d) {
  const s = [];
  const nesne = x => x && typeof x === 'object' && !Array.isArray(x);
  const sayi = x => typeof x === 'number' && Number.isFinite(x);
  if (!nesne(d)) return ['durum nesne değil'];
  if (!Number.isInteger(d.kayitSurumu)) s.push('kayitSurumu eksik');
  if (typeof d.seed !== 'string' || !d.seed) s.push('seed eksik');
  if (!nesne(d.zaman)) s.push('zaman eksik');
  else {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.zaman.baslangic || '')) s.push('zaman.baslangic geçersiz');
    if (!sayi(d.zaman.dakika) || d.zaman.dakika < 0) s.push('zaman.dakika geçersiz');
  }
  if (!nesne(d.durumlar)) s.push('durumlar eksik');
  else for (const [k, v] of Object.entries(d.durumlar)) if (!sayi(v) || v < 0 || v > 100) s.push(`durumlar.${k} geçersiz (${v})`);
  if (!sayi(d.para)) s.push('para geçersiz');
  if (!nesne(d.karakter)) s.push('karakter eksik');
  for (const k of ['beceriler', 'sayaclar', 'olayGecmisi', 'rng']) if (!nesne(d[k])) s.push(k + ' eksik');
  if (!nesne(d.bayraklar)) s.push('bayraklar eksik');
  for (const k of ['zamanlayicilar', 'aksiyonGecmisi', 'anlatim', 'gunluk']) if (!Array.isArray(d[k])) s.push(k + ' eksik');
  return s;
}

export function ozetCikar(d) {
  return {
    ad: d.karakter?.ad || '',
    baslangic: d.zaman?.baslangic,
    dakika: d.zaman?.dakika,
    para: d.para,
  };
}

// Durumu zarfa koyar. Durum geçersizse hata fırlatır (bozuk durum asla diske yazılmaz).
export function zarfla(durum, { sayac = 1, simdi = Date.now() } = {}) {
  const sorunlar = dogrula(durum);
  if (sorunlar.length) throw new KayitHatasi('Kaydedilecek durum geçersiz: ' + sorunlar.join(', '), 'gecersiz');
  const veri = JSON.stringify(durum);
  return {
    bicim: BICIM,
    kayitSurumu: durum.kayitSurumu,
    oyunSurumu: durum.oyunSurumu,
    sayac,
    kayitZamani: simdi,
    ozet: ozetCikar(durum),
    saglama: saglamaHesapla(veri),
    veri,
  };
}

// Zarfı açar: biçim, sağlama, migration, doğrulama. Sağlam değilse KayitHatasi fırlatır.
export function zarfAc(zarf) {
  if (typeof zarf === 'string') {
    try { zarf = JSON.parse(zarf); } catch { throw new KayitHatasi('Kayıt okunamadı (JSON bozuk)'); }
  }
  if (!zarf || zarf.bicim !== BICIM) throw new KayitHatasi('Bu bir Yeniden kaydı değil');
  if (typeof zarf.veri !== 'string') throw new KayitHatasi('Kayıt verisi eksik');
  if (saglamaHesapla(zarf.veri) !== zarf.saglama) throw new KayitHatasi('Kayıt bozulmuş (sağlama tutmuyor)');
  let d;
  try { d = JSON.parse(zarf.veri); } catch { throw new KayitHatasi('Kayıt verisi okunamadı'); }
  if (Number.isInteger(d.kayitSurumu) && d.kayitSurumu > KAYIT_SURUMU) {
    throw new KayitHatasi(`Bu kayıt oyunun daha yeni bir sürümünden (kayıt sürümü ${d.kayitSurumu}). Oyunu güncelle.`, 'yeni_surum');
  }
  d = tasi(d);
  const sorunlar = dogrula(d);
  if (sorunlar.length) throw new KayitHatasi('Kayıt içeriği geçersiz: ' + sorunlar.join(', '));
  return d;
}
