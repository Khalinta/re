// Yeni oyun ekranı (adım 3.4): başlangıç tipi, cinsiyet, ad → kim olacağının önizlemesi → başla.
// Panel kapatılırsa o anki seçimle (ya da tamamen rastgele) başlanır; oyun hiç başlamadan kalmaz.
import { h, bosalt } from '../dom.js';
import { panelAc } from '../panel.js';
import { seedUret } from '../../core/rng.js';
import { para } from '../../core/format.js';
import * as oyun from '../../oyun.js';

const TIPLER = [
  ['dipten', 'Dipten', 'Hiçbir zaman bir şeyin olmadı. Ne bir aile parası, ne bir şans.'],
  ['zirveden', 'Zirveden', 'Her şeyin vardı; bir bir kaybettin. Şimdi sıfırdasın, ya da altında.'],
  [null, 'Kader seçsin', 'Hangisi olacağını şehir bilsin.'],
];
const CINSIYETLER = [['k', 'Kadın'], ['e', 'Erkek'], [null, 'Fark etmez']];

export function yeniHayatSec({ seed } = {}) {
  return new Promise(coz => {
    const s = { tip: null, cinsiyet: null, ad: '', seed: seed || seedUret() };
    let bitti = false;
    const sonuc = () => ({ seed: s.seed, secim: { ...(s.tip ? { tip: s.tip } : {}), ...(s.cinsiyet ? { cinsiyet: s.cinsiyet } : {}), ...(s.ad.trim() ? { ad: adDuzelt(s.ad) } : {}) } });
    const govde = h('div', {});
    const p = panelAc({ baslik: 'Yeni bir hayat', icerik: govde, sinif: 'yeni-hayat', kapaninca: () => { if (!bitti) { bitti = true; coz(sonuc()); } } });
    const basla = () => { bitti = true; p.kapat(); coz(sonuc()); };

    function form() {
      const secimDugmesi = (secili, ad, alt, eylem) => h('button', { class: 'dugme secim' + (secili ? ' secili' : ''), onclick: eylem },
        h('span', { class: 'secim-ad' }, ad), alt ? h('span', { class: 'secim-alt' }, alt) : null);
      const girdi = h('input', { class: 'ad-girdi', type: 'text', maxlength: '20', placeholder: 'Adın (boş bırakırsan şehir bir ad verir)', autocomplete: 'off', value: s.ad });
      girdi.addEventListener('input', () => { s.ad = girdi.value; });
      bosalt(govde,
        h('p', { class: 'panel-metin soluk' }, 'Karaliman\'da bir odada uyanacaksın. Kim olduğunu, buraya nasıl geldiğini şehir yazacak; sen yalnızca nereden başladığını seç.'),
        h('h3', { class: 'bolum-baslik' }, 'Nereden başlıyorsun?'),
        h('div', { class: 'dugme-yigini' }, TIPLER.map(([id, ad, alt]) => secimDugmesi(s.tip === id, ad, alt, () => { s.tip = id; form(); }))),
        h('h3', { class: 'bolum-baslik' }, 'Kimsin?'),
        h('div', { class: 'secim-satir' }, CINSIYETLER.map(([id, ad]) => secimDugmesi(s.cinsiyet === id, ad, null, () => { s.cinsiyet = id; form(); }))),
        h('div', { class: 'ad-alan' }, girdi),
        h('div', { class: 'dugme-yigini alt-bosluk' }, h('button', { class: 'dugme birincil', onclick: () => { s.ad = girdi.value; onizleme(); } }, 'Devam')));
    }

    function onizleme() {
      const o = oyun.karakterOnizle(s.seed, sonuc().secim);
      bosalt(govde,
        h('div', { class: 'onizleme' },
          h('h3', { class: 'onizleme-ad' }, o.tamAd),
          h('p', { class: 'panel-metin' }, `${o.yas} yaşında, ${o.memleket}; eskiden ${o.eskiMeslek}.`),
          o.gorunus ? h('p', { class: 'panel-metin soluk' }, o.gorunus) : null,
          h('p', { class: 'panel-metin' }, o.ilk),
          h('p', { class: 'panel-metin' }, o.ozet),
          h('div', { class: 'ozet-satir' }, h('span', {}, 'Cebinde'), h('span', { class: 'soluk' }, para(o.para))),
          h('div', { class: 'ozet-satir' }, h('span', {}, 'Borcun'), h('span', { class: 'soluk' }, o.borc ? para(o.borc) : 'yok'))),
        h('p', { class: 'soluk kucuk' }, 'Gerisini yaşarken öğreneceksin.'),
        h('div', { class: 'dugme-yigini alt-bosluk' },
          h('button', { class: 'dugme birincil', onclick: basla }, 'Bu hayatı yaşa'),
          h('button', { class: 'dugme', onclick: () => { s.seed = seedUret(); onizleme(); } }, 'Başka biri'),
          h('button', { class: 'dugme dugme-metin', onclick: form }, 'Geri')));
    }

    form();
  });
}

// "nAZLI" → "Nazlı"; yalnızca harf, boşluk ve kesme işareti
function adDuzelt(ad) {
  return ad.trim().replace(/[^\p{L}' ]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2)
    .map(k => k[0].toLocaleUpperCase('tr') + k.slice(1).toLocaleLowerCase('tr')).join(' ') || undefined;
}
