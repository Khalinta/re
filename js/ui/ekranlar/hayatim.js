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

const KATMAN_ADI = { tanidik: 'tanıdık', onemli: 'yakın', ana: 'hayatında önemli', arka_plan: 'tanıdık' };
const yakinlikAdi = y => y >= 40 ? 'dost' : y >= 20 ? 'arkadaş' : y >= 8 ? 'ısınıyorsunuz' : 'yeni tanıştınız';

function kisiPaneli(t) {
  const satirlar = [
    h('p', { class: 'panel-metin' }, t.tanim),
    t.gorunus ? h('p', { class: 'panel-metin soluk' }, t.gorunus) : null,
    h('div', { class: 'ozet-satir' }, h('span', {}, 'Aranız'), h('span', { class: 'soluk' }, t.gerginlik >= 4 ? 'gergin' : `${yakinlikAdi(t.yakinlik)} · ${KATMAN_ADI[t.katman] ?? ''}`)),
    t.nerede ? h('div', { class: 'ozet-satir' }, h('span', {}, 'Tanıştığınız yer'), h('span', { class: 'soluk' }, mekanBul(oyun.veri.dunya, t.nerede)?.ad ?? '')) : null,
    t.dert ? h('p', { class: 'panel-metin' }, h('b', {}, 'Derdi: '), t.dert) : null,
    t.hayal ? h('p', { class: 'panel-metin' }, h('b', {}, 'Hayali: '), t.hayal) : null,
    t.tuhaflik ? h('p', { class: 'panel-metin soluk' }, t.tuhaflik) : null,
    t.anilar?.length ? h('h3', { class: 'bolum-baslik' }, 'Birlikte') : null,
    ...(t.anilar || []).slice().reverse().map(a => h('p', { class: 'soluk kucuk' }, a.metin)),
  ];
  panelAc({ baslik: t.tamAd, icerik: h('div', {}, satirlar) });
}

function tanidiklarimPaneli() {
  const liste = oyun.tanidiklarim();
  panelAc({
    baslik: 'Tanıdıklarım',
    icerik: h('div', {},
      h('p', { class: 'soluk kucuk' }, 'Mekanlarda tanıştığın insanlar. Sohbet ettikçe dertlerini, hayallerini öğrenirsin; onlar da seni hatırlar.'),
      liste.length
        ? h('div', { class: 'kart-liste' }, liste.map(t => satir(t.ad, `${t.tanim.split(';')[0]} · ${yakinlikAdi(t.yakinlik)}`, () => kisiPaneli(t))))
        : h('p', {}, 'Henüz kimseyle tanışmadın. Bir mekana gir; orada kimler varsa seçeneklerde görünür.')),
  });
}

function ciz() {
  if (!kap || !oyun.durumAl()) return;
  const n = oyun.duyulanlar().length;
  bosalt(kap, h('div', { class: 'sayfa-kaydir' },
    h('div', { class: 'sayfa-ust' }, h('h1', {}, 'Hayatım'), h('p', { class: 'soluk' }, 'Kim olduğun, neyin olduğu, kimin olduğu.')),
    h('div', { class: 'kart-liste' },
      satir('Tanıdıklarım', oyun.tanidiklarim().length ? `${oyun.tanidiklarim().length} kişi` : 'Henüz kimseyle tanışmadın', tanidiklarimPaneli),
      satir('Duyduklarım', n ? `${n} şey duydun` : 'Henüz bir şey duymadın', duyduklarimPaneli),
      ...GELECEK.map(([ad, alt, faz]) => satir(ad, alt, () => bilgiGoster(ad, `${alt}\n\nBu bölüm ${faz} içinde geliyor.`))))));
}

export const hayatimEkrani = {
  olustur(k) { kap = k; oyun.dinle(() => { if (gorunur) ciz(); }); },
  goster() { gorunur = true; ciz(); },
  gizle() { gorunur = false; },
};
