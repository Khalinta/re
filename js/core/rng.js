// Seed tabanlı, deterministik rastgelelik.
// Aynı seed + aynı alan adı => her zaman aynı sayı dizisi.
// Alan adları (ör. "npc:417", "olay", "hava") birbirinden bağımsız akışlar verir;
// bir sistemde sayı çekmek diğerini kaydırmaz.

// cyrb128: metni 4 adet 32 bitlik sayıya karıştırır.
export function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= (h2 ^ h3 ^ h4); h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export class Rng {
  // durum: sfc32'nin 4 sayılık iç durumu. Kayda yazılıp geri yüklenebilir.
  constructor(durum) {
    this.d = durum.slice(0, 4).map(x => x >>> 0);
  }

  static akis(seed, alan = '') {
    const r = new Rng(cyrb128(String(seed) + '|' + alan));
    for (let i = 0; i < 12; i++) r.ham(); // ilk değerleri ısıt
    return r;
  }

  // sfc32: 32 bitlik tam sayı üretir
  ham() {
    let [a, b, c, d] = this.d;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    this.d = [a >>> 0, b >>> 0, c >>> 0, d >>> 0];
    return t >>> 0;
  }

  getDurum() { return this.d.slice(); }

  // [0, 1)
  sayi() { return this.ham() / 4294967296; }

  // min ve max dahil tam sayı
  aralik(min, max) {
    return min + Math.floor(this.sayi() * (max - min + 1));
  }

  // p olasılıkla true (0..1)
  olasilik(p) { return this.sayi() < p; }

  sec(dizi) {
    if (!dizi.length) return undefined;
    return dizi[Math.floor(this.sayi() * dizi.length)];
  }

  // ogeler: dizi; agirlik: öğeden ağırlık döndüren fonksiyon ya da alan adı
  agirlikliSec(ogeler, agirlik = 'agirlik') {
    const w = typeof agirlik === 'function' ? agirlik : (o => o[agirlik] ?? 1);
    let toplam = 0;
    const ws = ogeler.map(o => { const x = Math.max(0, Number(w(o)) || 0); toplam += x; return x; });
    if (toplam <= 0) return undefined;
    let r = this.sayi() * toplam;
    for (let i = 0; i < ogeler.length; i++) {
      r -= ws[i];
      if (r < 0) return ogeler[i];
    }
    return ogeler[ogeler.length - 1];
  }

  karistir(dizi) {
    const a = dizi.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.sayi() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Yaklaşık normal dağılım (ortalama, sapma) — yaş, boy, yetenek gibi şeyler için
  normal(ort = 0, sapma = 1) {
    let u = 0, v = 0;
    while (u === 0) u = this.sayi();
    while (v === 0) v = this.sayi();
    return ort + sapma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

// Okunması ve yazılması kolay seed kodu: "7Q2M-K9XD" (karışabilecek 0/O, 1/I/L yok)
const SEED_ALFABE = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function seedUret(kaynak) {
  let sayilar;
  if (kaynak) {
    const r = Rng.akis(kaynak, 'seed');
    sayilar = Array.from({ length: 8 }, () => r.ham());
  } else {
    sayilar = Array.from(globalThis.crypto.getRandomValues(new Uint32Array(8)));
  }
  const k = sayilar.map(x => SEED_ALFABE[x % SEED_ALFABE.length]).join('');
  return k.slice(0, 4) + '-' + k.slice(4);
}

// Kullanıcının yazdığı seed'i düzenler (küçük harf, boşluk vs.)
export function seedDuzenle(metin) {
  return String(metin).trim().toLocaleUpperCase('tr-TR').replace(/İ/g, 'I').replace(/\s+/g, '');
}
