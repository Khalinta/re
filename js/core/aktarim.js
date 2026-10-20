// Dışa / içe aktarma: kayıt zarfını kopyala-yapıştır metin koduna ya da dosyaya çevirir.
//
//   Kod biçimi:  YND1.<base64url(deflate-raw(zarf JSON))>     (sıkıştırılmış, varsayılan)
//                YND0.<base64url(zarf JSON)>                  (sıkıştırma desteklenmiyorsa)
//
// Bütünlük: zarfın içindeki sağlama (bkz. kayitbicim.js) eksik/yanlış kopyalanan kodu yakalar;
// sıkıştırılmış kod kesikse zaten açılamaz. Kodun arasına giren boşluk ve satır sonları yok sayılır.
import { zarfAc, KayitHatasi, BICIM } from './kayitbicim.js';

const ONEK_SIKISTIRILMIS = 'YND1.';
const ONEK_DUZ = 'YND0.';

function base64urlKodla(baytlar) {
  let ikili = '';
  for (let i = 0; i < baytlar.length; i += 0x8000) ikili += String.fromCharCode(...baytlar.subarray(i, i + 0x8000));
  return btoa(ikili).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlCoz(metin) {
  const b64 = metin.replace(/-/g, '+').replace(/_/g, '/');
  const ikili = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const baytlar = new Uint8Array(ikili.length);
  for (let i = 0; i < ikili.length; i++) baytlar[i] = ikili.charCodeAt(i);
  return baytlar;
}

async function akistanGecir(baytlar, akis) {
  const yazici = akis.writable.getWriter();
  // Yazma tarafının hatası okuma tarafında da çıkar; burada ayrıca yakalanmazsa boşta kalan hata olur
  yazici.write(baytlar).catch(() => {});
  yazici.close().catch(() => {});
  return new Uint8Array(await new Response(akis.readable).arrayBuffer());
}

export const sikistirmaVarMi = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

// zarf -> metin kodu
export async function kodaCevir(zarf, { sikistir = sikistirmaVarMi() } = {}) {
  const baytlar = new TextEncoder().encode(JSON.stringify(zarf));
  if (!sikistir) return ONEK_DUZ + base64urlKodla(baytlar);
  return ONEK_SIKISTIRILMIS + base64urlKodla(await akistanGecir(baytlar, new CompressionStream('deflate-raw')));
}

// metin kodu -> zarf (henüz doğrulanmamış)
export async function koddanZarf(kod) {
  const temiz = String(kod).replace(/\s+/g, '');
  let govde, sikistirilmis;
  if (temiz.startsWith(ONEK_SIKISTIRILMIS)) { govde = temiz.slice(ONEK_SIKISTIRILMIS.length); sikistirilmis = true; }
  else if (temiz.startsWith(ONEK_DUZ)) { govde = temiz.slice(ONEK_DUZ.length); sikistirilmis = false; }
  else throw new KayitHatasi('Bu bir Yeniden kayıt kodu değil (kod "YND" ile başlamalı).', 'kod');
  if (!/^[A-Za-z0-9_-]+$/.test(govde)) throw new KayitHatasi('Kodda geçersiz karakterler var; eksik ya da hatalı kopyalanmış olabilir.', 'kod');
  let baytlar;
  try {
    baytlar = base64urlCoz(govde);
    if (sikistirilmis) {
      if (!sikistirmaVarMi()) throw new KayitHatasi('Bu tarayıcı sıkıştırılmış kodu açamıyor. iOS 16.4 veya üstü gerekiyor.', 'destek');
      baytlar = await akistanGecir(baytlar, new DecompressionStream('deflate-raw'));
    }
  } catch (e) {
    if (e instanceof KayitHatasi) throw e;
    throw new KayitHatasi('Kod açılamadı; eksik ya da hatalı kopyalanmış olabilir.', 'kod');
  }
  try { return JSON.parse(new TextDecoder().decode(baytlar)); } catch {
    throw new KayitHatasi('Kod açıldı ama içi okunamadı; eksik kopyalanmış olabilir.', 'kod');
  }
}

// Kullanıcının verdiği her şeyi (kod ya da dosya içeriği) çözer ve doğrular.
// Döner: { zarf, durum }  — durum güncel şemaya taşınmış ve doğrulanmıştır.
export async function iceAktarilaniCoz(metin) {
  const t = String(metin ?? '').trim();
  if (!t) throw new KayitHatasi('Boş. Kodu ya da dosyayı ver.', 'bos');
  let zarf;
  if (/^YND/i.test(t)) zarf = await koddanZarf(t);
  else if (t.startsWith('{')) {
    try { zarf = JSON.parse(t); } catch { throw new KayitHatasi('Dosya okunamadı (JSON bozuk).', 'dosya'); }
    if (zarf?.bicim !== BICIM && zarf?.zarf?.bicim === BICIM) zarf = zarf.zarf; // dosya sarmalı
  } else throw new KayitHatasi('Bu bir Yeniden kaydı ya da kodu değil.', 'kod');
  const durum = zarfAc(zarf);
  return { zarf, durum };
}

// Dosya içeriği: okunabilir JSON, en üstte insan için kısa bilgi
export function dosyaIcerigi(zarf) {
  return JSON.stringify({ aciklama: 'Yeniden oyun kaydı. Oyunda Daha Fazla → Kayıtlar → İçe aktar ile yükleyebilirsin.', zarf }, null, 1);
}

export function dosyaAdi(zarf, yuva, simdi = new Date()) {
  const ad = (zarf.ozet?.ad || 'kayit').toLocaleLowerCase('tr-TR').replace(/[^a-z0-9çğıöşü]+/g, '-');
  const t = new Date(simdi.getTime() + 3 * 3600e3).toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  return `yeniden-${ad}-yuva${yuva}-${t}.json`;
}
