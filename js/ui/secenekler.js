// Seçenek butonları: tam genişlik, en az 44px, maliyet etiketli.
//
//   secenekleriGoster(kap, [
//     { metin: 'Çay demle', maliyet: { dakika: 15, para: 20, enerji: 2 }, alt: 'Demlik çatlak ama iş görür.' },
//     { metin: 'Kapıyı aç', devreDisi: true, sebep: 'Önce kalkman lazım.' },
//   ], secim => ...)
//
// Maliyet değerleri harcamadır: para: 150 => −150 ₺, enerji: 10 => −10 enerji (negatif değer kazanç).
// Bir seçime dokunulunca diğerleri kilitlenir (çift dokunuşla iki kez seçilmesin).
import { h, bosalt } from './dom.js';
import { uzunBas } from './uzunbas.js';
import { bilgiGoster } from './panel.js';
import { para } from '../core/format.js';

export function maliyetMetni(m = {}) {
  const parca = [];
  if (m.dakika) parca.push(m.dakika >= 60 ? `${Math.round(m.dakika / 6) / 10} sa`.replace('.', ',') : `${m.dakika} dk`);
  if (m.para) parca.push((m.para < 0 ? '+' : '−') + para(Math.abs(m.para)));
  if (m.enerji) parca.push(`${m.enerji < 0 ? '+' : '−'}${Math.abs(m.enerji)} enerji`);
  return parca;
}

export function secenekleriGoster(kap, secenekler, secince) {
  let kilitli = false;
  const dugmeler = secenekler.map((s, i) => {
    const etiketler = maliyetMetni(s.maliyet);
    const d = h('button', {
      class: 'secenek' + (s.ton ? ' ton-' + s.ton : ''),
      'aria-disabled': s.devreDisi ? 'true' : null,
    },
      h('span', { class: 'secenek-metin' }, s.metin),
      s.alt ? h('span', { class: 'secenek-alt' }, s.alt) : null,
      etiketler.length ? h('span', { class: 'secenek-maliyet' }, etiketler.map(e => h('span', { class: 'etiket' }, e))) : null,
      s.devreDisi && s.sebep ? h('span', { class: 'secenek-sebep' }, s.sebep) : null,
    );
    d.addEventListener('click', () => {
      if (kilitli) return;
      if (s.devreDisi) { if (s.sebep) bilgiGoster(s.metin, s.sebep); return; }
      kilitli = true;
      d.classList.add('secildi');
      kap.classList.add('kilitli');
      secince?.(s, i);
    });
    uzunBas(d, () => {
      const satirlar = [s.alt, etiketler.length ? 'Bedeli: ' + etiketler.join(', ') : null, s.devreDisi ? s.sebep : null].filter(Boolean);
      bilgiGoster(s.metin, satirlar.join('\n\n') || 'Bunun ne getireceğini yaşayınca göreceksin.');
    });
    return d;
  });
  kap.classList.remove('kilitli');
  bosalt(kap, dugmeler);
  const kaydirici = kap.closest('.alt-bolge');
  if (kaydirici) kaydirici.scrollTop = 0;
}
