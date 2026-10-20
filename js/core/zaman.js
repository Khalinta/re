// Oyun zamanı: başlangıç gününün 00:00'ından beri geçen dakika (tam sayı). Bkz. PROJE.md K5.
// Takvim gerçek takvimdir; Türkiye UTC+3 sabit olduğu için tüm hesap UTC Date üzerinden yapılır.

export const DAKIKA = { saat: 60, gun: 1440, hafta: 10080 };

// Dilimler: sabah 06–12, öğle 12–17, akşam 17–22, gece 22–06
export const DILIMLER = [
  { id: 'sabah', ad: 'Sabah', bas: 6 * 60 },
  { id: 'ogle', ad: 'Öğle', bas: 12 * 60 },
  { id: 'aksam', ad: 'Akşam', bas: 17 * 60 },
  { id: 'gece', ad: 'Gece', bas: 22 * 60 },
];

// "2026-10-20" -> o günün 00:00 UTC milisaniyesi
export function gunMs(isoTarih) {
  const [y, a, g] = isoTarih.split('-').map(Number);
  return Date.UTC(y, a - 1, g);
}

export function isoTarih(d) {
  return d.toISOString().slice(0, 10);
}

// Gerçek dünyada bugünün Türkiye tarihi ("YYYY-AA-GG")
export function bugunTurkiye(simdiMs = Date.now()) {
  return isoTarih(new Date(simdiMs + 3 * 3600 * 1000));
}

export const tarihAl = (baslangic, dakika) => new Date(gunMs(baslangic) + dakika * 60000);
export const gunDakikasi = dakika => ((dakika % 1440) + 1440) % 1440;
export const gunNo = dakika => Math.floor(dakika / 1440);
export const saatKac = dakika => Math.floor(gunDakikasi(dakika) / 60);

export function dilim(dakika) {
  const m = gunDakikasi(dakika);
  if (m >= DILIMLER[3].bas || m < DILIMLER[0].bas) return DILIMLER[3];
  if (m >= DILIMLER[2].bas) return DILIMLER[2];
  if (m >= DILIMLER[1].bas) return DILIMLER[1];
  return DILIMLER[0];
}

// Verilen dakikadan sonraki ilk "saat:dakika" anı (aynı an dahil değil)
export function sonrakiAn(dakika, saat, dk = 0) {
  const hedef = saat * 60 + dk;
  const gunBasi = dakika - gunDakikasi(dakika);
  let t = gunBasi + hedef;
  if (t <= dakika) t += 1440;
  return t;
}

export const MEVSIMLER = { kis: 'Kış', ilkbahar: 'İlkbahar', yaz: 'Yaz', sonbahar: 'Sonbahar' };

export function mevsim(d) {
  const ay = d.getUTCMonth(); // 0 = Ocak
  if (ay === 11 || ay <= 1) return 'kis';
  if (ay <= 4) return 'ilkbahar';
  if (ay <= 7) return 'yaz';
  return 'sonbahar';
}

// Haftanın günü: 0 = Pazar ... 6 = Cumartesi
export const haftaGunu = d => d.getUTCDay();
export const haftaSonuMu = d => d.getUTCDay() === 0 || d.getUTCDay() === 6;

// Doğum tarihine ("1994-05-12") göre verilen tarihteki yaş
export function yas(dogum, d) {
  const [y, a, g] = dogum.split('-').map(Number);
  let yas = d.getUTCFullYear() - y;
  const ay = d.getUTCMonth() + 1, gun = d.getUTCDate();
  if (ay < a || (ay === a && gun < g)) yas--;
  return yas;
}

// Takvim verisinden (data/takvim.json) o günün tatil/özel gün bilgisi
export function ozelGun(takvim, d) {
  const ag = String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  const iso = isoTarih(d);
  const sonuc = [];
  for (const t of takvim?.sabit || []) if (t.tarih === ag) sonuc.push(t);
  for (const t of takvim?.degisken || []) if (t.tarihler?.includes(iso)) sonuc.push(t);
  return sonuc;
}
