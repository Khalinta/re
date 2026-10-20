// Üstteki ince durum çubuğu: saat, gün, para, enerji, ruh hali.
// Dokununca alttan ayrıntı paneli açılır.
//
// veri = {
//   saat: '08:15', gunKisa: '20 Eki', tarihUzun: '20 Ekim 2026, Salı', dilim: 'Sabah',
//   para: 1250, enerji: 62, ruh: 55,
//   ayrinti: [{ ad: 'Sağlık', deger: 80, aciklama: '...', ters: false }]   // ters: yüksek = kötü (stres, açlık)
// }
import { h, bosalt } from './dom.js';
import { IKON } from './ikonlar.js';
import { panelAc } from './panel.js';
import { paraKisa, para } from '../core/format.js';

let sonVeri = null;

function seviye(deger, ters = false) {
  const v = ters ? 100 - deger : deger;
  return v >= 60 ? 'iyi' : v >= 30 ? 'orta' : 'kotu';
}

export function durumCubuguKur(kap) {
  kap.classList.add('durum-cubugu');
  kap.setAttribute('role', 'button');
  kap.setAttribute('aria-label', 'Durum ayrıntıları');
  kap.tabIndex = 0;
  kap.addEventListener('click', ayrintiGoster);
  kap.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') ayrintiGoster(); });
  return {
    guncelle(veri) {
      sonVeri = veri;
      bosalt(kap,
        h('span', { class: 'dc-zaman' }, h('b', {}, veri.saat), ' ', h('span', { class: 'soluk' }, veri.gunKisa)),
        h('span', { class: 'dc-sag' },
          h('span', { class: 'dc-para' + (veri.para < 0 ? ' eksi' : '') }, paraKisa(veri.para)),
          h('span', { class: 'dc-deger s-' + seviye(veri.enerji), html: IKON.enerji }, h('span', {}, String(Math.round(veri.enerji)))),
          h('span', { class: 'dc-deger s-' + seviye(veri.ruh), html: IKON.ruh }, h('span', {}, String(Math.round(veri.ruh))))),
      );
    },
  };
}

function ayrintiGoster() {
  const v = sonVeri;
  if (!v) return;
  const satirlar = (v.ayrinti || []).map(a =>
    h('div', { class: 'olcer' },
      h('div', { class: 'olcer-ust' }, h('span', {}, a.ad), h('span', { class: 'soluk' }, a.aciklama || String(Math.round(a.deger)))),
      h('div', { class: 'olcer-cubuk' }, h('div', { class: 'olcer-dolu s-' + seviye(a.deger, a.ters), style: { width: Math.max(2, Math.min(100, a.deger)) + '%' } }))));
  panelAc({
    baslik: v.tarihUzun,
    icerik: h('div', {},
      h('div', { class: 'ozet-satir' }, h('span', {}, v.dilim + ' · ' + v.saat), h('b', { class: v.para < 0 ? 'eksi' : '' }, para(v.para))),
      satirlar),
  });
}
