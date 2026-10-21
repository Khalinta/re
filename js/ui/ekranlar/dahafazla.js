// "Daha Fazla" ekranı: ayarlar, kayıtlar (1.6), sürüm bilgisi.
import { h, $$ } from '../dom.js';
import { IKON } from '../ikonlar.js';
import { kayitlariGoster } from './kayitlar.js';
import { SECENEKLER, al, degistir } from '../../ayarlar.js';
import { OYUN_SURUMU } from '../../surum.js';
import { hataPaneli } from '../../hata.js';
import { yediDokunusKur } from '../../dev/panel.js';
import { ayarlar as yzAyar, ayarDegistir as yzDegistir, harcama } from '../../yz/ayar.js';
import { MODELLER } from '../../core/yz.js';

function segment(anahtar, etiket) {
  const grup = h('div', { class: 'segment', role: 'radiogroup', 'aria-label': etiket });
  const yenile = () => $$('button', grup).forEach((d, i) => d.setAttribute('aria-checked', String(SECENEKLER[anahtar][i][0] === al(anahtar))));
  for (const [deger, ad] of SECENEKLER[anahtar]) {
    grup.append(h('button', { role: 'radio', onclick: () => { degistir(anahtar, deger); yenile(); } }, ad));
  }
  yenile();
  return h('div', { class: 'ayar' }, h('div', { class: 'ayar-ad' }, etiket), grup);
}

// Yapay zekâ sohbeti (3.9): anahtar, model, açık/kapalı, bağlantı denemesi, bu ayki harcama
function yzBolumu() {
  const kap = h('div', { class: 'kart yz-kart' });
  const ciz = () => {
    const a = yzAyar(), hr = harcama();
    const girdi = h('input', { class: 'ad-girdi', type: 'password', placeholder: 'sk-ant-…', autocomplete: 'off', spellcheck: 'false' });
    const sonuc = h('p', { class: 'soluk kucuk' });
    const modelGrup = h('div', { class: 'segment', role: 'radiogroup', 'aria-label': 'Model' },
      MODELLER.map(m => h('button', { role: 'radio', 'aria-checked': String(a.model === m.id), onclick: () => { yzDegistir({ model: m.id }); ciz(); } }, m.ad.replace('Claude ', ''))));
    const secili = MODELLER.find(m => m.id === a.model) ?? MODELLER[0];
    const mesajBasi = (4000 * secili.girdi + 400 * secili.cikti) / 1e6;
    kap.replaceChildren(
      h('p', { class: 'panel-metin' }, 'Biriyle konuşurken istediğini yazabilirsin; karşındakinin cevabını Claude yazar, kişinin kartına ve sana dair hafızasına sadık kalarak. İnternet ve kendi Claude API anahtarın gerekir; her mesajın küçük bir ücreti var. Anahtar yalnızca bu telefonda saklanır.'),
      h('div', { class: 'ayar' }, h('div', { class: 'ayar-ad' }, 'Durum'),
        h('div', { class: 'segment', role: 'radiogroup' },
          h('button', { role: 'radio', 'aria-checked': String(a.acik), onclick: () => { yzDegistir({ acik: true }); ciz(); } }, 'Açık'),
          h('button', { role: 'radio', 'aria-checked': String(!a.acik), onclick: () => { yzDegistir({ acik: false }); ciz(); } }, 'Kapalı'))),
      h('div', { class: 'ayar' }, h('div', { class: 'ayar-ad' }, 'Model'), modelGrup),
      h('p', { class: 'soluk kucuk' }, `${secili.ad}: ${secili.not}. Mesaj başına yaklaşık ${mesajBasi < 0.001 ? (mesajBasi * 100).toFixed(2) + ' sent' : '$' + mesajBasi.toFixed(3)}.`),
      a.anahtar
        ? h('div', { class: 'ozet-satir' }, h('span', {}, 'Anahtar'), h('span', { class: 'soluk' }, `kayıtlı (…${a.anahtar.slice(-4)})`))
        : h('p', { class: 'soluk kucuk' }, 'Henüz anahtar yok.'),
      girdi,
      h('div', { class: 'dugme-yigini alt-bosluk' },
        h('button', { class: 'dugme birincil', onclick: () => { const v = girdi.value.trim(); if (!v) return; yzDegistir({ anahtar: v }); ciz(); } }, a.anahtar ? 'Anahtarı değiştir' : 'Anahtarı kaydet'),
        a.anahtar ? h('button', { class: 'dugme', onclick: async e => { e.target.disabled = true; sonuc.textContent = 'Deneniyor…'; const { baglantiDene } = await import('../../yz/istemci.js'); const r = await baglantiDene(); sonuc.textContent = r.tamam ? `Bağlantı tamam (${r.model}).` : `Olmadı: ${r.mesaj}`; e.target.disabled = false; } }, 'Bağlantıyı dene') : null,
        a.anahtar ? h('button', { class: 'dugme dugme-metin', onclick: () => { yzDegistir({ anahtar: '' }); ciz(); } }, 'Anahtarı sil') : null),
      sonuc,
      h('div', { class: 'ozet-satir' }, h('span', {}, 'Bu ay'), h('span', { class: 'soluk' }, `$${hr.toplam.toFixed(3)} · ${hr.istek} mesaj`)),
      h('p', { class: 'soluk kucuk' }, 'Anahtar almak için: platform.claude.com → hesap aç → Billing\'den kredi yükle (istersen aylık harcama sınırı koy) → API Keys → Create Key → buraya yapıştır.'));
  };
  ciz();
  return kap;
}

// Sürüm satırı: 7 kez dokununca gizli geliştirici paneli açılır
function surumSatiri() {
  const alt = h('span', { class: 'satir-alt' }, OYUN_SURUMU);
  const el = h('div', { class: 'satir', id: 'surum-satiri', role: 'button' },
    h('span', { class: 'satir-metin' }, h('span', {}, 'Sürüm'), alt));
  yediDokunusKur(el, alt, OYUN_SURUMU);
  return el;
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
      h('h2', { class: 'bolum-baslik' }, 'Yapay zekâ sohbeti'),
      yzBolumu(),
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
        surumSatiri()),
    ));
  },
};
