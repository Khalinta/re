// Kayıt deposu: 3 yuva, iki depo (ana + yansı), yuva başına en fazla 5 otomatik yedek.
// Tarayıcıdan bağımsızdır; depolar dışarıdan verilir (tarayıcıda IndexedDB + localStorage,
// testlerde bellek içi sahte depolar). Böylece "yazma yarıda kesildi", "veri bozuldu" gibi durumlar test edilebilir.
//
// ana   = { yuvaAl(n), yuvaYaz(n, zarf), yuvaSil(n), yedekEkle(n, zarf), yedekler(n) -> [{ id, zarf }], yedekSil(id) }
// yansi = { yuvaAl(n), yuvaYaz(n, zarf), yuvaSil(n) }
//
// İlkeler:
//  - Geçersiz durum asla yazılmaz (zarfla doğrular).
//  - Önce yansıya (localStorage, eşzamanlı ve hızlı) sonra anaya yazılır; ana yazımı geri okunarak doğrulanır.
//  - Yüklerken iki depodaki geçerli kayıtlardan sayacı en büyük olan seçilir; diğeri onarılır.
//  - İkisi de bozuksa otomatik yedeklere (en yeniden eskiye) bakılır. İkisi de boşsa yuva boştur.
//  - Silme ve yedekten dönme öncesinde mevcut hal yedeklenir: hiçbir işlem geri dönüşsüz veri kaybettirmez.
import { zarfla, zarfAc, KayitHatasi } from './kayitbicim.js';

export const YUVA_SAYISI = 3;

export class KayitDeposu {
  constructor({ ana, yansi, enFazlaYedek = 5, simdi = () => Date.now(), hataBildir = () => {} }) {
    this.ana = ana;
    this.yansi = yansi;
    this.enFazlaYedek = enFazlaYedek;
    this.simdi = simdi;
    this.hataBildir = hataBildir;
    this.sayaclar = {};
  }

  async #oku(depo, n, kaynak, sorunlar) {
    let ham;
    try { ham = await depo.yuvaAl(n); } catch (e) { sorunlar.push(`${kaynak} okunamadı: ${e.message}`); return null; }
    if (ham === null || ham === undefined) return null;
    const sayac = typeof ham === 'object' && Number.isInteger(ham.sayac) ? ham.sayac : 0;
    try {
      const durum = zarfAc(ham);
      return { kaynak, zarf: typeof ham === 'string' ? JSON.parse(ham) : ham, durum, sayac, gecerli: true };
    } catch (e) {
      sorunlar.push(`${kaynak}: ${e.message}`);
      return { kaynak, sayac, gecerli: false, hata: e };
    }
  }

  async #adaylar(n, sorunlar) {
    const a = await this.#oku(this.ana, n, 'ana', sorunlar);
    const b = await this.#oku(this.yansi, n, 'yansi', sorunlar);
    return [a, b].filter(Boolean);
  }

  static #enYeni(liste) {
    return liste.filter(x => x.gecerli).sort((x, y) => (y.sayac - x.sayac) || (y.zarf.kayitZamani - x.zarf.kayitZamani))[0] || null;
  }

  async #sonSayac(n) {
    if (this.sayaclar[n] !== undefined) return this.sayaclar[n];
    const adaylar = await this.#adaylar(n, []);
    this.sayaclar[n] = Math.max(0, ...adaylar.map(x => x.sayac));
    return this.sayaclar[n];
  }

  // Kaydeder. Döner: { ana: bool, yansi: bool }. Hiçbir yere yazılamazsa hata fırlatır.
  async kaydet(n, durum, { yedekle = false } = {}) {
    const sayac = (await this.#sonSayac(n)) + 1;
    const zarf = zarfla(durum, { sayac, simdi: this.simdi() }); // geçersizse burada durur, hiçbir şey yazılmaz
    const sonuc = { ana: false, yansi: false };
    try { await this.yansi.yuvaYaz(n, zarf); sonuc.yansi = true; } catch (e) { this.hataBildir('Yansı kaydı yazılamadı', e); }
    try {
      await this.ana.yuvaYaz(n, zarf);
      const geri = await this.ana.yuvaAl(n);
      if (!geri || geri.saglama !== zarf.saglama || geri.sayac !== zarf.sayac) throw new Error('geri okuma tutmadı');
      sonuc.ana = true;
    } catch (e) { this.hataBildir('Ana kayıt yazılamadı', e); }
    this.sayaclar[n] = sayac;
    if (!sonuc.ana && !sonuc.yansi) throw new KayitHatasi('Kayıt hiçbir depoya yazılamadı', 'yazilamadi');
    if (yedekle) await this.#yedekEkle(n, zarf);
    return sonuc;
  }

  // Yükler. Döner: { durum, kaynak, sorunlar } ya da yuva boşsa null.
  async yukle(n) {
    const sorunlar = [];
    const adaylar = await this.#adaylar(n, sorunlar);
    const secilen = KayitDeposu.#enYeni(adaylar);
    this.sayaclar[n] = Math.max(this.sayaclar[n] ?? 0, 0, ...adaylar.map(x => x.sayac));

    if (secilen) {
      // Eksik, eski ya da bozuk olan depoyu seçilenle onar
      for (const [kaynak, depo] of [['ana', this.ana], ['yansi', this.yansi]]) {
        const x = adaylar.find(y => y.kaynak === kaynak);
        if (!x || !x.gecerli || x.sayac < secilen.sayac) {
          try { await depo.yuvaYaz(n, secilen.zarf); } catch (e) { this.hataBildir(`${kaynak} onarılamadı`, e); }
        }
      }
      return { durum: secilen.durum, kaynak: secilen.kaynak, sorunlar };
    }

    // İki depo da boş: yuva boştur (bilerek silinmiş olabilir; yedekler sadece elle geri getirilir)
    if (!adaylar.length) return null;

    // Kayıt var ama iki depoda da bozuk: otomatik yedekler
    for (const y of await this.#yedeklerSirali(n)) {
      try {
        const durum = zarfAc(y.zarf);
        sorunlar.push('Kayıt otomatik yedekten kurtarıldı');
        try { await this.yansi.yuvaYaz(n, y.zarf); } catch (e) { this.hataBildir('yansı onarılamadı', e); }
        try { await this.ana.yuvaYaz(n, y.zarf); } catch (e) { this.hataBildir('ana onarılamadı', e); }
        this.sayaclar[n] = Math.max(this.sayaclar[n], y.zarf.sayac || 0);
        return { durum, kaynak: 'otomatikYedek', sorunlar };
      } catch (e) { sorunlar.push('yedek ' + y.id + ': ' + e.message); }
    }
    throw Object.assign(new KayitHatasi('Bu yuvadaki kayıt ve yedekleri okunamadı', 'kurtarilamadi'), { sorunlar });
  }

  async yuvaOzetleri() {
    const liste = [];
    for (let n = 1; n <= YUVA_SAYISI; n++) {
      const sorunlar = [];
      const adaylar = await this.#adaylar(n, sorunlar);
      const s = KayitDeposu.#enYeni(adaylar);
      liste.push({
        yuva: n,
        bos: !adaylar.length,
        bozuk: adaylar.length > 0 && !s,
        ozet: s?.zarf.ozet || null,
        kayitZamani: s?.zarf.kayitZamani || null,
        oyunSurumu: s?.zarf.oyunSurumu || null,
        sorunlar,
      });
    }
    return liste;
  }

  async #yedeklerSirali(n) {
    let liste = [];
    try { liste = await this.ana.yedekler(n); } catch (e) { this.hataBildir('Yedekler okunamadı', e); }
    return liste.sort((a, b) => (b.zarf.kayitZamani - a.zarf.kayitZamani) || ((b.zarf.sayac || 0) - (a.zarf.sayac || 0)) || (b.id - a.id));
  }

  async #yedekEkle(n, zarf) {
    try {
      await this.ana.yedekEkle(n, zarf);
      const liste = await this.#yedeklerSirali(n);
      for (const fazla of liste.slice(this.enFazlaYedek)) await this.ana.yedekSil(fazla.id);
    } catch (e) { this.hataBildir('Yedek alınamadı', e); }
  }

  // Yuvanın şu anki halini yedeğe alır (varsa).
  async yedekAl(n) {
    const s = KayitDeposu.#enYeni(await this.#adaylar(n, []));
    if (s) await this.#yedekEkle(n, s.zarf);
    return !!s;
  }

  async yedekListesi(n) {
    return (await this.#yedeklerSirali(n)).map(y => ({ id: y.id, kayitZamani: y.zarf.kayitZamani, sayac: y.zarf.sayac, ozet: y.zarf.ozet, oyunSurumu: y.zarf.oyunSurumu }));
  }

  // Yedekten döner: önce mevcut hal yedeklenir, sonra yedek yeni kayıt olarak yazılır.
  async yedektenDon(n, id) {
    const y = (await this.#yedeklerSirali(n)).find(x => x.id === id);
    if (!y) throw new KayitHatasi('Yedek bulunamadı', 'yok');
    const durum = zarfAc(y.zarf);
    await this.yedekAl(n);
    await this.kaydet(n, durum);
    return durum;
  }

  // Yuvanın en güncel geçerli zarfı (dışa aktarma için). Yoksa null.
  async enIyiZarf(n) {
    const s = KayitDeposu.#enYeni(await this.#adaylar(n, []));
    return s ? s.zarf : null;
  }

  // Dışarıdan gelen (doğrulanmış) durumu yuvaya yazar; yuva doluysa mevcut hal önce yedeklenir.
  async iceAktar(n, durum) {
    await this.yedekAl(n);
    return this.kaydet(n, durum);
  }

  // Yuvayı boşaltır; mevcut hal önce yedeğe alınır (yedeklerden geri getirilebilir).
  async yuvaSil(n) {
    await this.yedekAl(n);
    try { await this.yansi.yuvaSil(n); } catch (e) { this.hataBildir('yansı silinemedi', e); }
    try { await this.ana.yuvaSil(n); } catch (e) { this.hataBildir('ana silinemedi', e); }
  }
}
