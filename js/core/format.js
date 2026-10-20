// Türkçe biçimler: para (1.250,50 ₺), sayı, tarih (20 Ekim 2026, Salı), saat (24 saat), süre.
// Tarihler UTC Date nesnesi olarak işlenir (Türkiye'de yaz saati yok; bkz. PROJE.md K5).

export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

// 1234567 -> "1.234.567"
function binlik(tamKisim) {
  return tamKisim.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// sayi(1250.5) -> "1.250,5"; sayi(1250.5, 2) -> "1.250,50"
export function sayi(n, ondalik) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  const neg = x < 0;
  let metin;
  if (ondalik === undefined) {
    metin = String(Math.round(Math.abs(x) * 100) / 100);
  } else {
    metin = Math.abs(x).toFixed(ondalik);
  }
  let [tam, kesir] = metin.split('.');
  const sonuc = binlik(tam) + (kesir ? ',' + kesir : '');
  return (neg && sonuc.replace(/[0.,]/g, '') ? '-' : '') + sonuc;
}

// para(1250.5) -> "1.250,50 ₺"; para(1250, { kurus: false }) -> "1.250 ₺"
// kurus: 'otomatik' (varsayılan) => tam sayıysa kuruşsuz yazar
export function para(n, { kurus = 'otomatik' } = {}) {
  const x = Math.round(Number(n) * 100) / 100;
  const kurusYaz = kurus === true || (kurus === 'otomatik' && !Number.isInteger(x));
  return sayi(x, kurusYaz ? 2 : 0) + ' ₺';
}

// Kısa para: 1.250 ₺, 12,5 bin ₺, 3,2 milyon ₺ (durum çubuğu gibi dar yerler için)
export function paraKisa(n) {
  const x = Number(n);
  const a = Math.abs(x);
  if (a < 100000) return para(Math.round(x), { kurus: false });
  if (a < 1e6) return sayi(Math.round(x / 100) / 10) + ' bin ₺';
  if (a < 1e9) return sayi(Math.round(x / 1e5) / 10) + ' milyon ₺';
  return sayi(Math.round(x / 1e8) / 10) + ' milyar ₺';
}

export function yuzde(oran) {
  return '%' + sayi(Math.round(oran * 1000) / 10);
}

// tarih(new Date(Date.UTC(2026, 9, 20))) -> "20 Ekim 2026, Salı"
export function tarih(d, { gunAdi = true, yil = true } = {}) {
  let s = d.getUTCDate() + ' ' + AYLAR[d.getUTCMonth()];
  if (yil) s += ' ' + d.getUTCFullYear();
  if (gunAdi) s += ', ' + GUNLER[d.getUTCDay()];
  return s;
}

export function tarihKisa(d) {
  return d.getUTCDate() + ' ' + AYLAR[d.getUTCMonth()].slice(0, 3);
}

// Günün dakikasından saat: 425 -> "07:05"
export function saat(gunDakikasi) {
  const m = ((Math.floor(gunDakikasi) % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

// Date'ten saat
export function saatTarihten(d) {
  return saat(d.getUTCHours() * 60 + d.getUTCMinutes());
}

// Dakika cinsinden süre: 135 -> "2 saat 15 dakika", 2880 -> "2 gün"
export function sure(dakika) {
  const m = Math.max(0, Math.round(dakika));
  if (m === 0) return '0 dakika';
  const gun = Math.floor(m / 1440);
  const st = Math.floor((m % 1440) / 60);
  const dk = m % 60;
  const parca = [];
  if (gun) parca.push(gun + ' gün');
  if (st) parca.push(st + ' saat');
  if (dk && !gun) parca.push(dk + ' dakika');
  return parca.join(' ');
}
