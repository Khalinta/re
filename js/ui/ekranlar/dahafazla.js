// "Daha Fazla" ekranı: ayarlar, kayıtlar (1.6), sürüm bilgisi.
import { h, $$ } from '../dom.js';
import { IKON } from '../ikonlar.js';
import { kayitlariGoster } from './kayitlar.js';
import { SECENEKLER, al, degistir } from '../../ayarlar.js';
import { OYUN_SURUMU } from '../../surum.js';
import { hataPaneli } from '../../hata.js';

function segment(anahtar, etiket) {
  const grup = h('div', { class: 'segment', role: 'radiogroup', 'aria-label': etiket });
  const yenile = () => $$('button', grup).forEach((d, i) => d.setAttribute('aria-checked', String(SECENEKLER[anahtar][i][0] === al(anahtar))));
  for (const [deger, ad] of SECENEKLER[anahtar]) {
    grup.append(h('button', { role: 'radio', onclick: () => { degistir(anahtar, deger); yenile(); } }, ad));
  }
  yenile();
  return h('div', { class: 'ayar' }, h('div', { class: 'ayar-ad' }, etiket), grup);
}

export const dahaFazlaEkrani = {
  olustur(kap) {
    kap.append(h('div', { class: 'sayfa-kaydir' },
      h('div', { class: 'sayfa-ust' }, h('h1', {}, 'Daha Fazla')),
      h('h2', { class: 'bolum-baslik' }, 'Görünüm'),
      h('div', { class: 'kart' },
        segment('tema', 'Tema'),
        segment('yazi', 'Yazı boyutu'),
        segment('metinHizi', 'Metin hızı'),
        segment('hareket', 'Animasyonlar')),
      h('p', { class: 'ornek-metin' }, 'Örnek: Çınaraltı Kahvesi\'nde çay 15 ₺. Sabahın köründe bile kalabalık.'),
      h('h2', { class: 'bolum-baslik' }, 'Kayıtlar'),
      h('div', { class: 'kart-liste' },
        h('button', { class: 'satir', onclick: () => kayitlariGoster() },
          h('span', { class: 'satir-metin' }, h('span', {}, 'Kayıt yuvaları ve yedekler'), h('span', { class: 'satir-alt' }, 'Otomatik kaydediliyor')),
          h('span', { class: 'satir-ok', html: IKON.ok }))),
      h('h2', { class: 'bolum-baslik' }, 'Hakkında'),
      h('div', { class: 'kart-liste' },
        h('button', { class: 'satir', onclick: () => hataPaneli(null) },
          h('span', { class: 'satir-metin' }, h('span', {}, 'Sorun bildir'), h('span', { class: 'satir-alt' }, 'Hata raporunu kopyala')),
          h('span', { class: 'satir-ok', html: IKON.ok })),
        h('div', { class: 'satir', id: 'surum-satiri' },
          h('span', { class: 'satir-metin' }, h('span', {}, 'Sürüm'), h('span', { class: 'satir-alt' }, OYUN_SURUMU)))),
    ));
  },
};
