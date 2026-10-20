// Cihaza özel görünüm ayarları (tema, yazı boyutu, metin hızı, hareket).
// Bunlar oyun kaydı değildir; localStorage'da durur. Okunamazsa varsayılanlar kullanılır.

const ANAHTAR = 'yeniden.ayarlar';

export const SECENEKLER = {
  tema: [['otomatik', 'Otomatik'], ['karanlik', 'Karanlık'], ['aydinlik', 'Aydınlık']],
  yazi: [[0.9, 'Küçük'], [1, 'Normal'], [1.12, 'Büyük'], [1.25, 'Çok büyük']],
  metinHizi: [['aninda', 'Anında'], ['hizli', 'Hızlı'], ['normal', 'Normal'], ['yavas', 'Yavaş']],
  hareket: [['sistem', 'Sistem'], ['tam', 'Açık'], ['azalt', 'Azalt']],
};

const VARSAYILAN = { tema: 'otomatik', yazi: 1, metinHizi: 'normal', hareket: 'sistem' };

let ayarlar = { ...VARSAYILAN };
const dinleyiciler = new Set();

export function yukle() {
  try {
    const kayitli = JSON.parse(localStorage.getItem(ANAHTAR) || '{}');
    for (const k of Object.keys(VARSAYILAN)) {
      if (SECENEKLER[k].some(([d]) => d === kayitli[k])) ayarlar[k] = kayitli[k];
    }
  } catch { /* bozuk ya da erişilemez: varsayılanlar */ }
  uygula();
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', uygula);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', uygula);
  return ayarlar;
}

export const al = k => ayarlar[k];

export function degistir(k, deger) {
  ayarlar[k] = deger;
  try { localStorage.setItem(ANAHTAR, JSON.stringify(ayarlar)); } catch { /* yazılamadı: oturum boyunca geçerli */ }
  uygula();
  dinleyiciler.forEach(f => f(k, deger));
}

export function dinle(f) { dinleyiciler.add(f); return () => dinleyiciler.delete(f); }

function uygula() {
  const kok = document.documentElement;
  if (ayarlar.tema === 'otomatik') delete kok.dataset.tema; else kok.dataset.tema = ayarlar.tema;
  kok.style.setProperty('--olcek', ayarlar.yazi);
  const sistemAz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const az = ayarlar.hareket === 'azalt' || (ayarlar.hareket === 'sistem' && sistemAz);
  kok.dataset.hareket = az ? 'azalt' : 'tam';

  const karanlik = ayarlar.tema === 'karanlik' || (ayarlar.tema === 'otomatik' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  // Tema rengi = alt sekme çubuğunun rengi (--yuzey): iPhone ana ekran modunda sayfanın dışında kalan
  // alanı bu renkle boyuyor (Faz 1 telefon testi, alttaki şerit).
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', karanlik ? '#252220' : '#fffaf2');
}

// Metin hızı: harf başına milisaniye (0 = anında)
export function harfGecikmesi() {
  if (document.documentElement.dataset.hareket === 'azalt') return 0;
  return { aninda: 0, hizli: 8, normal: 18, yavas: 32 }[ayarlar.metinHizi] ?? 18;
}
