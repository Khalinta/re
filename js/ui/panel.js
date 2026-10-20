// Alttan açılan panel (bottom sheet). Tam ekran modal yerine her detay ve onay bununla gösterilir.
//
//   panelAc({ baslik: 'Durum', icerik: dugum })          -> { kapat }
//   await onayIste({ baslik, metin, evet: 'Sat', hayir: 'Vazgeç', tehlikeli: true }) -> true/false
//
// Kapatma: arka plana dokunmak, tutamağı aşağı sürüklemek ya da kapat düğmesi.
// Paneller üst üste açılabilir; en üstteki kapanır.
import { h, hareketAzMi } from './dom.js';
import { IKON } from './ikonlar.js';

const yigin = [];

export function panelAc({ baslik, icerik, altBilgi, kapaninca, sinif } = {}) {
  const perde = h('div', { class: 'perde' });
  const govde = h('div', { class: 'panel-govde' }, icerik);
  const kapatDugme = h('button', { class: 'panel-kapat', 'aria-label': 'Kapat', html: IKON.kapat });
  const ust = h('div', { class: 'panel-ust' },
    h('div', { class: 'panel-tutamak', 'aria-hidden': 'true' }),
    baslik ? h('h2', { class: 'panel-baslik' }, baslik) : null,
    kapatDugme);
  const panel = h('section', { class: 'panel' + (sinif ? ' ' + sinif : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': baslik || 'Panel' },
    ust, govde, altBilgi ? h('div', { class: 'panel-alt' }, altBilgi) : null);

  document.body.append(perde, panel);
  document.documentElement.classList.add('panel-acik');
  const kayit = { panel, perde, kapat };
  yigin.push(kayit);

  // Bir sonraki karede aç ki geçiş animasyonu çalışsın
  requestAnimationFrame(() => requestAnimationFrame(() => { perde.classList.add('acik'); panel.classList.add('acik'); }));

  let kapandi = false;
  function kapat(sonuc) {
    if (kapandi) return;
    kapandi = true;
    perde.classList.remove('acik');
    panel.classList.remove('acik');
    panel.style.transform = '';
    const i = yigin.indexOf(kayit);
    if (i >= 0) yigin.splice(i, 1);
    if (!yigin.length) document.documentElement.classList.remove('panel-acik');
    const sil = () => { perde.remove(); panel.remove(); };
    if (hareketAzMi()) sil(); else setTimeout(sil, 280);
    kapaninca?.(sonuc);
  }

  perde.addEventListener('click', () => kapat());
  kapatDugme.addEventListener('click', () => kapat());
  surukleKapat(ust, panel, kapat);
  return kayit;
}

// Üst bölümü (tutamak + başlık) aşağı sürükleyince panel kapanır
function surukleKapat(tutamak, panel, kapat) {
  let baslangic = null, son = 0, zaman = 0;
  tutamak.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    baslangic = e.clientY; son = 0; zaman = performance.now();
    panel.classList.add('surukleniyor');
    tutamak.setPointerCapture(e.pointerId);
  });
  tutamak.addEventListener('pointermove', e => {
    if (baslangic === null) return;
    son = Math.max(0, e.clientY - baslangic);
    panel.style.transform = `translateY(${son}px)`;
  });
  const birak = () => {
    if (baslangic === null) return;
    panel.classList.remove('surukleniyor');
    const hiz = son / Math.max(1, performance.now() - zaman);
    baslangic = null;
    if (son > 110 || (son > 30 && hiz > 0.6)) kapat();
    else panel.style.transform = '';
  };
  tutamak.addEventListener('pointerup', birak);
  tutamak.addEventListener('pointercancel', birak);
}

export function enUstPaneliKapat() {
  const ust = yigin[yigin.length - 1];
  if (ust) { ust.kapat(); return true; }
  return false;
}

export function onayIste({ baslik = 'Emin misin?', metin, evet = 'Evet', hayir = 'Vazgeç', tehlikeli = false } = {}) {
  return new Promise(coz => {
    let p;
    const evetD = h('button', { class: 'dugme ' + (tehlikeli ? 'tehlikeli' : 'birincil'), onclick: () => p.kapat(true) }, evet);
    const hayirD = h('button', { class: 'dugme', onclick: () => p.kapat(false) }, hayir);
    p = panelAc({
      baslik,
      icerik: metin ? h('p', { class: 'panel-metin' }, metin) : null,
      altBilgi: h('div', { class: 'dugme-yigini' }, evetD, hayirD),
      kapaninca: sonuc => coz(sonuc === true),
    });
  });
}

// Kısa bilgi paneli (uzun basınca açılan)
export function bilgiGoster(baslik, metin) {
  return panelAc({ baslik, icerik: h('p', { class: 'panel-metin' }, metin), sinif: 'kucuk' });
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') enUstPaneliKapat(); });
