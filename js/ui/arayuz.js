// Uygulama iskeleti: durum çubuğu (üst), ekranlar (orta), sekme çubuğu (alt).
// Sekmeler: Şimdi, Telefon, Şehir, Hayatım, Daha Fazla.
import { h, $$ } from './dom.js';
import { IKON } from './ikonlar.js';
import { durumCubuguKur } from './durumcubugu.js';
import { enUstPaneliKapat } from './panel.js';

const SEKMELER = [
  { ad: 'simdi', baslik: 'Şimdi', ikon: IKON.simdi },
  { ad: 'telefon', baslik: 'Telefon', ikon: IKON.telefon },
  { ad: 'sehir', baslik: 'Şehir', ikon: IKON.sehir },
  { ad: 'hayatim', baslik: 'Hayatım', ikon: IKON.hayatim },
  { ad: 'dahaFazla', baslik: 'Daha Fazla', ikon: IKON.dahaFazla },
];

export function arayuzKur(kok, ekranlar) {
  const durumKap = h('header', {});
  const orta = h('main', { class: 'ekranlar' });
  const nav = h('nav', { class: 'sekme-cubugu', 'aria-label': 'Ana menü' });
  const durum = durumCubuguKur(durumKap);

  const bolumler = {};
  for (const s of SEKMELER) {
    const bolum = h('section', { class: 'ekran ekran-' + s.ad, 'aria-label': s.baslik, hidden: true });
    orta.append(bolum);
    bolumler[s.ad] = bolum;
    ekranlar[s.ad]?.olustur(bolum);
    nav.append(h('button', { class: 'sekme', dataset: { sekme: s.ad }, onclick: () => sekmeGec(s.ad) },
      h('span', { class: 'sekme-ikon', html: s.ikon }),
      h('span', { class: 'sekme-rozet', hidden: true }),
      h('span', { class: 'sekme-ad' }, s.baslik)));
  }
  kok.replaceChildren(durumKap, orta, nav);

  let aktif = null;
  function sekmeGec(ad) {
    if (aktif === ad) { ekranlar[ad]?.tekrarDokunus?.(); return; }
    while (enUstPaneliKapat());
    aktif = ad;
    for (const [k, b] of Object.entries(bolumler)) b.hidden = k !== ad;
    for (const d of $$('.sekme', nav)) d.setAttribute('aria-current', d.dataset.sekme === ad ? 'page' : 'false');
    ekranlar[ad]?.goster?.();
    try { sessionStorage.setItem('yeniden.sekme', ad); } catch { /* önemsiz */ }
  }

  function rozet(ad, sayi) {
    const r = nav.querySelector(`[data-sekme="${ad}"] .sekme-rozet`);
    r.hidden = !sayi;
    r.textContent = sayi > 9 ? '9+' : String(sayi || '');
  }

  klavyeyiIzle();
  let ilk = 'simdi';
  try { ilk = sessionStorage.getItem('yeniden.sekme') || 'simdi'; } catch { /* önemsiz */ }
  sekmeGec(bolumler[ilk] ? ilk : 'simdi');

  return { sekmeGec, rozet, durum };
}

// Klavye açılınca sekme çubuğu gizlenir, görünür alan yüksekliği güncellenir.
function klavyeyiIzle() {
  const kok = document.documentElement;
  const yaziAlani = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  document.addEventListener('focusin', e => { if (yaziAlani(e.target)) kok.classList.add('klavye'); });
  document.addEventListener('focusout', () => setTimeout(() => {
    if (!yaziAlani(document.activeElement)) kok.classList.remove('klavye');
  }, 50));
  const vv = window.visualViewport;
  const ayarla = () => kok.style.setProperty('--gorunur', (vv ? vv.height : window.innerHeight) + 'px');
  vv?.addEventListener('resize', ayarla);
  window.addEventListener('resize', ayarla);
  ayarla();
}

// iOS'ta iki parmakla yakınlaştırmayı engelle (çift dokunma CSS'te touch-action ile engelleniyor)
document.addEventListener('gesturestart', e => e.preventDefault());
