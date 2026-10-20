// Anlatım akışı: metin paragrafları sırayla, ayarlanan hızda yazılır.
// Geçmiş yukarı kaydırılarak okunabilir. Ekrana dokunmak yazılmakta olanı hemen tamamlar.
//
// Türler: 'anlati' (düz anlatım), 'icses' (karakterin iç sesi), 'konusma' (konusan alanıyla),
//         'sistem' (küçük bilgi: +250 ₺ gibi), 'ayrac' (zaman ayracı: — Salı, akşam —)
import { h } from './dom.js';
import { harfGecikmesi } from '../ayarlar.js';

const EN_FAZLA_PARAGRAF = 300;

export class Anlatim {
  constructor(kap) {
    this.kap = kap;
    this.liste = h('div', { class: 'anlatim-liste', 'aria-live': 'polite' });
    this.yeniIsaret = h('button', { class: 'yeni-isaret', hidden: true, onclick: () => this.enAlta(true) }, 'Yeni ↓');
    kap.append(this.liste, this.yeniIsaret);
    this.sira = Promise.resolve();
    this.atlaIstegi = false;
    this.yaziliyor = false;
    this.bekleyen = 0;
    this.altta = true;

    // "Altta mı" bilgisi sadece kullanıcı kendisi kaydırırken güncellenir; yazarken bizim yaptığımız
    // otomatik kaydırma bunu bozmasın.
    this.kullaniciKaydiriyor = false;
    let birakZamanlayici;
    const basla = () => { clearTimeout(birakZamanlayici); this.kullaniciKaydiriyor = true; };
    const bitir = () => { birakZamanlayici = setTimeout(() => { this.kullaniciKaydiriyor = false; }, 800); };
    kap.addEventListener('touchstart', basla, { passive: true });
    kap.addEventListener('touchend', bitir, { passive: true });
    kap.addEventListener('wheel', () => { basla(); bitir(); }, { passive: true });
    kap.addEventListener('scroll', () => {
      if (!this.kullaniciKaydiriyor) return;
      this.altta = kap.scrollHeight - kap.scrollTop - kap.clientHeight < 40;
      if (this.altta) this.yeniIsaret.hidden = true;
    }, { passive: true });
    kap.addEventListener('click', () => { if (this.bekleyen) this.atlaIstegi = true; });
  }

  // Bir ya da birden çok paragraf ekler; hepsi yazılınca çözülen bir söz döner.
  ekle(...girdiler) {
    for (const g of girdiler.flat()) {
      const p = typeof g === 'string' ? { tur: 'anlati', metin: g } : g;
      this.bekleyen++;
      this.sira = this.sira.then(() => this.#yaz(p)).catch(e => console.error(e)).finally(() => {
        if (--this.bekleyen === 0) this.atlaIstegi = false;
      });
    }
    return this.sira;
  }

  // Bekleyen tüm yazımları anında bitirir
  atla() { this.atlaIstegi = true; }

  temizle() {
    this.liste.replaceChildren();
  }

  enAlta(yumusak = false) {
    this.altta = true;
    this.kap.scrollTo({ top: this.kap.scrollHeight, behavior: yumusak ? 'smooth' : 'auto' });
    this.yeniIsaret.hidden = true;
  }

  async #yaz({ tur = 'anlati', metin = '', konusan }) {
    const el = h('p', { class: 'p-' + tur });
    let hedef = el;
    if (tur === 'konusma' && konusan) {
      el.append(h('span', { class: 'konusan' }, konusan));
      hedef = h('span', { class: 'soz' });
      el.append(hedef);
    }
    this.liste.append(el);
    while (this.liste.children.length > EN_FAZLA_PARAGRAF) this.liste.firstElementChild.remove();
    this.#kaydir();

    const gecikme = tur === 'sistem' || tur === 'ayrac' ? 0 : harfGecikmesi();
    if (!gecikme || this.atlaIstegi) {
      hedef.textContent = metin;
      this.#kaydir();
      return;
    }

    this.yaziliyor = true;
    const metinDugumu = document.createTextNode('');
    const kalan = h('span', { class: 'kalan' }, metin); // yer tutsun, düzen zıplamasın
    hedef.append(metinDugumu, kalan);
    let i = 0;
    let onceki = performance.now();
    await new Promise(coz => {
      const adim = simdi => {
        if (this.atlaIstegi) i = metin.length;
        else i = Math.min(metin.length, i + Math.max(1, Math.round((simdi - onceki) / gecikme)));
        onceki = simdi;
        metinDugumu.data = metin.slice(0, i);
        kalan.textContent = metin.slice(i);
        this.#kaydir();
        if (i >= metin.length) return coz();
        requestAnimationFrame(adim);
      };
      requestAnimationFrame(adim);
    });
    hedef.textContent = metin;
    this.yaziliyor = false;
  }

  #kaydir() {
    if (this.altta) this.kap.scrollTop = this.kap.scrollHeight;
    else this.yeniIsaret.hidden = false;
  }
}
