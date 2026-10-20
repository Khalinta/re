// "Şimdi" ekranı: anlatım akışı (üst) + kısayollar ve seçenekler (alt, başparmak bölgesi).
import { h } from '../dom.js';
import { IKON } from '../ikonlar.js';
import { Anlatim } from '../anlatim.js';
import { secenekleriGoster } from '../secenekler.js';
import { onayIste, bilgiGoster } from '../panel.js';
import { sure as sureYaz, saat } from '../../core/format.js';
import { ek } from '../../core/tr.js';
import * as oyun from '../../oyun.js';
import { guvenli } from '../../hata.js';

// Hamle hata verirse: hata paneli açılır; "Devam et" menüyü yeniden kurar.
const hataSecenekleri = () => ({ yenidenDene: () => menuyuGoster(), yenidenBaslat: () => location.reload() });

let anlatim, secenekKap;

export const simdiEkrani = {
  olustur(kap) {
    const anlatimKap = h('div', { class: 'anlatim' });
    secenekKap = h('div', { class: 'secenekler' });
    const kisayollar = h('div', { class: 'kisayollar' },
      kisayol(IKON.uyu, 'Uyu', uyu),
      kisayol(IKON.is, 'İşe git', () => bilgiGoster('İşe git', 'Henüz bir işin yok. İş sistemi Faz 4\'te geliyor.'), true),
      kisayol(IKON.tekrar, 'Rutini tekrarla', () => bilgiGoster('Rutini tekrarla', 'Bir hafta boyunca günlük rutinini tekrarlar; bir olay çıkarsa durur. İş ve olay sistemleriyle birlikte gelecek.'), true),
    );
    kap.append(anlatimKap, h('div', { class: 'alt-bolge' }, kisayollar, secenekKap));
    anlatim = new Anlatim(anlatimKap);
  },
  tekrarDokunus() { anlatim?.enAlta(true); },
};

function kisayol(ikon, metin, eylem, soluk = false) {
  return h('button', { class: 'kisayol' + (soluk ? ' soluk' : ''), onclick: eylem },
    h('span', { html: ikon }), h('span', {}, metin));
}

// Kayıttan dönüldüğünde geçmiş anlatımı anında (yazma efekti olmadan) geri koyar
export function gecmisiYukle(paragraflar) {
  anlatim.temizle();
  anlatim.ekle(paragraflar);
  anlatim.atla();
  anlatim.enAlta();
}

// Etkin oyunu (kayıttan yüklenmiş) ekrana koyar
export async function oyunuGoster() {
  gecmisiYukle(oyun.durumAl().anlatim);
  await anlatim.sira;
  anlatim.enAlta();
  menuyuGoster();
}

// Yeni oyun başlatır ve girişi yazar
export async function yeniOyunuGoster() {
  anlatim.temizle();
  secenekKap.replaceChildren();
  oyun.yeniOyun();
  await anlatim.sira;
  menuyuGoster();
}

export function paragraflariGoster(paragraflar) {
  return anlatim.ekle(paragraflar);
}

export function menuyuGoster() {
  if (oyun.aktifOlayVar()) { olayMenusu(); return; }
  const liste = oyun.aksiyonListesi().filter(x => !x.a.kisayol);
  secenekleriGoster(secenekKap, liste.map(x => ({
    id: x.a.id,
    metin: x.a.ad,
    alt: x.a.alt,
    maliyet: x.maliyet,
    devreDisi: !x.tamam,
    sebep: x.sebep,
  })), async s => {
    const sonuc = await guvenli('aksiyon:' + s.id, () => oyun.aksiyonYap(s.id), hataSecenekleri());
    if (!sonuc) return; // hata paneli açık; "Devam et" menüyü yeniden kurar
    if (!sonuc.tamam) bilgiGoster(s.metin, sonuc.sebep);
    await anlatim.sira;
    menuyuGoster();
  });
}

// Etkin olayın seçenekleri
function olayMenusu() {
  secenekleriGoster(secenekKap, oyun.olaySecenekleriAl().map(x => ({ ...x, ton: 'olay' })), async s => {
    const sonuc = await guvenli('olaySecenegi', () => oyun.olaySeceneginiYap(s.sira), hataSecenekleri());
    if (!sonuc) return;
    if (!sonuc.tamam) bilgiGoster(s.metin, sonuc.sebep);
    await anlatim.sira;
    menuyuGoster();
  });
}

async function uyu() {
  if (oyun.aktifOlayVar()) { bilgiGoster('Uyu', 'Önce şu an olanla ilgilen.'); return; }
  const a = oyun.aksiyonBul('uyu');
  const x = oyun.aksiyonListesi().find(y => y.a === a);
  if (!x.tamam) { bilgiGoster('Uyu', x.sebep); return; }
  const d = oyun.durumAl();
  const bitis = saat(d.zaman.dakika + x.maliyet.dakika);
  const ok = await onayIste({ baslik: 'Uyu', metin: `${ek(bitis, 'e')} kadar uyuyacaksın (${sureYaz(x.maliyet.dakika)}).`, evet: 'Uyu', hayir: 'Vazgeç' });
  if (!ok) return;
  secenekKap.classList.add('kilitli');
  const sonuc = await guvenli('aksiyon:uyu', () => oyun.aksiyonYap('uyu'), hataSecenekleri());
  if (!sonuc) return;
  await anlatim.sira;
  menuyuGoster();
}
