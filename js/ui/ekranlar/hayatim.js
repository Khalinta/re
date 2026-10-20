// "Hayatım" ekranı: şimdilik duyduklarım (2.8) + gelecek bölümlerin yer tutucuları.
import { h, bosalt } from '../dom.js';
import { IKON } from '../ikonlar.js';
import { bilgiGoster, panelAc } from '../panel.js';
import * as oyun from '../../oyun.js';
import { mekanBul } from '../../core/mekan.js';
import { gunNo } from '../../core/zaman.js';

const GELECEK = [
  ['Karakter', 'Geçmişin, güçlü yanların, kusurların.', 'Faz 3'],
  ['Beceriler', 'Kullandıkça gelişir.', 'Faz 4'],
  ['Envanter', 'Elinde kalanlar.', 'Faz 4'],
  ['İlişkiler', 'Yakınlık, güven, saygı, çekim, gerginlik.', 'Faz 4'],
  ['Günlük', 'Hayatının kendi ağzından kaydı.', 'Faz 6'],
];

let kap = null, gorunur = false;

const satir = (ad, alt, eylem) => h('button', { class: 'satir', onclick: eylem },
  h('span', { class: 'satir-metin' }, h('span', {}, ad), h('span', { class: 'satir-alt' }, alt)),
  h('span', { class: 'satir-ok', html: IKON.ok }));

function onceYaz(gun) {
  const fark = gunNo(oyun.durumAl().zaman.dakika) - gun;
  return fark <= 0 ? 'bugün' : fark === 1 ? 'dün' : `${fark} gün önce`;
}

function duyduklarimPaneli() {
  const liste = oyun.duyulanlar();
  panelAc({
    baslik: 'Duyduklarım',
    icerik: h('div', {},
      h('p', { class: 'soluk kucuk' }, 'Mekanlarda kulak verdiğinde duyduklarını burada biriktirirsin. Hepsi doğru değil; hangisinin doğru olduğunu zamanla anlarsın.'),
      liste.length
        ? liste.map(d => h('div', { class: 'duyulan' },
          h('p', { class: 'panel-metin' }, '“' + d.metin + '”'),
          h('p', { class: 'soluk kucuk' }, `${mekanBul(oyun.veri.dunya, d.mekan)?.ad ?? ''} · ${onceYaz(d.gun)}`)))
        : h('p', {}, 'Henüz bir şey duymadın. Bir kahveye otur, etrafa kulak ver.')),
  });
}

function ciz() {
  if (!kap || !oyun.durumAl()) return;
  const n = oyun.duyulanlar().length;
  bosalt(kap, h('div', { class: 'sayfa-kaydir' },
    h('div', { class: 'sayfa-ust' }, h('h1', {}, 'Hayatım'), h('p', { class: 'soluk' }, 'Kim olduğun, neyin olduğu, kimin olduğu.')),
    h('div', { class: 'kart-liste' },
      satir('Duyduklarım', n ? `${n} şey duydun` : 'Henüz bir şey duymadın', duyduklarimPaneli),
      ...GELECEK.map(([ad, alt, faz]) => satir(ad, alt, () => bilgiGoster(ad, `${alt}\n\nBu bölüm ${faz} içinde geliyor.`))))));
}

export const hayatimEkrani = {
  olustur(k) { kap = k; oyun.dinle(() => { if (gorunur) ciz(); }); },
  goster() { gorunur = true; ciz(); },
  gizle() { gorunur = false; },
};
