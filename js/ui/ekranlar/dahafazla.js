// "Daha Fazla" ekranı: ayarlar, kayıtlar (1.6), sürüm bilgisi.
import { h, $$ } from '../dom.js';
import { IKON } from '../ikonlar.js';
import { kayitlariGoster } from './kayitlar.js';
import { SECENEKLER, al, degistir } from '../../ayarlar.js';
import { OYUN_SURUMU } from '../../surum.js';
import { hataPaneli } from '../../hata.js';
import { yediDokunusKur } from '../../dev/panel.js';
import { ayarlar as yzAyar, ayarDegistir as yzDegistir, etkin as yzEtkin, harcama, YZ_ETKIN } from '../../yz/ayar.js';
import { MODELLER, SAGLAYICILAR } from '../../core/yz.js';

function segment(anahtar, etiket) {
  const grup = h('div', { class: 'segment', role: 'radiogroup', 'aria-label': etiket });
  const yenile = () => $$('button', grup).forEach((d, i) => d.setAttribute('aria-checked', String(SECENEKLER[anahtar][i][0] === al(anahtar))));
  for (const [deger, ad] of SECENEKLER[anahtar]) {
    grup.append(h('button', { role: 'radio', onclick: () => { degistir(anahtar, deger); yenile(); } }, ad));
  }
  yenile();
  return h('div', { class: 'ayar' }, h('div', { class: 'ayar-ad' }, etiket), grup);
}

// Yapay zekâ sohbeti (3.9): sağlayıcı (Claude / Gemini), anahtar, model, açık/kapalı, bağlantı denemesi, bu ayki harcama
const YARDIM = {
  claude: 'Claude anahtarı için: platform.claude.com → hesap aç → Billing\'den kredi yükle (istersen aylık harcama sınırı koy) → API Keys → Create Key → buraya yapıştır. Claude Pro aboneliği buna dahil değildir.',
  gemini: 'Gemini anahtarı için: aistudio.google.com → Google hesabınla gir → API Keys → Create API key (ya da hazır olanın yanındaki kopyala düğmesi) → buraya yapıştır. Ücretsiz katmanda kart gerekmez; dakikalık ve günlük istek sınırı vardır, yazdıkların Google\'ın modellerini geliştirmek için kullanılabilir.',
};
function yzBolumu() {
  const kap = h('div', { class: 'kart yz-kart' });
  const ciz = () => {
    const a = yzAyar(), e = yzEtkin(), hr = harcama();
    const g = e.saglayici === 'gemini';
    const girdi = h('input', { class: 'ad-girdi', type: 'password', placeholder: SAGLAYICILAR[e.saglayici].ipucu, autocomplete: 'off', spellcheck: 'false' });
    const sonuc = h('p', { class: 'soluk kucuk' });
    const secim = (etiket, ogeler) => h('div', { class: 'ayar' }, h('div', { class: 'ayar-ad' }, etiket),
      h('div', { class: 'segment', role: 'radiogroup', 'aria-label': etiket }, ogeler.map(([ad, secili, yap]) => h('button', { role: 'radio', 'aria-checked': String(secili), onclick: () => { yap(); ciz(); } }, ad))));
    const modeller = MODELLER.filter(m => m.saglayici === e.saglayici);
    const secili = modeller.find(m => m.id === e.model) ?? modeller[0];
    const mesajBasi = (4000 * secili.girdi + 400 * secili.cikti) / 1e6;
    const anahtarYaz = v => yzDegistir(g ? { gAnahtar: v } : { anahtar: v });
    kap.replaceChildren(
      h('p', { class: 'panel-metin' }, 'Biriyle konuşurken istediğini yazabilirsin; karşındakinin cevabını yapay zekâ yazar, kişinin kartına ve sana dair hafızasına sadık kalarak. İnternet ve kendi API anahtarın gerekir: Claude ücretli (mesaj başına küçük bir ücret), Gemini\'nin ücretsiz katmanı var. Anahtar yalnızca bu telefonda saklanır.'),
      secim('Durum', [['Açık', a.acik, () => yzDegistir({ acik: true })], ['Kapalı', !a.acik, () => yzDegistir({ acik: false })]]),
      secim('Yapay zekâ', Object.entries(SAGLAYICILAR).map(([id, s]) => [s.ad, e.saglayici === id, () => yzDegistir({ saglayici: id })])),
      secim('Model', modeller.map(m => [m.ad, m.id === secili.id, () => yzDegistir(g ? { gModel: m.id } : { model: m.id })])),
      h('p', { class: 'soluk kucuk' }, `${SAGLAYICILAR[e.saglayici].ad.replace(' (ücretsiz)', '')} ${secili.ad}: ${secili.not}. ${g ? '' : `Mesaj başına yaklaşık ${mesajBasi < 0.001 ? (mesajBasi * 100).toFixed(2) + ' sent' : '$' + mesajBasi.toFixed(3)}.`}`),
      e.anahtar
        ? h('div', { class: 'ozet-satir' }, h('span', {}, 'Anahtar'), h('span', { class: 'soluk' }, `kayıtlı (…${e.anahtar.slice(-4)})`))
        : h('p', { class: 'soluk kucuk' }, `Henüz ${g ? 'Gemini' : 'Claude'} anahtarı yok.`),
      girdi,
      h('div', { class: 'dugme-yigini alt-bosluk' },
        h('button', { class: 'dugme birincil', onclick: () => { const v = girdi.value.trim(); if (!v) return; anahtarYaz(v); ciz(); } }, e.anahtar ? 'Anahtarı değiştir' : 'Anahtarı kaydet'),
        e.anahtar ? h('button', { class: 'dugme', onclick: async ev => { ev.target.disabled = true; sonuc.textContent = 'Deneniyor…'; const { baglantiDene } = await import('../../yz/istemci.js'); const r = await baglantiDene(); sonuc.textContent = r.tamam ? `Bağlantı tamam (${r.model}).` : `Olmadı: ${r.mesaj}`; ev.target.disabled = false; } }, 'Bağlantıyı dene') : null,
        e.anahtar ? h('button', { class: 'dugme dugme-metin', onclick: () => { anahtarYaz(''); ciz(); } }, 'Anahtarı sil') : null),
      sonuc,
      h('div', { class: 'ozet-satir' }, h('span', {}, 'Bu ay'), h('span', { class: 'soluk' }, `${hr.istek} mesaj · Claude harcaması $${hr.toplam.toFixed(3)}`)),
      h('p', { class: 'soluk kucuk' }, YARDIM[e.saglayici]));
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
      YZ_ETKIN ? h('h2', { class: 'bolum-baslik' }, 'Yapay zekâ sohbeti') : null,
      YZ_ETKIN ? yzBolumu() : null,
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
